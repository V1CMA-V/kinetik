import { useMemo } from 'react';

import { usePartner } from '@/features/household/api';
import { today } from '@/lib/date';
import { useAuthStore } from '@/stores/auth-store';

import { type Goal, useGoals } from './api';
import { type GoalProgress, computeGoalProgress } from './progress';

export type GoalWithProgress = { goal: Goal; progress: GoalProgress };

/** Every goal with its progress: active ones closest to done first, then reached ones. */
export function useGoalsProgress() {
  const goals = useGoals();
  const now = today();

  const items = useMemo(
    () =>
      (goals.data ?? [])
        .map((goal) => ({ goal, progress: computeGoalProgress(goal, goal.contributions, now) }))
        .sort(
          (a, b) =>
            Number(a.progress.reached) - Number(b.progress.reached) ||
            b.progress.ratio - a.progress.ratio,
        ),
    [goals.data, now],
  );

  return { ...goals, items };
}

/** "Tú", the partner's name, or a fallback for someone who left the household. */
export function useMemberName() {
  const myId = useAuthStore((s) => s.session?.user.id);
  const { partner } = usePartner();
  return (userId: string) =>
    userId === myId ? 'Tú' : userId === partner?.id ? partner.name : 'Otra persona';
}
