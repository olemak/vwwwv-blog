// Shared HTML fragments — masthead, footer, post card, tag pills, figures.
// All functions return string HTML. Caller is responsible for assembling.

import type { Image, PostWithRelations } from '@vwwwv/db';
import { escapeAttr, escapeHtml as e } from './escape';
import { formatDateLong } from './date';
import { wordmarkImg } from './wordmark';
import { formatReadingTime } from './reading-time';
import { CATEGORIES, consentLabel, triggerLabel } from './content-categories';

export type ActiveNav = 'blog' | 'tag' | 'about' | 'system' | null;

export interface MastheadOptions {
  activeNav: ActiveNav;
  wordmarkVariant: string;
  edition?: string;
}

export function masthead({
  activeNav,
  wordmarkVariant,
  edition,
}: MastheadOptions): string {
  const cls = (k: ActiveNav) =>
    activeNav === k ? ' class="is-active"' : '';
  return `
    <header class="masthead">
      ${edition ? `<div class="masthead__edition">${e(edition)}</div>` : ''}
      <a class="masthead__brand" href="/" aria-label="vwwwv home">
        ${wordmarkImg(wordmarkVariant)}
      </a>
      <nav class="masthead__nav" aria-label="Primary">
        <a href="/"${cls('blog')}>Blog</a>
        <a href="/tag"${cls('tag')}>Tag</a>
        <a href="/about"${cls('about')}>About</a>
      </nav>
    </header>
  `;
}

/** Consent panel — the persistent surface where category-level "always
 *  show X" preferences live. Built around the native HTML popover API:
 *  the tab declaratively triggers the panel via popovertarget, the
 *  browser handles open/close, ESC dismissal, focus management, and
 *  click-outside-to-close. Both elements are always present in the DOM;
 *  CSS keeps the panel hidden until popover-open. The panel reads its
 *  category list from the shared CATEGORIES constant so it stays in
 *  sync with the per-image overlay's vocabulary. */
export function consentTab(): string {
  return `<button class="consent-tab" type="button" popovertarget="consent-panel" aria-label="Open consent panel">Consent</button>`;
}

export function consentPanel(): string {
  const items = CATEGORIES.map(
    (category) => `
      <li class="consent-panel__item">
        <label>
          <input type="checkbox" class="consent-panel__input" data-consent-category="${escapeAttr(category)}">
          <span>${e(consentLabel(category))}</span>
        </label>
      </li>`
  ).join('');

  return `
    <aside id="consent-panel" popover="auto" class="consent-panel" aria-label="Consent preferences">
      <h2 class="consent-panel__title">Consent</h2>
      <p class="consent-panel__intro">
        Choose which categories of imagery to load by default. Per-image opt-ins on individual figures stay session-scoped and override these defaults.
      </p>
      <ul class="consent-panel__list">${items}
      </ul>
    </aside>
  `;
}

export function footer(): string {
  return `
    <footer class="foot">
      <div class="foot__col">
        <strong>Elsewhere</strong>
        <a href="https://github.com/olemak" rel="me">github</a>
        <a href="https://github.com/olemak/vwwwv-blog" title="View source code on github">repo</a>
        <a href="https://www.linkedin.com/in/olemak/">linkedin</a>
      </div>
      <div class="foot__col foot__colophon">
        Set with system fonts and a Lighthouse 100 personality disorder. Served from Cloudflare. No
        analytics, no external fonts, no cookies, no GDPR. Built on a weird stack and a budget of 
        14&nbsp;KB. © ${new Date().getFullYear()} — please reproduce with attribution and whatever 
        intent you happen to be in possession of.
      </div>
    </footer>
  `;
}

// ─── Tags ────────────────────────────────────────────────────────────

export interface TagPillOptions {
  variant?: 'filled' | 'outline' | 'ochre';
  href?: string;
}

export function tagPill(
  name: string,
  { variant = 'outline', href }: TagPillOptions = {}
): string {
  const cls = `tag tag--${variant}`;
  const inner = e(name);
  return href
    ? `<a class="${cls}" href="${escapeAttr(href)}">${inner}</a>`
    : `<span class="${cls}">${inner}</span>`;
}

