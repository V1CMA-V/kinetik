/**
 * Search and filters for the movements list (pure, no React/Supabase).
 *
 * The text search ignores case and accents ("super" finds "Súper") and every word
 * must appear in the description, category, account names or amount. The other
 * filters combine with AND; inside one filter (e.g. two categories) any value matches.
 */
import type { TransactionKind } from './constants';

export type TransactionFilters = {
  query: string;
  kinds: TransactionKind[];
  categories: string[];
  /** Matches a movement made from or transferred into any of these accounts. */
  accountIds: string[];
  minAmount: number | null;
  maxAmount: number | null;
};

export const EMPTY_FILTERS: TransactionFilters = {
  query: '',
  kinds: [],
  categories: [],
  accountIds: [],
  minAmount: null,
  maxAmount: null,
};

type FilterableAccount = { name: string; institution: string | null } | null;

export type FilterableTransaction = {
  kind: TransactionKind;
  amount: number;
  category: string | null;
  description: string | null;
  account_id: string;
  to_account_id: string | null;
  account: FilterableAccount;
  to_account?: FilterableAccount;
};

/** Accents left as separate marks after NFD normalization (á → a + ´). */
const COMBINING_MARKS = /[\u0300-\u036f]/g;

/** Lowercase without accents or extra spaces: "  Súper " → "super". */
export function normalizeText(text: string) {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase().trim();
}

/** Filters set apart from the text search (for the "Filtros (n)" badge). */
export function activeFilterCount(f: TransactionFilters) {
  return (
    (f.kinds.length ? 1 : 0) +
    (f.categories.length ? 1 : 0) +
    (f.accountIds.length ? 1 : 0) +
    (f.minAmount !== null || f.maxAmount !== null ? 1 : 0)
  );
}

export function isFiltering(f: TransactionFilters) {
  return normalizeText(f.query) !== '' || activeFilterCount(f) > 0;
}

function searchableText(t: FilterableTransaction) {
  const accounts = [t.account, t.to_account ?? null].flatMap((a) =>
    a ? [a.name, a.institution ?? ''] : [],
  );
  // Both "1250.5" and "1,250.50" so the amount can be typed either way.
  const fixed = t.amount.toFixed(2);
  const amount = [String(t.amount), fixed, fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',')];
  return normalizeText([t.description ?? '', t.category ?? '', ...accounts, ...amount].join(' '));
}

export function matchesFilters(t: FilterableTransaction, f: TransactionFilters) {
  if (f.kinds.length && !f.kinds.includes(t.kind)) return false;
  if (f.categories.length && (!t.category || !f.categories.includes(t.category))) return false;
  if (
    f.accountIds.length &&
    !f.accountIds.includes(t.account_id) &&
    !(t.to_account_id && f.accountIds.includes(t.to_account_id))
  ) {
    return false;
  }
  if (f.minAmount !== null && t.amount < f.minAmount) return false;
  if (f.maxAmount !== null && t.amount > f.maxAmount) return false;

  const words = normalizeText(f.query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = searchableText(t);
  return words.every((w) => haystack.includes(w));
}

export function applyFilters<T extends FilterableTransaction>(rows: T[], f: TransactionFilters) {
  return isFiltering(f) ? rows.filter((t) => matchesFilters(t, f)) : rows;
}

/** Adds `value` to the list, or removes it if it's already there. */
export function toggleValue<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
