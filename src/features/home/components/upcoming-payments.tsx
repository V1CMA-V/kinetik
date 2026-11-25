import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

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
  if (days <= 0) return 'text-red-600 dark:text-red-400';
  if (days <= SOON_DAYS) return 'text-amber-600 dark:text-amber-400';
  return 'text-neutral-500';
}

export function UpcomingPayments({ payments, unconfiguredCards }: Props) {
  const formatAmount = useFormatMoney();
  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <HomeSection
      title="Pagos de tarjetas"
      aside={payments.length ? formatAmount(total) : undefined}
    >
      {payments.length ? (
        <View className="gap-2">
          {payments.map((p) => (
            <Pressable
              key={p.accountId}
              onPress={() =>
                router.push({ pathname: '/accounts/[id]', params: { id: p.accountId } })
              }
              className="active:opacity-80"
            >
              <HomeCard className="flex-row items-center gap-3">
                <View className="flex-1 gap-0.5">
                  <Text
                    numberOfLines={1}
                    className="text-base font-semibold text-neutral-900 dark:text-white"
                  >
                    {[p.institution, p.name].filter(Boolean).join(' · ')}
                  </Text>
                  <Text className={`text-xs font-medium ${dueColor(p.daysUntilDue)}`}>
                    {dueLabel(p.daysUntilDue)}
                    {Math.abs(p.daysUntilDue) > 1 ? ` · ${formatDay(p.dueDate)}` : ''}
                  </Text>
                </View>
                <Text className="text-base font-bold text-neutral-900 dark:text-white">
                  {formatAmount(p.amount, p.currency)}
                </Text>
              </HomeCard>
            </Pressable>
          ))}
        </View>
      ) : (
        <HomeCard>
          <Text className="text-base font-semibold text-neutral-900 dark:text-white">
            Estás al corriente ✅
          </Text>
          <Text className="mt-0.5 text-xs text-neutral-500">
            No tienes pagos pendientes de tus estados de cuenta.
          </Text>
        </HomeCard>
      )}
      {unconfiguredCards > 0 ? (
        <Text className="text-xs text-neutral-500">
          {unconfiguredCards === 1
            ? '1 tarjeta no tiene día de corte y de pago configurados.'
            : `${unconfiguredCards} tarjetas no tienen día de corte y de pago configurados.`}
        </Text>
      ) : null}
    </HomeSection>
  );
}
