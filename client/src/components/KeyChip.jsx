import { KeyRound } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

function KeyChip() {
  const { apiKey, provider, openKeyModal, removeKey } = useSettings();

  if (!apiKey) {
    return (
      <>
        <span className="chip chip-muted">
          <KeyRound size={14} /> No API key
        </span>
        <button type="button" className="link-btn" onClick={() => openKeyModal()}>
          Add key
        </button>
      </>
    );
  }

  return (
    <>
      <span className="chip">
        <KeyRound size={14} className="ok" /> key saved ••••{apiKey.slice(-4)}
      </span>
      <button type="button" className="link-btn" onClick={() => openKeyModal()}>
        Change
      </button>
      <button type="button" className="link-btn muted" onClick={() => removeKey(provider)}>
        Remove
      </button>
    </>
  );
}

export default KeyChip;