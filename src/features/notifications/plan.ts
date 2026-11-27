/**
 * Local reminder planner (pure, no React/Expo): turns card payments,
 * subscriptions and paydays into the list of notifications that should be scheduled.
 *
 * Rules:
 * - Every reminder fires at 09:00 local time.
 * - Card payments: one `daysBefore` days before the due date and one on the due date.
 * - Subscriptions (active only): one `daysBefore` days before the next charge.
 * - Paydays (with an income profile): one the day before, summarizing the card
 *   payments due from that payday until the next one, and one on the payday
 *   (tap = register the income). Only the next `MAX_PAYDAYS` paydays are planned
 *   so a weekly schedule can't crowd card reminders out of the cap; the plan is
 *   rebuilt every time the app opens, so later paydays get scheduled in time.
 * - Moments already in the past are skipped (never fire right away on app open),
 *   as are moments beyond `WINDOW_DAYS`. The list is sorted by date and capped
 *   at `MAX_REMINDERS` to stay under OS limits (iOS keeps 64 pending).
 */

import {
  type IncomeProfile,
  type IncomeSchedule,
  nextPayday,
  paydaysBetween,
} from '@/features/income/schedule';
import { addDays, formatShortDate, parseISODate, toISODate } from '@/lib/date';
import { formatMoney } from '@/lib/format';

export const REMINDER_HOUR = 9;
export const WINDOW_DAYS = 60;
export const MAX_REMINDERS = 40;
/** Upcoming paydays planned (2 reminders each). */
export const MAX_PAYDAYS = 4;
/** Income category preselected when registering a payday. */
export const PAYDAY_CATEGORY = 'Nómina';

export type ReminderKind = 'card' | 'subscription' | 'payday';

/** Prefill for the new-transaction screen when a payday reminder is tapped. */
export type PaydayIncomeParams = {
  kind: 'income';
  /** Plain decimal, e.g. `8500.00`. */
  amount: string;
  category: string;
  accountId?: string;
};

export type Reminder = {
  /** Deterministic, e.g. `card:{accountId}:{dueDate}:before`. Used as the notification id. */
  id: string;
  kind: ReminderKind;
  date: Date;
  title: string;
  body: string;
  /** Card account id, subscription id or payday (`YYYY-MM-DD`). */
  targetId: string;
  /** Only on the payday itself: opens the new-transaction screen prefilled. */
  income?: PaydayIncomeParams;
};

export type PlanCardPayment = {
  accountId: string;
  name: string;
  institution: string | null;
  currency: string;
  amount: number;
  dueDate: string;
};

export type PlanSubscription = {
  id: string;
  name: string;
  amount: number;
  next_charge_on: string;
  is_active: boolean;
  accountName: string | null;
  currency?: string;
};

export type PlanIncome = IncomeSchedule & Pick<IncomeProfile, 'deposit_account_id'>;

export type PlanInput = {
  now: Date;
  daysBefore: number;
  hideAmounts: boolean;
  cardReminders: boolean;
  subscriptionReminders: boolean;
  paydayReminders: boolean;
  cardPayments: PlanCardPayment[];
  subscriptions: PlanSubscription[];
  /** `null` = no income profile. */
  income: PlanIncome | null;
};

/** 09:00 local on `iso` minus `daysBefore` days (calendar days, DST-safe). */
export function reminderMoment(iso: string, daysBefore = 0) {
  const date = parseISODate(iso);
  date.setDate(date.getDate() - daysBefore);
  date.setHours(REMINDER_HOUR, 0, 0, 0);
  return date;
}

