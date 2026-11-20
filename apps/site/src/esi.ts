// Minimal ESI pass for eleg.io components.
//
// Post bodies can embed `:::component <org>:<id>`, which the markdown
// renderer turns into `<esi:include src="https://edge.eleg.io/c/<id>" />`.
// Cloudflare doesn't process ESI on its own, so the Worker resolves those
// tags here, on the finished HTML, before responding. Only includes from
// edge.eleg.io/c/ are fetched; anything else is dropped. A failed fetch
// leaves an HTML comment instead of breaking the page.

import { ELEG_COMPONENT_BASE } from './render/markdown';

const ESI_INCLUDE = /<esi:include\s+src="([^"]+)"\s*\/?>(?:\s*<\/esi:include>)?/g;
const EDGE_CACHE_TTL = 300;

export async function processEsi(html: string): Promise<string> {
  if (!html.includes('<esi:include')) return html;

  const srcs = new Set<string>();
  for (const m of html.matchAll(ESI_INCLUDE)) if (m[1]) srcs.add(m[1]);

  const fragments = new Map<string, string>();
  await Promise.all(
    [...srcs].map(async (src) => {
      if (!src.startsWith(ELEG_COMPONENT_BASE)) return;
      try {
        const res = await fetch(src, { cf: { cacheTtl: EDGE_CACHE_TTL, cacheEverything: true } });
        if (res.ok) fragments.set(src, await res.text());
        else console.warn(`[esi] ${src} → ${res.status}`);
      } catch (err) {
        console.warn(`[esi] ${src} failed:`, err);
      }
    })
  );

  return html.replace(ESI_INCLUDE, (_tag, src: string) =>
    fragments.get(src) ?? '<!-- component unavailable -->'
  );
}
