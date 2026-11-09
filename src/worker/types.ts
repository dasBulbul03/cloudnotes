// Cloudflare Worker environment bindings
// DB: D1 database binding (server-side only — never exposed to the browser)
// ASSETS: Workers Static Assets binding for serving the React SPA

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNoteBody {
  title: string;
  content: string;
}

export type UpdateNoteBody = Partial<CreateNoteBody>;
