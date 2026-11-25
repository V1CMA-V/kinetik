import { Pressable, ScrollView, Text, View } from 'react-native';

import type { Account } from '@/features/accounts/api';
import { ACCOUNT_TYPES } from '@/features/accounts/constants';
import { formatMoney } from '@/lib/format';

type Props = {
  label: string;
  accounts: Account[];
  value: string | undefined;
  onChange: (id: string) => void;
  error?: string;
  excludeId?: string;
};

export function AccountSelect({ label, accounts, value, onChange, error, excludeId }: Props) {
  const options = accounts.filter((a) => a.id !== excludeId);

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 py-1"
        keyboardShouldPersistTaps="handled"
      >
        {options.map((account) => {
          const selected = account.id === value;
          const isCredit = account.type === 'credit_card';
          return (
            <Pressable
              key={account.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(account.id)}
              className={`min-w-36 gap-0.5 rounded-xl border px-4 py-3 active:opacity-80 ${
                selected
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-700/30'
                  : 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900'
              }`}
            >
              <Text className="text-xs text-neutral-500">
                {account.institution ?? ACCOUNT_TYPES[account.type].label}
              </Text>
              <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                {account.name}
              </Text>
              <Text className={`text-xs ${isCredit ? 'text-red-500' : 'text-neutral-500'}`}>
                {isCredit
                  ? `Deuda ${formatMoney(Math.abs(Math.min(account.balance, 0)), account.currency)}`
                  : formatMoney(account.balance, account.currency)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {error ? <Text className="text-sm text-red-500">{error}</Text> : null}
    </View>
  );
}
