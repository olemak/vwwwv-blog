// Wordmark variant resolution. Behind the `wordmark-variant` feature flag.
// Two variants ship in v1:
//   default — the heavy palindrome SVG produced by Claude Design
//             (originally public/wordmark.svg, now inlined here)
//   thin    — a lightweight inline-SVG alternative for testing flag flips.
//             Visually different enough that toggling the flag is obvious.
//
// Both variants are inline SVGs. The default used to ship as a static
// /wordmark.svg fetched with a `<link>` and `<img>`, but that meant an
// extra round trip on cold load *and* an unhashed-asset cache-lifetime
// warning from Lighthouse. ~700 bytes inlined into every page is cheaper
// than a separate request, especially given how brotli compresses the
// repetitive polyline markup against the rest of the document.

/** SVG markup for the default wordmark. Five overlapping polylines forming
 *  the v-w-w-w-v palindrome, plus the double underline. The class attribute
 *  is added by `wordmarkImg`, not baked in here, so the same string can
 *  feed both the masthead and the favicon data URI. */
const DEFAULT_WORDMARK = /* svg */`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="320" height="120" role="img" aria-label="vwwwv">
  <g fill="none" stroke="#141210" stroke-width="14" stroke-linecap="square" stroke-linejoin="miter">
    <polyline points="14,18 44,98 74,18"/>
    <polyline points="60,18 80,98 100,18 120,98 140,18"/>
    <polyline points="126,18 146,98 166,18 186,98 206,18"/>
    <polyline points="192,18 212,98 232,18 252,98 272,18"/>
    <polyline points="246,18 276,98 306,18"/>
  </g>
  <line x1="0" y1="110" x2="320" y2="110" stroke="#141210" stroke-width="5"/>
  <line x1="0" y1="118" x2="320" y2="118" stroke="#141210" stroke-width="1.5"/>
</svg>`;

export type WordmarkVariant = 'default' | 'thin';

export function wordmarkImg(variant: string): string {
  if (variant === 'thin') {
    return inlineThinWordmark();
  }
  // Inject class="wordmark" into the opening <svg> tag. The CSS in tokens.ts
  // sizes it to 38px tall with width:auto and binds the view-transition-name.
  return DEFAULT_WORDMARK.replace('<svg ', '<svg class="wordmark" ');
}

/** Favicon as a data URI — same SVG, no extra request, no cache-lifetime
 *  warning. Used in layout.ts in place of `<link rel="icon" href="/wordmark.svg">`. */
export function wordmarkFaviconDataUri(): string {
  // Percent-encode the SVG so it's safe in an href attribute. We only
  // need to escape characters that have meaning in URIs; spaces and < > #
  // are the practical minimum.
  const encoded = DEFAULT_WORDMARK
    .replace(/\n\s*/g, '')   // strip newlines + indentation
    .replace(/#/g, '%23')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/"/g, "'");     // single-quote attrs so the data: URI itself can use double quotes

  return `data:image/svg+xml;utf8,${encoded}`;
}

function inlineThinWordmark(): string {
  // Light-weight letterform — same word, opposite mass, useful proof
  // that the flag is exercising real branching logic.
  return `<svg class="wordmark" viewBox="0 0 220 38" width="220" height="38" xmlns="http://www.w3.org/2000/svg" aria-label="vwwwv">
    <text x="0" y="30"
          font-family="ui-sans-serif, system-ui, -apple-system, sans-serif"
          font-size="36" font-weight="300" letter-spacing="-2"
          fill="currentColor">vwwwv</text>
  </svg>`;
}
