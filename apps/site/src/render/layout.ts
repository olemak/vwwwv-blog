// Full HTML document wrapper. Each page renderer composes its body and
// inline page-specific styles, then hands them to `page()` for the shell.

import { escapeHtml as e } from './escape';
import { masthead, footer, consentTab, consentPanel, type ActiveNav } from './components';
import { tokensCss } from './tokens';
import { wordmarkFaviconDataUri } from './wordmark';
import { figureScript } from './figure-script';

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
  /** Optional canonical URL override. */
  canonical?: string;
  /** Custom <head> additions (RSS link, og: tags, etc.). */
  extraHead?: string;
}

export function page(opts: PageOptions): string {
  const {
    title,
    description = 'vwwwv — a personal feed of essays, fragments, side projects, and rabbit hole exploration.',
    activeNav,
    wordmarkVariant,
    edition,
    pageStyles,
    body,
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
  <link rel="icon" href="${wordmarkFaviconDataUri()}" type="image/svg+xml">
  <style>${tokensCss}${pageStyles ?? ''}</style>
  ${extraHead ?? ''}
</head>
<body>
  <div class="page">
    ${masthead({ activeNav, wordmarkVariant, edition })}
    ${body}
    ${footer()}
  </div>
  ${consentTab()}
  ${consentPanel()}
  <script>${figureScript}</script>
</body>
</html>`;
}
