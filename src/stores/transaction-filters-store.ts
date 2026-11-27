import { create } from 'zustand';

import { EMPTY_FILTERS, type TransactionFilters } from '@/features/transactions/filters';

/** Where the search looks: the month on screen or every movement. */
export type FilterPeriod = 'month' | 'all';

export const FILTER_PERIODS: { value: FilterPeriod; label: string }[] = [
  { value: 'month', label: 'Mes seleccionado' },
  { value: 'all', label: 'Todo el historial' },
];

type TransactionFiltersState = {
  /** Shared by Movimientos and its filters sheet (not persisted). */
  filters: TransactionFilters;
  period: FilterPeriod;
  setFilters: (patch: Partial<TransactionFilters>) => void;
  setPeriod: (period: FilterPeriod) => void;
  /** Clears the filters set in the sheet, keeping the text search. */
  clearFilters: () => void;
  reset: () => void;
};

export const useTransactionFiltersStore = create<TransactionFiltersState>((set) => ({
  filters: EMPTY_FILTERS,
  period: 'month',
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  setPeriod: (period) => set({ period }),
  clearFilters: () => set((s) => ({ filters: { ...EMPTY_FILTERS, query: s.filters.query } })),
  reset: () => set({ filters: EMPTY_FILTERS, period: 'month' }),
}));
