// Query helpers for D1. Pass `db: D1Database` directly so this module
// has no dependency on the apps/site Env shape.

import type {
  Author,
  Image,
  ImageSourceType,
  ListPostsFilter,
  Post,
  PostStatus,
  PostWithRelations,
  Revision,
} from './types';

type DB = D1Database;

// ─── Posts (read) ────────────────────────────────────────────────────

export async function getPostBySlug(
  db: DB,
  slug: string,
  options: { includeDrafts?: boolean } = {}
): Promise<PostWithRelations | null> {
  const statusFilter = options.includeDrafts ? '' : `AND p.status = 'published'`;
  const row = await db
    .prepare(
      `SELECT p.*, a.name AS author_name
         FROM posts p
         JOIN authors a ON a.id = p.author_id
        WHERE p.slug = ? ${statusFilter}
        LIMIT 1`
    )
    .bind(slug)
    .first<PostRow>();
  if (!row) return null;
  const all = await loadRelationsBatch(db, [row]);
  return all[0] ?? null;
}

export async function getPostById(
  db: DB,
  id: string,
  options: { includeDrafts?: boolean } = {}
): Promise<PostWithRelations | null> {
  const statusFilter = options.includeDrafts ? '' : `AND p.status = 'published'`;
  const row = await db
    .prepare(
      `SELECT p.*, a.name AS author_name
         FROM posts p
         JOIN authors a ON a.id = p.author_id
        WHERE p.id = ? ${statusFilter}
        LIMIT 1`
    )
    .bind(id)
    .first<PostRow>();
  if (!row) return null;
  const all = await loadRelationsBatch(db, [row]);
  return all[0] ?? null;
}

export async function listPosts(
  db: DB,
  filter: ListPostsFilter = {}
): Promise<PostWithRelations[]> {
  const wheres: string[] = [];
  const binds: unknown[] = [];

  if (filter.status) {
    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
    wheres.push(`p.status IN (${statuses.map(() => '?').join(',')})`);
    binds.push(...statuses);
  } else {
    wheres.push(`p.status = 'published'`);
  }

  if (filter.author_id) {
    wheres.push('p.author_id = ?');
    binds.push(filter.author_id);
  }

  let tagJoin = '';
  if (filter.tag) {
    tagJoin = 'JOIN post_tags pt ON pt.post_id = p.id';
    wheres.push('pt.tag_name = ?');
    binds.push(filter.tag);
  }

  const where = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';
  const limit = Math.max(1, Math.min(filter.limit ?? 50, 100));
  const offset = Math.max(0, filter.offset ?? 0);

  const sql = `
    SELECT p.*, a.name AS author_name
      FROM posts p
      JOIN authors a ON a.id = p.author_id
      ${tagJoin}
      ${where}
     ORDER BY COALESCE(p.published_at, p.created_at) DESC
     LIMIT ? OFFSET ?`;

  const { results } = await db
    .prepare(sql)
    .bind(...binds, limit, offset)
    .all<PostRow>();

  return loadRelationsBatch(db, results);
}

// ─── Posts (write) ───────────────────────────────────────────────────

export interface CreatePostInput {
  id: string;
  slug: string;
  title: string;
  body: string;
  excerpt?: string | null;
  status?: PostStatus;
  author_id?: string;
  tags?: string[];
  featured_image_id?: string | null;
}

export async function createPost(db: DB, input: CreatePostInput): Promise<void> {
  const status = input.status ?? 'draft';
  const publishedAt = status === 'published' ? Math.floor(Date.now() / 1000) : null;

  const stmts = [
    db
      .prepare(
        `INSERT INTO posts
           (id, author_id, slug, title, body, excerpt, status, featured_image_id, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        input.id,
        input.author_id ?? 'olemak',
        input.slug,
        input.title,
        input.body,
        input.excerpt ?? null,
        status,
        input.featured_image_id ?? null,
        publishedAt
      ),
  ];

  if (input.tags?.length) {
    for (const tag of input.tags) {
      stmts.push(db.prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`).bind(tag));
      stmts.push(
        db
          .prepare(`INSERT INTO post_tags (post_id, tag_name) VALUES (?, ?)`)
          .bind(input.id, tag)
      );
    }
  }

  // First revision: snapshot of the just-inserted state.
  stmts.push(
    db
      .prepare(`INSERT INTO revisions (post_id, title, body, message) VALUES (?, ?, ?, ?)`)
      .bind(input.id, input.title, input.body, 'Initial draft')
  );

  await db.batch(stmts);
}

