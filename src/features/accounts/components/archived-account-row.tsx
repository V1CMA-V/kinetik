import { Pressable, Text, View } from 'react-native';

import { useFormatMoney } from '@/hooks/use-format-money';
import { formatShortDate, toISODate } from '@/lib/date';

import type { Account } from '../api';
import { ACCOUNT_TYPES } from '../constants';

type Props = {
  account: Account;
  onPress?: () => void;
};

export function ArchivedAccountRow({ account, onPress }: Props) {
  const formatMoney = useFormatMoney();
  const isCredit = account.type === 'credit_card';
  const debt = Math.abs(Math.min(account.balance, 0));

  const subtitle = [account.institution, ACCOUNT_TYPES[account.type].label]
    .filter(Boolean)
    .join(' · ');
  // There's no `archived_at` column; `updated_at` is the archive date unless the row changed later.
  const archivedOn = formatShortDate(toISODate(new Date(account.updated_at)));

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 active:opacity-80 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <View className="flex-1 gap-0.5">
        <Text
          numberOfLines={1}
          className="text-base font-semibold text-neutral-900 dark:text-white"
        >
          {account.name}
        </Text>
        <Text numberOfLines={1} className="text-xs text-neutral-500">
          {subtitle}
        </Text>
        <Text className="text-xs text-neutral-500">Archivada el {archivedOn}</Text>
      </View>
      <Text
        className={`text-base font-semibold ${
          isCredit && debt > 0 ? 'text-red-500' : 'text-neutral-900 dark:text-white'
        }`}
      >
        {isCredit
          ? `Deuda ${formatMoney(debt, account.currency)}`
          : formatMoney(account.balance, account.currency)}
      </Text>
    </Pressable>
  );
}
