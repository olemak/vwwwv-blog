-- 0001_initial.sql — initial schema for vwwwv-blog
-- Posts, revisions, tags, images, authors. Triggers for updated_at.
-- See docs/architecture.md for the rationale behind each shape.

PRAGMA foreign_keys = ON;

-- ─────────────────────────────────────────────────────────────────────
-- Authors. One row at first; the table exists so multi-tenant routing
-- (atle.vwwwv.org, etc.) is an INSERT plus subdomain config later, not
-- a schema rewrite.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS authors (
  id          TEXT PRIMARY KEY,                           -- short stable id, e.g. 'olemak'
  name        TEXT NOT NULL,
  subdomain   TEXT UNIQUE,                                -- nullable; populated when assigned
  bio         TEXT,                                       -- short bio for the about page
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- ─────────────────────────────────────────────────────────────────────
-- Images. Standalone table so a Krampuskarte can be reused across posts
-- (post_id nullable). Tracked with metadata so the publish skill can
-- choose appropriate sizes and source-type-specific treatments.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS images (
  id           TEXT PRIMARY KEY,                          -- ULID
  post_id      TEXT REFERENCES posts(id) ON DELETE SET NULL,
  filename     TEXT NOT NULL,
  r2_key       TEXT NOT NULL UNIQUE,                      -- 'posts/<slug>/<filename>.webp'
  alt          TEXT,
  caption      TEXT,
  width        INTEGER,
  height       INTEGER,
  bytes        INTEGER,
  source_type  TEXT
               CHECK (source_type IN ('upload','ai-generated','vintage','screenshot')),
  uploaded_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_images_post_id ON images(post_id);

-- ─────────────────────────────────────────────────────────────────────
-- Posts. status column carries draft/published/archived state — drafts
-- are state, not files. featured_image_id is nullable so a post may
-- have body images without an above-the-fold treatment.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id                 TEXT PRIMARY KEY,                                       -- ULID
  author_id          TEXT NOT NULL DEFAULT 'olemak'
                     REFERENCES authors(id) ON DELETE RESTRICT,
  slug               TEXT UNIQUE NOT NULL,                                   -- URL slug
  title              TEXT NOT NULL,
  body               TEXT NOT NULL,                                          -- markdown source
  excerpt            TEXT,                                                   -- optional manual excerpt
  status             TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','published','archived')),
  featured_image_id  TEXT REFERENCES images(id) ON DELETE SET NULL,
  created_at         INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at         INTEGER NOT NULL DEFAULT (unixepoch()),
  published_at       INTEGER                                                 -- nullable, set on first publish
);

CREATE INDEX IF NOT EXISTS idx_posts_status_published
  ON posts(status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_author_status
  ON posts(author_id, status);

-- updated_at maintains itself on any meaningful UPDATE.
-- (The trigger inspects specific columns to avoid re-triggering itself.)
CREATE TRIGGER IF NOT EXISTS posts_updated_at
AFTER UPDATE OF title, body, excerpt, status, featured_image_id, slug, author_id
ON posts
FOR EACH ROW
BEGIN
  UPDATE posts SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- ─────────────────────────────────────────────────────────────────────
-- Tags. Many-to-many through post_tags. Tag name is the primary key —
-- tags are unique strings, no surrogate id needed.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  name TEXT PRIMARY KEY                                  -- 'writing', 'work', 'trueborn', etc.
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id   TEXT NOT NULL REFERENCES posts(id)  ON DELETE CASCADE,
  tag_name  TEXT NOT NULL REFERENCES tags(name) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_name)
);

CREATE INDEX IF NOT EXISTS idx_post_tags_tag_name ON post_tags(tag_name);

-- ─────────────────────────────────────────────────────────────────────
-- Revisions. Append-only history. Title and body snapshotted so title
-- edits are captured. message is an optional commit-style note (the
-- publish skill writes one when saving).
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revisions (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id   TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  title     TEXT NOT NULL,
  body      TEXT NOT NULL,
  saved_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  message   TEXT
);

CREATE INDEX IF NOT EXISTS idx_revisions_post_saved
  ON revisions(post_id, saved_at DESC);

-- ─────────────────────────────────────────────────────────────────────
-- Seed: the default author. INSERT OR IGNORE so re-running the migration
-- against an already-seeded DB is a no-op.
-- ─────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO authors (id, name, bio) VALUES (
  'olemak',
  'Ole Martin',
  'Code, fiction, and curiosities. Writes a novel called Trueborn alongside the occasional alpine-botany rabbit hole.'
);
