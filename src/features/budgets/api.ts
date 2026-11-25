import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { transactionKeys } from '@/features/transactions/api';
import { addMonths, monthRange } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database';

import { computeBudgetProgress, computeMonthSpending } from './progress';

export type Budget = Tables<'budgets'>;

/** MSI plans run up to 24 months, so older purchases can't bill in the month anymore. */
const MSI_HISTORY_MONTHS = 25;

export const budgetKeys = {
  all: ['budgets'] as const,
  detail: (id: string) => [...budgetKeys.all, 'detail', id] as const,
  /**
   * Expenses behind the month's progress. Lives under `transactionKeys.all` so money
   * mutations refresh it (and account edits refresh every query, for `statement_day`).
   */
  expenses: (month: string) => [...transactionKeys.all, 'budget-expenses', month] as const,
};

export function useBudgets() {
  return useQuery({
    queryKey: budgetKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

/** A single budget; `null` if it doesn't exist (e.g. right after deleting it). */
export function useBudget(id: string) {
  return useQuery({
    queryKey: budgetKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('budgets').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Expenses that can land in the month: regular ones dated in it, and MSI ones
 * bought up to `MSI_HISTORY_MONTHS` before it (one query).
 */
function useBudgetExpenses(start: string, end: string) {
  const since = addMonths(start, -MSI_HISTORY_MONTHS);

  return useQuery({
    queryKey: budgetKeys.expenses(start),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(
          'kind, amount, category, occurred_on, installment_months, account:accounts!transactions_account_id_fkey (statement_day)',
        )
        .eq('kind', 'expense')
        .lte('occurred_on', end)
        .or(
          `and(installment_months.is.null,occurred_on.gte.${start}),and(installment_months.not.is.null,occurred_on.gte.${since})`,
        );
      if (error) throw error;
      return data;
    },
  });
}

/** Spending of the month that contains `month` by category (MSI by installment). */
export function useMonthSpending(month: string) {
  const { start, end } = monthRange(month);
  const expenses = useBudgetExpenses(start, end);

  const data = useMemo(
    () => (expenses.data ? computeMonthSpending(start, expenses.data) : undefined),
    [start, expenses.data],
  );

  return {
    data,
    isPending: expenses.isPending,
    error: expenses.error,
    isRefetching: expenses.isRefetching,
    refetch: expenses.refetch,
  };
}

/** Spending vs. budget per category for the month that contains `month`. */
export function useBudgetProgress(month: string) {
  const { start, end } = monthRange(month);
  const budgets = useBudgets();
  const expenses = useBudgetExpenses(start, end);

  const data = useMemo(
    () =>
      budgets.data && expenses.data
        ? computeBudgetProgress(start, budgets.data, expenses.data)
        : undefined,
    [start, budgets.data, expenses.data],
  );

  return {
    data,
    isPending: budgets.isPending || expenses.isPending,
    error: budgets.error ?? expenses.error,
    isRefetching: budgets.isRefetching || expenses.isRefetching,
    refetch: () => Promise.all([budgets.refetch(), expenses.refetch()]),
  };
}

function useInvalidateBudgets() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: budgetKeys.all });
}

export function useCreateBudget() {
  const invalidate = useInvalidateBudgets();

  return useMutation({
    mutationFn: async (budget: TablesInsert<'budgets'>) => {
      const { error } = await supabase.from('budgets').insert(budget);
      // unique (user_id, category): e.g. created from another device meanwhile.
      if (error?.code === '23505') {
        throw new Error(`Ya tienes un presupuesto para ${budget.category}.`);
      }
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateBudget() {
  const invalidate = useInvalidateBudgets();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TablesUpdate<'budgets'> }) => {
      const { error } = await supabase.from('budgets').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteBudget() {
  const invalidate = useInvalidateBudgets();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budgets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
