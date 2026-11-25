import { Pressable, Text, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { addDays, formatDay, parseISODate, today, toISODate } from '@/lib/date';

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  /** Upcoming dates (e.g. next subscription charge) instead of past ones. */
  allowFuture?: boolean;
};

/** Same day next/previous month, clamped to the month's length (Jan 31 → Feb 28). */
function shiftMonth(iso: string, months: number) {
  const date = parseISODate(iso);
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return toISODate(target);
}

const fullDate = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function DateField({ value, onChange, label = 'Fecha', allowFuture = false }: Props) {
  const now = today();
  const shortcut = allowFuture
    ? { label: 'Mañana', value: addDays(now, 1) }
    : { label: 'Ayer', value: addDays(now, -1) };
  const canGoForward = allowFuture || value < now;

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</Text>
      <View className="flex-row gap-2">
        <Chip label="Hoy" selected={value === now} onPress={() => onChange(now)} />
        <Chip
          label={shortcut.label}
          selected={value === shortcut.value}
          onPress={() => onChange(shortcut.value)}
        />
        {allowFuture ? (
          <>
            <Chip label="‹ Mes" onPress={() => onChange(shiftMonth(value, -1))} />
            <Chip label="Mes ›" onPress={() => onChange(shiftMonth(value, 1))} />
          </>
        ) : null}
      </View>
      <View className="h-12 flex-row items-center rounded-xl border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        <StepButton label="‹" onPress={() => onChange(addDays(value, -1))} />
        <View className="flex-1 items-center">
          <Text className="text-base font-semibold text-neutral-900 dark:text-white">
            {formatDay(value)}
          </Text>
          <Text className="text-xs text-neutral-500">{fullDate.format(parseISODate(value))}</Text>
        </View>
        <StepButton
          label="›"
          disabled={!canGoForward}
          onPress={() => onChange(addDays(value, 1))}
        />
      </View>
    </View>
  );
}

function StepButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === '‹' ? 'Día anterior' : 'Día siguiente'}
      onPress={onPress}
      disabled={disabled}
      className="h-full w-12 items-center justify-center active:opacity-60 disabled:opacity-30"
    >
      <Text className="text-2xl text-neutral-700 dark:text-neutral-300">{label}</Text>
    </Pressable>
  );
}
