import type { Note } from '../types';
import { timeAgo, preview } from '../utils/helpers';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
}

export function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  return (
    <article className="note-card" aria-label={`Note: ${note.title}`}>
      <div className="note-card-header">
        <h3 className="note-card-title">{note.title}</h3>
        <div className="note-card-actions">
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => onEdit(note)}
            aria-label={`Edit note: ${note.title}`}
          >
            ✏️ Edit
          </button>
          <button
            className="btn btn-sm btn-danger-ghost"
            onClick={() => onDelete(note)}
            aria-label={`Delete note: ${note.title}`}
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      <p className="note-card-content">{preview(note.content)}</p>

      <div className="note-card-footer">
        <span className="note-meta" title={`Created: ${note.created_at}`}>
          Created {timeAgo(note.created_at)}
        </span>
        {note.updated_at !== note.created_at && (
          <span className="note-meta updated" title={`Updated: ${note.updated_at}`}>
            · Updated {timeAgo(note.updated_at)}
          </span>
        )}
      </div>
    </article>
  );
}
