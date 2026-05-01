// Page-specific styles for both /  and /post/<slug>. Lives in its own
// module so the two renderers don't duplicate the string.

export const feedPageStyles = `
  .feed { padding-top: 0; }

  .post {
    border-bottom: 2px solid var(--ink);
    padding: 28px 0 32px;
    position: relative;
  }
  .post:first-child { padding-top: 8px; }
  .post:last-child  { border-bottom: 0; }

  .post__summary {
    list-style: none;
    cursor: pointer;
    display: grid;
    grid-template-columns: 1fr;
    gap: 18px;
  }
  .post__summary::-webkit-details-marker { display: none; }
  .post__summary::marker { display: none; }

  .post__index {
    position: absolute;
    top: 28px; left: -56px;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 32px;
    color: var(--poster-red);
    line-height: 1;
  }
  @media (max-width: 1240px) { .post__index { display: none; } }

  .post__figure {
    position: relative;
    container-type: inline-size;
    container-name: postfig;
  }

  .post__title-wrap {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .post__kicker {
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--poster-red);
  }
  .post__excerpt {
    font-size: 17px;
    line-height: 1.5;
    color: var(--ink);
    max-width: 64ch;
  }
  .post__meta-row {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    padding-top: 8px;
  }

  .post[open] .post__summary { gap: 22px; }
  .post[open] .post__overlay-title { display: none; }
  .post[open] .post__title-expanded { display: flex; }
  /* Expanded view: show the image at its natural ratio, no crop. */
  .post[open] .figure--crop { aspect-ratio: auto; }
  .post[open] .figure--crop .figure__media {
    height: auto;
    object-fit: initial;
  }
  .post[open] .figure__overlay { display: none; }

  .post__title-expanded { display: none; flex-direction: column; gap: 8px; padding-top: 6px; }

  /* Container query: when the figure is mobile-narrow, drop the title
     overlay (it would overflow at small widths) and show the title in
     normal flow below the cropped image. Container query, not media
     query — the figure's container is what matters, not the viewport. */
  @container postfig (max-width: 480px) {
    .post__overlay-title { display: none; }
    .figure__overlay { display: none; }
    .post__title-expanded { display: flex; }
  }

  .post__body {
    padding-top: 22px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 220px;
    gap: 40px;
  }
  @media (max-width: 760px) {
    .post__body { grid-template-columns: 1fr; gap: 18px; }
  }

  .post__prose {
    font-size: 17px;
    line-height: 1.62;
    color: var(--ink);
    max-width: 68ch;
  }
  .post__prose p { margin: 0 0 1em; text-wrap: pretty; }
  .post__prose p:first-child::first-letter {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 4.2em;
    line-height: .85;
    float: left;
    padding: 4px 10px 0 0;
    color: var(--poster-red);
  }
  .post__prose blockquote {
    margin: 1.2em 0;
    padding: 4px 0 4px 18px;
    border-left: 4px solid var(--poster-red);
    font-family: var(--font-mono);
    font-size: .92em;
    color: var(--ink);
  }
  .post__prose blockquote p { margin: 0 0 .6em; }
  .post__prose blockquote p:last-child { margin-bottom: 0; }
  .post__prose code {
    font-family: var(--font-mono);
    background: var(--paper-cream-deep);
    padding: 1px 5px;
    border: 1px solid var(--ink);
    font-size: .9em;
  }
  .post__prose pre {
    background: var(--ink);
    color: var(--paper-cream);
    padding: 16px;
    overflow-x: auto;
    font-size: 14px;
    line-height: 1.5;
  }
  .post__prose pre code {
    background: transparent;
    border: 0;
    padding: 0;
    font-size: inherit;
    color: inherit;
  }
  .post__prose hr { border: 0; border-top: 2px solid var(--ink); margin: 24px 0; }
  .post__prose h2 {
    font-family: var(--font-display);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .02em;
    font-size: 26px;
    color: var(--ink);
    margin: 32px 0 10px;
  }
  .post__prose h3 {
    font-family: var(--font-display);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .02em;
    font-size: 22px;
    color: var(--ink);
    margin: 28px 0 8px;
  }
  .post__prose ul, .post__prose ol { padding-left: 22px; margin: 0 0 1em; }
  .post__prose li { margin: .25em 0; }
  .post__prose img { border: var(--frame) solid var(--ink); margin: 22px 0; }

  .post__sidebar {
    font-size: 13px;
    line-height: 1.5;
    color: var(--ink-soft);
    padding-top: 4px;
  }
  .post__sidebar dl { margin: 0; }
  .post__sidebar dt {
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .1em;
    color: var(--poster-red);
    margin-top: 12px;
  }
  .post__sidebar dt:first-child { margin-top: 0; }
  .post__sidebar dd { margin: 2px 0 0; color: var(--ink); }
  .post__sidebar a { color: var(--ink); text-decoration: underline; text-underline-offset: 3px; }

  .post__expand-cue {
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .12em;
    color: var(--ink-soft);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .post__expand-cue::before {
    content: "▸";
    display: inline-block;
    color: var(--poster-red);
    transition: transform .2s;
    font-size: 13px;
  }
  .post[open] .post__expand-cue::before { transform: rotate(90deg); }
  .post[open] .post__expand-cue .label-closed { display: none; }
  .post[open] .post__expand-cue .label-open { display: inline; }
  .post__expand-cue .label-open { display: none; }

  .post--no-image .post__summary { grid-template-columns: 1fr; }
`;
