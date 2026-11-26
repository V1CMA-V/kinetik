import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';

import type { IncomeFormOutput } from './schemas';

export const incomeKeys = {
  profile: ['income-profile'] as const,
};

/** Your income profile, or `null` if you haven't set one (it's optional). */
export function useIncomeProfile() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: incomeKeys.profile,
    enabled: !!userId,
    queryFn: async () => {
      // RLS only returns your own row.
      const { data, error } = await supabase.from('income_profiles').select('*').maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveIncomeProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: IncomeFormOutput) => {
      const { data, error } = await supabase
        .from('income_profiles')
        .upsert(values, { onConflict: 'user_id' })
        .select()
        .single();
      if (error) throw new Error('No se pudo guardar tu ingreso. Inténtalo de nuevo.');
      return data;
    },
    onSuccess: (data) => queryClient.setQueryData(incomeKeys.profile, data),
  });
}

export function useDeleteIncomeProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const userId = useAuthStore.getState().session?.user.id;
      if (!userId) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
      const { error } = await supabase.from('income_profiles').delete().eq('user_id', userId);
      if (error) throw new Error('No se pudo borrar tu ingreso. Inténtalo de nuevo.');
    },
    onSuccess: () => queryClient.setQueryData(incomeKeys.profile, null),
  });
}
