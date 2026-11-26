import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, SectionList, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { CategoryTrend } from '@/features/analysis/components/category-trend';
import { useSpendingHistory } from '@/features/analysis/use-spending-history';
import { useBudgetProgress } from '@/features/budgets/api';
import { useScope } from '@/features/household/components/scope-filter';
import { filterByScope } from '@/features/household/scope';
import { type Transaction, useMonthTransactions } from '@/features/transactions/api';
import { TransactionRow } from '@/features/transactions/components/transaction-row';
import { useFormatMoney } from '@/hooks/use-format-money';
import { formatDay, formatMonth, monthRange, today } from '@/lib/date';
import { useThemeColors } from '@/theme/colors';

/** Same fallback as the budgets for expenses saved without a category. */
const FALLBACK_CATEGORY = 'Otros';

const BAR_CLASSES = { ok: 'bg-income', warning: 'bg-warning', over: 'bg-expense' } as const;

export default function CategoryDetailScreen() {
  const params = useLocalSearchParams<{ category: string; month?: string }>();
  const category = params.category;
  const month = params.month ?? monthRange(today()).start;

  const formatAmount = useFormatMoney();
  const colors = useThemeColors();
  const scope = useScope();
  const history = useSpendingHistory(month, scope);
  const transactions = useMonthTransactions(month);
  const budgets = useBudgetProgress(month);

  const trend = history.months.map((m) => ({
    month: m.month,
    amount: m.spending?.byCategory.find((c) => c.category === category)?.amount ?? 0,
  }));
  const amount = trend[trend.length - 1].amount;
  const monthTotal = history.months[history.months.length - 1].spending?.total ?? 0;
  const previous = trend.slice(0, -1).filter((m) => m.amount > 0);
  const average = previous.length
    ? previous.reduce((sum, m) => sum + m.amount, 0) / previous.length
    : 0;
  // Budgets cover all your spending, so they only compare against the "Todo" view.
  const budget =
    scope === 'all' ? budgets.data?.categories.find((c) => c.category === category) : undefined;

  const { sections, listed } = useMemo(() => {
    const byDay = new Map<string, Transaction[]>();
    let listed = 0;
    for (const t of filterByScope(transactions.data ?? [], scope)) {
      if (t.kind !== 'expense' || (t.category || FALLBACK_CATEGORY) !== category) continue;
      listed += t.amount;
      byDay.set(t.occurred_on, [...(byDay.get(t.occurred_on) ?? []), t]);
    }
    const sections = [...byDay.entries()].map(([day, data]) => ({ title: formatDay(day), data }));
    return { sections, listed };
  }, [transactions.data, category, scope]);

  const monthName = formatMonth(month).toLowerCase();
  const vsAverage = average ? (amount - average) / average : null;

  return (
    <Screen className="pt-4">
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerClassName="pb-8"
        stickySectionHeadersEnabled={false}
        refreshing={transactions.isRefetching}
        onRefresh={() => {
          transactions.refetch();
          history.refetch();
          budgets.refetch();
        }}
        ListHeaderComponent={
          <View className="mb-2 gap-5">
            <View className="flex-row items-center gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver a análisis"
                hitSlop={4}
                onPress={() => router.back()}
                className="h-11 w-11 items-center justify-center rounded-full border border-line bg-card active:opacity-70"
                style={{ borderRadius: 22 }}
              >
                <Icon ios="chevron.left" android="chevron_left" color={colors.ink} />
              </Pressable>
              <View className="flex-1">
                <Text numberOfLines={1} className="text-base font-semibold text-ink">
                  {category}
                </Text>
                <Text className="text-xs text-ink-muted">
                  {formatMonth(month)}
                  {scope === 'all' ? '' : scope === 'shared' ? ' · Compartido' : ' · Personal'}
                </Text>
              </View>
            </View>

            <View className="gap-4 rounded-card border border-line bg-card p-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 gap-0.5">
                  <Text className="text-sm font-medium text-ink-muted">Gastado</Text>
                  <Text
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    className="font-display text-3xl font-bold tabular-nums text-ink"
                  >
                    {formatAmount(amount)}
                  </Text>
                  {monthTotal > 0 ? (
                    <Text className="text-xs text-ink-muted">
                      {Math.round((amount / monthTotal) * 100)}% de tus gastos del mes
                    </Text>
                  ) : null}
                </View>
                {vsAverage !== null && Math.round(vsAverage * 100) !== 0 ? (
                  <View
                    className={`rounded-full px-2.5 py-1 ${
                      vsAverage > 0 ? 'bg-expense-soft' : 'bg-income/15'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold tabular-nums ${
                        vsAverage > 0 ? 'text-expense' : 'text-income'
                      }`}
                    >
                      {`${vsAverage > 0 ? '↑' : '↓'} ${Math.round(Math.abs(vsAverage) * 100)}% vs promedio`}
                    </Text>
                  </View>
                ) : null}
              </View>

              {budget ? (
                <View className="gap-1.5">
                  <View className="h-2 overflow-hidden rounded-full bg-sunken">
                    <View
                      className={`h-full rounded-full ${BAR_CLASSES[budget.status]}`}
                      style={{ width: `${Math.min(100, budget.ratio * 100)}%` }}
                    />
                  </View>
                  <Text
                    className={`text-xs tabular-nums ${
                      budget.status === 'over' ? 'text-expense' : 'text-ink-muted'
                    }`}
                  >
                    {budget.remaining >= 0
                      ? `Quedan ${formatAmount(budget.remaining)} de ${formatAmount(budget.budget)}`
                      : `Te pasaste por ${formatAmount(-budget.remaining)} de ${formatAmount(budget.budget)}`}
                  </Text>
                </View>
              ) : null}

              <View className="gap-2 border-t border-line pt-4">
                <View className="flex-row justify-between">
                  <Text className="text-xs font-medium text-ink-muted">Últimos 6 meses</Text>
                  {average > 0 ? (
                    <Text className="text-xs tabular-nums text-ink-muted">
                      Promedio {formatAmount(average)}
                    </Text>
                  ) : null}
                </View>
                {history.isPending ? (
                  <ActivityIndicator />
                ) : (
                  <CategoryTrend months={trend} selected={month} average={average} />
                )}
              </View>
            </View>

            {sections.length ? (
              <Text className="-mb-3 mt-1 text-lg font-bold text-ink">Movimientos</Text>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text className="mb-2 mt-5 px-1 text-sm font-semibold text-ink-muted">
            {section.title}
          </Text>
        )}
        renderItem={({ item, index, section }) => (
          <TransactionRow
            transaction={item}
            group={{ index, count: section.data.length }}
            onPress={() => router.push({ pathname: '/transactions/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          transactions.isPending ? (
            <ActivityIndicator className="mt-8" />
          ) : transactions.isError ? (
            <Text className="mt-8 text-center text-expense">{transactions.error.message}</Text>
          ) : (
            <Text className="mt-8 text-center text-ink-muted">
              Sin movimientos de {category} registrados en {monthName}.
            </Text>
          )
        }
        ListFooterComponent={
          !transactions.isPending && Math.abs(listed - amount) > 0.01 ? (
            <Text className="mt-4 text-center text-xs text-ink-muted">
              Las compras a meses cuentan solo la mensualidad del mes, por eso el total no coincide
              con la suma de la lista.
            </Text>
          ) : undefined
        }
      />
    </Screen>
  );
}
