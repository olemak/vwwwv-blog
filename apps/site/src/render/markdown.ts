// Markdown → HTML rendering for post bodies.
// Uses `marked` with default behavior, wrapped so that future tweaks
// (custom renderer for figure/caption blocks, code-block highlighting,
// etc.) live in one place.

import { marked } from 'marked';

// Configure once. GFM gives us tables, task lists, autolinks; breaks=false
// keeps us in standard markdown semantics where lone newlines are joined.
marked.setOptions({
  gfm: true,
  breaks: false,
});

export function renderMarkdown(body: string): string {
  return marked.parse(body, { async: false }) as string;
}
