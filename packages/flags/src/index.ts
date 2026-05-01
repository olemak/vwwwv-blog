// @vwwwv/flags — homemade KV-backed feature flags.
//
// Server-side only for v1. Reads from Cloudflare KV, cached per Flags
// instance for the duration of a request. A signed preview cookie can
// override flag values for the operator without affecting other visitors.
//
// Usage in the Worker:
//   const flags = new Flags(env, request);
//   const showReadingTime = await flags.get('reading-time', false);
//   const variant = await flags.get('wordmark-variant', 'default');

import { parseOverrides, buildOverrideCookie, clearOverrideCookie } from './cookie';

export type FlagPrimitive = boolean | string | number;

export interface FlagValue<T extends FlagPrimitive = FlagPrimitive> {
  value: T;
  type: 'boolean' | 'string' | 'number';
  description?: string;
  updated_at: number;
}

export interface FlagBindings {
  FLAGS: KVNamespace;
  FLAG_COOKIE_SECRET: string;
}

export class Flags {
  private readonly cache = new Map<string, FlagPrimitive>();
  private overrides: Map<string, FlagPrimitive> | null | undefined = undefined;

  constructor(
    private readonly bindings: FlagBindings,
    private readonly request?: Request
  ) {}

  /**
   * Get a flag value, falling back to the default if unset.
   * Lookup order: cookie override → per-instance cache → KV.
   */
  async get<T extends FlagPrimitive>(name: string, defaultValue: T): Promise<T> {
    // Lazy-load overrides on first call.
    if (this.overrides === undefined) {
      this.overrides = this.request
        ? await parseOverrides(this.request, this.bindings.FLAG_COOKIE_SECRET)
        : null;
    }

    if (this.overrides?.has(name)) {
      const override = this.overrides.get(name)!;
      if (typeof override === typeof defaultValue) {
        return override as T;
      }
    }

    const cached = this.cache.get(name);
    if (cached !== undefined && typeof cached === typeof defaultValue) {
      return cached as T;
    }

    const raw = (await this.bindings.FLAGS.get(name, 'json')) as FlagValue<T> | null;
    if (raw && typeof raw.value === typeof defaultValue) {
      this.cache.set(name, raw.value);
      return raw.value as T;
    }

    return defaultValue;
  }

  /** Fetch a flag with metadata (no cookie/cache layer). For admin reads. */
  async getRaw(name: string): Promise<FlagValue | null> {
    return ((await this.bindings.FLAGS.get(name, 'json')) as FlagValue | null);
  }

  /** Set a flag's value. Invalidates the per-instance cache for this name. */
  async set(
    name: string,
    value: FlagPrimitive,
    options: { description?: string } = {}
  ): Promise<void> {
    const flag: FlagValue = {
      value,
      type: typeof value as FlagValue['type'],
      description: options.description,
      updated_at: Math.floor(Date.now() / 1000),
    };
    await this.bindings.FLAGS.put(name, JSON.stringify(flag));
    this.cache.delete(name);
  }

  async delete(name: string): Promise<void> {
    await this.bindings.FLAGS.delete(name);
    this.cache.delete(name);
  }

  /** Enumerate all flags (KV list + per-key get). */
  async list(): Promise<Record<string, FlagValue>> {
    const list = await this.bindings.FLAGS.list();
    const out: Record<string, FlagValue> = {};
    await Promise.all(
      list.keys.map(async (key) => {
        const raw = (await this.bindings.FLAGS.get(key.name, 'json')) as
          | FlagValue
          | null;
        if (raw) out[key.name] = raw;
      })
    );
    return out;
  }
}

/** Convenience factory for the common request-scoped pattern. */
export function flags(bindings: FlagBindings, request?: Request): Flags {
  return new Flags(bindings, request);
}

// Re-export cookie helpers for the admin endpoint.
export { parseOverrides, buildOverrideCookie, clearOverrideCookie };

// Re-export the admin HTTP handler.
export { handleAdminFlags } from './admin';
