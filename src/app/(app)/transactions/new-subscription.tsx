import { router } from 'expo-router';

import { useCreateSubscription } from '@/features/subscriptions/api';
import { SubscriptionForm } from '@/features/subscriptions/components/subscription-form';
import { today } from '@/lib/date';

export default function NewSubscriptionScreen() {
  const createSubscription = useCreateSubscription();

  return (
    <SubscriptionForm
      title="Nueva suscripción"
      defaultValues={{
        name: '',
        amount: '',
        frequency: 'monthly',
        accountId: '',
        nextChargeOn: today(),
      }}
      onSubmit={(values) => createSubscription.mutate(values, { onSuccess: () => router.back() })}
      isSubmitting={createSubscription.isPending}
      error={createSubscription.error?.message}
    />
  );
}
