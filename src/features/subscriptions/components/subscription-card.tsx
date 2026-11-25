import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useFormatMoney } from '@/hooks/use-format-money';
import { formatDay, parseISODate } from '@/lib/date';

import type { Subscription } from '../api';
import { FREQUENCIES } from '../constants';

type Props = {
  subscription: Subscription;
  onPress?: () => void;
  onLongPress?: () => void;
};

const dateFormatter = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });

function nextChargeLabel(iso: string) {
  const day = formatDay(iso);
  // formatDay gives "Hoy"/"Ayer" or a weekday; for upcoming dates a plain date reads better.
  return day === 'Hoy' ? 'Hoy' : dateFormatter.format(parseISODate(iso));
}

export function SubscriptionCard({ subscription: s, onPress, onLongPress }: Props) {
  const formatAmount = useFormatMoney();
  const frequency = FREQUENCIES[s.frequency];
  const account = s.account
    ? [s.account.institution, s.account.name].filter(Boolean).join(' · ')
    : '—';

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className={`flex-row items-center gap-3 rounded-card border border-line bg-card px-4 py-3 active:opacity-80 ${
        s.is_active ? '' : 'opacity-50'
      }`}
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-accent-soft">
        <Text className="text-lg font-bold text-accent-ink">{s.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="text-base font-semibold text-ink">
          {s.name}
        </Text>
        <Text numberOfLines={1} className="text-xs text-ink-muted">
          {account}
        </Text>
        <Text className="text-xs text-ink-muted">
          {s.is_active ? `Próximo cargo: ${nextChargeLabel(s.next_charge_on)}` : 'En pausa'}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-base font-bold text-ink">{formatAmount(s.amount)}</Text>
        <Text className="text-xs text-ink-muted">/{frequency.short}</Text>
      </View>
    </Pressable>
  );
}
