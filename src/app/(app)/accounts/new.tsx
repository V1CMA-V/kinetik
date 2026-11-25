import { router } from 'expo-router';

import { useCreateAccount } from '@/features/accounts/api';
import { AccountForm } from '@/features/accounts/components/account-form';

export default function NewAccountScreen() {
  const createAccount = useCreateAccount();

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
      }}
      onSubmit={(values) => createAccount.mutate(values, { onSuccess: () => router.back() })}
      isSubmitting={createAccount.isPending}
      error={createAccount.error?.message}
    />
  );
}
