import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { useBudgetProgress, useDeleteBudget } from '@/features/budgets/api';
import type { BudgetStatus, CategoryProgress } from '@/features/budgets/progress';
import { addMonths, formatMonth, monthRange, today } from '@/lib/date';
import { formatMoney } from '@/lib/format';

const BAR_CLASSES: Record<BudgetStatus, string> = {
  ok: 'bg-green-500',
  warning: 'bg-amber-500',
  over: 'bg-red-500',
};

export default function BudgetsScreen() {
  const [month, setMonth] = useState(() => monthRange(today()).start);
  const isCurrentMonth = month === monthRange(today()).start;

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
              <Text className="text-3xl font-bold text-neutral-900 dark:text-white">
                Presupuestos
              </Text>
              <Text
                className="text-base font-semibold text-brand-500"
                onPress={() => router.back()}
              >
                Listo
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <MonthButton label="‹" onPress={() => setMonth(addMonths(month, -1))} />
              <Text className="text-lg font-semibold text-neutral-900 dark:text-white">
                {formatMonth(month)}
              </Text>
              <MonthButton
                label="›"
                disabled={isCurrentMonth}
                onPress={() => setMonth(addMonths(month, 1))}
              />
            </View>

            {totals && totals.budget > 0 ? (
              <View className="gap-3 rounded-2xl bg-brand-500 p-5">
                <View className="gap-1">
                  <Text className="text-sm text-brand-50">Gastado / Presupuesto</Text>
                  <Text className="text-2xl font-bold text-white">
                    {formatMoney(totals.spent)}{' '}
                    <Text className="text-base font-medium text-brand-100">
                      de {formatMoney(totals.budget)}
                    </Text>
                  </Text>
                </View>
                <ProgressBar
                  ratio={totals.ratio}
                  status={totals.status}
                  trackClassName="bg-white/25"
                />
                <Text className="text-xs text-brand-100">
                  {totals.remaining >= 0
                    ? `Te quedan ${formatMoney(totals.remaining)} este mes`
                    : `Te pasaste por ${formatMoney(-totals.remaining)}`}
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
            <Text className="mt-8 text-center text-red-500">{progress.error.message}</Text>
          ) : (
            <Text className="mt-8 text-center text-neutral-500">
              Ponle un límite mensual a tus categorías de gasto (Comida, Súper, Transporte…) y ve
              cuánto llevas cada mes.
            </Text>
          )
        }
        ListFooterComponent={
          data ? (
            <View className="mt-3 gap-3">
              {data.unbudgetedSpent > 0 ? (
                <Text className="text-center text-sm text-neutral-500">
                  Sin presupuesto: {formatMoney(data.unbudgetedSpent)}
                </Text>
              ) : null}
              {data.categories.length ? (
                <Text className="text-center text-xs text-neutral-500">
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
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={onLongPress}
      className="gap-3 rounded-2xl border border-neutral-200 bg-white p-4 active:opacity-80 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-base font-semibold text-neutral-900 dark:text-white">
          {p.category}
        </Text>
        <Text className="text-sm text-neutral-500">
          <Text className="font-semibold text-neutral-900 dark:text-white">
            {formatMoney(p.spent)}
          </Text>{' '}
          de {formatMoney(p.budget)}
        </Text>
      </View>
      <ProgressBar ratio={p.ratio} status={p.status} />
      <View className="flex-row items-center justify-between gap-3">
        <Text className={`text-xs ${p.status === 'over' ? 'text-red-500' : 'text-neutral-500'}`}>
          {p.remaining >= 0
            ? `Te quedan ${formatMoney(p.remaining)}`
            : `Te pasaste por ${formatMoney(-p.remaining)}`}
        </Text>
        {p.installmentsSpent > 0 ? (
          <Text className="text-xs text-neutral-500">
            {formatMoney(p.installmentsSpent)} en MSI
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function ProgressBar({
  ratio,
  status,
  trackClassName = 'bg-neutral-200 dark:bg-neutral-800',
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
      className="h-10 w-10 items-center justify-center rounded-full bg-neutral-200 active:opacity-70 disabled:opacity-30 dark:bg-neutral-800"
    >
      <Text className="text-xl text-neutral-900 dark:text-white">{label}</Text>
    </Pressable>
  );
}
