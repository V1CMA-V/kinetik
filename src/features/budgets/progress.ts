/**
 * Monthly budget math (pure, no React/Supabase).
 *
 * Spending of a category in a calendar month:
 * - Regular expenses dated in the month count in full. Income and transfers
 *   never count (refunds aren't tracked per category).
 * - MSI expenses count by installment, in the calendar month the installment is
 *   billed: with the card's `statement_day`, installment k counts in the month
 *   of the k-th cut on or after the purchase; without it, in the k-th month
 *   after the purchase month (same assumption as `installmentProgress`).
 */
import { installmentAmounts, installmentCuts } from '@/features/accounts/credit-card';
import { monthRange, monthsBetween } from '@/lib/date';

export type BudgetExpense = {
  kind: 'expense' | 'income' | 'transfer';
  amount: number;
  category: string | null;
  occurred_on: string;
  installment_months: number | null;
  account: { statement_day: number | null } | null;
};

export type BudgetLimit = { id: string; category: string; amount: number };

export type BudgetStatus = 'ok' | 'warning' | 'over';

export type CategoryProgress = {
  id: string;
  category: string;
  budget: number;
  spent: number;
  /** Part of `spent` that comes from MSI installments. */
  installmentsSpent: number;
  /** Negative when the budget was exceeded. */
  remaining: number;
  ratio: number;
  status: BudgetStatus;
};

export type BudgetProgress = {
  categories: CategoryProgress[];
  totals: {
    budget: number;
    /** Spending within budgeted categories only. */
    spent: number;
    remaining: number;
    ratio: number;
    status: BudgetStatus;
  };
  /** Spending in categories without a budget. */
  unbudgetedSpent: number;
};

/** Expenses saved without a category are grouped with "Otros". */
const FALLBACK_CATEGORY = 'Otros';

const round2 = (n: number) => Math.round(n * 100) / 100;

export function budgetStatus(ratio: number): BudgetStatus {
  if (ratio > 1) return 'over';
  if (ratio >= 0.8) return 'warning';
  return 'ok';
}

/** Amount of `t` that lands in the month `[start, end]` (0 if none). */
export function amountInMonth(t: BudgetExpense, start: string, end: string) {
  if (!t.installment_months) {
    return t.occurred_on >= start && t.occurred_on <= end ? t.amount : 0;
  }

  const amounts = installmentAmounts(t.amount, t.installment_months);
  const statementDay = t.account?.statement_day;
  if (statementDay) {
    return installmentCuts(t.occurred_on, t.installment_months, statementDay).reduce(
      (sum, cut, i) => (cut >= start && cut <= end ? sum + amounts[i] : sum),
      0,
    );
  }

  // Installment k (1..n) lands k months after the purchase month.
  const k = monthsBetween(t.occurred_on, start);
  return k >= 1 && k <= t.installment_months ? amounts[k - 1] : 0;
}

/**
 * Spending vs. budget for the month that contains `month` (any `YYYY-MM-DD` in
 * it). `expenses` may include rows outside the month or of other kinds; only
 * what lands in the month is used. Categories keep the order of `budgets`.
 */
export function computeBudgetProgress(
  month: string,
  budgets: BudgetLimit[],
  expenses: BudgetExpense[],
): BudgetProgress {
  const { start, end } = monthRange(month);

  const spent = new Map<string, number>();
  const installmentsSpent = new Map<string, number>();
  for (const t of expenses) {
    if (t.kind !== 'expense') continue;
    const amount = amountInMonth(t, start, end);
    if (!amount) continue;
    const category = t.category || FALLBACK_CATEGORY;
    spent.set(category, (spent.get(category) ?? 0) + amount);
    if (t.installment_months) {
      installmentsSpent.set(category, (installmentsSpent.get(category) ?? 0) + amount);
    }
  }

  const categories = budgets.map((b): CategoryProgress => {
    const categorySpent = round2(spent.get(b.category) ?? 0);
    const ratio = categorySpent / b.amount;
    return {
      id: b.id,
      category: b.category,
      budget: b.amount,
      spent: categorySpent,
      installmentsSpent: round2(installmentsSpent.get(b.category) ?? 0),
      remaining: round2(b.amount - categorySpent),
      ratio,
      status: budgetStatus(ratio),
    };
  });

  const budgeted = new Set(budgets.map((b) => b.category));
  let unbudgetedSpent = 0;
  for (const [category, value] of spent) {
    if (!budgeted.has(category)) unbudgetedSpent += value;
  }

  const totalBudget = round2(categories.reduce((sum, c) => sum + c.budget, 0));
  const totalSpent = round2(categories.reduce((sum, c) => sum + c.spent, 0));
  const totalRatio = totalBudget ? totalSpent / totalBudget : 0;

  return {
    categories,
    totals: {
      budget: totalBudget,
      spent: totalSpent,
      remaining: round2(totalBudget - totalSpent),
      ratio: totalRatio,
      status: budgetStatus(totalRatio),
    },
    unbudgetedSpent: round2(unbudgetedSpent),
  };
}

export type MonthSpending = {
  total: number;
  /** Part of `total` that comes from MSI installments. */
  installments: number;
  /** Highest spending first. */
  byCategory: { category: string; amount: number }[];
};

/**
 * Total spending of the month that contains `month`, by category. Same rules as
 * the budgets: MSI purchases count only the installment billed in the month.
 */
export function computeMonthSpending(month: string, expenses: BudgetExpense[]): MonthSpending {
  const { start, end } = monthRange(month);

  const byCategory = new Map<string, number>();
  let total = 0;
  let installments = 0;
  for (const t of expenses) {
    if (t.kind !== 'expense') continue;
    const amount = amountInMonth(t, start, end);
    if (!amount) continue;
    const category = t.category || FALLBACK_CATEGORY;
    byCategory.set(category, (byCategory.get(category) ?? 0) + amount);
    total += amount;
    if (t.installment_months) installments += amount;
  }

  return {
    total: round2(total),
    installments: round2(installments),
    byCategory: [...byCategory]
      .map(([category, amount]) => ({ category, amount: round2(amount) }))
      .sort((a, b) => b.amount - a.amount),
  };
}
