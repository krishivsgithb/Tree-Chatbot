import { useContext } from 'react';
import { UIContext } from '../context/uiContext';

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside UIProvider');
  return ctx;
}