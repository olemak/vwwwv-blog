-- seed.sql — sample content so the design has something to render on first
-- deploy. Run AFTER the initial migration:
--
--   wrangler d1 execute vwwwv-blog-content --remote \
--     --file=../packages/db/migrations/0001_initial.sql
--   wrangler d1 execute vwwwv-blog-content --remote \
--     --file=./scripts/seed.sql
--
-- Seed IDs are prefixed `01JSEED` so they're easy to clean up:
--   wrangler d1 execute vwwwv-blog-content --remote \
--     --command="DELETE FROM posts WHERE id LIKE '01JSEED%'"

INSERT OR IGNORE INTO tags (name) VALUES
  ('work'), ('opinion'), ('writing'), ('trueborn'),
  ('curiosities'), ('abandoned'), ('botany');

-- ─── Lighthouse 100 ─────────────────────────────────────────────────
INSERT INTO posts
  (id, slug, title, body, status, published_at, created_at, updated_at)
VALUES (
  '01JSEEDLIGHTHOUSE000000000',
  'lighthouse-100-personality-disorder',
  'Lighthouse 100 is a personality disorder',
  'I have shipped, by my own count, four production sites with all four Lighthouse audit scores above ninety-nine. I am not proud of this. Each one cost me at least a day I will not get back, on something the user could not perceive.

There is a normal version of caring about performance. It looks like: serve the right thing, cache the right thing, don''t ship a megabyte of bundled abstraction for a contact form. There is a second version that lives in a different building. It looks like: spend an afternoon eliminating the last two CSS rules so the unused-rules audit clears, then realize the audit was scoring a sibling page that no human will ever load.

I built this site to test whether I could do the second version on purpose, with full self-awareness, and call it a feature instead of a tic. The answer is yes, but only barely, and only because the budget I set is *visible to readers*. The colophon says fourteen kilobytes. The bytes are the brand.

I am not recommending this. I am admitting it.

The honest test for performance work is: can you describe, in one sentence, the user behavior that gets better? "First-byte under thirty milliseconds so the back button feels native" is a sentence. "Lighthouse score went from 98 to 100" is not.',
  'published',
  1745596800, 1745596800, 1745596800
);

-- ─── mailto:// ──────────────────────────────────────────────────────
INSERT INTO posts
  (id, slug, title, body, status, published_at, created_at, updated_at)
VALUES (
  '01JSEEDMAILTO0000000000000',
  'mailto-webmail-no-servers',
  'mailto://, a webmail client with no servers',
  'I spent two weekends building an email client that ran entirely from a `mailto:` link and the user''s native mail handler. It worked. Nobody wanted it.

The pitch: every contact form on the web should be a `mailto:` link with the body pre-filled. No backend, no rate-limiting, no spam filters needed because the spammer has to open Mail.app to send it. The web was already this, in 1997, and we forgot.

I built a generator. Paste any HTML form, get back a `mailto:` with the field values templated in. It worked beautifully on iOS, badly on Android, and not at all on machines where the user had never configured a default mail client — which turned out to be most machines.

That last fact ended the project. You cannot ship a webmail client whose dependency is "the user has, at some point in the last decade, set up email on their computer." That is a 1990s assumption.

I am leaving the repo up. It still works for me. That is enough.',
  'published',
  1745164800, 1745164800, 1745164800
);

-- ─── Alpine botany rabbithole ───────────────────────────────────────
INSERT INTO posts
  (id, slug, title, body, status, published_at, created_at, updated_at)
VALUES (
  '01JSEEDALPINE0000000000000',
  'alpine-botany-rabbithole',
  'A short rabbithole into alpine botany',
  'There is a particular yellow on the *Saxifraga oppositifolia* of the eastern Bernese Oberland that I now believe explains the way I painted skies in 1997. Bear with me.

The plant is a cushion-former, six to eight centimetres tall, growing on dolomitic scree at altitudes where weather is not a season but a daily event. The flowers are usually written down as "purple" — they are, mostly — but the throat of the flower carries a yellow that has no equivalent on a screen, and which I am told is structural rather than pigmented. The light scatters off chitin-like crystals at angles you can''t paint, only reproduce.

I painted skies the year I was nineteen, in oil, in a cellar in Bern with one window. The skies were yellow on the bottom and purple on top and I was told repeatedly, by people whose paintings I respected, that this was not what skies looked like. They were correct. They were also describing a different distribution of pigment.

The yellow at the bottom of those skies is the yellow at the bottom of *Saxifraga oppositifolia*. I had not seen the plant yet. I think I was painting it from memory, in the way that you sometimes paint a face from memory before you have met it.

That is all. There is no further conclusion. Some rabbit holes do not close into anything; they just lead somewhere quieter.',
  'published',
  1745942400, 1745942400, 1745942400
);

