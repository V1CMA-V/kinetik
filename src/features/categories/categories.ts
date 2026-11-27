/**
 * Built-in + custom category lists (pure, no React/Supabase).
 *
 * Built-ins come first in their usual order, then the custom ones alphabetically and
 * "Otros" closes the list. Names are compared ignoring case and accents, so a custom
 * "super" never shows up next to the built-in "Súper".
 */
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/features/transactions/constants';
import { normalizeText } from '@/features/transactions/filters';

/** Transfers have no category. */
export type CategoryKind = 'expense' | 'income';

export const CATEGORY_KINDS: Record<CategoryKind, { label: string }> = {
  expense: { label: 'Gastos' },
  income: { label: 'Ingresos' },
};

export const CATEGORY_KIND_ORDER: CategoryKind[] = ['expense', 'income'];

export const BUILT_IN_CATEGORIES: Record<CategoryKind, readonly string[]> = {
  expense: EXPENSE_CATEGORIES,
  income: INCOME_CATEGORIES,
};

/** Catch-all built-in shown at the end of every list. */
export const FALLBACK_CATEGORY = 'Otros';

const compareNames = (a: string, b: string) => a.localeCompare(b, 'es-MX', { sensitivity: 'base' });

/** Whether `name` matches one of `list` ignoring case and accents. */
export function includesCategory(list: readonly string[], name: string) {
  const key = normalizeText(name);
  return list.some((c) => normalizeText(c) === key);
}

export function isBuiltInCategory(kind: CategoryKind, name: string) {
  return includesCategory(BUILT_IN_CATEGORIES[kind], name);
}

/** Built-ins (without "Otros"), custom ones A–Z, then "Otros". */
export function mergeCategories(kind: CategoryKind, custom: readonly string[]): string[] {
  const builtIns = BUILT_IN_CATEGORIES[kind];
  const seen = new Set(builtIns.map(normalizeText));
  const extra: string[] = [];
  for (const name of [...custom].sort(compareNames)) {
    const key = normalizeText(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    extra.push(name);
  }
  const hasFallback = builtIns.includes(FALLBACK_CATEGORY);
  return [
    ...builtIns.filter((c) => c !== FALLBACK_CATEGORY),
    ...extra,
    ...(hasFallback ? [FALLBACK_CATEGORY] : []),
  ];
}

/**
 * `list` plus `current` at the end when it isn't there (e.g. a movement with a deleted
 * custom category or the partner's own one), so editing it doesn't lose the category.
 */
export function withCategory(list: string[], current: string | null | undefined) {
  return current && !list.includes(current) ? [...list, current] : list;
}
