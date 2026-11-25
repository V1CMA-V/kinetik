import { Pressable, Text, View } from 'react-native';

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
      className={`flex-row items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 active:opacity-80 dark:border-neutral-800 dark:bg-neutral-900 ${
        s.is_active ? '' : 'opacity-50'
      }`}
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-700/30">
        <Text className="text-lg font-bold text-brand-700 dark:text-brand-100">
          {s.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="flex-1 gap-0.5">
        <Text
          numberOfLines={1}
          className="text-base font-semibold text-neutral-900 dark:text-white"
        >
          {s.name}
        </Text>
        <Text numberOfLines={1} className="text-xs text-neutral-500">
          {account}
        </Text>
        <Text className="text-xs text-neutral-500">
          {s.is_active ? `Próximo cargo: ${nextChargeLabel(s.next_charge_on)}` : 'En pausa'}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-base font-bold text-neutral-900 dark:text-white">
          {formatAmount(s.amount)}
        </Text>
        <Text className="text-xs text-neutral-500">/{frequency.short}</Text>
      </View>
    </Pressable>
  );
}
