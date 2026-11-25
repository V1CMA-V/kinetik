import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { groupedRowClass } from '@/components/ui/grouped';
import { Text } from '@/components/ui/text';
import type { CardPayment } from '@/features/accounts/statements';
import { useFormatMoney } from '@/hooks/use-format-money';
import { formatDay } from '@/lib/date';

import { HomeCard, HomeSection } from './home-section';

type Props = {
  payments: CardPayment[];
  /** Credit cards without día de corte / día límite de pago. */
  unconfiguredCards: number;
};

/** Cards whose due date is this close (or closer) are highlighted. */
const SOON_DAYS = 5;

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

export function UpcomingPayments({ payments, unconfiguredCards }: Props) {
  const formatAmount = useFormatMoney();
  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <HomeSection
      title="Pagos de tarjetas"
      aside={payments.length > 1 ? `Total ${formatAmount(total)}` : undefined}
    >
      {payments.length ? (
        <View>
          {payments.map((p, i) => {
            const overdue = p.daysUntilDue < 0;
            return (
              <Pressable
                key={p.accountId}
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: '/accounts/[id]', params: { id: p.accountId } })
                }
                className={`flex-row items-center gap-3 px-4 py-3.5 active:opacity-80 ${groupedRowClass(i, payments.length)}`}
              >
                <View className="flex-1 gap-0.5">
                  <Text numberOfLines={1} className="text-base font-semibold text-ink">
                    {p.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className={`text-xs font-medium ${dueColor(p.daysUntilDue)}`}
                  >
                    {dueLabel(p.daysUntilDue)}
                    {Math.abs(p.daysUntilDue) > 1 ? `, ${formatDay(p.dueDate).toLowerCase()}` : ''}
                  </Text>
                  {p.institution ? (
                    <Text numberOfLines={1} className="text-xs text-ink-muted">
                      {p.institution}
                    </Text>
                  ) : null}
                </View>
                <View className="items-end gap-1">
                  <Text className="text-base font-bold tabular-nums text-ink">
                    {formatAmount(p.amount, p.currency)}
                  </Text>
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
