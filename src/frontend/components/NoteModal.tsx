import React, { useState, useEffect, useRef } from 'react';
import type { Note } from '../types';

interface NoteModalProps {
  mode: 'create' | 'edit';
  note?: Note;
  onSave: (title: string, content: string) => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
}

export function NoteModal({ mode, note, onSave, onClose, isSaving }: NoteModalProps) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});
  const titleRef = useRef<HTMLInputElement>(null);

  // Focus the title field when the modal opens
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isSaving, onClose]);

  function validate(): boolean {
    const newErrors: { title?: string; content?: string } = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    else if (title.trim().length > 500) newErrors.title = 'Title must be under 500 characters';
    if (!content.trim()) newErrors.content = 'Content is required';
    else if (content.trim().length > 100_000) newErrors.content = 'Content is too long';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onSave(title.trim(), content.trim());
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            {mode === 'create' ? '📝 New Note' : '✏️ Edit Note'}
          </h2>
          <button
            className="modal-close"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="note-title" className="form-label">
              Title <span aria-hidden="true">*</span>
            </label>
            <input
              id="note-title"
              ref={titleRef}
              type="text"
              className={`form-input ${errors.title ? 'form-input-error' : ''}`}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Give your note a title…"
              maxLength={500}
              disabled={isSaving}
              aria-required="true"
              aria-describedby={errors.title ? 'title-error' : undefined}
            />
            {errors.title && (
              <span id="title-error" className="form-error" role="alert">{errors.title}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="note-content" className="form-label">
              Content <span aria-hidden="true">*</span>
            </label>
            <textarea
              id="note-content"
              className={`form-textarea ${errors.content ? 'form-input-error' : ''}`}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Start writing your note…"
              rows={10}
              disabled={isSaving}
              aria-required="true"
              aria-describedby={errors.content ? 'content-error' : undefined}
            />
            {errors.content && (
              <span id="content-error" className="form-error" role="alert">{errors.content}</span>
            )}
            <span className="form-hint">{content.length.toLocaleString()} / 100,000 characters</span>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? '⏳ Saving…' : mode === 'create' ? '✅ Create Note' : '✅ Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
