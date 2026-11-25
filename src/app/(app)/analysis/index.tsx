import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Screen } from '@/components/screen';
import { MonthSwitcher } from '@/components/ui/month-switcher';
import { CashflowCard } from '@/features/analysis/components/cashflow-card';
import { CategoryBreakdown } from '@/features/analysis/components/category-breakdown';
import { MonthProjectionCard } from '@/features/analysis/components/month-projection';
import { computeProjection } from '@/features/analysis/projection';
import { useSpendingHistory } from '@/features/analysis/use-spending-history';
import { useBudgetProgress } from '@/features/budgets/api';
import { useFormatMoney } from '@/hooks/use-format-money';
import { formatMonth, monthRange, today } from '@/lib/date';

export default function AnalysisScreen() {
  const formatAmount = useFormatMoney();
  const [month, setMonth] = useState(() => monthRange(today()).start);
  const history = useSpendingHistory(month);
  const budgets = useBudgetProgress(month);

  const selected = history.months[history.months.length - 1];
  const previous = history.months[history.months.length - 2];
  const current = selected.spending;
  const previousName = formatMonth(previous.month).split(' ')[0].toLowerCase();
  const monthName = formatMonth(month).split(' ')[0].toLowerCase();
  const isCurrentMonth = month === monthRange(today()).start;

  const comparison = useMemo(() => {
    const prev = previous.spending;
    if (!current || !prev || prev.total === 0) return null;
    const delta = current.total - prev.total;
    const ratio = delta / prev.total;

    // Category with the biggest increase vs. the previous month.
    const prevByCategory = new Map(prev.byCategory.map((c) => [c.category, c.amount]));
    let topRise: { category: string; amount: number } | null = null;
    for (const c of current.byCategory) {
      const rise = c.amount - (prevByCategory.get(c.category) ?? 0);
      if (rise > 0 && (!topRise || rise > topRise.amount)) {
        topRise = { category: c.category, amount: rise };
      }
    }
    return { delta, ratio, topRise };
  }, [current, previous.spending]);

  const projection = useMemo(
    () =>
      isCurrentMonth && current
        ? computeProjection(
            current.byDay,
            Number(today().slice(8, 10)),
            previous.spending?.byDay ?? null,
          )
        : null,
    [isCurrentMonth, current, previous.spending],
  );

  const budgetsByCategory = useMemo(
    () => new Map((budgets.data?.categories ?? []).map((c) => [c.category, c])),
    [budgets.data],
  );

  return (
    <Screen className="pt-6">
      <ScrollView
        contentContainerClassName="gap-6 pb-10"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={history.isRefetching}
            onRefresh={() => {
              history.refetch();
              budgets.refetch();
            }}
          />
        }
      >
        <View className="gap-4">
          <Text className="font-display text-3xl font-bold text-ink">Análisis</Text>
          <MonthSwitcher month={month} onChange={setMonth} />
        </View>

        {history.isPending ? (
          <ActivityIndicator className="mt-8" />
        ) : history.error ? (
          <Text className="mt-8 text-center text-expense">{history.error.message}</Text>
        ) : (
          <>
            <CashflowCard
              monthName={monthName}
              income={selected.income ?? 0}
              expense={current?.total ?? 0}
              comparison={comparison ? { ...comparison, previousName } : null}
              history={history.months.map((m) => ({
                month: m.month,
                income: m.income,
                expense: m.spending?.total,
              }))}
              selected={month}
              onSelect={setMonth}
            />

            {projection && projection.spentToDate + projection.scheduled > 0 ? (
              <View className="gap-3">
                <Text className="text-lg font-bold text-ink">Proyección del mes</Text>
                <MonthProjectionCard projection={projection} previousName={previousName} />
              </View>
            ) : null}

            <View className="gap-3">
              <Text className="text-lg font-bold text-ink">Por categoría</Text>
              {current && current.byCategory.length ? (
                <CategoryBreakdown
                  total={current.total}
                  categories={current.byCategory}
                  budgets={budgetsByCategory}
                  onPressCategory={(category) =>
                    router.push({ pathname: '/analysis/category', params: { category, month } })
                  }
                />
              ) : (
                <Text className="text-sm text-ink-muted">Aún no hay gastos en {monthName}.</Text>
              )}
            </View>

            {comparison && comparison.delta !== 0 ? (
              <View className="rounded-card bg-ink p-4">
                <Text className="text-sm leading-5 text-surface">
                  Gastaste {formatAmount(Math.abs(comparison.delta))}{' '}
                  {comparison.delta > 0 ? 'más' : 'menos'} que en {previousName}.
                  {comparison.delta > 0 && comparison.topRise
                    ? ` Lo que más subió: ${comparison.topRise.category} (+${formatAmount(
                        comparison.topRise.amount,
                      )}).`
                    : ''}
                </Text>
              </View>
            ) : null}

            {current && current.installments > 0 ? (
              <Text className="text-center text-xs text-ink-muted">
                Las compras a meses cuentan solo la mensualidad de cada mes.
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
