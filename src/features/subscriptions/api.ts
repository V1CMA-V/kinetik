import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { accountKeys } from '@/features/accounts/api';
import { transactionKeys } from '@/features/transactions/api';
import { today } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import type { TablesInsert, TablesUpdate } from '@/types/database';

const SUBSCRIPTION_SELECT = '*, account:accounts (id, name, institution, type)';

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  detail: (id: string) => [...subscriptionKeys.all, 'detail', id] as const,
};

export function useSubscriptions() {
  return useQuery({
    queryKey: subscriptionKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(SUBSCRIPTION_SELECT)
        .order('is_active', { ascending: false })
        .order('next_charge_on', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export type Subscription = NonNullable<ReturnType<typeof useSubscriptions>['data']>[number];

/** A single subscription; `null` if it doesn't exist (e.g. right after deleting it). */
export function useSubscription(id: string) {
  return useQuery({
    queryKey: subscriptionKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(SUBSCRIPTION_SELECT)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all }),
      queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
      queryClient.invalidateQueries({ queryKey: accountKeys.all }),
    ]);
}

async function processDueSubscriptions() {
  const { data, error } = await supabase.rpc('process_due_subscriptions', {
    p_today: today(),
  });
  if (error) throw error;
  return data;
}

/** Registers the charges that are due (runs on app open and after saving a subscription). */
export function useProcessDueSubscriptions() {
  const invalidate = useInvalidateAll();

  return useMutation({
    mutationFn: processDueSubscriptions,
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
      await processDueSubscriptions();
    },
    onSuccess: invalidate,
  });
}

/**
 * Sending `anchor_on` restarts the schedule from that date (with `charged_count: 0`);
 * leaving it out keeps the schedule. A DB trigger re-anchors at the pending charge
 * when only the frequency changes.
 */
export function useUpdateSubscription() {
  const invalidate = useInvalidateAll();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TablesUpdate<'subscriptions'> }) => {
      const { error } = await supabase.from('subscriptions').update(values).eq('id', id);
      if (error) throw error;
      // A date moved to today or earlier is caught up right away.
      await processDueSubscriptions();
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
