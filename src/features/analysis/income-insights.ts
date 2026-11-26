/**
 * Month spending vs. your declared income (pure, no React/Supabase).
 *
 * - Expected income is the fixed pay landing inside the actual month, so a weekly
 *   payer with 5 paydays in a month expects 5 payments, not the monthly average.
 * - `variable_monthly` (estimated extras) is reported apart and never counted.
 * - Current month: spending is the end-of-month projection; past months use what
 *   was actually spent.
 * - The declared vs. registered gap only counts paydays that already happened:
 *   paydays up to today for the current month, the whole month for past ones.
 * - Ratios are `null` whenever there's no expected income to divide by.
 */
import { type IncomeSchedule, incomeBetween, paydaysBetween } from '@/features/income/schedule';

export type IncomePeriod = 'past' | 'current' | 'future';

export type IncomeInsightsInput = {
  /** First and last day of the month (`YYYY-MM-DD`, inclusive). */
  start: string;
  end: string;
  today: string;
  schedule: IncomeSchedule;
  /** Estimated extras per month; shown apart, never counted. */
  variableMonthly: number;
  /** Spent up to today (current month) or the month's total (past months). */
  spentToDate: number;
  /** End-of-month projection for the current month; ignored otherwise. */
  projectedSpending: number | null;
  /** Income transactions registered in the month. */
  registeredIncome: number;
};

export type IncomeInsights = {
  period: IncomePeriod;
  /** Fixed pay landing in the month. */
  expectedIncome: number;
  paydays: number;
  extras: number;
  /** Spending compared against income: projected (current) or actual (past). */
  spending: number;
  /** Share of the expected income spent so far; `null` without expected income. */
  spentShare: number | null;
  /** Share of the expected income `spending` represents; `null` without expected income. */
  spendingShare: number | null;
  /** Expected income − spending; negative means spending more than you earn. */
  savings: number;
  savingsRate: number | null;
  /** Fixed pay that should already have landed (paydays ≤ today, or the whole month). */
  expectedSoFar: number;
  paydaysSoFar: number;
  registeredIncome: number;
  /** Registered − expected so far: negative means income still missing. */
  incomeGap: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const nonNegative = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : null);

export function incomePeriod(start: string, end: string, today: string): IncomePeriod {
  if (today < start) return 'future';
  if (today > end) return 'past';
  return 'current';
}

export function computeIncomeInsights(input: IncomeInsightsInput): IncomeInsights {
  const { start, end, today, schedule } = input;
  const period = incomePeriod(start, end, today);

  const paydays = paydaysBetween(schedule, start, end).length;
  const expectedIncome = nonNegative(incomeBetween(schedule, start, end));

  // Paydays that should already be registered.
  const soFarEnd = period === 'current' ? today : end;
  const paydaysSoFar = period === 'future' ? 0 : paydaysBetween(schedule, start, soFarEnd).length;
  const expectedSoFar =
    period === 'future' ? 0 : nonNegative(incomeBetween(schedule, start, soFarEnd));

  const spentToDate = nonNegative(input.spentToDate);
  const spending =
    period === 'current' && input.projectedSpending !== null
      ? Math.max(spentToDate, nonNegative(input.projectedSpending))
      : spentToDate;
  const savings = expectedIncome - spending;
  const registeredIncome = nonNegative(input.registeredIncome);

  return {
    period,
    expectedIncome: round2(expectedIncome),
    paydays,
    extras: round2(nonNegative(input.variableMonthly)),
    spending: round2(spending),
    spentShare: ratio(spentToDate, expectedIncome),
    spendingShare: ratio(spending, expectedIncome),
    savings: round2(savings),
    savingsRate: ratio(savings, expectedIncome),
    expectedSoFar: round2(expectedSoFar),
    paydaysSoFar,
    registeredIncome: round2(registeredIncome),
    incomeGap: round2(registeredIncome - expectedSoFar),
  };
}
