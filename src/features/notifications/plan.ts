/**
 * Local reminder planner (pure, no React/Expo): turns card payments and
 * subscriptions into the list of notifications that should be scheduled.
 *
 * Rules:
 * - Every reminder fires at 09:00 local time.
 * - Card payments: one `daysBefore` days before the due date and one on the due date.
 * - Subscriptions (active only): one `daysBefore` days before the next charge.
 * - Moments already in the past are skipped (never fire right away on app open),
 *   as are moments beyond `WINDOW_DAYS`. The list is sorted by date and capped
 *   at `MAX_REMINDERS` to stay under OS limits (iOS keeps 64 pending).
 */

import { formatShortDate, parseISODate } from '@/lib/date';
import { formatMoney } from '@/lib/format';

export const REMINDER_HOUR = 9;
export const WINDOW_DAYS = 60;
export const MAX_REMINDERS = 40;

export type ReminderKind = 'card' | 'subscription';

export type Reminder = {
  /** Deterministic, e.g. `card:{accountId}:{dueDate}:before`. Used as the notification id. */
  id: string;
  kind: ReminderKind;
  date: Date;
  title: string;
  body: string;
  /** Card account id or subscription id. */
  targetId: string;
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

export type PlanInput = {
  now: Date;
  daysBefore: number;
  hideAmounts: boolean;
  cardReminders: boolean;
  subscriptionReminders: boolean;
  cardPayments: PlanCardPayment[];
  subscriptions: PlanSubscription[];
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
        title: `Hoy vence tu tarjeta ${p.name}`,
        body: hideAmounts
          ? 'Paga hoy para no generar intereses.'
          : `Paga ${money} hoy para no generar intereses.`,
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

  return reminders
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id))
    .slice(0, MAX_REMINDERS);
}

/** Stable fingerprint of a plan, to skip rescheduling when nothing changed. */
export function planSignature(plan: Reminder[]) {
  return JSON.stringify(plan.map((r) => [r.id, r.date.getTime(), r.title, r.body]));
}