export interface UpdatePostInput {
  slug?: string;
  title?: string;
  body?: string;
  excerpt?: string | null;
  status?: PostStatus;
  featured_image_id?: string | null;
  tags?: string[];
}

export async function updatePost(
  db: DB,
  id: string,
  input: UpdatePostInput,
  revisionMessage?: string | null
): Promise<void> {
  const set: string[] = [];
  const binds: unknown[] = [];
  for (const field of ['slug', 'title', 'body', 'excerpt', 'status', 'featured_image_id'] as const) {
    if (input[field] !== undefined) {
      set.push(`${field} = ?`);
      binds.push(input[field]);
    }
  }
  if (input.status === 'published') {
    set.push(`published_at = COALESCE(published_at, unixepoch())`);
  }
  if (set.length === 0 && input.tags === undefined) return;

  const stmts: D1PreparedStatement[] = [];

  if (set.length) {
    stmts.push(
      db.prepare(`UPDATE posts SET ${set.join(', ')} WHERE id = ?`).bind(...binds, id)
    );
  }

  if (input.tags !== undefined) {
    stmts.push(db.prepare(`DELETE FROM post_tags WHERE post_id = ?`).bind(id));
    for (const tag of input.tags) {
      stmts.push(db.prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`).bind(tag));
      stmts.push(
        db.prepare(`INSERT INTO post_tags (post_id, tag_name) VALUES (?, ?)`).bind(id, tag)
      );
    }
  }

  // Append a revision when title or body changed.
  if (input.title !== undefined || input.body !== undefined) {
    const current = await db
      .prepare(`SELECT title, body FROM posts WHERE id = ?`)
      .bind(id)
      .first<{ title: string; body: string }>();
    if (current) {
      stmts.push(
        db
          .prepare(`INSERT INTO revisions (post_id, title, body, message) VALUES (?, ?, ?, ?)`)
          .bind(
            id,
            input.title ?? current.title,
            input.body ?? current.body,
            revisionMessage ?? null
          )
      );
    }
  }

  if (stmts.length) await db.batch(stmts);
}

export async function deletePost(db: DB, id: string): Promise<void> {
  await db.prepare(`DELETE FROM posts WHERE id = ?`).bind(id).run();
}

// ─── Tags ────────────────────────────────────────────────────────────

export async function listAllTags(
  db: DB,
  options: { onlyPublished?: boolean } = {}
): Promise<{ name: string; count: number }[]> {
  const sql = options.onlyPublished
    ? `SELECT t.name, COUNT(pt.post_id) AS count
         FROM tags t
         JOIN post_tags pt ON pt.tag_name = t.name
         JOIN posts p      ON p.id = pt.post_id AND p.status = 'published'
        GROUP BY t.name
        ORDER BY count DESC, t.name ASC`
    : `SELECT t.name, COUNT(pt.post_id) AS count
         FROM tags t
         LEFT JOIN post_tags pt ON pt.tag_name = t.name
        GROUP BY t.name
        ORDER BY count DESC, t.name ASC`;
  const { results } = await db.prepare(sql).all<{ name: string; count: number }>();
  return results;
}

// ─── Revisions ───────────────────────────────────────────────────────

export async function listRevisions(
  db: DB,
  postId: string,
  limit = 50
): Promise<Revision[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM revisions WHERE post_id = ? ORDER BY saved_at DESC LIMIT ?`
    )
    .bind(postId, Math.min(Math.max(1, limit), 200))
    .all<Revision>();
  return results;
}

export async function getRevision(db: DB, id: number): Promise<Revision | null> {
  return db.prepare(`SELECT * FROM revisions WHERE id = ?`).bind(id).first<Revision>();
}

// ─── Authors ─────────────────────────────────────────────────────────

export async function getAuthor(db: DB, id: string): Promise<Author | null> {
  return db.prepare(`SELECT * FROM authors WHERE id = ?`).bind(id).first<Author>();
}

export async function getAuthorBySubdomain(
  db: DB,
  subdomain: string
): Promise<Author | null> {
  return db
    .prepare(`SELECT * FROM authors WHERE subdomain = ?`)
    .bind(subdomain)
    .first<Author>();
}

// ─── Images ──────────────────────────────────────────────────────────

export interface CreateImageInput {
  id: string;
  filename: string;
  r2_key: string;
  alt?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  bytes?: number | null;
  source_type?: ImageSourceType | null;
}

export async function createImage(db: DB, input: CreateImageInput): Promise<void> {
  await db
    .prepare(
      `INSERT INTO images
         (id, filename, r2_key, alt, caption, width, height, bytes, source_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.id,
      input.filename,
      input.r2_key,
      input.alt ?? null,
      input.caption ?? null,
      input.width ?? null,
      input.height ?? null,
      input.bytes ?? null,
      input.source_type ?? null
    )
    .run();
}

export async function getImage(db: DB, id: string): Promise<Image | null> {
  return db.prepare(`SELECT * FROM images WHERE id = ?`).bind(id).first<Image>();
}

export async function listImages(
  db: DB,
  options: { limit?: number; offset?: number } = {}
): Promise<Image[]> {
  const limit = Math.min(Math.max(1, options.limit ?? 200), 500);
  const offset = Math.max(0, options.offset ?? 0);
  const { results } = await db
    .prepare(`SELECT * FROM images ORDER BY uploaded_at DESC LIMIT ? OFFSET ?`)
    .bind(limit, offset)
    .all<Image>();
  return results;
}

export async function deleteImage(db: DB, id: string): Promise<void> {
  await db.prepare(`DELETE FROM images WHERE id = ?`).bind(id).run();
}

// ─── Internal helpers ────────────────────────────────────────────────

interface PostRow extends Post {
  author_name: string;
}

async function loadRelationsBatch(
  db: DB,
  rows: PostRow[]
): Promise<PostWithRelations[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(',');

  const tagsResult = await db
    .prepare(
      `SELECT post_id, tag_name FROM post_tags WHERE post_id IN (${placeholders})`
    )
    .bind(...ids)
    .all<{ post_id: string; tag_name: string }>();

  const tagsByPost = new Map<string, string[]>();
  for (const row of tagsResult.results) {
    const list = tagsByPost.get(row.post_id) ?? [];
    list.push(row.tag_name);
    tagsByPost.set(row.post_id, list);
  }

  const imageIds = rows
    .map((r) => r.featured_image_id)
    .filter((id): id is string => Boolean(id));
  let imagesById = new Map<string, Image>();
  if (imageIds.length) {
    const imgPlaceholders = imageIds.map(() => '?').join(',');
    const imgResult = await db
      .prepare(`SELECT * FROM images WHERE id IN (${imgPlaceholders})`)
      .bind(...imageIds)
      .all<Image>();
    imagesById = new Map(imgResult.results.map((img) => [img.id, img]));
  }

  return rows.map((row) => ({
    id: row.id,
    author_id: row.author_id,
    slug: row.slug,
    title: row.title,
    body: row.body,
    excerpt: row.excerpt,
    status: row.status,
    featured_image_id: row.featured_image_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    published_at: row.published_at,
    tags: tagsByPost.get(row.id) ?? [],
    featured_image: row.featured_image_id
      ? imagesById.get(row.featured_image_id) ?? null
      : null,
    author: { id: row.author_id, name: row.author_name },
  }));
}
