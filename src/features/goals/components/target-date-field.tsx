import { Pressable, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { addMonths, formatMonth, monthRange, today } from '@/lib/date';

type Props = {
  /** Last day of the target month (`YYYY-MM-DD`), or '' for no date. */
  value: string;
  onChange: (value: string) => void;
};

/** Last day of the month `months` from now. */
const monthsFromNow = (months: number) => monthRange(addMonths(today(), months)).end;

const PRESETS = [
  { label: '6 meses', months: 6 },
  { label: '1 año', months: 12 },
  { label: '2 años', months: 24 },
];

/** Optional target month: quick presets plus a month stepper. */
export function TargetDateField({ value, onChange }: Props) {
  const thisMonth = monthRange(today()).end;
  const step = (months: number) => onChange(monthRange(addMonths(value, months)).end);

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-ink-muted">¿Para cuándo? (opcional)</Text>
      <View className="flex-row flex-wrap gap-2">
        <Chip label="Sin fecha" selected={!value} onPress={() => onChange('')} />
        {PRESETS.map((p) => {
          const date = monthsFromNow(p.months);
          return (
            <Chip
              key={p.months}
              label={p.label}
              selected={value === date}
              onPress={() => onChange(date)}
            />
          );
        })}
      </View>
      {value ? (
        <View className="h-12 flex-row items-center rounded-xl border border-outline bg-card">
          <StepButton
            label="Mes anterior"
            symbol="‹"
            disabled={value <= thisMonth}
            onPress={() => step(-1)}
          />
          <Text className="flex-1 text-center text-base font-semibold text-ink">
            {formatMonth(value)}
          </Text>
          <StepButton label="Mes siguiente" symbol="›" onPress={() => step(1)} />
        </View>
      ) : null}
    </View>
  );
}

function StepButton({
  label,
  symbol,
  onPress,
  disabled,
}: {
  label: string;
  symbol: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      className="h-full w-12 items-center justify-center active:opacity-60 disabled:opacity-30"
    >
      <Text className="text-2xl text-ink-muted">{symbol}</Text>
    </Pressable>
  );
}
