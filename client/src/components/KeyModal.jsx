import { useEffect, useState } from 'react';
import { Check, ExternalLink, Eye, EyeOff, KeyRound, ShieldCheck, X } from 'lucide-react';
import { PROVIDERS } from '../config/providers';
import { useSettings } from '../hooks/useSettings';

function KeyModalBody({ providerId, onClose }) {
  const { keys, models, saveKey, setModel } = useSettings();
  const cfg = PROVIDERS[providerId];
  const Icon = cfg.icon;

  const [key, setKey] = useState(keys[providerId] || '');
  const [modelName, setModelName] = useState(models[providerId] || cfg.defaultModel);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canSave = key.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    saveKey(providerId, key);
    setModel(providerId, modelName);
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="key-title">
        <div className="modal-head">
          <span className="modal-icon">
            <KeyRound size={18} />
          </span>
          <button type="button" className="btn icon-btn" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <h3 id="key-title">Connect your API key</h3>
        <p className="modal-sub">
          Bring your own key to start exploring. You’re in control of your provider and usage.
        </p>

        <div className="field-row">
          <label htmlFor="api-key">{cfg.label} API key</label>
          <span className="badge">
            <Icon size={13} /> {cfg.label}
          </span>
        </div>
        <div className="input-wrap">
          <input
            id="api-key"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            type={show ? 'text' : 'password'}
            value={key}
            placeholder={`Paste your ${cfg.label} API key`}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          <button
            type="button"
            className="btn icon-btn"
            aria-label={show ? 'Hide key' : 'Show key'}
            onClick={() => setShow((s) => !s)}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <a className="key-link" href={cfg.keyUrl} target="_blank" rel="noreferrer">
          Get a key from {cfg.keySource} <ExternalLink size={12} />
        </a>

        <div className="field-row">
          <label htmlFor="model-name">Model (optional)</label>
        </div>
        <input
          id="model-name"
          className="plain-input"
          autoComplete="off"
          spellCheck={false}
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />

        <div className="notice">
          <ShieldCheck size={16} />
          <div>
            <strong>Stored only in your browser</strong>
            Your key is sent through our server to reach {cfg.label} and is never saved. Remove it
            anytime from the toolbar.
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={!canSave} onClick={save}>
            <Check size={16} /> Save API key
          </button>
        </div>
      </div>
    </div>
  );
}

function KeyModal() {
  const { keyModalFor, closeKeyModal } = useSettings();
  if (!keyModalFor) return null;
  return <KeyModalBody key={keyModalFor} providerId={keyModalFor} onClose={closeKeyModal} />;
}

export default KeyModal;