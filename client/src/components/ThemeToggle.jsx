import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      className="theme-toggle"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <span className="tt-knob" />
      <Sun size={14} className="tt-icon tt-sun" />
      <Moon size={14} className="tt-icon tt-moon" />
    </button>
  );
}

export default ThemeToggle;