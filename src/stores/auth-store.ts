import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { unregisterPushToken } from '@/features/notifications/push';
import { cancelAllReminders } from '@/features/notifications/reminders';
import { clearWidgetSnapshot } from '@/widgets/update';
import { signOutFromGoogle } from '@/features/auth/google';
import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';
import { useScopeStore } from '@/stores/scope-store';
import { useSettingsStore } from '@/stores/settings-store';

type AuthState = {
  session: Session | null;
  isLoading: boolean;
  init: () => () => void;
  signOut: () => Promise<void>;
};

/** Drop everything cached for the previous user so the next one never sees it. */
function clearUserData() {
  queryClient.clear();
  useSettingsStore.setState({ lastAccountId: null, lastCategories: {} });
  useScopeStore.setState({ scope: 'all' });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  isLoading: true,
  init: () => {
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, isLoading: false });
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Scheduled reminders contain the previous user's data.
      if (event === 'SIGNED_OUT') {
        cancelAllReminders();
        clearWidgetSnapshot();
      }
      const previousUserId = get().session?.user.id;
      if (previousUserId && previousUserId !== session?.user.id) {
        clearUserData();
      }
      set({ session, isLoading: false });
    });

    return () => data.subscription.unsubscribe();
  },
  signOut: async () => {
    // While the session still exists, so the RPC can delete this phone's token.
    await unregisterPushToken();
    await cancelAllReminders();
    clearWidgetSnapshot();
    await signOutFromGoogle();
    await supabase.auth.signOut();
    clearUserData();
  },
}));
