import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { TablesInsert, TablesUpdate } from '@/types/database';

const GOAL_SELECT = '*, contributions:goal_contributions (amount, user_id)';
const GOAL_DETAIL_SELECT =
  '*, contributions:goal_contributions (id, amount, user_id, contributed_on, note, created_at)';

export const goalKeys = {
  all: ['goals'] as const,
  detail: (id: string) => [...goalKeys.all, 'detail', id] as const,
};

/** Spanish messages for the errors raised by the goals triggers. */
const DB_ERRORS: Record<string, string> = {
  goal_share_owner_only: 'Solo quien creó la meta puede compartirla o dejar de compartirla.',
  goal_owner_immutable: 'No se puede cambiar quién creó la meta.',
};

function toGoalError(error: { message: string }) {
  return new Error(DB_ERRORS[error.message] ?? error.message);
}

/** Your goals and the shared ones, with every contribution's amount and author. */
export function useGoals() {
  return useQuery({
    queryKey: goalKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select(GOAL_SELECT)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export type Goal = NonNullable<ReturnType<typeof useGoals>['data']>[number];

/** A single goal with its contributions (newest first); `null` if it doesn't exist. */
export function useGoal(id: string) {
  return useQuery({
    queryKey: goalKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select(GOAL_DETAIL_SELECT)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const contributions = [...data.contributions].sort(
        (a, b) =>
          b.contributed_on.localeCompare(a.contributed_on) ||
          b.created_at.localeCompare(a.created_at),
      );
      return { ...data, contributions };
    },
  });
}

export type GoalDetail = NonNullable<ReturnType<typeof useGoal>['data']>;
export type GoalContribution = GoalDetail['contributions'][number];

function useInvalidateGoals() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: goalKeys.all });
}

/**
 * Keeps `completed_at` in step with the contributions: set when the total reaches
 * the target, cleared if a withdrawal drops it below again.
 */
async function syncCompletion(goalId: string) {
  const [goal, contributions] = await Promise.all([
    supabase.from('goals').select('target_amount, completed_at').eq('id', goalId).single(),
    supabase.from('goal_contributions').select('amount').eq('goal_id', goalId),
  ]);
  if (goal.error) throw goal.error;
  if (contributions.error) throw contributions.error;

  const saved = contributions.data.reduce((sum, c) => sum + c.amount, 0);
  const reached = Math.round(saved * 100) >= Math.round(goal.data.target_amount * 100);
  if (reached === !!goal.data.completed_at) return;

  const { error } = await supabase
    .from('goals')
    .update({ completed_at: reached ? new Date().toISOString() : null })
    .eq('id', goalId);
  if (error) throw toGoalError(error);
}

export function useCreateGoal() {
  const invalidate = useInvalidateGoals();

  return useMutation({
    mutationFn: async (goal: TablesInsert<'goals'>) => {
      const { error } = await supabase.from('goals').insert(goal);
      if (error) throw toGoalError(error);
    },
    onSuccess: invalidate,
  });
}

export function useUpdateGoal() {
  const invalidate = useInvalidateGoals();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TablesUpdate<'goals'> }) => {
      const { error } = await supabase.from('goals').update(values).eq('id', id);
      if (error) throw toGoalError(error);
      // A new target can complete (or reopen) the goal.
      await syncCompletion(id);
    },
    onSuccess: invalidate,
  });
}

/** Deleting a goal also deletes its contributions. */
export function useDeleteGoal() {
  const invalidate = useInvalidateGoals();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw toGoalError(error);
    },
    onSuccess: invalidate,
  });
}

export function useAddContribution() {
  const invalidate = useInvalidateGoals();

  return useMutation({
    mutationFn: async (contribution: TablesInsert<'goal_contributions'>) => {
      const { error } = await supabase.from('goal_contributions').insert(contribution);
      if (error) throw toGoalError(error);
      await syncCompletion(contribution.goal_id);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteContribution() {
  const invalidate = useInvalidateGoals();

  return useMutation({
    mutationFn: async ({ id, goalId }: { id: string; goalId: string }) => {
      const { error } = await supabase.from('goal_contributions').delete().eq('id', id);
      if (error) throw toGoalError(error);
      await syncCompletion(goalId);
    },
    onSuccess: invalidate,
  });
}
