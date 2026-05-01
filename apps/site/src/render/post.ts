// Single-post page (navigate mode). Renders one post as its own page.
// Reachable at /post/<slug> from sidebar permalinks and tag-cloud entries.

import type { PostWithRelations } from '@vwwwv/db';
import { page } from './layout';
import { postCard } from './components';
import { formatEditionLine } from './date';
import { feedPageStyles } from './feed-styles';

export interface PostRenderOptions {
  post: PostWithRelations;
  showReadingTime: boolean;
  wordmarkVariant: string;
  siteUrl: string;
}

export function renderPost(opts: PostRenderOptions): string {
  const { post, showReadingTime, wordmarkVariant, siteUrl } = opts;

  // Reuse the post-card component, force it open. Wrap in the same
  // .feed scaffolding so styles match the home page exactly.
  const body = `
    <main class="feed" id="feed">
      ${postCard(post, { index: 1, showReadingTime, open: true })}
    </main>
  `;

  return page({
    title: `${post.title} — vwwwv`,
    description: post.excerpt ?? `${post.title}.`,
    activeNav: 'blog',
    wordmarkVariant,
    edition: formatEditionLine(post.published_at ?? post.created_at),
    pageStyles: feedPageStyles,
    body,
    canonical: `${siteUrl}/post/${encodeURIComponent(post.slug)}`,
    includeFeedJs: true,
  });
}
