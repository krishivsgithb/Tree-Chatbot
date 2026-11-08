import { useCallback, useSyncExternalStore } from 'react';

export const MOBILE_QUERY = '(max-width: 768px)';

export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', onChange);
      return () => m.removeEventListener('change', onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}