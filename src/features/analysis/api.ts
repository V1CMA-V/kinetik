import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { type Scope, filterByScope } from '@/features/household/scope';
import { transactionKeys } from '@/features/transactions/api';
import { monthRange } from '@/lib/date';
import { supabase } from '@/lib/supabase';

export const analysisKeys = {
  /** Under `transactionKeys.all` so money mutations refresh it. */
  income: (start: string, end: string) =>
    [...transactionKeys.all, 'income-history', start, end] as const,
};

type IncomeRow = {
  amount: number;
  occurred_on: string;
  account: { household_id: string | null } | null;
};

/**
 * Income per month for `months` (month starts, oldest first), in one query,
 * optionally only the personal or the shared part. Transfers between own
 * accounts never count as income.
 */
export function useIncomeHistory(months: string[], scope: Scope = 'all') {
  const start = months[0];
  const { end } = monthRange(months[months.length - 1]);
  const monthsKey = months.join();

  const select = useCallback(
    (rows: IncomeRow[]) => {
      const keys = monthsKey.split(',');
      const totals = new Map<string, number>(keys.map((m) => [m.slice(0, 7), 0]));
      for (const r of filterByScope(rows, scope)) {
        const key = r.occurred_on.slice(0, 7);
        totals.set(key, (totals.get(key) ?? 0) + r.amount);
      }
      return keys.map((m) => Math.round((totals.get(m.slice(0, 7)) ?? 0) * 100) / 100);
    },
    [monthsKey, scope],
  );

  return useQuery({
    queryKey: analysisKeys.income(start, end),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, occurred_on, account:accounts!transactions_account_id_fkey (household_id)')
        .eq('kind', 'income')
        .gte('occurred_on', start)
        .lte('occurred_on', end);
      if (error) throw error;
      return data;
    },
    select,
  });
}
