// R2 image upload helpers.
//
// The publish skill uploads images by POSTing JSON with a base64 body. We
// decode, write to R2, register metadata in D1, and return a URL the post
// markdown can reference.

import { queries, ulid } from '@vwwwv/db';
import type { Image, ImageSourceType } from '@vwwwv/db';
import type { Env } from '../env';

// All uploaded images get a long Cache-Control on their R2 object. Two
// reasons. First, the r2_key is content-addressed (ULID + safe filename),
// so the bytes at any given key never change — `immutable` is honest.
// Second, Cloudflare's Image Transformation engine inherits the source's
// Cache-Control when emitting the transformed response's `Cache-Control`
// header. Since custom Edge/Browser TTLs for /cdn-cgi/image/* responses
// are a paid feature, this is the only free-plan lever for getting
// long-lived caches on transformed images.
const IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export interface UploadImageInput {
  /** Filename — used to derive the R2 key and content type. */
  filename: string;
  /** Base64-encoded body. */
  content_base64: string;
  /** Optional metadata. */
  alt?: string | null;
  caption?: string | null;
  source_type?: ImageSourceType | null;
  width?: number | null;
  height?: number | null;
}

export interface UploadImageResult {
  id: string;
  r2_key: string;
  url: string;
  bytes: number;
}

export async function uploadImage(
  env: Env,
  input: UploadImageInput
): Promise<UploadImageResult> {
  if (!input.filename) throw new Error('filename required');
  if (!input.content_base64) throw new Error('content_base64 required');

  const bytes = base64ToBytes(input.content_base64);
  const id = ulid();

  // Images are standalone, not tied to posts. Key pattern: <year>/<month>/<id>-<safename>.
  // Date-prefixed for friendlier R2 browsing; ULID prevents collisions.
  const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80);
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const r2_key = `${yyyy}/${mm}/${id}-${safeName}`;

  const contentType = guessContentType(safeName);

  await env.IMAGES.put(r2_key, bytes, {
    httpMetadata: { contentType, cacheControl: IMAGE_CACHE_CONTROL },
  });

  await queries.createImage(env.DB, {
    id,
    filename: safeName,
    r2_key,
    alt: input.alt ?? null,
    caption: input.caption ?? null,
    width: input.width ?? null,
    height: input.height ?? null,
    bytes: bytes.byteLength,
    source_type: input.source_type ?? 'upload',
  });

  return {
    id,
    r2_key,
    url: `https://img.vwwwv.org/${r2_key}`,
    bytes: bytes.byteLength,
  };
}

export async function deleteImage(env: Env, id: string): Promise<boolean> {
  const img = await queries.getImage(env.DB, id);
  if (!img) return false;
  await env.IMAGES.delete(img.r2_key);
  await queries.deleteImage(env.DB, id);
  return true;
}

export function listImages(
  env: Env,
  options: { limit?: number; offset?: number } = {}
): Promise<Image[]> {
  return queries.listImages(env.DB, options);
}

// ─── Cache-Control backfill ──────────────────────────────────────────

export interface BackfillResult {
  scanned: number;
  rewritten: number;
  alreadyOk: number;
  bytes: number;
  failures: { key: string; error: string }[];
}

/** Walk the entire IMAGES bucket and re-`put` any object whose
 *  `Cache-Control` header isn't already the immutable long-TTL value.
 *
 *  R2's binding API has no copy-with-metadata-only operation, so we have
 *  to round-trip the bytes through the Worker. Cheap for our handful of
 *  posters; the function is exposed via /api/admin/backfill-image-cache
 *  and behind the same auth as the rest of /api/. Skips objects that
 *  already carry the right header so it's safe to re-run. */
export async function backfillImageCacheControl(
  env: Env
): Promise<BackfillResult> {
  const result: BackfillResult = {
    scanned: 0,
    rewritten: 0,
    alreadyOk: 0,
    bytes: 0,
    failures: [],
  };

  let cursor: string | undefined = undefined;
  do {
    const page = await env.IMAGES.list({ limit: 1000, cursor });
    cursor = page.truncated ? page.cursor : undefined;

    for (const stub of page.objects) {
      result.scanned += 1;
      try {
        if (stub.httpMetadata?.cacheControl === IMAGE_CACHE_CONTROL) {
          result.alreadyOk += 1;
          continue;
        }
        const got = await env.IMAGES.get(stub.key);
        if (!got) {
          result.failures.push({ key: stub.key, error: 'get returned null' });
          continue;
        }
        const body = await got.arrayBuffer();
        await env.IMAGES.put(stub.key, body, {
          httpMetadata: {
            ...got.httpMetadata,
            cacheControl: IMAGE_CACHE_CONTROL,
          },
          customMetadata: got.customMetadata,
        });
        result.rewritten += 1;
        result.bytes += body.byteLength;
      } catch (err) {
        result.failures.push({ key: stub.key, error: (err as Error).message });
      }
    }
  } while (cursor);

  return result;
}

// ─── helpers ─────────────────────────────────────────────────────────

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/^data:[^;]+;base64,/, '');
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function guessContentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  const map: Record<string, string> = {
    webp: 'image/webp',
    avif: 'image/avif',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
  };
  return map[ext] ?? 'application/octet-stream';
}
