import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { accountKeys } from '@/features/accounts/api';
import { monthRange } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import type { TablesInsert } from '@/types/database';

const TRANSACTION_SELECT = `
  *,
  account:accounts!transactions_account_id_fkey (id, name, institution, type),
  to_account:accounts!transactions_to_account_id_fkey (id, name, institution, type)
`;

export const transactionKeys = {
  all: ['transactions'] as const,
  month: (month: string) => [...transactionKeys.all, 'month', month] as const,
};

/** Transactions of the month that contains `month` (any `YYYY-MM-DD` in it). */
export function useMonthTransactions(month: string) {
  const { start, end } = monthRange(month);

  return useQuery({
    queryKey: transactionKeys.month(start),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(TRANSACTION_SELECT)
        .gte('occurred_on', start)
        .lte('occurred_on', end)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export type Transaction = NonNullable<ReturnType<typeof useMonthTransactions>['data']>[number];

function useInvalidateMoney() {
  const queryClient = useQueryClient();
  // Balances change through a DB trigger, so accounts must be refetched too.
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
      queryClient.invalidateQueries({ queryKey: accountKeys.all }),
    ]);
}

export function useCreateTransaction() {
  const invalidate = useInvalidateMoney();

  return useMutation({
    mutationFn: async (transaction: TablesInsert<'transactions'>) => {
      const { error } = await supabase.from('transactions').insert(transaction);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateMoney();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
