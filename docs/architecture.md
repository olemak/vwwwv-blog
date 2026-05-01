# Architecture notes

Why each thing is shaped the way it is. Reading order is not strict;
each section stands on its own.

## Monorepo with npm workspaces

The codebase splits into three reusable pieces — `apps/site` (the Worker),
`packages/db` (schema + queries), and `packages/flags` (homemade KV-backed
feature flag library). npm workspaces are good enough for this scale; pnpm
or Turborepo would buy us nothing today and would be a delta the user
maintains. Adding an `apps/viewer` (the QR offline viewer) or `packages/cli`
later is a one-line workspace addition.

## Vanilla web, no framework

The brief was emphatic: pages target ~15 KB, system fonts only, no JS
where avoidable, Lighthouse 100s. A framework moves the bytes-per-page
budget by an order of magnitude in the wrong direction. Server-side
rendering from TypeScript template literals produces exactly the HTML
we want, with no hydration tax and no client runtime. The only client JS
is `feed.js` (~1 KB) for the same-document expand choreography on
`<details>`.

## D1 as the source of truth for content

We considered git-as-CMS (Jekyll-shaped). The structural mismatch became
clear when we started enumerating the operations the publish skill would
need: list drafts, save partial edits, cross-device pickup, append
revisions, flip status, list-by-status. That's a CRUD store with a status
column. Git as a database is git used badly; SQLite is a database used
well. D1 lives at the edge, has sub-millisecond reads, and integrates
with Workers without a separate connection layer.

## KV for feature flags

D1 would also work for flags, but KV is the right tool: sub-millisecond
edge reads with eventual consistency across regions, no schema, designed
for the read-heavy small-value pattern that flags have. The single-digit
millisecond cache penalty of fetching from D1 is negligible at our scale,
but the architectural fit is clearer with KV.

## Edge cache as performance, not a CDN

Every published page is rendered through the Worker on cache miss. The
Worker emits `Cache-Control: public, max-age=60`, which Cloudflare's edge
honors. Repeat hits to a popular post serve from cache without ever
running the Worker. We deliberately don't try to do tag-based purging or
content hashing in v1; sixty seconds of staleness on a personal blog is
imperceptible. If a post update needs to be visible immediately, the
publish skill can call `cache.delete()` against the URL, but that's not
wired yet.

## TypeScript on the server, vanilla on the client

The Worker source is TypeScript; wrangler bundles via esbuild and the
client gets only the small `feed.js`. We chose TypeScript here because
the Worker is the place where most of the logic lives — D1 queries, the
publish API, the auth middleware, the markdown renderer. Client-side, we
ship as little JS as possible, and what we do ship is small enough to
read cover-to-cover.

## Markdown via `marked`

We use `marked` for body rendering. It's small (~30 KB unminified), well
maintained, and produces standard HTML that the propaganda CSS styles
correctly via the `.post__prose` parent. Rolling our own would be 200
lines of edge-case bugs.

## ULIDs for primary keys

Sortable, URL-safe, generated client-side, no collisions. Better than
auto-incrementing integers (predictable and leaky) and better than UUIDs
(opaque ordering). The `packages/db/src/ulid.ts` implementation is 25
lines and uses `crypto.getRandomValues`, which is available everywhere
Workers run.

## View Transitions API for navigation

Cross-document View Transitions, opted in via `@view-transition { navigation: auto }`
in `tokens.css`, give us SPA-feeling navigation without a router. Each
page is a full Worker-rendered response; the browser interpolates between
the old and new DOMs. Named elements (`vw-wordmark`, `vw-masthead`,
`vw-nav-active`) morph rather than crossfade. Reduced-motion users get a
hard cut.

Same-document View Transitions are wired separately in `feed.js` for the
`<details>` expand choreography on the feed.

## Authentication on the publish API

`/api/*` accepts three credential forms (in order of preference):

1. `Cf-Access-Jwt-Assertion` header — Cloudflare Access has validated.
2. `Cf-Access-Client-Id` + `Cf-Access-Client-Secret` headers — service
   token sent directly (matches what Access expects from non-browser
   callers).
3. `Authorization: Bearer <secret>` — bearer-token fallback, useful for
   curl during development.

In production with Access configured, only (1) reaches the Worker. The
fallbacks exist so the user can deploy and iterate before setting up
Access, then add Access without a code change.

## The skill is the editor

There is no editor surface. The user drafts in conversation with Claude,
and a Claude skill (defined in `skill/SKILL.md`) calls the publish API
with the right shape when the user says "publish." Drafts live in the
`status` column; the same conversation can be picked up on another
device because the row is the source of truth. This is the philosophical
move — replacing the editor with the chat — that the rest of the
architecture is in service of.

## Trunk-based, flag-gated

All work merges to `main`. Half-finished features hide behind flags
(`reading-time` is the v1 example; `expand-mode` and others will follow).
The flag library supports per-instance caching, KV-backed storage, and
a signed preview cookie so the operator can preview a flag flip in
their own browser without affecting visitors.

## What's deliberately not here

- No analytics, no cookie banner. Cloudflare provides aggregate edge
  analytics for free if needed.
- No comments. Replies are by mail.
- No newsletter. By design.
- No web fonts loaded from a CDN.
- No client-side router.
- No service worker yet (will land with the offline viewer / `/v` route).