export function tagsRow(tags: string[]): string {
  if (!tags.length) return '';
  return tags
    .map((t, i) =>
      tagPill(t, {
        variant: i === 0 ? 'filled' : 'outline',
        href: `/tag/${encodeURIComponent(t)}`,
      })
    )
    .join(' ');
}

// ─── Post card (feed item) ───────────────────────────────────────────

export interface PostCardOptions {
  index: number;             // display number (1-based)
  showReadingTime: boolean;  // reading-time flag
  open?: boolean;            // start expanded?
  /** Pre-rendered HTML for the post body. The caller is responsible for
   *  running the markdown renderer (with any image-resolution map it
   *  needs); postCard just splices the resulting HTML in. Decouples the
   *  card-assembly concern from the markdown-rendering concern, and
   *  avoids a render-layer import cycle (markdown.ts → components.ts →
   *  markdown.ts). */
  proseHtml: string;
}

/** Single-author blog: the byline links here. Lift into the authors
 *  table (a `bluesky` / `links` column) if the site ever goes
 *  multi-author, and thread it through getPostBySlug. */
const AUTHOR_BLUESKY = 'https://bsky.app/profile/olemak.bsky.social';

export function postCard(
  post: PostWithRelations,
  opts: PostCardOptions
): string {
  const idxNum = String(opts.index).padStart(2, '0');
  const hasImage = post.featured_image !== null;
  const cls = 'post' + (hasImage ? ' post--with-image' : ' post--no-image');
  const dateText = formatDateLong(post.published_at ?? post.created_at);
  const primaryTag = post.tags[0] ?? '';
  const kicker = primaryTag ? primaryTag : 'note';
  const excerpt = post.excerpt ?? extractFirstParagraph(post.body);
  const readtime = opts.showReadingTime ? formatReadingTime(post.body) : null;

  const figureBlock = hasImage ? renderFeaturedFigure(post) : '';

  const expandedTitleBlock = `
    <div class="post__title-expanded">
      <div class="post__kicker">${e(kicker)}</div>
      <h1 class="post__title-clone">${e(post.title)}</h1>
    </div>`;

  const collapsedTitleBlock = `
    <div class="post__title-wrap">
      <div class="post__kicker">${e(kicker)}</div>
      <h1 class="post__title" data-vt-title="t-${escapeAttr(post.id)}">${e(post.title)}</h1>
    </div>`;

  const metaRow = `
    <div class="post__meta-row">
      <span class="meta">${e(dateText)}</span>
      ${readtime ? `<span class="meta">·</span><span class="meta">${e(readtime)}</span>` : ''}
      ${tagsRow(post.tags)}
      <span style="flex:1"></span>
      <span class="post__expand-cue" aria-hidden="true">
        <span class="label-closed">Read in place</span>
        <span class="label-open">Collapse</span>
      </span>
    </div>`;

  // For posts WITH image: title is overlaid on the figure when collapsed,
  // moves into the expanded block when [open]. For posts WITHOUT image:
  // title is in title-wrap, always visible.
  const summary = hasImage
    ? `
      <summary class="post__summary">
        ${figureBlock}
        ${expandedTitleBlock}
        ${metaRow}
      </summary>`
    : `
      <summary class="post__summary">
        ${collapsedTitleBlock}
        <p class="post__excerpt">${e(excerpt)}</p>
        ${metaRow}
      </summary>`;

  const sidebar = `
    <aside class="post__sidebar">
      <dl>
        <dt>Words</dt>
        <dd><a href="${AUTHOR_BLUESKY}" rel="me">${e(post.author.name)}</a></dd>
        <dt>Filed</dt>
        <dd>${e(post.tags.join(', ') || '—')}</dd>
        <dt>Published</dt>
        <dd>${e(dateText)}</dd>
        ${readtime ? `<dt>Reading</dt><dd>${e(readtime)}</dd>` : ''}
        <dt>Permalink</dt>
        <dd><a href="/post/${encodeURIComponent(post.slug)}">/${e(post.slug)}</a></dd>
      </dl>
    </aside>`;

  // Prose blocks (paragraphs, headings, figures rendered from markdown)
  // become direct children of .post__body, alongside the metadata sidebar.
  // No wrapper around the prose — every block participates in the body
  // grid directly, gets placed by class (default→prose, figure→bleed,
  // figure--prose / --prose-wide / --small as opt-in width modifiers).
  const body = `
    <div class="post__body">
      ${opts.proseHtml}
      ${sidebar}
    </div>`;

  return `
    <details class="${cls}" id="${escapeAttr(post.slug)}" data-tags="${escapeAttr(post.tags.join(' '))}"${opts.open ? ' open' : ''}>
      <span class="post__index" aria-hidden="true">${idxNum}</span>
      ${summary}
      ${body}
    </details>
  `;
}

