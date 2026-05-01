// About page renderer.
// Pulls a row from the authors table for the bio; rest is editorial copy.

import type { Author } from '@vwwwv/db';
import { page } from './layout';
import { escapeHtml as e } from './escape';

export interface AboutRenderOptions {
  author: Author;
  wordmarkVariant: string;
}

export function renderAbout(opts: AboutRenderOptions): string {
  const { author, wordmarkVariant } = opts;

  const body = `
    <section class="about-hero">
      <div class="meta" style="color: var(--poster-red); margin-bottom: 14px;">Statement of intent · No. 01</div>
      <h1>I write things down so I can stop carrying them.</h1>
      ${author.bio ? `<p class="lead">${e(author.bio)}</p>` : ''}
    </section>

    <hr class="rule-double" aria-hidden="true">

    <div class="about-grid">
      <div class="about-prose">
        <p>This site is a long-running exhaust pipe for a novel called <em>Trueborn</em>, a handful of code experiments most of which were abandoned for honest reasons, and a small but growing file on alpine plants that survive at heights I never will.</p>

        <h2>What you'll find here</h2>
        <p><strong>Trueborn.</strong> Drafts, fragments, sentences cut from chapters, occasionally a whole scene. The novel is set on a continent that does not exist and concerns a cartographer who refuses to draw it correctly. I post in chapter order when I can and out of order when I can't.</p>
        <p><strong>Code.</strong> Field notes from things I built. Mostly small. Mostly abandoned. The post-mortems are more honest than the launches were. There is no startup advice here.</p>
        <p><strong>Curiosities.</strong> A loose folder. Vintage postcards depicting violence as folk art. The history of the gear icon. The first known use of the word "user" in a software manual. A defence of the purple saxifrage.</p>

        <h2>What you won't find</h2>
        <p>A newsletter signup. A "subscribe to my next thing" lightbox. An author photograph in soft focus against a brick wall. A list of the podcasts I have appeared on. A weekly digest. A commenting system. A newsletter. (I said this twice.)</p>

        <h2>Contact</h2>
        <p>If you want to write to me, the address is on the colophon page, and is a real address that goes to a real inbox that I read on Sundays.</p>
      </div>

      <aside>
        <dl class="facts">
          <dt>Writing from</dt><dd>Bern, mostly. Sometimes a hut at 2,400 m.</dd>
          <dt>Day job</dt><dd>Distributed systems. Not the kind that sell ads.</dd>
          <dt>Languages</dt><dd>English, German (Swiss inflected), enough French to apologise.</dd>
          <dt>Stack</dt><dd>Vanilla HTML, Cloudflare Workers, D1, R2. ~14 KB gzipped.</dd>
          <dt>Mailing list</dt><dd>None. By design.</dd>
          <dt>Comments</dt><dd>None. Reply by mail.</dd>
        </dl>
      </aside>
    </div>
  `;

  return page({
    title: 'About — vwwwv',
    description: `About the author of vwwwv.org.`,
    activeNav: 'about',
    wordmarkVariant,
    edition: 'Statement of intent · No. 01',
    pageStyles: aboutStyles,
    body,
  });
}

const aboutStyles = `
  .about-hero, .about-grid { max-width: 880px; }
  .about-hero { padding: 48px 0 32px; }
  .about-hero h1 { font-size: clamp(48px, 7vw, 96px); }
  .about-hero .lead { margin-top: 18px; font-size: 22px; line-height: 1.4; max-width: 32em; color: var(--ink); }

  .about-grid { display: grid; grid-template-columns: 1fr 220px; gap: 48px; padding-top: 22px; }
  @media (max-width: 760px) { .about-grid { grid-template-columns: 1fr; } }

  .about-prose { font-size: 17px; line-height: 1.62; color: var(--ink); }
  .about-prose p { margin: 0 0 1em; text-wrap: pretty; }
  .about-prose p:first-child::first-letter {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 4.2em;
    line-height: .85;
    float: left;
    padding: 4px 10px 0 0;
    color: var(--poster-red);
  }
  .about-prose h2 { margin: 28px 0 8px; font-size: 22px; }

  .facts dt {
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .1em;
    color: var(--poster-red);
    margin-top: 14px;
  }
  .facts dt:first-child { margin-top: 0; }
  .facts dd { margin: 2px 0 0; color: var(--ink); font-size: 14px; }
`;
