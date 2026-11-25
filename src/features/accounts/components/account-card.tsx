import { Pressable, Text, View } from 'react-native';

import { formatMoney } from '@/lib/format';

import type { Account } from '../api';
import { ACCOUNT_TYPES } from '../constants';

type Props = {
  account: Account;
  onLongPress?: () => void;
};

export function AccountCard({ account, onLongPress }: Props) {
  const isCredit = account.type === 'credit_card';
  const debt = Math.abs(Math.min(account.balance, 0));
  const available = isCredit && account.credit_limit != null ? account.credit_limit - debt : null;

  return (
    <Pressable
      onLongPress={onLongPress}
      className="gap-3 rounded-2xl border border-neutral-200 bg-white p-4 active:opacity-80 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text
          numberOfLines={1}
          className="flex-1 text-base font-semibold text-neutral-900 dark:text-white"
        >
          {account.name}
        </Text>
        <View className="rounded-full bg-brand-50 px-2.5 py-1 dark:bg-brand-700/30">
          <Text className="text-xs font-medium text-brand-700 dark:text-brand-100">
            {ACCOUNT_TYPES[account.type].label}
          </Text>
        </View>
      </View>

      {isCredit ? (
        <View className="flex-row justify-between">
          <View>
            <Text className="text-xs text-neutral-500">Deuda</Text>
            <Text className="text-xl font-bold text-red-500">
              {formatMoney(debt, account.currency)}
            </Text>
          </View>
          {available != null ? (
            <View className="items-end">
              <Text className="text-xs text-neutral-500">Disponible</Text>
              <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                {formatMoney(available, account.currency)}
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View>
          <Text className="text-xs text-neutral-500">Saldo</Text>
          <Text className="text-xl font-bold text-neutral-900 dark:text-white">
            {formatMoney(account.balance, account.currency)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