// ─── Figure helpers ──────────────────────────────────────────────────
// Shared between the featured (hero) figure and inline body figures so
// the halftone, srcset, gating, and per-image consent overlay behave
// identically regardless of which surface the figure appears on.

/** CSS custom properties for the figure: --natural-aspect (drives the
 *  [open] aspect-ratio transition for the hero; harmless on inline
 *  figures) and --lqip (the 80w halftone source). */
function figureCssVars(img: Image): string {
  const lqipUrl = imageLqipUrl(img.r2_key);
  const parts = [
    img.width && img.height ? `--natural-aspect: ${img.width} / ${img.height}` : '',
    `--lqip: url('${escapeAttr(lqipUrl)}')`,
  ];
  return parts.filter(Boolean).join('; ');
}

/** data-triggers attribute string ("" if no triggers). */
function figureTriggersAttr(img: Image): string {
  return img.triggers.length > 0
    ? ` data-triggers="${escapeAttr(img.triggers.join(','))}"`
    : '';
}

/** src/srcset attribute string. Gated images emit data-src/data-srcset
 *  so the figure script can swap them in on consent; ungated images get
 *  the real attributes immediately. */
function figureSourceAttrs(img: Image): string {
  const isGated = img.triggers.length > 0;
  const realSrc = imageUrl(img.r2_key, Math.min(1200, img.width ?? 1200));
  const realSrcset = imageSrcset(img.r2_key, img.width);
  return isGated
    ? `data-src="${escapeAttr(realSrc)}" data-srcset="${escapeAttr(realSrcset)}"`
    : `src="${escapeAttr(realSrc)}" srcset="${escapeAttr(realSrcset)}"`;
}

/** Per-image consent overlay HTML. Empty string for ungated images. */
function triggerOverlayHtml(img: Image): string {
  if (img.triggers.length === 0) return '';
  return /* html */`
    <label class="figure-trigger-toggle" title="Load this image at full resolution. Off by default.">
      <input type="checkbox" class="figure-trigger-toggle__input">
      <span class="figure-trigger-toggle__label">${e(triggerLabel(img.triggers))}</span>
    </label>`;
}

/** Width/height attributes for layout reservation, empty when missing. */
function figureDimensionAttrs(img: Image): string {
  const w = img.width ? `width="${img.width}"` : '';
  const h = img.height ? `height="${img.height}"` : '';
  return [w, h].filter(Boolean).join(' ');
}

// ─── Featured (hero) figure ──────────────────────────────────────────
function renderFeaturedFigure(post: PostWithRelations): string {
  const img = post.featured_image!;
  const dateText = formatDateLong(post.published_at ?? post.created_at);
  const primaryTag = post.tags[0] ?? '';
  const kicker = primaryTag || 'note';
  const sourceCls =
    img.source_type === 'screenshot' ? ' figure--screenshot' : '';
  const alt = img.alt ?? post.title;

  return /* html */`
    <figure class="figure figure--crop${sourceCls}" style="${figureCssVars(img)}"${figureTriggersAttr(img)} data-vt-media="m-${escapeAttr(post.id)}">
      <img class="figure__media"
           ${figureSourceAttrs(img)}
           sizes="(max-width: 1140px) 100vw, 1140px"
           alt="${escapeAttr(alt)}"
           decoding="async"
           ${figureDimensionAttrs(img)}>
      ${triggerOverlayHtml(img)}
      <div class="figure__overlay">
        <div class="post__overlay-title">
          <div class="post__kicker" style="color:var(--paper-cream)">${e(kicker)}</div>
          <h1 class="post__title" data-vt-title="t-${escapeAttr(post.id)}">${e(post.title)}</h1>
        </div>
      </div>
    </figure>
    ${img.caption ? /* html */`
    <figcaption class="figure-caption" aria-hidden="true">
      <span class="caption">${e(dateText)}</span>
      <span class="caption-text">${e(img.caption)}</span>
    </figcaption>` : ''}
  `;
}

