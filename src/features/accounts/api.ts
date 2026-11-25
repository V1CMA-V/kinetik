import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database';

export type Account = Tables<'accounts'>;

export const accountKeys = {
  all: ['accounts'] as const,
  active: () => [...accountKeys.all, 'active'] as const,
  archived: () => [...accountKeys.all, 'archived'] as const,
  detail: (id: string) => [...accountKeys.all, 'detail', id] as const,
  /** Credit-card transactions behind the statement summaries (money mutations refresh `all`). */
  cardTransactions: (cardIds: string[], since: string) =>
    [...accountKeys.all, 'card-transactions', cardIds, since] as const,
};

export function useAccounts() {
  return useQuery({
    queryKey: accountKeys.active(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

/** A single account (archived ones included); `null` if it doesn't exist. */
export function useAccount(id: string) {
  return useQuery({
    queryKey: accountKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (account: TablesInsert<'accounts'>) => {
      const { data, error } = await supabase.from('accounts').insert(account).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TablesUpdate<'accounts'> }) => {
      const { error } = await supabase.from('accounts').update(values).eq('id', id);
      if (error) throw error;
    },
    // Account names and balances are embedded in transactions and subscriptions too.
    // Their key factories import this file, so refresh every query to avoid a require cycle.
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

/** Soft-deletes an account so its history can be kept for future transactions. */
export function useArchiveAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounts').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}

/** Archived accounts, most recently archived first. */
export function useArchivedAccounts() {
  return useQuery({
    queryKey: accountKeys.archived(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', false)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/** Brings an archived account back to the active list. */
export function useRestoreAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounts').update({ is_active: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}

/** Permanently deletes an account; only possible when it has no transactions or subscriptions. */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      // Transactions and subscriptions reference accounts with `on delete restrict`.
      if (error?.code === '23503') {
        throw new Error(
          'Esta cuenta tiene movimientos o suscripciones; solo puedes mantenerla archivada.',
        );
      }
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}
