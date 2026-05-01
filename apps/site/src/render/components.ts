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
    </header>
  `;
}

export function footer(): string {
  return `
    <footer class="foot">
      <div class="foot__col">
        <strong>Elsewhere</strong>
        <a href="https://github.com/" rel="me">github</a>
      </div>
      <div class="foot__col">
        <strong>Sections</strong>
        <a href="/tag/trueborn">trueborn</a> ·
        <a href="/tag/code">code</a> ·
        <a href="/tag/curiosities">curiosities</a>
      </div>
      <div class="foot__col foot__colophon">
        Set with system-ui and a heavy hand. Served from Cloudflare. No
        analytics, no fonts from a CDN, no people on laptops. Built in
        14&nbsp;KB. © ${new Date().getFullYear()} — please reproduce with
        attribution and bad intent.
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
    ? renderFeaturedFigure(post)
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

function renderFeaturedFigure(post: PostWithRelations): string {
  const img = post.featured_image!;
  const dateText = formatDateLong(post.published_at ?? post.created_at);
  const primaryTag = post.tags[0] ?? '';
  const kicker = primaryTag || 'note';
  const sourceCls =
    img.source_type === 'screenshot' ? ' figure--screenshot' : '';
  const alt = img.alt ?? post.title;

  return `
    <figure class="figure figure--crop${sourceCls}" data-vt-media="m-${escapeAttr(post.id)}">
      <img class="figure__media"
           src="${escapeAttr(imageUrl(img.r2_key, 1024))}"
           srcset="${escapeAttr(imageSrcset(img.r2_key))}"
           sizes="(max-width: 760px) calc(100vw - 40px), min(1024px, 100vw - 112px)"
           alt="${escapeAttr(alt)}"
           loading="lazy"
           decoding="async"
           ${img.width ? `width="${img.width}"` : ''} ${img.height ? `height="${img.height}"` : ''}>
      <div class="figure__overlay">
        <div class="post__overlay-title">
          <div class="post__kicker" style="color:var(--paper-cream)">${e(kicker)}</div>
          <h1 class="post__title" data-vt-title="t-${escapeAttr(post.id)}">${e(post.title)}</h1>
        </div>
      </div>
    </figure>
    ${img.caption ? `
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

function imageSrcset(
  r2Key: string,
  widths: readonly number[] = [400, 600, 800, 1200, 1600]
): string {
  return widths.map((w) => `${imageUrl(r2Key, w)} ${w}w`).join(', ');
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
