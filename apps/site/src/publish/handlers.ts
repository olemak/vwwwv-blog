// /api/* dispatch. Authentication required for everything here.
//
// Routes:
//   /api/posts                          GET (list), POST (create)
//   /api/posts/:slug                    GET, PUT, DELETE
//   /api/posts/:slug/publish            POST
//   /api/posts/:slug/unpublish          POST
//   /api/posts/:slug/revisions          GET
//   /api/posts/:slug/revert             POST  body: { revision_id }
//   /api/drafts                         GET — shortcut for ?status=draft
//   /api/images                         GET, POST (upload)
//   /api/images/:id                     DELETE
//   /api/flags/...                      delegated to @vwwwv/flags admin

import { queries, ulid, slugify, type PostStatus } from '@vwwwv/db';
import { handleAdminFlags } from '@vwwwv/flags';
import type { Env } from '../env';
import { flagsFor } from '../flags';
import { authenticate, unauthorizedResponse } from './auth';
import { uploadImage, deleteImage, listImages, backfillImageCacheControl } from './images';

export async function handleApi(
  request: Request,
  env: Env,
  _ctx: ExecutionContext
): Promise<Response> {
  const auth = await authenticate(request, env);
  if (!auth.ok) return unauthorizedResponse(auth.reason);

  const url = new URL(request.url);
  const path = url.pathname;

  // Flags admin → delegated to the package-level handler.
  if (path === '/api/flags' || path.startsWith('/api/flags/')) {
    return handleAdminFlags({
      flags: flagsFor(env, request),
      request,
      url,
      cookieSecret: env.FLAG_COOKIE_SECRET,
    });
  }

  // Drafts shortcut.
  if (path === '/api/drafts' && request.method === 'GET') {
    const posts = await queries.listPosts(env.DB, { status: 'draft', limit: 200 });
    return jsonResponse(posts);
  }

  // Posts.
  if (path === '/api/posts') {
    if (request.method === 'GET') return listPostsHandler(request, env);
    if (request.method === 'POST') return createPostHandler(request, env);
    return methodNotAllowed();
  }

  const postSubMatch = path.match(/^\/api\/posts\/([^/]+)(?:\/(publish|unpublish|revisions|revert))?\/?$/);
  if (postSubMatch?.[1]) {
    const slug = decodeURIComponent(postSubMatch[1]);
    const subroute = postSubMatch[2];

    if (!subroute) {
      if (request.method === 'GET') return getPostHandler(env, slug);
      if (request.method === 'PUT') return updatePostHandler(request, env, slug);
      if (request.method === 'DELETE') return deletePostHandler(env, slug);
      return methodNotAllowed();
    }

    if (request.method !== 'POST' && subroute !== 'revisions')
      return methodNotAllowed();

    if (subroute === 'publish') return setStatusHandler(env, slug, 'published');
    if (subroute === 'unpublish') return setStatusHandler(env, slug, 'draft');
    if (subroute === 'revisions') {
      if (request.method !== 'GET') return methodNotAllowed();
      return listRevisionsHandler(env, slug);
    }
    if (subroute === 'revert') return revertHandler(request, env, slug);
  }

  // Images.
  if (path === '/api/images') {
    if (request.method === 'GET') {
      const limit = parseIntOrDefault(url.searchParams.get('limit'), 200);
      const offset = parseIntOrDefault(url.searchParams.get('offset'), 0);
      const imgs = await listImages(env, { limit, offset });
      return jsonResponse(imgs);
    }
    if (request.method === 'POST') return uploadImageHandler(request, env);
    return methodNotAllowed();
  }

  // One-off admin operations on R2. Defined BEFORE the /api/images/:id
  // pattern, otherwise the catch-all id matcher would route this here
  // as a delete-by-id of an image with id="backfill-image-cache".
  if (path === '/api/admin/backfill-image-cache') {
    if (request.method !== 'POST') return methodNotAllowed();
    const result = await backfillImageCacheControl(env);
    return jsonResponse(result);
  }

  const imgMatch = path.match(/^\/api\/images\/([^/]+)\/?$/);
  if (imgMatch?.[1]) {
    if (request.method !== 'DELETE') return methodNotAllowed();
    const ok = await deleteImage(env, decodeURIComponent(imgMatch[1]));
    return new Response(null, { status: ok ? 204 : 404 });
  }

  return new Response('Not Found', { status: 404 });
}

// ─── Posts handlers ──────────────────────────────────────────────────

async function listPostsHandler(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const status = url.searchParams.get('status') as PostStatus | null;
  const tag = url.searchParams.get('tag');
  const limit = parseIntOrDefault(url.searchParams.get('limit'), 50);
  const offset = parseIntOrDefault(url.searchParams.get('offset'), 0);

  const posts = await queries.listPosts(env.DB, {
    status: status ?? ['draft', 'published', 'archived'],
    ...(tag ? { tag } : {}),
    limit,
    offset,
  });
  return jsonResponse(posts);
}

interface CreatePostBody {
  slug?: string;
  title: string;
  body: string;
  excerpt?: string | null;
  tags?: string[];
  status?: PostStatus;
  featured_image_id?: string | null;
  author_id?: string;
}

