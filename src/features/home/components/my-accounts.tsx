import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { groupedRowClass } from '@/components/ui/grouped';
import { Text } from '@/components/ui/text';
import type { Account } from '@/features/accounts/api';
import { ACCOUNT_TYPES, ACCOUNT_TYPE_COLOR } from '@/features/accounts/constants';
import { useFormatMoney } from '@/hooks/use-format-money';

import { HomeSection } from './home-section';

const MAX_ACCOUNTS = 3;

function subtitle(account: Account) {
  const base = account.institution ?? ACCOUNT_TYPES[account.type].label;
  if (account.type === 'credit_card' && account.statement_day) {
    return `${base}, corte día ${account.statement_day}`;
  }
  return base;
}

/** The accounts with the most money (or debt), as a compact list. */
export function MyAccounts({ accounts }: { accounts: Account[] }) {
  const formatAmount = useFormatMoney();
  if (!accounts.length) return null;

  const top = [...accounts]
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
    .slice(0, MAX_ACCOUNTS);

  return (
    <HomeSection
      title="Mis cuentas"
      action={{ label: 'Ver todas', onPress: () => router.push('/accounts') }}
    >
      <View>
        {top.map((a, i) => {
          // Card debt is stored as a negative balance; show it as money you owe.
          const amount = a.type === 'credit_card' ? -Math.max(0, -a.balance) : a.balance;
          return (
            <Pressable
              key={a.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/accounts/[id]', params: { id: a.id } })}
              className={`flex-row items-center gap-3 px-4 py-3.5 active:opacity-80 ${groupedRowClass(i, top.length)}`}
            >
              <View className={`w-1 self-stretch rounded-full ${ACCOUNT_TYPE_COLOR[a.type]}`} />
              <View className="flex-1 gap-0.5">
                <Text numberOfLines={1} className="text-base font-semibold text-ink">
                  {a.name}
                </Text>
                <Text numberOfLines={1} className="text-xs text-ink-muted">
                  {subtitle(a)}
                </Text>
              </View>
              <Text
                className={`text-base font-bold tabular-nums ${
                  amount < 0 ? 'text-expense' : 'text-ink'
                }`}
              >
                {formatAmount(amount, a.currency)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </HomeSection>
  );
}
