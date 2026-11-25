import { router } from 'expo-router';

import { useCreateBudget } from '@/features/budgets/api';
import { BudgetForm } from '@/features/budgets/components/budget-form';

export default function NewBudgetScreen() {
  const createBudget = useCreateBudget();

  return (
    <BudgetForm
      title="Nuevo presupuesto"
      defaultValues={{ category: '', amount: '' }}
      onSubmit={(values) => createBudget.mutate(values, { onSuccess: () => router.back() })}
      isSubmitting={createBudget.isPending}
      error={createBudget.error?.message}
    />
  );
}
