import { useState } from 'react';
import { useNotes } from './hooks/useNotes';
import { useNotifications } from './hooks/useNotifications';
import { NoteCard } from './components/NoteCard';
import { NoteModal } from './components/NoteModal';
import { DeleteConfirm } from './components/DeleteConfirm';
import { NotificationToast } from './components/NotificationToast';
import { DashboardStats } from './components/DashboardStats';
import { SearchBar } from './components/SearchBar';
import type { Note } from './types';

type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; note: Note }
  | { type: 'delete'; note: Note };

export default function App() {
  const { notes, isLoading, error, searchQuery, setSearchQuery, createNote, updateNote, deleteNote } = useNotes();
  const { notifications, addNotification, removeNotification } = useNotifications();
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(title: string, content: string) {
    setIsSaving(true);
    try {
      if (modal.type === 'create') {
        await createNote(title, content);
        addNotification('✅ Note created successfully!', 'success');
      } else if (modal.type === 'edit') {
        await updateNote(modal.note.id, title, content);
        addNotification('✅ Note updated successfully!', 'success');
      }
      setModal({ type: 'none' });
    } catch (err) {
      addNotification(
        `❌ ${err instanceof Error ? err.message : 'Failed to save note'}`,
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (modal.type !== 'delete') return;
    setIsSaving(true);
    try {
      await deleteNote(modal.note.id);
      addNotification('🗑️ Note deleted.', 'info');
      setModal({ type: 'none' });
    } catch (err) {
      addNotification(
        `❌ ${err instanceof Error ? err.message : 'Failed to delete note'}`,
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  }

  const recentNotes = [...notes].slice(0, 3);

  return (
    <div className="app">
      {/* ── Sidebar / Top Nav ───────────────────────────────── */}
      <header className="topnav">
        <div className="topnav-brand">
          <span className="brand-logo" aria-hidden="true">☁️</span>
          <span className="brand-name">CloudNotes</span>
          <span className="brand-badge">Free</span>
        </div>
        <nav className="topnav-links" aria-label="Main navigation">
          <span className="topnav-notice">
            🔓 Public demo — do not store sensitive data
          </span>
        </nav>
        <button
          className="btn btn-primary"
          onClick={() => setModal({ type: 'create' })}
          aria-label="Create new note"
        >
          + New Note
        </button>
      </header>

      {/* ── Main content ────────────────────────────────────── */}
      <main className="main-content">
        <div className="dashboard">

          {/* Welcome banner */}
          <section className="dashboard-hero" aria-labelledby="dashboard-heading">
            <h1 id="dashboard-heading" className="dashboard-title">
              Welcome to CloudNotes
            </h1>
            <p className="dashboard-subtitle">
              Your notes, stored on Cloudflare's global edge — fast, free, and simple.
            </p>
          </section>

          {/* Stats */}
          <DashboardStats total={notes.length} isLoading={isLoading} />

          {/* Search */}
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            resultCount={notes.length}
            isSearching={isLoading}
          />

          {/* Error state */}
          {error && (
            <div className="error-banner" role="alert">
              <span>⚠️ {error}</span>
              <button className="btn btn-sm" onClick={() => setSearchQuery('')}>
                Retry
              </button>
            </div>
          )}

          {/* Notes grid */}
          <section aria-labelledby="notes-heading">
            <div className="section-header">
              <h2 id="notes-heading" className="section-title">
                {searchQuery ? `Search results` : 'All Notes'}
                {!isLoading && (
                  <span className="section-count">({notes.length})</span>
                )}
              </h2>
            </div>

            {isLoading ? (
              <div className="notes-grid" aria-busy="true" aria-label="Loading notes">
                {[1, 2, 3].map(i => (
                  <div key={i} className="note-card skeleton-card">
                    <div className="skeleton skeleton-title" />
                    <div className="skeleton skeleton-line" />
                    <div className="skeleton skeleton-line skeleton-short" />
                  </div>
                ))}
              </div>
            ) : notes.length === 0 ? (
              <div className="empty-state" role="status">
                <div className="empty-icon" aria-hidden="true">📭</div>
                {searchQuery ? (
                  <>
                    <h3 className="empty-title">No notes found</h3>
                    <p className="empty-desc">No notes match &ldquo;{searchQuery}&rdquo;</p>
                    <button className="btn btn-secondary" onClick={() => setSearchQuery('')}>
                      Clear search
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="empty-title">No notes yet</h3>
                    <p className="empty-desc">Create your first note to get started!</p>
                    <button
                      className="btn btn-primary"
                      onClick={() => setModal({ type: 'create' })}
                    >
                      + Create First Note
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="notes-grid">
                {notes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={n => setModal({ type: 'edit', note: n })}
                    onDelete={n => setModal({ type: 'delete', note: n })}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Recent notes sidebar strip (shown when there are many notes) */}
          {!searchQuery && notes.length > 3 && (
            <section className="recent-section" aria-labelledby="recent-heading">
              <h2 id="recent-heading" className="section-title">Recent Notes</h2>
              <div className="recent-list">
                {recentNotes.map(note => (
                  <button
                    key={note.id}
                    className="recent-item"
                    onClick={() => setModal({ type: 'edit', note })}
                    aria-label={`Open note: ${note.title}`}
                  >
                    <span className="recent-title">{note.title}</span>
                    <span className="recent-time">{new Date(note.updated_at).toLocaleDateString()}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* ── Modals ──────────────────────────────────────────── */}
      {(modal.type === 'create' || modal.type === 'edit') && (
        <NoteModal
          mode={modal.type}
          note={modal.type === 'edit' ? modal.note : undefined}
          onSave={handleSave}
          onClose={() => !isSaving && setModal({ type: 'none' })}
          isSaving={isSaving}
        />
      )}

      {modal.type === 'delete' && (
        <DeleteConfirm
          note={modal.note}
          onConfirm={handleDelete}
          onCancel={() => !isSaving && setModal({ type: 'none' })}
          isDeleting={isSaving}
        />
      )}

      {/* ── Notifications ────────────────────────────────────── */}
      <NotificationToast
        notifications={notifications}
        onRemove={removeNotification}
      />

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="app-footer">
        <span>CloudNotes — built on Cloudflare Workers + D1 ·</span>
        <span>🔓 Public demo — do not store private or sensitive data</span>
      </footer>
    </div>
  );
}
