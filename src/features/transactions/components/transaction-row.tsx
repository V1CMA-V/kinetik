import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useFormatMoney } from '@/hooks/use-format-money';

import type { Transaction } from '../api';
import { TRANSACTION_KINDS } from '../constants';
import { installmentProgress } from '../installments';

type Props = {
  transaction: Transaction;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Shows transfers as money in (+) or out (−) of this account. */
  accountId?: string;
};

const accountLabel = (account: { name: string; institution: string | null } | null) =>
  account ? [account.institution, account.name].filter(Boolean).join(' · ') : '—';

export function TransactionRow({ transaction: t, onPress, onLongPress, accountId }: Props) {
  const formatAmount = useFormatMoney();
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

  const amountColor =
    t.kind === 'income' ? 'text-income' : t.kind === 'expense' ? 'text-ink' : 'text-accent-ink';

  const msi = t.installment_months
    ? installmentProgress(t.amount, t.installment_months, t.occurred_on, t.account?.statement_day)
    : null;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className="flex-row items-center gap-3 rounded-card border border-line bg-card px-4 py-3 active:opacity-80"
    >
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="text-base font-semibold text-ink">
          {title}
        </Text>
        <Text numberOfLines={1} className="text-xs text-ink-muted">
          {subtitle}
        </Text>
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
      <Text className={`text-base font-bold ${amountColor}`}>{amountText}</Text>
    </Pressable>
  );
}
