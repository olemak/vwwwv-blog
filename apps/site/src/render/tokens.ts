// Design tokens + shared chrome CSS, inlined into every page's <head>.
//
// Previously shipped as /tokens.css with a <link rel="stylesheet">. That
// turned every page into a two-round-trip render: HTML → tokens.css →
// paint. With the file at ~9 KB raw (smaller after minification + brotli)
// it costs less to ship inline once than to make a render-blocking
// request on every navigation. Lighthouse stops complaining about
// render-blocking CSS *and* unhashed-asset cache lifetimes in one move.
//
// Page-specific styles (feed, tag-cloud, about) still live in their own
// modules and are inlined per route, so we ship only what each page uses.

export const tokensCss = /* css */`
  /* vwwwv.org — design tokens + shared chrome
     Anchor: deep poster red on aged cream paper. Brutalist propaganda homage.
     Hard edges. No radii. No shadows. */

  :root {
    /* Palette */
    --poster-red: #C8102E;
    --paper-cream: #EDE3CE;
    --ink: #141210;
    --ochre: #C28A2C;
    --indigo-faded: #2B3A55;
    --paper-cream-deep: #E0D4B8;
    --ink-soft: #3A332C;
    --rule: var(--ink);

    /* Type */
    --font-body: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --font-display: "Oswald", "Impact", "Haettenschweiler", "Arial Narrow Bold", var(--font-body);
    --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, "Roboto Mono", monospace;

    --t-display:   clamp(56px, 9vw, 132px);
    --t-h1:        clamp(34px, 4.6vw, 64px);
    --t-h2:        clamp(22px, 2.4vw, 30px);
    --t-lead:      19px;
    --t-body:      16px;
    --t-meta:      13px;
    --t-caption:   12px;

    --lh-tight: 1.04;
    --lh-snug:  1.16;
    --lh-body:  1.55;

    /* Spacing */
    --gut: 24px;
    --col: 8px;
    --rule-thick: 6px;
    --rule-mid:   2px;
    --rule-thin:  1px;
    --frame:      4px;

    --page-max: 1140px;
    --read-col: 720px;
    --page-pad: clamp(20px, 5vw, 56px);
  }

  .page {
    max-width: var(--page-max);
    margin: 0 auto;
    padding: 0 var(--page-pad) 120px;
    position: relative;
    z-index: 1;
  }
  .figure--bleed { margin-inline: calc(-1 * var(--page-pad)); }

  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: var(--paper-cream);
    color: var(--ink-soft);
    font-family: var(--font-body);
    font-size: var(--t-body);
    line-height: var(--lh-body);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  /* Subtle paper grain — single tiny inline SVG, ~400 bytes. */
  body::before {
    content: "";
    position: fixed; inset: 0;
    pointer-events: none;
    z-index: 0;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.08 0 0 0 0 0.07 0 0 0 0 0.06 0 0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
    mix-blend-mode: multiply;
    opacity: .55;
  }

  a { color: var(--poster-red); text-decoration: none; }
  a:hover { text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 2px; }

  img { display: block; max-width: 100%; }

  ::selection { background: var(--poster-red); color: var(--paper-cream); }

  /* Display type */
  .display, h1, h2 {
    font-family: var(--font-display);
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--ink);
    line-height: var(--lh-tight);
    text-transform: uppercase;
  }
  h1 { font-size: var(--t-h1); margin: 0; }
  h2 { font-size: var(--t-h2); margin: 0; }
  .lead { font-size: var(--t-lead); line-height: 1.4; color: var(--ink); }
  .meta {
    font-family: var(--font-mono);
    font-size: var(--t-meta);
    text-transform: uppercase;
    letter-spacing: .08em;
    color: var(--ink-soft);
  }
  .caption {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: var(--t-caption);
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--poster-red);
  }

  /* Rules */
  .rule-double {
    border: 0;
    height: 0;
    border-top: var(--rule-thick) solid var(--ink);
    position: relative;
    margin: 0 0 var(--gut);
  }
  .rule-double::after {
    content: "";
    position: absolute;
    left: 0; right: 0;
    top: 10px;
    height: 0;
    border-top: var(--rule-mid) solid var(--ink);
  }
  .rule-thin { border: 0; border-top: var(--rule-thin) solid var(--ink); margin: 16px 0; }
  .rule-red { border: 0; border-top: var(--rule-thick) solid var(--poster-red); margin: 0 0 var(--gut); }

  /* Tag pills */
  .tag {
    display: inline-block;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 11px;
    letter-spacing: .12em;
    text-transform: uppercase;
    padding: 5px 9px 4px;
    border: 2px solid var(--ink);
    line-height: 1;
    vertical-align: baseline;
    white-space: nowrap;
  }
  .tag--filled  { background: var(--poster-red); color: var(--paper-cream); border-color: var(--poster-red); }
  .tag--outline { background: transparent; color: var(--ink); }
  .tag--ochre   { background: var(--ochre); color: var(--ink); border-color: var(--ochre); }
  .tag:hover { text-decoration: none; }
  a.tag:hover { transform: translate(-1px, -1px); box-shadow: 2px 2px 0 var(--ink); }

  /* Figures */
  .figure {
    margin: 0;
    border: var(--frame) solid var(--ink);
    background: var(--paper-cream-deep);
    position: relative;
    overflow: hidden;
  }
  .figure__media { display: block; width: 100%; height: 100%; object-fit: cover; }
  .figure--crop { aspect-ratio: 21 / 9; }
  .figure--natural { aspect-ratio: auto; }

  .figure__overlay {
    position: absolute;
    inset: auto 0 0 0;
    padding: 28px 28px 22px;
    background: linear-gradient(
      to top,
      rgba(20,18,16, .82) 0%,
      rgba(20,18,16, .55) 45%,
      rgba(20,18,16, 0)   100%
    );
    color: var(--paper-cream);
  }
  .figure__overlay h1,
  .figure__overlay h2 { color: var(--paper-cream); }

  .figure-caption {
    margin-top: 8px;
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .figure-caption .caption { color: var(--poster-red); }
  .figure-caption .caption-text {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--ink-soft);
    text-transform: none;
    letter-spacing: 0;
  }

  /* Project screenshots: light desaturation to harmonize. */
  .figure--screenshot .figure__media {
    filter: saturate(.55) sepia(.18) contrast(1.02);
  }

  /* Buttons / links of last resort */
  .btn-text {
    font-family: var(--font-display);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .1em;
    font-size: 13px;
    color: var(--ink);
    border-bottom: 2px solid var(--poster-red);
    padding-bottom: 1px;
    cursor: pointer;
  }

  /* Masthead */
  .masthead {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
    padding: 24px 0 14px;
    border-top: 6px solid var(--ink);
    border-bottom: 2px solid var(--ink);
    position: relative;
    margin-top: 22px;
  }
  .masthead::before {
    content: "";
    position: absolute;
    left: 0; right: 0; top: -12px;
    border-top: 2px solid var(--ink);
  }
  .masthead__edition {
    position: absolute;
    top: -28px;
    right: 0;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .masthead__brand {
    display: flex;
    align-items: center;
    gap: 14px;
    text-decoration: none;
  }
  .masthead__brand:hover { text-decoration: none; }
  .wordmark {
    display: block;
    height: 38px;
    width: auto;
  }
  .masthead__nav { display: flex; gap: 0; }
  .masthead__nav a {
    font-family: var(--font-display);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .14em;
    font-size: 14px;
    color: var(--ink);
    padding: 6px 18px;
    border-left: 2px solid var(--ink);
    line-height: 1;
  }
  .masthead__nav a:first-child { border-left: 0; padding-left: 0; }
  .masthead__nav a:last-child { padding-right: 0; }
  .masthead__nav a.is-active { color: var(--poster-red); }
  .masthead__nav a:hover { text-decoration: none; color: var(--poster-red); }

  /* Footer */
  .foot {
    margin-top: 64px;
    padding-top: 22px;
    border-top: 6px solid var(--ink);
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    flex-wrap: wrap;
  }
  .foot::before {
    content: "";
    position: absolute;
    left: 0; right: 0; top: 10px;
    height: 0; border-top: 2px solid var(--ink);
  }
  .foot__col {
    font-size: 13px;
    line-height: 1.5;
  }
  .foot__col strong {
    font-family: var(--font-display);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .1em;
    font-size: 12px;
    color: var(--poster-red);
    display: block;
    margin-bottom: 4px;
  }
  .foot__col a { color: var(--ink); text-decoration: underline; text-underline-offset: 3px; }
  .foot__colophon {
    max-width: 320px;
    font-size: 12px;
    font-family: var(--font-mono);
    color: var(--ink-soft);
    line-height: 1.5;
  }

  /* View Transitions */
  @view-transition { navigation: auto; }

  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation-duration: .42s;
    animation-timing-function: cubic-bezier(.7, 0, .2, 1);
  }
  ::view-transition-group(*) {
    animation-duration: .55s;
    animation-timing-function: cubic-bezier(.7, 0, .2, 1);
  }

  .wordmark        { view-transition-name: vw-wordmark; }
  .masthead        { view-transition-name: vw-masthead; }
  .masthead__nav   { view-transition-name: vw-nav; }
  .masthead__nav a.is-active { view-transition-name: vw-nav-active; }

  @media (prefers-reduced-motion: reduce) {
    ::view-transition-group(*),
    ::view-transition-old(root),
    ::view-transition-new(root) { animation-duration: .01ms !important; }
  }

  /* Utility */
  .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
  .stack > * + * { margin-top: var(--gut); }
  .muted { color: var(--ink-soft); }
  .invert { background: var(--ink); color: var(--paper-cream); padding: 2px 6px; }
`;
