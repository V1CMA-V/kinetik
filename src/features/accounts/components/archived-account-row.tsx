import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
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
      className="flex-row items-center gap-3 rounded-card border border-line bg-card p-4 active:opacity-80"
    >
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="text-base font-semibold text-ink">
          {account.name}
        </Text>
        <Text numberOfLines={1} className="text-xs text-ink-muted">
          {subtitle}
        </Text>
        <Text className="text-xs text-ink-muted">Archivada el {archivedOn}</Text>
      </View>
      <Text
        className={`text-base font-semibold ${isCredit && debt > 0 ? 'text-expense' : 'text-ink'}`}
      >
        {isCredit
          ? `Deuda ${formatMoney(debt, account.currency)}`
          : formatMoney(account.balance, account.currency)}
      </Text>
    </Pressable>
  );
}
