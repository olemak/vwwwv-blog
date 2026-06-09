// Markdown → HTML rendering for post bodies.
//
// Inline image references (`image:<id>` pseudo-protocol, or the legacy
// https://img.vwwwv.org/<r2_key> form) get routed through the figure
// component so they pick up the same halftone, srcset, consent gating,
// and dimension-reservation treatment as the featured image. Images
// the renderer can't resolve fall back to a plain <img> tag with a
// note in dev (so missing references are visible during draft work).
//
// The renderer is synchronous; the caller is responsible for resolving
// any `image:<id>` references to Image records in advance and passing
// the lookup map. See extractImageRefs() and the matching D1 batch
// fetch in @vwwwv/db queries.getImagesByIds.

import {
  Marked,
  type RendererThis,
  type Tokens,
  type Token,
  type TokenizerAndRendererExtension,
} from 'marked';
import type { Image } from '@vwwwv/db';
import { renderInlineFigure, type InlineFigureWidth } from './components';
import { escapeAttr } from './escape';

/** Pseudo-protocol prefix for image-by-id references in markdown. */
const IMAGE_REF_PREFIX = 'image:';
/** Legacy URL prefix for image-by-r2_key references. Still accepted by
 *  the renderer for backwards compatibility with older drafts. New
 *  content should use the `image:<id>` form. */
const IMAGE_HOST_PREFIX = 'https://img.vwwwv.org/';

export interface RenderMarkdownOptions {
  /** Pre-resolved image records, keyed by id. The renderer looks up
   *  `image:<id>` references here. Optional — without it, image refs
   *  fall back to plain <img> tags. */
  images?: Map<string, Image>;
}

/** Extract `image:<id>` references and `https://img.vwwwv.org/<r2_key>`
 *  references from a markdown body, returning the unique identifiers.
 *  The caller should batch-fetch these and pass them as the `images`
 *  map to renderMarkdown. The two id types (image-id vs r2-key) live
 *  in separate maps because the lookup queries differ.
 *
 *  Returns { ids, r2Keys } — both arrays of unique strings. */
export function extractImageRefs(body: string): {
  ids: string[];
  r2Keys: string[];
} {
  const ids = new Set<string>();
  const r2Keys = new Set<string>();

  // Match standard markdown image syntax: ![alt](url "title")
  // The url group captures everything between the parens up to a space
  // (which would be the optional title). Greedy-but-stops-at-space.
  const re = /!\[[^\]]*\]\(\s*([^\s)]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const url = m[1];
    if (url.startsWith(IMAGE_REF_PREFIX)) {
      ids.add(url.slice(IMAGE_REF_PREFIX.length));
    } else if (url.startsWith(IMAGE_HOST_PREFIX)) {
      r2Keys.add(url.slice(IMAGE_HOST_PREFIX.length));
    }
  }

  return { ids: [...ids], r2Keys: [...r2Keys] };
}

/** Width modifier from the markdown title attribute. Convention: any
 *  caption ending in `{prose}`, `{prose-wide}`, `{bleed}`, or `{small}`
 *  strips that marker and uses it as the placement width. Default is
 *  `bleed`. */
function parseWidth(title: string | null | undefined): {
  width: InlineFigureWidth;
  caption: string | null;
} {
  if (!title) return { width: 'bleed', caption: null };
  const widthMatch = title.match(/\s*\{(prose|prose-wide|bleed|small)\}\s*$/);
  if (widthMatch) {
    const stripped = title.slice(0, widthMatch.index).trim();
    return {
      width: widthMatch[1] as InlineFigureWidth,
      caption: stripped.length > 0 ? stripped : null,
    };
  }
  return { width: 'bleed', caption: title };
}

/** Block container directives for placement, mirroring the figure width
 *  classes. `:::aside … :::` routes its content into the narrow aside
 *  column; `:::wide … :::` into the prose-plus-aside region. The body
 *  between the fences is parsed as ordinary block markdown, so it can hold
 *  a quote, a note, a small list, a table — anything. Grid placement for
 *  the emitted `.block--aside` / `.block--wide` lives in feed-styles.ts. */
interface ContainerToken extends Tokens.Generic {
  type: 'container';
  variant: 'aside' | 'wide';
  tokens: Token[];
}

