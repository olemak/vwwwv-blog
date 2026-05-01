var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../packages/db/src/queries.ts
var queries_exports = {};
__export(queries_exports, {
  createImage: () => createImage,
  createPost: () => createPost,
  deleteImage: () => deleteImage,
  deletePost: () => deletePost,
  getAuthor: () => getAuthor,
  getAuthorBySubdomain: () => getAuthorBySubdomain,
  getImage: () => getImage,
  getPostById: () => getPostById,
  getPostBySlug: () => getPostBySlug,
  getRevision: () => getRevision,
  listAllTags: () => listAllTags,
  listImages: () => listImages,
  listPosts: () => listPosts,
  listRevisions: () => listRevisions,
  updatePost: () => updatePost
});
async function getPostBySlug(db, slug, options2 = {}) {
  const statusFilter = options2.includeDrafts ? "" : `AND p.status = 'published'`;
  const row = await db.prepare(
    `SELECT p.*, a.name AS author_name
         FROM posts p
         JOIN authors a ON a.id = p.author_id
        WHERE p.slug = ? ${statusFilter}
        LIMIT 1`
  ).bind(slug).first();
  if (!row) return null;
  const all = await loadRelationsBatch(db, [row]);
  return all[0] ?? null;
}
__name(getPostBySlug, "getPostBySlug");
async function getPostById(db, id, options2 = {}) {
  const statusFilter = options2.includeDrafts ? "" : `AND p.status = 'published'`;
  const row = await db.prepare(
    `SELECT p.*, a.name AS author_name
         FROM posts p
         JOIN authors a ON a.id = p.author_id
        WHERE p.id = ? ${statusFilter}
        LIMIT 1`
  ).bind(id).first();
  if (!row) return null;
  const all = await loadRelationsBatch(db, [row]);
  return all[0] ?? null;
}
__name(getPostById, "getPostById");
async function listPosts(db, filter = {}) {
  const wheres = [];
  const binds = [];
  if (filter.status) {
    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
    wheres.push(`p.status IN (${statuses.map(() => "?").join(",")})`);
    binds.push(...statuses);
  } else {
    wheres.push(`p.status = 'published'`);
  }
  if (filter.author_id) {
    wheres.push("p.author_id = ?");
    binds.push(filter.author_id);
  }
  let tagJoin = "";
  if (filter.tag) {
    tagJoin = "JOIN post_tags pt ON pt.post_id = p.id";
    wheres.push("pt.tag_name = ?");
    binds.push(filter.tag);
  }
  const where = wheres.length ? `WHERE ${wheres.join(" AND ")}` : "";
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
  const { results } = await db.prepare(sql).bind(...binds, limit, offset).all();
  return loadRelationsBatch(db, results);
}
__name(listPosts, "listPosts");
async function createPost(db, input) {
  const status = input.status ?? "draft";
  const publishedAt = status === "published" ? Math.floor(Date.now() / 1e3) : null;
  const stmts = [
    db.prepare(
      `INSERT INTO posts
           (id, author_id, slug, title, body, excerpt, status, featured_image_id, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      input.id,
      input.author_id ?? "olemak",
      input.slug,
      input.title,
      input.body,
      input.excerpt ?? null,
      status,
      input.featured_image_id ?? null,
      publishedAt
    )
  ];
  if (input.tags?.length) {
    for (const tag2 of input.tags) {
      stmts.push(db.prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`).bind(tag2));
      stmts.push(
        db.prepare(`INSERT INTO post_tags (post_id, tag_name) VALUES (?, ?)`).bind(input.id, tag2)
      );
    }
  }
  stmts.push(
    db.prepare(`INSERT INTO revisions (post_id, title, body, message) VALUES (?, ?, ?, ?)`).bind(input.id, input.title, input.body, "Initial draft")
  );
  await db.batch(stmts);
}
__name(createPost, "createPost");
async function updatePost(db, id, input, revisionMessage) {
  const set = [];
  const binds = [];
  for (const field of ["slug", "title", "body", "excerpt", "status", "featured_image_id"]) {
    if (input[field] !== void 0) {
      set.push(`${field} = ?`);
      binds.push(input[field]);
    }
  }
  if (input.status === "published") {
    set.push(`published_at = COALESCE(published_at, unixepoch())`);
  }
  if (set.length === 0 && input.tags === void 0) return;
  const stmts = [];
  if (set.length) {
    stmts.push(
      db.prepare(`UPDATE posts SET ${set.join(", ")} WHERE id = ?`).bind(...binds, id)
    );
  }
  if (input.tags !== void 0) {
    stmts.push(db.prepare(`DELETE FROM post_tags WHERE post_id = ?`).bind(id));
    for (const tag2 of input.tags) {
      stmts.push(db.prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`).bind(tag2));
      stmts.push(
        db.prepare(`INSERT INTO post_tags (post_id, tag_name) VALUES (?, ?)`).bind(id, tag2)
      );
    }
  }
  if (input.title !== void 0 || input.body !== void 0) {
    const current = await db.prepare(`SELECT title, body FROM posts WHERE id = ?`).bind(id).first();
    if (current) {
      stmts.push(
        db.prepare(`INSERT INTO revisions (post_id, title, body, message) VALUES (?, ?, ?, ?)`).bind(
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
__name(updatePost, "updatePost");
async function deletePost(db, id) {
  await db.prepare(`DELETE FROM posts WHERE id = ?`).bind(id).run();
}
__name(deletePost, "deletePost");
async function listAllTags(db, options2 = {}) {
  const sql = options2.onlyPublished ? `SELECT t.name, COUNT(pt.post_id) AS count
         FROM tags t
         JOIN post_tags pt ON pt.tag_name = t.name
         JOIN posts p      ON p.id = pt.post_id AND p.status = 'published'
        GROUP BY t.name
        ORDER BY count DESC, t.name ASC` : `SELECT t.name, COUNT(pt.post_id) AS count
         FROM tags t
         LEFT JOIN post_tags pt ON pt.tag_name = t.name
        GROUP BY t.name
        ORDER BY count DESC, t.name ASC`;
  const { results } = await db.prepare(sql).all();
  return results;
}
__name(listAllTags, "listAllTags");
async function listRevisions(db, postId, limit = 50) {
  const { results } = await db.prepare(
    `SELECT * FROM revisions WHERE post_id = ? ORDER BY saved_at DESC LIMIT ?`
  ).bind(postId, Math.min(Math.max(1, limit), 200)).all();
  return results;
}
__name(listRevisions, "listRevisions");
async function getRevision(db, id) {
  return db.prepare(`SELECT * FROM revisions WHERE id = ?`).bind(id).first();
}
__name(getRevision, "getRevision");
async function getAuthor(db, id) {
  return db.prepare(`SELECT * FROM authors WHERE id = ?`).bind(id).first();
}
__name(getAuthor, "getAuthor");
async function getAuthorBySubdomain(db, subdomain) {
  return db.prepare(`SELECT * FROM authors WHERE subdomain = ?`).bind(subdomain).first();
}
__name(getAuthorBySubdomain, "getAuthorBySubdomain");
async function createImage(db, input) {
  await db.prepare(
    `INSERT INTO images
         (id, post_id, filename, r2_key, alt, caption, width, height, bytes, source_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    input.id,
    input.post_id ?? null,
    input.filename,
    input.r2_key,
    input.alt ?? null,
    input.caption ?? null,
    input.width ?? null,
    input.height ?? null,
    input.bytes ?? null,
    input.source_type ?? null
  ).run();
}
__name(createImage, "createImage");
async function getImage(db, id) {
  return db.prepare(`SELECT * FROM images WHERE id = ?`).bind(id).first();
}
__name(getImage, "getImage");
async function listImages(db, postId) {
  if (postId === null) {
    const { results: results2 } = await db.prepare(`SELECT * FROM images WHERE post_id IS NULL ORDER BY uploaded_at DESC`).all();
    return results2;
  }
  if (postId !== void 0) {
    const { results: results2 } = await db.prepare(`SELECT * FROM images WHERE post_id = ? ORDER BY uploaded_at DESC`).bind(postId).all();
    return results2;
  }
  const { results } = await db.prepare(`SELECT * FROM images ORDER BY uploaded_at DESC LIMIT 200`).all();
  return results;
}
__name(listImages, "listImages");
async function deleteImage(db, id) {
  await db.prepare(`DELETE FROM images WHERE id = ?`).bind(id).run();
}
__name(deleteImage, "deleteImage");
async function loadRelationsBatch(db, rows) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(",");
  const tagsResult = await db.prepare(
    `SELECT post_id, tag_name FROM post_tags WHERE post_id IN (${placeholders})`
  ).bind(...ids).all();
  const tagsByPost = /* @__PURE__ */ new Map();
  for (const row of tagsResult.results) {
    const list2 = tagsByPost.get(row.post_id) ?? [];
    list2.push(row.tag_name);
    tagsByPost.set(row.post_id, list2);
  }
  const imageIds = rows.map((r) => r.featured_image_id).filter((id) => Boolean(id));
  let imagesById = /* @__PURE__ */ new Map();
  if (imageIds.length) {
    const imgPlaceholders = imageIds.map(() => "?").join(",");
    const imgResult = await db.prepare(`SELECT * FROM images WHERE id IN (${imgPlaceholders})`).bind(...imageIds).all();
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
    featured_image: row.featured_image_id ? imagesById.get(row.featured_image_id) ?? null : null,
    author: { id: row.author_id, name: row.author_name }
  }));
}
__name(loadRelationsBatch, "loadRelationsBatch");

// ../../packages/db/src/ulid.ts
var ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function ulid(timestamp = Date.now()) {
  let time = "";
  let t = timestamp;
  for (let i = 9; i >= 0; i--) {
    time = ALPHABET.charAt(t % 32) + time;
    t = Math.floor(t / 32);
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let rand = "";
  for (let i = 0; i < 16; i++) {
    const b = bytes[i] ?? 0;
    rand += ALPHABET.charAt(b & 31);
  }
  return time + rand;
}
__name(ulid, "ulid");
function slugify(input) {
  return input.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
__name(slugify, "slugify");

// ../../packages/flags/src/cookie.ts
var COOKIE_NAME = "vw_flag_preview";
async function parseOverrides(request, secret) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const cookies = parseCookies(cookieHeader);
  const value = cookies[COOKIE_NAME];
  if (!value) return null;
  const dot = value.indexOf(".");
  if (dot < 0) return null;
  const payloadEncoded = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  if (!await verify(payloadEncoded, signature, secret)) return null;
  try {
    const decoded = new TextDecoder().decode(fromBase64url(payloadEncoded));
    const parsed = JSON.parse(decoded);
    if (parsed.expires < Math.floor(Date.now() / 1e3)) return null;
    return new Map(Object.entries(parsed.overrides));
  } catch {
    return null;
  }
}
__name(parseOverrides, "parseOverrides");
async function buildOverrideCookie(overrides, secret, ttlSeconds = 60 * 60 * 24 * 7) {
  const payload = {
    overrides,
    expires: Math.floor(Date.now() / 1e3) + ttlSeconds
  };
  const encoded = toBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await sign(encoded, secret);
  return [
    `${COOKIE_NAME}=${encoded}.${sig}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${ttlSeconds}`
  ].join("; ");
}
__name(buildOverrideCookie, "buildOverrideCookie");
function clearOverrideCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
__name(clearOverrideCookie, "clearOverrideCookie");
async function sign(payload, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return toBase64url(new Uint8Array(signature));
}
__name(sign, "sign");
async function verify(payload, signature, secret) {
  const expected = await sign(payload, secret);
  return safeEqual(expected, signature);
}
__name(verify, "verify");
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) {
    r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return r === 0;
}
__name(safeEqual, "safeEqual");
function toBase64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(toBase64url, "toBase64url");
function fromBase64url(s) {
  const padding = (4 - s.length % 4) % 4;
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padding);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
__name(fromBase64url, "fromBase64url");
function parseCookies(header) {
  const out = {};
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}
__name(parseCookies, "parseCookies");

// ../../packages/flags/src/admin.ts
async function handleAdminFlags(ctx) {
  const { flags, request, url, cookieSecret } = ctx;
  if (url.pathname === "/api/flags/_preview") {
    if (request.method === "POST") {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return jsonError(400, "expected JSON object of {flag: value} overrides");
      }
      const cookie = await buildOverrideCookie(body, cookieSecret);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Set-Cookie": cookie }
      });
    }
    if (request.method === "DELETE") {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": clearOverrideCookie()
        }
      });
    }
    return methodNotAllowed();
  }
  const match = url.pathname.match(/^\/api\/flags(?:\/([^/]+))?$/);
  if (!match) return new Response("Not Found", { status: 404 });
  const name = match[1];
  if (request.method === "GET" && !name) {
    const all = await flags.list();
    return Response.json(all);
  }
  if (request.method === "GET" && name) {
    const raw = await flags.getRaw(name);
    return raw ? Response.json(raw) : new Response("Not Found", { status: 404 });
  }
  if (request.method === "PUT" && name) {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.value !== "boolean" && typeof body.value !== "string" && typeof body.value !== "number") {
      return jsonError(400, "value must be boolean, string, or number");
    }
    await flags.set(name, body.value, { description: body.description });
    return new Response(null, { status: 204 });
  }
  if (request.method === "DELETE" && name) {
    await flags.delete(name);
    return new Response(null, { status: 204 });
  }
  return methodNotAllowed();
}
__name(handleAdminFlags, "handleAdminFlags");
function jsonError(status, error) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(jsonError, "jsonError");
function methodNotAllowed() {
  return new Response("Method Not Allowed", { status: 405 });
}
__name(methodNotAllowed, "methodNotAllowed");

// ../../packages/flags/src/index.ts
var Flags2 = class {
  constructor(bindings, request) {
    this.bindings = bindings;
    this.request = request;
  }
  static {
    __name(this, "Flags");
  }
  cache = /* @__PURE__ */ new Map();
  overrides = void 0;
  /**
   * Get a flag value, falling back to the default if unset.
   * Lookup order: cookie override → per-instance cache → KV.
   */
  async get(name, defaultValue) {
    if (this.overrides === void 0) {
      this.overrides = this.request ? await parseOverrides(this.request, this.bindings.FLAG_COOKIE_SECRET) : null;
    }
    if (this.overrides?.has(name)) {
      const override = this.overrides.get(name);
      if (typeof override === typeof defaultValue) {
        return override;
      }
    }
    const cached = this.cache.get(name);
    if (cached !== void 0 && typeof cached === typeof defaultValue) {
      return cached;
    }
    const raw = await this.bindings.FLAGS.get(name, "json");
    if (raw && typeof raw.value === typeof defaultValue) {
      this.cache.set(name, raw.value);
      return raw.value;
    }
    return defaultValue;
  }
  /** Fetch a flag with metadata (no cookie/cache layer). For admin reads. */
  async getRaw(name) {
    return await this.bindings.FLAGS.get(name, "json");
  }
  /** Set a flag's value. Invalidates the per-instance cache for this name. */
  async set(name, value, options2 = {}) {
    const flag = {
      value,
      type: typeof value,
      description: options2.description,
      updated_at: Math.floor(Date.now() / 1e3)
    };
    await this.bindings.FLAGS.put(name, JSON.stringify(flag));
    this.cache.delete(name);
  }
  async delete(name) {
    await this.bindings.FLAGS.delete(name);
    this.cache.delete(name);
  }
  /** Enumerate all flags (KV list + per-key get). */
  async list() {
    const list2 = await this.bindings.FLAGS.list();
    const out = {};
    await Promise.all(
      list2.keys.map(async (key) => {
        const raw = await this.bindings.FLAGS.get(key.name, "json");
        if (raw) out[key.name] = raw;
      })
    );
    return out;
  }
};

