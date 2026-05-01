// Worker entry. Catches all requests, hands off to the router.

import { route } from './router';
import type { Env } from './env';

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      return await route(request, env, ctx);
    } catch (err) {
      // Log via Workers Observability; user gets a clean message.
      console.error('worker error', err);
      const isDev = env.SITE_URL.includes('workers.dev') || env.SITE_URL.includes('localhost');
      return new Response(
        isDev ? `${(err as Error).message}\n\n${(err as Error).stack ?? ''}` : 'Internal Server Error',
        { status: 500, headers: { 'Content-Type': 'text/plain' } }
      );
    }
  },
} satisfies ExportedHandler<Env>;
