import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { MonthSwitcher } from '@/components/ui/month-switcher';
import { useBudgetProgress, useDeleteBudget } from '@/features/budgets/api';
import type { BudgetStatus, CategoryProgress } from '@/features/budgets/progress';
import { useFormatMoney } from '@/hooks/use-format-money';
import { monthRange, today } from '@/lib/date';

const BAR_CLASSES: Record<BudgetStatus, string> = {
  ok: 'bg-income',
  warning: 'bg-warning',
  over: 'bg-expense',
};

export default function BudgetsScreen() {
  const formatAmount = useFormatMoney();
  const [month, setMonth] = useState(() => monthRange(today()).start);

  const progress = useBudgetProgress(month);
  const remove = useDeleteBudget();

  const confirmDelete = (c: CategoryProgress) => {
    Alert.alert('Eliminar presupuesto', `Dejarás de ver el límite de ${c.category}.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(c.id) },
    ]);
  };

  const data = progress.data;
  const totals = data?.totals;

  return (
    <Screen className="pt-6">
      <FlatList
        data={data?.categories ?? []}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-2 pb-8"
        refreshing={progress.isRefetching}
        onRefresh={progress.refetch}
        ListHeaderComponent={
          <View className="mb-3 gap-5">
            <View className="flex-row items-center justify-between">
              <Text className="font-display text-3xl font-bold text-ink">Presupuestos</Text>
              <Text
                className="text-base font-semibold text-accent-ink"
                onPress={() => router.back()}
              >
                Listo
              </Text>
            </View>

            <MonthSwitcher month={month} onChange={setMonth} />

            {totals && totals.budget > 0 ? (
              <View className="gap-3 rounded-card bg-accent p-5">
                <View className="gap-1">
                  <Text className="text-sm text-on-accent-muted">Gastado / Presupuesto</Text>
                  <Text className="font-display text-2xl font-bold text-on-accent">
                    {formatAmount(totals.spent)}{' '}
                    <Text className="text-base font-medium text-on-accent-muted">
                      de {formatAmount(totals.budget)}
                    </Text>
                  </Text>
                </View>
                <ProgressBar
                  ratio={totals.ratio}
                  status={totals.status}
                  trackClassName="bg-on-accent/15"
                />
                <Text className="text-xs text-on-accent-muted">
                  {totals.remaining >= 0
                    ? `Te quedan ${formatAmount(totals.remaining)} este mes`
                    : `Te pasaste por ${formatAmount(-totals.remaining)}`}
                </Text>
              </View>
            ) : null}

            <Button
              title="Agregar presupuesto"
              onPress={() => router.push('/transactions/new-budget')}
            />
          </View>
        }
        renderItem={({ item }) => (
          <BudgetCard
            progress={item}
            onPress={() =>
              router.push({ pathname: '/transactions/budget/[id]', params: { id: item.id } })
            }
            onLongPress={() => confirmDelete(item)}
          />
        )}
        ListEmptyComponent={
          progress.isPending ? (
            <ActivityIndicator className="mt-8" />
          ) : progress.error ? (
            <Text className="mt-8 text-center text-expense">{progress.error.message}</Text>
          ) : (
            <Text className="mt-8 text-center text-ink-muted">
              Ponle un límite mensual a tus categorías de gasto (Comida, Súper, Transporte…) y ve
              cuánto llevas cada mes.
            </Text>
          )
        }
        ListFooterComponent={
          data ? (
            <View className="mt-3 gap-3">
              {data.unbudgetedSpent > 0 ? (
                <Text className="text-center text-sm text-ink-muted">
                  Sin presupuesto: {formatAmount(data.unbudgetedSpent)}
                </Text>
              ) : null}
              {data.categories.length ? (
                <Text className="text-center text-xs text-ink-muted">
                  Toca para editar · mantén presionado para eliminar
                </Text>
              ) : null}
            </View>
          ) : undefined
        }
      />
    </Screen>
  );
}

function BudgetCard({
  progress: p,
  onPress,
  onLongPress,
}: {
  progress: CategoryProgress;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const formatAmount = useFormatMoney();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={onLongPress}
      className="gap-3 rounded-card border border-line bg-card p-4 active:opacity-80"
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-base font-semibold text-ink">{p.category}</Text>
        <Text className="text-sm text-ink-muted">
          <Text className="font-semibold text-ink">{formatAmount(p.spent)}</Text> de{' '}
          {formatAmount(p.budget)}
        </Text>
      </View>
      <ProgressBar ratio={p.ratio} status={p.status} />
      <View className="flex-row items-center justify-between gap-3">
        <Text className={`text-xs ${p.status === 'over' ? 'text-expense' : 'text-ink-muted'}`}>
          {p.remaining >= 0
            ? `Te quedan ${formatAmount(p.remaining)}`
            : `Te pasaste por ${formatAmount(-p.remaining)}`}
        </Text>
        {p.installmentsSpent > 0 ? (
          <Text className="text-xs text-ink-muted">{formatAmount(p.installmentsSpent)} en MSI</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function ProgressBar({
  ratio,
  status,
  trackClassName = 'bg-sunken',
}: {
  ratio: number;
  status: BudgetStatus;
  trackClassName?: string;
}) {
  const percent = Math.min(100, Math.round(ratio * 100));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
      className={`h-2 overflow-hidden rounded-full ${trackClassName}`}
    >
      <View
        className={`h-full rounded-full ${BAR_CLASSES[status]}`}
        style={{ width: `${percent}%` }}
      />
    </View>
  );
}
