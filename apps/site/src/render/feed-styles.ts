// Page-specific styles for both /  and /post/<slug>. Lives in its own
// module so the two renderers don't duplicate the string.

export const feedPageStyles = /* css */`
  .feed { padding-top: 0; }

  .post {
    border-bottom: 2px solid var(--ink);
    padding: 28px 0 32px;
    position: relative;
    container-type: inline-size;
    container-name: postbody;
  }
  .post:first-child { padding-top: 0; }
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
  @media (width <= 1240px) { .post__index { display: none; } }

  .post__figure {
    position: relative;
    container-type: inline-size;
    container-name: postfig;
  }

  .post__title-wrap {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-inline: var(--page-pad);
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
    padding-inline: var(--page-pad);
  }
  .post__meta-row {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    padding: 8px var(--page-pad) 0;
  }

  .post[open] .post__summary { gap: 22px; }
  .post[open] .post__overlay-title { display: none; }
  .post[open] .post__title-expanded { display: flex; }
  .post[open] .figure--crop { aspect-ratio: var(--natural-aspect, 21 / 9); }
  .post[open] .figure__overlay { display: none; }

  .post:not([open]) .post__summary > .figure-caption { display: none; }

  /* Inline figures use an inner .figure__plate wrapper that holds the
     aspect-ratio'd image area; the figcaption sits as a sibling of the
     plate, outside the constrained box, so it can't be clipped by the
     plate's overflow:hidden (needed for the halftone). */
  .figure--inline {
    background: transparent;
    overflow: visible;
  }
  .figure--inline::before { content: none; }
  .figure--inline .figure__plate {
    position: relative;
    aspect-ratio: var(--natural-aspect, auto);
    background: var(--paper-cream-deep);
    overflow: hidden;
  }
  .figure--inline .figure__plate::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: var(--lqip);
    background-size: cover;
    background-position: center;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
    image-rendering: pixelated;
    filter: grayscale(1) contrast(1.3);
    z-index: 0;
  }
  .figure--inline > .figure-caption {
    display: flex;
    margin-top: 8px;
    padding-inline: 0;
  }

  .post::details-content {
    block-size: 0;
    overflow: hidden;
    interpolate-size: allow-keywords;
    transition: block-size 0.4s cubic-bezier(.7, 0, .2, 1),
                content-visibility 0.4s allow-discrete;
  }
  .post[open]::details-content {
    block-size: auto;
  }
  @media (prefers-reduced-motion: reduce) {
    .post::details-content { transition: none; }
  }

  .post__title-expanded {
    display: none;
    flex-direction: column;
    gap: 8px;
    padding: 6px var(--page-pad) 0;
  }

  @container postfig (width <= 480px) {
    .post__overlay-title { display: none; }
    .figure__overlay { display: none; }
    .post__title-expanded { display: flex; }
  }

  .post__body {
    padding-top: 22px;
    font-size: 17px;
    line-height: 1.62;
    color: var(--ink);
  }
  .post__body > *:where(:not(.post__sidebar)) {
    grid-column: prose-start / prose-end;
    padding-inline: var(--page-pad);
    max-width: 72ch;
    margin-inline: auto;
  }
  .post__body > figure {
    grid-column: bleed-start / bleed-end;
    padding-inline: 0;
    max-width: none;
    margin: 18px 0;
  }
  .post__body > .figure--prose      { grid-column: prose-start / prose-end; grid-row: span 2; }
  .post__body > .figure--prose-wide { grid-column: prose-start / aside-end; }
  .post__body > .figure--small      { grid-column: aside-start / aside-end; grid-row: span 2; }

  /* Text-marginalia containers (:::aside / :::wide). grid-column only
     takes effect once the grid is active (>= 1000px); below that they
     fall back into normal prose flow, which is fine. */
  .post__body > .block--aside {
    grid-column: aside-start / aside-end;
    align-self: start;
    font-size: 13px;
    line-height: 1.5;
    color: var(--ink-soft);
  }
  .post__body > .block--aside > :first-child { margin-top: 0; }
  .post__body > .block--aside > :last-child { margin-bottom: 0; }
  .post__body > .block--aside p { margin: 0 0 .6em; }
  .post__body > .block--aside blockquote {
    margin: 0 0 .8em;
    padding: 2px 0 2px 12px;
    border-left: 3px solid var(--poster-red);
    font-family: var(--font-mono);
    font-style: normal;
  }
  .post__body > .block--aside blockquote p:last-child { margin-bottom: 0; }
  .post__body > .block--aside :is(h2, h3, h4) {
    font-family: var(--font-display);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .02em;
    font-size: 13px;
    margin: 0 0 .5em;
    color: var(--ink);
  }
  .post__body > .block--aside :is(ul, ol) { padding-left: 18px; margin: 0 0 .6em; }

  /* Dynamic aside span: each aside fills the rows down to the next
     aside-column occupant (computed at render time, see applyAsideSpans
     in markdown.ts). Every aside carries one of these (no default span
     on .block--aside itself). Floor 1, capped at 6. Inert below 1000px. */
  .post__body > .block--aside--span-1 { grid-row: span 1; }
  .post__body > .block--aside--span-2 { grid-row: span 2; }
  .post__body > .block--aside--span-3 { grid-row: span 3; }
  .post__body > .block--aside--span-4 { grid-row: span 4; }
  .post__body > .block--aside--span-5 { grid-row: span 5; }
  .post__body > .block--aside--span-6 { grid-row: span 6; }

  /* On narrow screens the aside drops into the prose flow and loses the
     visual separation the margin gave it. Bump the type up and set it
     apart with a left rule and a little extra breathing room. */
  @container postbody (width < 1000px) {
    .post__body > .block--aside {
      font-size: 15px;
      line-height: 1.55;
      margin-block: 1.5em;
      padding-block: 8px;
      border-left: 3px solid var(--poster-red);
    }
    .post__body > .block--aside :is(h2, h3, h4) { font-size: 14px; }
    /* Inline figures bleed to the screen edge on mobile; inset the
       caption so it doesn't sit flush against it. */
    .figure--inline > .figure-caption { padding-inline: var(--page-pad); }
  }

  .post__body > .block--wide {
    grid-column: prose-start / aside-end;
  }
  .post__body > .block--wide > :first-child { margin-top: 0; }
  .post__body > .block--wide > :last-child { margin-bottom: 0; }

  /* Tables anywhere in the post body — prose column or inside a :::wide
     block. Wide blocks just grant the extra width; the look is shared.
     Each table is wrapped in .table-scroll (see markdown.ts) so a wide
     table scrolls sideways on narrow viewports instead of overflowing. */
  .post__body .table-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    margin: 0 0 1em;
  }
  .post__body table {
    width: 100%;
    min-width: 32rem;
    border-collapse: collapse;
    font-size: 14px;
    margin: 0;
  }
  .post__body :is(th, td) {
    border: 1px solid var(--ink);
    padding: 6px 9px;
    text-align: left;
    vertical-align: top;
  }
  .post__body th {
    font-family: var(--font-mono);
    font-size: 12px;
    text-transform: uppercase;
    background: var(--paper-cream-deep);
  }

  @container postbody (width >= 1000px) {
    .post__body {
      display: grid;
      grid-template-columns:
        [bleed-start] minmax(var(--page-pad), 1fr)
        [prose-start] min(72ch, 100%) [prose-end]
        40px
        [aside-start] 220px [aside-end]
        minmax(var(--page-pad), 1fr) [bleed-end];
    }
    .post__body > *      { padding-inline: 0; max-width: none; margin-inline: 0; }
    .post__body > figure { margin: 0; }
    .post__body > .post__sidebar { padding: 6px; }
  }

  .post__body > p { margin: 0 0 1em; text-wrap: pretty; }
  .post__body > p:first-of-type::first-letter {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 4.2em;
    line-height: .85;
    float: left;
    padding: 4px 10px 0 0;
    color: var(--poster-red);
  }
  .post__body > blockquote {
    margin: 1.2em 0;
    padding: 4px 0 4px 18px;
    border-left: 4px solid var(--poster-red);
    font-family: var(--font-mono);
    font-size: .92em;
    color: var(--ink);
  }
  .post__body > blockquote p { margin: 0 0 .6em; }
  .post__body > blockquote p:last-child { margin-bottom: 0; }
  .post__body code {
    font-family: var(--font-mono);
    background: var(--paper-cream-deep);
    padding: 1px 5px;
    border: 1px solid var(--ink);
    font-size: .9em;
  }
  .post__body > pre {
    background: var(--ink);
    color: var(--paper-cream);
    padding: 16px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 14px;
    line-height: 1.5;
  }
  .post__body > pre code {
    background: transparent;
    border: 0;
    padding: 0;
    font-size: inherit;
    color: inherit;
  }
  .post__body > hr { border: 0; border-top: 2px solid var(--ink); margin: 24px 0; }
  .post__body > :is(h2, h3) {
    font-family: var(--font-display);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .02em;
    color: var(--ink);
  }
  .post__body > h2 { font-size: 26px; margin: 32px 0 10px; }
  .post__body > h3 { font-size: 22px; margin: 28px 0 8px; }
  .post__body > :is(ul, ol) { padding-left: 22px; margin: 0 0 1em; }
  .post__body > :is(ul, ol) li { margin: .25em 0; }
  .post__body > img { border: var(--frame) solid var(--ink); margin: 22px 0; }

  .post__sidebar {
    grid-column: aside-start / aside-end;
    grid-row: 1 / span 2;
    align-self: start;
    font-size: 13px;
    line-height: 1.5;
    color: var(--ink-soft);
    padding: 4px var(--page-pad) 0;
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
