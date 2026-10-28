# Hosted licensed translations

Cloudflare Worker for the native Light Bible app. It serves only the account's
NIV 2011, standard NLT, and NKJV editions. ESV continues to use the phone's own
Crossway key. KJV/ASV continue to use HelloAO.

The service is deployed at `https://light-bible-api.nathanmollica.workers.dev`.
The native app uses that HTTPS URL, keeps these three editions network-only,
and displays the returned copyright with each chapter. Book metadata is reused
in memory for the app session to avoid spending a provider call on each chapter
navigation. The curated translation picker needs no network request.
Do not publish a new Light submission until this integration is device-tested
and the distribution/analytics terms below are confirmed.

## Development and deployment

Use Node 22 or later. From this directory:

```sh
npm ci
npm test
npx wrangler deploy --dry-run
```

`npm run dev` runs the real Workers runtime locally. If needed, supply the key
in an owner-readable `.dev.vars` file (ignored by Git), never in source, command
arguments, logs, or an APK. Delete the local secret file after testing.

Deployment requires the owner's Cloudflare account with Workers enabled. The
SQLite Durable Object works on the free plan; do not enable paid hosting without
approval. Authenticate with `npx wrangler login`, deploy with `npm run deploy`,
then provision `API_BIBLE_KEY` through `npx wrangler secret put API_BIBLE_KEY`.
For orb deployment, use the project-scoped `CLOUDFLARE_API_TOKEN` with Workers
Scripts Edit and Account Settings Read permissions on this account only. Set
`CLOUDFLARE_ACCOUNT_ID` to `085746b83ee291c00dce10c24b8fa7d4` if account selection
is ambiguous. The project-scoped API.Bible secret can be piped to Wrangler's
secret command; never print it or put it in a command argument or tracked file.
Until the secret is provisioned, passage requests fail closed with HTTP 503.
Use the returned `workers.dev` URL, not an orb portal, as the native app endpoint.

## Contract

- `GET /health`: configuration readiness only, not a provider-access check.
- `GET /v1/{NIV|NLT|NKJV}/books`: normalized translation/book metadata with
  chapter bounds; introduction sections excluded.
- `GET /v1/{NIV|NLT|NKJV}/chapters/JHN.3`: normalized chapter with numbered verse
  text and publisher copyright, compatible with the native HelloAO parser.
- No arbitrary URLs, Bible IDs, query parameters, request bodies, bulk-download
  endpoint, browser UI, or cross-origin browser access is provided.

Passages are never cached by the service. All responses use `Cache-Control:
no-store`. The API key is sent only to `rest.api.bible` as a header; redirects
are not followed. Provider errors are sanitized. Metadata and chapter access
were verified against the owner's API.Bible account for all three editions.

## Quota and privacy

A single persistent Durable Object reserves requests atomically across regions:
10 requests/IP/minute, 60 requests globally/minute, and 4,500 upstream attempts
per UTC calendar month. Failures also consume reservations. HTTP 429 responses
include `Retry-After`. This leaves headroom within the account's 5,000-call plan,
but is not a mirror of the provider's billing counter: other clients, manual
requests, or a different billing reset date can exhaust the provider quota first.
Do not delete the Durable Object or change its identity to bypass the cap.

This public endpoint is rate-limited, not proof of an approved device. A client
can discover its URL and exhaust the shared allowance; rate limiting does not
prevent all abuse. No reusable client secret is embedded in the APK.

Cloudflare sees the client's IP and requested route. The limiter stores IP
counters for the last active minute, replacing them on the next minute's first
request; it also stores monthly aggregate counts. Worker observability is off
and application code does not log requests, keys, or passage text. API.Bible
receives the service's upstream requests. Its native-only FUMS exemption is the
basis for omitting browser analytics; confirm applicability to Light's Tool
Library distribution before release. Offline rights are not assumed.
