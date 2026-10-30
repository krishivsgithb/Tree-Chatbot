import { AlertCircle, X } from 'lucide-react';
import { useChain } from '../hooks/useChain';
import { useSettings } from '../hooks/useSettings';

function ErrorBanner() {
  const { banner, dismissBanner } = useChain();
  const { provider, openKeyModal } = useSettings();
  if (!banner) return null;

  return (
    <div className="banner" role="alert">
      <AlertCircle size={16} />
      <div className="grow">
        <strong>{banner.title}</strong>
        <span>{banner.message}</span>
      </div>
      {banner.kind === 'key' && (
        <button
          type="button"
          className="link-btn danger"
          onClick={() => {
            openKeyModal(provider);
            dismissBanner();
          }}
        >
          Change key
        </button>
      )}
      <button type="button" className="btn icon-btn" aria-label="Dismiss" onClick={dismissBanner}>
        <X size={16} />
      </button>
    </div>
  );
}

export default ErrorBanner;