import { useCallback, useEffect, useMemo, useState } from 'react';
import { UIContext } from './uiContext';

export function UIProvider({ children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const value = useMemo(
    () => ({ drawerOpen, openDrawer, closeDrawer }),
    [drawerOpen, openDrawer, closeDrawer]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}