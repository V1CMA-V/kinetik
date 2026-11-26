/** Savings goal math (pure, no React/Supabase). */
import { monthsBetween } from '@/lib/date';

export type GoalLike = { target_amount: number; target_date: string | null };
export type ContributionLike = { amount: number; user_id: string };

export type GoalProgress = {
  saved: number;
  /** 0–1+, can pass 1 when they saved more than the target. */
  ratio: number;
  /** Still missing (0 once reached). */
  remaining: number;
  reached: boolean;
  /** Net amount saved by each person, biggest first. */
  byUser: { userId: string; amount: number }[];
  /** Months left until the target date (at least 1), `null` without a date or once it passed. */
  monthsLeft: number | null;
  /** What to save per month to make it on time; `null` without a date or once reached. */
  monthlyNeeded: number | null;
  /** The target date passed without reaching the goal. */
  overdue: boolean;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeGoalProgress(
  goal: GoalLike,
  contributions: ContributionLike[],
  today: string,
): GoalProgress {
  const totals = new Map<string, number>();
  let saved = 0;
  for (const c of contributions) {
    saved += c.amount;
    totals.set(c.user_id, (totals.get(c.user_id) ?? 0) + c.amount);
  }
  saved = round2(saved);

  const remaining = round2(Math.max(0, goal.target_amount - saved));
  const reached = remaining === 0;
  const overdue = !reached && !!goal.target_date && goal.target_date < today;
  const monthsLeft =
    goal.target_date && !overdue ? Math.max(1, monthsBetween(today, goal.target_date)) : null;

  return {
    saved,
    ratio: goal.target_amount > 0 ? Math.max(0, saved) / goal.target_amount : 0,
    remaining,
    reached,
    byUser: [...totals]
      .map(([userId, amount]) => ({ userId, amount: round2(amount) }))
      .sort((a, b) => b.amount - a.amount),
    monthsLeft,
    monthlyNeeded: monthsLeft && !reached ? round2(remaining / monthsLeft) : null,
    overdue,
  };
}
