import { useQuery } from '@tanstack/react-query';

import { transactionKeys } from '@/features/transactions/api';
import { monthRange } from '@/lib/date';
import { supabase } from '@/lib/supabase';

export const analysisKeys = {
  /** Under `transactionKeys.all` so money mutations refresh it. */
  income: (start: string, end: string) =>
    [...transactionKeys.all, 'income-history', start, end] as const,
};

/**
 * Income per month for `months` (month starts, oldest first), in one query.
 * Transfers between own accounts never count as income.
 */
export function useIncomeHistory(months: string[]) {
  const start = months[0];
  const { end } = monthRange(months[months.length - 1]);

  return useQuery({
    queryKey: analysisKeys.income(start, end),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, occurred_on')
        .eq('kind', 'income')
        .gte('occurred_on', start)
        .lte('occurred_on', end);
      if (error) throw error;
      return data;
    },
    select: (rows) => {
      const totals = new Map<string, number>(months.map((m) => [m.slice(0, 7), 0]));
      for (const r of rows) {
        const key = r.occurred_on.slice(0, 7);
        totals.set(key, (totals.get(key) ?? 0) + r.amount);
      }
      return months.map((m) => Math.round((totals.get(m.slice(0, 7)) ?? 0) * 100) / 100);
    },
  });
}
