# vwwwv-blog

Personal portfolio and blog for [vwwwv.org](https://vwwwv.org).

Vanilla HTML/CSS/JS. Cloudflare Worker serves all routes. D1 holds posts and revisions. KV holds feature flags. R2 holds images. AI-driven publish workflow via a Claude skill that calls an authenticated endpoint on the Worker. No editor surface beyond the conversation.

```
Set with system-ui and a heavy hand. Served from Cloudflare.
No analytics, no fonts from a CDN, no people on laptops.
```

## What's here

```
vwwwv-blog/
├── apps/
│   └── site/              the only Worker for now — site + publish API
│       ├── src/           TypeScript Worker source
│       └── public/        static assets — tokens.css, feed.js, posts.js, wordmark.svg
├── packages/
│   ├── db/                D1 schema, migrations, query helpers, types
│   └── flags/             home-brewed feature-flag library, KV-backed
├── skill/                 the Claude skill — instructions for the AI editor
├── scripts/               seed.sql, helpers
└── docs/
    ├── wrangler-bootstrap.md   exact commands to get a fresh deploy live
    ├── architecture.md          why things are shaped the way they are
    └── future.md                things deliberately deferred
```

## Quick start

You need [`wrangler`](https://developers.cloudflare.com/workers/wrangler/) installed and logged in (`wrangler login`).

```bash
# Install deps
npm install

# Bootstrap Cloudflare resources (one-time, run from apps/site/)
# Full instructions in docs/wrangler-bootstrap.md
cd apps/site
wrangler d1 create vwwwv-blog-content
wrangler kv namespace create vwwwv-blog-flags
wrangler r2 bucket create vwwwv-blog-img
# Then paste the returned IDs into wrangler.toml.

# Apply the schema
wrangler d1 execute vwwwv-blog-content --file=../../packages/db/migrations/0001_initial.sql

# Set secrets (Access service token + cookie signing key)
wrangler secret put CF_ACCESS_CLIENT_ID
wrangler secret put CF_ACCESS_CLIENT_SECRET
wrangler secret put FLAG_COOKIE_SECRET

# Local development
npm run dev

# Deploy
npm run deploy
```

See `docs/wrangler-bootstrap.md` for the exact, copy-paste version with troubleshooting.

## Stack at a glance

- **Worker** for all routes — no separate frontend server
- **D1** for posts, revisions, tags, images metadata, authors
- **KV** for feature flags (boolean + string variants), low-latency reads
- **R2** for image storage at `img.vwwwv.org`
- **Cloudflare Access** with a service token for the publish API
- **View Transitions API** for cross-document navigation and same-document expand choreography
- **No framework**, no analytics, no external font CDN, no client-side router
- **System fonts only** for body, inline SVG for the wordmark
- **~15 KB target per page** (excluding images), Lighthouse 100s

## Stuff to know

- **Drafts are state, not files** — same row in `posts`, `status='draft'`. Cross-device free.
- **Revisions are append-only** — every save inserts a snapshot of title and body.
- **The publish API is the only write path.** No CMS dashboard. No editor. Claude (or any HTTP client) hits it with a service token.
- **Feature flags are server-side only** — the Worker reads KV per request (cached per isolate), branches on the value, emits the right HTML. No flag manifest leaks to the client.
- **Trunk-based.** All work goes to `main`. Half-finished features hide behind flags.

## What's not here yet

Listed in `docs/future.md` so we don't forget:

- Same-document View Transitions for `<details>` expand (CSS hooks already there, JS pending)
- The `/v` offline viewer for QR-code peer-to-peer sharing
- Image generation pipeline (Claude skill calls a generator, uploads to R2)
- Local CLI (`vw` — covers the AI-free path)
- Multi-tenant routing for sub-domain-per-author (the schema already accepts it)
- FTS5 search across post bodies
- Slug history for redirects when you rename a post

## Forking this for your own blog

The project is opinionated and personal — the propaganda-poster aesthetic,
the voice notes in the skill, the seed posts — but the architecture is
reusable. To make it yours:

1. Replace `apps/site/wrangler.toml` bindings (D1, KV, R2 IDs) with your own.
2. Replace the seed copy in `scripts/seed.sql` (or skip the seed entirely).
3. Rewrite `skill/skill.md` voice section. The propaganda look is in
   `apps/site/public/tokens.css` and the page-specific styles in
   `apps/site/src/render/feed-styles.ts` — a different palette and type
   stack will take it somewhere else entirely.
4. Update `apps/site/src/render/components.ts` `IMAGE_BASE` to your image
   subdomain.

## License

MIT. See `LICENSE`.
