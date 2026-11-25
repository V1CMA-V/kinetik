import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { alert } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { useAccount, useArchiveAccount, useUpdateAccount } from '@/features/accounts/api';
import { AccountForm } from '@/features/accounts/components/account-form';
import { accountToFormValues } from '@/features/accounts/schemas';

export default function EditAccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const account = useAccount(id);
  const updateAccount = useUpdateAccount();
  const archive = useArchiveAccount();

  if (account.isPending) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!account.data) {
    return (
      <Screen className="justify-center gap-4">
        <Text className="text-center text-base text-ink-muted">
          {account.error?.message ?? 'No encontramos esta cuenta.'}
        </Text>
        <Button title="Volver" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const current = account.data;

  const confirmArchive = () => {
    alert('Archivar cuenta', `¿Quieres archivar "${current.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Archivar',
        style: 'destructive',
        // The detail screen behind this modal belongs to the archived account, so go to the list.
        onPress: () =>
          archive.mutate(current.id, { onSuccess: () => router.dismissTo('/accounts') }),
      },
    ]);
  };

  return (
    <AccountForm
      title="Editar cuenta"
      mode="edit"
      defaultValues={accountToFormValues(current)}
      // The type is locked in edit mode, so only the editable columns are sent.
      onSubmit={({ type: _type, ...values }) =>
        updateAccount.mutate({ id: current.id, values }, { onSuccess: () => router.back() })
      }
      isSubmitting={updateAccount.isPending}
      error={updateAccount.error?.message ?? archive.error?.message}
    >
      {current.is_active ? (
        <Button
          title="Archivar cuenta"
          variant="destructive"
          loading={archive.isPending}
          onPress={confirmArchive}
        />
      ) : null}
    </AccountForm>
  );
}
