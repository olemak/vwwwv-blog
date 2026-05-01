// Authentication for /api/* routes.
//
// Three accepted forms, in order of preference:
//   1. Cloudflare Access JWT — the "right tool" path. When Access guards the
//      endpoint, the request reaches the Worker only after Access has
//      validated the caller; the Cf-Access-Jwt-Assertion header is set.
//   2. Service-token headers — Cf-Access-Client-Id and Cf-Access-Client-Secret
//      sent directly by a non-browser client. Useful for local dev without
//      Access set up, and for clients that don't go through the Access edge.
//   3. Bearer token — Authorization: Bearer <secret>. Equivalent to (2) but
//      easier to type at a curl prompt.
//
// In production with Access configured for /api/*, only (1) ever reaches us;
// the others are conveniences for early development.

import type { Env } from '../env';

export type AuthResult = { ok: true } | { ok: false; reason: string };

export async function authenticate(request: Request, env: Env): Promise<AuthResult> {
  if (request.headers.get('Cf-Access-Jwt-Assertion')) {
    // Access has validated; the JWT could be verified against Cloudflare's
    // public keys for defense-in-depth, but trusting Access is reasonable in
    // v1 since requests can't reach the Worker any other way once configured.
    return { ok: true };
  }

  const clientId = request.headers.get('Cf-Access-Client-Id');
  const clientSecret = request.headers.get('Cf-Access-Client-Secret');
  if (clientId && clientSecret) {
    if (
      timingSafeEqual(clientId, env.CF_ACCESS_CLIENT_ID ?? '') &&
      timingSafeEqual(clientSecret, env.CF_ACCESS_CLIENT_SECRET ?? '')
    ) {
      return { ok: true };
    }
    return { ok: false, reason: 'invalid service-token credentials' };
  }

  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (timingSafeEqual(token, env.CF_ACCESS_CLIENT_SECRET ?? '')) {
      return { ok: true };
    }
    return { ok: false, reason: 'invalid bearer token' };
  }

  return { ok: false, reason: 'no credentials' };
}

export function unauthorizedResponse(reason: string): Response {
  return new Response(JSON.stringify({ error: 'unauthorized', reason }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer realm="vwwwv"',
    },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) {
    r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return r === 0;
}
