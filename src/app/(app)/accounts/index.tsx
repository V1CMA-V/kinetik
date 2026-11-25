import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, View } from 'react-native';

import { alert } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/screen';
import { Icon } from '@/components/ui/icon';
import { PrivacyToggle } from '@/components/ui/privacy-toggle';
import { type Account, useAccounts, useArchiveAccount } from '@/features/accounts/api';
import { AccountCard } from '@/features/accounts/components/account-card';
import { type AccountType, DEFAULT_CURRENCY } from '@/features/accounts/constants';
import { groupAccountsByInstitution } from '@/features/accounts/group';
import { useCreditCardStatements } from '@/features/accounts/statements';
import { useFormatMoney } from '@/hooks/use-format-money';
import { useThemeColors } from '@/theme/colors';

type Filter = 'all' | 'debit' | 'investment' | 'credit';

const FILTERS: { value: Filter; label: string; types: AccountType[] }[] = [
  { value: 'all', label: 'Todas', types: [] },
  { value: 'debit', label: 'Débito', types: ['bank_account', 'cash'] },
  { value: 'investment', label: 'Inversión', types: ['investment'] },
  { value: 'credit', label: 'Crédito', types: ['credit_card'] },
];

export default function AccountsScreen() {
  const formatAmount = useFormatMoney();
  const colors = useThemeColors();
  const accounts = useAccounts();
  const statements = useCreditCardStatements();
  const archive = useArchiveAccount();
  const [filter, setFilter] = useState<Filter>('all');

  const all = useMemo(() => accounts.data ?? [], [accounts.data]);

  const totals = useMemo(() => {
    let cash = 0;
    let investments = 0;
    let debt = 0;
    for (const a of all) {
      if (a.type === 'credit_card') debt += Math.max(0, -a.balance);
      else if (a.type === 'investment') investments += a.balance;
      else cash += a.balance;
    }
    return { cash, investments, debt, assets: cash + investments };
  }, [all]);
  const net = totals.assets - totals.debt;

  // Only offer filters for account types the user actually has.
  const filters = FILTERS.filter(
    (f) => f.value === 'all' || all.some((a) => f.types.includes(a.type)),
  );
  const activeFilter = filters.some((f) => f.value === filter) ? filter : 'all';

  const sections = useMemo(() => {
    if (activeFilter === 'all') return groupAccountsByInstitution(all);
    const types = FILTERS.find((f) => f.value === activeFilter)!.types;
    const data = all.filter((a) => types.includes(a.type));
    return [{ title: '', total: data.reduce((sum, a) => sum + a.balance, 0), data }];
  }, [all, activeFilter]);

  const confirmArchive = (account: Account) => {
    alert('Archivar cuenta', `¿Quieres archivar "${account.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Archivar', style: 'destructive', onPress: () => archive.mutate(account.id) },
    ]);
  };

  const segments = [
    { key: 'cash', value: Math.max(0, totals.cash), className: 'bg-accent' },
    { key: 'investments', value: Math.max(0, totals.investments), className: 'bg-ink' },
    { key: 'debt', value: totals.debt, className: 'bg-expense' },
  ].filter((s) => s.value > 0);

  return (
    <Screen className="pt-6">
      <SectionList
        sections={all.length ? sections : []}
        keyExtractor={(item) => item.id}
        contentContainerClassName="pb-8"
        stickySectionHeadersEnabled={false}
        refreshing={accounts.isRefetching}
        onRefresh={() => {
          accounts.refetch();
          statements.refetch();
        }}
        ListHeaderComponent={
          <View className="mb-2 gap-5">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="font-display text-3xl font-bold text-ink">Cuentas</Text>
              <View className="flex-row items-center gap-2">
                <PrivacyToggle />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Agregar cuenta"
                  hitSlop={4}
                  onPress={() => router.push('/accounts/new')}
                  className="h-11 w-11 items-center justify-center rounded-full bg-accent active:opacity-80"
                  style={{ borderRadius: 22 }}
                >
                  <Icon ios="plus" android="add" color={colors['on-accent']} size={24} />
                </Pressable>
              </View>
            </View>

            {all.length ? (
              <View className="gap-3 rounded-card border border-line bg-card p-5">
                <View className="gap-1">
                  <Text className="text-sm font-medium text-ink-muted">Patrimonio neto</Text>
                  <Text
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    className={`font-display text-3xl font-bold tabular-nums ${
                      net < 0 ? 'text-expense' : 'text-ink'
                    }`}
                  >
                    {formatAmount(net, DEFAULT_CURRENCY)}
                  </Text>
                </View>
                {segments.length ? (
                  <View className="h-2.5 flex-row gap-1">
                    {segments.map((s) => (
                      <View
                        key={s.key}
                        className={`h-full rounded-full ${s.className}`}
                        style={{ flex: s.value }}
                      />
                    ))}
                  </View>
                ) : null}
                <View className="flex-row justify-between gap-3">
                  <Text className="text-xs text-ink-muted">
                    Activos{' '}
                    <Text className="text-xs font-semibold tabular-nums text-ink">
                      {formatAmount(totals.assets, DEFAULT_CURRENCY)}
                    </Text>
                  </Text>
                  <Text className="text-xs text-ink-muted">
                    Deudas{' '}
                    <Text className="text-xs font-semibold tabular-nums text-expense">
                      {totals.debt > 0 ? '-' : ''}
                      {formatAmount(totals.debt, DEFAULT_CURRENCY)}
                    </Text>
                  </Text>
                </View>
              </View>
            ) : null}

            {filters.length > 2 ? (
              <View className="flex-row flex-wrap gap-2">
                {filters.map((f) => {
                  const selected = f.value === activeFilter;
                  return (
                    <Pressable
                      key={f.value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => setFilter(f.value)}
                      className={`h-9 justify-center rounded-full px-4 active:opacity-70 ${
                        selected ? 'bg-ink' : 'bg-sunken'
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${selected ? 'text-surface' : 'text-ink'}`}
                      >
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) =>
          section.title ? (
            <View className="mb-2 mt-5 flex-row items-baseline justify-between px-1">
              <Text className="text-lg font-bold text-ink">{section.title}</Text>
              <Text
                className={`text-sm font-semibold tabular-nums ${
                  section.total < 0 ? 'text-expense' : 'text-ink-muted'
                }`}
              >
                {formatAmount(section.total, DEFAULT_CURRENCY)}
              </Text>
            </View>
          ) : (
            <View className="mt-3" />
          )
        }
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
            <Text className="mt-8 text-center text-expense">{accounts.error.message}</Text>
          ) : (
            <Text className="mt-8 text-center text-ink-muted">
              Aún no tienes cuentas. Agrega tu cuenta de nómina, tarjeta de crédito o efectivo con
              el botón +.
            </Text>
          )
        }
        ListFooterComponent={
          all.length ? (
            <Text className="mt-2 text-center text-xs text-ink-muted">
              Toca una cuenta para ver sus movimientos o mantenla presionada para archivarla.
            </Text>
          ) : undefined
        }
      />
    </Screen>
  );
}
