import { Text, View } from 'react-native';

import type { Account } from '@/features/accounts/api';
import { DEFAULT_CURRENCY } from '@/features/accounts/constants';
import { useFormatMoney } from '@/hooks/use-format-money';

type Props = {
  accounts: Account[];
};

/** Money you have (bank, cash, investments) vs. what you owe on credit cards. */
export function MoneySummary({ accounts }: Props) {
  const formatAmount = useFormatMoney();

  let available = 0;
  let debt = 0;
  for (const account of accounts) {
    if (account.type === 'credit_card') debt += Math.max(0, -account.balance);
    else available += account.balance;
  }
  const net = available - debt;

  return (
    <View className="gap-4 rounded-2xl bg-brand-500 p-5">
      <View className="gap-1">
        <Text className="text-sm text-brand-50">Patrimonio neto</Text>
        <Text className="text-3xl font-bold text-white">
          {formatAmount(net, DEFAULT_CURRENCY)}
        </Text>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1 gap-0.5 rounded-xl bg-white/15 p-3">
          <Text className="text-xs text-brand-50">Tengo</Text>
          <Text className="text-base font-semibold text-white">
            {formatAmount(available, DEFAULT_CURRENCY)}
          </Text>
        </View>
        <View className="flex-1 gap-0.5 rounded-xl bg-white/15 p-3">
          <Text className="text-xs text-brand-50">Debo en tarjetas</Text>
          <Text className="text-base font-semibold text-white">
            {formatAmount(debt, DEFAULT_CURRENCY)}
          </Text>
        </View>
      </View>
    </View>
  );
}
