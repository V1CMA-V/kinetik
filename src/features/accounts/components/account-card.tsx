import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useFormatMoney } from '@/hooks/use-format-money';
import { formatShortDate } from '@/lib/date';

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
  const formatAmount = useFormatMoney();
  const isCredit = account.type === 'credit_card';
  const debt = Math.abs(Math.min(account.balance, 0));
  const available = isCredit && account.credit_limit != null ? account.credit_limit - debt : null;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className="gap-3 rounded-card border border-line bg-card p-4 active:opacity-80"
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text numberOfLines={1} className="flex-1 text-base font-semibold text-ink">
          {account.name}
        </Text>
        <View className="rounded-full bg-accent-soft px-2.5 py-1">
          <Text className="text-xs font-medium text-accent-ink">
            {ACCOUNT_TYPES[account.type].label}
          </Text>
        </View>
      </View>

      {isCredit ? (
        <View className="flex-row justify-between">
          <View>
            <Text className="text-xs text-ink-muted">Deuda</Text>
            <Text className="font-display text-xl font-bold text-expense">
              {formatAmount(debt, account.currency)}
            </Text>
          </View>
          {available != null ? (
            <View className="items-end">
              <Text className="text-xs text-ink-muted">Disponible</Text>
              <Text className="text-base font-semibold text-ink">
                {formatAmount(available, account.currency)}
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View>
          <Text className="text-xs text-ink-muted">Saldo</Text>
          <Text className="font-display text-xl font-bold text-ink">
            {formatAmount(account.balance, account.currency)}
          </Text>
        </View>
      )}

      {isCredit ? (
        account.statement_day == null || account.payment_due_day == null ? (
          <Text className="text-xs text-ink-muted">
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
  const formatAmount = useFormatMoney();
  const isOverdue = !s.isPaid && s.daysUntilDue < 0;
  const isUrgent = !s.isPaid && s.daysUntilDue <= URGENT_DAYS;

  const headline =
    s.statementAmount === 0
      ? 'Sin pago pendiente'
      : s.isPaid
        ? 'Pagado ✓'
        : `${isOverdue ? 'Venció el' : 'Pagar antes del'} ${formatShortDate(s.dueDate)}: ${formatAmount(
            s.remainingToPay,
            currency,
          )}`;

  const headlineColor = s.isPaid ? 'text-income' : isUrgent ? 'text-expense' : 'text-ink';

  return (
    <View className="gap-0.5 border-t border-line pt-3">
      <Text className={`text-sm font-semibold ${headlineColor}`}>{headline}</Text>
      {isUrgent && !isOverdue ? (
        <Text className="text-xs text-expense">
          {s.daysUntilDue === 0
            ? 'Vence hoy'
            : `Faltan ${s.daysUntilDue} ${s.daysUntilDue === 1 ? 'día' : 'días'}`}
        </Text>
      ) : null}
      <Text className="text-xs text-ink-muted">
        Corte: {formatShortDate(s.lastCutDate)} · Próximo corte: {formatShortDate(s.nextCutDate)}
      </Text>
      {s.msiPending > 0 ? (
        <Text className="text-xs text-ink-muted">
          MSI pendientes: {formatAmount(s.msiPending, currency)}
        </Text>
      ) : null}
    </View>
  );
}
