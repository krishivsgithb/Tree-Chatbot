import { useEffect, useState } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // storage unavailable: the theme still works for this visit
    }
  }, [theme]);

  return [theme, setTheme];
}