import { Pressable, Text, View } from 'react-native';

import { formatShortDate } from '@/lib/date';
import { formatMoney } from '@/lib/format';

import type { Account } from '../api';
import { ACCOUNT_TYPES } from '../constants';
import type { CreditCardStatement } from '../credit-card';

/** Days before the due date at which the payment is highlighted. */
const URGENT_DAYS = 5;

type Props = {
  account: Account;
  /** Credit cards only; `undefined` while loading, `null` without a configured cycle. */
  statement?: CreditCardStatement | null;
  onPress?: () => void;
  onLongPress?: () => void;
};

export function AccountCard({ account, statement, onPress, onLongPress }: Props) {
  const isCredit = account.type === 'credit_card';
  const debt = Math.abs(Math.min(account.balance, 0));
  const available = isCredit && account.credit_limit != null ? account.credit_limit - debt : null;

  return (
    <Pressable
      onPress={onPress}
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

      {isCredit ? (
        account.statement_day == null || account.payment_due_day == null ? (
          <Text className="text-xs text-neutral-500">
            Configura tu fecha de corte para saber cuánto y cuándo pagar
          </Text>
        ) : statement ? (
          <StatementSummary statement={statement} currency={account.currency} />
        ) : null
      ) : null}
    </Pressable>
  );
}

function StatementSummary({
  statement: s,
  currency,
}: {
  statement: CreditCardStatement;
  currency: string;
}) {
  const isOverdue = !s.isPaid && s.daysUntilDue < 0;
  const isUrgent = !s.isPaid && s.daysUntilDue <= URGENT_DAYS;

  const headline =
    s.statementAmount === 0
      ? 'Sin pago pendiente'
      : s.isPaid
        ? 'Pagado ✓'
        : `${isOverdue ? 'Venció el' : 'Pagar antes del'} ${formatShortDate(s.dueDate)}: ${formatMoney(
            s.remainingToPay,
            currency,
          )}`;

  const headlineColor = s.isPaid
    ? 'text-green-600 dark:text-green-500'
    : isUrgent
      ? 'text-red-500'
      : 'text-neutral-900 dark:text-white';

  return (
    <View className="gap-0.5 border-t border-neutral-100 pt-3 dark:border-neutral-800">
      <Text className={`text-sm font-semibold ${headlineColor}`}>{headline}</Text>
      {isUrgent && !isOverdue ? (
        <Text className="text-xs text-red-500">
          {s.daysUntilDue === 0
            ? 'Vence hoy'
            : `Faltan ${s.daysUntilDue} ${s.daysUntilDue === 1 ? 'día' : 'días'}`}
        </Text>
      ) : null}
      <Text className="text-xs text-neutral-500">
        Corte: {formatShortDate(s.lastCutDate)} · Próximo corte: {formatShortDate(s.nextCutDate)}
      </Text>
      {s.msiPending > 0 ? (
        <Text className="text-xs text-neutral-500">
          MSI pendientes: {formatMoney(s.msiPending, currency)}
        </Text>
      ) : null}
    </View>
  );
}
