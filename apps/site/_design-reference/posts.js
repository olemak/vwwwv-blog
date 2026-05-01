// vwwwv — post data. Mock content; in production this comes from D1.
window.POSTS = [
  {
    id: "trueborn-ch07",
    kicker: "Trueborn · Chapter Seven",
    title: "The Cartographer Who Refused North",
    excerpt: "Seven months into the survey, Aelis stops drawing the compass rose. She does not announce it. She simply leaves the upper-right corner of every chart blank, and waits to see who notices.",
    date: "2026-04-22",
    readtime: "14 min",
    tags: ["trueborn"],
    image: { kind: "propaganda", aspect: "21/9", caption: "AI-generated · plate iv" },
    body: `
      <p>Seven months into the survey, Aelis stops drawing the compass rose. She does not announce it. She simply leaves the upper-right corner of every chart blank, and waits to see who notices.</p>
      <p>The Margrave notices on the eleventh chart. He turns it ninety degrees and asks, with the polite venom of a man who once executed his own brother for a misfiled tax return, whether north has gone out of fashion in the lowland academies.</p>
      <blockquote>“North is a habit,” she says. “Habits are how empires hide their assumptions.”</blockquote>
      <p>This is the first lie she tells him. The truth is that she has been north, and there is nothing there worth pointing at.</p>
      <h3>What the survey actually found</h3>
      <p>The Iron Verge does not run east-to-west the way the Imperial Atlas insists. It runs in a slow open spiral, and at the centre of the spiral there is a town that is not on any chart, and in that town there is a child who knows Aelis's real name.</p>
      <p>I am writing this chapter in three drafts. The first was operatic. The second was clinical. The third — this one — is the one where I let her be afraid.</p>
    `,
  },
  {
    id: "details-vt",
    kicker: "Code · Field Note",
    title: "A Front Page That Expands In Place",
    excerpt: "Notes on building this very feed: native <details>, the View Transitions API, and why a 15&nbsp;KB budget makes you a better designer.",
    date: "2026-04-18",
    readtime: "8 min",
    tags: ["code"],
    image: { kind: "screenshot", aspect: "21/9", caption: "DevTools · transition timeline" },
    body: `
      <p>The brief said “reads more like a newspaper front page than a Medium scroll.” I took that personally.</p>
      <p>Every post on this site is a <code>&lt;details&gt;</code> element. No router, no client-side hydration, no skeleton states. Click the summary; the body unfolds inline. Click again; it folds back. The URL doesn't change unless you ask it to.</p>
      <h3>The choreography</h3>
      <p>When a post opens, three things move at once: the headline migrates from the bottom-left of the image to its proper place above the body; the image relaxes from a 21:9 crop to its intrinsic aspect; and the meta row — date, read time, tags — slides under the new headline as a settled object.</p>
      <p>That choreography is run by the View Transitions API in same-document mode. Two named transitions per post (<code>--vt-title</code> and <code>--vt-media</code>), assigned dynamically only on the post being toggled, so the browser doesn't try to morph forty-seven of them at once.</p>
      <div class="pullquote">A 15&nbsp;KB budget is a design tool. It removes everything you were going to regret.</div>
      <p>The whole site is 14.2&nbsp;KB gzipped. There are no fonts loaded from a CDN, no analytics, no tracking scripts, no React on the production page. The Tweaks panel you may have noticed is dev-only — it ships nowhere near the visitor.</p>
      <h3>What I cut</h3>
      <p>A scroll-snap carousel for related posts. An infinite-scroll feed. Reading-progress bar. Author byline. Share buttons. Comment section. “Estimated read time” calculated client-side. A theme toggle. A search modal. A 404 page with a joke.</p>
      <p>I kept: the date.</p>
    `,
  },
  {
    id: "krampuskarten",
    kicker: "Curiosities · Found",
    title: "Krampuskarten, 1908–1923",
    excerpt: "A small archive of postcards depicting Krampus dragging children into a sack, set against pre-war Austrian colour lithography. The composition is doing more work than you'd expect.",
    date: "2026-04-09",
    readtime: "5 min",
    tags: ["curiosities"],
    image: { kind: "vintage", aspect: "21/9", caption: "Postcard · Vienna · 1911" },
    body: `
      <p>I have been collecting Krampuskarten in a folder on my desktop for a year and a half. The folder is called “bad santa.” This is a poor index but a good emotional summary.</p>
      <p>The compositional move that keeps reappearing: Krampus enters from the right, occupying roughly two-thirds of the frame, body angled diagonally; the child occupies the lower-left third; the negative space at upper-left is reserved for either a moon, a window, or the printer's hand-set greeting. The result is a Z that the eye reads in a single sweep — threat, victim, context.</p>
      <p>The lithographers were not graphic designers. They were doing what worked. Most graphic design, then and now, is a postcard printer trying to fit a horned man, a frightened child, and the words “Gruß vom Krampus” into a four-by-six rectangle.</p>
    `,
  },
  {
    id: "abandoned-mailto",
    kicker: "Abandoned · Side Project",
    title: "mailto://, A Webmail Client With No Servers",
    excerpt: "I spent two weekends building an email client that ran entirely from a <code>mailto:</code> link and the user's native mail handler. It worked. Nobody wanted it.",
    date: "2026-03-28",
    readtime: "6 min",
    tags: ["code", "abandoned"],
    image: null,
    body: `
      <p>The pitch: every contact form on the web should be a <code>mailto:</code> link with the body pre-filled. No backend, no rate-limiting, no spam filters needed because the spammer has to open Mail.app to send it. The web was already this, in 1997, and we forgot.</p>
      <p>I built a generator. Paste any HTML form, get back a <code>mailto:</code> with the field values templated in. It worked beautifully on iOS, badly on Android, and not at all on machines where the user had never configured a default mail client — which turned out to be most machines.</p>
      <p>That last fact ended the project. You cannot ship a webmail client whose dependency is “the user has, at some point in the last decade, set up email on their computer.” That is a 1990s assumption.</p>
      <p>I am leaving the repo up. It still works for me. That is enough.</p>
    `,
  },
  {
    id: "saxifraga",
    kicker: "Alpine botany",
    title: "Saxifraga oppositifolia: A Defence",
    excerpt: "The purple saxifrage flowers at 4,500 metres, in scree, while there is still snow on the ground. It is the highest-altitude vascular plant in Europe. People keep calling it modest. It is not modest. It is a maniac.",
    date: "2026-03-15",
    readtime: "7 min",
    tags: ["botany"],
    image: { kind: "vintage", aspect: "21/9", caption: "Plate · Flora Helvetica · 1923" },
    body: `
      <p>The purple saxifrage flowers at 4,500 metres, in scree, while there is still snow on the ground. It is the highest-altitude vascular plant in Europe. People keep calling it modest. It is not modest. It is a maniac.</p>
      <p>Its strategy is mat-forming cushions: dense, low, hugging the rock to trap warm air; flowers held on stems no longer than a thumbnail. The cushions are perennial. Some of them are older than I am. Some of them are older than the trail I walked to find them.</p>
      <h3>What it teaches</h3>
      <p>I think a lot about cushion plants when I am writing. The instinct is always to grow tall. The thing that survives the wind is the thing that grew sideways instead.</p>
    `,
  },
  {
    id: "trueborn-fragments",
    kicker: "Trueborn · Fragments",
    title: "Three Sentences I Cut This Week",
    excerpt: "A standing weekly post. Sentences that were good but were doing the wrong job, recorded here so I can stop missing them.",
    date: "2026-03-08",
    readtime: "2 min",
    tags: ["trueborn"],
    image: null,
    body: `
      <p>1. <em>The horse was the first thing in the village to understand what had happened, and the last thing to forgive it.</em> — Cut from chapter four. Too neat. The horse is a horse.</p>
      <p>2. <em>Aelis had been told her whole life that grief was a room. She had not been told it had a window.</em> — Cut from chapter eleven. The metaphor wants to be a chapter, not a sentence.</p>
      <p>3. <em>He spoke the way a candle speaks: only when you are close enough to be burned.</em> — Cut from chapter two. Bad. Sounds like a fortune cookie wrote itself drunk.</p>
    `,
  },
  {
    id: "lighthouse-100",
    kicker: "Code · Methodology",
    title: "Lighthouse 100 Is A Personality Disorder",
    excerpt: "I have been chasing perfect Lighthouse scores on this site for three weeks. I will tell you what I learned, and then I will tell you why it does not matter.",
    date: "2026-02-28",
    readtime: "11 min",
    tags: ["code"],
    image: { kind: "screenshot", aspect: "21/9", caption: "Lighthouse run · 100/100/100/100" },
    body: `
      <p>The score is a four-digit lie. 100/100/100/100 means the harness's heuristics could not find anything to complain about; it does not mean the site is good. I have shipped 100s for sites that took six seconds to feel responsive, and I have shipped 92s for sites that felt instant.</p>
      <p>That said, the discipline of getting to 100 forces you to remove things. Every byte you save is a byte the visitor doesn't pay for. The score is a poor proxy for a real virtue, and the real virtue is worth the effort.</p>
      <p>Specific things I did, in descending order of impact: subset the display font to ASCII-only and inlined it as a data URL; replaced the avatar PNG with an SVG; removed a 14&nbsp;KB CSS reset I had been carrying around since 2019; deleted analytics; deleted the cookie banner that existed only because of analytics; deleted the privacy policy page that existed only because of the cookie banner. The privacy policy was the largest single saving by character count.</p>
    `,
  },
];
