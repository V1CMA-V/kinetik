import { Pressable, View } from 'react-native';

import { groupedRowClass } from '@/components/ui/grouped';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { usePartner } from '@/features/household/api';
import { useFormatMoney } from '@/hooks/use-format-money';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeColors } from '@/theme/colors';

import type { Transaction } from '../api';
import { TRANSACTION_KINDS } from '../constants';
import { installmentProgress } from '../installments';

type Props = {
  transaction: Transaction;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Position inside an inset grouped list; omit for a standalone card. */
  group?: { index: number; count: number };
  /** Shows transfers as money in (+) or out (−) of this account. */
  accountId?: string;
};

export function TransactionRow({ transaction: t, onPress, onLongPress, accountId, group }: Props) {
  const formatAmount = useFormatMoney();
  const myId = useAuthStore((s) => s.session?.user.id);
  const { partner } = usePartner();
  const partnerName = partner?.name ?? 'tu pareja';
  // Registered by the partner on a shared account.
  const byPartner = !!myId && t.user_id !== myId;

  // RLS hides the partner's personal accounts (e.g. the source of a contribution).
  const accountLabel = (account: { name: string; institution: string | null } | null) =>
    account
      ? [account.institution, account.name].filter(Boolean).join(' · ')
      : `Cuenta de ${partnerName}`;

  const title =
    t.description ||
    t.category ||
    (t.kind === 'transfer' ? 'Transferencia' : TRANSACTION_KINDS[t.kind].label);

  const subtitle =
    t.kind === 'transfer'
      ? `${accountLabel(t.account)} → ${accountLabel(t.to_account)}`
      : [t.description ? t.category : null, accountLabel(t.account)].filter(Boolean).join(' · ');

  // Direction relative to `accountId`; without it transfers stay neutral.
  const direction =
    t.kind === 'income'
      ? 'in'
      : t.kind === 'expense'
        ? 'out'
        : accountId === t.to_account_id
          ? 'in'
          : accountId === t.account_id
            ? 'out'
            : null;

  const amountText =
    direction === 'in'
      ? `+${formatAmount(t.amount)}`
      : direction === 'out'
        ? `-${formatAmount(t.amount)}`
        : formatAmount(t.amount);

  const colors = useThemeColors();
  const amountColor =
    direction === 'in' ? 'text-income' : direction === 'out' ? 'text-expense' : 'text-ink';
  // Arrow bubble: money in (↙, green), out (↗, red) or a neutral transfer (⇄).
  const bubble =
    direction === 'in'
      ? ({ ios: 'arrow.down.left', android: 'south_west', color: colors.income } as const)
      : direction === 'out'
        ? ({ ios: 'arrow.up.right', android: 'north_east', color: colors.expense } as const)
        : ({
            ios: 'arrow.left.arrow.right',
            android: 'swap_horiz',
            color: colors['ink-muted'],
          } as const);

  const msi = t.installment_months
    ? installmentProgress(t.amount, t.installment_months, t.occurred_on, t.account?.statement_day)
    : null;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      className={`flex-row items-center gap-3 px-4 py-3 active:opacity-80 ${
        group
          ? groupedRowClass(group.index, group.count)
          : 'rounded-card border border-line bg-card'
      }`}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-full bg-sunken"
        style={{ borderRadius: 20 }}
      >
        <Icon ios={bubble.ios} android={bubble.android} color={bubble.color} size={18} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="text-base font-semibold text-ink">
          {title}
        </Text>
        <Text numberOfLines={1} className="text-xs text-ink-muted">
          {subtitle}
        </Text>
        {byPartner ? (
          <Text numberOfLines={1} className="text-xs font-medium text-accent-ink">
            Registró {partnerName}
          </Text>
        ) : null}
        {t.subscription_id ? (
          <View className="mt-1 self-start rounded-full bg-sunken px-2 py-0.5">
            <Text className="text-xs font-medium text-ink-muted">
              Suscripción · cargo automático
            </Text>
          </View>
        ) : null}
        {msi ? (
          <View className="mt-1 self-start rounded-full bg-accent-soft px-2 py-0.5">
            <Text className="text-xs font-medium text-accent-ink">
              {t.installment_months} MSI · {formatAmount(msi.monthly)}/mes ·{' '}
              {msi.isDone ? 'Liquidado' : `${msi.paid}/${t.installment_months} pagados`}
            </Text>
          </View>
        ) : null}
      </View>
      <Text className={`text-base font-bold tabular-nums ${amountColor}`}>{amountText}</Text>
    </Pressable>
  );
}
