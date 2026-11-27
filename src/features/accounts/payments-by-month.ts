/**
 * Card payments grouped by the month they're due (pure, no React/Supabase).
 *
 * A purchase made after a card's cut doesn't get paid this month: it lands in the
 * next statement, due next month or later. Grouping each statement by its due
 * date shows how much of your card spending each month will have to pay.
 */
import type { StatementForecast, StatementStatus } from './credit-card';

export type CardForecasts = {
  accountId: string;
  name: string;
  currency: string;
  forecasts: StatementForecast[];
};

export type MonthCardPayment = {
  accountId: string;
  name: string;
  cutDate: string;
  dueDate: string;
  status: StatementStatus;
  amount: number;
};

export type PaymentMonth = {
  /** First day of the month (`YYYY-MM-01`). */
  month: string;
  total: number;
  /** Soonest due first. */
  payments: MonthCardPayment[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Months with something due, oldest first; only `currency` cards are counted. */
export function groupPaymentsByMonth(cards: CardForecasts[], currency: string): PaymentMonth[] {
  const byMonth = new Map<string, MonthCardPayment[]>();
  for (const card of cards) {
    if (card.currency !== currency) continue;
    for (const f of card.forecasts) {
      const month = `${f.dueDate.slice(0, 7)}-01`;
      byMonth.set(month, [
        ...(byMonth.get(month) ?? []),
        {
          accountId: card.accountId,
          name: card.name,
          cutDate: f.cutDate,
          dueDate: f.dueDate,
          status: f.status,
          amount: f.amount,
        },
      ]);
    }
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, payments]) => ({
      month,
      total: round2(payments.reduce((sum, p) => sum + p.amount, 0)),
      payments: payments.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || b.amount - a.amount),
    }));
}
