/**
 * Pay schedule (pure, no React/Supabase): when paydays fall and how much income
 * they add up to.
 *
 * - `semimonthly` / `monthly`: fixed days of the month; 31 (or any day past the
 *   month's length) means the last day of the month.
 * - `weekly` / `biweekly`: every 7 / 14 days counted from `anchor_date`.
 * - Only the fixed pay is projected; `variable_monthly` is never treated as certain.
 */
import { addDays, parseISODate, toISODate } from '@/lib/date';
import type { Tables } from '@/types/database';

export type IncomeProfile = Tables<'income_profiles'>;
export type PayFrequency = IncomeProfile['pay_frequency'];

export type IncomeSchedule = Pick<
  IncomeProfile,
  'pay_amount' | 'pay_frequency' | 'pay_day_1' | 'pay_day_2' | 'anchor_date'
>;

export const PAY_FREQUENCIES: Record<PayFrequency, { label: string; description: string }> = {
  weekly: { label: 'Semanal', description: 'Cada semana' },
  biweekly: { label: 'Catorcenal', description: 'Cada 2 semanas' },
  semimonthly: { label: 'Quincenal', description: 'Dos días fijos al mes' },
  monthly: { label: 'Mensual', description: 'Un día fijo al mes' },
};

export const PAY_FREQUENCY_ORDER: PayFrequency[] = ['semimonthly', 'monthly', 'biweekly', 'weekly'];

const PAYS_PER_YEAR: Record<PayFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

/** Day value that means "last day of the month". */
export const LAST_DAY = 31;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Average fixed income per month for the schedule. */
export function monthlyIncome(schedule: Pick<IncomeSchedule, 'pay_amount' | 'pay_frequency'>) {
  return round2((schedule.pay_amount * PAYS_PER_YEAR[schedule.pay_frequency]) / 12);
}

/** Days since the epoch, immune to DST shifts. */
function dayNumber(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

function fromDayNumber(n: number) {
  const date = new Date(n * 86_400_000);
  return toISODate(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function monthDays(schedule: IncomeSchedule): number[] {
  if (schedule.pay_frequency === 'monthly') {
    return schedule.pay_day_1 ? [schedule.pay_day_1] : [];
  }
  return [schedule.pay_day_1, schedule.pay_day_2].filter((d): d is number => d != null);
}

/** Every payday between `from` and `to` (both inclusive, `YYYY-MM-DD`), in order. */
export function paydaysBetween(schedule: IncomeSchedule, from: string, to: string): string[] {
  if (to < from) return [];

  if (schedule.pay_frequency === 'weekly' || schedule.pay_frequency === 'biweekly') {
    if (!schedule.anchor_date) return [];
    const step = schedule.pay_frequency === 'weekly' ? 7 : 14;
    const anchor = dayNumber(schedule.anchor_date);
    const start = dayNumber(from);
    const end = dayNumber(to);
    const result: string[] = [];
    for (let n = anchor + Math.ceil((start - anchor) / step) * step; n <= end; n += step) {
      result.push(fromDayNumber(n));
    }
    return result;
  }

  const days = monthDays(schedule);
  if (!days.length) return [];
  const result = new Set<string>();
  const first = parseISODate(from);
  const last = parseISODate(to);
  for (
    let cursor = new Date(first.getFullYear(), first.getMonth(), 1);
    cursor <= last;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  ) {
    const length = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    for (const day of days) {
      const iso = toISODate(
        new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(day, length)),
      );
      if (iso >= from && iso <= to) result.add(iso);
    }
  }
  return [...result].sort();
}

/** First payday on or after `from`; `null` if the schedule is incomplete. */
export function nextPayday(schedule: IncomeSchedule, from: string): string | null {
  return paydaysBetween(schedule, from, addDays(from, 62))[0] ?? null;
}

/** Fixed income landing between `from` and `to` (both inclusive). */
export function incomeBetween(schedule: IncomeSchedule, from: string, to: string) {
  return round2(paydaysBetween(schedule, from, to).length * schedule.pay_amount);
}

/** "Días 15 y último", "Cada 2 semanas", … for summaries. */
export function describeSchedule(schedule: IncomeSchedule) {
  const dayLabel = (d: number) => (d >= LAST_DAY ? 'último' : String(d));
  switch (schedule.pay_frequency) {
    case 'semimonthly':
      return schedule.pay_day_1 && schedule.pay_day_2
        ? `Días ${dayLabel(schedule.pay_day_1)} y ${dayLabel(schedule.pay_day_2)}`
        : 'Quincenal';
    case 'monthly':
      return schedule.pay_day_1
        ? schedule.pay_day_1 >= LAST_DAY
          ? 'Último día del mes'
          : `Día ${schedule.pay_day_1}`
        : 'Mensual';
    default:
      return PAY_FREQUENCIES[schedule.pay_frequency].description;
  }
}
