import { router } from 'expo-router';

import { useCreateAccount } from '@/features/accounts/api';
import { AccountForm } from '@/features/accounts/components/account-form';
import { usePartner } from '@/features/household/api';

export default function NewAccountScreen() {
  const createAccount = useCreateAccount();
  const { householdId, partner } = usePartner();

  return (
    <AccountForm
      title="Nueva cuenta"
      defaultValues={{
        name: '',
        type: 'bank_account',
        institution: '',
        balance: '',
        creditLimit: '',
        statementDay: '',
        paymentDueDay: '',
        shared: false,
      }}
      partnerName={partner?.name}
      onSubmit={({ shared, ...values }) =>
        createAccount.mutate(
          { ...values, household_id: shared && partner ? householdId : null },
          { onSuccess: () => router.back() },
        )
      }
      isSubmitting={createAccount.isPending}
      error={createAccount.error?.message}
    />
  );
}