// src/flags.ts
async function loadFlags(env, request) {
  const bindings = {
    FLAGS: env.FLAGS,
    FLAG_COOKIE_SECRET: env.FLAG_COOKIE_SECRET
  };
  const flags = new Flags2(bindings, request);
  const [readingTime, wordmarkVariant] = await Promise.all([
    flags.get("reading-time", false),
    flags.get("wordmark-variant", "default")
  ]);
  return { readingTime, wordmarkVariant };
}
__name(loadFlags, "loadFlags");
function flagsFor(env, request) {
  return new Flags2(
    { FLAGS: env.FLAGS, FLAG_COOKIE_SECRET: env.FLAG_COOKIE_SECRET },
    request
  );
}
__name(flagsFor, "flagsFor");

// src/render/escape.ts
var ESCAPE_HTML = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ESCAPE_HTML[c] ?? c);
}
__name(escapeHtml, "escapeHtml");
function escapeAttr(s) {
  return escapeHtml(s);
}
__name(escapeAttr, "escapeAttr");

// src/render/date.ts
function formatDateLong(epochSeconds) {
  const d = new Date(epochSeconds * 1e3);
  const month = d.toLocaleString("en", { month: "long" }).toUpperCase();
  return `${month} ${d.getDate()}, ${d.getFullYear()}`;
}
__name(formatDateLong, "formatDateLong");
function formatEditionLine(epochSeconds) {
  const d = new Date(epochSeconds * 1e3);
  const day = d.toLocaleString("en", { weekday: "long" });
  const date = d.getDate();
  const month = d.toLocaleString("en", { month: "long" });
  const year = d.getFullYear();
  return `${day}, ${date} ${month} ${year} \xB7 vwwwv.org`;
}
__name(formatEditionLine, "formatEditionLine");

