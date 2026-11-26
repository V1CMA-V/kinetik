import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { alert } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { useDeleteGoal, useGoal, useUpdateGoal } from '@/features/goals/api';
import { GoalForm } from '@/features/goals/components/goal-form';
import { computeGoalProgress } from '@/features/goals/progress';
import { goalToFormValues } from '@/features/goals/schemas';
import { usePartner } from '@/features/household/api';
import { today } from '@/lib/date';
import { useAuthStore } from '@/stores/auth-store';

export default function EditGoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goal = useGoal(id);
  const updateGoal = useUpdateGoal();
  const remove = useDeleteGoal();
  const myId = useAuthStore((s) => s.session?.user.id);
  const { householdId, partner } = usePartner();

  // After deleting, the refetch finds nothing; keep the spinner while the modal closes.
  if (goal.isPending || remove.isPending || remove.isSuccess) {
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
  const isOwner = current.user_id === myId;

  const confirmDelete = () => {
    alert('Eliminar meta', `Se borrarán "${current.name}" y todas sus aportaciones.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        // Back twice: this modal and the goal detail behind it.
        onPress: () =>
          remove.mutate(current.id, { onSuccess: () => router.dismissTo('/accounts/goals') }),
      },
    ]);
  };

  return (
    <GoalForm
      title="Editar meta"
      defaultValues={goalToFormValues(current)}
      partnerName={partner?.name}
      shareLocked={!isOwner}
      saved={computeGoalProgress(current, current.contributions, today()).saved}
      onSubmit={({ shared, ...values }) =>
        updateGoal.mutate(
          {
            id: current.id,
            // Only the owner moves the goal in or out of the household.
            values: isOwner
              ? { ...values, household_id: shared && partner ? householdId : null }
              : values,
          },
          { onSuccess: () => router.back() },
        )
      }
      isSubmitting={updateGoal.isPending}
      error={updateGoal.error?.message ?? remove.error?.message}
    >
      {isOwner ? (
        <Button title="Eliminar meta" variant="destructive" onPress={confirmDelete} />
      ) : null}
    </GoalForm>
  );
}
