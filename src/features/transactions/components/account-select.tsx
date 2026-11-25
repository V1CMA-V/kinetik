import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { Account } from '@/features/accounts/api';
import { ACCOUNT_TYPES } from '@/features/accounts/constants';
import { useFormatMoney } from '@/hooks/use-format-money';

type Props = {
  label: string;
  accounts: Account[];
  value: string | undefined;
  onChange: (id: string) => void;
  error?: string;
  excludeId?: string;
};

export function AccountSelect({ label, accounts, value, onChange, error, excludeId }: Props) {
  const formatAmount = useFormatMoney();
  const options = accounts.filter((a) => a.id !== excludeId);

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-ink-muted">{label}</Text>
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
                selected ? 'border-accent bg-accent-soft' : 'border-outline bg-card'
              }`}
            >
              <Text className="text-xs text-ink-muted">
                {account.institution ?? ACCOUNT_TYPES[account.type].label}
              </Text>
              <Text className="text-base font-semibold text-ink">{account.name}</Text>
              <Text className={`text-xs ${isCredit ? 'text-expense' : 'text-ink-muted'}`}>
                {isCredit
                  ? `Deuda ${formatAmount(Math.abs(Math.min(account.balance, 0)), account.currency)}`
                  : formatAmount(account.balance, account.currency)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {error ? <Text className="text-sm text-expense">{error}</Text> : null}
    </View>
  );
}
