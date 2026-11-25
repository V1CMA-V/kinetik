import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SectionList, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import {
  type Transaction,
  useDeleteTransaction,
  useMonthTransactions,
} from '@/features/transactions/api';
import { TransactionRow } from '@/features/transactions/components/transaction-row';
import { useFormatMoney } from '@/hooks/use-format-money';
import { addMonths, formatDay, formatMonth, monthRange, today } from '@/lib/date';

export default function TransactionsScreen() {
  const formatAmount = useFormatMoney();
  const [month, setMonth] = useState(() => monthRange(today()).start);
  const isCurrentMonth = month === monthRange(today()).start;

  const transactions = useMonthTransactions(month);
  const remove = useDeleteTransaction();

  const { sections, income, expense } = useMemo(() => {
    const byDay = new Map<string, Transaction[]>();
    let income = 0;
    let expense = 0;
    for (const t of transactions.data ?? []) {
      if (t.kind === 'income') income += t.amount;
      if (t.kind === 'expense') expense += t.amount;
      byDay.set(t.occurred_on, [...(byDay.get(t.occurred_on) ?? []), t]);
    }
    const sections = [...byDay.entries()].map(([day, data]) => ({ title: formatDay(day), data }));
    return { sections, income, expense };
  }, [transactions.data]);

  const confirmDelete = (t: Transaction) => {
    Alert.alert('Eliminar movimiento', 'El saldo de las cuentas se ajustará automáticamente.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(t.id) },
    ]);
  };

  const balance = income - expense;

  return (
    <Screen className="pt-6">
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerClassName="pb-8"
        stickySectionHeadersEnabled={false}
        refreshing={transactions.isRefetching}
        onRefresh={transactions.refetch}
        ListHeaderComponent={
          <View className="mb-2 gap-5">
            <Text className="font-display text-3xl font-bold text-ink">Movimientos</Text>

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
              <SummaryCard label="Ingresos" value={income} className="text-income" />
              <SummaryCard label="Gastos" value={expense} className="text-expense" />
            </View>
            <View className="flex-row items-center justify-between rounded-card bg-accent px-5 py-4">
              <Text className="text-sm text-on-accent-muted">Balance del mes</Text>
              <Text className="font-display text-xl font-bold text-on-accent">
                {formatAmount(balance)}
              </Text>
            </View>

            <View className="gap-3">
              <Button title="Agregar movimiento" onPress={() => router.push('/transactions/new')} />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button
                    title="Suscripciones"
                    variant="secondary"
                    onPress={() => router.push('/transactions/subscriptions')}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    title="Presupuestos"
                    variant="secondary"
                    onPress={() => router.push('/transactions/budgets')}
                  />
                </View>
              </View>
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text className="mb-2 mt-5 text-sm font-semibold text-ink-muted">{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <View className="mb-2">
            <TransactionRow
              transaction={item}
              onPress={() =>
                router.push({ pathname: '/transactions/[id]', params: { id: item.id } })
              }
              onLongPress={() => confirmDelete(item)}
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
              No hay movimientos en {formatMonth(month).toLowerCase()}.
            </Text>
          )
        }
        ListFooterComponent={
          sections.length ? (
            <Text className="mt-3 text-center text-xs text-ink-muted">
              Toca para editar · mantén presionado para eliminar
            </Text>
          ) : undefined
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
  value: number;
  className: string;
}) {
  const formatAmount = useFormatMoney();
  return (
    <View className="flex-1 gap-1 rounded-card border border-line bg-card p-4">
      <Text className="text-xs text-ink-muted">{label}</Text>
      <Text className={`text-lg font-bold ${className}`}>{formatAmount(value)}</Text>
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
