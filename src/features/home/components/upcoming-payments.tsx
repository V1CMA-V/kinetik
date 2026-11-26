import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { groupedRowClass } from '@/components/ui/grouped';
import { Text } from '@/components/ui/text';
import type { PaymentCoverage } from '@/features/accounts/payment-coverage';
import type { CardSummary } from '@/features/accounts/statements';
import { useFormatMoney } from '@/hooks/use-format-money';
import { formatDay, formatShortDate } from '@/lib/date';

import { HomeCard, HomeSection } from './home-section';

type Props = {
  cards: CardSummary[];
  /** Credit cards without día de corte / día límite de pago. */
  unconfiguredCards: number;
  /** Money in the accounts chosen to pay the cards, and what's left after paying them. */
  coverage: Pick<PaymentCoverage, 'available' | 'balance' | 'dueTotal'>;
};

/** Cards whose due date is this close (or closer) are highlighted. */
const SOON_DAYS = 5;

const round2 = (n: number) => Math.round(n * 100) / 100;

function dueLabel(days: number) {
  if (days < 0) return days === -1 ? 'Venció ayer' : `Venció hace ${-days} días`;
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  return `Vence en ${days} días`;
}

function dueColor(days: number) {
  if (days <= 0) return 'text-expense';
  if (days <= SOON_DAYS) return 'text-warning';
  return 'text-ink-muted';
}

/** Per card: what's due from the closed statement and what the statement in progress adds up to. */
export function UpcomingPayments({ cards, unconfiguredCards, coverage }: Props) {
  const formatAmount = useFormatMoney();
  const currentTotal = round2(cards.reduce((sum, c) => sum + c.statement.currentPeriod.total, 0));
  const enough = coverage.balance >= 0;

  return (
    <HomeSection
      title="Pagos de tarjetas"
      action={{ label: 'Ver plan', onPress: () => router.push('/accounts/payments') }}
    >
      {coverage.dueTotal > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/accounts/payments')}
          className={`flex-row items-center gap-3 rounded-card px-4 py-3 active:opacity-80 ${
            enough ? 'bg-income/10' : 'bg-expense-soft'
          }`}
        >
          <View className="flex-1 gap-0.5">
            <Text className="text-sm font-semibold text-ink">
              Por pagar {formatAmount(coverage.dueTotal)}
            </Text>
            <Text className="text-xs tabular-nums text-ink-muted">
              Tienes {formatAmount(coverage.available)} en tus cuentas
            </Text>
          </View>
          <View className="items-end gap-0.5">
            <Text className={`text-xs font-medium ${enough ? 'text-income' : 'text-expense'}`}>
              {enough ? 'Te sobran' : 'Te faltan'}
            </Text>
            <Text
              className={`text-base font-bold tabular-nums ${enough ? 'text-income' : 'text-expense'}`}
            >
              {formatAmount(Math.abs(coverage.balance))}
            </Text>
          </View>
        </Pressable>
      ) : null}
      {cards.length ? (
        <View>
          {cards.map((c, i) => {
            const s = c.statement;
            const pending = !s.isPaid;
            const overdue = pending && s.daysUntilDue < 0;
            return (
              <Pressable
                key={c.accountId}
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: '/accounts/[id]', params: { id: c.accountId } })
                }
                className={`flex-row items-center gap-3 px-4 py-3.5 active:opacity-80 ${groupedRowClass(i, cards.length)}`}
              >
                <View className="flex-1 gap-0.5">
                  <Text numberOfLines={1} className="text-base font-semibold text-ink">
                    {c.name}
                  </Text>
                  {pending ? (
                    <Text
                      numberOfLines={1}
                      className={`text-xs font-medium ${dueColor(s.daysUntilDue)}`}
                    >
                      {dueLabel(s.daysUntilDue)}
                      {Math.abs(s.daysUntilDue) > 1
                        ? `, ${formatDay(s.dueDate).toLowerCase()}`
                        : ''}
                    </Text>
                  ) : (
                    <Text numberOfLines={1} className="text-xs font-medium text-income">
                      {s.statementAmount > 0 ? 'Corte pagado' : 'Sin pago pendiente'}
                    </Text>
                  )}
                  <Text numberOfLines={1} className="text-xs tabular-nums text-ink-muted">
                    Corte en curso: {formatAmount(s.currentPeriod.total, c.currency)}, cierra el{' '}
                    {formatShortDate(s.nextCutDate)}
                  </Text>
                </View>
                <View className="items-end gap-1">
                  {pending ? (
                    <Text className="text-base font-bold tabular-nums text-ink">
                      {formatAmount(s.remainingToPay, c.currency)}
                    </Text>
                  ) : (
                    <>
                      <Text className="text-base font-semibold tabular-nums text-ink-muted">
                        {formatAmount(s.currentPeriod.total, c.currency)}
                      </Text>
                      <Text className="text-xs text-ink-muted">al corte</Text>
                    </>
                  )}
                  {overdue ? (
                    <View className="rounded-full bg-expense-soft px-2 py-0.5">
                      <Text className="text-xs font-semibold text-expense">Vencido</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <HomeCard>
          <Text className="text-base font-semibold text-ink">Estás al corriente</Text>
          <Text className="mt-0.5 text-xs text-ink-muted">
            No tienes pagos pendientes de tus estados de cuenta.
          </Text>
        </HomeCard>
      )}
      {cards.length ? (
        <Text className="text-xs tabular-nums text-ink-muted">
          Tus cortes en curso suman {formatAmount(currentTotal)}
        </Text>
      ) : null}
      {unconfiguredCards > 0 ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/accounts')}>
          <Text className="text-xs text-ink-muted">
            {unconfiguredCards === 1
              ? '1 tarjeta no tiene día de corte y de pago. '
              : `${unconfiguredCards} tarjetas no tienen día de corte y de pago. `}
            <Text className="text-xs font-semibold text-accent-ink">Configurar</Text>
          </Text>
        </Pressable>
      ) : null}
    </HomeSection>
  );
}
