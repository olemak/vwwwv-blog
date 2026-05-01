// R2 image upload helpers.
//
// The publish skill uploads images by POSTing JSON with a base64 body. We
// decode, write to R2, register metadata in D1, and return a URL the post
// markdown can reference.

import { queries, ulid } from '@vwwwv/db';
import type { Image, ImageSourceType } from '@vwwwv/db';
import type { Env } from '../env';

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
    httpMetadata: { contentType },
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
