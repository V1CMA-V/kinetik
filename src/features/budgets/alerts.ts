/**
 * Budget alerts (pure, no React/Expo): decides which "you reached 80% / 100%
 * of a budget" notifications should be shown now.
 *
 * Rules:
 * - Thresholds: 80% and 100% of the monthly budget, once per month, category
 *   and threshold. Raising a budget never re-alerts a threshold already sent.
 * - A category that jumps straight past 100% only gets the 100% alert (80 is
 *   marked as sent too).
 * - Only the current month is evaluated; sent records of older months are pruned.
 */
import { formatMoney } from '@/lib/format';

import type { CategoryProgress } from './progress';

export type BudgetAlertThreshold = 80 | 100;

/** Highest threshold already alerted, keyed `${month}:${category}` (`month` = `YYYY-MM`). */
export type BudgetAlertsSent = Record<string, BudgetAlertThreshold>;

export type BudgetAlert = {
  /** Deterministic, e.g. `budget:2026-11:Comida:80`. Used as the notification id. */
  id: string;
  /** Key in `BudgetAlertsSent`. */
  key: string;
  threshold: BudgetAlertThreshold;
  /** Budget id (opens its screen when tapped). */
  budgetId: string;
  category: string;
  title: string;
  body: string;
};

export type BudgetAlertsInput = {
  /** Current month, `YYYY-MM`. */
  month: string;
  categories: Pick<CategoryProgress, 'id' | 'category' | 'budget' | 'spent'>[];
  sent: BudgetAlertsSent;
  hideAmounts: boolean;
};

export const budgetAlertKey = (month: string, category: string) => `${month}:${category}`;

/** Threshold reached by `spent` of `budget` (`null` below 80% or without a budget). */
export function reachedThreshold(spent: number, budget: number): BudgetAlertThreshold | null {
  if (!(budget > 0)) return null;
  // Compare in cents so float noise (e.g. 79.999…%) can't miss or fake a threshold.
  const spentCents = Math.round(spent * 100);
  const budgetCents = Math.round(budget * 100);
  if (spentCents >= budgetCents) return 100;
  if (spentCents * 10 >= budgetCents * 8) return 80;
  return null;
}

function describe(
  threshold: BudgetAlertThreshold,
  category: string,
  spent: number,
  budget: number,
  hideAmounts: boolean,
) {
  if (threshold === 80) {
    return {
      title: `Presupuesto de ${category} al 80%`,
      body: hideAmounts
        ? 'Ya usaste el 80% de tu presupuesto de este mes.'
        : `Llevas ${formatMoney(spent)} de ${formatMoney(budget)} este mes; te quedan ${formatMoney(budget - spent)}.`,
    };
  }
  const over = spent - budget;
  return {
    title: `Llegaste al límite de ${category}`,
    body: hideAmounts
      ? 'Ya usaste todo tu presupuesto de este mes.'
      : over > 0
        ? `Llevas ${formatMoney(spent)} de ${formatMoney(budget)}; vas ${formatMoney(over)} por encima.`
        : `Llevas ${formatMoney(spent)} de ${formatMoney(budget)}; ya no te queda margen este mes.`,
  };
}

/** Alerts to show now (at most one per category: the highest new threshold). */
export function planBudgetAlerts({
  month,
  categories,
  sent,
  hideAmounts,
}: BudgetAlertsInput): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];
  for (const c of categories) {
    const threshold = reachedThreshold(c.spent, c.budget);
    if (!threshold) continue;
    const key = budgetAlertKey(month, c.category);
    const already = sent[key];
    if (already && already >= threshold) continue;
    alerts.push({
      id: `budget:${key}:${threshold}`,
      key,
      threshold,
      budgetId: c.id,
      category: c.category,
      ...describe(threshold, c.category, c.spent, c.budget, hideAmounts),
    });
  }
  return alerts;
}

/**
 * `sent` with `alerts` recorded, keeping only keys of `month` (older months
 * never alert again, so their records are dropped).
 */
export function recordBudgetAlerts(
  sent: BudgetAlertsSent,
  month: string,
  alerts: Pick<BudgetAlert, 'key' | 'threshold'>[],
): BudgetAlertsSent {
  const prefix = `${month}:`;
  const next: BudgetAlertsSent = {};
  for (const [key, threshold] of Object.entries(sent)) {
    if (key.startsWith(prefix)) next[key] = threshold;
  }
  for (const a of alerts) {
    next[a.key] = Math.max(next[a.key] ?? 0, a.threshold) as BudgetAlertThreshold;
  }
  return next;
}
