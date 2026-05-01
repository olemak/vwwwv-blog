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
| `GET`  | `/api/images?post_id=...` | List images |
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
  "content_base64": "UklGRi..."  // raw bytes, base64-encoded
}
```

Returns `{ id, r2_key, url, bytes }`. To use as a featured image, `PUT
/api/posts/:slug` with `featured_image_id` set to the returned `id`. To
reference inline in body markdown, use the returned `url` as
`![alt](url "caption")`.

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

Tags are short, lowercase, single-word where possible. The current set:

- **trueborn** — the novel; drafts, fragments, scenes, related notes
- **work** — code projects, post-mortems, technical writing
- **opinion** — strong views, weak ties
- **curiosities** — found things, rabbit holes, no useful heading
- **writing** — essays not specific to Trueborn
- **abandoned** — projects that didn't ship; goes well with `work`

A post can have multiple tags. The first tag in the list is the primary
classification (renders as a filled red pill); the rest are
outline-styled. Never tag with more than three. If unsure, suggest two or
three and ask the user to pick.

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
