import { Pressable, View } from 'react-native';

import { groupedRowClass } from '@/components/ui/grouped';
import { Text } from '@/components/ui/text';
import { useFormatMoney } from '@/hooks/use-format-money';
import { formatShortDate, parseISODate, today } from '@/lib/date';

import type { Subscription } from '../api';
import { FREQUENCIES } from '../constants';

type Props = {
  subscription: Subscription;
  /** Position inside its grouped card. */
  index: number;
  count: number;
  onPress?: () => void;
  onLongPress?: () => void;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from today to `iso` (negative if it already passed). */
export function daysUntil(iso: string) {
  return Math.round((parseISODate(iso).getTime() - parseISODate(today()).getTime()) / DAY_MS);
}

/** "Hoy", "Mañana", "En 5 días" or a plain date when it's further than two weeks. */
export function nextChargeLabel(iso: string) {
  const days = daysUntil(iso);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  if (days <= 14) return `En ${days} días`;
  return formatShortDate(iso);
}

export function SubscriptionCard({ subscription: s, index, count, onPress, onLongPress }: Props) {
  const formatAmount = useFormatMoney();
  const frequency = FREQUENCIES[s.frequency];
  const soon = s.is_active && daysUntil(s.next_charge_on) <= 3;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Mantén presionado para pausar o eliminar"
      onPress={onPress}
      onLongPress={onLongPress}
      className={`flex-row items-center gap-3 px-4 py-3.5 active:opacity-80 ${groupedRowClass(index, count)}`}
    >
      <View
        className={`h-11 w-11 items-center justify-center rounded-full ${
          s.is_active ? 'bg-accent-soft' : 'bg-sunken'
        }`}
        style={{ borderRadius: 22 }}
      >
        <Text
          className={`text-lg font-bold ${s.is_active ? 'text-accent-ink' : 'text-ink-muted'}`}
        >
          {s.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View className="flex-1 gap-0.5">
        <Text
          numberOfLines={1}
          className={`text-base font-semibold ${s.is_active ? 'text-ink' : 'text-ink-muted'}`}
        >
          {s.name}
        </Text>
        <Text numberOfLines={1} className="text-xs text-ink-muted">
          {s.is_active ? (
            <Text className={`text-xs ${soon ? 'font-semibold text-accent-ink' : 'text-ink-muted'}`}>
              {nextChargeLabel(s.next_charge_on)}
            </Text>
          ) : (
            'En pausa'
          )}
          {s.account ? ` · ${s.account.name}` : ''}
        </Text>
      </View>

      <View className="items-end">
        <Text
          className={`text-base font-bold tabular-nums ${s.is_active ? 'text-ink' : 'text-ink-muted'}`}
        >
          {formatAmount(s.amount)}
        </Text>
        <Text className="text-xs text-ink-muted">/{frequency.short}</Text>
      </View>
    </Pressable>
  );
}
