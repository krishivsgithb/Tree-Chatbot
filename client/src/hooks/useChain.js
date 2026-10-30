import { useContext } from 'react';
import { ChainContext } from '../context/chainContext';

export function useChain() {
  const ctx = useContext(ChainContext);
  if (!ctx) throw new Error('useChain must be used inside ChainProvider');
  return ctx;
}