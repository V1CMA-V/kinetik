/**
 * 50/30/20 budget suggestions (pure, no React/Supabase).
 *
 * - 50% of the monthly fixed income goes to needs, 30% to wants and 20% to
 *   savings. Savings isn't budgeted per category.
 * - A category's suggestion is its group's pool split by the category's share of
 *   the group's recent spending. Without spending in the category (new user or
 *   a category they don't use yet), the pool is split evenly across the group.
 * - Amounts are rounded to friendly values (nearest 50, or 100 from 1,000 up).
 */
import { EXPENSE_CATEGORIES } from '@/features/transactions/constants';

export type BudgetGroup = 'needs' | 'wants';

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** Which half of the rule each expense category belongs to. */
export const CATEGORY_GROUPS: Record<ExpenseCategory, BudgetGroup> = {
  Súper: 'needs',
  Transporte: 'needs',
  Gasolina: 'needs',
  Hogar: 'needs',
  Servicios: 'needs',
  Salud: 'needs',
  Educación: 'needs',
  // Eating out; groceries are Súper.
  Comida: 'wants',
  Entretenimiento: 'wants',
  Compras: 'wants',
  Suscripciones: 'wants',
  Viajes: 'wants',
  Otros: 'wants',
};

export const GROUP_SHARE: Record<BudgetGroup, number> = { needs: 0.5, wants: 0.3 };
export const SAVINGS_SHARE = 0.2;

export const BUDGET_GROUPS: Record<BudgetGroup, { label: string }> = {
  needs: { label: 'Necesidades' },
  wants: { label: 'Gustos' },
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Unknown categories (e.g. renamed ones) count as wants. */
export function categoryGroup(category: string): BudgetGroup {
  return CATEGORY_GROUPS[category as ExpenseCategory] ?? 'wants';
}

const groupCategories = (group: BudgetGroup) =>
  EXPENSE_CATEGORIES.filter((c) => CATEGORY_GROUPS[c] === group);

/** Nearest 50 below 1,000 and nearest 100 from there; never below 50 for a positive amount. */
export function roundFriendly(amount: number) {
  if (!(amount > 0)) return 0;
  const step = amount < 1000 ? 50 : 100;
  return Math.max(50, Math.round(amount / step) * step);
}

/**
 * Adds up spending per category over several months (e.g. the last 3 full ones).
 * Only the shares within each group matter, so the sum works as well as the average.
 */
export function spendingByCategory(months: { category: string; amount: number }[][]) {
  const totals: Record<string, number> = {};
  for (const month of months) {
    for (const { category, amount } of month) {
      if (amount > 0) totals[category] = (totals[category] ?? 0) + amount;
    }
  }
  return totals;
}

/** Suggested monthly limit for `category`; 0 without income. */
/** Weight (share of the group's spending) given to a category without history. */
const MIN_HISTORY_WEIGHT = 0.05;

export function suggestBudget(
  category: string,
  monthlyIncome: number,
  history: Record<string, number> = {},
) {
  if (!(monthlyIncome > 0)) return 0;
  const group = categoryGroup(category);
  const pool = monthlyIncome * GROUP_SHARE[group];
  // Every category of the group (plus any outside the list, always wants) gets a weight,
  // so accepting every suggestion adds up to the group's pool. Categories without
  // history get a small floor instead of $0.
  const members = new Set([
    ...groupCategories(group),
    category,
    ...Object.keys(history).filter((c) => categoryGroup(c) === group),
  ]);
  const groupSpent = [...members].reduce((sum, c) => sum + Math.max(0, history[c] ?? 0), 0);
  const floor = groupSpent > 0 ? groupSpent * MIN_HISTORY_WEIGHT : 1;
  const weight = (c: string) => Math.max(history[c] ?? 0, floor);
  const totalWeight = [...members].reduce((sum, c) => sum + weight(c), 0);
  return roundFriendly((pool * weight(category)) / totalWeight);
}

export type GroupTotals = {
  /** Sum of the budgets in the group. */
  total: number;
  /** 50% or 30% of the income. */
  target: number;
  /** `total / target` (0 without income). */
  ratio: number;
};

export type BudgetTotals = {
  total: number;
  /** `total / income` (0 without income). */
  ratio: number;
  groups: Record<BudgetGroup, GroupTotals>;
};

/** Existing budgets against the income and the 50/30 targets. */
export function budgetTotals(
  budgets: { category: string; amount: number }[],
  monthlyIncome: number,
): BudgetTotals {
  const income = monthlyIncome > 0 ? monthlyIncome : 0;
  const sums: Record<BudgetGroup, number> = { needs: 0, wants: 0 };
  for (const b of budgets) sums[categoryGroup(b.category)] += b.amount;

  const group = (g: BudgetGroup): GroupTotals => {
    const target = round2(income * GROUP_SHARE[g]);
    return { total: round2(sums[g]), target, ratio: target ? sums[g] / target : 0 };
  };
  const total = round2(sums.needs + sums.wants);

  return {
    total,
    ratio: income ? total / income : 0,
    groups: { needs: group('needs'), wants: group('wants') },
  };
}
