import { useMonthSpending } from '@/features/budgets/api';
import type { Scope } from '@/features/household/scope';
import { addMonths } from '@/lib/date';

import { useIncomeHistory } from './api';

/** Months shown in the column charts, ending at the selected one. */
export const HISTORY_MONTHS = 6;

/**
 * Spending and income of the 6 months that end at `month` (oldest first), for the
 * given personal / shared `scope`. Fixed number of hooks, so it's safe to call on
 * every render.
 */
export function useSpendingHistory(month: string, scope: Scope = 'all') {
  const months = [5, 4, 3, 2, 1, 0].map((back) => addMonths(month, -back));
  const queries = [
    useMonthSpending(months[0], scope),
    useMonthSpending(months[1], scope),
    useMonthSpending(months[2], scope),
    useMonthSpending(months[3], scope),
    useMonthSpending(months[4], scope),
    useMonthSpending(months[5], scope),
  ];
  const income = useIncomeHistory(months, scope);

  return {
    months: months.map((m, i) => ({
      month: m,
      spending: queries[i].data,
      income: income.data?.[i],
    })),
    isPending: queries[5].isPending || income.isPending,
    error: queries.find((q) => q.error)?.error ?? income.error ?? null,
    isRefetching: queries.some((q) => q.isRefetching) || income.isRefetching,
    refetch: () => {
      queries.forEach((q) => q.refetch());
      income.refetch();
    },
  };
}
