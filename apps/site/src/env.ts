// Worker environment — mirrors apps/site/wrangler.toml.

export interface Env {
  // Bindings (declared in wrangler.toml).
  DB: D1Database;
  FLAGS: KVNamespace;
  IMAGES: R2Bucket;
  ASSETS: Fetcher;

  // Public vars.
  SITE_URL: string;
  DEFAULT_AUTHOR_ID: string;
  /** Cloudflare Access team name (e.g. "your-team.cloudflareaccess.com"). */
  CF_ACCESS_TEAM?: string;

  // Secrets — set with `wrangler secret put NAME`.
  CF_ACCESS_CLIENT_ID: string;
  CF_ACCESS_CLIENT_SECRET: string;
  FLAG_COOKIE_SECRET: string;
}
