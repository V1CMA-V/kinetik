import { useMonthSpending } from '@/features/budgets/api';
import { addMonths } from '@/lib/date';

/** Months shown in the column chart, ending at the selected one. */
export const HISTORY_MONTHS = 6;

/**
 * Spending of the 6 months that end at `month` (oldest first). Fixed number of
 * hooks, so it's safe to call on every render.
 */
export function useSpendingHistory(month: string) {
  const months = [5, 4, 3, 2, 1, 0].map((back) => addMonths(month, -back));
  const queries = [
    useMonthSpending(months[0]),
    useMonthSpending(months[1]),
    useMonthSpending(months[2]),
    useMonthSpending(months[3]),
    useMonthSpending(months[4]),
    useMonthSpending(months[5]),
  ];

  return {
    months: months.map((m, i) => ({ month: m, spending: queries[i].data })),
    isPending: queries[5].isPending,
    error: queries.find((q) => q.error)?.error ?? null,
    isRefetching: queries.some((q) => q.isRefetching),
    refetch: () => queries.forEach((q) => q.refetch()),
  };
}
