import { useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { PROVIDERS } from '../config/providers';
import { useSettings } from '../hooks/useSettings';
import { useOnClickOutside } from '../hooks/useOnClickOutside';

function ProviderMenu() {
  const { provider, providerConfig, hasKey, setProvider, openKeyModal } = useSettings();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false), open);

  const pick = (id) => {
    setProvider(id);
    setOpen(false);
    if (!hasKey(id)) openKeyModal(id);
  };

  const Icon = providerConfig.icon;

  return (
    <div className="menu-wrap" ref={ref}>
      <button
        type="button"
        className="provider-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon size={15} className="accent" />
        {providerConfig.label}
        <ChevronDown size={14} className={`chev ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div className="menu" role="listbox">
          <div className="menu-title">CHOOSE A PROVIDER</div>
          {Object.entries(PROVIDERS).map(([id, p]) => {
            const PIcon = p.icon;
            return (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={id === provider}
                className={`menu-item ${id === provider ? 'active' : ''}`}
                onClick={() => pick(id)}
              >
                <PIcon size={15} className="accent" />
                <span className="grow">{p.label}</span>
                {!hasKey(id) && <span className="menu-hint">Add key</span>}
                {id === provider && <Check size={14} className="accent" />}
              </button>
            );
          })}
          <div className="menu-foot">Each provider uses its own API key.</div>
        </div>
      )}
    </div>
  );
}

export default ProviderMenu;