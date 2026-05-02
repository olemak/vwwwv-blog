# vwwwv-blog

Personal portfolio and blog for [vwwwv.org](https://vwwwv.org).

Vanilla HTML/CSS/JS. Cloudflare Worker serves all routes. D1 holds posts and revisions. KV holds feature flags. R2 holds images. AI-driven publish workflow via a Claude skill that calls an authenticated endpoint on the Worker. No editor surface beyond the conversation, but it is possible to open the post in an md and edit it there, and then have the AI curl it. Or write and apply the curl yourself.

It's all free! Cloudflare has a generous free tier, so you would have to get a lot of readers on blog before serving it would cost you anything.

```
Set with system-ui and a heavy hand. Served from Cloudflare.
No analytics, no fonts from a CDN, very fast, aims for 100 Lighthouse scores.
```

## What's here

```
vwwwv-blog/
├── apps/
│   └── site/              the only Worker for now — site + publish API
│       ├── src/           TypeScript Worker source
│       └── public/        static assets — tokens.css, feed.js, wordmark.svg
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
# Install deps and copy the wrangler config template
npm install
cp apps/site/wrangler.toml.example apps/site/wrangler.toml

# Bootstrap Cloudflare resources (one-time, run from apps/site/).
# Full instructions in docs/wrangler-bootstrap.md.
cd apps/site
wrangler d1 create vwwwv-blog-content
wrangler kv namespace create vwwwv-blog-flags
wrangler r2 bucket create vwwwv-blog-img
# Then paste the returned IDs into wrangler.toml.

# Apply the schema
wrangler d1 execute vwwwv-blog-content --remote \
  --file=../../packages/db/migrations/0001_initial.sql

# Set secrets — bearer-token auth for now. Cloudflare Access in front of
# /api/* is the cleaner v1.1; bearer is the simpler v1.
wrangler secret put CF_ACCESS_CLIENT_ID       # any value works pre-Access
wrangler secret put CF_ACCESS_CLIENT_SECRET   # the bearer secret itself
wrangler secret put FLAG_COOKIE_SECRET        # signs the preview cookie

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
- **Bearer-token auth** for the publish API (with **Cloudflare Access service tokens** as the cleaner v1.1 upgrade)
- **View Transitions API** for cross-document navigation and same-document expand choreography
- **No framework**, no analytics, no external font CDN, no client-side router
- **System fonts only** for body, inline SVG for the wordmark
- **~15 KB target per page** (excluding images), Lighthouse 100s

## Stuff to know

- **Drafts are state, not files** — same row in `posts`, `status='draft'`. Cross-device free.
- **Revisions are append-only** — every save inserts a snapshot of title and body.
- **The publish API is the only write path.** No CMS dashboard. No editor. Claude (or any HTTP client) hits it with a bearer token.
- **Feature flags are server-side only** — the Worker reads KV per request (cached per isolate), branches on the value, emits the right HTML. No flag manifest leaks to the client.
- **Trunk-based.** All work goes to `main`. Half-finished features hide behind flags.

## What's not here yet

Listed in `docs/future.md` so we don't forget:

- The `/v` offline viewer for QR-code peer-to-peer sharing
- Image generation pipeline (Claude skill calls a generator, uploads to R2)
- Local CLI (`vw` — covers the AI-free path)
- Multi-tenant routing for sub-domain-per-author (the schema already accepts it)
- FTS5 search across post bodies
- Slug history for redirects when you rename a post

## Hooking up the skill

The skill in `skill/skill.md` is what makes the chat-as-CMS workflow
actually function. It's written for Claude Code, but the body is generic
agent instructions — any modern coding agent with filesystem and HTTP
access can use it.

### Claude Code

Copy or symlink the `skill/` folder into your Claude skills directory.
Symlink lets edits to `skill.md` take effect on the next reinstall:

```bash
ln -s "$(pwd)/skill" ~/.claude/skills/vwwwv-blog
# or, for a one-time copy:
cp -r skill ~/.claude/skills/vwwwv-blog
```

Then in a new Claude Code session opened in the repo folder, ask:

```
What skills do you have?
```

`vwwwv-blog` should appear. Asking the agent to "draft a post about X"
will load the skill.

### Other agents (Cursor, Continue, custom agents on Claude/OpenAI/Gemini)

The skill is just a markdown file. To adapt:

- **Cursor**: paste the body of `skill/skill.md` into `.cursorrules` (or
  the project-level rules surface in your version of Cursor).
- **Continue / Cody**: paste into the equivalent rules / instructions
  file.
- **Custom agent on the Claude or OpenAI APIs**: load `skill/skill.md`
  as the system prompt (or append to it).

The agent needs to be able to do four things:

1. Read `.env` from the project root (for `CF_PUBLISH_URL` and
   `CF_ACCESS_CLIENT_SECRET`).
2. Make authenticated HTTP requests to your Worker.
3. Write files to `.drafts/<slug>.md` (for the edit-as-file flow).
4. Optionally run `code <path>` to open the draft in VS Code.

If an agent has filesystem and shell access (most coding agents do),
the skill works as written. Browser-only agents (the chat surfaces of
Claude.ai, ChatGPT, etc.) can't follow the edit-as-file or `.env`
parts, but the publish/list/update flow still works if you paste the
URL and secret into the conversation.

## Forking this for your own blog

The project is opinionated and personal — the propaganda-poster aesthetic,
the voice notes in the skill, the seed posts — but the architecture is
reusable. To make it yours:

1. `cp apps/site/wrangler.toml.example apps/site/wrangler.toml` and fill in
   your own D1 / KV / R2 IDs and route patterns. The real `wrangler.toml`
   is gitignored — every fork has its own.
2. Replace the seed copy in `scripts/seed.sql` (or skip the seed entirely).
3. Rewrite `skill/skill.md` voice section. The propaganda look is in
   `apps/site/public/tokens.css` and the page-specific styles in
   `apps/site/src/render/feed-styles.ts` — a different palette and type
   stack will take it somewhere else entirely.
4. Update `apps/site/src/render/components.ts` `IMAGE_BASE` to your image
   subdomain.

## Is this a sane way to make a blog?

No. Probably not. Is it fun, and cool? Yes — well, if you ask me. If
you agree, and you'd like to see what this weird stack actually
outputs, it's at [vwwwv.org](https://vwwwv.org).

## License

MIT. See `LICENSE`.
