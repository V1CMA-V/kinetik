import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { accountKeys } from '@/features/accounts/api';
import { transactionKeys } from '@/features/transactions/api';
import { today } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import type { TablesInsert } from '@/types/database';

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
};

export function useSubscriptions() {
  return useQuery({
    queryKey: subscriptionKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, account:accounts (id, name, institution, type)')
        .order('is_active', { ascending: false })
        .order('next_charge_on', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export type Subscription = NonNullable<ReturnType<typeof useSubscriptions>['data']>[number];

function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all }),
      queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
      queryClient.invalidateQueries({ queryKey: accountKeys.all }),
    ]);
}

/** Registers the charges that are due (runs on app open and after creating a subscription). */
export function useProcessDueSubscriptions() {
  const invalidate = useInvalidateAll();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('process_due_subscriptions', {
        p_today: today(),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (created) => {
      if (created > 0) return invalidate();
    },
  });
}

export function useCreateSubscription() {
  const invalidate = useInvalidateAll();

  return useMutation({
    mutationFn: async (subscription: TablesInsert<'subscriptions'>) => {
      const { error } = await supabase.from('subscriptions').insert(subscription);
      if (error) throw error;
      // A subscription whose first charge is today (or earlier) is charged right away.
      const { error: rpcError } = await supabase.rpc('process_due_subscriptions', {
        p_today: today(),
      });
      if (rpcError) throw rpcError;
    },
    onSuccess: invalidate,
  });
}

export function useSetSubscriptionActive() {
  const invalidate = useInvalidateAll();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Deleting keeps past charges in Movimientos (they just lose the link). */
export function useDeleteSubscription() {
  const invalidate = useInvalidateAll();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subscriptions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
