import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useFormatMoney } from '@/hooks/use-format-money';
import { formatShortDate } from '@/lib/date';

import type { Account } from '../api';
import { ACCOUNT_TYPE_COLOR, type AccountType } from '../constants';
import type { CreditCardStatement } from '../credit-card';

/** Days before the due date at which the payment is highlighted. */
const URGENT_DAYS = 5;

/** Short type names used on cards and filters. */
export const ACCOUNT_TYPE_SHORT: Record<AccountType, string> = {
  bank_account: 'Débito',
  credit_card: 'Crédito',
  cash: 'Efectivo',
  investment: 'Inversión',
};

type Props = {
  account: Account;
  /** Credit cards only; `undefined` while loading, `null` without a configured cycle. */
  statement?: CreditCardStatement | null;
  onPress?: () => void;
  onLongPress?: () => void;
};

export function AccountCard({ account, statement, onPress, onLongPress }: Props) {
  const formatAmount = useFormatMoney();
  const isCredit = account.type === 'credit_card';
  const debt = Math.abs(Math.min(account.balance, 0));
  const limit = isCredit && account.credit_limit ? account.credit_limit : null;
  const usage = limit ? Math.min(1, debt / limit) : null;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={onLongPress}
      className="gap-3 rounded-card border border-line bg-card p-4 active:opacity-80"
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-2">
          <View className={`h-2.5 w-2.5 rounded-full ${ACCOUNT_TYPE_COLOR[account.type]}`} />
          <Text className="text-xs font-medium text-ink-muted">
            {ACCOUNT_TYPE_SHORT[account.type]}
          </Text>
        </View>
        {account.institution ? (
          <Text numberOfLines={1} className="flex-shrink text-xs text-ink-muted">
            {account.institution}
          </Text>
        ) : null}
      </View>

      <View className="flex-row items-center justify-between gap-3">
        <Text numberOfLines={1} className="flex-1 text-base font-semibold text-ink">
          {account.name}
        </Text>
        <Text
          className={`font-display text-xl font-bold tabular-nums ${
            isCredit ? (debt > 0 ? 'text-expense' : 'text-ink') : 'text-ink'
          }`}
        >
          {isCredit
            ? debt > 0
              ? `-${formatAmount(debt, account.currency)}`
              : formatAmount(0, account.currency)
            : formatAmount(account.balance, account.currency)}
        </Text>
      </View>

      {usage !== null && limit ? (
        <View className="gap-1.5">
          <View className="h-2 overflow-hidden rounded-full bg-sunken">
            <View className="h-full rounded-full bg-accent" style={{ width: `${usage * 100}%` }} />
          </View>
          <Text className="text-xs tabular-nums text-ink-muted">
            Usado {Math.round(usage * 100)}% de {formatAmount(limit, account.currency)} de línea
          </Text>
        </View>
      ) : null}

      {isCredit ? (
        account.statement_day == null || account.payment_due_day == null ? (
          <Text className="text-xs text-ink-muted">
            Configura tu fecha de corte para saber cuánto y cuándo pagar.
          </Text>
        ) : statement ? (
          <StatementSummary statement={statement} currency={account.currency} />
        ) : null
      ) : null}
    </Pressable>
  );
}

/** Payment status of the last statement of a credit card. */
export function StatementSummary({
  statement: s,
  currency,
  onAccent = false,
}: {
  statement: CreditCardStatement;
  currency: string;
  /** Rendered on the orange hero card. */
  onAccent?: boolean;
}) {
  const formatAmount = useFormatMoney();
  const isOverdue = !s.isPaid && s.daysUntilDue < 0;
  const isUrgent = !s.isPaid && s.daysUntilDue <= URGENT_DAYS;

  const headline =
    s.statementAmount === 0
      ? 'Sin pago pendiente'
      : s.isPaid
        ? 'Pagado'
        : `${isOverdue ? 'Venció el' : 'Pagar antes del'} ${formatShortDate(s.dueDate)}: ${formatAmount(
            s.remainingToPay,
            currency,
          )}`;

  const muted = onAccent ? 'text-on-accent-muted' : 'text-ink-muted';
  const headlineColor = onAccent
    ? 'text-on-accent'
    : s.isPaid
      ? 'text-income'
      : isOverdue
        ? 'text-expense'
        : isUrgent
          ? 'text-warning'
          : 'text-ink';

  return (
    <View className={`gap-0.5 border-t pt-3 ${onAccent ? 'border-on-accent/15' : 'border-line'}`}>
      <Text className={`text-sm font-semibold tabular-nums ${headlineColor}`}>{headline}</Text>
      {isUrgent && !isOverdue ? (
        <Text className={`text-xs font-medium ${onAccent ? 'text-on-accent' : 'text-warning'}`}>
          {s.daysUntilDue === 0
            ? 'Vence hoy'
            : `Faltan ${s.daysUntilDue} ${s.daysUntilDue === 1 ? 'día' : 'días'}`}
        </Text>
      ) : null}
      <Text className={`text-xs ${muted}`}>
        Último corte el {formatShortDate(s.lastCutDate)}, el siguiente el{' '}
        {formatShortDate(s.nextCutDate)}
      </Text>
      {s.msiPending > 0 ? (
        <Text className={`text-xs tabular-nums ${muted}`}>
          Meses sin intereses pendientes: {formatAmount(s.msiPending, currency)}
        </Text>
      ) : null}
    </View>
  );
}
