import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Text } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { useBudget, useDeleteBudget, useUpdateBudget } from '@/features/budgets/api';
import { BudgetForm } from '@/features/budgets/components/budget-form';
import { budgetToFormValues } from '@/features/budgets/schemas';

export default function EditBudgetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const budget = useBudget(id);
  const updateBudget = useUpdateBudget();
  const remove = useDeleteBudget();

  // After deleting, the refetch finds nothing; keep the spinner while the modal closes.
  if (budget.isPending || remove.isPending || remove.isSuccess) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!budget.data) {
    return (
      <Screen className="justify-center gap-4">
        <Text className="text-center text-base text-neutral-500">
          {budget.error?.message ?? 'No encontramos este presupuesto.'}
        </Text>
        <Button title="Volver" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const current = budget.data;

  const confirmDelete = () => {
    Alert.alert('Eliminar presupuesto', `Dejarás de ver el límite de ${current.category}.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => remove.mutate(current.id, { onSuccess: () => router.back() }),
      },
    ]);
  };

  return (
    <BudgetForm
      title="Editar presupuesto"
      mode="edit"
      defaultValues={budgetToFormValues(current)}
      // The category is locked; only the limit changes.
      onSubmit={({ amount }) =>
        updateBudget.mutate(
          { id: current.id, values: { amount } },
          { onSuccess: () => router.back() },
        )
      }
      isSubmitting={updateBudget.isPending}
      error={updateBudget.error?.message ?? remove.error?.message}
    >
      <Button title="Eliminar presupuesto" variant="destructive" onPress={confirmDelete} />
    </BudgetForm>
  );
}
