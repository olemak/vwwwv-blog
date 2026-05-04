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

  const body = /* html */`
    <section class="about-hero">
      <div class="meta" style="color: var(--poster-red); margin-bottom: 14px;">Statement of intent · No. 01</div>
      <h1>I write ideas down so I can stop carrying them around</h1>
      ${author.bio ? `<p class="lead">${e(author.bio)}</p>` : ''}
    </section>

    <hr class="rule-double" aria-hidden="true">

    <div class="about-grid">
      <div class="about-prose">
        <p>This site is an exhaust pipe for things I think about, write about, a few portfolio items to showcase things I did, once, a handful of code experiments (many of them abandoned), and a good chunk of just plain curiosities that I have been thinking about and figured I should get out of my system by writing about them. In other words: It's a blog.</p>

        <h2>What you'll find here</h2>
        <p><strong>Trueborn.</strong> Drafts, fragments, sentences cut from chapters, occasionally a whole scene. This is a novel, by the way. I'll try to get it published when it is done, just for fun.</p>
        <p><strong>Code.</strong> Field notes from things I built. Mostly small. Honest post-mortems, hopefully, interspersed with anecdotes you might find interesting and the odd pun. There is no startup advice here.</p>
        <p><strong>Curiosities.</strong> Cool stuff I came across, too random for the other categories. Maybe novel ideas I am unlikely to build on. Article stubs. Disjointed opinions.</p>

        <h2>What you won't find</h2>
        <p>A newsletter signup. A "subscribe to my next thing" lightbox. An author photograph in soft focus against a brick wall. A list of the podcasts I have appeared on. A weekly digest. A commenting system. A newsletter. (I said this twice.)</p>

        <h2>Contact</h2>
        <p>If you want to write to me, you can reach me on my linkedin page, which is linked in, somewhere. Try the footer.</p>
      </div>

      <aside>
        <dl class="facts">
          <dt>Writing from</dt><dd>Oslo, mostly.</dd>
          <dt>Day job</dt><dd>Software engineering.</dd>
          <dt>Languages</dt><dd>Norwegian, English, some German, barely enough French to apologise, atrocious Duolingo Italian and just enough Portuguese to get in trouble.</dd>
          <dt>Stack</dt><dd>Framework-free vanilla HTML with liberal use of modern web APIs, minimal JS, inline CSS, Serverside rendered and hosted on the edge by Cloudflare Workers, D1, R2. ~14 KB gzipped. The editor interface is a markdown file and an AI skill. Oh, you wanted to know if <em>I'm</em> stacked? Well, no.</dd>
          <dt>Mailing list</dt><dd>Hah, no.</dd>
          <dt>Comments</dt><dd>Also no. You are welcome to make a post on Reddit or somewhere else if you want. Send me a message on linkedin if you'd like me to reply.</dd>
        </dl>
      </aside>
    </div>
  `;

  return page({
    title: 'About — vwwwv',
    description: `About the author and the site.`,
    activeNav: 'about',
    wordmarkVariant,
    edition: 'Statement of intent · No. 01',
    pageStyles: aboutStyles,
    body,
  });
}

const aboutStyles = /* css */`
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
