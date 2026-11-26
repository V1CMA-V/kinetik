import { router } from 'expo-router';

import { useCreateGoal } from '@/features/goals/api';
import { GoalForm } from '@/features/goals/components/goal-form';
import { usePartner } from '@/features/household/api';

export default function NewGoalScreen() {
  const createGoal = useCreateGoal();
  const { householdId, partner } = usePartner();

  return (
    <GoalForm
      title="Nueva meta"
      // With a partner, a new goal starts as a couple goal.
      defaultValues={{ name: '', targetAmount: '', targetDate: '', shared: !!partner }}
      partnerName={partner?.name}
      onSubmit={({ shared, ...values }) =>
        createGoal.mutate(
          { ...values, household_id: shared && partner ? householdId : null },
          { onSuccess: () => router.back() },
        )
      }
      isSubmitting={createGoal.isPending}
      error={createGoal.error?.message}
    />
  );
}
