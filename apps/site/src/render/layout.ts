// Full HTML document wrapper. Each page renderer composes its body and
// inline page-specific styles, then hands them to `page()` for the shell.

import { escapeHtml as e } from './escape';
import { masthead, footer, type ActiveNav } from './components';

export interface PageOptions {
  title: string;
  description?: string;
  activeNav: ActiveNav;
  wordmarkVariant: string;
  edition?: string;
  /** Inline page-specific CSS, ships with the response. */
  pageStyles?: string;
  /** The <body> content, between masthead and footer. */
  body: string;
  /** Whether to load /feed.js for the same-document expand choreography. */
  includeFeedJs?: boolean;
  /** Optional canonical URL override. */
  canonical?: string;
  /** Custom <head> additions (RSS link, og: tags, etc.). */
  extraHead?: string;
}

export function page(opts: PageOptions): string {
  const {
    title,
    description = 'vwwwv — a personal feed of essays, fragments of Trueborn, abandoned side projects, and alpine-botany rabbit holes.',
    activeNav,
    wordmarkVariant,
    edition,
    pageStyles,
    body,
    includeFeedJs,
    canonical,
    extraHead,
  } = opts;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${e(title)}</title>
  <meta name="description" content="${e(description)}">
  ${canonical ? `<link rel="canonical" href="${e(canonical)}">` : ''}
  <link rel="stylesheet" href="/tokens.css">
  <link rel="icon" href="/wordmark.svg" type="image/svg+xml">
  ${pageStyles ? `<style>${pageStyles}</style>` : ''}
  ${extraHead ?? ''}
</head>
<body>
  <div class="page">
    ${masthead({ activeNav, wordmarkVariant, edition })}
    <hr class="rule-double" aria-hidden="true" style="margin-top: 28px;">
    ${body}
    ${footer()}
  </div>
  ${includeFeedJs ? `<script src="/feed.js" defer></script>` : ''}
</body>
</html>`;
}
