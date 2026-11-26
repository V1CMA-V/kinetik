import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAddContribution, useGoal } from '@/features/goals/api';
import { ContributionForm } from '@/features/goals/components/contribution-form';
import { computeGoalProgress } from '@/features/goals/progress';
import { today } from '@/lib/date';

export default function ContributeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goal = useGoal(id);
  const addContribution = useAddContribution();

  if (goal.isPending) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!goal.data) {
    return (
      <Screen className="justify-center gap-4">
        <Text className="text-center text-base text-ink-muted">
          {goal.error?.message ?? 'No encontramos esta meta.'}
        </Text>
        <Button title="Volver" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const current = goal.data;
  const progress = computeGoalProgress(current, current.contributions, today());

  return (
    <ContributionForm
      goalName={current.name}
      remaining={progress.remaining}
      onSubmit={(values) =>
        addContribution.mutate(
          { ...values, goal_id: current.id },
          { onSuccess: () => router.back() },
        )
      }
      isSubmitting={addContribution.isPending}
      error={addContribution.error?.message}
    />
  );
}
