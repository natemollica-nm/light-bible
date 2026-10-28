const editions = {
  NIV: { id: '78a9f6124f344018-01', name: 'New International Version' },
  NLT: { id: 'd6e14a625393b4da-01', name: 'New Living Translation' },
  NKJV: { id: '63097d2a0a2f7db3-01', name: 'New King James Version' },
};

function json(body, status = 200, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extraHeaders },
  });
}

// This is a fixed native-app API, not a general-purpose API.Bible proxy.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, { Allow: 'GET' });
    if (url.search) return json({ error: 'Query parameters are not supported' }, 400);
    if (url.pathname === '/health') return json({ ready: Boolean(env.API_BIBLE_KEY) }, env.API_BIBLE_KEY ? 200 : 503);
    const route = /^\/v1\/(NIV|NLT|NKJV)\/(books|chapters\/([1-3A-Z][A-Z0-9]{2})\.([1-9][0-9]{0,2}))$/.exec(url.pathname);
    if (!route || (route[4] && Number(route[4]) > 150)) return json({ error: 'Not found' }, 404);
    if (!env.API_BIBLE_KEY) return json({ error: 'Service not configured' }, 503);
    const budget = env.BUDGET.get(env.BUDGET.idFromName('upstream-requests'));
    const allowed = await budget.fetch('https://budget/check', {
      method: 'POST',
      body: request.headers.get('CF-Connecting-IP') || 'unknown',
    });
    if (!allowed.ok) return json({ error: 'Reading limit reached. Try again later.' }, 429, {
      'Retry-After': allowed.headers.get('Retry-After') || '60',
    });

    const abbreviation = route[1];
    const edition = editions[abbreviation];
    const upstream = new URL(`https://rest.api.bible/v1/bibles/${edition.id}/${route[2]}`);
    if (route[2] === 'books') {
      upstream.searchParams.set('include-chapters', 'true');
    } else {
      for (const [key, value] of Object.entries({
        'content-type': 'text', 'include-notes': 'false', 'include-titles': 'false',
        'include-chapter-numbers': 'false', 'include-verse-numbers': 'true',
      })) upstream.searchParams.set(key, value);
    }
    try {
      const response = await fetch(upstream, {
        headers: { 'api-key': env.API_BIBLE_KEY },
        redirect: 'manual',
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        // Do not return upstream error bodies, credentials, or account details.
        if (response.status === 429) return json({ error: 'Provider reading limit reached' }, 429, { 'Retry-After': '60' });
        if (response.status === 404) return json({ error: 'Chapter not available' }, 404);
        return json({ error: 'Translation temporarily unavailable' }, 502);
      }
      const { data } = await response.json();
      const translation = { id: abbreviation, name: edition.name, languageName: 'English' };
      if (route[2] === 'books') {
        if (!Array.isArray(data) || !data.length) throw new Error('Invalid books');
        const books = data.map(book => {
          const chapters = book.chapters.filter(chapter => /^[1-9][0-9]*$/.test(chapter.number))
            .map(chapter => Number(chapter.number));
          if (!chapters.length || !book.id || !book.name) throw new Error('Invalid book');
          return { id: book.id, name: book.name, firstChapterNumber: Math.min(...chapters), lastChapterNumber: Math.max(...chapters) };
        });
        return json({ translation, books });
      }
      const chapter = Number(route[4]);
      if (data.bibleId !== edition.id || data.id !== `${route[3]}.${chapter}` || data.bookId !== route[3] ||
          Number(data.number) !== chapter || typeof data.content !== 'string' || !data.copyright || !data.reference) {
        throw new Error('Invalid passage');
      }
      const markers = [...data.content.matchAll(/\[(\d+)\]\s*/g)];
      if (!markers.length) throw new Error('Missing verses');
      const content = markers.map((marker, index) => ({
        type: 'verse', number: Number(marker[1]),
        content: [data.content.slice(marker.index + marker[0].length, markers[index + 1]?.index).trim()],
      }));
      return json({
        translation,
        book: { id: data.bookId, name: data.reference.replace(/\s+\d+$/, '') },
        chapter: { number: chapter, content },
        copyright: data.copyright,
      });
    } catch {
      return json({ error: 'Translation temporarily unavailable' }, 502);
    }
  },
};

// One SQLite-backed Durable Object serializes quota reservations across all regions.
// IP counters are replaced on the first request in a new minute, not logged.
export class RequestBudget {
  constructor(ctx) { this.storage = ctx.storage; }

  async fetch(request) {
    const ip = await request.text();
    const now = new Date();
    const month = now.toISOString().slice(0, 7);
    const minute = Math.floor(now.getTime() / 60_000);
    return this.storage.transaction(async storage => {
      let state = await storage.get('budget');
      if (!state || state.month !== month) state = { month, total: 0, minute, count: 0, clients: {} };
      if (state.minute !== minute) state = { ...state, minute, count: 0, clients: {} };
      if (state.total >= 4500) {
        const nextMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
        return new Response(null, { status: 429, headers: { 'Retry-After': String(Math.ceil((nextMonth - now.getTime()) / 1000)) } });
      }
      // Cloudflare supplies CF-Connecting-IP; no client-provided user ID is trusted.
      const count = Object.hasOwn(state.clients, ip) ? state.clients[ip] : 0;
      if (state.count >= 60 || count >= 10) return new Response(null, { status: 429, headers: { 'Retry-After': '60' } });
      state.total++;
      state.count++;
      state.clients[ip] = count + 1;
      await storage.put('budget', state);
      return new Response(null, { status: 204 });
    });
  }
}