// ─── Inline body figure ──────────────────────────────────────────────
// Used by the markdown renderer for `image:<id>` references. Same
// halftone/srcset/gating treatment as the hero, but no overlay title,
// no view-transition attribute, and no aspect-ratio crop (always
// natural). Width is controlled by an opt-in class on the figure:
//   default       → bleed (full body width up to .page max)
//   .figure--prose-wide → text column + aside region
//   .figure--prose      → text column only
//   .figure--small      → aside column only (~220px, marginalia / portrait)
export type InlineFigureWidth = 'bleed' | 'prose-wide' | 'prose' | 'small';

/** sizes attribute value per width modifier. The browser uses this with
 *  srcset to pick which source to fetch. Wrong sizes → over-fetch (the
 *  browser assumes the image needs more pixels than it actually displays
 *  at). The grid threshold is 1000px — below that all figures bleed to
 *  the body width, above that they take their declared column width. */
function sizesForWidth(width: InlineFigureWidth): string {
  switch (width) {
    case 'small':      return '(min-width: 1000px) 220px, 100vw';
    case 'prose':      return '(min-width: 1000px) 620px, 100vw';
    case 'prose-wide': return '(min-width: 1000px) 880px, 100vw';
    case 'bleed':
    default:           return '(max-width: 1140px) 100vw, 1140px';
  }
}

export function renderInlineFigure(
  img: Image,
  opts: {
    /** Override the image's stored alt for this specific embed. */
    alt?: string;
    /** Override the image's stored caption for this specific embed.
     *  Markdown `![alt](image:id "caption")` → caption. */
    caption?: string | null;
    /** Width placement. Default 'bleed'. */
    width?: InlineFigureWidth;
  } = {}
): string {
  const alt = opts.alt ?? img.alt ?? '';
  const caption = opts.caption ?? img.caption ?? null;
  const width = opts.width ?? 'bleed';
  const widthCls =
    width === 'prose'      ? ' figure--prose' :
    width === 'prose-wide' ? ' figure--prose-wide' :
    width === 'small'      ? ' figure--small' :
    '';
  const sourceCls =
    img.source_type === 'screenshot' ? ' figure--screenshot' : '';

  return /* html */`
    <figure class="figure figure--inline${widthCls}${sourceCls}"${figureTriggersAttr(img)}>
      <div class="figure__plate" style="${figureCssVars(img)}">
        <img class="figure__media"
             ${figureSourceAttrs(img)}
             sizes="${sizesForWidth(width)}"
             alt="${escapeAttr(alt)}"
             decoding="async"
             ${figureDimensionAttrs(img)}>
        ${triggerOverlayHtml(img)}
      </div>
      ${caption ? /* html */`
      <figcaption class="figure-caption">
        <span class="caption-text">${e(caption)}</span>
      </figcaption>` : ''}
    </figure>
  `;
}

// Image base URL. `img.vwwwv.org` is set up as an R2 custom domain pointing
// at the vwwwv-blog-img bucket (dash → R2 → bucket → Settings → Custom
// Domains), with Image Transformations enabled at the vwwwv.org zone level
// (dash → Speed → Optimization → Image Transformations). The /cdn-cgi/image/
// URL pattern then works on the same zone, fetching the source directly
// from R2 without going through the Worker.
//
// Until that's wired up, images will 404 — there's no Worker fallback by
// design (the Worker should not be in the image-serving path in production;
// see docs/architecture.md).
const IMAGE_BASE = 'https://img.vwwwv.org';

function imageUrl(r2Key: string, width?: number): string {
  if (!width) return `${IMAGE_BASE}/${r2Key}`;
  return `${IMAGE_BASE}/cdn-cgi/image/width=${width},format=auto,fit=scale-down,quality=85/${r2Key}`;
}

