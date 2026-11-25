import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Screen } from '@/components/screen';
import { MonthSwitcher } from '@/components/ui/month-switcher';
import { SpendingChart } from '@/features/analysis/components/spending-chart';
import { useSpendingHistory } from '@/features/analysis/use-spending-history';
import { useFormatMoney } from '@/hooks/use-format-money';
import { formatMonth, monthRange, today } from '@/lib/date';

/** Categories below this share of the month get a muted bar. */
const SMALL_SHARE = 0.1;

export default function AnalysisScreen() {
  const formatAmount = useFormatMoney();
  const [month, setMonth] = useState(() => monthRange(today()).start);
  const history = useSpendingHistory(month);

  const current = history.months[history.months.length - 1].spending;
  const previous = history.months[history.months.length - 2];
  const previousName = formatMonth(previous.month).split(' ')[0].toLowerCase();
  const monthName = formatMonth(month).toLowerCase();

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

  return (
    <Screen className="pt-6">
      <ScrollView
        contentContainerClassName="gap-6 pb-10"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={history.isRefetching} onRefresh={history.refetch} />
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
            <View className="gap-5 rounded-card border border-line bg-card p-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 gap-0.5">
                  <Text className="text-sm font-medium text-ink-muted">Gastos del mes</Text>
                  <Text
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    className="font-display text-3xl font-bold tabular-nums text-ink"
                  >
                    {formatAmount(current?.total ?? 0)}
                  </Text>
                </View>
                {comparison && comparison.delta !== 0 ? (
                  <View
                    className={`rounded-full px-2.5 py-1 ${
                      comparison.delta > 0 ? 'bg-expense-soft' : 'bg-income/15'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold tabular-nums ${
                        comparison.delta > 0 ? 'text-expense' : 'text-income'
                      }`}
                    >
                      {`${comparison.delta > 0 ? '↑' : '↓'} ${Math.round(
                        Math.abs(comparison.ratio) * 100,
                      )}% vs ${previousName.slice(0, 3)}`}
                    </Text>
                  </View>
                ) : null}
              </View>

              <SpendingChart
                months={history.months.map((m) => ({ month: m.month, total: m.spending?.total }))}
                selected={month}
                onSelect={setMonth}
              />
            </View>

            <View className="gap-3">
              <Text className="text-lg font-bold text-ink">Por categoría</Text>
              {current && current.byCategory.length ? (
                <View className="gap-4">
                  {current.byCategory.map((c, i) => {
                    const share = current.total ? c.amount / current.total : 0;
                    const max = current.byCategory[0].amount;
                    const barColor =
                      i === 0 ? 'bg-accent' : share < SMALL_SHARE ? 'bg-ink-muted' : 'bg-ink';
                    return (
                      <View key={c.category} className="gap-1.5">
                        <View className="flex-row items-baseline justify-between gap-3">
                          <Text numberOfLines={1} className="flex-1 text-base text-ink">
                            {c.category}
                            <Text className="text-sm text-ink-muted">
                              {'  '}
                              {Math.round(share * 100)}%
                            </Text>
                          </Text>
                          <Text className="text-base font-semibold tabular-nums text-ink">
                            {formatAmount(c.amount)}
                          </Text>
                        </View>
                        <View className="h-2 overflow-hidden rounded-full bg-sunken">
                          <View
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${max ? (c.amount / max) * 100 : 0}%` }}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
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
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
