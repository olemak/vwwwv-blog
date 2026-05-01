# Future work — deliberately deferred

Listed so we don't forget. Not prioritized.

## Same-document View Transitions on `<details>` open

Already partially wired in `apps/site/public/feed.js` — the JS calls
`document.startViewTransition()` and lazily assigns `view-transition-name`
to the toggling post's title and figure. Tested in Chrome/Edge; needs
verification on Safari 18 and Firefox once Firefox catches up. The CSS
hooks (`data-vt-title`, `data-vt-media`) are already emitted by the
server-render in `components.ts`.

## `/v` offline viewer (QR-code peer-to-peer)

The "vwwwv" domain came from an idea about transferring web content
peer-to-peer without HTTP. The architecture supports it:

- A small `/v` route renders a self-contained viewer (~5 KB) that decodes
  a base64-gzipped markdown payload from the URL fragment and renders it
  locally.
- Each post page gets a "share offline" affordance that builds a QR
  containing `vwwwv.org/v#<base64-gzip-of-md>`.
- For longer posts, animated QR sequences (txqr / qrloop).

Constraints we're keeping in v1 to preserve this option:
- System fonts only (no font CDN dependency)
- Vanilla markdown (no plugins requiring server rendering)
- Inline images are base64 if any (no remote URL deps in body content)

## Image generation pipeline

The publish skill (in `skill/SKILL.md`) currently describes the AI-image
workflow but doesn't call a generator. To wire:

1. Pick a model (Claude can call image-gen tools; or post to a separate
   service that does Stable Diffusion / DALL-E / similar).
2. Skill builds prompt = persistent style anchor (`skill/prompts/style-anchor.md`)
   + per-post subject.
3. Skill receives image bytes, base64-encodes, POSTs to `/api/images` with
   `source_type: 'ai-generated'`.
4. Skill inserts the returned URL into the post body markdown.

## Local CLI (`vw`)

The architecture intentionally supports an AI-free path: the publish
endpoints are HTTP, so a CLI is just another client. Suggested shape:

```
vw new <slug>          scaffold a draft (just a JSON POST to /api/posts)
vw list [--drafts]     fetch /api/posts and pretty-print
vw open <slug>         GET /api/posts/<slug>, dump body to a temp file,
                       open in $EDITOR, on close PUT changes back
vw publish <slug>      POST /api/posts/<slug>/publish
vw rm <slug>           DELETE /api/posts/<slug>
```

About 200 lines of TypeScript, packaged as `packages/cli` and run via
`npm exec vw …`.

## Multi-tenant routing

Schema is ready (`authors` table with a `subdomain` column, `posts.author_id`
foreign key). To enable:

1. Worker reads `request.headers.get('host')` and routes by subdomain.
2. `getAuthorBySubdomain` already exists in `packages/db`.
3. Filter `listPosts` by `author_id` for non-default authors.
4. Each author gets their own Cloudflare Access service token (or
   shared, if trust is mutual).

The publish skill needs to know which author it's writing as; either a
config option or pulled from the auth context.

## FTS5 search

D1 supports SQLite's FTS5 virtual tables. Add a content-shadow table
indexed on `posts.body` and `posts.title`; rebuild on update via trigger.
A single new endpoint (`GET /api/search?q=...`) plus a small `/search`
page would cover it.

## Slug history for redirects

When you rename a slug, inbound links break. Add a `slug_redirects`
table:

```sql
CREATE TABLE slug_redirects (
  old_slug TEXT PRIMARY KEY,
  new_slug TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

On `updatePost` with a slug change, INSERT into the redirects table.
On `getPostBySlug`, fall through to the redirects on miss and 301 to
the new URL.

## Atom / RSS feed

`/feed.xml` route serving an Atom feed of recent published posts.
Mirror the `getPosts(limit=20)` query and emit Atom XML. ~50 lines.

## Webhook on publish

Useful for cross-posting to Mastodon / RSS aggregators / a personal
"now" page. POST to a configurable webhook URL on `publish` and
`unpublish` actions. Fits as middleware in the publish handler.

## Image variant transforms

R2 stores originals; Cloudflare Images (paid) or a Worker-side resize
loop (free) generates thumbnail/small/medium variants. Right now the
publish skill is expected to upload pre-sized WebP; lifting that into
the Worker would simplify the skill.

## Cache busting on update

Currently published pages are edge-cached for 60 seconds. Add a
`cache.delete()` call from the publish handler when a post is updated
or its status changes — would make changes visible instantly. Easy
addition; not done because the user is the only one likely to notice
in those 60 seconds.

## Observability

Cloudflare's Workers Observability is enabled in `wrangler.toml`.
Errors logged via `console.error` will land there. A small `/api/health`
endpoint that pings D1 and KV could feed an external uptime monitor.

## Tests

Currently zero. The shape that earns its keep:

- A handful of `vitest` tests against the query helpers (mocking D1).
- A snapshot test of the rendered home page given a fixed set of posts.
- An end-to-end smoke test that hits the deployed worker.dev URL.

Not blocking; the publish-as-tool-call workflow makes manual verification
quick.