-- ─── Drafts as state ────────────────────────────────────────────────
INSERT INTO posts
  (id, slug, title, body, status, published_at, created_at, updated_at)
VALUES (
  '01JSEEDDRAFTS0000000000000',
  'drafts-as-state-not-files',
  'The case for treating drafts as state, not files',
  'I built a CMS this weekend in which the editor is a chat window and the publish action is a tool call. There is no editor. There is no draft folder. There is, instead, a row in a database with a status column, and a conversation that knows how to read and write that row.

The architecture follows from a simple observation: I had been using Claude as my drafting tool for six months. Every "blog post I should write" was already a conversation. The only step I never finished was the part where I copy-pasted to a markdown file, committed it, and pushed.

So I removed that step. Here''s what fell out.

## Drafts stop being files

When the source of truth is a database row with `status = ''draft''`, you don''t have to decide where the file lives, what its filename should be, whether the slug is final, what branch it''s on, or whether your laptop or your phone has the latest copy. The row knows. The row is the same row regardless of which device you opened the conversation from.

## The "publish" affordance becomes a button

In a chat surface, "publish" is a one-tap prompt suggestion that fires an authenticated request to a Worker. The Worker writes to the database and the next request to the homepage sees the post. End-to-end propagation: thirty seconds, mostly DNS.

## What you give up

A code-based escape hatch, mostly. If you want to publish a post by writing a markdown file in your editor and pushing, you have to build that path separately — a CLI that hits the same Worker endpoint. I haven''t yet. It''s on the list.

## What you don''t give up

Git. The site code is still in git. Backups, history, branches — all the normal version-control affordances continue to apply to the *system*. The *content* is in a database, where revisions are first-class rows and the publish-state is a column that can be flipped without a deploy.

This is not for everyone. If you like writing in your editor, keep writing in your editor; that workflow has been good for thirty years and will continue to be. But I''ve been writing fewer blog posts every year, and the bottleneck was always the saving and committing. Removing it has moved the number from zero to nonzero, which is a much larger improvement than people give it credit for.',
  'published',
  1746028800, 1746028800, 1746028800
);

-- ─── Trueborn fragment (kept as DRAFT to demo the draft state) ──────
INSERT INTO posts
  (id, slug, title, body, status, created_at, updated_at)
VALUES (
  '01JSEEDTRUEBORN00000000000',
  'trueborn-cartographer-refused-north',
  'The cartographer who refused north',
  '*Draft fragment, ch. 7. Cut from the chapter where Mira meets her mother, then re-instated, then cut again.*

He had been told, in the second hour of his apprenticeship, that north was a convention. Not a fact about the world but a fact about the maps people kept agreeing to make of it. The needle on his uncle''s compass pointed at a different north, the one the Earth''s iron core argued for, and that one drifted; the maps had to be redrawn every century or so or else they began to lie. The third north, which he encountered later and which his uncle did not respect, was the north of the surveyors — a fictive, gridded north that ran parallel to no axis the planet had ever offered. The surveyors found it convenient and the rest of them lived with it.

Mira had walked into the workshop without knocking. She had a coastline in her hand, drawn in pencil on the back of a feed receipt, and she set it down on the bench between his uncle''s coffee cup and the unfinished map of the Carcine Reach. The coastline did not match the survey. The cartographer, who had spent his apprenticeship learning to make the survey land on the page, said so. Mira looked at him for a long moment and said, "That''s the point."',
  'draft',
  1746115200, 1746115200
);

-- ─── Tags ───────────────────────────────────────────────────────────
INSERT INTO post_tags (post_id, tag_name) VALUES
  ('01JSEEDLIGHTHOUSE000000000', 'opinion'),
  ('01JSEEDLIGHTHOUSE000000000', 'work'),
  ('01JSEEDMAILTO0000000000000', 'work'),
  ('01JSEEDMAILTO0000000000000', 'abandoned'),
  ('01JSEEDALPINE0000000000000', 'curiosities'),
  ('01JSEEDALPINE0000000000000', 'writing'),
  ('01JSEEDDRAFTS0000000000000', 'opinion'),
  ('01JSEEDDRAFTS0000000000000', 'work'),
  ('01JSEEDTRUEBORN00000000000', 'trueborn'),
  ('01JSEEDTRUEBORN00000000000', 'writing');
