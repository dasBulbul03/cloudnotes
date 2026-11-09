import type { Note } from '../types';

interface DeleteConfirmProps {
  note: Note;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isDeleting: boolean;
}

export function DeleteConfirm({ note, onConfirm, onCancel, isDeleting }: DeleteConfirmProps) {
  return (
    <div
      className="modal-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-title"
      aria-describedby="delete-desc"
    >
      <div className="modal modal-sm">
        <div className="modal-header">
          <h2 id="delete-title" className="modal-title">🗑️ Delete Note</h2>
        </div>

        <div className="modal-body">
          <p id="delete-desc" className="delete-desc">
            Are you sure you want to delete{' '}
            <strong>&ldquo;{note.title}&rdquo;</strong>?
            <br />
            <span className="delete-warning">This action cannot be undone.</span>
          </p>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isDeleting}
            autoFocus
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? '⏳ Deleting…' : '🗑️ Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
