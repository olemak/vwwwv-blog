// Shared HTML fragments — masthead, footer, post card, tag pills, figures.
// All functions return string HTML. Caller is responsible for assembling.

import type { PostWithRelations } from '@vwwwv/db';
import { escapeAttr, escapeHtml as e } from './escape';
import { formatDateLong } from './date';
import { renderMarkdown } from './markdown';
import { wordmarkImg } from './wordmark';
import { formatReadingTime } from './reading-time';

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
      <label class="slop-toggle" title="Load full-resolution AI images. Off by default — bytes are opt-in.">
        <input type="checkbox" id="slop-toggle">
        <span class="slop-toggle__label">Show slop</span>
      </label>
    </header>
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
}

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

  const figureBlock = hasImage
    ? renderFeaturedFigure(post, { open: opts.open === true })
    : '';

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
        <dt>Filed</dt>
        <dd>${e(post.tags.join(', ') || '—')}</dd>
        <dt>Published</dt>
        <dd>${e(dateText)}</dd>
        ${readtime ? `<dt>Reading</dt><dd>${e(readtime)}</dd>` : ''}
        <dt>Permalink</dt>
        <dd><a href="/post/${encodeURIComponent(post.slug)}">/${e(post.slug)}</a></dd>
      </dl>
    </aside>`;

  const body = `
    <div class="post__body">
      <div class="post__prose">${renderMarkdown(post.body)}</div>
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

function renderFeaturedFigure(
  post: PostWithRelations,
  { open = false }: { open?: boolean } = {}
): string {
  const img = post.featured_image!;
  const dateText = formatDateLong(post.published_at ?? post.created_at);
  const primaryTag = post.tags[0] ?? '';
  const kicker = primaryTag || 'note';
  const sourceCls =
    img.source_type === 'screenshot' ? ' figure--screenshot' : '';
  const alt = img.alt ?? post.title;

  // Halftone proof — a tiny 80w version of the image is loaded by CSS
  // (background-image: var(--lqip)) and rendered with image-rendering:
  // pixelated + grayscale + boosted contrast. Reads as a wireservice
  // plate proof, on-brand for the brutalist propaganda aesthetic. The
  // real image is gated on user action (open the post, or toggle the
  // global "Drop the plate" control) — AI imagery is opt-in by design.
  const lqipUrl = imageUrl(img.r2_key, 80);

  // Inline both --natural-aspect (for the open-state aspect transition)
  // and --lqip (for the placeholder background) on the figure element.
  const styleAttr =
    img.width && img.height
      ? ` style="--natural-aspect: ${img.width} / ${img.height}; --lqip: url('${escapeAttr(lqipUrl)}')"`
      : ` style="--lqip: url('${escapeAttr(lqipUrl)}')"`;

  // Branch on whether the post is server-side open. On /post/<slug> the
  // post renders [open], so we emit the real src/srcset directly — no JS
  // dance needed for that case. In the feed (collapsed by default) we
  // emit data-src/data-srcset; the inline figure script swaps them in
  // when the user opens a post or trips the global toggle.
  const realSrc = imageUrl(img.r2_key, Math.min(1200, img.width ?? 1200));
  const realSrcset = imageSrcset(img.r2_key, img.width);
  const imgSourceAttrs = open
    ? `src="${escapeAttr(realSrc)}" srcset="${escapeAttr(realSrcset)}"`
    : `data-src="${escapeAttr(realSrc)}" data-srcset="${escapeAttr(realSrcset)}"`;

  return /* html */`
    <figure class="figure figure--crop${sourceCls}"${styleAttr} data-vt-media="m-${escapeAttr(post.id)}">
      <img class="figure__media"
           ${imgSourceAttrs}
           sizes="(max-width: 1140px) 100vw, 1140px"
           alt="${escapeAttr(alt)}"
           decoding="async"
           ${img.width ? `width="${img.width}"` : ''} ${img.height ? `height="${img.height}"` : ''}>
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
