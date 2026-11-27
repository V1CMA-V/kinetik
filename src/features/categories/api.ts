import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import type { Tables } from '@/types/database';

import { type CategoryKind, mergeCategories } from './categories';
import type { CategoryFormOutput } from './schemas';

export type Category = Tables<'categories'>;

export const categoryKeys = {
  all: ['categories'] as const,
};

export const DUPLICATE_CATEGORY_MESSAGE = 'Ya tienes una categoría con ese nombre.';

/** Your own custom categories (both kinds); the partner's aren't visible. */
export function useCustomCategories() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: categoryKeys.all,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Built-in categories of `kind` plus your custom ones (see `mergeCategories`). While the
 * first load runs (`isLoading`), or if it failed, `categories` holds just the built-ins.
 */
export function useCategories(kind: CategoryKind) {
  const custom = useCustomCategories();
  const categories = useMemo(
    () =>
      mergeCategories(
        kind,
        (custom.data ?? []).filter((c) => c.kind === kind).map((c) => c.name),
      ),
    [custom.data, kind],
  );
  return { categories, isLoading: custom.isLoading };
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: CategoryFormOutput) => {
      const { error } = await supabase.from('categories').insert(values);
      // unique (user_id, kind, lower(name)).
      if (error?.code === '23505') throw new Error(DUPLICATE_CATEGORY_MESSAGE);
      if (error) throw new Error('No se pudo guardar la categoría. Inténtalo de nuevo.');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw new Error('No se pudo eliminar la categoría. Inténtalo de nuevo.');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}
