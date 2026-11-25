import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { formatMonth } from '@/lib/date';

type Props = {
  months: { month: string; income: number | undefined; expense: number | undefined }[];
  selected: string;
  onSelect: (month: string) => void;
};

const CHART_HEIGHT = 120;
const MIN_HEIGHT = 6;

/** "noviembre de 2026" → "Nov". */
const shortMonth = (iso: string) => formatMonth(iso).slice(0, 3);

/** Paired columns per month (income green, spending orange); others are dimmed. */
export function CashflowChart({ months, selected, onSelect }: Props) {
  const max = Math.max(0, ...months.flatMap((m) => [m.income ?? 0, m.expense ?? 0]));
  const height = (value: number | undefined) =>
    max > 0 && value ? Math.max(MIN_HEIGHT, (value / max) * CHART_HEIGHT) : MIN_HEIGHT;

  return (
    <View className="gap-3">
      <View className="flex-row items-end justify-between gap-2">
        {months.map(({ month, income, expense }) => {
          const isSelected = month === selected;
          return (
            <Pressable
              key={month}
              accessibilityRole="button"
              accessibilityLabel={`Ver ${formatMonth(month).toLowerCase()}`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(month)}
              className="flex-1 items-center gap-2 active:opacity-70"
            >
              <View
                className="w-full flex-row items-end justify-center gap-1"
                style={{ height: CHART_HEIGHT, opacity: isSelected ? 1 : 0.35 }}
              >
                <View
                  className={`flex-1 ${income ? 'bg-income' : 'bg-sunken'}`}
                  style={{ height: height(income), borderRadius: 999 }}
                />
                <View
                  className={`flex-1 ${expense ? 'bg-accent' : 'bg-sunken'}`}
                  style={{ height: height(expense), borderRadius: 999 }}
                />
              </View>
              <Text className={`text-xs ${isSelected ? 'font-bold text-ink' : 'text-ink-muted'}`}>
                {shortMonth(month)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View className="flex-row justify-center gap-4">
        <Legend className="bg-income" label="Ingresos" />
        <Legend className="bg-accent" label="Gastos" />
      </View>
    </View>
  );
}

export function Legend({ className, label }: { className: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`h-2 w-2 rounded-full ${className}`} style={{ borderRadius: 4 }} />
      <Text className="text-xs text-ink-muted">{label}</Text>
    </View>
  );
}
