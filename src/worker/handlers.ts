// Notes API handlers — all DB operations use parameterised queries to prevent SQL injection

import type { Env, Note, CreateNoteBody, UpdateNoteBody } from './types';
import {
  jsonResponse,
  errorResponse,
  parseJsonBody,
  extractId,
  validateString,
} from './helpers';

// ─── GET /api/notes ─────────────────────────────────────────────────────────
// Returns all notes ordered by most recently updated.
// Supports optional ?q= search param to filter by title or content.
export async function handleGetNotes(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() ?? '';

  let result: D1Result<Note>;
  try {
    if (query.length > 0) {
      // Parameterised LIKE search — the % wildcards are added server-side,
      // so user input is never concatenated into the SQL string.
      const pattern = `%${query}%`;
      result = await env.DB
        .prepare(
          `SELECT id, title, content, created_at, updated_at
           FROM notes
           WHERE title LIKE ?1 OR content LIKE ?1
           ORDER BY updated_at DESC
           LIMIT 500`
        )
        .bind(pattern)
        .all<Note>();
    } else {
      result = await env.DB
        .prepare(
          `SELECT id, title, content, created_at, updated_at
           FROM notes
           ORDER BY updated_at DESC
           LIMIT 500`
        )
        .all<Note>();
    }
  } catch {
    return errorResponse('Failed to retrieve notes', 500);
  }

  return jsonResponse({ notes: result.results, total: result.results.length });
}

// ─── GET /api/notes/:id ──────────────────────────────────────────────────────
export async function handleGetNote(pathParts: string[], env: Env): Promise<Response> {
  const id = extractId(pathParts);
  if (id === null) return errorResponse('Invalid note ID', 400);

  let note: Note | null;
  try {
    note = await env.DB
      .prepare(
        `SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?`
      )
      .bind(id)
      .first<Note>();
  } catch {
    return errorResponse('Failed to retrieve note', 500);
  }

  if (!note) return errorResponse('Note not found', 404);
  return jsonResponse({ note });
}

// ─── POST /api/notes ─────────────────────────────────────────────────────────
export async function handleCreateNote(request: Request, env: Env): Promise<Response> {
  const body = await parseJsonBody<CreateNoteBody>(request);
  if (!body) return errorResponse('Invalid or oversized request body', 400);

  const titleResult = validateString(body.title, 'title', 500);
  if ('error' in titleResult) return errorResponse(titleResult.error, 400);

  const contentResult = validateString(body.content, 'content', 100_000);
  if ('error' in contentResult) return errorResponse(contentResult.error, 400);

  let result: D1Result;
  try {
    result = await env.DB
      .prepare(
        `INSERT INTO notes (title, content, created_at, updated_at)
         VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%SZ','now'), strftime('%Y-%m-%dT%H:%M:%SZ','now'))
         RETURNING id, title, content, created_at, updated_at`
      )
      .bind(titleResult.value, contentResult.value)
      .all<Note>();
  } catch {
    return errorResponse('Failed to create note', 500);
  }

  const note = result.results[0];
  return jsonResponse({ note }, 201);
}

// ─── PUT /api/notes/:id ──────────────────────────────────────────────────────
export async function handleUpdateNote(
  request: Request,
  pathParts: string[],
  env: Env
): Promise<Response> {
  const id = extractId(pathParts);
  if (id === null) return errorResponse('Invalid note ID', 400);

  const body = await parseJsonBody<UpdateNoteBody>(request);
  if (!body) return errorResponse('Invalid or oversized request body', 400);

  // Require at least one field to update
  if (body.title === undefined && body.content === undefined) {
    return errorResponse('Provide at least one of: title, content', 400);
  }

  // Validate provided fields
  let title: string | undefined;
  let content: string | undefined;

  if (body.title !== undefined) {
    const r = validateString(body.title, 'title', 500);
    if ('error' in r) return errorResponse(r.error, 400);
    title = r.value;
  }
  if (body.content !== undefined) {
    const r = validateString(body.content, 'content', 100_000);
    if ('error' in r) return errorResponse(r.error, 400);
    content = r.value;
  }

  // Build a targeted UPDATE — only set columns that were provided
  const setClauses: string[] = [];
  const bindings: (string | number)[] = [];
  let idx = 1;

  if (title !== undefined) {
    setClauses.push(`title = ?${idx++}`);
    bindings.push(title);
  }
  if (content !== undefined) {
    setClauses.push(`content = ?${idx++}`);
    bindings.push(content);
  }
  setClauses.push(`updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`);
  bindings.push(id);

  let result: D1Result;
  try {
    result = await env.DB
      .prepare(
        `UPDATE notes SET ${setClauses.join(', ')} WHERE id = ?${idx}
         RETURNING id, title, content, created_at, updated_at`
      )
      .bind(...bindings)
      .all<Note>();
  } catch {
    return errorResponse('Failed to update note', 500);
  }

  if (result.results.length === 0) return errorResponse('Note not found', 404);
  return jsonResponse({ note: result.results[0] });
}

// ─── DELETE /api/notes/:id ───────────────────────────────────────────────────
export async function handleDeleteNote(pathParts: string[], env: Env): Promise<Response> {
  const id = extractId(pathParts);
  if (id === null) return errorResponse('Invalid note ID', 400);

  let meta: D1Result;
  try {
    meta = await env.DB
      .prepare(`DELETE FROM notes WHERE id = ?`)
      .bind(id)
      .run();
  } catch {
    return errorResponse('Failed to delete note', 500);
  }

  if (meta.meta.changes === 0) return errorResponse('Note not found', 404);
  return jsonResponse({ success: true, id });
}

// ─── GET /api/health ─────────────────────────────────────────────────────────
export async function handleHealth(env: Env): Promise<Response> {
  let dbOk = false;
  let noteCount = 0;

  try {
    const result = await env.DB
      .prepare(`SELECT COUNT(*) as count FROM notes`)
      .first<{ count: number }>();
    dbOk = true;
    noteCount = result?.count ?? 0;
  } catch {
    dbOk = false;
  }

  return jsonResponse({
    status: dbOk ? 'ok' : 'degraded',
    app: 'CloudNotes',
    version: '1.0.0',
    database: dbOk ? 'connected' : 'unavailable',
    noteCount,
    timestamp: new Date().toISOString(),
    notice: 'Public demonstration application — do not store private or sensitive data.',
  });
}
