// HTTP handlers for /api/flags/*.
// The caller is responsible for authenticating the request before reaching
// these — typically by gating the entire /api/* prefix behind Cloudflare
// Access, then mounting these for the relevant subpaths.

import { Flags, type FlagPrimitive } from './index';
import { buildOverrideCookie, clearOverrideCookie } from './cookie';

export interface AdminContext {
  flags: Flags;
  request: Request;
  url: URL;
  cookieSecret: string;
}

/**
 * Routes:
 *   GET    /api/flags                      → list all flags + values
 *   GET    /api/flags/:name                → fetch one flag with metadata
 *   PUT    /api/flags/:name                → set value (JSON body { value, description? })
 *   DELETE /api/flags/:name                → remove flag
 *   POST   /api/flags/_preview             → set preview override cookie (JSON body: overrides map)
 *   DELETE /api/flags/_preview             → clear preview override cookie
 */
export async function handleAdminFlags(ctx: AdminContext): Promise<Response> {
  const { flags, request, url, cookieSecret } = ctx;

  // Preview override cookie endpoints — special-cased before the generic match.
  if (url.pathname === '/api/flags/_preview') {
    if (request.method === 'POST') {
      const body = (await request.json().catch(() => null)) as
        | Record<string, FlagPrimitive>
        | null;
      if (!body || typeof body !== 'object') {
        return jsonError(400, 'expected JSON object of {flag: value} overrides');
      }
      const cookie = await buildOverrideCookie(body, cookieSecret);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie },
      });
    }
    if (request.method === 'DELETE') {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': clearOverrideCookie(),
        },
      });
    }
    return methodNotAllowed();
  }

  const match = url.pathname.match(/^\/api\/flags(?:\/([^/]+))?$/);
  if (!match) return new Response('Not Found', { status: 404 });

  const name = match[1];

  // List
  if (request.method === 'GET' && !name) {
    const all = await flags.list();
    return Response.json(all);
  }

  // Get one
  if (request.method === 'GET' && name) {
    const raw = await flags.getRaw(name);
    return raw ? Response.json(raw) : new Response('Not Found', { status: 404 });
  }

  // Set
  if (request.method === 'PUT' && name) {
    const body = (await request.json().catch(() => null)) as
      | { value: unknown; description?: string }
      | null;
    if (!body || (typeof body.value !== 'boolean' && typeof body.value !== 'string' && typeof body.value !== 'number')) {
      return jsonError(400, 'value must be boolean, string, or number');
    }
    await flags.set(name, body.value, { description: body.description });
    return new Response(null, { status: 204 });
  }

  // Delete
  if (request.method === 'DELETE' && name) {
    await flags.delete(name);
    return new Response(null, { status: 204 });
  }

  return methodNotAllowed();
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
