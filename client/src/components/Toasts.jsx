import { AlertCircle, Check, X } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';

function Toasts() {
  const { toasts, dismissToast } = useWorkspace();

  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.kind === 'error' ? 'error' : ''}`}
          role={t.kind === 'error' ? 'alert' : 'status'}
        >
          {t.kind === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
          <span>{t.message}</span>
          {t.undo && (
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                t.undo();
                dismissToast(t.id);
              }}
            >
              Undo
            </button>
          )}
          <button
            type="button"
            className="btn icon-btn"
            aria-label="Dismiss"
            onClick={() => dismissToast(t.id)}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default Toasts;