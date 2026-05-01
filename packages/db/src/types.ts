// Database row types. Mirror the schema in migrations/0001_initial.sql.
// Numbers are unix-epoch seconds (cheap, sortable, timezone-agnostic).

export type PostStatus = 'draft' | 'published' | 'archived';

export type ImageSourceType =
  | 'upload'
  | 'ai-generated'
  | 'vintage'
  | 'screenshot';

export interface Author {
  id: string;
  name: string;
  subdomain: string | null;
  bio: string | null;
  created_at: number;
}

export interface Post {
  id: string;
  author_id: string;
  slug: string;
  title: string;
  body: string;
  excerpt: string | null;
  status: PostStatus;
  featured_image_id: string | null;
  created_at: number;
  updated_at: number;
  published_at: number | null;
}

export interface Image {
  id: string;
  filename: string;
  r2_key: string;
  alt: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  source_type: ImageSourceType | null;
  uploaded_at: number;
}

export interface Revision {
  id: number;
  post_id: string;
  title: string;
  body: string;
  saved_at: number;
  message: string | null;
}

// Convenience shape for rendering: a post plus its loaded relations.
// queries.getPost / queries.listPosts return this.
export interface PostWithRelations extends Post {
  tags: string[];
  featured_image: Image | null;
  author: Pick<Author, 'id' | 'name'>;
}

// Filters for listPosts. All optional.
export interface ListPostsFilter {
  status?: PostStatus | PostStatus[];
  tag?: string;
  author_id?: string;
  limit?: number;
  offset?: number;
}
