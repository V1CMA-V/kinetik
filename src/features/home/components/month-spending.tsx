import { router } from 'expo-router';
import { Text, View } from 'react-native';

import type { BudgetProgress, BudgetStatus, MonthSpending } from '@/features/budgets/progress';
import { useFormatMoney } from '@/hooks/use-format-money';

import { HomeCard, HomeSection } from './home-section';

type Props = {
  monthLabel: string;
  spending: MonthSpending;
  /** Spending of the previous month, for the comparison. */
  previousTotal: number | undefined;
  income: number;
  /** Only when the user has budgets. */
  budget: BudgetProgress['totals'] | undefined;
};

const TOP_CATEGORIES = 4;

const BAR_COLORS: Record<BudgetStatus, string> = {
  ok: 'bg-brand-500',
  warning: 'bg-amber-500',
  over: 'bg-red-500',
};

function Bar({ ratio, className }: { ratio: number; className: string }) {
  return (
    <View className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
      <View
        className={`h-full rounded-full ${className}`}
        style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }}
      />
    </View>
  );
}

export function MonthSpendingSection({
  monthLabel,
  spending,
  previousTotal,
  income,
  budget,
}: Props) {
  const formatAmount = useFormatMoney();
  const top = spending.byCategory.slice(0, TOP_CATEGORIES);
  const maxCategory = top[0]?.amount ?? 0;


  return (
    <HomeSection
      title={`Gastos de ${monthLabel.toLowerCase()}`}
      action={{ label: 'Presupuestos', onPress: () => router.push('/transactions/budgets') }}
    >
      <HomeCard className="gap-4">
        <View className="flex-row justify-between gap-3">
          <View className="flex-1 gap-0.5">
            <Text className="text-xs text-neutral-500">Gastado</Text>
            <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
              {formatAmount(spending.total)}
            </Text>
            {previousTotal !== undefined ? (
              <Text className="text-xs text-neutral-500">
                Mes anterior: {formatAmount(previousTotal)}
              </Text>
            ) : null}
          </View>
          <View className="items-end gap-0.5">
            <Text className="text-xs text-neutral-500">Ingresos</Text>
            <Text className="text-base font-semibold text-green-600 dark:text-green-500">
              {formatAmount(income)}
            </Text>
          </View>
        </View>

        {spending.installments > 0 ? (
          <Text className="text-xs text-neutral-500">
            Incluye {formatAmount(spending.installments)} de mensualidades a meses
          </Text>
        ) : null}

        {budget && budget.budget > 0 ? (
          <View className="gap-1.5">
            <View className="flex-row justify-between">
              <Text className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Presupuesto
              </Text>
              <Text className="text-xs text-neutral-500">
                {formatAmount(budget.spent)} de {formatAmount(budget.budget)}
              </Text>
            </View>
            <Bar ratio={budget.ratio} className={BAR_COLORS[budget.status]} />
          </View>
        ) : null}

        {top.length ? (
          <View className="gap-3">
            {top.map((c) => (
              <View key={c.category} className="gap-1">
                <View className="flex-row justify-between">
                  <Text className="text-sm text-neutral-900 dark:text-white">{c.category}</Text>
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {formatAmount(c.amount)}
                  </Text>
                </View>
                <Bar
                  ratio={maxCategory ? c.amount / maxCategory : 0}
                  className="bg-brand-500/70"
                />
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-sm text-neutral-500">Aún no hay gastos este mes.</Text>
        )}
      </HomeCard>
    </HomeSection>
  );
}
