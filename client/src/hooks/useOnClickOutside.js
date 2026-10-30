import { useEffect } from 'react';

// Calls handler on an outside click or the Escape key, while active
export function useOnClickOutside(ref, handler, active = true) {
  useEffect(() => {
    if (!active) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') handler();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, handler, active]);
}