export function planReminders(input: PlanInput): Reminder[] {
  const { now, daysBefore, hideAmounts } = input;
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + WINDOW_DAYS);

  const reminders: Reminder[] = [];
  const push = (reminder: Reminder) => {
    const t = reminder.date.getTime();
    if (t <= now.getTime() || t > windowEnd.getTime()) return;
    reminders.push(reminder);
  };

  if (input.cardReminders) {
    for (const p of input.cardPayments) {
      if (p.amount <= 0) continue;
      const money = formatMoney(p.amount, p.currency);
      const date = formatShortDate(p.dueDate);
      const card = [p.institution, p.name].filter(Boolean).join(' ');

      push({
        id: `card:${p.accountId}:${p.dueDate}:before`,
        kind: 'card',
        targetId: p.accountId,
        date: reminderMoment(p.dueDate, daysBefore),
        title: 'Pago de tarjeta próximo',
        body: hideAmounts
          ? `Tienes un pago de tarjeta pendiente antes del ${date}.`
          : `Paga ${money} de tu ${card} antes del ${date}.`,
      });
      push({
        id: `card:${p.accountId}:${p.dueDate}:due`,
        kind: 'card',
        targetId: p.accountId,
        date: reminderMoment(p.dueDate),
        // The card goes in the body: Android truncates long titles when collapsed.
        title: 'Hoy vence tu tarjeta',
        body: hideAmounts
          ? `Paga tu ${card} hoy para no generar intereses.`
          : `Paga ${money} de tu ${card} hoy para no generar intereses.`,
      });
    }
  }

  if (input.subscriptionReminders) {
    for (const s of input.subscriptions) {
      if (!s.is_active) continue;
      const date = formatShortDate(s.next_charge_on);
      const where = s.accountName ? ` en ${s.accountName}` : '';
      push({
        id: `sub:${s.id}:${s.next_charge_on}:before`,
        kind: 'subscription',
        targetId: s.id,
        date: reminderMoment(s.next_charge_on, daysBefore),
        title: `${s.name} se cobra pronto`,
        body: hideAmounts
          ? `El ${date} se cobrará tu suscripción${where}.`
          : `El ${date} se cobrarán ${formatMoney(s.amount, s.currency)}${where}.`,
      });
    }
  }

  const income = input.income;
  if (input.paydayReminders && income && income.pay_amount > 0) {
    const from = toISODate(now);
    // Paydays still ahead: today's counts until 09:00 (its "before" moment is skipped by `push`).
    const paydays = paydaysBetween(income, from, addDays(from, WINDOW_DAYS + 1))
      .filter((payday) => reminderMoment(payday).getTime() > now.getTime())
      .slice(0, MAX_PAYDAYS);
    const money = formatMoney(income.pay_amount);

    for (const payday of paydays) {
      const following = nextPayday(income, addDays(payday, 1));
      // Only the current statement of each card is known, so far paydays may undercount;
      // the plan is rebuilt on every app open with fresh statements.
      const due = input.cardPayments.filter(
        (p) => p.amount > 0 && p.dueDate >= payday && (following === null || p.dueDate < following),
      );

      push({
        id: `payday:${payday}:before`,
        kind: 'payday',
        targetId: payday,
        date: reminderMoment(payday, 1),
        title: 'Mañana te pagan',
        body: describeDuePayments(due, hideAmounts),
      });
      push({
        id: `payday:${payday}:day`,
        kind: 'payday',
        targetId: payday,
        date: reminderMoment(payday),
        title: 'Hoy te pagan',
        body: hideAmounts
          ? 'Registra tu ingreso en un toque.'
          : `Registra tu ingreso de ${money} en un toque.`,
        income: {
          kind: 'income',
          amount: income.pay_amount.toFixed(2),
          category: PAYDAY_CATEGORY,
          ...(income.deposit_account_id ? { accountId: income.deposit_account_id } : {}),
        },
      });
    }
  }

  return reminders
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id))
    .slice(0, MAX_REMINDERS);
}

/** Body of the "Mañana te pagan" reminder. */
function describeDuePayments(due: PlanCardPayment[], hideAmounts: boolean) {
  if (!due.length) return 'No tienes pagos de tarjeta pendientes antes de tu siguiente pago.';
  const count = due.length === 1 ? 'un pago' : `${due.length} pagos`;
  if (hideAmounts) return `Tienes ${count} de tarjeta antes de tu siguiente pago.`;
  // Usually all MXN; add up per currency so mixed cards stay correct.
  const totals = new Map<string, number>();
  for (const p of due) totals.set(p.currency, (totals.get(p.currency) ?? 0) + p.amount);
  const total = [...totals].map(([currency, amount]) => formatMoney(amount, currency)).join(' + ');
  return `Tienes ${count} de tarjeta antes de tu siguiente pago: ${total}.`;
}

/** Stable fingerprint of a plan, to skip rescheduling when nothing changed. */
export function planSignature(plan: Reminder[]) {
  return JSON.stringify(
    plan.map((r) => [r.id, r.date.getTime(), r.title, r.body, r.income ?? null]),
  );
}
