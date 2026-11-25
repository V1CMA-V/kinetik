import { router } from 'expo-router';

import { useCreateTransaction } from '@/features/transactions/api';
import { TransactionForm } from '@/features/transactions/components/transaction-form';
import { today } from '@/lib/date';

export default function NewTransactionScreen() {
  const createTransaction = useCreateTransaction();

  return (
    <TransactionForm
      title="Nuevo movimiento"
      defaultValues={{
        kind: 'expense',
        amount: '',
        accountId: '',
        toAccountId: undefined,
        category: undefined,
        description: '',
        occurredOn: today(),
        installmentMonths: null,
      }}
      onSubmit={(values) => createTransaction.mutate(values, { onSuccess: () => router.back() })}
      isSubmitting={createTransaction.isPending}
      error={createTransaction.error?.message}
    />
  );
}
