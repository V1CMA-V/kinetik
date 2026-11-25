import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { useAccount } from '@/features/accounts/api';
import { AccountCard } from '@/features/accounts/components/account-card';
import { useCreditCardStatements } from '@/features/accounts/statements';
import { type Transaction, useAccountTransactions } from '@/features/transactions/api';
import { TransactionRow } from '@/features/transactions/components/transaction-row';
import { useFormatMoney } from '@/hooks/use-format-money';
import { addMonths, formatDay, formatMonth, monthRange, today } from '@/lib/date';

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const formatAmount = useFormatMoney();
  const [month, setMonth] = useState(() => monthRange(today()).start);
  const isCurrentMonth = month === monthRange(today()).start;

  const account = useAccount(id);
  const statements = useCreditCardStatements();
  const transactions = useAccountTransactions(id, month);

  const isCredit = account.data?.type === 'credit_card';

  // Money in: income and transfers into the account (card payments, for credit cards).
  // Money out: expenses and transfers out of it.
  const { sections, moneyIn, moneyOut } = useMemo(() => {
    const byDay = new Map<string, Transaction[]>();
    let moneyIn = 0;
    let moneyOut = 0;
    for (const t of transactions.data ?? []) {
      if (t.kind === 'income' || (t.kind === 'transfer' && t.to_account_id === id)) {
        moneyIn += t.amount;
      } else {
        moneyOut += t.amount;
      }
      byDay.set(t.occurred_on, [...(byDay.get(t.occurred_on) ?? []), t]);
    }
    const sections = [...byDay.entries()].map(([day, data]) => ({ title: formatDay(day), data }));
    return { sections, moneyIn, moneyOut };
  }, [transactions.data, id]);

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

  return (
    <Screen className="pt-6">
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerClassName="pb-8"
        stickySectionHeadersEnabled={false}
        refreshing={transactions.isRefetching}
        onRefresh={() => {
          account.refetch();
          statements.refetch();
          transactions.refetch();
        }}
        ListHeaderComponent={
          <View className="mb-2 gap-5">
            <View className="flex-row items-center justify-between">
              <Text
                className="text-base font-semibold text-accent-ink"
                onPress={() => router.back()}
              >
                ‹ Cuentas
              </Text>
              <Text
                className="text-base font-semibold text-accent-ink"
                onPress={() =>
                  router.push({ pathname: '/accounts/[id]/edit', params: { id: current.id } })
                }
              >
                Editar
              </Text>
            </View>

            <AccountCard account={current} statement={statements.statements[current.id]} />

            <View className="flex-row items-center justify-between">
              <MonthButton label="‹" onPress={() => setMonth(addMonths(month, -1))} />
              <Text className="text-lg font-semibold text-ink">{formatMonth(month)}</Text>
              <MonthButton
                label="›"
                disabled={isCurrentMonth}
                onPress={() => setMonth(addMonths(month, 1))}
              />
            </View>

            <View className="flex-row gap-3">
              <SummaryCard
                label={isCredit ? 'Pagos' : 'Ingresos'}
                value={formatAmount(moneyIn, current.currency)}
                className="text-income"
              />
              <SummaryCard
                label={isCredit ? 'Cargos' : 'Gastos'}
                value={formatAmount(moneyOut, current.currency)}
                className="text-expense"
              />
            </View>
            <Text className="-mt-2 text-xs text-ink-muted">
              {isCredit
                ? 'Las compras a meses cuentan completas el día de la compra.'
                : 'Incluye transferencias de y hacia otras cuentas.'}
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text className="mb-2 mt-5 text-sm font-semibold text-ink-muted">{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <View className="mb-2">
            <TransactionRow
              transaction={item}
              accountId={current.id}
              onPress={() =>
                router.push({ pathname: '/transactions/[id]', params: { id: item.id } })
              }
            />
          </View>
        )}
        ListEmptyComponent={
          transactions.isPending ? (
            <ActivityIndicator className="mt-8" />
          ) : transactions.isError ? (
            <Text className="mt-8 text-center text-expense">{transactions.error.message}</Text>
          ) : (
            <Text className="mt-8 text-center text-ink-muted">
              Sin movimientos en {formatMonth(month).toLowerCase()}.
            </Text>
          )
        }
      />
    </Screen>
  );
}

function SummaryCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className: string;
}) {
  return (
    <View className="flex-1 gap-1 rounded-card border border-line bg-card p-4">
      <Text className="text-xs text-ink-muted">{label}</Text>
      <Text className={`text-lg font-bold ${className}`}>{value}</Text>
    </View>
  );
}

function MonthButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === '‹' ? 'Mes anterior' : 'Mes siguiente'}
      onPress={onPress}
      disabled={disabled}
      className="h-10 w-10 items-center justify-center rounded-full bg-sunken active:opacity-70 disabled:opacity-30"
    >
      <Text className="text-xl text-ink">{label}</Text>
    </Pressable>
  );
}
