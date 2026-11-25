import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SectionList, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Screen } from '@/components/screen';
import { Fab } from '@/components/ui/fab';
import { Icon } from '@/components/ui/icon';
import { MonthSwitcher } from '@/components/ui/month-switcher';
import {
  type Transaction,
  useDeleteTransaction,
  useMonthTransactions,
} from '@/features/transactions/api';
import { TransactionRow } from '@/features/transactions/components/transaction-row';
import { useFormatMoney } from '@/hooks/use-format-money';
import { formatDay, formatMonth, monthRange, today } from '@/lib/date';
import { useThemeColors } from '@/theme/colors';

export default function TransactionsScreen() {
  const formatAmount = useFormatMoney();
  const [month, setMonth] = useState(() => monthRange(today()).start);

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
        contentContainerClassName="pb-24"
        stickySectionHeadersEnabled={false}
        refreshing={transactions.isRefetching}
        onRefresh={transactions.refetch}
        ListHeaderComponent={
          <View className="mb-2 gap-5">
            <Text className="font-display text-3xl font-bold text-ink">Movimientos</Text>

            <View className="flex-row gap-2">
              <ShortcutChip
                label="Suscripciones"
                ios="repeat"
                android="autorenew"
                onPress={() => router.push('/transactions/subscriptions')}
              />
              <ShortcutChip
                label="Presupuestos"
                ios="chart.pie"
                android="pie_chart"
                onPress={() => router.push('/transactions/budgets')}
              />
            </View>

            <MonthSwitcher month={month} onChange={setMonth} />

            <View className="gap-4 rounded-card border border-line bg-card p-4">
              <View className="flex-row">
                <SummaryValue
                  label="Ingresos"
                  value={formatAmount(income)}
                  className="text-income"
                />
                <View className="w-px bg-line" />
                <SummaryValue
                  label="Gastos"
                  value={formatAmount(expense)}
                  className="text-expense"
                  align="end"
                />
              </View>
              <View className="flex-row items-baseline justify-between border-t border-line pt-3">
                <Text className="text-sm font-medium text-ink-muted">Balance del mes</Text>
                <Text
                  className={`font-display text-xl font-bold tabular-nums ${
                    balance < 0 ? 'text-expense' : 'text-ink'
                  }`}
                >
                  {formatAmount(balance)}
                </Text>
              </View>
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text className="mb-2 mt-6 px-1 text-sm font-semibold text-ink-muted">
            {section.title}
          </Text>
        )}
        renderItem={({ item, index, section }) => (
          <TransactionRow
            transaction={item}
            group={{ index, count: section.data.length }}
            onPress={() => router.push({ pathname: '/transactions/[id]', params: { id: item.id } })}
            onLongPress={() => confirmDelete(item)}
          />
        )}
        ListEmptyComponent={
          transactions.isPending ? (
            <ActivityIndicator className="mt-8" />
          ) : transactions.isError ? (
            <Text className="mt-8 text-center text-expense">{transactions.error.message}</Text>
          ) : (
            <Text className="mt-8 text-center text-ink-muted">
              No hay movimientos en {formatMonth(month).toLowerCase()}. Registra uno con el botón
              Movimiento.
            </Text>
          )
        }
        ListFooterComponent={
          sections.length ? (
            <Text className="mt-4 text-center text-xs text-ink-muted">
              Toca un movimiento para editarlo o mantenlo presionado para eliminarlo.
            </Text>
          ) : undefined
        }
      />
      <Fab label="Movimiento" href="/transactions/new" />
    </Screen>
  );
}

function SummaryValue({
  label,
  value,
  className,
  align = 'start',
}: {
  label: string;
  value: string;
  className: string;
  align?: 'start' | 'end';
}) {
  return (
    <View className={`flex-1 gap-0.5 ${align === 'end' ? 'items-end' : ''}`}>
      <Text className="text-xs text-ink-muted">{label}</Text>
      <Text className={`text-lg font-bold tabular-nums ${className}`}>{value}</Text>
    </View>
  );
}

function ShortcutChip({
  label,
  ios,
  android,
  onPress,
}: {
  label: string;
  ios: 'repeat' | 'chart.pie';
  android: 'autorenew' | 'pie_chart';
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="h-10 flex-row items-center gap-1.5 rounded-full bg-sunken px-4 active:opacity-70"
    >
      <Icon ios={ios} android={android} color={colors.ink} size={18} />
      <Text className="text-sm font-semibold text-ink">{label}</Text>
    </Pressable>
  );
}
