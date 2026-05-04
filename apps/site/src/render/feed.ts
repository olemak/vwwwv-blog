// Feed page — the chronological home, and the per-tag filter view.
// Server-renders all posts as <details> elements; feed.js handles the
// View-Transitions choreography on the client.

import type { PostWithRelations } from '@vwwwv/db';
import { page } from './layout';
import { postCard } from './components';
import type { ActiveNav } from './components';
import { escapeHtml as e } from './escape';
import { formatEditionLine } from './date';
import { feedPageStyles } from './feed-styles';

export interface FeedRenderOptions {
  posts: PostWithRelations[];
  showReadingTime: boolean;
  wordmarkVariant: string;
  /** When set, this is a tag-filtered view; affects title and intro copy. */
  tagFilter?: string;
}

export function renderFeed(opts: FeedRenderOptions): string {
  const { posts, showReadingTime, wordmarkVariant, tagFilter } = opts;

  const title = tagFilter
    ? `${tagFilter} — vwwwv`
    : 'vwwwv — code, fiction, curiosities';

  const description = tagFilter
    ? `Posts tagged "${tagFilter}" on vwwwv.org.`
    : 'A personal feed of essays, creative writing fragments, side projects, rabbit hole spelunking journal entries.';

  const edition = tagFilter
    ? `Filed under ${tagFilter}`
    : formatEditionLine(Math.floor(Date.now() / 1000));

  const intro = tagFilter
    ? /* html */`
      <section style="padding: 24px var(--page-pad) 12px">
        <div class="meta" style="color: var(--poster-red); margin-bottom: 8px;">Filed under</div>
        <h1 style="font-size: clamp(40px, 6vw, 72px)">${e(tagFilter)}</h1>
        <p class="lead" style="margin-top: 14px;">${posts.length} entr${posts.length === 1 ? 'y' : 'ies'}.</p>
      </section>
      <hr class="rule-double" aria-hidden="true">
    `
    : '';

  const body = `
    ${intro}
    <main class="feed" id="feed">
      ${
        posts.length === 0
          ? `<p class="lead" style="padding: 32px 0;">Nothing here yet. ${tagFilter ? `Try another tag.` : `Drafts are state, not files — once one is published, it'll show up here.`}</p>`
          : posts
              .map((post, i) =>
                postCard(post, { index: i + 1, showReadingTime })
              )
              .join('\n')
      }
    </main>
  `;

  const activeNav: ActiveNav = tagFilter ? 'tag' : 'blog';

  return page({
    title,
    description,
    activeNav,
    wordmarkVariant,
    edition,
    pageStyles: feedPageStyles,
    body,
  });
}
