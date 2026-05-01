# Wrangler bootstrap — getting a fresh deploy live

Run these from `apps/site/` unless noted. They're the exact commands; copy-paste them in order. Anything in `<angle brackets>` is something you'll fill in.

## 0. Prerequisites

```bash
node --version       # >= 22
wrangler --version   # >= 4.0
wrangler login       # opens a browser; one-time
```

## 1. Install workspace deps

From the repo root:

```bash
npm install
```

This installs everything via npm workspaces. `apps/site` picks up `@vwwwv/db`, `@vwwwv/flags`, and `marked`.

## 2. Create Cloudflare resources

From `apps/site/`:

### D1 (post storage)

```bash
wrangler d1 create vwwwv-blog-content
```

Output looks like:

```
✅ Successfully created DB 'vwwwv-blog-content' in region WEUR
Created your new D1 database.

[[d1_databases]]
binding = "DB"
database_name = "vwwwv-blog-content"
database_id = "abcdef12-3456-7890-abcd-ef1234567890"
```

Copy the `database_id` into `apps/site/wrangler.toml` (replacing the placeholder).

### KV (feature flags)

```bash
wrangler kv namespace create vwwwv-blog-flags
```

Output:

```
🌀 Creating namespace with title "vwwwv-blog-flags"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "vwwwv-blog-flags", id = "abc123def456..." }
```

Copy the `id` into the `[[kv_namespaces]]` block in `wrangler.toml`.

### R2 (image storage)

```bash
wrangler r2 bucket create vwwwv-blog-img
```

No ID needed — R2 buckets are referenced by name. The wrangler.toml is already set up with `bucket_name = "vwwwv-blog-img"`.

## 3. Apply the schema

From the repo root (or adjust paths):

```bash
wrangler d1 execute vwwwv-blog-content --remote \
  --file=packages/db/migrations/0001_initial.sql
```

The `--remote` flag applies it to the production D1; omit for local-only.

## 4. (Optional) Seed sample posts

```bash
wrangler d1 execute vwwwv-blog-content --remote \
  --file=scripts/seed.sql
```

Adds five posts (four published, one draft) so the design has something to render. You can clean these up later via the publish skill or:

```bash
wrangler d1 execute vwwwv-blog-content --remote \
  --command="DELETE FROM posts WHERE id LIKE '01JSEED%'"
```

## 5. Set secrets

The publish API needs a service-token secret (or an equivalent bearer token for early development) and a flag-cookie signing key. Generate values you keep secret.

```bash
# A service-token secret — used by the Claude skill / CLI to authenticate.
# In Access flow, this is the secret half of a service token minted in
# the Cloudflare Zero Trust dashboard. Without Access, this is just a
# bearer token the Worker will accept on Authorization: Bearer <secret>.
wrangler secret put CF_ACCESS_CLIENT_SECRET
# (paste a long random string when prompted)

# A matching client ID — meaningful only with Access. Without Access,
# any non-empty value works. With Access, this is the Cloudflare-minted
# service-token Client ID.
wrangler secret put CF_ACCESS_CLIENT_ID

# A signing secret for the flag-override preview cookie.
openssl rand -base64 48 | wrangler secret put FLAG_COOKIE_SECRET
```

## 6. Deploy

```bash
wrangler deploy
```

You'll get a `https://vwwwv-blog.<your-account>.workers.dev` URL. Hit it. The seed posts should render in the propaganda-poster aesthetic.

## 7. (Optional) Set up Cloudflare Access for the publish API

Without Access, the Worker accepts a bearer token (the `CF_ACCESS_CLIENT_SECRET` secret you just set). That's fine for development. For production, put Cloudflare Access in front of `/api/*` so credentials are validated at the edge:

1. **Zero Trust dashboard → Access → Applications → Add an application → Self-hosted.**
2. Application name: `vwwwv-blog publish API`
3. Subdomain: leave blank to apply to apex/all
4. Application domain: `<your-account>.workers.dev` (or the custom domain when you add one)
5. Path: `/api/`
6. Add a policy:
   - Action: `Service Auth`
   - Selector: `Service Token` → create a new one named `vwwwv-blog publisher`
7. Save. Cloudflare gives you a Client ID and Secret for the service token.
8. Update the Worker secrets to match:

```bash
wrangler secret put CF_ACCESS_CLIENT_ID       # paste Access service-token ID
wrangler secret put CF_ACCESS_CLIENT_SECRET   # paste Access service-token secret
```

The Claude skill / CLI sends those two values as headers on every publish call; Access validates at the edge before the request reaches the Worker.

## 8. (Optional) Custom domain `blog.vwwwv.org`

When the new site is ready to go live, in `apps/site/wrangler.toml` uncomment the `routes` block:

```toml
routes = [
  { pattern = "blog.vwwwv.org", custom_domain = true }
]
```

Then redeploy:

```bash
wrangler deploy
```

Wrangler will create the DNS record automatically (you're already on Cloudflare). Visit `https://blog.vwwwv.org` and the new site is live.

When you're satisfied, swap the apex by removing the existing binding from whatever serves `vwwwv.org` (the abandoned qrshare site) and adding `vwwwv.org` as a custom domain on this Worker.

## 9. (Optional) Set up the image subdomain

For images served from R2 at `img.vwwwv.org`:

1. Cloudflare dashboard → R2 → your `vwwwv-blog-img` bucket → Settings → Custom Domains.
2. Add `img.vwwwv.org`.
3. The DNS record is automatic.
4. Update `vars.SITE_URL` in `wrangler.toml` if you want absolute image URLs to use that domain (not strictly needed; the Worker proxies `/img/*` regardless).

## 10. Local development

```bash
npm run dev
# (from repo root, runs `wrangler dev` in apps/site)
```

Wrangler dev runs against a local D1 and KV by default; pass `--remote` to use production. Local dev needs a separate seed:

```bash
wrangler d1 execute vwwwv-blog-content \
  --file=packages/db/migrations/0001_initial.sql
wrangler d1 execute vwwwv-blog-content \
  --file=scripts/seed.sql
```

## Common issues

- **"D1_ERROR: no such table: posts"** — you ran the dev server against local D1 but didn't apply the migration locally. Run step 3 without `--remote`.
- **"401 Unauthorized" on /api/* during development** — your Authorization header doesn't match the `CF_ACCESS_CLIENT_SECRET` secret. Either re-set the secret or pass `Authorization: Bearer <value>` on calls.
- **Static assets 404 in dev but work in deploy** — ensure `apps/site/public/` has the files and `[assets]` config in `wrangler.toml` points at `./public`.
- **Hot reload not catching changes to `packages/db` or `packages/flags`** — `wrangler dev` watches `apps/site/src` by default; restart it after package changes.
