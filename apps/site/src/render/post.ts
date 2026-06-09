// Single-post page (navigate mode). Renders one post as its own page.
// Reachable at /post/<slug> from sidebar permalinks and tag-cloud entries.

import type { Image, PostWithRelations } from '@vwwwv/db';
import { page } from './layout';
import { postCard, imageOgUrl } from './components';
import { formatEditionLine } from './date';
import { escapeAttr } from './escape';
import { feedPageStyles } from './feed-styles';
import { renderMarkdown } from './markdown';

export interface PostRenderOptions {
  post: PostWithRelations;
  showReadingTime: boolean;
  wordmarkVariant: string;
  siteUrl: string;
  /** Pre-resolved Image records referenced from this post's body. */
  bodyImages?: Map<string, Image>;
}

export function renderPost(opts: PostRenderOptions): string {
  const { post, showReadingTime, wordmarkVariant, siteUrl, bodyImages } = opts;

  // Reuse the post-card component, force it open. Wrap in the same
  // .feed scaffolding so styles match the home page exactly.
  const body = `
    <main class="feed" id="feed">
      ${postCard(post, {
        index: 1,
        showReadingTime,
        open: true,
        proseHtml: renderMarkdown(post.body, { images: bodyImages }),
      })}
    </main>
  `;

  const canonical = `${siteUrl}/post/${encodeURIComponent(post.slug)}`;
  const description = post.excerpt ?? `${post.title}.`;

  return page({
    title: `${post.title} — vwwwv`,
    description,
    activeNav: 'blog',
    wordmarkVariant,
    edition: formatEditionLine(post.published_at ?? post.created_at),
    pageStyles: feedPageStyles,
    body,
    canonical,
    extraHead: socialMetaTags({ post, canonical, description }),
  });
}

// Open Graph + Twitter Card meta block for a single post page. Drives the
// link preview shown on Reddit, X, Bluesky, Mastodon, LinkedIn, iMessage,
// Slack, and any other consumer that reads OG. Keep og:* properties for
// the OG-spec consumers and twitter:* names for X (which still ignores
// some og: variants in favour of the twitter: prefix).
//
// twitter:card is set to "summary_large_image" when the post has a
// featured image (gives the wide preview), otherwise plain "summary"
// (title + description, no image). Reddit ignores the twitter:card type
// and always renders a thumbnail when og:image is present.
function socialMetaTags(opts: {
  post: PostWithRelations;
  canonical: string;
  description: string;
}): string {
  const { post, canonical, description } = opts;
  const featured = post.featured_image;
  const ogImage = featured ? imageOgUrl(featured.r2_key) : null;
  const imageAlt = featured ? (featured.alt ?? featured.caption ?? post.title) : null;
  const publishedAt = post.published_at ?? post.created_at;
  const isoTime = new Date(publishedAt * 1000).toISOString();

  const lines: string[] = [
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="vwwwv">`,
    `<meta property="og:title" content="${escapeAttr(post.title)}">`,
    `<meta property="og:description" content="${escapeAttr(description)}">`,
    `<meta property="og:url" content="${escapeAttr(canonical)}">`,
    `<meta property="og:locale" content="en_US">`,
    `<meta property="article:published_time" content="${escapeAttr(isoTime)}">`,
  ];
  for (const tag of post.tags) {
    lines.push(`<meta property="article:tag" content="${escapeAttr(tag)}">`);
  }

  if (ogImage && imageAlt) {
    lines.push(
      `<meta property="og:image" content="${escapeAttr(ogImage)}">`,
      `<meta property="og:image:width" content="1200">`,
      `<meta property="og:image:height" content="630">`,
      `<meta property="og:image:alt" content="${escapeAttr(imageAlt)}">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:image" content="${escapeAttr(ogImage)}">`,
      `<meta name="twitter:image:alt" content="${escapeAttr(imageAlt)}">`,
    );
  } else {
    lines.push(`<meta name="twitter:card" content="summary">`);
  }

  lines.push(
    `<meta name="twitter:title" content="${escapeAttr(post.title)}">`,
    `<meta name="twitter:description" content="${escapeAttr(description)}">`,
  );

  return lines.join('\n  ');
}
