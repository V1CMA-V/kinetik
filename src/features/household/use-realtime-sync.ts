import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';

/** Groups bursts of events (a movement also updates the account balance) into one refetch. */
const DEBOUNCE_MS = 400;

/** Tables whose changes (by you or your partner) refresh every screen. */
const TABLES = [
  'transactions',
  'accounts',
  'household_members',
  'goals',
  'goal_contributions',
] as const;

/**
 * Keeps the cache fresh with Supabase Realtime, so movements your partner
 * registers on a shared account show up without pulling to refresh. RLS
 * applies to Realtime: only your rows and the shared ones arrive.
 * Mount once, inside the authenticated area.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  useEffect(() => {
    if (!userId) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => queryClient.invalidateQueries(), DEBOUNCE_MS);
    };

    const channel = supabase.channel(`sync:${userId}`);
    for (const table of TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh);
    }
    channel.subscribe();

    // The socket may drop in the background and miss events; catch up on return.
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      clearTimeout(timer);
      appState.remove();
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);
}
