// Signed-cookie helpers for flag overrides.
// The cookie lets the operator preview a different flag state in their own
// browser without affecting other visitors. Signed with HMAC-SHA-256 so the
// payload can't be tampered with client-side.

const COOKIE_NAME = 'vw_flag_preview';

interface SignedPayload {
  overrides: Record<string, boolean | string | number>;
  expires: number; // unix epoch seconds
}

export async function parseOverrides(
  request: Request,
  secret: string
): Promise<Map<string, boolean | string | number> | null> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = parseCookies(cookieHeader);
  const value = cookies[COOKIE_NAME];
  if (!value) return null;

  const dot = value.indexOf('.');
  if (dot < 0) return null;
  const payloadEncoded = value.slice(0, dot);
  const signature = value.slice(dot + 1);

  if (!(await verify(payloadEncoded, signature, secret))) return null;

  try {
    const decoded = new TextDecoder().decode(fromBase64url(payloadEncoded));
    const parsed = JSON.parse(decoded) as SignedPayload;
    if (parsed.expires < Math.floor(Date.now() / 1000)) return null;
    return new Map(Object.entries(parsed.overrides));
  } catch {
    return null;
  }
}

export async function buildOverrideCookie(
  overrides: Record<string, boolean | string | number>,
  secret: string,
  ttlSeconds = 60 * 60 * 24 * 7 // a week, default
): Promise<string> {
  const payload: SignedPayload = {
    overrides,
    expires: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = toBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await sign(encoded, secret);
  return [
    `${COOKIE_NAME}=${encoded}.${sig}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    `Max-Age=${ttlSeconds}`,
  ].join('; ');
}

export function clearOverrideCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

// ─── Internal helpers ────────────────────────────────────────────────

async function sign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return toBase64url(new Uint8Array(signature));
}

async function verify(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expected = await sign(payload, secret);
  return safeEqual(expected, signature);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) {
    r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return r === 0;
}

function toBase64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(s: string): Uint8Array {
  const padding = (4 - (s.length % 4)) % 4;
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padding);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}
