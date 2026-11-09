// API client — all requests go to /api/* (same origin, no CORS needed in production)
// In local dev with `wrangler dev`, the Worker serves both the SPA and the API.

import type {
  Note,
  NotesResponse,
  NoteResponse,
  CreateNotePayload,
  UpdateNotePayload,
} from '../types';

const BASE = '/api';

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const msg = (errorData as { error?: string }).error ?? `HTTP ${response.status}`;
    throw new Error(msg);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getNotes: (search?: string) => {
    const qs = search ? `?q=${encodeURIComponent(search)}` : '';
    return request<NotesResponse>(`/notes${qs}`);
  },

  getNote: (id: number) =>
    request<NoteResponse>(`/notes/${id}`),

  createNote: (payload: CreateNotePayload) =>
    request<NoteResponse>('/notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateNote: (id: number, payload: UpdateNotePayload) =>
    request<NoteResponse>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteNote: (id: number) =>
    request<{ success: boolean; id: number }>(`/notes/${id}`, {
      method: 'DELETE',
    }),
};

export type { Note };
