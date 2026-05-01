// Wordmark variant resolution. Behind the `wordmark-variant` feature flag.
// Two variants ship in v1:
//   default — the heavy palindrome SVG produced by Claude Design (public/wordmark.svg)
//   thin    — a lightweight inline-SVG alternative for testing flag flips
//             without needing a second .svg in public/. Visually different
//             enough that toggling the flag is obvious.

import { escapeAttr } from './escape';

export type WordmarkVariant = 'default' | 'thin';

export function wordmarkUrl(variant: string): string {
  switch (variant) {
    case 'thin':
      // Inline-only — handled in wordmarkImg.
      return '/wordmark.svg';
    case 'default':
    default:
      return '/wordmark.svg';
  }
}

export function wordmarkImg(variant: string): string {
  if (variant === 'thin') {
    return inlineThinWordmark();
  }
  return `<img class="wordmark" src="${escapeAttr(wordmarkUrl(variant))}" alt="vwwwv">`;
}

function inlineThinWordmark(): string {
  // Light-weight letterform — same word, opposite mass, useful proof
  // that the flag is exercising real branching logic.
  return `<svg class="wordmark" viewBox="0 0 220 38" xmlns="http://www.w3.org/2000/svg" aria-label="vwwwv">
    <text x="0" y="30"
          font-family="ui-sans-serif, system-ui, -apple-system, sans-serif"
          font-size="36" font-weight="300" letter-spacing="-2"
          fill="currentColor">vwwwv</text>
  </svg>`;
}
