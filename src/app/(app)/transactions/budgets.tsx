import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';

import { alert } from '@/components/ui/dialog';
import { groupedRowClass } from '@/components/ui/grouped';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/screen';
import { MonthSwitcher } from '@/components/ui/month-switcher';
import { useBudgetProgress, useDeleteBudget } from '@/features/budgets/api';
import type { BudgetStatus, CategoryProgress } from '@/features/budgets/progress';
import {
  BUDGET_GROUPS,
  GROUP_SHARE,
  SAVINGS_SHARE,
  budgetTotals,
} from '@/features/budgets/suggestions';
import { useIncomeProfile } from '@/features/income/api';
import { monthlyIncome } from '@/features/income/schedule';
import { useFormatMoney } from '@/hooks/use-format-money';
import { monthRange, parseISODate, today } from '@/lib/date';
import { useThemeColors } from '@/theme/colors';

const BAR_CLASSES: Record<BudgetStatus, string> = {
  ok: 'bg-income',
  warning: 'bg-warning',
  over: 'bg-expense',
};

const STATUS_PILL: Record<BudgetStatus, { label: string; className: string; text: string }> = {
  ok: { label: 'Vas bien', className: 'bg-income/15', text: 'text-income' },
  warning: { label: 'Cerca del límite', className: 'bg-warning/15', text: 'text-warning' },
  over: { label: 'Te pasaste', className: 'bg-expense-soft', text: 'text-expense' },
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days left in `month` counting today; `null` if it isn't the current month. */
function daysLeftInMonth(month: string) {
  const now = today();
  const { start, end } = monthRange(now);
  if (month !== start) return null;
  return Math.round((parseISODate(end).getTime() - parseISODate(now).getTime()) / DAY_MS) + 1;
}

export default function BudgetsScreen() {
  const formatAmount = useFormatMoney();
  const colors = useThemeColors();
  const [month, setMonth] = useState(() => monthRange(today()).start);

  const progress = useBudgetProgress(month);
  const remove = useDeleteBudget();

  const confirmDelete = (c: CategoryProgress) => {
    alert('Eliminar presupuesto', `Dejarás de ver el límite de ${c.category}.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(c.id) },
    ]);
  };

  const data = progress.data;
  const totals = data?.totals;
  const categories = data?.categories ?? [];
  const overCount = categories.filter((c) => c.status === 'over').length;
  const daysLeft = daysLeftInMonth(month);
  const perDay = totals && daysLeft && totals.remaining > 0 ? totals.remaining / daysLeft : null;

  return (
    <Screen className="pt-4">
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerClassName="pb-8"
        refreshing={progress.isRefetching}
        onRefresh={progress.refetch}
        ListHeaderComponent={
          <View className="mb-2 gap-5">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-3">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Volver a movimientos"
                  hitSlop={4}
                  onPress={() => router.back()}
                  className="h-11 w-11 items-center justify-center rounded-full border border-line bg-card active:opacity-70"
                  style={{ borderRadius: 22 }}
                >
                  <Icon ios="chevron.left" android="chevron_left" color={colors.ink} />
                </Pressable>
                <Text className="font-display text-3xl font-bold text-ink">Presupuestos</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Agregar presupuesto"
                hitSlop={4}
                onPress={() => router.push('/transactions/new-budget')}
                className="h-11 w-11 items-center justify-center rounded-full bg-accent active:opacity-80"
                style={{ borderRadius: 22 }}
              >
                <Icon ios="plus" android="add" color={colors['on-accent']} size={24} />
              </Pressable>
            </View>

            <MonthSwitcher month={month} onChange={setMonth} />

            {totals && totals.budget > 0 ? (
              <View className="gap-4 rounded-card border border-line bg-card p-5">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1 gap-1">
                    <Text className="text-sm font-medium text-ink-muted">Gastado</Text>
                    <Text
                      adjustsFontSizeToFit
                      numberOfLines={1}
                      className={`font-display text-3xl font-bold tabular-nums ${
                        totals.status === 'over' ? 'text-expense' : 'text-ink'
                      }`}
                    >
                      {formatAmount(totals.spent)}
                    </Text>
                    <Text className="text-xs text-ink-muted">
                      de{' '}
                      <Text className="text-xs font-semibold tabular-nums text-ink">
                        {formatAmount(totals.budget)}
                      </Text>{' '}
                      presupuestados
                    </Text>
                  </View>
                  <View
                    className={`rounded-full px-2.5 py-1 ${STATUS_PILL[totals.status].className}`}
                  >
                    <Text className={`text-xs font-semibold ${STATUS_PILL[totals.status].text}`}>
                      {STATUS_PILL[totals.status].label}
                    </Text>
                  </View>
                </View>

                <View className="gap-1.5">
                  <ProgressBar ratio={totals.ratio} status={totals.status} />
                  <View className="flex-row justify-between gap-3">
                    <Text
                      className={`text-xs tabular-nums ${
                        totals.remaining < 0 ? 'font-semibold text-expense' : 'text-ink-muted'
                      }`}
                    >
                      {totals.remaining >= 0
                        ? `Te quedan ${formatAmount(totals.remaining)}`
                        : `Te pasaste por ${formatAmount(-totals.remaining)}`}
                    </Text>
                    <Text className="text-xs tabular-nums text-ink-muted">
                      {Math.round(totals.ratio * 100)}%
                    </Text>
                  </View>
                </View>

                {perDay !== null || overCount > 0 || data.unbudgetedSpent > 0 ? (
                  <View className="gap-2 border-t border-line pt-4">
                    {perDay !== null ? (
                      <SummaryLine
                        label={`Puedes gastar al día (${daysLeft} ${daysLeft === 1 ? 'día' : 'días'})`}
                        value={formatAmount(perDay)}
                      />
                    ) : null}
                    {overCount > 0 ? (
                      <SummaryLine
                        label="Categorías excedidas"
                        value={`${overCount} de ${categories.length}`}
                        danger
                      />
                    ) : null}
                    {data.unbudgetedSpent > 0 ? (
                      <SummaryLine
                        label="Sin presupuesto"
                        value={formatAmount(data.unbudgetedSpent)}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}

            {progress.data ? <IncomeSummary budgets={categories} /> : null}

            {categories.length ? (
              <View className="-mb-3 flex-row items-baseline justify-between px-1">
                <Text className="text-lg font-bold text-ink">Categorías</Text>
                <Text className="text-sm font-semibold text-ink-muted">{categories.length}</Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => (
          <BudgetRow
            progress={item}
            index={index}
            count={categories.length}
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
            <View className="mt-6 items-center gap-3 rounded-card border border-line bg-card p-6">
              <View
                className="h-12 w-12 items-center justify-center rounded-full bg-accent-soft"
                style={{ borderRadius: 24 }}
              >
                <Icon ios="chart.pie" android="pie_chart" color={colors['accent-ink']} />
              </View>
              <Text className="text-center text-base font-semibold text-ink">Sin presupuestos</Text>
              <Text className="text-center text-sm text-ink-muted">
                Ponle un límite mensual a tus categorías de gasto (Comida, Súper, Transporte…) y ve
                cuánto llevas cada mes.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          categories.length ? (
            <Text className="mt-5 text-center text-xs text-ink-muted">
              Toca para editar · mantén presionado para eliminar
            </Text>
          ) : undefined
        }
      />
    </Screen>
  );
}

/** Budgets vs. the 50/30/20 rule, or a prompt to add the income profile. */
function IncomeSummary({ budgets }: { budgets: CategoryProgress[] }) {
  const formatAmount = useFormatMoney();
  const colors = useThemeColors();
  const { data: profile } = useIncomeProfile();

  // `undefined` while loading or on error: show nothing.
  if (profile === null) {
    return (
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push('/profile/income')}
        className="flex-row items-center gap-2 px-1 active:opacity-70"
      >
        <Text className="flex-1 text-sm text-ink-muted">
          Agrega tu ingreso para ver sugerencias con la regla 50/30/20.
        </Text>
        <Icon ios="chevron.right" android="chevron_right" color={colors['ink-muted']} size={16} />
      </Pressable>
    );
  }

  const income = profile ? monthlyIncome(profile) : 0;
  if (!(income > 0) || !budgets.length) return null;

  const totals = budgetTotals(
    budgets.map((b) => ({ category: b.category, amount: b.budget })),
    income,
  );

  return (
    <View className="gap-2 rounded-card border border-line bg-card p-4">
      <Text className="text-sm text-ink">
        Tus presupuestos suman{' '}
        <Text className="text-sm font-semibold tabular-nums text-ink">
          {formatAmount(totals.total)}
        </Text>
        , el{' '}
        <Text
          className={`text-sm font-semibold tabular-nums ${totals.ratio > 0.8 ? 'text-warning' : 'text-ink'}`}
        >
          {Math.round(totals.ratio * 100)}%
        </Text>{' '}
        de tu ingreso.
      </Text>
      {(['needs', 'wants'] as const).map((g) => {
        const group = totals.groups[g];
        return (
          <SummaryLine
            key={g}
            label={`${BUDGET_GROUPS[g].label} (meta ${Math.round(GROUP_SHARE[g] * 100)}%)`}
            value={`${formatAmount(group.total)} de ${formatAmount(group.target)}`}
            danger={group.ratio > 1}
          />
        );
      })}
      <Text className="text-xs text-ink-muted">
        El {Math.round(SAVINGS_SHARE * 100)}% restante es para ahorro.
      </Text>
    </View>
  );
}

function SummaryLine({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="flex-1 text-sm text-ink-muted">{label}</Text>
      <Text
        className={`text-sm font-semibold tabular-nums ${danger ? 'text-expense' : 'text-ink'}`}
      >
        {value}
      </Text>
    </View>
  );
}

function BudgetRow({
  progress: p,
  index,
  count,
  onPress,
  onLongPress,
}: {
  progress: CategoryProgress;
  index: number;
  count: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const formatAmount = useFormatMoney();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Mantén presionado para eliminar"
      onPress={onPress}
      onLongPress={onLongPress}
      className={`gap-2.5 px-4 py-3.5 active:opacity-80 ${groupedRowClass(index, count)}`}
    >
      <View className="flex-row items-baseline justify-between gap-3">
        <Text numberOfLines={1} className="flex-1 text-base font-semibold text-ink">
          {p.category}
        </Text>
        <Text className="text-sm tabular-nums text-ink-muted">
          <Text
            className={`text-sm font-bold ${p.status === 'over' ? 'text-expense' : 'text-ink'}`}
          >
            {formatAmount(p.spent)}
          </Text>{' '}
          / {formatAmount(p.budget)}
        </Text>
      </View>
      <ProgressBar ratio={p.ratio} status={p.status} />
      <View className="flex-row items-center justify-between gap-3">
        <Text
          className={`text-xs tabular-nums ${
            p.status === 'over' ? 'font-semibold text-expense' : 'text-ink-muted'
          }`}
        >
          {p.remaining >= 0
            ? `Te quedan ${formatAmount(p.remaining)}`
            : `Te pasaste por ${formatAmount(-p.remaining)}`}
        </Text>
        <Text className="text-xs tabular-nums text-ink-muted">
          {p.installmentsSpent > 0 ? `${formatAmount(p.installmentsSpent)} en MSI · ` : ''}
          {Math.round(p.ratio * 100)}%
        </Text>
      </View>
    </Pressable>
  );
}

function ProgressBar({ ratio, status }: { ratio: number; status: BudgetStatus }) {
  const percent = Math.min(100, Math.round(ratio * 100));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
      className="h-2 overflow-hidden rounded-full bg-sunken"
    >
      <View
        className={`h-full rounded-full ${BAR_CLASSES[status]}`}
        style={{ width: `${percent}%` }}
      />
    </View>
  );
}
