import type { Notification } from '../types';

interface NotificationToastProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

export function NotificationToast({ notifications, onRemove }: NotificationToastProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite" aria-label="Notifications">
      {notifications.map(n => (
        <div key={n.id} className={`toast toast-${n.type}`} role="status">
          <span className="toast-message">{n.message}</span>
          <button
            className="toast-close"
            onClick={() => onRemove(n.id)}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
