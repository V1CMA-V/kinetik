import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Alert, Pressable, SectionList, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { type Account, useAccounts, useArchiveAccount } from '@/features/accounts/api';
import { AccountCard } from '@/features/accounts/components/account-card';
import { DEFAULT_CURRENCY } from '@/features/accounts/constants';
import { groupAccountsByInstitution } from '@/features/accounts/group';
import { useCreditCardStatements } from '@/features/accounts/statements';
import { useFormatMoney } from '@/hooks/use-format-money';
import { useSettingsStore } from '@/stores/settings-store';

export default function AccountsScreen() {
  const formatAmount = useFormatMoney();
  const hideAmounts = useSettingsStore((s) => s.hideAmounts);
  const setHideAmounts = useSettingsStore((s) => s.setHideAmounts);
  const accounts = useAccounts();
  const statements = useCreditCardStatements();
  const archive = useArchiveAccount();

  const sections = useMemo(() => groupAccountsByInstitution(accounts.data ?? []), [accounts.data]);
  const total = sections.reduce((sum, s) => sum + s.total, 0);

  const confirmArchive = (account: Account) => {
    Alert.alert('Archivar cuenta', `¿Quieres archivar "${account.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Archivar', style: 'destructive', onPress: () => archive.mutate(account.id) },
    ]);
  };

  return (
    <Screen className="pt-6">
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerClassName="pb-8"
        stickySectionHeadersEnabled={false}
        refreshing={accounts.isRefetching}
        onRefresh={() => {
          accounts.refetch();
          statements.refetch();
        }}
        ListHeaderComponent={
          <View className="mb-2 gap-6">
            <View className="flex-row items-center justify-between">
              <Text className="text-3xl font-bold text-neutral-900 dark:text-white">Cuentas</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={hideAmounts ? 'Mostrar montos' : 'Ocultar montos'}
                hitSlop={8}
                onPress={() => setHideAmounts(!hideAmounts)}
                className="h-10 w-10 items-center justify-center rounded-full active:opacity-60"
              >
                <Text className="text-xl">{hideAmounts ? '🙈' : '👁'}</Text>
              </Pressable>
            </View>
            <View className="gap-1 rounded-2xl bg-brand-500 p-5">
              <Text className="text-sm text-brand-50">Saldo total</Text>
              <Text className="text-3xl font-bold text-white">
                {formatAmount(total, DEFAULT_CURRENCY)}
              </Text>
              <Text className="text-xs text-brand-100">Las deudas de tarjetas se restan</Text>
            </View>
            <Button title="Agregar cuenta" onPress={() => router.push('/accounts/new')} />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View className="mb-2 mt-5 flex-row items-baseline justify-between">
            <Text className="text-lg font-bold text-neutral-900 dark:text-white">
              {section.title}
            </Text>
            <Text
              className={`text-sm font-semibold ${
                section.total < 0 ? 'text-red-500' : 'text-neutral-500'
              }`}
            >
              {formatAmount(section.total, DEFAULT_CURRENCY)}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View className="mb-3">
            <AccountCard
              account={item}
              statement={statements.statements[item.id]}
              onPress={() => router.push({ pathname: '/accounts/[id]', params: { id: item.id } })}
              onLongPress={() => confirmArchive(item)}
            />
          </View>
        )}
        ListEmptyComponent={
          accounts.isPending ? (
            <ActivityIndicator className="mt-8" />
          ) : accounts.isError ? (
            <Text className="mt-8 text-center text-red-500">{accounts.error.message}</Text>
          ) : (
            <Text className="mt-8 text-center text-neutral-500">
              Aún no tienes cuentas. Agrega tu cuenta de nómina, tarjeta de crédito o efectivo.
            </Text>
          )
        }
        ListFooterComponent={
          accounts.data?.length ? (
            <Text className="mt-2 text-center text-xs text-neutral-500">
              Toca una cuenta para editarla · mantén presionada para archivarla
            </Text>
          ) : undefined
        }
      />
    </Screen>
  );
}
