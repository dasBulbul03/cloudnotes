import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import type { Note } from '../types';

interface UseNotesReturn {
  notes: Note[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  refresh: () => Promise<void>;
  createNote: (title: string, content: string) => Promise<Note>;
  updateNote: (id: number, title: string, content: string) => Promise<Note>;
  deleteNote: (id: number) => Promise<void>;
}

export function useNotes(): UseNotesReturn {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQueryState] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeQuery = useRef('');

  const fetchNotes = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getNotes(query || undefined);
      setNotes(data.notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search — waits 300 ms after the last keystroke
  const setSearchQuery = useCallback((q: string) => {
    setSearchQueryState(q);
    activeQuery.current = q;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchNotes(q);
    }, 300);
  }, [fetchNotes]);

  // Initial load
  useEffect(() => {
    fetchNotes('');
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [fetchNotes]);

  const refresh = useCallback(() => fetchNotes(activeQuery.current), [fetchNotes]);

  const createNote = useCallback(async (title: string, content: string): Promise<Note> => {
    const { note } = await api.createNote({ title, content });
    await refresh();
    return note;
  }, [refresh]);

  const updateNote = useCallback(async (id: number, title: string, content: string): Promise<Note> => {
    const { note } = await api.updateNote(id, { title, content });
    setNotes(prev => prev.map(n => n.id === id ? note : n));
    return note;
  }, []);

  const deleteNote = useCallback(async (id: number): Promise<void> => {
    await api.deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    notes,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    refresh,
    createNote,
    updateNote,
    deleteNote,
  };
}
