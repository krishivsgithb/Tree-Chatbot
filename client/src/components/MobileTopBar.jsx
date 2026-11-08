import { KeyRound, Menu, Plus } from 'lucide-react';
import ProviderMenu from './ProviderMenu';
import ModelField from './ModelField';
import ThemeToggle from './ThemeToggle';
import { useUI } from '../hooks/useUI';
import { useSettings } from '../hooks/useSettings';
import { useWorkspace } from '../hooks/useWorkspace';

function MobileTopBar() {
  const { openDrawer } = useUI();
  const { apiKey, openKeyModal } = useSettings();
  const { newChat, status } = useWorkspace();

  return (
    <header className="mtop">
      <div className="mtop-row">
        <button type="button" className="btn icon-btn" aria-label="Open menu" onClick={openDrawer}>
          <Menu size={20} />
        </button>
        <span className="mtop-title">Tree Chatbot</span>
        <span className="grow" />
        <ThemeToggle />
        <button
          type="button"
          className="btn icon-btn plus"
          aria-label="New chat"
          disabled={status !== 'ready'}
          onClick={() => newChat(null)}
        >
          <Plus size={20} />
        </button>
      </div>
      <div className="mtop-row sub">
        <ProviderMenu />
        <ModelField />
        <span className="grow" />
        <button
          type="button"
          className="btn icon-btn"
          aria-label={apiKey ? 'Change API key' : 'Add API key'}
          onClick={() => openKeyModal()}
        >
          <KeyRound size={18} className={apiKey ? 'ok' : ''} />
        </button>
      </div>
    </header>
  );
}

export default MobileTopBar;