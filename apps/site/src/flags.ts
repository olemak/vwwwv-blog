// Named flag accessors for the site. The single source of truth for which
// flags exist, what their defaults are, and what values they accept.

import { Flags, type FlagBindings } from '@vwwwv/flags';
import type { Env } from './env';

export interface SiteFlags {
  /** Show or hide the "N min read" estimate next to a post's date. */
  readingTime: boolean;
  /** Which wordmark SVG variant the masthead loads. */
  wordmarkVariant: string;
}

/** Fetch all flag values for a single request. */
export async function loadFlags(env: Env, request?: Request): Promise<SiteFlags> {
  const bindings: FlagBindings = {
    FLAGS: env.FLAGS,
    FLAG_COOKIE_SECRET: env.FLAG_COOKIE_SECRET,
  };
  const flags = new Flags(bindings, request);

  const [readingTime, wordmarkVariant] = await Promise.all([
    flags.get('reading-time', false),
    flags.get('wordmark-variant', 'default'),
  ]);

  return { readingTime, wordmarkVariant };
}

/** Returns a Flags instance for ad-hoc use (admin, etc.). */
export function flagsFor(env: Env, request?: Request): Flags {
  return new Flags(
    { FLAGS: env.FLAGS, FLAG_COOKIE_SECRET: env.FLAG_COOKIE_SECRET },
    request
  );
}
