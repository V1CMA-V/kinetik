import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { Account } from '@/features/accounts/api';
import { DEFAULT_CURRENCY } from '@/features/accounts/constants';
import { useFormatMoney } from '@/hooks/use-format-money';

type Props = {
  accounts: Account[];
};

/** Net worth on a dark card: money you have (bank, cash, investments) vs. card debt. */
export function BalanceHero({ accounts }: Props) {
  const formatAmount = useFormatMoney();

  let available = 0;
  let debt = 0;
  for (const account of accounts) {
    if (account.type === 'credit_card') debt += Math.max(0, -account.balance);
    else available += account.balance;
  }
  const net = available - debt;
  const positiveAvailable = Math.max(0, available);
  const scale = positiveAvailable + debt;
  // Share of the bar for what you have; the rest is card debt.
  const haveRatio = scale > 0 ? positiveAvailable / scale : 1;

  return (
    <View className="gap-5 rounded-card bg-ink p-5">
      <View className="gap-1">
        <Text className="text-sm font-medium text-surface/70">Saldo total</Text>
        <Text
          adjustsFontSizeToFit
          numberOfLines={1}
          className="font-display text-4xl font-bold tabular-nums text-surface"
        >
          {formatAmount(net, DEFAULT_CURRENCY)}
        </Text>
      </View>

      <View className="gap-3">
        <View
          accessible
          accessibilityLabel={`Tienes ${Math.round(haveRatio * 100)} por ciento frente a tus deudas`}
          className="h-2 flex-row gap-1"
        >
          {haveRatio > 0 ? (
            <View className="h-full rounded-full bg-accent" style={{ flex: haveRatio }} />
          ) : null}
          {haveRatio < 1 ? (
            <View className="h-full rounded-full bg-surface/25" style={{ flex: 1 - haveRatio }} />
          ) : null}
        </View>
        <View className="flex-row justify-between gap-3">
          <View className="gap-0.5">
            <View className="flex-row items-center gap-1.5">
              <View className="h-2 w-2 rounded-full bg-accent" />
              <Text className="text-xs font-medium text-surface/70">Tengo</Text>
            </View>
            <Text className="text-base font-semibold tabular-nums text-surface">
              {formatAmount(available, DEFAULT_CURRENCY)}
            </Text>
          </View>
          <View className="items-end gap-0.5">
            <View className="flex-row items-center gap-1.5">
              <View className="h-2 w-2 rounded-full bg-surface/25" />
              <Text className="text-xs font-medium text-surface/70">Debo en tarjetas</Text>
            </View>
            <Text className="text-base font-semibold tabular-nums text-surface">
              {formatAmount(debt, DEFAULT_CURRENCY)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