// LQIP — the halftone plate proof that sits behind every figure as a
// CSS background-image. 80px wide and quality=20: at 80px the source is
// already too small to show subtle detail, and image-rendering: pixelated
// + grayscale + contrast filter masks compression artifacts entirely, so
// dropping quality from 85 to 20 doesn't visibly change anything but
// shaves the file from ~4 KB down to roughly 600–1,000 bytes per image.
// Cloudflare emits a "low quality is not recommended" warning at this
// level; the warning is informational and we are deliberately ignoring it.
function imageLqipUrl(r2Key: string): string {
  return `${IMAGE_BASE}/cdn-cgi/image/width=80,format=auto,fit=scale-down,quality=20/${r2Key}`;
}

// Open Graph / Twitter card crop. Reddit, X, Bluesky, Mastodon, LinkedIn,
// iMessage, and Slack all expect ~1.91:1 (1200×630) for the "large image"
// preview style. fit=cover crops to fill — letterboxing inside the
// preview frame looks cheap, and the hero photos are usually wide enough
// that a centered cover-crop reads well. format=auto serves WebP/AVIF
// where the consumer supports it.
export function imageOgUrl(r2Key: string): string {
  return `${IMAGE_BASE}/cdn-cgi/image/width=1200,height=630,fit=cover,format=auto,quality=85/${r2Key}`;
}

// Srcset rungs walk an arithmetic progression at multiples of 320 CSS px:
// 320, 640, 960, 1280, 1600, 1920, 2240, … The base unit honours the
// smallest viewport widths still in real use (boring-phone / Light Phone
// class at 280–320 CSS px, 1× DPR), and each subsequent step lines up
// neatly with common device-pixel demands:
//
//   320  → 280 × 1 (boring phone) and 320 × 1 (1× small windows)
//   640  → 320 × 2 (iPhone 5 / SE 1st gen)
//   960  → 360–428 × 2 (every 2× phone in the modern wild) AND
//          360 × 2.625 (Lighthouse mobile emulation)
//   1280 → 414 × 3 (iPhone Pro Max class)
//   1600 → 768 × 2 (iPad portrait)
//   1920 → 960 × 2 (FHD-ish 2× laptops)
//   2240 → 1140 × ≈2 (desktop retina at the .page max-width cap)
//
// The ladder grows by +320 per step and stops the first time it would
// match-or-exceed the source width — anything bigger is wasted bytes
// since Cloudflare's scale-down won't upscale, and labelling a delivered
// 1584w as "2400w" would just lie to the browser's resolution picker.
// The exact source width is then appended as the final entry so the
// largest available rung honestly matches the largest deliverable image.

const STEP = 320;

/** Safety-pin set used when an image's width is missing from the DB. We
 *  can't compute the cap, so emit a fixed five-rung ladder that covers
 *  the AI-image-class sources we know we have. If the actual source is
 *  smaller, requests beyond it get the source-untouched-with-wrong-label
 *  treatment — wasteful but not broken. Better than emitting nothing. */
const FALLBACK_WIDTHS = [320, 640, 960, 1280, 1600] as const;

function imageSrcset(r2Key: string, sourceWidth?: number | null): string {
  if (!sourceWidth) {
    return FALLBACK_WIDTHS.map((w) => `${imageUrl(r2Key, w)} ${w}w`).join(', ');
  }
  const rungs: number[] = [];
  for (let w = STEP; w < sourceWidth; w += STEP) {
    rungs.push(w);
  }
  // Append the exact source width so the topmost descriptor is honest
  // and desktop-retina viewers get the maximum native quality available.
  rungs.push(sourceWidth);
  return rungs.map((w) => `${imageUrl(r2Key, w)} ${w}w`).join(', ');
}

function extractFirstParagraph(body: string): string {
  // Strip leading whitespace then take everything up to the first blank line.
  const trimmed = body.trimStart();
  const blank = trimmed.indexOf('\n\n');
  const para = (blank === -1 ? trimmed : trimmed.slice(0, blank)).trim();
  // Remove any markdown emphasis/links syntax from the snippet.
  return para
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .slice(0, 280);
}
