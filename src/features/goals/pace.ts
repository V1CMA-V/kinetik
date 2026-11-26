/**
 * Goal pace from the income profile (pure, no React/Supabase): how much to set
 * aside each payday to make it on time, and how fast the extras would get there.
 */
import { roundFriendly, SAVINGS_SHARE } from '@/features/budgets/suggestions';
import {
  type IncomeSchedule,
  type PayFrequency,
  monthlyIncome,
  nextPayday,
  paydaysBetween,
} from '@/features/income/schedule';

/** "Aporta $X por quincena", "… por semana", "… al mes". */
export const PER_PAYDAY: Record<PayFrequency, string> = {
  weekly: 'por semana',
  biweekly: 'por catorcena',
  semimonthly: 'por quincena',
  monthly: 'al mes',
};

/**
 * What to set aside each payday from `today` to `targetDate` (both inclusive) to
 * cover `remaining`; the whole `remaining` if no payday is left before the date.
 * `null` without a date, once the date passed, once reached, or if the schedule
 * is incomplete. Rounded up to whole pesos so it's enough.
 */
export function contributionPerPayday(
  schedule: IncomeSchedule,
  remaining: number,
  targetDate: string | null,
  today: string,
): { amount: number; paydays: number } | null {
  if (!targetDate || targetDate < today || !(remaining > 0)) return null;
  if (!nextPayday(schedule, today)) return null;
  const paydays = paydaysBetween(schedule, today, targetDate).length;
  return {
    // The epsilon keeps float noise (1000.0000001) from adding a peso.
    amount: Math.ceil((paydays ? remaining / paydays : remaining) - 1e-9),
    paydays,
  };
}

/** Whole months to cover `remaining` sending `perMonth` to it; `null` if it can't. */
export function monthsToReach(remaining: number, perMonth: number) {
  if (!(remaining > 0) || !(perMonth > 0)) return null;
  return Math.ceil(remaining / perMonth - 1e-9);
}

/** 20% of the monthly fixed income (the savings part of 50/30/20), rounded. */
export function suggestedMonthlySavings(
  schedule: Pick<IncomeSchedule, 'pay_amount' | 'pay_frequency'>,
) {
  return roundFriendly(monthlyIncome(schedule) * SAVINGS_SHARE);
}
