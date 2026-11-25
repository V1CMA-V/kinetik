import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { CategoryProgress } from '@/features/budgets/progress';
import { useFormatMoney } from '@/hooks/use-format-money';
import { useThemeColors } from '@/theme/colors';

import { Legend } from './cashflow-chart';

type Props = {
  total: number;
  /** Highest spending first. */
  categories: { category: string; amount: number }[];
  /** Budgets of the month by category. */
  budgets: Map<string, CategoryProgress>;
  onPressCategory: (category: string) => void;
};

/** Categories with their own color in the stacked bar; the rest share the last one. */
const SEGMENT_COLORS = ['bg-accent', 'bg-ink', 'bg-accent/50', 'bg-ink-muted'] as const;
const REST_COLOR = 'bg-outline/40';

const colorAt = (i: number) => SEGMENT_COLORS[i] ?? REST_COLOR;

/** Stacked composition bar + one row per category with its budget marker. */
export function CategoryBreakdown({ total, categories, budgets, onPressCategory }: Props) {
  const formatAmount = useFormatMoney();
  const colors = useThemeColors();

  const top = categories.slice(0, SEGMENT_COLORS.length);
  const rest = categories.slice(SEGMENT_COLORS.length).reduce((sum, c) => sum + c.amount, 0);

  // Same scale for every row, so budget markers and bars are comparable.
  const scale = Math.max(
    0,
    ...categories.map((c) => Math.max(c.amount, budgets.get(c.category)?.budget ?? 0)),
  );

  return (
    <View className="gap-5">
      <View className="gap-3">
        <View className="h-4 flex-row gap-0.5 overflow-hidden rounded-full">
          {top.map((c, i) => (
            <View key={c.category} className={`h-full ${colorAt(i)}`} style={{ flex: c.amount }} />
          ))}
          {rest > 0 ? <View className={`h-full ${REST_COLOR}`} style={{ flex: rest }} /> : null}
        </View>
        <View className="flex-row flex-wrap gap-x-4 gap-y-1.5">
          {top.map((c, i) => (
            <Legend
              key={c.category}
              className={colorAt(i)}
              label={`${c.category} ${Math.round((c.amount / total) * 100)}%`}
            />
          ))}
          {rest > 0 ? (
            <Legend className={REST_COLOR} label={`Resto ${Math.round((rest / total) * 100)}%`} />
          ) : null}
        </View>
      </View>

      <View className="gap-1">
        {categories.map((c, i) => {
          const budget = budgets.get(c.category);
          const over = budget?.status === 'over';
          const barColor = over
            ? 'bg-expense'
            : budget?.status === 'warning'
              ? 'bg-warning'
              : colorAt(i);
          return (
            <Pressable
              key={c.category}
              accessibilityRole="button"
              accessibilityLabel={`Ver movimientos de ${c.category}`}
              onPress={() => onPressCategory(c.category)}
              className="gap-1.5 rounded-xl py-2 active:opacity-60"
            >
              <View className="flex-row items-center justify-between gap-3">
                <View
                  className={`h-2.5 w-2.5 rounded-full ${colorAt(i)}`}
                  style={{ borderRadius: 5 }}
                />
                <Text numberOfLines={1} className="flex-1 text-base text-ink">
                  {c.category}
                </Text>
                <Text className="text-base font-semibold tabular-nums text-ink">
                  {formatAmount(c.amount)}
                </Text>
                <Icon
                  ios="chevron.right"
                  android="chevron_right"
                  color={colors['ink-muted']}
                  size={16}
                />
              </View>

              <View className="h-4 justify-center">
                <View className="h-2 overflow-hidden rounded-full bg-sunken">
                  <View
                    className={`h-full rounded-full ${barColor}`}
                    style={{ width: `${scale ? (c.amount / scale) * 100 : 0}%` }}
                  />
                </View>
                {budget && scale ? (
                  <View
                    className="absolute h-4 w-0.5 rounded-full bg-ink"
                    style={{ left: `${Math.min(99.5, (budget.budget / scale) * 100)}%` }}
                  />
                ) : null}
              </View>

              {budget ? (
                <Text
                  className={`text-xs tabular-nums ${over ? 'text-expense' : 'text-ink-muted'}`}
                >
                  {over
                    ? `Te pasaste por ${formatAmount(-budget.remaining)} de ${formatAmount(budget.budget)}`
                    : `Quedan ${formatAmount(budget.remaining)} de ${formatAmount(budget.budget)}`}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
