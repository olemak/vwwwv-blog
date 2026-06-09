-- 0003_add_image_triggers.sql
--
-- Add a `triggers` column to the images table — a comma-separated list of
-- content categories the image trips, used by the render layer to gate the
-- image behind a per-image opt-in (and/or category-level opt-in via the
-- consent panel).
--
-- Categories are open-ended strings. Today the site handles 'slop' (AI-
-- generated imagery) and 'spider' (arachnid photographs); the column is
-- TEXT rather than an enum so adding new categories later is a render-
-- layer change, not a database migration.
--
-- Backfill: every existing image with source_type='ai-generated' is
-- pre-tagged 'slop'. Other source_types get NULL (no triggers).
-- source_type stays — it carries provenance metadata orthogonal to
-- consent gating (and powers the screenshot desaturation filter).

ALTER TABLE images ADD COLUMN triggers TEXT;

UPDATE images
   SET triggers = 'slop'
 WHERE source_type = 'ai-generated';
