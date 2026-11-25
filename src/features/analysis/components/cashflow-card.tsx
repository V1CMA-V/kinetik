import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useFormatMoney } from '@/hooks/use-format-money';

import { CashflowChart } from './cashflow-chart';

type Props = {
  monthName: string;
  income: number;
  expense: number;
  /** Spending change vs. the previous month; `null` when there's nothing to compare. */
  comparison: { ratio: number; delta: number; previousName: string } | null;
  history: { month: string; income: number | undefined; expense: number | undefined }[];
  selected: string;
  onSelect: (month: string) => void;
};

/** Income vs. spending of the month: net, savings rate, split bar and 6-month columns. */
export function CashflowCard({
  monthName,
  income,
  expense,
  comparison,
  history,
  selected,
  onSelect,
}: Props) {
  const formatAmount = useFormatMoney();
  const net = income - expense;
  const savingsRate = income > 0 ? net / income : null;

  // Split bar on the larger of both: spending + savings, or income + overspending.
  const scale = Math.max(income, expense);
  const spentShare = scale ? Math.min(income, expense) / scale : 0;
  const restShare = scale ? Math.abs(net) / scale : 0;

  return (
    <View className="gap-5 rounded-card border border-line bg-card p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-sm font-medium text-ink-muted">Balance de {monthName}</Text>
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            className={`font-display text-3xl font-bold tabular-nums ${
              net < 0 ? 'text-expense' : 'text-ink'
            }`}
          >
            {net > 0 ? '+' : ''}
            {formatAmount(net)}
          </Text>
        </View>
        {savingsRate !== null ? (
          <View
            className={`items-end rounded-2xl px-3 py-1.5 ${
              savingsRate >= 0 ? 'bg-income/15' : 'bg-expense-soft'
            }`}
          >
            <Text
              className={`font-display text-lg font-bold tabular-nums ${
                savingsRate >= 0 ? 'text-income' : 'text-expense'
              }`}
            >
              {Math.round(savingsRate * 100)}%
            </Text>
            <Text className="text-xs text-ink-muted">
              {savingsRate >= 0 ? 'ahorrado' : 'de más'}
            </Text>
          </View>
        ) : null}
      </View>

      {scale > 0 ? (
        <View className="gap-3">
          <View className="h-3 flex-row gap-0.5 overflow-hidden rounded-full bg-sunken">
            {spentShare > 0 ? (
              <View className="h-full rounded-full bg-ink" style={{ flex: spentShare }} />
            ) : null}
            {restShare > 0 ? (
              <View
                className={`h-full rounded-full ${net >= 0 ? 'bg-income' : 'bg-expense'}`}
                style={{ flex: restShare }}
              />
            ) : null}
          </View>
          <View className="flex-row">
            <Stat label="Ingresos" value={formatAmount(income)} className="text-income" />
            <View className="w-px bg-line" />
            <Stat label="Gastos" value={formatAmount(expense)} className="text-ink" align="end">
              {comparison && comparison.delta !== 0 ? (
                <Text
                  className={`text-xs font-semibold tabular-nums ${
                    comparison.delta > 0 ? 'text-expense' : 'text-income'
                  }`}
                >
                  {`${comparison.delta > 0 ? '↑' : '↓'} ${Math.round(
                    Math.abs(comparison.ratio) * 100,
                  )}% vs ${comparison.previousName.slice(0, 3)}`}
                </Text>
              ) : null}
            </Stat>
          </View>
        </View>
      ) : (
        <Text className="text-sm text-ink-muted">Sin ingresos ni gastos en {monthName}.</Text>
      )}

      <CashflowChart months={history} selected={selected} onSelect={onSelect} />
    </View>
  );
}

function Stat({
  label,
  value,
  className,
  align = 'start',
  children,
}: {
  label: string;
  value: string;
  className: string;
  align?: 'start' | 'end';
  children?: ReactNode;
}) {
  return (
    <View className={`flex-1 gap-0.5 ${align === 'end' ? 'items-end' : ''}`}>
      <Text className="text-xs text-ink-muted">{label}</Text>
      <Text className={`text-lg font-bold tabular-nums ${className}`}>{value}</Text>
      {children}
    </View>
  );
}
