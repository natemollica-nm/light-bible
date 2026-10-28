import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import service, { RequestBudget } from './service.mjs';

const env = {
  API_BIBLE_KEY: 'private-test-key',
  BUDGET: { idFromName: name => name, get: () => ({ fetch: async () => new Response(null, { status: 204 }) }) },
};
const request = (path, options) => new Request(`https://bible.example${path}`, options);

test('only fixed licensed routes can reach the provider, and budget denial fails closed', async () => {
  const upstream = mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected provider call'); });
  try {
    for (const [path, options, status] of [
      ['/v1/ESV/books', undefined, 404],
      ['/v1/NIV/chapters/JHN.0', undefined, 404],
      ['/v1/NIV/chapters/PSA.151', undefined, 404],
      ['/v1/NIV/books?api-key=override', undefined, 400],
      ['/v1/NIV/books', { method: 'POST' }, 405],
    ]) assert.equal((await service.fetch(request(path, options), env)).status, status);
    const limited = { ...env, BUDGET: { ...env.BUDGET, get: () => ({ fetch: async () => new Response(null, {
      status: 429, headers: { 'Retry-After': '600' },
    }) }) } };
    const response = await service.fetch(request('/v1/NIV/books'), limited);
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('Retry-After'), '600');
    assert.equal(upstream.mock.callCount(), 0);
  } finally { upstream.mock.restore(); }
});

test('passages retain verse boundaries and copyright without leaking the key or allowing caching', async () => {
  const upstream = mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.origin, 'https://rest.api.bible');
    assert.equal(url.pathname, '/v1/bibles/78a9f6124f344018-01/chapters/JHN.3');
    assert.equal(options.headers['api-key'], 'private-test-key');
    assert.equal(options.redirect, 'manual');
    return Response.json({ data: {
      bibleId: '78a9f6124f344018-01', id: 'JHN.3', bookId: 'JHN', number: '3', reference: 'John 3',
      content: '  [1] First line.\nPoetry line. [2] Second verse.', copyright: 'Publisher attribution',
    } });
  });
  try {
    const response = await service.fetch(request('/v1/NIV/chapters/JHN.3'), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    const data = await response.json();
    assert.equal(data.translation.id, 'NIV');
    assert.equal(data.book.name, 'John');
    assert.equal(data.chapter.number, 3);
    assert.deepEqual(data.chapter.content, [
      { type: 'verse', number: 1, content: ['First line.\nPoetry line.'] },
      { type: 'verse', number: 2, content: ['Second verse.'] },
    ]);
    assert.equal(data.copyright, 'Publisher attribution');
    assert.ok(!JSON.stringify(data).includes(env.API_BIBLE_KEY));
  } finally { upstream.mock.restore(); }
});

test('navigation excludes introduction sections and preserves real chapter bounds', async () => {
  const upstream = mock.method(globalThis, 'fetch', async () => Response.json({ data: [
    { id: 'GEN', name: 'Genesis', chapters: [{ number: 'intro' }, { number: '1' }, { number: '50' }] },
    { id: 'REV', name: 'Revelation', chapters: [{ number: '1' }, { number: '22' }] },
  ] }));
  try {
    const data = await (await service.fetch(request('/v1/NLT/books'), env)).json();
    assert.equal(data.translation.id, 'NLT');
    assert.deepEqual(data.books, [
      { id: 'GEN', name: 'Genesis', firstChapterNumber: 1, lastChapterNumber: 50 },
      { id: 'REV', name: 'Revelation', firstChapterNumber: 1, lastChapterNumber: 22 },
    ]);
  } finally { upstream.mock.restore(); }
});

test('provider failures and invalid passage identities return sanitized errors', async () => {
  let providerResponse = new Response('private-test-key account details', { status: 403 });
  const upstream = mock.method(globalThis, 'fetch', async () => providerResponse);
  try {
    assert.equal((await service.fetch(request('/v1/NKJV/books'), env)).status, 502);
    providerResponse = Response.json({ data: { bibleId: 'wrong-edition', content: '[1] Wrong text' } });
    const response = await service.fetch(request('/v1/NIV/chapters/JHN.3'), env);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: 'Translation temporarily unavailable' });
  } finally { upstream.mock.restore(); }
});

test('budget persists across instances, limits bursts, and resets at UTC month boundaries', async context => {
  const start = Date.UTC(2026, 9, 31, 20);
  context.mock.timers.enable({ apis: ['Date'], now: start });
  let saved;
  const storage = {
    get: async () => structuredClone(saved),
    put: async (_, value) => { saved = structuredClone(value); },
    transaction: async callback => callback(storage),
  };
  const reserve = async ip => new RequestBudget({ storage }).fetch(new Request('https://budget/check', { method: 'POST', body: ip }));
  for (let minute = 0; minute < 75; minute++) {
    context.mock.timers.setTime(start + minute * 60_000);
    for (let ip = 0; ip < 6; ip++) {
      for (let n = 0; n < 10; n++) assert.equal((await reserve(`192.0.2.${ip}`)).status, 204);
      assert.equal((await reserve(`192.0.2.${ip}`)).status, 429);
    }
    assert.equal((await reserve('192.0.2.99')).status, 429);
  }
  context.mock.timers.setTime(start + 76 * 60_000);
  assert.equal((await reserve('192.0.2.99')).status, 429);
  context.mock.timers.setTime(Date.UTC(2026, 10, 1));
  assert.equal((await reserve('192.0.2.99')).status, 204);
});
