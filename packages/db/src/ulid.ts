// Minimal ULID generator. 26 chars, time-sortable, URL-safe.
// Format: 10 chars timestamp (ms, base32) + 16 chars randomness.
// Crockford base32 alphabet (no I, L, O, U).

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Generate a ULID for use as a primary key.
 * Returns a 26-character string. Time-prefixed so IDs are sortable
 * by creation order without an explicit timestamp lookup.
 */
export function ulid(timestamp: number = Date.now()): string {
  let time = '';
  let t = timestamp;
  for (let i = 9; i >= 0; i--) {
    time = ALPHABET.charAt(t % 32) + time;
    t = Math.floor(t / 32);
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  let rand = '';
  for (let i = 0; i < 16; i++) {
    const b = bytes[i] ?? 0;
    rand += ALPHABET.charAt(b & 0x1f);
  }

  return time + rand;
}

/** Slug helper — lowercases, normalizes whitespace, strips accents and noise. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
