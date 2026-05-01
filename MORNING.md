# Good morning.

Here's where you'll find things, and what to do first. Coffee first.

## What landed overnight

A working monorepo at the right shape, scaffolded from the design we
agreed on. Nothing is deployed yet — that's a 10-minute hands-on step
once you've had coffee.

```
vwwwv-blog/
├── apps/site/                Worker (TypeScript) + public/ static assets
├── packages/db/              D1 schema, query helpers, ULID gen
├── packages/flags/           homemade KV-backed feature flag library
├── skill/                    Claude skill — the editor surface
├── scripts/seed.sql          five sample posts in your voice
└── docs/                     wrangler-bootstrap, architecture, future
```

## What works

- Server-side renders the home feed, tag cloud, per-tag filter, single
  posts (`/post/:slug`), about page, sitemap, robots
- Static assets served via Cloudflare's `[assets]` binding
- Reading-time and wordmark-variant flags wired (you can flip either via
  `PUT /api/flags/<name>`)
- Publish API: create, update, delete, publish, unpublish, list, list
  drafts, list revisions, revert, image upload to R2
- Cloudflare Access service-token auth (with a bearer-token fallback for
  early dev)
- View Transitions for cross-document nav (already in tokens.css from
  the Claude Design output) and same-document expand choreography on
  feed.js
- Markdown rendering via `marked`, styled to match the propaganda design

## What you need to do

In order. Detailed in `docs/wrangler-bootstrap.md`.

1. **`npm install`** at the repo root. Pulls workspaces, marked, wrangler.
2. **`cd apps/site && wrangler login`** if not already.
3. **Create three Cloudflare resources:**
   - `wrangler d1 create vwwwv-blog-content`
   - `wrangler kv namespace create vwwwv-blog-flags`
   - `wrangler r2 bucket create vwwwv-blog-img`
4. **Paste the returned IDs** for D1 and KV into `apps/site/wrangler.toml`
   (replacing the `REPLACE_AFTER_*` placeholders).
5. **Apply the schema:**
   ```
   wrangler d1 execute vwwwv-blog-content --remote \
     --file=../../packages/db/migrations/0001_initial.sql
   ```
6. **(optional) Seed:**
   ```
   wrangler d1 execute vwwwv-blog-content --remote \
     --file=../../scripts/seed.sql
   ```
7. **Set secrets:**
   ```
   wrangler secret put CF_ACCESS_CLIENT_ID
   wrangler secret put CF_ACCESS_CLIENT_SECRET
   openssl rand -base64 48 | wrangler secret put FLAG_COOKIE_SECRET
   ```
8. **Deploy:** `wrangler deploy`.
9. Open the workers.dev URL in a browser. The five seed posts should
   render in the propaganda layout.

When you're happy, uncomment the `routes` block in wrangler.toml to bind
to `blog.vwwwv.org`, redeploy.

## Things I want your eye on

1. **Wordmark.** Still needs the designer's pass. The flag system is
   ready — flip `wordmark-variant` to `"thin"` to see a stripped-down
   inline-SVG version side-by-side with the default. (Set with: `curl
   -X PUT https://your-worker/api/flags/wordmark-variant -H 'Authorization:
   Bearer $CF_ACCESS_CLIENT_SECRET' -d '{"value": "thin"}'`)
2. **The five seed posts.** Two are the ones Claude Design produced
   (`mailto://`, `Lighthouse 100 is a personality disorder`). The other
   three are written in matching voice — feel free to delete and start
   over via the publish skill once it's wired.
3. **The skill.** `skill/SKILL.md` is the editor. To install it: copy
   the `skill/` folder to wherever your Claude installation reads skills
   from (varies by client). Once installed, asking Claude to "draft a
   post about X" should trigger it.
4. **Friction check.** If anything I've shaped feels like a chore,
   that's a bug, not a feature.

## What I deliberately deferred

In `docs/future.md`. Highlights:

- The `/v` offline QR-share viewer (the original vwwwv pitch)
- The `vw` CLI (AI-free path)
- Multi-tenant routing for atle.vwwwv.org
- Image generation tied to the skill (currently just spec'd)
- FTS5 search, slug-rename redirects, RSS

## Open questions for you

- **Account name:** What's your Cloudflare account name (for the
  workers.dev URL pattern)?
- **Access vs bearer:** Want to set up Cloudflare Access today, or run on
  bearer-token auth for now and add Access later?
- **About-page bio:** I seeded with copy from the Claude Design about
  page. Yours to rewrite.

When you wake me up, just say what's next and I'll keep going.
