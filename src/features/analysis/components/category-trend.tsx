import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { formatMonth } from '@/lib/date';

type Props = {
  months: { month: string; amount: number }[];
  selected: string;
  average: number;
};

const CHART_HEIGHT = 56;

/** Compact columns of one category over 6 months, with a line at the average. */
export function CategoryTrend({ months, selected, average }: Props) {
  const max = Math.max(1, average, ...months.map((m) => m.amount));
  const y = (value: number) => (value / max) * CHART_HEIGHT;

  return (
    <View className="gap-1.5">
      <View style={{ height: CHART_HEIGHT }}>
        <View className="h-full flex-row items-end gap-2">
          {months.map((m) => (
            <View
              key={m.month}
              className={`flex-1 rounded-md ${
                m.month === selected ? 'bg-accent' : m.amount ? 'bg-ink/20' : 'bg-sunken'
              }`}
              style={{ height: Math.max(3, y(m.amount)) }}
            />
          ))}
        </View>
        {average > 0 ? (
          <View
            className="absolute left-0 right-0 border-t border-dashed border-ink-muted"
            style={{ bottom: y(average) }}
          />
        ) : null}
      </View>
      <View className="flex-row gap-2">
        {months.map((m) => (
          <Text
            key={m.month}
            className={`flex-1 text-center text-xs ${
              m.month === selected ? 'font-bold text-ink' : 'text-ink-muted'
            }`}
          >
            {formatMonth(m.month).slice(0, 3)}
          </Text>
        ))}
      </View>
    </View>
  );
}
