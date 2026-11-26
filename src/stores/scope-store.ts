import { create } from 'zustand';

import type { Scope } from '@/features/household/scope';

type ScopeState = {
  /** Personal / shared view, shared by Movimientos and Análisis (not persisted). */
  scope: Scope;
  setScope: (scope: Scope) => void;
};

export const useScopeStore = create<ScopeState>((set) => ({
  scope: 'all',
  setScope: (scope) => set({ scope }),
}));
