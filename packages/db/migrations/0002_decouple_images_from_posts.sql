-- 0002_decouple_images_from_posts.sql
--
-- Images are standalone assets. Posts reference them — as featured
-- (via posts.featured_image_id) or inline (via markdown body URLs) —
-- but images don't reference posts. Modelling it the other way locked
-- a single image to a single post and prevented reuse, which is wrong.

DROP INDEX IF EXISTS idx_images_post_id;

ALTER TABLE images DROP COLUMN post_id;
