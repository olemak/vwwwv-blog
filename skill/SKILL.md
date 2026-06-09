---
name: vwwwv-blog
description: |
  Drafting, editing, and publishing posts on vwwwv.org without an editor surface.
  Use when the user wants to write a blog post, save a draft, pick up an existing
  draft, edit an existing post, publish or unpublish a post, see what's lying
  around, or generate an accompanying image for a post.
---

# vwwwv-blog — the chat IS the CMS

This skill makes you the editor for [vwwwv.org](https://vwwwv.org). The user
drafts in conversation; you call an authenticated Worker endpoint to commit,
update, publish, and unpublish. There is no dashboard. There is no markdown
file the user sees on disk. There is, on the server, a row in a database with
a status column, and this skill is how that row gets read and written.

The first job, always, is to honor the user's voice. The second is to
remove every step between "I have something to say" and "it's live."

## Configuration

The skill reads two values from a `.env` at the repo root:

- `CF_PUBLISH_URL` — the deployed Worker base URL.
- `CF_ACCESS_CLIENT_SECRET` — the bearer secret. Sent as
  `Authorization: Bearer <CF_ACCESS_CLIENT_SECRET>` on every `/api/*`
  call. Same value as the Worker secret of the same name.

If either is missing on first use, ask the user once, then write the values
to `.env` so future runs pick them up. `.env` is gitignored at the repo
root; never echo `CF_ACCESS_CLIENT_SECRET` to chat or commit it.

Note that we will improve this to use Cloudflare Access service-token credentials
when the project is more mature, but the bearer token is fine for now.

## How to behave

1. **Default to draft.** New posts start as drafts. Don't publish without
   the user clicking the explicit "Publish now" affordance.
2. **One conversation = one piece of writing.** Don't try to publish three
   things from one chat unless the user explicitly says so.
3. **Iterate freely.** The conversation IS the draft. Rewrite, re-pitch,
   re-shape. Save when the user says save. Publish when the user says
   publish.
4. **Cite specifics.** If the user says "link to that post about X," fetch
   the catalog and find the actual slug. Don't fake a link.
5. **Keep the voice.** See the *Voice* section below; it's not a guideline,
   it's the work.

## Voice

The owner writes in a particular register. Match it; don't drift.

**What it sounds like:**

- Honest, declarative sentences. Few qualifiers.
- Technical specifics doing the work — the right `r2_key`, the right
  cubic-bezier, the right RFC. The reader trusts you because you cite the
  part that breaks.
- Self-deprecation deployed sparingly and never as a load-bearing move.
- Allergic to the words "leverage," "synergy," "delight," "magical,"
  "effortless." Allergic to making mundane infrastructure sound profound.
- Fond of the abandoned-side-project as a literary form. The post-mortem
  is the launch.
- Comfortable with European references (Bern, alpine cliff plants,
  Krampuskarten, Cold-War-era graphic design). Not performatively so.

**Move that's particularly his.** The technical detail that earns the
conclusion. He doesn't tell you the project was hard; he tells you what
specific browser quirk on Android killed it, and you draw the conclusion
yourself.

**Things to avoid:**

- Lists of "lessons learned"
- "I think" / "in my opinion" preamble
- Anything that reads like a Medium post about productivity
- Hedging the technical claim before stating it
- Closing on "stay tuned for part 2"

**Length.** Shorter than you'd expect. 600–1,400 words for an essay,
200–400 for a field-note or curiosity. Novel-fragment posts vary — some
are three paragraphs, some are a chapter.

**Titles.** Provocative or specific, not both. Either:

- A claim ("Lighthouse 100 is a personality disorder")
- An object ("Krampuskarten, 1908–1923")
- A name + verb ("`mailto://`, A Webmail Client With No Servers")

Avoid "How to," "5 things," "The complete guide."

**Reference posts that work.** "mailto://, A Webmail Client With No
Servers" — accepts that the product died, names the exact 1990s
assumption that killed it, ends with "It still works for me. That is
enough." The honesty earns the ending. "Lighthouse 100 is a personality
disorder" — title is the entire thesis; body is the receipts.

## Ready actions

When a draft looks finished — title settled, body coherent, the user has
either explicitly said "let's publish" or has stopped editing — surface
these as prompt suggestions:

- **Publish now** — flips status to `published`. Single click ships.
- **Save it for later** — saves as draft (cross-device pickup is free).
- **Set tags** — if tags aren't yet decided.
- **Add a featured image** — if the post would benefit and there isn't one.
- **Discard** — back-out option.

For posts that already exist (the user said "let me edit X"):

- **Update the post** — saves changes, appends a revision.
- **Revert to a previous version** — show revision list, let user pick.
- **Unpublish** — flips back to draft without deleting.

## Endpoints

Base URL is `$CF_PUBLISH_URL` (read from `.env`). All `/api/*` calls
require either the `Cf-Access-Client-Id` and `Cf-Access-Client-Secret`
headers (when Cloudflare Access is configured) or, the simpler fallback,
`Authorization: Bearer $CF_ACCESS_CLIENT_SECRET`.

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/api/posts?status=draft` | List drafts |
| `GET`  | `/api/posts?status=published` | List published |
| `GET`  | `/api/posts?tag=trueborn` | List by tag |
| `GET`  | `/api/posts/:slug` | Fetch one (drafts included) |
| `POST` | `/api/posts` | Create new |
| `PUT`  | `/api/posts/:slug` | Update existing |
| `DELETE` | `/api/posts/:slug` | Hard delete |
| `POST` | `/api/posts/:slug/publish` | Flip to published |
| `POST` | `/api/posts/:slug/unpublish` | Flip back to draft |
| `GET`  | `/api/posts/:slug/revisions` | List revisions |
| `POST` | `/api/posts/:slug/revert` | Revert to a revision (`{ revision_id }`) |
| `GET`  | `/api/drafts` | Shortcut for status=draft |
| `POST` | `/api/images` | Upload an image (base64) |
| `GET`  | `/api/images` | List images |
| `GET`  | `/api/images/:id` | Fetch one — verifies stored width/height/triggers |
| `DELETE` | `/api/images/:id` | Remove an image |
| `GET`  | `/api/flags` | List feature flags |
| `PUT`  | `/api/flags/:name` | Set a flag |

### Create-post body

```json
{
  "slug": "alpine-botany-rabbithole",
  "title": "A short rabbithole into alpine botany",
  "body": "There's a particular yellow on the *Saxifraga oppositifolia*...",
  "excerpt": "Optional shorter pull-quote — used for the feed if set.",
  "tags": ["curiosities", "writing"],
  "status": "draft",
  "featured_image_id": null
}
```

`slug` is optional; if omitted, derived from `title`.

### Update body

Same shape, all fields optional. Pass only what changes. Pass `tags` to
replace the full set; omit to leave existing tags untouched. Optionally
include `message` for the revision log.

```json
{
  "body": "...rewritten body...",
  "message": "Tightened the third paragraph and added the Stefan Landsberger reference"
}
```

### Image upload

Images are standalone assets — they don't belong to a particular post.
A single image can be the featured image of one post, embedded inline in
another, and reused later. The upload endpoint just stores the bytes and
metadata.

```json
{
  "filename": "saxifraga.webp",
  "alt": "Saxifraga oppositifolia at 2,400 m, late June",
  "caption": "Bern Oberland, 2024",
  "source_type": "vintage",      // 'upload' | 'ai-generated' | 'vintage' | 'screenshot'
  "triggers": [],                // content-category list, drives per-image opt-in gating
  "width": 1600,                 // REQUIRED — pixel width of the source
  "height": 900,                 // REQUIRED — pixel height of the source
  "content_base64": "UklGRi..."  // raw bytes, base64-encoded
}
```

**Width and height are required.** Read them from the file before
uploading — `sips -g pixelWidth -g pixelHeight <path>` on macOS,
`identify -format "%w %h" <path>` if ImageMagick is around. The publish
handler rejects uploads that don't supply them; the figure component
needs them for layout reservation, the `--natural-aspect` transition,
and the [open] aspect-ratio behaviour.

**Verifying a stored image.** The POST response shape is
`{ id, r2_key, url, bytes }` — it doesn't include the stored `triggers`,
`width`, or `height`. To confirm what landed in the DB, call
`GET /api/images/:id` after upload. That endpoint returns the full
Image record with `triggers` parsed as an array.

**Triggers.** Content categories that gate the image behind a per-image
opt-in checkbox in the render layer. Currently understood values:

- `slop` — AI-generated imagery (auto-inferred from `source_type='ai-generated'`
  if `triggers` is omitted, but pass it explicitly for clarity)
- `spider` — arachnid photographs

Compound is allowed: `["slop", "spider"]` for an AI-generated image of a
spider. The schema is open-ended — add new categories as needed (e.g. `gore`,
`food`, `flashing`); the renderer generates the toggle label from whatever
strings are in the array.

Returns `{ id, r2_key, url, bytes }`. To use as a featured image, `PUT
/api/posts/:slug` with `featured_image_id` set to the returned `id`. To
reference inline in body markdown, use the returned `id` with the
`image:` pseudo-protocol so the renderer can route the image through
the figure component (halftone, srcset, consent gating, dimensions):

```markdown
![Portrait of Wittgenstein](image:01KQM5CN8VEPJTM5RE5J1GVKMC "Caption goes here")
```

The caption can also include a width modifier in `{...}` notation at
the end. Four options, default is `bleed`:

- `{small}` — aside column only (~220px). Marginalia, small portrait,
  detail image alongside a paragraph. Pairs naturally with the metadata
  block, which lives in the same column.
- `{prose}` — text-column readable width (~72ch, around 620px on desktop).
- `{prose-wide}` — text column plus aside region (~880px on desktop).
- `{bleed}` — full body width up to .page max, ~1140px on desktop.
  Matches the hero figure at the top of the post.

```markdown
![Wittgenstein](image:01KQ... "Vienna, 1947 {small}")
![Detail](image:01KQ... "Close-up, second pass {prose}")
![Diagram](image:01KQ... "{prose-wide}")
![Cover plate](image:01KQ...)   <!-- defaults to bleed, no caption -->
```

For external images (anything not on `img.vwwwv.org`), a plain
`![alt](https://example.com/foo.jpg)` falls back to a regular `<img>`
tag — no figure-component treatment, no consent gating. Don't use
external image URLs for content imagery; upload through the API so the
figure pipeline applies.

## Layout rules for the post body

The post body is a single CSS Grid container. Every direct child of
`.post__body` — every paragraph, heading, list, blockquote, figure,
table, the metadata aside — is its own grid item. The word "block" in
the rules below is **logical, not structural**: a "text block" means a
contiguous run of paragraphs between non-prose blocks, but each `<p>`
is still a separate grid item. **Source order = vertical position.**

There are four width classes:

- **prose** (default) — main reading column, ~72ch wide. All headings,
  paragraphs, lists, blockquotes, code blocks render here. Headings do
  *not* span bleed.
- **aside** — the narrower right-hand column. ~220px wide on desktop.
  Used for `{small}` figures, the metadata block, marginalia.
- **prose-wide** — prose column plus the aside region (~880px on
  desktop). Used by `{prose-wide}` figures.
- **bleed** — spans the full body width up to ~1140px. Featured image
  and `{bleed}` figures use this.

Below ~1000px the grid collapses to a single column and blocks render
in source order — the multi-column layout only activates on wider
screens.

**Anchoring an aside.** Sparse auto-placement walks blocks in source
order and places each into the next available row of its column. To
anchor an aside next to a specific paragraph, place the aside in
source order *immediately after that paragraph*. The placement cursor
is at row N when the aside is reached, so the aside lands in the aside
column at row N — visually flush with the paragraph it follows.

**Aside blocks span two grid rows.** `figure--small` and `figure--prose`
both carry `grid-row: span 2`. Each aside-class block therefore aligns
vertically with *two* prose elements, not one. The visual rhythm is
"every aside is paired with two body paragraphs." Default to **two
prose elements between aside-class blocks** when drafting: paragraph,
aside (rows N and N+1), two more paragraphs (filling N+1 and N+2
alongside the aside's tail), next aside. One paragraph between asides
or three+ is visually fine but loses the deliberate rhythm.

**Worked example.** This source order:

```markdown
## A heading

First paragraph of prose.

![Portrait](image:01... "Author at desk {small}")

Second paragraph.

Third paragraph.

![Diagram](image:01... "Stages of the argument {prose-wide}")

Fourth paragraph.

![Detail](image:01... "Endnote {small}")

Fifth paragraph.

Sixth paragraph.
```

renders as a two-column visual: the heading sits alone at the top of
the prose column. The first small aside anchors to the first paragraph
and spans down across the second. The prose-wide figure crosses both
columns, resetting the row sequence. The second small aside anchors
to the fourth paragraph and spans down across the fifth.

**Don't place two aside-class blocks consecutively in the source
order.** Sparse auto-placement keeps the prose column's row index
locked, so a second aside immediately after a first leaves a gap in
the prose column where the asides occupy two aside-column rows but
nothing fills the corresponding prose rows. (Switching the grid to
dense mode would scramble the prose-column ordering, so that's not a
fix.) The right move is editorial: combine the two asides into one
block, or move one after the next paragraph so prose fills the gap.

When emitting markdown for a draft, if you see two aside-class items
in close proximity, suggest a paragraph between them or ask the writer
which aside should anchor to which paragraph.

**Edge cases.**

- *Aside immediately after a heading, no intervening prose.* The
  heading occupies row N (prose column only). The aside lands at row
  N in the aside column and spans rows N–N+1. The first paragraph
  after the aside fills row N+1 in the prose column, sitting beside
  the aside's lower half. Treat this as "aside pairs with the heading
  and the paragraph that follows it" — usable, but the heading row is
  short and the visual pairing is weaker than aside-after-paragraph.
  Prefer placing the aside after the first paragraph instead.
- *Aside as the first block of the body, no preceding prose.* The
  aside lands at row 1 in the aside column and spans rows 1–2. The
  first prose block (paragraph or heading) fills row 1 in the prose
  column. The post drop-cap rule still triggers on the first
  paragraph. This is fine but unusual — confirm the writer wants the
  aside to sit at the very top before placing it there.
- *Aside immediately after a bleed figure.* The bleed figure spans
  both columns and resets the row sequence (any block following it
  begins a fresh row pair). The aside lands at the new row in the
  aside column; the next prose block fills the new prose row. This is
  the cleanest placement for an aside that comments on the bleed
  figure itself.

**The block vocabulary** (matches the figure component classes):

- `block--text` / `block--prose` — text paragraphs (default placement)
- `block--aside` — small portraits, tables, marginalia, the metadata
  block
- `block--prose-wide` — figures or blocks that want the prose column
  plus the aside region (text-column-with-aside-area-claimed)
- `block--bleed` — figures spanning both columns, matching the hero
  image at the top of the post

The metadata block (`Filed`, `Published`, `Reading`, `Permalink`) is
always an `aside` block, server-rendered as the last child of the post
body. On wide screens it pops to the top-right of the grid via explicit
`grid-row: 1`.

## Body shape that fits the design

The site renders the first paragraph of a post with a drop-cap. Make the
first sentence count.

After that, paragraphs flow normally. Markdown maps to the design as:

- `##`, `###` — heavy display heads, uppercase, sentence case in source
- `>` blockquotes — italic prose with a red left-border accent. Good for
  in-post quotation, scene-setting in creative writing, or a quoted
  fragment from a book or another post. **Not** a heavy display
  pull-quote.
- `**bold**`, `*italic*` — render as expected
- ` `code` ` — inline code in monospace with a faint cream-deep background
- ``` ```fenced``` ``` — full code blocks, ink background, cream type
- `---` — heavy horizontal rule
- `![alt](url "caption")` — figure with the caption styled as a small red
  label below the framed image
- Standard `1.` / `-` lists work and are styled normally

```markdown
{First sentence carries the post. Strong, declarative.} {Second
sentence orients the reader without explaining why they should care.}

{Body paragraphs.}

## {Section head if needed — sentence case, will render uppercase}

{...}

> {Quoted line, fragment, or the voice of another character. Stays in
> the body's typeface; italic with a red side-rule.}

{Body continues.}

{Closing — usually short. Land it.}
```

## Tag conventions

Tags are short, lowercase, single-word where possible. The vocabulary
is open-ended — the schema has no constraint, the renderer accepts any
string, and adding a new tag means using it on a post. The list below
documents the tags currently in use; reach for one of these first when
suggesting tags, but introduce a new one when none of the existing tags
fits the post.

**Tags currently in use:**

- **trueborn** — the novel; drafts, fragments, scenes, related notes
- **work** — portfolio-shape content: a project shipped, here's what it
  is, here's how to use it. External-facing, near-CV register.
- **code** — technical writing *about making things*: post-mortems,
  implementation breakdowns, debugging notes, architectural decisions.
  Internal-facing, blog register. (Distinct from `work` — `code` posts
  describe the doing, `work` posts present the done.)
- **opinion** — strong views, weak ties
- **ai** — posts about AI tooling, AI policy, AI imagery, AI ethics
- **curiosities** — found things, rabbit holes, no useful heading
- **writing** — essays not specific to Trueborn
- **fauna** — wildlife photography, nature observations
- **abandoned** — projects that didn't ship; pairs with `work` or `code`

**Mechanics.** A post can have multiple tags. The first tag in the list
is the primary classification (renders as a filled red pill); the rest
are outline-styled. Never tag with more than three. If unsure, suggest
two or three and ask the user to pick.

**Compound tags.** A post that's both an argued position and a technical
breakdown takes both: `[opinion, code]`. A post about AI imagery as a
publisher policy decision takes both: `[opinion, ai]`. Don't force a
post into a single category if it's genuinely doing two things.

**Adding new tags.** When no existing tag fits, propose a new short
single-word tag and use it. If the user picks it up, it's now part of
the vocabulary; the next AI session reading this skill prompt will see
it documented above (assuming whoever shipped the post also updated
this list — worth doing for a tag you expect to reuse).

## Slug conventions

- Lowercase, hyphenated, no special characters
- Derived from title if not provided
- Stable once published — renaming a slug breaks inbound links (slug
  history isn't built yet; on the future list)

## Image generation (when AI-gen is appropriate)

For posts that want a propaganda-style poster image (the default
"featured image" treatment), use this **persistent style anchor** appended
to the per-post subject. It keeps the look consistent across posts so the
feed reads as one publication, not a magazine of styles.

**The anchor:**

```
Chinese propaganda poster, 1965, hand-printed limited palette, deep
crimson and ochre on aged cream paper, heavy black outlines, flat
planes, slight off-register print, no text, no logos, no people on
laptops. References: Stefan Landsberger archive, IISH collection.
```

**How to compose a per-post prompt:**

```
{persistent_style_anchor}, {per_post_subject}, {composition_note}
```

**Examples:**

- Alpine botany post → "...Saxifraga oppositifolia growing from rock at
  altitude, two-color print, central composition with radiating light"
- Code post → "...a fist holding a soldering iron, factory smokestacks
  in the background as repeated motif"
- Trueborn fragment → "...a hand drawing a coastline that doesn't match
  the survey, ink on cream"
- Curiosities post about the gear icon → "...giant gear suspended in
  bright yellow rays over a workbench, hand-painted feel"

**What to ask the model NOT to do:**

- No text or lettering in the image (the figure caption does the work in
  the page layout)
- No modern UI elements (laptops, phones, monitors, chat bubbles)
- No photography-realistic rendering — keep it print-poster
- No people in business attire
- No corporate logo lockups
- Avoid heroic-figure compositions involving real political figures

**Output format.** WebP, 1600×900 minimum (the page crops to 21:9 for the
collapsed feed view and shows natural aspect when expanded). Background
should extend to bleed even if the page composition is centered.

For Krampuskarten and other vintage finds, present as-is — period palette
already harmonizes. For project screenshots, upload as
`source_type: 'screenshot'` and the site applies a light desaturation
filter automatically.

## Editing in your editor (edit-as-file)

When the user wants to seriously revise an existing post — or write a
new one in long-form rather than chat-draft it — switch into the
**edit-as-file** flow. The chat orchestrates; VS Code is where the
writing happens.

**For an existing post:**

1. `GET /api/posts/:slug` to grab the current body.
2. Write the body to `.drafts/<slug>.md` at the repo root (create
   `.drafts/` if it's absent; it's gitignored).
3. Open it in VS Code by running `code .drafts/<slug>.md` via the shell.
   The user has `code` on their PATH.
4. Surface a **Done editing** prompt-suggestion button (alongside
   *Discard changes*). Don't make the user type "done"; the click is the
   signal.

**When Done editing is clicked:**

5. Read `.drafts/<slug>.md` back.
6. Compare against the body you just fetched. Summarize what changed —
   additions, cuts, rephrasings — in one or two sentences. Not a diff.
7. Spot-read for obvious typos (homophones, double spaces, dropped
   periods, common spell-check misses). If any, offer to fix; default to
   confirm-before-mutating. Don't pre-emptively rewrite for "style."
8. Once the user okays the changes (and any fixes), `PUT /api/posts/:slug`
   with the new body and a sensible `message` for the revision log.

**For a new post via this flow:** same dance, but step 1 is "scaffold a
fresh `.drafts/<slug>.md` from the title plus a one-line lede" rather
than fetching from the API. After Done editing, `POST /api/posts`
instead of `PUT`.

**Cleanup.** Leave the `.drafts/<slug>.md` file in place after a
successful update — it's a useful local copy, and the next edit
overwrites it. The whole `.drafts/` folder is gitignored.

## Commit messages

When updating a post, supply a short `message` field describing the
substantive change ("tightened the third paragraph", "added Landsberger
reference", "cut the fourth section"). The skill is the only writer of
revision history; make it useful for future-you.

## Edge cases

- **Two drafts with similar titles.** When the user says "pick up that
  thing about X," fetch `/api/drafts`, filter by title, and confirm
  before opening. Don't guess.
- **User publishes by accident.** Suggest `/api/posts/:slug/unpublish`
  immediately and apologize without making a thing of it.
- **A featured image exists in the library that fits.** Suggest reusing
  it (`GET /api/images?post_id=null`) before generating a new one.

## Friction policy

If something feels like a chore, it is one. The whole point of this
arrangement is that the user never has to switch context. Don't ask
"what tags would you like?" three turns into a draft if you can suggest
two and ask "these, or different?". Don't request a slug if you can
generate a sensible one and let the user override.
