import { router } from 'expo-router';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
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
  ok: 'bg-accent',
  warning: 'bg-warning',
  over: 'bg-expense',
};

function Bar({ ratio, className }: { ratio: number; className: string }) {
  return (
    <View className="h-2 overflow-hidden rounded-full bg-sunken">
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
            <Text className="text-xs text-ink-muted">Gastado</Text>
            <Text className="font-display text-2xl font-bold text-ink">
              {formatAmount(spending.total)}
            </Text>
            {previousTotal !== undefined ? (
              <Text className="text-xs text-ink-muted">
                Mes anterior: {formatAmount(previousTotal)}
              </Text>
            ) : null}
          </View>
          <View className="items-end gap-0.5">
            <Text className="text-xs text-ink-muted">Ingresos</Text>
            <Text className="text-base font-semibold text-income">{formatAmount(income)}</Text>
          </View>
        </View>

        {spending.installments > 0 ? (
          <Text className="text-xs text-ink-muted">
            Incluye {formatAmount(spending.installments)} de mensualidades a meses
          </Text>
        ) : null}

        {budget && budget.budget > 0 ? (
          <View className="gap-1.5">
            <View className="flex-row justify-between">
              <Text className="text-xs font-medium text-ink-muted">Presupuesto</Text>
              <Text className="text-xs text-ink-muted">
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
                  <Text className="text-sm text-ink">{c.category}</Text>
                  <Text className="text-sm font-semibold text-ink">{formatAmount(c.amount)}</Text>
                </View>
                <Bar ratio={maxCategory ? c.amount / maxCategory : 0} className="bg-accent/70" />
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-sm text-ink-muted">Aún no hay gastos este mes.</Text>
        )}
      </HomeCard>
    </HomeSection>
  );
}
