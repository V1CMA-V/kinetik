import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { formatMonth } from '@/lib/date';

type Props = {
  months: { month: string; total: number | undefined }[];
  selected: string;
  onSelect: (month: string) => void;
};

const CHART_HEIGHT = 128;
const MIN_HEIGHT = 10;

/** "noviembre de 2026" → "Nov". */
const shortMonth = (iso: string) => formatMonth(iso).slice(0, 3);

/** Rounded columns, one per month; the selected month is orange. */
export function SpendingChart({ months, selected, onSelect }: Props) {
  const max = Math.max(0, ...months.map((m) => m.total ?? 0));

  return (
    <View className="flex-row items-end justify-between gap-2">
      {months.map(({ month, total }) => {
        const isSelected = month === selected;
        const height =
          max > 0 && total ? Math.max(MIN_HEIGHT, (total / max) * CHART_HEIGHT) : MIN_HEIGHT;
        return (
          <Pressable
            key={month}
            accessibilityRole="button"
            accessibilityLabel={`Ver ${formatMonth(month).toLowerCase()}`}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(month)}
            className="flex-1 items-center gap-2 active:opacity-70"
          >
            <View className="w-full justify-end" style={{ height: CHART_HEIGHT }}>
              <View
                className={`w-full ${total ? (isSelected ? 'bg-accent' : 'bg-ink') : 'bg-sunken'}`}
                style={{ height, borderRadius: 999 }}
              />
            </View>
            <Text className={`text-xs ${isSelected ? 'font-bold text-ink' : 'text-ink-muted'}`}>
              {shortMonth(month)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
