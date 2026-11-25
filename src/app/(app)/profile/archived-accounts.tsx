import { router } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import {
  type Account,
  useArchivedAccounts,
  useDeleteAccount,
  useRestoreAccount,
} from '@/features/accounts/api';
import { ArchivedAccountRow } from '@/features/accounts/components/archived-account-row';

const showError = (title: string) => (error: Error) => Alert.alert(title, error.message);

export default function ArchivedAccountsScreen() {
  const archived = useArchivedAccounts();
  const restore = useRestoreAccount();
  const remove = useDeleteAccount();

  const confirmDelete = (account: Account) =>
    Alert.alert(
      'Eliminar cuenta',
      `"${account.name}" se eliminará de forma permanente. Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () =>
            remove.mutate(account.id, { onError: showError('No se pudo eliminar la cuenta') }),
        },
      ],
    );

  const showOptions = (account: Account) =>
    Alert.alert(account.name, 'Restáurala para volver a usarla en Cuentas y Movimientos.', [
      {
        text: 'Restaurar',
        onPress: () =>
          restore.mutate(account.id, { onError: showError('No se pudo restaurar la cuenta') }),
      },
      { text: 'Eliminar', style: 'destructive', onPress: () => confirmDelete(account) },
      { text: 'Cancelar', style: 'cancel' },
    ]);

  return (
    <Screen className="pt-6">
      <FlatList
        data={archived.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-2 pb-8"
        refreshing={archived.isRefetching}
        onRefresh={() => archived.refetch()}
        ListHeaderComponent={
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-3xl font-bold text-neutral-900 dark:text-white">
              Cuentas archivadas
            </Text>
            <Text className="text-base font-semibold text-brand-500" onPress={() => router.back()}>
              Listo
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ArchivedAccountRow account={item} onPress={() => showOptions(item)} />
        )}
        ListEmptyComponent={
          archived.isPending ? (
            <ActivityIndicator className="mt-8" />
          ) : archived.isError ? (
            <Text className="mt-8 text-center text-red-500">{archived.error.message}</Text>
          ) : (
            <Text className="mt-8 text-center text-neutral-500">
              No tienes cuentas archivadas. Al archivar una cuenta desde Cuentas aparecerá aquí.
            </Text>
          )
        }
        ListFooterComponent={
          archived.data?.length ? (
            <Text className="mt-3 text-center text-xs text-neutral-500">
              Toca una cuenta para restaurarla o eliminarla
            </Text>
          ) : undefined
        }
      />
    </Screen>
  );
}
