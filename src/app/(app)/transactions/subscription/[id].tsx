import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { alert } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import {
  useDeleteSubscription,
  useSubscription,
  useUpdateSubscription,
} from '@/features/subscriptions/api';
import { SubscriptionForm } from '@/features/subscriptions/components/subscription-form';
import { subscriptionToFormValues } from '@/features/subscriptions/schemas';

export default function EditSubscriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const subscription = useSubscription(id);
  const updateSubscription = useUpdateSubscription();
  const remove = useDeleteSubscription();

  // After deleting, the refetch finds nothing; keep the spinner while the modal closes.
  if (subscription.isPending || remove.isPending || remove.isSuccess) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!subscription.data) {
    return (
      <Screen className="justify-center gap-4">
        <Text className="text-center text-base text-ink-muted">
          {subscription.error?.message ?? 'No encontramos esta suscripción.'}
        </Text>
        <Button title="Volver" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const current = subscription.data;

  const confirmDelete = () => {
    alert('Eliminar suscripción', 'Los cargos que ya se registraron se quedan en Movimientos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => remove.mutate(current.id, { onSuccess: () => router.back() }),
      },
    ]);
  };

  return (
    <SubscriptionForm
      title="Editar suscripción"
      mode="edit"
      defaultValues={subscriptionToFormValues(current)}
      onSubmit={({ anchor_on, ...values }) => {
        // A new date restarts the schedule there; otherwise the charge count is kept
        // (and a frequency-only change is re-anchored by the DB at the pending charge).
        const dateChanged = anchor_on !== current.next_charge_on;
        updateSubscription.mutate(
          {
            id: current.id,
            values: dateChanged ? { ...values, anchor_on, charged_count: 0 } : values,
          },
          { onSuccess: () => router.back() },
        );
      }}
      isSubmitting={updateSubscription.isPending}
      error={updateSubscription.error?.message ?? remove.error?.message}
    >
      <Button title="Eliminar suscripción" variant="destructive" onPress={confirmDelete} />
    </SubscriptionForm>
  );
}
