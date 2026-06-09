// Tag cloud / index page. Lists tags with counts and recent posts under each.

import type { PostWithRelations } from '@vwwwv/db';
import { page } from './layout';
import { escapeHtml as e, escapeAttr } from './escape';
import { formatDateLong } from './date';
import { formatReadingTime } from './reading-time';

export interface TagCloudRenderOptions {
  tags: { name: string; count: number }[];
  postsByTag: Record<string, PostWithRelations[]>;
  showReadingTime: boolean;
  wordmarkVariant: string;
  totalPosts: number;
}

export function renderTagCloud(opts: TagCloudRenderOptions): string {
  const { tags, postsByTag, showReadingTime, wordmarkVariant, totalPosts } = opts;

  const editionLine = `The Index · ${totalPosts} post${totalPosts === 1 ? '' : 's'} · ${tags.length} tag${tags.length === 1 ? '' : 's'}`;

  const cloudCards = tags
    .map(
      (t) => `
        <a class="tag-card" href="#${encodeURIComponent(t.name)}">
          <span class="tag-card__count">${String(t.count).padStart(2, '0')}</span>
          <span class="tag-card__name">${e(t.name)}</span>
          <span class="tag-card__meta">${e(meta(t.name))}</span>
        </a>`
    )
    .join('');

  const sections = tags
    .map((t) => {
      const posts = postsByTag[t.name] ?? [];
      const rows = posts
        .map((p) => `
          <div class="tag-list">
            <span class="tag-list__date">${e(formatDateLong(p.published_at ?? p.created_at))}</span>
            <span class="tag-list__title"><a href="/post/${escapeAttr(p.slug)}">${e(p.title)}</a></span>
            <span class="tag-list__tags">${p.tags
              .map(
                (tn, i) =>
                  `<span class="tag tag--${i === 0 ? 'filled' : 'outline'}">${e(tn)}</span>`
              )
              .join(' ')}</span>
            <span class="tag-list__read">${e(showReadingTime ? formatReadingTime(p.body) : '')}</span>
          </div>`)
        .join('');
      return `
        <div class="section-head" id="${escapeAttr(t.name)}">
          <h2>${e(t.name)}</h2>
          <span class="meta">${t.count} entr${t.count === 1 ? 'y' : 'ies'}</span>
        </div>
        ${rows || `<p class="meta" style="padding: 12px 0">No posts yet.</p>`}
      `;
    })
    .join('');

  const body = `
    <section class="tag-hero">
      <div class="meta" style="color: var(--poster-red); margin-bottom: 14px;">${e(editionLine)}</div>
      <h1>Everything, filed.</h1>
      <p class="lead">An honest table of contents. The numbers are the entries. The tags are how I think about them; they are not promises about what they contain.</p>
    </section>

    <div class="tag-cloud">
      ${cloudCards || `<p class="meta" style="padding: 24px;">No tags yet.</p>`}
    </div>

    ${sections}
  `;

  return page({
    title: 'Tag — vwwwv',
    description: 'Browse vwwwv.org by tag.',
    activeNav: 'tag',
    wordmarkVariant,
    edition: editionLine,
    pageStyles: tagStyles,
    body,
  });
}

function meta(tagName: string): string {
  // A few hard-coded subtitles for the well-known tags; everything else
  // gets a generic line.
  const known: Record<string, string> = {
    trueborn: 'Novel · drafts & fragments',
    code: 'Field notes · post-mortems',
    work: 'Field notes · post-mortems',
    botany: 'Cushion plants · scree gardens',
    abandoned: 'Side projects · honest deaths',
    curiosities: 'Found things · no useful heading',
    writing: 'Essays & short pieces',
    opinion: 'Strong words · weak ties',
  };
  return known[tagName.toLowerCase()] ?? 'Filed';
}

const tagStyles = /* css */`
  .tag-hero { padding: 48px 0 24px; }
  .tag-hero h1 { font-size: clamp(48px, 7vw, 96px); }
  .tag-hero .lead { margin-top: 18px; max-width: 36em; color: var(--ink); }

  .tag-cloud {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0;
    border-top: 6px solid var(--ink);
    border-bottom: 2px solid var(--ink);
    position: relative;
    margin: 12px 0 32px;
  }
  .tag-cloud::after {
    content: "";
    position: absolute;
    left: 0; right: 0; bottom: -12px;
    border-top: 2px solid var(--ink);
  }
  .tag-card {
    padding: 22px 24px;
    border-right: 2px solid var(--ink);
    border-bottom: 2px solid var(--ink);
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 180px;
    cursor: pointer;
    text-decoration: none;
  }
  .tag-card:hover { background: var(--ink); color: var(--paper-cream); text-decoration: none; }
  .tag-card:hover .tag-card__name { color: var(--poster-red); }
  .tag-card:hover .tag-card__meta { color: var(--paper-cream); }
  .tag-card__count {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 56px;
    line-height: .9;
    color: var(--poster-red);
  }
  .tag-card__name {
    font-family: var(--font-display);
    font-weight: 700;
    text-transform: uppercase;
    font-size: 24px;
    letter-spacing: .01em;
    color: var(--ink);
  }
  .tag-card__meta {
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .1em;
    color: var(--ink-soft);
    margin-top: auto;
  }

  .tag-list {
    display: grid;
    grid-template-columns: 140px 1fr 200px 80px;
    gap: 16px;
    padding: 14px 0;
    border-bottom: 1px solid var(--ink);
    align-items: baseline;
  }
  .tag-list:hover { background: var(--paper-cream-deep); }
  .tag-list__date {
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .tag-list__title {
    font-family: var(--font-display);
    font-weight: 700;
    text-transform: uppercase;
    font-size: 18px;
    color: var(--ink);
  }
  .tag-list__title a { color: inherit; text-decoration: none; }
  .tag-list__title a:hover { color: var(--poster-red); text-decoration: none; }
  .tag-list__tags { display: flex; gap: 6px; flex-wrap: wrap; }
  .tag-list__read {
    text-align: right;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--ink-soft);
    text-transform: uppercase;
    letter-spacing: .08em;
  }
  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin: 36px 0 12px;
  }
  .section-head h2 { font-size: 28px; }
  .section-head .meta { color: var(--poster-red); }
  @media (width <= 720px) {
    .tag-list { grid-template-columns: 1fr; gap: 4px; }
    .tag-list__read { text-align: left; }
  }
`;
