import { Pressable, Text, View } from 'react-native';

import { formatMoney } from '@/lib/format';

import type { Transaction } from '../api';
import { TRANSACTION_KINDS } from '../constants';
import { installmentProgress } from '../installments';

type Props = {
  transaction: Transaction;
  onLongPress?: () => void;
};

const accountLabel = (account: { name: string; institution: string | null } | null) =>
  account ? [account.institution, account.name].filter(Boolean).join(' · ') : '—';

export function TransactionRow({ transaction: t, onLongPress }: Props) {
  const title =
    t.description ||
    t.category ||
    (t.kind === 'transfer' ? 'Transferencia' : TRANSACTION_KINDS[t.kind].label);

  const subtitle =
    t.kind === 'transfer'
      ? `${accountLabel(t.account)} → ${accountLabel(t.to_account)}`
      : [t.description ? t.category : null, accountLabel(t.account)].filter(Boolean).join(' · ');

  const amountText =
    t.kind === 'income'
      ? `+${formatMoney(t.amount)}`
      : t.kind === 'expense'
        ? `-${formatMoney(t.amount)}`
        : formatMoney(t.amount);

  const amountColor =
    t.kind === 'income'
      ? 'text-green-600 dark:text-green-500'
      : t.kind === 'expense'
        ? 'text-neutral-900 dark:text-white'
        : 'text-brand-600 dark:text-brand-100';

  const msi = t.installment_months
    ? installmentProgress(t.amount, t.installment_months, t.occurred_on)
    : null;

  return (
    <Pressable
      onLongPress={onLongPress}
      className="flex-row items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 active:opacity-80 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <View className="flex-1 gap-0.5">
        <Text
          numberOfLines={1}
          className="text-base font-semibold text-neutral-900 dark:text-white"
        >
          {title}
        </Text>
        <Text numberOfLines={1} className="text-xs text-neutral-500">
          {subtitle}
        </Text>
        {t.subscription_id ? (
          <View className="mt-1 self-start rounded-full bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
            <Text className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Suscripción · cargo automático
            </Text>
          </View>
        ) : null}
        {msi ? (
          <View className="mt-1 self-start rounded-full bg-brand-50 px-2 py-0.5 dark:bg-brand-700/30">
            <Text className="text-xs font-medium text-brand-700 dark:text-brand-100">
              {t.installment_months} MSI · {formatMoney(msi.monthly)}/mes ·{' '}
              {msi.isDone ? 'Liquidado' : `${msi.paid}/${t.installment_months} pagados`}
            </Text>
          </View>
        ) : null}
      </View>
      <Text className={`text-base font-bold ${amountColor}`}>{amountText}</Text>
    </Pressable>
  );
}
