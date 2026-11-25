/**
 * End-of-month projection (pure, no React).
 *
 * Spending dated after today (MSI installments with a later cut, future-dated
 * expenses) is already committed, so it's added as is; the rest of the month is
 * extrapolated from the daily average of what was spent up to today.
 */

export type MonthProjection = {
  /** Day of the month that "today" is (1-based). */
  day: number;
  daysInMonth: number;
  spentToDate: number;
  dailyAverage: number;
  /** Already committed for the rest of the month. */
  scheduled: number;
  projected: number;
  /** Cumulative spending per day: real up to `day`, projected after it. */
  cumulative: number[];
  /** Cumulative spending of the previous month per day (capped at its length). */
  previousCumulative: number[] | null;
  /** Previous month's spending up to the same day, for a fair comparison. */
  previousToDate: number | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function accumulate(values: number[]) {
  let sum = 0;
  return values.map((v) => (sum += v));
}

export function computeProjection(
  byDay: number[],
  day: number,
  previousByDay: number[] | null,
): MonthProjection {
  const daysInMonth = byDay.length;
  const spentToDate = byDay.slice(0, day).reduce((a, b) => a + b, 0);
  const scheduledByDay = byDay.slice(day);
  const scheduled = scheduledByDay.reduce((a, b) => a + b, 0);
  const dailyAverage = day ? spentToDate / day : 0;
  const remainingDays = daysInMonth - day;
  const projected = spentToDate + dailyAverage * remainingDays + scheduled;

  const real = accumulate(byDay.slice(0, day));
  const ahead = accumulate(scheduledByDay.map((v) => v + dailyAverage)).map((v) => v + spentToDate);

  const previousCumulative = previousByDay ? accumulate(previousByDay) : null;
  const previousToDate = previousCumulative
    ? (previousCumulative[Math.min(day, previousCumulative.length) - 1] ?? 0)
    : null;

  return {
    day,
    daysInMonth,
    spentToDate: round2(spentToDate),
    dailyAverage: round2(dailyAverage),
    scheduled: round2(scheduled),
    projected: round2(projected),
    cumulative: [...real, ...ahead].map(round2),
    previousCumulative,
    previousToDate: previousToDate === null ? null : round2(previousToDate),
  };
}
