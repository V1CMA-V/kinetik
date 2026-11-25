import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { cancelAllReminders } from '@/features/notifications/reminders';
import { clearWidgetSnapshot } from '@/widgets/update';
import { signOutFromGoogle } from '@/features/auth/google';
import { supabase } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  isLoading: boolean;
  init: () => () => void;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
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
      set({ session, isLoading: false });
    });

    return () => data.subscription.unsubscribe();
  },
  signOut: async () => {
    await cancelAllReminders();
    clearWidgetSnapshot();
    await signOutFromGoogle();
    await supabase.auth.signOut();
  },
}));
