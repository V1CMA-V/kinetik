import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { addMonths, formatMonth, monthRange, today } from '@/lib/date';
import { useThemeColors } from '@/theme/colors';

type Props = {
  /** First day of the shown month (ISO). */
  month: string;
  onChange: (month: string) => void;
};

/** "‹ Noviembre de 2026 ›" — can't go past the current month. */
export function MonthSwitcher({ month, onChange }: Props) {
  const isCurrentMonth = month === monthRange(today()).start;
  return (
    <View className="flex-row items-center justify-between">
      <StepButton direction="back" onPress={() => onChange(addMonths(month, -1))} />
      <Text className="text-lg font-semibold text-ink">{formatMonth(month)}</Text>
      <StepButton
        direction="forward"
        disabled={isCurrentMonth}
        onPress={() => onChange(addMonths(month, 1))}
      />
    </View>
  );
}

function StepButton({
  direction,
  onPress,
  disabled,
}: {
  direction: 'back' | 'forward';
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useThemeColors();
  const back = direction === 'back';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={back ? 'Mes anterior' : 'Mes siguiente'}
      accessibilityState={{ disabled }}
      hitSlop={4}
      onPress={onPress}
      disabled={disabled}
      className="h-11 w-11 items-center justify-center rounded-full bg-sunken active:opacity-70 disabled:opacity-30"
      style={{ borderRadius: 22 }}
    >
      <Icon
        ios={back ? 'chevron.left' : 'chevron.right'}
        android={back ? 'chevron_left' : 'chevron_right'}
        color={colors.ink}
        size={20}
      />
    </Pressable>
  );
}
