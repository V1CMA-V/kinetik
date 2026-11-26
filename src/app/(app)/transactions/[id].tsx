import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { alert } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { usePartner } from '@/features/household/api';
import {
  useDeleteTransaction,
  useTransaction,
  useUpdateTransaction,
} from '@/features/transactions/api';
import { TransactionForm } from '@/features/transactions/components/transaction-form';
import { transactionToFormValues } from '@/features/transactions/schemas';
import { useAuthStore } from '@/stores/auth-store';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transaction = useTransaction(id);
  const updateTransaction = useUpdateTransaction();
  const remove = useDeleteTransaction();
  const myId = useAuthStore((s) => s.session?.user.id);
  const { partner } = usePartner();

  // After deleting, the refetch finds nothing; keep the spinner while the modal closes.
  if (transaction.isPending || remove.isPending || remove.isSuccess) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!transaction.data) {
    return (
      <Screen className="justify-center gap-4">
        <Text className="text-center text-base text-ink-muted">
          {transaction.error?.message ?? 'No encontramos este movimiento.'}
        </Text>
        <Button title="Volver" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const current = transaction.data;

  // On shared accounts each person edits only the movements they registered.
  if (current.user_id !== myId) {
    return (
      <Screen className="justify-center gap-4">
        <Text className="text-center text-base text-ink-muted">
          Este movimiento lo registró {partner?.name ?? 'tu pareja'}. Solo quien lo registró puede
          editarlo o eliminarlo.
        </Text>
        <Button title="Volver" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const confirmDelete = () => {
    alert('Eliminar movimiento', 'El saldo de las cuentas se ajustará automáticamente.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => remove.mutate(current.id, { onSuccess: () => router.back() }),
      },
    ]);
  };

  return (
    <TransactionForm
      title="Editar movimiento"
      mode="edit"
      defaultValues={transactionToFormValues(current)}
      onSubmit={(values) =>
        updateTransaction.mutate({ id: current.id, values }, { onSuccess: () => router.back() })
      }
      isSubmitting={updateTransaction.isPending}
      error={updateTransaction.error?.message ?? remove.error?.message}
    >
      {current.subscription_id ? (
        <Text className="text-center text-xs text-ink-muted">
          Cargo automático de una suscripción. Los cambios solo aplican a este cargo.
        </Text>
      ) : null}
      <Button title="Eliminar movimiento" variant="destructive" onPress={confirmDelete} />
    </TransactionForm>
  );
}
