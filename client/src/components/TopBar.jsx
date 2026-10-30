import ProviderMenu from './ProviderMenu';
import ModelField from './ModelField';
import KeyChip from './KeyChip';
import ThemeToggle from './ThemeToggle';

function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="field-group">
          <span className="field-label">PROVIDER</span>
          <ProviderMenu />
        </div>
        <span className="vr" />
        <div className="field-group">
          <span className="field-label">MODEL</span>
          <ModelField />
        </div>
      </div>
      <div className="topbar-right">
        <KeyChip />
        <span className="vr" />
        <ThemeToggle />
      </div>
    </header>
  );
}

export default TopBar;