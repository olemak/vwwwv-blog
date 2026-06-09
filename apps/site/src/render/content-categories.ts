// Single source of truth for the content-category vocabulary the site
// understands. The DB schema is open-ended (any string in the comma-
// separated `images.triggers` column), but the render layer needs a
// fixed list to drive the per-image overlay label generator and the
// consent-panel checkboxes. New categories ship by adding entries here;
// no migration required.

export type ContentCategory = 'slop' | 'spider';

/** Display order in the consent panel. Slop first because it's the
 *  category the post argues for; spider second because it's the
 *  multi-trigger fixture. */
export const CATEGORIES: readonly ContentCategory[] = ['slop', 'spider'];

/** Plural forms for compound label generation. "Show slop and spiders":
 *  slop is a mass noun (no inflection), spider pluralises. Future
 *  categories add their own plural here. */
const PLURAL: Record<ContentCategory, string> = {
  slop: 'slop',
  spider: 'spiders',
};

/** Long-form labels for the consent panel. The per-image overlay uses
 *  bare category names ("Show slop"); the consent panel has more space
 *  and benefits from the descriptive parenthetical. */
const CONSENT_LABEL: Record<ContentCategory, string> = {
  slop: 'Always show slop (AI-generated imagery)',
  spider: 'Always show spiders (arachnid photographs)',
};

export function consentLabel(category: ContentCategory): string {
  return CONSENT_LABEL[category] ?? `Always show ${category}`;
}

/** localStorage key for persisted category preferences. The value is a
 *  JSON-encoded object of the shape `{ slop: true, spider: false }`.
 *  Read by figure-script.ts at page load to apply persisted opt-ins
 *  with AND-semantics across compound triggers. */
export const CONSENT_STORAGE_KEY = 'vwwwv:consent';

/** Generate the per-image toggle label from a list of triggers.
 *  - []                       → ''
 *  - ['slop']                 → 'Show slop'
 *  - ['spider']               → 'Show spiders'
 *  - ['slop', 'spider']       → 'Show slop and spiders'
 *  - ['slop', 'spider', 'x']  → 'Show slop, spiders, and x'  (Oxford comma)
 *
 *  Unknown categories pass through verbatim — the label still renders,
 *  it just doesn't get the right plural. That's a feature: lets us tag
 *  an image with a new category and ship the renderer change separately. */
export function triggerLabel(triggers: readonly string[]): string {
  if (triggers.length === 0) return '';
  const words = triggers.map((t) => PLURAL[t as ContentCategory] ?? t);
  if (words.length === 1) return `Show ${words[0]}`;
  if (words.length === 2) return `Show ${words[0]} and ${words[1]}`;
  const last = words[words.length - 1];
  const rest = words.slice(0, -1).join(', ');
  return `Show ${rest}, and ${last}`;
}