// ../../node_modules/marked/lib/marked.esm.js
function _getDefaults() {
  return {
    async: false,
    breaks: false,
    extensions: null,
    gfm: true,
    hooks: null,
    pedantic: false,
    renderer: null,
    silent: false,
    tokenizer: null,
    walkTokens: null
  };
}
__name(_getDefaults, "_getDefaults");
var _defaults = _getDefaults();
function changeDefaults(newDefaults) {
  _defaults = newDefaults;
}
__name(changeDefaults, "changeDefaults");
var escapeTest = /[&<>"']/;
var escapeReplace = new RegExp(escapeTest.source, "g");
var escapeTestNoEncode = /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/;
var escapeReplaceNoEncode = new RegExp(escapeTestNoEncode.source, "g");
var escapeReplacements = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
var getEscapeReplacement = /* @__PURE__ */ __name((ch) => escapeReplacements[ch], "getEscapeReplacement");
function escape$1(html2, encode) {
  if (encode) {
    if (escapeTest.test(html2)) {
      return html2.replace(escapeReplace, getEscapeReplacement);
    }
  } else {
    if (escapeTestNoEncode.test(html2)) {
      return html2.replace(escapeReplaceNoEncode, getEscapeReplacement);
    }
  }
  return html2;
}
__name(escape$1, "escape$1");
var caret = /(^|[^\[])\^/g;
function edit(regex, opt) {
  let source = typeof regex === "string" ? regex : regex.source;
  opt = opt || "";
  const obj = {
    replace: /* @__PURE__ */ __name((name, val) => {
      let valSource = typeof val === "string" ? val : val.source;
      valSource = valSource.replace(caret, "$1");
      source = source.replace(name, valSource);
      return obj;
    }, "replace"),
    getRegex: /* @__PURE__ */ __name(() => {
      return new RegExp(source, opt);
    }, "getRegex")
  };
  return obj;
}
__name(edit, "edit");
function cleanUrl(href) {
  try {
    href = encodeURI(href).replace(/%25/g, "%");
  } catch {
    return null;
  }
  return href;
}
__name(cleanUrl, "cleanUrl");
var noopTest = { exec: /* @__PURE__ */ __name(() => null, "exec") };
function splitCells(tableRow, count) {
  const row = tableRow.replace(/\|/g, (match, offset, str) => {
    let escaped = false;
    let curr = offset;
    while (--curr >= 0 && str[curr] === "\\")
      escaped = !escaped;
    if (escaped) {
      return "|";
    } else {
      return " |";
    }
  }), cells = row.split(/ \|/);
  let i = 0;
  if (!cells[0].trim()) {
    cells.shift();
  }
  if (cells.length > 0 && !cells[cells.length - 1].trim()) {
    cells.pop();
  }
  if (count) {
    if (cells.length > count) {
      cells.splice(count);
    } else {
      while (cells.length < count)
        cells.push("");
    }
  }
  for (; i < cells.length; i++) {
    cells[i] = cells[i].trim().replace(/\\\|/g, "|");
  }
  return cells;
}
__name(splitCells, "splitCells");
function rtrim(str, c, invert) {
  const l = str.length;
  if (l === 0) {
    return "";
  }
  let suffLen = 0;
  while (suffLen < l) {
    const currChar = str.charAt(l - suffLen - 1);
    if (currChar === c && !invert) {
      suffLen++;
    } else if (currChar !== c && invert) {
      suffLen++;
    } else {
      break;
    }
  }
  return str.slice(0, l - suffLen);
}
__name(rtrim, "rtrim");
function findClosingBracket(str, b) {
  if (str.indexOf(b[1]) === -1) {
    return -1;
  }
  let level = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "\\") {
      i++;
    } else if (str[i] === b[0]) {
      level++;
    } else if (str[i] === b[1]) {
      level--;
      if (level < 0) {
        return i;
      }
    }
  }
  return -1;
}
__name(findClosingBracket, "findClosingBracket");
function outputLink(cap, link2, raw, lexer2) {
  const href = link2.href;
  const title = link2.title ? escape$1(link2.title) : null;
  const text = cap[1].replace(/\\([\[\]])/g, "$1");
  if (cap[0].charAt(0) !== "!") {
    lexer2.state.inLink = true;
    const token = {
      type: "link",
      raw,
      href,
      title,
      text,
      tokens: lexer2.inlineTokens(text)
    };
    lexer2.state.inLink = false;
    return token;
  }
  return {
    type: "image",
    raw,
    href,
    title,
    text: escape$1(text)
  };
}
__name(outputLink, "outputLink");
function indentCodeCompensation(raw, text) {
  const matchIndentToCode = raw.match(/^(\s+)(?:```)/);
  if (matchIndentToCode === null) {
    return text;
  }
  const indentToCode = matchIndentToCode[1];
  return text.split("\n").map((node) => {
    const matchIndentInNode = node.match(/^\s+/);
    if (matchIndentInNode === null) {
      return node;
    }
    const [indentInNode] = matchIndentInNode;
    if (indentInNode.length >= indentToCode.length) {
      return node.slice(indentToCode.length);
    }
    return node;
  }).join("\n");
}
__name(indentCodeCompensation, "indentCodeCompensation");
var _Tokenizer = class {
  static {
    __name(this, "_Tokenizer");
  }
  options;
  rules;
  // set by the lexer
  lexer;
  // set by the lexer
  constructor(options2) {
    this.options = options2 || _defaults;
  }
  space(src) {
    const cap = this.rules.block.newline.exec(src);
    if (cap && cap[0].length > 0) {
      return {
        type: "space",
        raw: cap[0]
      };
    }
  }
  code(src) {
    const cap = this.rules.block.code.exec(src);
    if (cap) {
      const text = cap[0].replace(/^(?: {1,4}| {0,3}\t)/gm, "");
      return {
        type: "code",
        raw: cap[0],
        codeBlockStyle: "indented",
        text: !this.options.pedantic ? rtrim(text, "\n") : text
      };
    }
  }
  fences(src) {
    const cap = this.rules.block.fences.exec(src);
    if (cap) {
      const raw = cap[0];
      const text = indentCodeCompensation(raw, cap[3] || "");
      return {
        type: "code",
        raw,
        lang: cap[2] ? cap[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : cap[2],
        text
      };
    }
  }
  heading(src) {
    const cap = this.rules.block.heading.exec(src);
    if (cap) {
      let text = cap[2].trim();
      if (/#$/.test(text)) {
        const trimmed = rtrim(text, "#");
        if (this.options.pedantic) {
          text = trimmed.trim();
        } else if (!trimmed || / $/.test(trimmed)) {
          text = trimmed.trim();
        }
      }
      return {
        type: "heading",
        raw: cap[0],
        depth: cap[1].length,
        text,
        tokens: this.lexer.inline(text)
      };
    }
  }
  hr(src) {
    const cap = this.rules.block.hr.exec(src);
    if (cap) {
      return {
        type: "hr",
        raw: rtrim(cap[0], "\n")
      };
    }
  }
  blockquote(src) {
    const cap = this.rules.block.blockquote.exec(src);
    if (cap) {
      let lines = rtrim(cap[0], "\n").split("\n");
      let raw = "";
      let text = "";
      const tokens = [];
      while (lines.length > 0) {
        let inBlockquote = false;
        const currentLines = [];
        let i;
        for (i = 0; i < lines.length; i++) {
          if (/^ {0,3}>/.test(lines[i])) {
            currentLines.push(lines[i]);
            inBlockquote = true;
          } else if (!inBlockquote) {
            currentLines.push(lines[i]);
          } else {
            break;
          }
        }
        lines = lines.slice(i);
        const currentRaw = currentLines.join("\n");
        const currentText = currentRaw.replace(/\n {0,3}((?:=+|-+) *)(?=\n|$)/g, "\n    $1").replace(/^ {0,3}>[ \t]?/gm, "");
        raw = raw ? `${raw}
${currentRaw}` : currentRaw;
        text = text ? `${text}
${currentText}` : currentText;
        const top = this.lexer.state.top;
        this.lexer.state.top = true;
        this.lexer.blockTokens(currentText, tokens, true);
        this.lexer.state.top = top;
        if (lines.length === 0) {
          break;
        }
        const lastToken = tokens[tokens.length - 1];
        if (lastToken?.type === "code") {
          break;
        } else if (lastToken?.type === "blockquote") {
          const oldToken = lastToken;
          const newText = oldToken.raw + "\n" + lines.join("\n");
          const newToken = this.blockquote(newText);
          tokens[tokens.length - 1] = newToken;
          raw = raw.substring(0, raw.length - oldToken.raw.length) + newToken.raw;
          text = text.substring(0, text.length - oldToken.text.length) + newToken.text;
          break;
        } else if (lastToken?.type === "list") {
          const oldToken = lastToken;
          const newText = oldToken.raw + "\n" + lines.join("\n");
          const newToken = this.list(newText);
          tokens[tokens.length - 1] = newToken;
          raw = raw.substring(0, raw.length - lastToken.raw.length) + newToken.raw;
          text = text.substring(0, text.length - oldToken.raw.length) + newToken.raw;
          lines = newText.substring(tokens[tokens.length - 1].raw.length).split("\n");
          continue;
        }
      }
      return {
        type: "blockquote",
        raw,
        tokens,
        text
      };
    }
  }
  list(src) {
    let cap = this.rules.block.list.exec(src);
    if (cap) {
      let bull = cap[1].trim();
      const isordered = bull.length > 1;
      const list2 = {
        type: "list",
        raw: "",
        ordered: isordered,
        start: isordered ? +bull.slice(0, -1) : "",
        loose: false,
        items: []
      };
      bull = isordered ? `\\d{1,9}\\${bull.slice(-1)}` : `\\${bull}`;
      if (this.options.pedantic) {
        bull = isordered ? bull : "[*+-]";
      }
      const itemRegex = new RegExp(`^( {0,3}${bull})((?:[	 ][^\\n]*)?(?:\\n|$))`);
      let endsWithBlankLine = false;
      while (src) {
        let endEarly = false;
        let raw = "";
        let itemContents = "";
        if (!(cap = itemRegex.exec(src))) {
          break;
        }
        if (this.rules.block.hr.test(src)) {
          break;
        }
        raw = cap[0];
        src = src.substring(raw.length);
        let line = cap[2].split("\n", 1)[0].replace(/^\t+/, (t) => " ".repeat(3 * t.length));
        let nextLine = src.split("\n", 1)[0];
        let blankLine = !line.trim();
        let indent = 0;
        if (this.options.pedantic) {
          indent = 2;
          itemContents = line.trimStart();
        } else if (blankLine) {
          indent = cap[1].length + 1;
        } else {
          indent = cap[2].search(/[^ ]/);
          indent = indent > 4 ? 1 : indent;
          itemContents = line.slice(indent);
          indent += cap[1].length;
        }
        if (blankLine && /^[ \t]*$/.test(nextLine)) {
          raw += nextLine + "\n";
          src = src.substring(nextLine.length + 1);
          endEarly = true;
        }
        if (!endEarly) {
          const nextBulletRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`);
          const hrRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`);
          const fencesBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:\`\`\`|~~~)`);
          const headingBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}#`);
          const htmlBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}<(?:[a-z].*>|!--)`, "i");
          while (src) {
            const rawLine = src.split("\n", 1)[0];
            let nextLineWithoutTabs;
            nextLine = rawLine;
            if (this.options.pedantic) {
              nextLine = nextLine.replace(/^ {1,4}(?=( {4})*[^ ])/g, "  ");
              nextLineWithoutTabs = nextLine;
            } else {
              nextLineWithoutTabs = nextLine.replace(/\t/g, "    ");
            }
            if (fencesBeginRegex.test(nextLine)) {
              break;
            }
            if (headingBeginRegex.test(nextLine)) {
              break;
            }
            if (htmlBeginRegex.test(nextLine)) {
              break;
            }
            if (nextBulletRegex.test(nextLine)) {
              break;
            }
            if (hrRegex.test(nextLine)) {
              break;
            }
            if (nextLineWithoutTabs.search(/[^ ]/) >= indent || !nextLine.trim()) {
              itemContents += "\n" + nextLineWithoutTabs.slice(indent);
            } else {
              if (blankLine) {
                break;
              }
              if (line.replace(/\t/g, "    ").search(/[^ ]/) >= 4) {
                break;
              }
              if (fencesBeginRegex.test(line)) {
                break;
              }
              if (headingBeginRegex.test(line)) {
                break;
              }
              if (hrRegex.test(line)) {
                break;
              }
              itemContents += "\n" + nextLine;
            }
            if (!blankLine && !nextLine.trim()) {
              blankLine = true;
            }
            raw += rawLine + "\n";
            src = src.substring(rawLine.length + 1);
            line = nextLineWithoutTabs.slice(indent);
          }
        }
        if (!list2.loose) {
          if (endsWithBlankLine) {
            list2.loose = true;
          } else if (/\n[ \t]*\n[ \t]*$/.test(raw)) {
            endsWithBlankLine = true;
          }
        }
        let istask = null;
        let ischecked;
        if (this.options.gfm) {
          istask = /^\[[ xX]\] /.exec(itemContents);
          if (istask) {
            ischecked = istask[0] !== "[ ] ";
            itemContents = itemContents.replace(/^\[[ xX]\] +/, "");
          }
        }
        list2.items.push({
          type: "list_item",
          raw,
          task: !!istask,
          checked: ischecked,
          loose: false,
          text: itemContents,
          tokens: []
        });
        list2.raw += raw;
      }
      list2.items[list2.items.length - 1].raw = list2.items[list2.items.length - 1].raw.trimEnd();
      list2.items[list2.items.length - 1].text = list2.items[list2.items.length - 1].text.trimEnd();
      list2.raw = list2.raw.trimEnd();
      for (let i = 0; i < list2.items.length; i++) {
        this.lexer.state.top = false;
        list2.items[i].tokens = this.lexer.blockTokens(list2.items[i].text, []);
        if (!list2.loose) {
          const spacers = list2.items[i].tokens.filter((t) => t.type === "space");
          const hasMultipleLineBreaks = spacers.length > 0 && spacers.some((t) => /\n.*\n/.test(t.raw));
          list2.loose = hasMultipleLineBreaks;
        }
      }
      if (list2.loose) {
        for (let i = 0; i < list2.items.length; i++) {
          list2.items[i].loose = true;
        }
      }
      return list2;
    }
  }
  html(src) {
    const cap = this.rules.block.html.exec(src);
    if (cap) {
      const token = {
        type: "html",
        block: true,
        raw: cap[0],
        pre: cap[1] === "pre" || cap[1] === "script" || cap[1] === "style",
        text: cap[0]
      };
      return token;
    }
  }
  def(src) {
    const cap = this.rules.block.def.exec(src);
    if (cap) {
      const tag2 = cap[1].toLowerCase().replace(/\s+/g, " ");
      const href = cap[2] ? cap[2].replace(/^<(.*)>$/, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "";
      const title = cap[3] ? cap[3].substring(1, cap[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : cap[3];
      return {
        type: "def",
        tag: tag2,
        raw: cap[0],
        href,
        title
      };
    }
  }
  table(src) {
    const cap = this.rules.block.table.exec(src);
    if (!cap) {
      return;
    }
    if (!/[:|]/.test(cap[2])) {
      return;
    }
    const headers = splitCells(cap[1]);
    const aligns = cap[2].replace(/^\||\| *$/g, "").split("|");
    const rows = cap[3] && cap[3].trim() ? cap[3].replace(/\n[ \t]*$/, "").split("\n") : [];
    const item = {
      type: "table",
      raw: cap[0],
      header: [],
      align: [],
      rows: []
    };
    if (headers.length !== aligns.length) {
      return;
    }
    for (const align of aligns) {
      if (/^ *-+: *$/.test(align)) {
        item.align.push("right");
      } else if (/^ *:-+: *$/.test(align)) {
        item.align.push("center");
      } else if (/^ *:-+ *$/.test(align)) {
        item.align.push("left");
      } else {
        item.align.push(null);
      }
    }
    for (let i = 0; i < headers.length; i++) {
      item.header.push({
        text: headers[i],
        tokens: this.lexer.inline(headers[i]),
        header: true,
        align: item.align[i]
      });
    }
    for (const row of rows) {
      item.rows.push(splitCells(row, item.header.length).map((cell, i) => {
        return {
          text: cell,
          tokens: this.lexer.inline(cell),
          header: false,
          align: item.align[i]
        };
      }));
    }
    return item;
  }
  lheading(src) {
    const cap = this.rules.block.lheading.exec(src);
    if (cap) {
      return {
        type: "heading",
        raw: cap[0],
        depth: cap[2].charAt(0) === "=" ? 1 : 2,
        text: cap[1],
        tokens: this.lexer.inline(cap[1])
      };
    }
  }
  paragraph(src) {
    const cap = this.rules.block.paragraph.exec(src);
    if (cap) {
      const text = cap[1].charAt(cap[1].length - 1) === "\n" ? cap[1].slice(0, -1) : cap[1];
      return {
        type: "paragraph",
        raw: cap[0],
        text,
        tokens: this.lexer.inline(text)
      };
    }
  }
  text(src) {
    const cap = this.rules.block.text.exec(src);
    if (cap) {
      return {
        type: "text",
        raw: cap[0],
        text: cap[0],
        tokens: this.lexer.inline(cap[0])
      };
    }
  }
  escape(src) {
    const cap = this.rules.inline.escape.exec(src);
    if (cap) {
      return {
        type: "escape",
        raw: cap[0],
        text: escape$1(cap[1])
      };
    }
  }
  tag(src) {
    const cap = this.rules.inline.tag.exec(src);
    if (cap) {
      if (!this.lexer.state.inLink && /^<a /i.test(cap[0])) {
        this.lexer.state.inLink = true;
      } else if (this.lexer.state.inLink && /^<\/a>/i.test(cap[0])) {
        this.lexer.state.inLink = false;
      }
      if (!this.lexer.state.inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
        this.lexer.state.inRawBlock = true;
      } else if (this.lexer.state.inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
        this.lexer.state.inRawBlock = false;
      }
      return {
        type: "html",
        raw: cap[0],
        inLink: this.lexer.state.inLink,
        inRawBlock: this.lexer.state.inRawBlock,
        block: false,
        text: cap[0]
      };
    }
  }
  link(src) {
    const cap = this.rules.inline.link.exec(src);
    if (cap) {
      const trimmedUrl = cap[2].trim();
      if (!this.options.pedantic && /^</.test(trimmedUrl)) {
        if (!/>$/.test(trimmedUrl)) {
          return;
        }
        const rtrimSlash = rtrim(trimmedUrl.slice(0, -1), "\\");
        if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) {
          return;
        }
      } else {
        const lastParenIndex = findClosingBracket(cap[2], "()");
        if (lastParenIndex > -1) {
          const start = cap[0].indexOf("!") === 0 ? 5 : 4;
          const linkLen = start + cap[1].length + lastParenIndex;
          cap[2] = cap[2].substring(0, lastParenIndex);
          cap[0] = cap[0].substring(0, linkLen).trim();
          cap[3] = "";
        }
      }
      let href = cap[2];
      let title = "";
      if (this.options.pedantic) {
        const link2 = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);
        if (link2) {
          href = link2[1];
          title = link2[3];
        }
      } else {
        title = cap[3] ? cap[3].slice(1, -1) : "";
      }
      href = href.trim();
      if (/^</.test(href)) {
        if (this.options.pedantic && !/>$/.test(trimmedUrl)) {
          href = href.slice(1);
        } else {
          href = href.slice(1, -1);
        }
      }
      return outputLink(cap, {
        href: href ? href.replace(this.rules.inline.anyPunctuation, "$1") : href,
        title: title ? title.replace(this.rules.inline.anyPunctuation, "$1") : title
      }, cap[0], this.lexer);
    }
  }
  reflink(src, links) {
    let cap;
    if ((cap = this.rules.inline.reflink.exec(src)) || (cap = this.rules.inline.nolink.exec(src))) {
      const linkString = (cap[2] || cap[1]).replace(/\s+/g, " ");
      const link2 = links[linkString.toLowerCase()];
      if (!link2) {
        const text = cap[0].charAt(0);
        return {
          type: "text",
          raw: text,
          text
        };
      }
      return outputLink(cap, link2, cap[0], this.lexer);
    }
  }
  emStrong(src, maskedSrc, prevChar = "") {
    let match = this.rules.inline.emStrongLDelim.exec(src);
    if (!match)
      return;
    if (match[3] && prevChar.match(/[\p{L}\p{N}]/u))
      return;
    const nextChar = match[1] || match[2] || "";
    if (!nextChar || !prevChar || this.rules.inline.punctuation.exec(prevChar)) {
      const lLength = [...match[0]].length - 1;
      let rDelim, rLength, delimTotal = lLength, midDelimTotal = 0;
      const endReg = match[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      endReg.lastIndex = 0;
      maskedSrc = maskedSrc.slice(-1 * src.length + lLength);
      while ((match = endReg.exec(maskedSrc)) != null) {
        rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
        if (!rDelim)
          continue;
        rLength = [...rDelim].length;
        if (match[3] || match[4]) {
          delimTotal += rLength;
          continue;
        } else if (match[5] || match[6]) {
          if (lLength % 3 && !((lLength + rLength) % 3)) {
            midDelimTotal += rLength;
            continue;
          }
        }
        delimTotal -= rLength;
        if (delimTotal > 0)
          continue;
        rLength = Math.min(rLength, rLength + delimTotal + midDelimTotal);
        const lastCharLength = [...match[0]][0].length;
        const raw = src.slice(0, lLength + match.index + lastCharLength + rLength);
        if (Math.min(lLength, rLength) % 2) {
          const text2 = raw.slice(1, -1);
          return {
            type: "em",
            raw,
            text: text2,
            tokens: this.lexer.inlineTokens(text2)
          };
        }
        const text = raw.slice(2, -2);
        return {
          type: "strong",
          raw,
          text,
          tokens: this.lexer.inlineTokens(text)
        };
      }
    }
  }
  codespan(src) {
    const cap = this.rules.inline.code.exec(src);
    if (cap) {
      let text = cap[2].replace(/\n/g, " ");
      const hasNonSpaceChars = /[^ ]/.test(text);
      const hasSpaceCharsOnBothEnds = /^ /.test(text) && / $/.test(text);
      if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
        text = text.substring(1, text.length - 1);
      }
      text = escape$1(text, true);
      return {
        type: "codespan",
        raw: cap[0],
        text
      };
    }
  }
  br(src) {
    const cap = this.rules.inline.br.exec(src);
    if (cap) {
      return {
        type: "br",
        raw: cap[0]
      };
    }
  }
  del(src) {
    const cap = this.rules.inline.del.exec(src);
    if (cap) {
      return {
        type: "del",
        raw: cap[0],
        text: cap[2],
        tokens: this.lexer.inlineTokens(cap[2])
      };
    }
  }
  autolink(src) {
    const cap = this.rules.inline.autolink.exec(src);
    if (cap) {
      let text, href;
      if (cap[2] === "@") {
        text = escape$1(cap[1]);
        href = "mailto:" + text;
      } else {
        text = escape$1(cap[1]);
        href = text;
      }
      return {
        type: "link",
        raw: cap[0],
        text,
        href,
        tokens: [
          {
            type: "text",
            raw: text,
            text
          }
        ]
      };
    }
  }
  url(src) {
    let cap;
    if (cap = this.rules.inline.url.exec(src)) {
      let text, href;
      if (cap[2] === "@") {
        text = escape$1(cap[0]);
        href = "mailto:" + text;
      } else {
        let prevCapZero;
        do {
          prevCapZero = cap[0];
          cap[0] = this.rules.inline._backpedal.exec(cap[0])?.[0] ?? "";
        } while (prevCapZero !== cap[0]);
        text = escape$1(cap[0]);
        if (cap[1] === "www.") {
          href = "http://" + cap[0];
        } else {
          href = cap[0];
        }
      }
      return {
        type: "link",
        raw: cap[0],
        text,
        href,
        tokens: [
          {
            type: "text",
            raw: text,
            text
          }
        ]
      };
    }
  }
  inlineText(src) {
    const cap = this.rules.inline.text.exec(src);
    if (cap) {
      let text;
      if (this.lexer.state.inRawBlock) {
        text = cap[0];
      } else {
        text = escape$1(cap[0]);
      }
      return {
        type: "text",
        raw: cap[0],
        text
      };
    }
  }
};
var newline = /^(?:[ \t]*(?:\n|$))+/;
var blockCode = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
var fences = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
var hr = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
var heading = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
var bullet = /(?:[*+-]|\d{1,9}[.)])/;
var lheading = edit(/^(?!bull |blockCode|fences|blockquote|heading|html)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html))+?)\n {0,3}(=+|-+) *(?:\n+|$)/).replace(/bull/g, bullet).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).getRegex();
var _paragraph = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/;
var blockText = /^[^\n]+/;
var _blockLabel = /(?!\s*\])(?:\\.|[^\[\]\\])+/;
var def = edit(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", _blockLabel).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex();
var list = edit(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, bullet).getRegex();
var _tag = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
var _comment = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
var html = edit("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", _comment).replace("tag", _tag).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
var paragraph = edit(_paragraph).replace("hr", hr).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _tag).getRegex();
var blockquote = edit(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", paragraph).getRegex();
var blockNormal = {
  blockquote,
  code: blockCode,
  def,
  fences,
  heading,
  hr,
  html,
  lheading,
  list,
  newline,
  paragraph,
  table: noopTest,
  text: blockText
};
var gfmTable = edit("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", hr).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _tag).getRegex();
var blockGfm = {
  ...blockNormal,
  table: gfmTable,
  paragraph: edit(_paragraph).replace("hr", hr).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", gfmTable).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _tag).getRegex()
};
var blockPedantic = {
  ...blockNormal,
  html: edit(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", _comment).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
  heading: /^(#{1,6})(.*)(?:\n+|$)/,
  fences: noopTest,
  // fences not supported
  lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
  paragraph: edit(_paragraph).replace("hr", hr).replace("heading", " *#{1,6} *[^\n]").replace("lheading", lheading).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex()
};
var escape = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
var inlineCode = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
var br = /^( {2,}|\\)\n(?!\s*$)/;
var inlineText = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
var _punctuation = "\\p{P}\\p{S}";
var punctuation = edit(/^((?![*_])[\spunctuation])/, "u").replace(/punctuation/g, _punctuation).getRegex();
var blockSkip = /\[[^[\]]*?\]\((?:\\.|[^\\\(\)]|\((?:\\.|[^\\\(\)])*\))*\)|`[^`]*?`|<[^<>]*?>/g;
var emStrongLDelim = edit(/^(?:\*+(?:((?!\*)[punct])|[^\s*]))|^_+(?:((?!_)[punct])|([^\s_]))/, "u").replace(/punct/g, _punctuation).getRegex();
var emStrongRDelimAst = edit("^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)[punct](\\*+)(?=[\\s]|$)|[^punct\\s](\\*+)(?!\\*)(?=[punct\\s]|$)|(?!\\*)[punct\\s](\\*+)(?=[^punct\\s])|[\\s](\\*+)(?!\\*)(?=[punct])|(?!\\*)[punct](\\*+)(?!\\*)(?=[punct])|[^punct\\s](\\*+)(?=[^punct\\s])", "gu").replace(/punct/g, _punctuation).getRegex();
var emStrongRDelimUnd = edit("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)[punct](_+)(?=[\\s]|$)|[^punct\\s](_+)(?!_)(?=[punct\\s]|$)|(?!_)[punct\\s](_+)(?=[^punct\\s])|[\\s](_+)(?!_)(?=[punct])|(?!_)[punct](_+)(?!_)(?=[punct])", "gu").replace(/punct/g, _punctuation).getRegex();
var anyPunctuation = edit(/\\([punct])/, "gu").replace(/punct/g, _punctuation).getRegex();
var autolink = edit(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex();
var _inlineComment = edit(_comment).replace("(?:-->|$)", "-->").getRegex();
var tag = edit("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", _inlineComment).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
var _inlineLabel = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
var link = edit(/^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/).replace("label", _inlineLabel).replace("href", /<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex();
var reflink = edit(/^!?\[(label)\]\[(ref)\]/).replace("label", _inlineLabel).replace("ref", _blockLabel).getRegex();
var nolink = edit(/^!?\[(ref)\](?:\[\])?/).replace("ref", _blockLabel).getRegex();
var reflinkSearch = edit("reflink|nolink(?!\\()", "g").replace("reflink", reflink).replace("nolink", nolink).getRegex();
var inlineNormal = {
  _backpedal: noopTest,
  // only used for GFM url
  anyPunctuation,
  autolink,
  blockSkip,
  br,
  code: inlineCode,
  del: noopTest,
  emStrongLDelim,
  emStrongRDelimAst,
  emStrongRDelimUnd,
  escape,
  link,
  nolink,
  punctuation,
  reflink,
  reflinkSearch,
  tag,
  text: inlineText,
  url: noopTest
};
var inlinePedantic = {
  ...inlineNormal,
  link: edit(/^!?\[(label)\]\((.*?)\)/).replace("label", _inlineLabel).getRegex(),
  reflink: edit(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", _inlineLabel).getRegex()
};
var inlineGfm = {
  ...inlineNormal,
  escape: edit(escape).replace("])", "~|])").getRegex(),
  url: edit(/^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/, "i").replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),
  _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
  del: /^(~~?)(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))\1(?=[^~]|$)/,
  text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/
};
var inlineBreaks = {
  ...inlineGfm,
  br: edit(br).replace("{2,}", "*").getRegex(),
  text: edit(inlineGfm.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex()
};
var block = {
  normal: blockNormal,
  gfm: blockGfm,
  pedantic: blockPedantic
};
var inline = {
  normal: inlineNormal,
  gfm: inlineGfm,
  breaks: inlineBreaks,
  pedantic: inlinePedantic
};
var _Lexer = class __Lexer {
  static {
    __name(this, "_Lexer");
  }
  tokens;
  options;
  state;
  tokenizer;
  inlineQueue;
  constructor(options2) {
    this.tokens = [];
    this.tokens.links = /* @__PURE__ */ Object.create(null);
    this.options = options2 || _defaults;
    this.options.tokenizer = this.options.tokenizer || new _Tokenizer();
    this.tokenizer = this.options.tokenizer;
    this.tokenizer.options = this.options;
    this.tokenizer.lexer = this;
    this.inlineQueue = [];
    this.state = {
      inLink: false,
      inRawBlock: false,
      top: true
    };
    const rules = {
      block: block.normal,
      inline: inline.normal
    };
    if (this.options.pedantic) {
      rules.block = block.pedantic;
      rules.inline = inline.pedantic;
    } else if (this.options.gfm) {
      rules.block = block.gfm;
      if (this.options.breaks) {
        rules.inline = inline.breaks;
      } else {
        rules.inline = inline.gfm;
      }
    }
    this.tokenizer.rules = rules;
  }
  /**
   * Expose Rules
   */
  static get rules() {
    return {
      block,
      inline
    };
  }
  /**
   * Static Lex Method
   */
  static lex(src, options2) {
    const lexer2 = new __Lexer(options2);
    return lexer2.lex(src);
  }
  /**
   * Static Lex Inline Method
   */
  static lexInline(src, options2) {
    const lexer2 = new __Lexer(options2);
    return lexer2.inlineTokens(src);
  }
  /**
   * Preprocessing
   */
  lex(src) {
    src = src.replace(/\r\n|\r/g, "\n");
    this.blockTokens(src, this.tokens);
    for (let i = 0; i < this.inlineQueue.length; i++) {
      const next = this.inlineQueue[i];
      this.inlineTokens(next.src, next.tokens);
    }
    this.inlineQueue = [];
    return this.tokens;
  }
  blockTokens(src, tokens = [], lastParagraphClipped = false) {
    if (this.options.pedantic) {
      src = src.replace(/\t/g, "    ").replace(/^ +$/gm, "");
    }
    let token;
    let lastToken;
    let cutSrc;
    while (src) {
      if (this.options.extensions && this.options.extensions.block && this.options.extensions.block.some((extTokenizer) => {
        if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          return true;
        }
        return false;
      })) {
        continue;
      }
      if (token = this.tokenizer.space(src)) {
        src = src.substring(token.raw.length);
        if (token.raw.length === 1 && tokens.length > 0) {
          tokens[tokens.length - 1].raw += "\n";
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.code(src)) {
        src = src.substring(token.raw.length);
        lastToken = tokens[tokens.length - 1];
        if (lastToken && (lastToken.type === "paragraph" || lastToken.type === "text")) {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.text;
          this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.fences(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.heading(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.hr(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.blockquote(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.list(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.html(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.def(src)) {
        src = src.substring(token.raw.length);
        lastToken = tokens[tokens.length - 1];
        if (lastToken && (lastToken.type === "paragraph" || lastToken.type === "text")) {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.raw;
          this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
        } else if (!this.tokens.links[token.tag]) {
          this.tokens.links[token.tag] = {
            href: token.href,
            title: token.title
          };
        }
        continue;
      }
      if (token = this.tokenizer.table(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.lheading(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      cutSrc = src;
      if (this.options.extensions && this.options.extensions.startBlock) {
        let startIndex = Infinity;
        const tempSrc = src.slice(1);
        let tempStart;
        this.options.extensions.startBlock.forEach((getStartIndex) => {
          tempStart = getStartIndex.call({ lexer: this }, tempSrc);
          if (typeof tempStart === "number" && tempStart >= 0) {
            startIndex = Math.min(startIndex, tempStart);
          }
        });
        if (startIndex < Infinity && startIndex >= 0) {
          cutSrc = src.substring(0, startIndex + 1);
        }
      }
      if (this.state.top && (token = this.tokenizer.paragraph(cutSrc))) {
        lastToken = tokens[tokens.length - 1];
        if (lastParagraphClipped && lastToken?.type === "paragraph") {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.text;
          this.inlineQueue.pop();
          this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
        } else {
          tokens.push(token);
        }
        lastParagraphClipped = cutSrc.length !== src.length;
        src = src.substring(token.raw.length);
        continue;
      }
      if (token = this.tokenizer.text(src)) {
        src = src.substring(token.raw.length);
        lastToken = tokens[tokens.length - 1];
        if (lastToken && lastToken.type === "text") {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.text;
          this.inlineQueue.pop();
          this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (src) {
        const errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
        if (this.options.silent) {
          console.error(errMsg);
          break;
        } else {
          throw new Error(errMsg);
        }
      }
    }
    this.state.top = true;
    return tokens;
  }
  inline(src, tokens = []) {
    this.inlineQueue.push({ src, tokens });
    return tokens;
  }
  /**
   * Lexing/Compiling
   */
  inlineTokens(src, tokens = []) {
    let token, lastToken, cutSrc;
    let maskedSrc = src;
    let match;
    let keepPrevChar, prevChar;
    if (this.tokens.links) {
      const links = Object.keys(this.tokens.links);
      if (links.length > 0) {
        while ((match = this.tokenizer.rules.inline.reflinkSearch.exec(maskedSrc)) != null) {
          if (links.includes(match[0].slice(match[0].lastIndexOf("[") + 1, -1))) {
            maskedSrc = maskedSrc.slice(0, match.index) + "[" + "a".repeat(match[0].length - 2) + "]" + maskedSrc.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex);
          }
        }
      }
    }
    while ((match = this.tokenizer.rules.inline.blockSkip.exec(maskedSrc)) != null) {
      maskedSrc = maskedSrc.slice(0, match.index) + "[" + "a".repeat(match[0].length - 2) + "]" + maskedSrc.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
    }
    while ((match = this.tokenizer.rules.inline.anyPunctuation.exec(maskedSrc)) != null) {
      maskedSrc = maskedSrc.slice(0, match.index) + "++" + maskedSrc.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
    }
    while (src) {
      if (!keepPrevChar) {
        prevChar = "";
      }
      keepPrevChar = false;
      if (this.options.extensions && this.options.extensions.inline && this.options.extensions.inline.some((extTokenizer) => {
        if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          return true;
        }
        return false;
      })) {
        continue;
      }
      if (token = this.tokenizer.escape(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.tag(src)) {
        src = src.substring(token.raw.length);
        lastToken = tokens[tokens.length - 1];
        if (lastToken && token.type === "text" && lastToken.type === "text") {
          lastToken.raw += token.raw;
          lastToken.text += token.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.link(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.reflink(src, this.tokens.links)) {
        src = src.substring(token.raw.length);
        lastToken = tokens[tokens.length - 1];
        if (lastToken && token.type === "text" && lastToken.type === "text") {
          lastToken.raw += token.raw;
          lastToken.text += token.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.emStrong(src, maskedSrc, prevChar)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.codespan(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.br(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.del(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.autolink(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (!this.state.inLink && (token = this.tokenizer.url(src))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      cutSrc = src;
      if (this.options.extensions && this.options.extensions.startInline) {
        let startIndex = Infinity;
        const tempSrc = src.slice(1);
        let tempStart;
        this.options.extensions.startInline.forEach((getStartIndex) => {
          tempStart = getStartIndex.call({ lexer: this }, tempSrc);
          if (typeof tempStart === "number" && tempStart >= 0) {
            startIndex = Math.min(startIndex, tempStart);
          }
        });
        if (startIndex < Infinity && startIndex >= 0) {
          cutSrc = src.substring(0, startIndex + 1);
        }
      }
      if (token = this.tokenizer.inlineText(cutSrc)) {
        src = src.substring(token.raw.length);
        if (token.raw.slice(-1) !== "_") {
          prevChar = token.raw.slice(-1);
        }
        keepPrevChar = true;
        lastToken = tokens[tokens.length - 1];
        if (lastToken && lastToken.type === "text") {
          lastToken.raw += token.raw;
          lastToken.text += token.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (src) {
        const errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
        if (this.options.silent) {
          console.error(errMsg);
          break;
        } else {
          throw new Error(errMsg);
        }
      }
    }
    return tokens;
  }
};
var _Renderer = class {
  static {
    __name(this, "_Renderer");
  }
  options;
  parser;
  // set by the parser
  constructor(options2) {
    this.options = options2 || _defaults;
  }
  space(token) {
    return "";
  }
  code({ text, lang, escaped }) {
    const langString = (lang || "").match(/^\S*/)?.[0];
    const code = text.replace(/\n$/, "") + "\n";
    if (!langString) {
      return "<pre><code>" + (escaped ? code : escape$1(code, true)) + "</code></pre>\n";
    }
    return '<pre><code class="language-' + escape$1(langString) + '">' + (escaped ? code : escape$1(code, true)) + "</code></pre>\n";
  }
  blockquote({ tokens }) {
    const body = this.parser.parse(tokens);
    return `<blockquote>
${body}</blockquote>
`;
  }
  html({ text }) {
    return text;
  }
  heading({ tokens, depth }) {
    return `<h${depth}>${this.parser.parseInline(tokens)}</h${depth}>
`;
  }
  hr(token) {
    return "<hr>\n";
  }
  list(token) {
    const ordered = token.ordered;
    const start = token.start;
    let body = "";
    for (let j = 0; j < token.items.length; j++) {
      const item = token.items[j];
      body += this.listitem(item);
    }
    const type = ordered ? "ol" : "ul";
    const startAttr = ordered && start !== 1 ? ' start="' + start + '"' : "";
    return "<" + type + startAttr + ">\n" + body + "</" + type + ">\n";
  }
  listitem(item) {
    let itemBody = "";
    if (item.task) {
      const checkbox = this.checkbox({ checked: !!item.checked });
      if (item.loose) {
        if (item.tokens.length > 0 && item.tokens[0].type === "paragraph") {
          item.tokens[0].text = checkbox + " " + item.tokens[0].text;
          if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === "text") {
            item.tokens[0].tokens[0].text = checkbox + " " + item.tokens[0].tokens[0].text;
          }
        } else {
          item.tokens.unshift({
            type: "text",
            raw: checkbox + " ",
            text: checkbox + " "
          });
        }
      } else {
        itemBody += checkbox + " ";
      }
    }
    itemBody += this.parser.parse(item.tokens, !!item.loose);
    return `<li>${itemBody}</li>
`;
  }
  checkbox({ checked }) {
    return "<input " + (checked ? 'checked="" ' : "") + 'disabled="" type="checkbox">';
  }
  paragraph({ tokens }) {
    return `<p>${this.parser.parseInline(tokens)}</p>
`;
  }
  table(token) {
    let header = "";
    let cell = "";
    for (let j = 0; j < token.header.length; j++) {
      cell += this.tablecell(token.header[j]);
    }
    header += this.tablerow({ text: cell });
    let body = "";
    for (let j = 0; j < token.rows.length; j++) {
      const row = token.rows[j];
      cell = "";
      for (let k = 0; k < row.length; k++) {
        cell += this.tablecell(row[k]);
      }
      body += this.tablerow({ text: cell });
    }
    if (body)
      body = `<tbody>${body}</tbody>`;
    return "<table>\n<thead>\n" + header + "</thead>\n" + body + "</table>\n";
  }
  tablerow({ text }) {
    return `<tr>
${text}</tr>
`;
  }
  tablecell(token) {
    const content = this.parser.parseInline(token.tokens);
    const type = token.header ? "th" : "td";
    const tag2 = token.align ? `<${type} align="${token.align}">` : `<${type}>`;
    return tag2 + content + `</${type}>
`;
  }
  /**
   * span level renderer
   */
  strong({ tokens }) {
    return `<strong>${this.parser.parseInline(tokens)}</strong>`;
  }
  em({ tokens }) {
    return `<em>${this.parser.parseInline(tokens)}</em>`;
  }
  codespan({ text }) {
    return `<code>${text}</code>`;
  }
  br(token) {
    return "<br>";
  }
  del({ tokens }) {
    return `<del>${this.parser.parseInline(tokens)}</del>`;
  }
  link({ href, title, tokens }) {
    const text = this.parser.parseInline(tokens);
    const cleanHref = cleanUrl(href);
    if (cleanHref === null) {
      return text;
    }
    href = cleanHref;
    let out = '<a href="' + href + '"';
    if (title) {
      out += ' title="' + title + '"';
    }
    out += ">" + text + "</a>";
    return out;
  }
  image({ href, title, text }) {
    const cleanHref = cleanUrl(href);
    if (cleanHref === null) {
      return text;
    }
    href = cleanHref;
    let out = `<img src="${href}" alt="${text}"`;
    if (title) {
      out += ` title="${title}"`;
    }
    out += ">";
    return out;
  }
  text(token) {
    return "tokens" in token && token.tokens ? this.parser.parseInline(token.tokens) : token.text;
  }
};
var _TextRenderer = class {
  static {
    __name(this, "_TextRenderer");
  }
  // no need for block level renderers
  strong({ text }) {
    return text;
  }
  em({ text }) {
    return text;
  }
  codespan({ text }) {
    return text;
  }
  del({ text }) {
    return text;
  }
  html({ text }) {
    return text;
  }
  text({ text }) {
    return text;
  }
  link({ text }) {
    return "" + text;
  }
  image({ text }) {
    return "" + text;
  }
  br() {
    return "";
  }
};
var _Parser = class __Parser {
  static {
    __name(this, "_Parser");
  }
  options;
  renderer;
  textRenderer;
  constructor(options2) {
    this.options = options2 || _defaults;
    this.options.renderer = this.options.renderer || new _Renderer();
    this.renderer = this.options.renderer;
    this.renderer.options = this.options;
    this.renderer.parser = this;
    this.textRenderer = new _TextRenderer();
  }
  /**
   * Static Parse Method
   */
  static parse(tokens, options2) {
    const parser2 = new __Parser(options2);
    return parser2.parse(tokens);
  }
  /**
   * Static Parse Inline Method
   */
  static parseInline(tokens, options2) {
    const parser2 = new __Parser(options2);
    return parser2.parseInline(tokens);
  }
  /**
   * Parse Loop
   */
  parse(tokens, top = true) {
    let out = "";
    for (let i = 0; i < tokens.length; i++) {
      const anyToken = tokens[i];
      if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[anyToken.type]) {
        const genericToken = anyToken;
        const ret = this.options.extensions.renderers[genericToken.type].call({ parser: this }, genericToken);
        if (ret !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "paragraph", "text"].includes(genericToken.type)) {
          out += ret || "";
          continue;
        }
      }
      const token = anyToken;
      switch (token.type) {
        case "space": {
          out += this.renderer.space(token);
          continue;
        }
        case "hr": {
          out += this.renderer.hr(token);
          continue;
        }
        case "heading": {
          out += this.renderer.heading(token);
          continue;
        }
        case "code": {
          out += this.renderer.code(token);
          continue;
        }
        case "table": {
          out += this.renderer.table(token);
          continue;
        }
        case "blockquote": {
          out += this.renderer.blockquote(token);
          continue;
        }
        case "list": {
          out += this.renderer.list(token);
          continue;
        }
        case "html": {
          out += this.renderer.html(token);
          continue;
        }
        case "paragraph": {
          out += this.renderer.paragraph(token);
          continue;
        }
        case "text": {
          let textToken = token;
          let body = this.renderer.text(textToken);
          while (i + 1 < tokens.length && tokens[i + 1].type === "text") {
            textToken = tokens[++i];
            body += "\n" + this.renderer.text(textToken);
          }
          if (top) {
            out += this.renderer.paragraph({
              type: "paragraph",
              raw: body,
              text: body,
              tokens: [{ type: "text", raw: body, text: body }]
            });
          } else {
            out += body;
          }
          continue;
        }
        default: {
          const errMsg = 'Token with "' + token.type + '" type was not found.';
          if (this.options.silent) {
            console.error(errMsg);
            return "";
          } else {
            throw new Error(errMsg);
          }
        }
      }
    }
    return out;
  }
  /**
   * Parse Inline Tokens
   */
  parseInline(tokens, renderer) {
    renderer = renderer || this.renderer;
    let out = "";
    for (let i = 0; i < tokens.length; i++) {
      const anyToken = tokens[i];
      if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[anyToken.type]) {
        const ret = this.options.extensions.renderers[anyToken.type].call({ parser: this }, anyToken);
        if (ret !== false || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(anyToken.type)) {
          out += ret || "";
          continue;
        }
      }
      const token = anyToken;
      switch (token.type) {
        case "escape": {
          out += renderer.text(token);
          break;
        }
        case "html": {
          out += renderer.html(token);
          break;
        }
        case "link": {
          out += renderer.link(token);
          break;
        }
        case "image": {
          out += renderer.image(token);
          break;
        }
        case "strong": {
          out += renderer.strong(token);
          break;
        }
        case "em": {
          out += renderer.em(token);
          break;
        }
        case "codespan": {
          out += renderer.codespan(token);
          break;
        }
        case "br": {
          out += renderer.br(token);
          break;
        }
        case "del": {
          out += renderer.del(token);
          break;
        }
        case "text": {
          out += renderer.text(token);
          break;
        }
        default: {
          const errMsg = 'Token with "' + token.type + '" type was not found.';
          if (this.options.silent) {
            console.error(errMsg);
            return "";
          } else {
            throw new Error(errMsg);
          }
        }
      }
    }
    return out;
  }
};
var _Hooks = class {
  static {
    __name(this, "_Hooks");
  }
  options;
  block;
  constructor(options2) {
    this.options = options2 || _defaults;
  }
  static passThroughHooks = /* @__PURE__ */ new Set([
    "preprocess",
    "postprocess",
    "processAllTokens"
  ]);
  /**
   * Process markdown before marked
   */
  preprocess(markdown) {
    return markdown;
  }
  /**
   * Process HTML after marked is finished
   */
  postprocess(html2) {
    return html2;
  }
  /**
   * Process all tokens before walk tokens
   */
  processAllTokens(tokens) {
    return tokens;
  }
  /**
   * Provide function to tokenize markdown
   */
  provideLexer() {
    return this.block ? _Lexer.lex : _Lexer.lexInline;
  }
  /**
   * Provide function to parse tokens
   */
  provideParser() {
    return this.block ? _Parser.parse : _Parser.parseInline;
  }
};
var Marked = class {
  static {
    __name(this, "Marked");
  }
  defaults = _getDefaults();
  options = this.setOptions;
  parse = this.parseMarkdown(true);
  parseInline = this.parseMarkdown(false);
  Parser = _Parser;
  Renderer = _Renderer;
  TextRenderer = _TextRenderer;
  Lexer = _Lexer;
  Tokenizer = _Tokenizer;
  Hooks = _Hooks;
  constructor(...args) {
    this.use(...args);
  }
  /**
   * Run callback for every token
   */
  walkTokens(tokens, callback) {
    let values = [];
    for (const token of tokens) {
      values = values.concat(callback.call(this, token));
      switch (token.type) {
        case "table": {
          const tableToken = token;
          for (const cell of tableToken.header) {
            values = values.concat(this.walkTokens(cell.tokens, callback));
          }
          for (const row of tableToken.rows) {
            for (const cell of row) {
              values = values.concat(this.walkTokens(cell.tokens, callback));
            }
          }
          break;
        }
        case "list": {
          const listToken = token;
          values = values.concat(this.walkTokens(listToken.items, callback));
          break;
        }
        default: {
          const genericToken = token;
          if (this.defaults.extensions?.childTokens?.[genericToken.type]) {
            this.defaults.extensions.childTokens[genericToken.type].forEach((childTokens) => {
              const tokens2 = genericToken[childTokens].flat(Infinity);
              values = values.concat(this.walkTokens(tokens2, callback));
            });
          } else if (genericToken.tokens) {
            values = values.concat(this.walkTokens(genericToken.tokens, callback));
          }
        }
      }
    }
    return values;
  }
  use(...args) {
    const extensions = this.defaults.extensions || { renderers: {}, childTokens: {} };
    args.forEach((pack) => {
      const opts = { ...pack };
      opts.async = this.defaults.async || opts.async || false;
      if (pack.extensions) {
        pack.extensions.forEach((ext) => {
          if (!ext.name) {
            throw new Error("extension name required");
          }
          if ("renderer" in ext) {
            const prevRenderer = extensions.renderers[ext.name];
            if (prevRenderer) {
              extensions.renderers[ext.name] = function(...args2) {
                let ret = ext.renderer.apply(this, args2);
                if (ret === false) {
                  ret = prevRenderer.apply(this, args2);
                }
                return ret;
              };
            } else {
              extensions.renderers[ext.name] = ext.renderer;
            }
          }
          if ("tokenizer" in ext) {
            if (!ext.level || ext.level !== "block" && ext.level !== "inline") {
              throw new Error("extension level must be 'block' or 'inline'");
            }
            const extLevel = extensions[ext.level];
            if (extLevel) {
              extLevel.unshift(ext.tokenizer);
            } else {
              extensions[ext.level] = [ext.tokenizer];
            }
            if (ext.start) {
              if (ext.level === "block") {
                if (extensions.startBlock) {
                  extensions.startBlock.push(ext.start);
                } else {
                  extensions.startBlock = [ext.start];
                }
              } else if (ext.level === "inline") {
                if (extensions.startInline) {
                  extensions.startInline.push(ext.start);
                } else {
                  extensions.startInline = [ext.start];
                }
              }
            }
          }
          if ("childTokens" in ext && ext.childTokens) {
            extensions.childTokens[ext.name] = ext.childTokens;
          }
        });
        opts.extensions = extensions;
      }
      if (pack.renderer) {
        const renderer = this.defaults.renderer || new _Renderer(this.defaults);
        for (const prop in pack.renderer) {
          if (!(prop in renderer)) {
            throw new Error(`renderer '${prop}' does not exist`);
          }
          if (["options", "parser"].includes(prop)) {
            continue;
          }
          const rendererProp = prop;
          const rendererFunc = pack.renderer[rendererProp];
          const prevRenderer = renderer[rendererProp];
          renderer[rendererProp] = (...args2) => {
            let ret = rendererFunc.apply(renderer, args2);
            if (ret === false) {
              ret = prevRenderer.apply(renderer, args2);
            }
            return ret || "";
          };
        }
        opts.renderer = renderer;
      }
      if (pack.tokenizer) {
        const tokenizer = this.defaults.tokenizer || new _Tokenizer(this.defaults);
        for (const prop in pack.tokenizer) {
          if (!(prop in tokenizer)) {
            throw new Error(`tokenizer '${prop}' does not exist`);
          }
          if (["options", "rules", "lexer"].includes(prop)) {
            continue;
          }
          const tokenizerProp = prop;
          const tokenizerFunc = pack.tokenizer[tokenizerProp];
          const prevTokenizer = tokenizer[tokenizerProp];
          tokenizer[tokenizerProp] = (...args2) => {
            let ret = tokenizerFunc.apply(tokenizer, args2);
            if (ret === false) {
              ret = prevTokenizer.apply(tokenizer, args2);
            }
            return ret;
          };
        }
        opts.tokenizer = tokenizer;
      }
      if (pack.hooks) {
        const hooks = this.defaults.hooks || new _Hooks();
        for (const prop in pack.hooks) {
          if (!(prop in hooks)) {
            throw new Error(`hook '${prop}' does not exist`);
          }
          if (["options", "block"].includes(prop)) {
            continue;
          }
          const hooksProp = prop;
          const hooksFunc = pack.hooks[hooksProp];
          const prevHook = hooks[hooksProp];
          if (_Hooks.passThroughHooks.has(prop)) {
            hooks[hooksProp] = (arg) => {
              if (this.defaults.async) {
                return Promise.resolve(hooksFunc.call(hooks, arg)).then((ret2) => {
                  return prevHook.call(hooks, ret2);
                });
              }
              const ret = hooksFunc.call(hooks, arg);
              return prevHook.call(hooks, ret);
            };
          } else {
            hooks[hooksProp] = (...args2) => {
              let ret = hooksFunc.apply(hooks, args2);
              if (ret === false) {
                ret = prevHook.apply(hooks, args2);
              }
              return ret;
            };
          }
        }
        opts.hooks = hooks;
      }
      if (pack.walkTokens) {
        const walkTokens2 = this.defaults.walkTokens;
        const packWalktokens = pack.walkTokens;
        opts.walkTokens = function(token) {
          let values = [];
          values.push(packWalktokens.call(this, token));
          if (walkTokens2) {
            values = values.concat(walkTokens2.call(this, token));
          }
          return values;
        };
      }
      this.defaults = { ...this.defaults, ...opts };
    });
    return this;
  }
  setOptions(opt) {
    this.defaults = { ...this.defaults, ...opt };
    return this;
  }
  lexer(src, options2) {
    return _Lexer.lex(src, options2 ?? this.defaults);
  }
  parser(tokens, options2) {
    return _Parser.parse(tokens, options2 ?? this.defaults);
  }
  parseMarkdown(blockType) {
    const parse = /* @__PURE__ */ __name((src, options2) => {
      const origOpt = { ...options2 };
      const opt = { ...this.defaults, ...origOpt };
      const throwError = this.onError(!!opt.silent, !!opt.async);
      if (this.defaults.async === true && origOpt.async === false) {
        return throwError(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      }
      if (typeof src === "undefined" || src === null) {
        return throwError(new Error("marked(): input parameter is undefined or null"));
      }
      if (typeof src !== "string") {
        return throwError(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(src) + ", string expected"));
      }
      if (opt.hooks) {
        opt.hooks.options = opt;
        opt.hooks.block = blockType;
      }
      const lexer2 = opt.hooks ? opt.hooks.provideLexer() : blockType ? _Lexer.lex : _Lexer.lexInline;
      const parser2 = opt.hooks ? opt.hooks.provideParser() : blockType ? _Parser.parse : _Parser.parseInline;
      if (opt.async) {
        return Promise.resolve(opt.hooks ? opt.hooks.preprocess(src) : src).then((src2) => lexer2(src2, opt)).then((tokens) => opt.hooks ? opt.hooks.processAllTokens(tokens) : tokens).then((tokens) => opt.walkTokens ? Promise.all(this.walkTokens(tokens, opt.walkTokens)).then(() => tokens) : tokens).then((tokens) => parser2(tokens, opt)).then((html2) => opt.hooks ? opt.hooks.postprocess(html2) : html2).catch(throwError);
      }
      try {
        if (opt.hooks) {
          src = opt.hooks.preprocess(src);
        }
        let tokens = lexer2(src, opt);
        if (opt.hooks) {
          tokens = opt.hooks.processAllTokens(tokens);
        }
        if (opt.walkTokens) {
          this.walkTokens(tokens, opt.walkTokens);
        }
        let html2 = parser2(tokens, opt);
        if (opt.hooks) {
          html2 = opt.hooks.postprocess(html2);
        }
        return html2;
      } catch (e) {
        return throwError(e);
      }
    }, "parse");
    return parse;
  }
  onError(silent, async) {
    return (e) => {
      e.message += "\nPlease report this to https://github.com/markedjs/marked.";
      if (silent) {
        const msg = "<p>An error occurred:</p><pre>" + escape$1(e.message + "", true) + "</pre>";
        if (async) {
          return Promise.resolve(msg);
        }
        return msg;
      }
      if (async) {
        return Promise.reject(e);
      }
      throw e;
    };
  }
};
var markedInstance = new Marked();
function marked(src, opt) {
  return markedInstance.parse(src, opt);
}
__name(marked, "marked");
marked.options = marked.setOptions = function(options2) {
  markedInstance.setOptions(options2);
  marked.defaults = markedInstance.defaults;
  changeDefaults(marked.defaults);
  return marked;
};
marked.getDefaults = _getDefaults;
marked.defaults = _defaults;
marked.use = function(...args) {
  markedInstance.use(...args);
  marked.defaults = markedInstance.defaults;
  changeDefaults(marked.defaults);
  return marked;
};
marked.walkTokens = function(tokens, callback) {
  return markedInstance.walkTokens(tokens, callback);
};
marked.parseInline = markedInstance.parseInline;
marked.Parser = _Parser;
marked.parser = _Parser.parse;
marked.Renderer = _Renderer;
marked.TextRenderer = _TextRenderer;
marked.Lexer = _Lexer;
marked.lexer = _Lexer.lex;
marked.Tokenizer = _Tokenizer;
marked.Hooks = _Hooks;
marked.parse = marked;
var options = marked.options;
var setOptions = marked.setOptions;
var use = marked.use;
var walkTokens = marked.walkTokens;
var parseInline = marked.parseInline;
var parser = _Parser.parse;
var lexer = _Lexer.lex;

// src/render/markdown.ts
marked.setOptions({
  gfm: true,
  breaks: false
});
function renderMarkdown(body) {
  return marked.parse(body, { async: false });
}
__name(renderMarkdown, "renderMarkdown");

// src/render/wordmark.ts
function wordmarkUrl(variant) {
  switch (variant) {
    case "thin":
      return "/wordmark.svg";
    case "default":
    default:
      return "/wordmark.svg";
  }
}
__name(wordmarkUrl, "wordmarkUrl");
function wordmarkImg(variant) {
  if (variant === "thin") {
    return inlineThinWordmark();
  }
  return `<img class="wordmark" src="${escapeAttr(wordmarkUrl(variant))}" alt="vwwwv">`;
}
__name(wordmarkImg, "wordmarkImg");
function inlineThinWordmark() {
  return `<svg class="wordmark" viewBox="0 0 220 38" xmlns="http://www.w3.org/2000/svg" aria-label="vwwwv">
    <text x="0" y="30"
          font-family="ui-sans-serif, system-ui, -apple-system, sans-serif"
          font-size="36" font-weight="300" letter-spacing="-2"
          fill="currentColor">vwwwv</text>
  </svg>`;
}
__name(inlineThinWordmark, "inlineThinWordmark");

// src/render/reading-time.ts
var WORDS_PER_MINUTE = 220;
function wordCount(markdownBody) {
  const cleaned = markdownBody.replace(/```[\s\S]*?```/g, " ").replace(/`[^`]*`/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[#>*_~\-]+/g, " ").trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}
__name(wordCount, "wordCount");
function readingTimeMinutes(markdownBody) {
  const words = wordCount(markdownBody);
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
__name(readingTimeMinutes, "readingTimeMinutes");
function formatReadingTime(markdownBody) {
  const minutes = readingTimeMinutes(markdownBody);
  return `${minutes} min`;
}
__name(formatReadingTime, "formatReadingTime");

// src/render/components.ts
function masthead({
  activeNav,
  wordmarkVariant,
  edition
}) {
  const cls = /* @__PURE__ */ __name((k) => activeNav === k ? ' class="is-active"' : "", "cls");
  return `
    <header class="masthead">
      ${edition ? `<div class="masthead__edition">${escapeHtml(edition)}</div>` : ""}
      <a class="masthead__brand" href="/" aria-label="vwwwv home">
        ${wordmarkImg(wordmarkVariant)}
      </a>
      <nav class="masthead__nav" aria-label="Primary">
        <a href="/"${cls("blog")}>Blog</a>
        <a href="/tag"${cls("tag")}>Tag</a>
        <a href="/about"${cls("about")}>About</a>
      </nav>
    </header>
  `;
}
__name(masthead, "masthead");
function footer() {
  return `
    <footer class="foot">
      <div class="foot__col">
        <strong>Elsewhere</strong>
        <a href="https://github.com/" rel="me">github</a>
      </div>
      <div class="foot__col">
        <strong>Sections</strong>
        <a href="/tag/trueborn">trueborn</a> \xB7
        <a href="/tag/code">code</a> \xB7
        <a href="/tag/curiosities">curiosities</a>
      </div>
      <div class="foot__col foot__colophon">
        Set with system-ui and a heavy hand. Served from Cloudflare. No
        analytics, no fonts from a CDN, no people on laptops. Built in
        14&nbsp;KB. \xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} \u2014 please reproduce with
        attribution and bad intent.
      </div>
    </footer>
  `;
}
__name(footer, "footer");
function tagPill(name, { variant = "outline", href } = {}) {
  const cls = `tag tag--${variant}`;
  const inner = escapeHtml(name);
  return href ? `<a class="${cls}" href="${escapeAttr(href)}">${inner}</a>` : `<span class="${cls}">${inner}</span>`;
}
__name(tagPill, "tagPill");
function tagsRow(tags) {
  if (!tags.length) return "";
  return tags.map(
    (t, i) => tagPill(t, {
      variant: i === 0 ? "filled" : "outline",
      href: `/tag/${encodeURIComponent(t)}`
    })
  ).join(" ");
}
__name(tagsRow, "tagsRow");
function postCard(post, opts) {
  const idxNum = String(opts.index).padStart(2, "0");
  const hasImage = post.featured_image !== null;
  const cls = "post" + (hasImage ? " post--with-image" : " post--no-image");
  const dateText = formatDateLong(post.published_at ?? post.created_at);
  const primaryTag = post.tags[0] ?? "";
  const kicker = primaryTag ? primaryTag : "note";
  const excerpt = post.excerpt ?? extractFirstParagraph(post.body);
  const readtime = opts.showReadingTime ? formatReadingTime(post.body) : null;
  const figureBlock = hasImage ? renderFeaturedFigure(post) : "";
  const expandedTitleBlock = `
    <div class="post__title-expanded">
      <div class="post__kicker">${escapeHtml(kicker)}</div>
      <h1 class="post__title-clone">${escapeHtml(post.title)}</h1>
    </div>`;
  const collapsedTitleBlock = `
    <div class="post__title-wrap">
      <div class="post__kicker">${escapeHtml(kicker)}</div>
      <h1 class="post__title" data-vt-title="t-${escapeAttr(post.id)}">${escapeHtml(post.title)}</h1>
    </div>`;
  const metaRow = `
    <div class="post__meta-row">
      <span class="meta">${escapeHtml(dateText)}</span>
      ${readtime ? `<span class="meta">\xB7</span><span class="meta">${escapeHtml(readtime)}</span>` : ""}
      ${tagsRow(post.tags)}
      <span style="flex:1"></span>
      <span class="post__expand-cue" aria-hidden="true">
        <span class="label-closed">Read in place</span>
        <span class="label-open">Collapse</span>
      </span>
    </div>`;
  const summary = hasImage ? `
      <summary class="post__summary">
        ${figureBlock}
        ${expandedTitleBlock}
        ${metaRow}
      </summary>` : `
      <summary class="post__summary">
        ${collapsedTitleBlock}
        <p class="post__excerpt">${escapeHtml(excerpt)}</p>
        ${metaRow}
      </summary>`;
  const sidebar = `
    <aside class="post__sidebar">
      <dl>
        <dt>Filed</dt>
        <dd>${escapeHtml(post.tags.join(", ") || "\u2014")}</dd>
        <dt>Published</dt>
        <dd>${escapeHtml(dateText)}</dd>
        ${readtime ? `<dt>Reading</dt><dd>${escapeHtml(readtime)}</dd>` : ""}
        <dt>Permalink</dt>
        <dd><a href="/post/${encodeURIComponent(post.slug)}">/${escapeHtml(post.slug)}</a></dd>
      </dl>
    </aside>`;
  const body = `
    <div class="post__body">
      <div class="post__prose">${renderMarkdown(post.body)}</div>
      ${sidebar}
    </div>`;
  return `
    <details class="${cls}" id="${escapeAttr(post.slug)}" data-tags="${escapeAttr(post.tags.join(" "))}"${opts.open ? " open" : ""}>
      <span class="post__index" aria-hidden="true">${idxNum}</span>
      ${summary}
      ${body}
    </details>
  `;
}
__name(postCard, "postCard");
function renderFeaturedFigure(post) {
  const img = post.featured_image;
  const dateText = formatDateLong(post.published_at ?? post.created_at);
  const primaryTag = post.tags[0] ?? "";
  const kicker = primaryTag || "note";
  const sourceCls = img.source_type === "screenshot" ? " figure--screenshot" : "";
  const imgUrl = imageUrl(img.r2_key);
  const alt = img.alt ?? post.title;
  return `
    <figure class="figure figure--crop${sourceCls}" data-vt-media="m-${escapeAttr(post.id)}">
      <img class="figure__media" src="${escapeAttr(imgUrl)}" alt="${escapeAttr(alt)}"
           ${img.width ? `width="${img.width}"` : ""} ${img.height ? `height="${img.height}"` : ""}>
      <div class="figure__overlay">
        <div class="post__overlay-title">
          <div class="post__kicker" style="color:var(--paper-cream)">${escapeHtml(kicker)}</div>
          <h1 class="post__title" data-vt-title="t-${escapeAttr(post.id)}">${escapeHtml(post.title)}</h1>
        </div>
      </div>
    </figure>
    ${img.caption ? `
    <figcaption class="figure-caption" aria-hidden="true">
      <span class="caption">${escapeHtml(dateText)}</span>
      <span class="caption-text">${escapeHtml(img.caption)}</span>
    </figcaption>` : ""}
  `;
}
__name(renderFeaturedFigure, "renderFeaturedFigure");
function imageUrl(r2Key) {
  return `/img/${r2Key}`;
}
__name(imageUrl, "imageUrl");
function extractFirstParagraph(body) {
  const trimmed = body.trimStart();
  const blank = trimmed.indexOf("\n\n");
  const para = (blank === -1 ? trimmed : trimmed.slice(0, blank)).trim();
  return para.replace(/`([^`]+)`/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").slice(0, 280);
}
__name(extractFirstParagraph, "extractFirstParagraph");

// src/render/layout.ts
function page(opts) {
  const {
    title,
    description = "vwwwv \u2014 a personal feed of essays, fragments of Trueborn, abandoned side projects, and alpine-botany rabbit holes.",
    activeNav,
    wordmarkVariant,
    edition,
    pageStyles,
    body,
    includeFeedJs,
    canonical,
    extraHead
  } = opts;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  ${canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}">` : ""}
  <link rel="stylesheet" href="/tokens.css">
  <link rel="icon" href="/wordmark.svg" type="image/svg+xml">
  ${pageStyles ? `<style>${pageStyles}</style>` : ""}
  ${extraHead ?? ""}
</head>
<body>
  <div class="page">
    ${masthead({ activeNav, wordmarkVariant, edition })}
    <hr class="rule-double" aria-hidden="true" style="margin-top: 28px;">
    ${body}
    ${footer()}
  </div>
  ${includeFeedJs ? `<script src="/feed.js" defer><\/script>` : ""}
</body>
</html>`;
}
__name(page, "page");

// src/render/feed-styles.ts
var feedPageStyles = `
  .feed { padding-top: 0; }

  .post {
    border-bottom: 2px solid var(--ink);
    padding: 28px 0 32px;
    position: relative;
  }
  .post:first-child { padding-top: 8px; }
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
  @media (max-width: 1240px) { .post__index { display: none; } }

  .post__figure { position: relative; }

  .post__title-wrap {
    display: flex;
    flex-direction: column;
    gap: 6px;
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
  }
  .post__meta-row {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    padding-top: 8px;
  }

  .post[open] .post__summary { gap: 22px; }
  .post[open] .post__overlay-title { display: none; }
  .post[open] .post__title-expanded { display: flex; }
  .post[open] .figure--crop { aspect-ratio: auto; }
  .post[open] .figure--crop .figure__media { aspect-ratio: 16 / 10; }
  .post[open] .figure__overlay { display: none; }

  .post__title-expanded { display: none; flex-direction: column; gap: 8px; padding-top: 6px; }

  .post__body {
    padding-top: 22px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 220px;
    gap: 40px;
  }
  @media (max-width: 760px) {
    .post__body { grid-template-columns: 1fr; gap: 18px; }
  }

  .post__prose {
    font-size: 17px;
    line-height: 1.62;
    color: var(--ink);
    max-width: 68ch;
  }
  .post__prose p { margin: 0 0 1em; text-wrap: pretty; }
  .post__prose p:first-child::first-letter {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 4.2em;
    line-height: .85;
    float: left;
    padding: 4px 10px 0 0;
    color: var(--poster-red);
  }
  .post__prose blockquote {
    margin: 1.2em 0;
    padding: 0 0 0 18px;
    border-left: 4px solid var(--poster-red);
    font-family: var(--font-display);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .01em;
    font-size: 22px;
    line-height: 1.2;
    color: var(--ink);
  }
  .post__prose code {
    font-family: var(--font-mono);
    background: var(--paper-cream-deep);
    padding: 1px 5px;
    border: 1px solid var(--ink);
    font-size: .9em;
  }
  .post__prose pre {
    background: var(--ink);
    color: var(--paper-cream);
    padding: 16px;
    overflow-x: auto;
    font-size: 14px;
    line-height: 1.5;
  }
  .post__prose pre code {
    background: transparent;
    border: 0;
    padding: 0;
    font-size: inherit;
    color: inherit;
  }
  .post__prose hr { border: 0; border-top: 2px solid var(--ink); margin: 24px 0; }
  .post__prose h2 {
    font-family: var(--font-display);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .02em;
    font-size: 26px;
    color: var(--ink);
    margin: 32px 0 10px;
  }
  .post__prose h3 {
    font-family: var(--font-display);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .02em;
    font-size: 22px;
    color: var(--ink);
    margin: 28px 0 8px;
  }
  .post__prose ul, .post__prose ol { padding-left: 22px; margin: 0 0 1em; }
  .post__prose li { margin: .25em 0; }
  .post__prose img { border: var(--frame) solid var(--ink); margin: 22px 0; }

  .post__sidebar {
    font-size: 13px;
    line-height: 1.5;
    color: var(--ink-soft);
    padding-top: 4px;
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
    content: "\u25B8";
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

// src/render/feed.ts
function renderFeed(opts) {
  const { posts, showReadingTime, wordmarkVariant, tagFilter } = opts;
  const title = tagFilter ? `${tagFilter} \u2014 vwwwv` : "vwwwv \u2014 code, fiction, and curiosities";
  const description = tagFilter ? `Posts tagged "${tagFilter}" on vwwwv.org.` : "A personal feed of essays, fragments of Trueborn, abandoned side projects, and alpine-botany rabbit holes.";
  const edition = tagFilter ? `Filed under ${tagFilter}` : formatEditionLine(Math.floor(Date.now() / 1e3));
  const intro = tagFilter ? `
      <section style="padding: 24px 0 12px">
        <div class="meta" style="color: var(--poster-red); margin-bottom: 8px;">Filed under</div>
        <h1 style="font-size: clamp(40px, 6vw, 72px)">${escapeHtml(tagFilter)}</h1>
        <p class="lead" style="margin-top: 14px;">${posts.length} entr${posts.length === 1 ? "y" : "ies"}.</p>
      </section>
      <hr class="rule-double" aria-hidden="true">
    ` : "";
  const body = `
    ${intro}
    <main class="feed" id="feed">
      ${posts.length === 0 ? `<p class="lead" style="padding: 32px 0;">Nothing here yet. ${tagFilter ? `Try another tag.` : `Drafts are state, not files \u2014 once one is published, it'll show up here.`}</p>` : posts.map((post, i) => postCard(post, { index: i + 1, showReadingTime })).join("\n")}
    </main>
  `;
  const activeNav = tagFilter ? "tag" : "blog";
  return page({
    title,
    description,
    activeNav,
    wordmarkVariant,
    edition,
    pageStyles: feedPageStyles,
    body,
    includeFeedJs: true
  });
}
__name(renderFeed, "renderFeed");

// src/render/about.ts
function renderAbout(opts) {
  const { author, wordmarkVariant } = opts;
  const body = `
    <section class="about-hero">
      <div class="meta" style="color: var(--poster-red); margin-bottom: 14px;">Statement of intent \xB7 No. 01</div>
      <h1>I write things down so I can stop carrying them.</h1>
      ${author.bio ? `<p class="lead">${escapeHtml(author.bio)}</p>` : ""}
    </section>

    <hr class="rule-double" aria-hidden="true">

    <div class="about-grid">
      <div class="about-prose">
        <p>This site is a long-running exhaust pipe for a novel called <em>Trueborn</em>, a handful of code experiments most of which were abandoned for honest reasons, and a small but growing file on alpine plants that survive at heights I never will.</p>

        <h2>What you'll find here</h2>
        <p><strong>Trueborn.</strong> Drafts, fragments, sentences cut from chapters, occasionally a whole scene. The novel is set on a continent that does not exist and concerns a cartographer who refuses to draw it correctly. I post in chapter order when I can and out of order when I can't.</p>
        <p><strong>Code.</strong> Field notes from things I built. Mostly small. Mostly abandoned. The post-mortems are more honest than the launches were. There is no startup advice here.</p>
        <p><strong>Curiosities.</strong> A loose folder. Vintage postcards depicting violence as folk art. The history of the gear icon. The first known use of the word "user" in a software manual. A defence of the purple saxifrage.</p>

        <h2>What you won't find</h2>
        <p>A newsletter signup. A "subscribe to my next thing" lightbox. An author photograph in soft focus against a brick wall. A list of the podcasts I have appeared on. A weekly digest. A commenting system. A newsletter. (I said this twice.)</p>

        <h2>Contact</h2>
        <p>If you want to write to me, the address is on the colophon page, and is a real address that goes to a real inbox that I read on Sundays.</p>
      </div>

      <aside>
        <dl class="facts">
          <dt>Writing from</dt><dd>Bern, mostly. Sometimes a hut at 2,400 m.</dd>
          <dt>Day job</dt><dd>Distributed systems. Not the kind that sell ads.</dd>
          <dt>Languages</dt><dd>English, German (Swiss inflected), enough French to apologise.</dd>
          <dt>Stack</dt><dd>Vanilla HTML, Cloudflare Workers, D1, R2. ~14 KB gzipped.</dd>
          <dt>Mailing list</dt><dd>None. By design.</dd>
          <dt>Comments</dt><dd>None. Reply by mail.</dd>
        </dl>
      </aside>
    </div>
  `;
  return page({
    title: "About \u2014 vwwwv",
    description: `About the author of vwwwv.org.`,
    activeNav: "about",
    wordmarkVariant,
    edition: "Statement of intent \xB7 No. 01",
    pageStyles: aboutStyles,
    body
  });
}
__name(renderAbout, "renderAbout");
var aboutStyles = `
  .about-hero, .about-grid { max-width: 880px; }
  .about-hero { padding: 48px 0 32px; }
  .about-hero h1 { font-size: clamp(48px, 7vw, 96px); }
  .about-hero .lead { margin-top: 18px; font-size: 22px; line-height: 1.4; max-width: 32em; color: var(--ink); }

  .about-grid { display: grid; grid-template-columns: 1fr 220px; gap: 48px; padding-top: 22px; }
  @media (max-width: 760px) { .about-grid { grid-template-columns: 1fr; } }

  .about-prose { font-size: 17px; line-height: 1.62; color: var(--ink); }
  .about-prose p { margin: 0 0 1em; text-wrap: pretty; }
  .about-prose p:first-child::first-letter {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 4.2em;
    line-height: .85;
    float: left;
    padding: 4px 10px 0 0;
    color: var(--poster-red);
  }
  .about-prose h2 { margin: 28px 0 8px; font-size: 22px; }

  .facts dt {
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .1em;
    color: var(--poster-red);
    margin-top: 14px;
  }
  .facts dt:first-child { margin-top: 0; }
  .facts dd { margin: 2px 0 0; color: var(--ink); font-size: 14px; }
`;

// src/render/tag-cloud.ts
function renderTagCloud(opts) {
  const { tags, postsByTag, showReadingTime, wordmarkVariant, totalPosts } = opts;
  const editionLine = `The Index \xB7 ${totalPosts} post${totalPosts === 1 ? "" : "s"} \xB7 ${tags.length} tag${tags.length === 1 ? "" : "s"}`;
  const cloudCards = tags.map(
    (t) => `
        <a class="tag-card" href="#${encodeURIComponent(t.name)}">
          <span class="tag-card__count">${String(t.count).padStart(2, "0")}</span>
          <span class="tag-card__name">${escapeHtml(t.name)}</span>
          <span class="tag-card__meta">${escapeHtml(meta(t.name))}</span>
        </a>`
  ).join("");
  const sections = tags.map((t) => {
    const posts = postsByTag[t.name] ?? [];
    const rows = posts.map((p) => `
          <div class="tag-list">
            <span class="tag-list__date">${escapeHtml(formatDateLong(p.published_at ?? p.created_at))}</span>
            <span class="tag-list__title"><a href="/post/${escapeAttr(p.slug)}">${escapeHtml(p.title)}</a></span>
            <span class="tag-list__tags">${p.tags.map(
      (tn, i) => `<span class="tag tag--${i === 0 ? "filled" : "outline"}">${escapeHtml(tn)}</span>`
    ).join(" ")}</span>
            <span class="tag-list__read">${escapeHtml(showReadingTime ? formatReadingTime(p.body) : "")}</span>
          </div>`).join("");
    return `
        <div class="section-head" id="${escapeAttr(t.name)}">
          <h2>${escapeHtml(t.name)}</h2>
          <span class="meta">${t.count} entr${t.count === 1 ? "y" : "ies"}</span>
        </div>
        ${rows || `<p class="meta" style="padding: 12px 0">No posts yet.</p>`}
      `;
  }).join("");
  const body = `
    <section class="tag-hero">
      <div class="meta" style="color: var(--poster-red); margin-bottom: 14px;">${escapeHtml(editionLine)}</div>
      <h1>Everything, filed.</h1>
      <p class="lead">An honest table of contents. The numbers are the entries. The tags are how I think about them; they are not promises about what they contain.</p>
    </section>

    <div class="tag-cloud">
      ${cloudCards || `<p class="meta" style="padding: 24px;">No tags yet.</p>`}
    </div>

    ${sections}
  `;
  return page({
    title: "Tag \u2014 vwwwv",
    description: "Browse vwwwv.org by tag.",
    activeNav: "tag",
    wordmarkVariant,
    edition: editionLine,
    pageStyles: tagStyles,
    body
  });
}
__name(renderTagCloud, "renderTagCloud");
function meta(tagName) {
  const known = {
    trueborn: "Novel \xB7 drafts & fragments",
    code: "Field notes \xB7 post-mortems",
    work: "Field notes \xB7 post-mortems",
    botany: "Cushion plants \xB7 scree gardens",
    abandoned: "Side projects \xB7 honest deaths",
    curiosities: "Found things \xB7 no useful heading",
    writing: "Essays & short pieces",
    opinion: "Strong words \xB7 weak ties"
  };
  return known[tagName.toLowerCase()] ?? "Filed";
}
__name(meta, "meta");
var tagStyles = `
  .tag-hero { padding: 48px 0 24px; }
  .tag-hero h1 { font-size: clamp(48px, 7vw, 96px); }
  .tag-hero .lead { margin-top: 18px; max-width: 36em; color: var(--ink); }

  .tag-cloud {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0;
    border-top: 6px solid var(--ink);
    border-bottom: 2px solid var(--ink);
    position: relative;
    margin: 12px 0 32px;
  }
  .tag-cloud::after {
    content: "";
    position: absolute;
    left: 0; right: 0; bottom: -12px;
    border-top: 2px solid var(--ink);
  }
  .tag-card {
    padding: 22px 24px;
    border-right: 2px solid var(--ink);
    border-bottom: 2px solid var(--ink);
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 180px;
    cursor: pointer;
    text-decoration: none;
  }
  .tag-card:hover { background: var(--ink); color: var(--paper-cream); text-decoration: none; }
  .tag-card:hover .tag-card__name { color: var(--poster-red); }
  .tag-card:hover .tag-card__meta { color: var(--paper-cream); }
  .tag-card__count {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 56px;
    line-height: .9;
    color: var(--poster-red);
  }
  .tag-card__name {
    font-family: var(--font-display);
    font-weight: 700;
    text-transform: uppercase;
    font-size: 24px;
    letter-spacing: .01em;
    color: var(--ink);
  }
  .tag-card__meta {
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .1em;
    color: var(--ink-soft);
    margin-top: auto;
  }

  .tag-list {
    display: grid;
    grid-template-columns: 140px 1fr 200px 80px;
    gap: 16px;
    padding: 14px 0;
    border-bottom: 1px solid var(--ink);
    align-items: baseline;
  }
  .tag-list:hover { background: var(--paper-cream-deep); }
  .tag-list__date {
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .tag-list__title {
    font-family: var(--font-display);
    font-weight: 700;
    text-transform: uppercase;
    font-size: 18px;
    color: var(--ink);
  }
  .tag-list__title a { color: inherit; text-decoration: none; }
  .tag-list__title a:hover { color: var(--poster-red); text-decoration: none; }
  .tag-list__tags { display: flex; gap: 6px; flex-wrap: wrap; }
  .tag-list__read {
    text-align: right;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--ink-soft);
    text-transform: uppercase;
    letter-spacing: .08em;
  }
  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin: 36px 0 12px;
  }
  .section-head h2 { font-size: 28px; }
  .section-head .meta { color: var(--poster-red); }
  @media (max-width: 720px) {
    .tag-list { grid-template-columns: 1fr; gap: 4px; }
    .tag-list__read { text-align: left; }
  }
`;

// src/render/post.ts
function renderPost(opts) {
  const { post, showReadingTime, wordmarkVariant, siteUrl } = opts;
  const body = `
    <main class="feed" id="feed">
      ${postCard(post, { index: 1, showReadingTime, open: true })}
    </main>
  `;
  return page({
    title: `${post.title} \u2014 vwwwv`,
    description: post.excerpt ?? `${post.title}.`,
    activeNav: "blog",
    wordmarkVariant,
    edition: formatEditionLine(post.published_at ?? post.created_at),
    pageStyles: feedPageStyles,
    body,
    canonical: `${siteUrl}/post/${encodeURIComponent(post.slug)}`,
    includeFeedJs: true
  });
}
__name(renderPost, "renderPost");

// src/publish/auth.ts
async function authenticate(request, env) {
  if (request.headers.get("Cf-Access-Jwt-Assertion")) {
    return { ok: true };
  }
  const clientId = request.headers.get("Cf-Access-Client-Id");
  const clientSecret = request.headers.get("Cf-Access-Client-Secret");
  if (clientId && clientSecret) {
    if (timingSafeEqual(clientId, env.CF_ACCESS_CLIENT_ID ?? "") && timingSafeEqual(clientSecret, env.CF_ACCESS_CLIENT_SECRET ?? "")) {
      return { ok: true };
    }
    return { ok: false, reason: "invalid service-token credentials" };
  }
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (timingSafeEqual(token, env.CF_ACCESS_CLIENT_SECRET ?? "")) {
      return { ok: true };
    }
    return { ok: false, reason: "invalid bearer token" };
  }
  return { ok: false, reason: "no credentials" };
}
__name(authenticate, "authenticate");
function unauthorizedResponse(reason) {
  return new Response(JSON.stringify({ error: "unauthorized", reason }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": 'Bearer realm="vwwwv"'
    }
  });
}
__name(unauthorizedResponse, "unauthorizedResponse");
function timingSafeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) {
    r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return r === 0;
}
__name(timingSafeEqual, "timingSafeEqual");

// src/publish/images.ts
async function uploadImage(env, input) {
  if (!input.filename) throw new Error("filename required");
  if (!input.content_base64) throw new Error("content_base64 required");
  const bytes = base64ToBytes(input.content_base64);
  const id = ulid();
  const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
  const r2_key = input.post_id ? `posts/${input.post_id}/${id}-${safeName}` : `library/${id}-${safeName}`;
  const contentType = guessContentType(safeName);
  await env.IMAGES.put(r2_key, bytes, {
    httpMetadata: { contentType }
  });
  await queries_exports.createImage(env.DB, {
    id,
    post_id: input.post_id ?? null,
    filename: safeName,
    r2_key,
    alt: input.alt ?? null,
    caption: input.caption ?? null,
    width: input.width ?? null,
    height: input.height ?? null,
    bytes: bytes.byteLength,
    source_type: input.source_type ?? "upload"
  });
  return {
    id,
    r2_key,
    url: `/img/${r2_key}`,
    bytes: bytes.byteLength
  };
}
__name(uploadImage, "uploadImage");
async function deleteImage2(env, id) {
  const img = await queries_exports.getImage(env.DB, id);
  if (!img) return false;
  await env.IMAGES.delete(img.r2_key);
  await queries_exports.deleteImage(env.DB, id);
  return true;
}
__name(deleteImage2, "deleteImage");
function listImages2(env, postId) {
  return queries_exports.listImages(env.DB, postId);
}
__name(listImages2, "listImages");
function base64ToBytes(b64) {
  const clean = b64.replace(/^data:[^;]+;base64,/, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
__name(base64ToBytes, "base64ToBytes");
function guessContentType(filename) {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  const map = {
    webp: "image/webp",
    avif: "image/avif",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    svg: "image/svg+xml"
  };
  return map[ext] ?? "application/octet-stream";
}
__name(guessContentType, "guessContentType");

// src/publish/handlers.ts
async function handleApi(request, env, _ctx) {
  const auth = await authenticate(request, env);
  if (!auth.ok) return unauthorizedResponse(auth.reason);
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === "/api/flags" || path.startsWith("/api/flags/")) {
    return handleAdminFlags({
      flags: flagsFor(env, request),
      request,
      url,
      cookieSecret: env.FLAG_COOKIE_SECRET
    });
  }
  if (path === "/api/drafts" && request.method === "GET") {
    const posts = await queries_exports.listPosts(env.DB, { status: "draft", limit: 200 });
    return jsonResponse(posts);
  }
  if (path === "/api/posts") {
    if (request.method === "GET") return listPostsHandler(request, env);
    if (request.method === "POST") return createPostHandler(request, env);
    return methodNotAllowed2();
  }
  const postSubMatch = path.match(/^\/api\/posts\/([^/]+)(?:\/(publish|unpublish|revisions|revert))?\/?$/);
  if (postSubMatch?.[1]) {
    const slug = decodeURIComponent(postSubMatch[1]);
    const subroute = postSubMatch[2];
    if (!subroute) {
      if (request.method === "GET") return getPostHandler(env, slug);
      if (request.method === "PUT") return updatePostHandler(request, env, slug);
      if (request.method === "DELETE") return deletePostHandler(env, slug);
      return methodNotAllowed2();
    }
    if (request.method !== "POST" && subroute !== "revisions")
      return methodNotAllowed2();
    if (subroute === "publish") return setStatusHandler(env, slug, "published");
    if (subroute === "unpublish") return setStatusHandler(env, slug, "draft");
    if (subroute === "revisions") {
      if (request.method !== "GET") return methodNotAllowed2();
      return listRevisionsHandler(env, slug);
    }
    if (subroute === "revert") return revertHandler(request, env, slug);
  }
  if (path === "/api/images") {
    if (request.method === "GET") {
      const postId = url.searchParams.get("post_id");
      const imgs = await listImages2(env, postId);
      return jsonResponse(imgs);
    }
    if (request.method === "POST") return uploadImageHandler(request, env);
    return methodNotAllowed2();
  }
  const imgMatch = path.match(/^\/api\/images\/([^/]+)\/?$/);
  if (imgMatch?.[1]) {
    if (request.method !== "DELETE") return methodNotAllowed2();
    const ok = await deleteImage2(env, decodeURIComponent(imgMatch[1]));
    return new Response(null, { status: ok ? 204 : 404 });
  }
  return new Response("Not Found", { status: 404 });
}
__name(handleApi, "handleApi");
async function listPostsHandler(request, env) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const tag2 = url.searchParams.get("tag");
  const limit = parseIntOrDefault(url.searchParams.get("limit"), 50);
  const offset = parseIntOrDefault(url.searchParams.get("offset"), 0);
  const posts = await queries_exports.listPosts(env.DB, {
    status: status ?? ["draft", "published", "archived"],
    ...tag2 ? { tag: tag2 } : {},
    limit,
    offset
  });
  return jsonResponse(posts);
}
__name(listPostsHandler, "listPostsHandler");
async function createPostHandler(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || typeof body.body !== "string") {
    return jsonError2(400, "title and body are required");
  }
  const slug = body.slug?.trim() || slugify(body.title);
  if (!slug) return jsonError2(400, "slug could not be derived from title");
  const id = ulid();
  await queries_exports.createPost(env.DB, {
    id,
    slug,
    title: body.title,
    body: body.body,
    excerpt: body.excerpt ?? null,
    status: body.status ?? "draft",
    author_id: body.author_id ?? env.DEFAULT_AUTHOR_ID,
    tags: body.tags ?? [],
    featured_image_id: body.featured_image_id ?? null
  });
  const created = await queries_exports.getPostBySlug(env.DB, slug, { includeDrafts: true });
  return jsonResponse(created, 201);
}
__name(createPostHandler, "createPostHandler");
async function getPostHandler(env, slug) {
  const post = await queries_exports.getPostBySlug(env.DB, slug, { includeDrafts: true });
  return post ? jsonResponse(post) : new Response("Not Found", { status: 404 });
}
__name(getPostHandler, "getPostHandler");
async function updatePostHandler(request, env, slug) {
  const post = await queries_exports.getPostBySlug(env.DB, slug, { includeDrafts: true });
  if (!post) return new Response("Not Found", { status: 404 });
  const body = await request.json().catch(() => null);
  if (!body) return jsonError2(400, "JSON body required");
  await queries_exports.updatePost(
    env.DB,
    post.id,
    {
      ...body.slug !== void 0 ? { slug: body.slug } : {},
      ...body.title !== void 0 ? { title: body.title } : {},
      ...body.body !== void 0 ? { body: body.body } : {},
      ...body.excerpt !== void 0 ? { excerpt: body.excerpt } : {},
      ...body.status !== void 0 ? { status: body.status } : {},
      ...body.featured_image_id !== void 0 ? { featured_image_id: body.featured_image_id } : {},
      ...body.tags !== void 0 ? { tags: body.tags } : {}
    },
    body.message ?? null
  );
  const newSlug = body.slug ?? slug;
  const fresh = await queries_exports.getPostBySlug(env.DB, newSlug, { includeDrafts: true });
  return jsonResponse(fresh);
}
__name(updatePostHandler, "updatePostHandler");
async function deletePostHandler(env, slug) {
  const post = await queries_exports.getPostBySlug(env.DB, slug, { includeDrafts: true });
  if (!post) return new Response("Not Found", { status: 404 });
  await queries_exports.deletePost(env.DB, post.id);
  return new Response(null, { status: 204 });
}
__name(deletePostHandler, "deletePostHandler");
async function setStatusHandler(env, slug, status) {
  const post = await queries_exports.getPostBySlug(env.DB, slug, { includeDrafts: true });
  if (!post) return new Response("Not Found", { status: 404 });
  await queries_exports.updatePost(env.DB, post.id, { status });
  const fresh = await queries_exports.getPostBySlug(env.DB, slug, { includeDrafts: true });
  return jsonResponse(fresh);
}
__name(setStatusHandler, "setStatusHandler");
async function listRevisionsHandler(env, slug) {
  const post = await queries_exports.getPostBySlug(env.DB, slug, { includeDrafts: true });
  if (!post) return new Response("Not Found", { status: 404 });
  const revs = await queries_exports.listRevisions(env.DB, post.id);
  return jsonResponse(revs);
}
__name(listRevisionsHandler, "listRevisionsHandler");
async function revertHandler(request, env, slug) {
  const body = await request.json().catch(() => null);
  if (!body?.revision_id) return jsonError2(400, "revision_id required");
  const post = await queries_exports.getPostBySlug(env.DB, slug, { includeDrafts: true });
  if (!post) return new Response("Not Found", { status: 404 });
  const rev = await queries_exports.getRevision(env.DB, body.revision_id);
  if (!rev || rev.post_id !== post.id)
    return jsonError2(404, "revision not found for this post");
  await queries_exports.updatePost(
    env.DB,
    post.id,
    { title: rev.title, body: rev.body },
    `Reverted to revision ${rev.id}`
  );
  const fresh = await queries_exports.getPostBySlug(env.DB, slug, { includeDrafts: true });
  return jsonResponse(fresh);
}
__name(revertHandler, "revertHandler");
async function uploadImageHandler(request, env) {
  const body = await request.json().catch(() => null);
  if (!body?.filename || !body.content_base64) {
    return jsonError2(400, "filename and content_base64 required");
  }
  try {
    const result = await uploadImage(env, body);
    return jsonResponse(result, 201);
  } catch (err) {
    return jsonError2(400, err.message);
  }
}
__name(uploadImageHandler, "uploadImageHandler");
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(jsonResponse, "jsonResponse");
function jsonError2(status, error) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(jsonError2, "jsonError");
function methodNotAllowed2() {
  return new Response("Method Not Allowed", { status: 405 });
}
__name(methodNotAllowed2, "methodNotAllowed");
function parseIntOrDefault(raw, def2) {
  if (!raw) return def2;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : def2;
}
__name(parseIntOrDefault, "parseIntOrDefault");

// src/router.ts
var HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  // Short edge cache; revalidated frequently. We don't try to do clever
  // tag-based purging in v1 — the worker is fast enough that re-rendering
  // every minute is fine.
  "Cache-Control": "public, max-age=60, s-maxage=60"
};
async function route(request, env, ctx) {
  const url = new URL(request.url);
  const { pathname } = url;
  if (request.method === "GET" || request.method === "HEAD") {
    if (pathname === "/") return handleFeedHome(request, env);
    if (pathname === "/about") return handleAboutPage(request, env);
    if (pathname === "/tag" || pathname === "/tag/") return handleTagCloudPage(request, env);
    const tagMatch = pathname.match(/^\/tag\/([^/]+)\/?$/);
    if (tagMatch?.[1]) return handleTagFilter(request, env, decodeURIComponent(tagMatch[1]));
    const postMatch = pathname.match(/^\/post\/([^/]+)\/?$/);
    if (postMatch?.[1]) return handlePostPage(request, env, decodeURIComponent(postMatch[1]));
    if (pathname.startsWith("/img/")) {
      return handleImage(env, pathname.slice("/img/".length));
    }
    if (pathname === "/robots.txt") {
      return new Response(`User-agent: *
Allow: /
Sitemap: ${env.SITE_URL}/sitemap.xml
`, {
        headers: { "Content-Type": "text/plain" }
      });
    }
    if (pathname === "/sitemap.xml") {
      return handleSitemap(env);
    }
  }
  if (pathname.startsWith("/api/")) {
    return handleApi(request, env, ctx);
  }
  return env.ASSETS.fetch(request);
}
__name(route, "route");
async function handleFeedHome(request, env) {
  const flags = await loadFlags(env, request);
  const posts = await queries_exports.listPosts(env.DB, { limit: 50 });
  const html2 = renderFeed({
    posts,
    showReadingTime: flags.readingTime,
    wordmarkVariant: flags.wordmarkVariant
  });
  return new Response(html2, { headers: HTML_HEADERS });
}
__name(handleFeedHome, "handleFeedHome");
async function handleAboutPage(request, env) {
  const flags = await loadFlags(env, request);
  const author = await queries_exports.getAuthor(env.DB, env.DEFAULT_AUTHOR_ID);
  if (!author) {
    return new Response("Author not configured. Run the migration to seed.", {
      status: 500
    });
  }
  const html2 = renderAbout({ author, wordmarkVariant: flags.wordmarkVariant });
  return new Response(html2, { headers: HTML_HEADERS });
}
__name(handleAboutPage, "handleAboutPage");
async function handleTagCloudPage(request, env) {
  const flags = await loadFlags(env, request);
  const tags = await queries_exports.listAllTags(env.DB, { onlyPublished: true });
  const postsByTag = {};
  let totalPosts = 0;
  await Promise.all(
    tags.map(async (tag2) => {
      const posts = await queries_exports.listPosts(env.DB, { tag: tag2.name, limit: 20 });
      postsByTag[tag2.name] = posts;
    })
  );
  for (const tag2 of tags) totalPosts += postsByTag[tag2.name]?.length ?? 0;
  const html2 = renderTagCloud({
    tags,
    postsByTag,
    showReadingTime: flags.readingTime,
    wordmarkVariant: flags.wordmarkVariant,
    totalPosts
  });
  return new Response(html2, { headers: HTML_HEADERS });
}
__name(handleTagCloudPage, "handleTagCloudPage");
async function handleTagFilter(request, env, tagName) {
  const flags = await loadFlags(env, request);
  const posts = await queries_exports.listPosts(env.DB, { tag: tagName, limit: 50 });
  const html2 = renderFeed({
    posts,
    showReadingTime: flags.readingTime,
    wordmarkVariant: flags.wordmarkVariant,
    tagFilter: tagName
  });
  return new Response(html2, { headers: HTML_HEADERS });
}
__name(handleTagFilter, "handleTagFilter");
async function handlePostPage(request, env, slug) {
  const flags = await loadFlags(env, request);
  const post = await queries_exports.getPostBySlug(env.DB, slug);
  if (!post) return new Response("Not Found", { status: 404 });
  const html2 = renderPost({
    post,
    showReadingTime: flags.readingTime,
    wordmarkVariant: flags.wordmarkVariant,
    siteUrl: env.SITE_URL
  });
  return new Response(html2, { headers: HTML_HEADERS });
}
__name(handlePostPage, "handlePostPage");
async function handleImage(env, key) {
  if (!key || key.includes("..")) return new Response("Bad Request", { status: 400 });
  const obj = await env.IMAGES.get(key);
  if (!obj) return new Response("Not Found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set(
    "Cache-Control",
    "public, max-age=31536000, immutable, stale-while-revalidate=86400"
  );
  headers.set("ETag", obj.httpEtag);
  return new Response(obj.body, { headers });
}
__name(handleImage, "handleImage");
async function handleSitemap(env) {
  const posts = await queries_exports.listPosts(env.DB, { limit: 1e3 });
  const tags = await queries_exports.listAllTags(env.DB, { onlyPublished: true });
  const urls = [
    `${env.SITE_URL}/`,
    `${env.SITE_URL}/about`,
    `${env.SITE_URL}/tag`,
    ...tags.map((t) => `${env.SITE_URL}/tag/${encodeURIComponent(t.name)}`),
    ...posts.map((p) => `${env.SITE_URL}/post/${encodeURIComponent(p.slug)}`)
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
` + urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n") + `
</urlset>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
__name(handleSitemap, "handleSitemap");

// src/index.ts
var index_default = {
  async fetch(request, env, ctx) {
    try {
      return await route(request, env, ctx);
    } catch (err) {
      console.error("worker error", err);
      const isDev = env.SITE_URL.includes("workers.dev") || env.SITE_URL.includes("localhost");
      return new Response(
        isDev ? `${err.message}

${err.stack ?? ""}` : "Internal Server Error",
        { status: 500, headers: { "Content-Type": "text/plain" } }
      );
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
