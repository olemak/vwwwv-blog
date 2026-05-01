// Request → handler dispatch. The Worker entry (index.ts) calls route().
//
// Static assets (/tokens.css, /wordmark.svg, /feed.js, /uploads/*) are
// served before this Worker runs, via the [assets] binding. We only see
// requests that don't match a static file.

import { queries, type PostWithRelations } from '@vwwwv/db';
import type { Env } from './env';
import { loadFlags } from './flags';
import { renderFeed } from './render/feed';
import { renderAbout } from './render/about';
import { renderTagCloud } from './render/tag-cloud';
import { renderPost } from './render/post';
import { handleApi } from './publish/handlers';

const HTML_HEADERS: HeadersInit = {
  'Content-Type': 'text/html; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  // Short edge cache; revalidated frequently. We don't try to do clever
  // tag-based purging in v1 — the worker is fast enough that re-rendering
  // every minute is fine.
  'Cache-Control': 'public, max-age=60, s-maxage=60',
};

export async function route(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  // ─── Read paths ────────────────────────────────────────────────────
  if (request.method === 'GET' || request.method === 'HEAD') {
    if (pathname === '/') return handleFeedHome(request, env);
    if (pathname === '/about') return handleAboutPage(request, env);
    if (pathname === '/tag' || pathname === '/tag/') return handleTagCloudPage(request, env);

    const tagMatch = pathname.match(/^\/tag\/([^/]+)\/?$/);
    if (tagMatch?.[1]) return handleTagFilter(request, env, decodeURIComponent(tagMatch[1]));

    const postMatch = pathname.match(/^\/post\/([^/]+)\/?$/);
    if (postMatch?.[1]) return handlePostPage(request, env, decodeURIComponent(postMatch[1]));

    if (pathname.startsWith('/img/')) {
      return handleImage(env, pathname.slice('/img/'.length));
    }

    if (pathname === '/robots.txt') {
      return new Response(`User-agent: *\nAllow: /\nSitemap: ${env.SITE_URL}/sitemap.xml\n`, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (pathname === '/sitemap.xml') {
      return handleSitemap(env);
    }
  }

  // ─── Publish API ───────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    return handleApi(request, env, ctx);
  }

  // ─── Static asset fallback ────────────────────────────────────────
  return env.ASSETS.fetch(request);
}

// ─── Page handlers ────────────────────────────────────────────────────

async function handleFeedHome(request: Request, env: Env): Promise<Response> {
  const flags = await loadFlags(env, request);
  const posts = await queries.listPosts(env.DB, { limit: 50 });
  const html = renderFeed({
    posts,
    showReadingTime: flags.readingTime,
    wordmarkVariant: flags.wordmarkVariant,
  });
  return new Response(html, { headers: HTML_HEADERS });
}

async function handleAboutPage(request: Request, env: Env): Promise<Response> {
  const flags = await loadFlags(env, request);
  const author = await queries.getAuthor(env.DB, env.DEFAULT_AUTHOR_ID);
  if (!author) {
    return new Response('Author not configured. Run the migration to seed.', {
      status: 500,
    });
  }
  const html = renderAbout({ author, wordmarkVariant: flags.wordmarkVariant });
  return new Response(html, { headers: HTML_HEADERS });
}

async function handleTagCloudPage(request: Request, env: Env): Promise<Response> {
  const flags = await loadFlags(env, request);
  const tags = await queries.listAllTags(env.DB, { onlyPublished: true });

  const postsByTag: Record<string, PostWithRelations[]> = {};
  let totalPosts = 0;
  await Promise.all(
    tags.map(async (tag) => {
      const posts = await queries.listPosts(env.DB, { tag: tag.name, limit: 20 });
      postsByTag[tag.name] = posts;
    })
  );
  for (const tag of tags) totalPosts += postsByTag[tag.name]?.length ?? 0;

  const html = renderTagCloud({
    tags,
    postsByTag,
    showReadingTime: flags.readingTime,
    wordmarkVariant: flags.wordmarkVariant,
    totalPosts,
  });
  return new Response(html, { headers: HTML_HEADERS });
}

async function handleTagFilter(
  request: Request,
  env: Env,
  tagName: string
): Promise<Response> {
  const flags = await loadFlags(env, request);
  const posts = await queries.listPosts(env.DB, { tag: tagName, limit: 50 });
  const html = renderFeed({
    posts,
    showReadingTime: flags.readingTime,
    wordmarkVariant: flags.wordmarkVariant,
    tagFilter: tagName,
  });
  return new Response(html, { headers: HTML_HEADERS });
}

async function handlePostPage(
  request: Request,
  env: Env,
  slug: string
): Promise<Response> {
  const flags = await loadFlags(env, request);
  const post = await queries.getPostBySlug(env.DB, slug);
  if (!post) return new Response('Not Found', { status: 404 });
  const html = renderPost({
    post,
    showReadingTime: flags.readingTime,
    wordmarkVariant: flags.wordmarkVariant,
    siteUrl: env.SITE_URL,
  });
  return new Response(html, { headers: HTML_HEADERS });
}

async function handleImage(env: Env, key: string): Promise<Response> {
  if (!key || key.includes('..')) return new Response('Bad Request', { status: 400 });
  const obj = await env.IMAGES.get(key);
  if (!obj) return new Response('Not Found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set(
    'Cache-Control',
    'public, max-age=31536000, immutable, stale-while-revalidate=86400'
  );
  headers.set('ETag', obj.httpEtag);
  return new Response(obj.body, { headers });
}

async function handleSitemap(env: Env): Promise<Response> {
  const posts = await queries.listPosts(env.DB, { limit: 1000 });
  const tags = await queries.listAllTags(env.DB, { onlyPublished: true });
  const urls: string[] = [
    `${env.SITE_URL}/`,
    `${env.SITE_URL}/about`,
    `${env.SITE_URL}/tag`,
    ...tags.map((t) => `${env.SITE_URL}/tag/${encodeURIComponent(t.name)}`),
    ...posts.map((p) => `${env.SITE_URL}/post/${encodeURIComponent(p.slug)}`),
  ];
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
    `\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