const containerExtension: TokenizerAndRendererExtension = {
  name: 'container',
  level: 'block',
  start(src: string) {
    return src.match(/^:::(?:aside|wide)\b/m)?.index;
  },
  tokenizer(this, src: string) {
    const m = /^:::(aside|wide)[ \t]*\r?\n([\s\S]*?)\r?\n:::[ \t]*(?:\r?\n|$)/.exec(src);
    if (!m) return undefined;
    const token: ContainerToken = {
      type: 'container',
      raw: m[0],
      variant: m[1] as 'aside' | 'wide',
      tokens: this.lexer.blockTokens(m[2] ?? ''),
    };
    return token;
  },
  renderer(this, token) {
    const t = token as ContainerToken;
    const inner = this.parser.parse(t.tokens);
    return t.variant === 'aside'
      ? `<aside class="block--aside">\n${inner}</aside>\n`
      : `<div class="block--wide">\n${inner}</div>\n`;
  },
};

/** Build a per-render Marked instance with the image and paragraph
 *  renderers overridden. The image renderer routes `image:<id>` refs
 *  through the figure component. The paragraph renderer skips the
 *  enclosing <p> when the paragraph's only content is a block-level
 *  figure — preventing the invalid <p><figure></p> structure that
 *  browsers auto-fix into orphan empty paragraphs. */
function makeRenderer(images: Map<string, Image> | undefined) {
  const marked = new Marked({ gfm: true, breaks: false });

  marked.use({
    extensions: [containerExtension],
    renderer: {
      image(this: RendererThis, token: Tokens.Image): string {
        const { href, title, text } = token;
        const lookup = resolveImageRef(href, images);
        if (lookup) {
          const { width, caption } = parseWidth(title);
          const finalCaption = caption ?? lookup.caption ?? null;
          return renderInlineFigure(lookup, {
            alt: text,
            caption: finalCaption,
            width,
          });
        }
        const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
        return `<img src="${escapeAttr(href)}" alt="${escapeAttr(text)}"${titleAttr}>`;
      },

      paragraph(this: RendererThis, token: Tokens.Paragraph): string {
        const inner = this.parser.parseInline(token.tokens);
        // If the paragraph's whole content is one block-level figure,
        // emit just the figure — wrapping it in <p> produces invalid
        // HTML the browser auto-fixes into empty <p>s flanking the
        // figure, and breaks .post__body > .figure--* selectors.
        const trimmed = inner.trim();
        if (trimmed.startsWith('<figure') && trimmed.endsWith('</figure>')) {
          return trimmed;
        }
        return `<p>${inner}</p>`;
      },
    },
  });

  return marked;
}

/** Resolve an image reference in markdown to an Image record. Tries the
 *  preferred `image:<id>` form first, then the legacy r2_key URL form.
 *  Returns null if the reference can't be resolved. */
function resolveImageRef(
  href: string,
  images: Map<string, Image> | undefined
): Image | null {
  if (!images || images.size === 0) return null;
  if (href.startsWith(IMAGE_REF_PREFIX)) {
    return images.get(href.slice(IMAGE_REF_PREFIX.length)) ?? null;
  }
  if (href.startsWith(IMAGE_HOST_PREFIX)) {
    const r2Key = href.slice(IMAGE_HOST_PREFIX.length);
    // Linear scan — the map is keyed by id, not r2_key. Acceptable
    // because the map is small (one batch per post body).
    for (const img of images.values()) {
      if (img.r2_key === r2Key) return img;
    }
  }
  return null;
}

/** Normalise body whitespace so the parser doesn't produce empty
 *  paragraphs from whitespace-only lines or runs of blank lines. */
function normaliseBody(body: string): string {
  return body
    .replace(/[ \t]+$/gm, '')      // strip trailing whitespace per line
    .replace(/\n{3,}/g, '\n\n');   // collapse runs of blank lines
}

/** Wrap every table in a horizontally-scrollable container. Markdown
 *  emits a bare <table>; on narrow viewports a multi-column table would
 *  otherwise overflow the page. The `.table-scroll` wrapper (styled in
 *  feed-styles.ts) keeps the overflow local to the table. Tables don't
 *  nest in markdown, so the non-greedy match is safe. */
function wrapTables(html: string): string {
  return html.replace(
    /<table>([\s\S]*?)<\/table>/g,
    '<div class="table-scroll"><table>$1</table></div>'
  );
}

export function renderMarkdown(
  body: string,
  options: RenderMarkdownOptions = {}
): string {
  const m = makeRenderer(options.images);
  const html = m.parse(normaliseBody(body), { async: false }) as string;
  return wrapTables(html);
}
