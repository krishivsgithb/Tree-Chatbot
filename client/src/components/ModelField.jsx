import { useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

function ModelField() {
  const { provider, model, setModel } = useSettings();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const cancelled = useRef(false);

  const start = () => {
    cancelled.current = false;
    setDraft(model);
    setEditing(true);
  };

  const commit = () => {
    if (!cancelled.current) setModel(provider, draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        className="model-input"
        autoFocus
        value={draft}
        aria-label="Model name"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            cancelled.current = true;
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button type="button" className="model-btn" onClick={start} title="Edit model name">
      {model}
      <Pencil size={13} />
    </button>
  );
}

export default ModelField;