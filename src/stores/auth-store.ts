import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

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

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, isLoading: false });
    });

    return () => data.subscription.unsubscribe();
  },
  signOut: async () => {
    await supabase.auth.signOut();
  },
}));