async function createPostHandler(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as CreatePostBody | null;
  if (!body || typeof body.title !== 'string' || typeof body.body !== 'string') {
    return jsonError(400, 'title and body are required');
  }

  const slug = body.slug?.trim() || slugify(body.title);
  if (!slug) return jsonError(400, 'slug could not be derived from title');

  const id = ulid();
  await queries.createPost(env.DB, {
    id,
    slug,
    title: body.title,
    body: body.body,
    excerpt: body.excerpt ?? null,
    status: body.status ?? 'draft',
    author_id: body.author_id ?? env.DEFAULT_AUTHOR_ID,
    tags: body.tags ?? [],
    featured_image_id: body.featured_image_id ?? null,
  });

  const created = await queries.getPostBySlug(env.DB, slug, { includeDrafts: true });
  return jsonResponse(created, 201);
}

async function getPostHandler(env: Env, slug: string): Promise<Response> {
  const post = await queries.getPostBySlug(env.DB, slug, { includeDrafts: true });
  return post ? jsonResponse(post) : new Response('Not Found', { status: 404 });
}

interface UpdatePostBody {
  slug?: string;
  title?: string;
  body?: string;
  excerpt?: string | null;
  tags?: string[];
  status?: PostStatus;
  featured_image_id?: string | null;
  /** Optional revision message (commit-style note). */
  message?: string | null;
}

async function updatePostHandler(
  request: Request,
  env: Env,
  slug: string
): Promise<Response> {
  const post = await queries.getPostBySlug(env.DB, slug, { includeDrafts: true });
  if (!post) return new Response('Not Found', { status: 404 });

  const body = (await request.json().catch(() => null)) as UpdatePostBody | null;
  if (!body) return jsonError(400, 'JSON body required');

  await queries.updatePost(
    env.DB,
    post.id,
    {
      ...(body.slug !== undefined ? { slug: body.slug } : {}),
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.body !== undefined ? { body: body.body } : {}),
      ...(body.excerpt !== undefined ? { excerpt: body.excerpt } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.featured_image_id !== undefined
        ? { featured_image_id: body.featured_image_id }
        : {}),
      ...(body.tags !== undefined ? { tags: body.tags } : {}),
    },
    body.message ?? null
  );

  const newSlug = body.slug ?? slug;
  const fresh = await queries.getPostBySlug(env.DB, newSlug, { includeDrafts: true });
  return jsonResponse(fresh);
}

async function deletePostHandler(env: Env, slug: string): Promise<Response> {
  const post = await queries.getPostBySlug(env.DB, slug, { includeDrafts: true });
  if (!post) return new Response('Not Found', { status: 404 });
  await queries.deletePost(env.DB, post.id);
  return new Response(null, { status: 204 });
}

async function setStatusHandler(
  env: Env,
  slug: string,
  status: PostStatus
): Promise<Response> {
  const post = await queries.getPostBySlug(env.DB, slug, { includeDrafts: true });
  if (!post) return new Response('Not Found', { status: 404 });
  await queries.updatePost(env.DB, post.id, { status });
  const fresh = await queries.getPostBySlug(env.DB, slug, { includeDrafts: true });
  return jsonResponse(fresh);
}

async function listRevisionsHandler(env: Env, slug: string): Promise<Response> {
  const post = await queries.getPostBySlug(env.DB, slug, { includeDrafts: true });
  if (!post) return new Response('Not Found', { status: 404 });
  const revs = await queries.listRevisions(env.DB, post.id);
  return jsonResponse(revs);
}

interface RevertBody {
  revision_id: number;
}

async function revertHandler(
  request: Request,
  env: Env,
  slug: string
): Promise<Response> {
  const body = (await request.json().catch(() => null)) as RevertBody | null;
  if (!body?.revision_id) return jsonError(400, 'revision_id required');
  const post = await queries.getPostBySlug(env.DB, slug, { includeDrafts: true });
  if (!post) return new Response('Not Found', { status: 404 });
  const rev = await queries.getRevision(env.DB, body.revision_id);
  if (!rev || rev.post_id !== post.id)
    return jsonError(404, 'revision not found for this post');
  await queries.updatePost(
    env.DB,
    post.id,
    { title: rev.title, body: rev.body },
    `Reverted to revision ${rev.id}`
  );
  const fresh = await queries.getPostBySlug(env.DB, slug, { includeDrafts: true });
  return jsonResponse(fresh);
}

// ─── Image handlers ──────────────────────────────────────────────────

async function uploadImageHandler(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as
    | Parameters<typeof uploadImage>[1]
    | null;
  if (!body?.filename || !body.content_base64) {
    return jsonError(400, 'filename and content_base64 required');
  }
  try {
    const result = await uploadImage(env, body);
    return jsonResponse(result, 201);
  } catch (err) {
    return jsonError(400, (err as Error).message);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function methodNotAllowed(): Response {
  return new Response('Method Not Allowed', { status: 405 });
}

function parseIntOrDefault(raw: string | null, def: number): number {
  if (!raw) return def;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : def;
}
