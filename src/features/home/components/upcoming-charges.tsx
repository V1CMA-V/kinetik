import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { Subscription } from '@/features/subscriptions/api';
import { useFormatMoney } from '@/hooks/use-format-money';
import { formatDay } from '@/lib/date';

import { HomeCard, HomeSection } from './home-section';

type Props = {
  /** Active subscriptions charging soon, soonest first. */
  subscriptions: Subscription[];
  days: number;
  msi: { pending: number; plans: number };
};

export function UpcomingCharges({ subscriptions, days, msi }: Props) {
  const formatAmount = useFormatMoney();
  if (!subscriptions.length && !msi.plans) return null;

  return (
    <HomeSection
      title="Próximos cargos"
      action={{
        label: 'Suscripciones',
        onPress: () => router.push('/transactions/subscriptions'),
      }}
    >
      <HomeCard className="gap-3">
        {subscriptions.length ? (
          subscriptions.map((s) => (
            <Pressable
              key={s.id}
              onPress={() =>
                router.push({ pathname: '/transactions/subscription/[id]', params: { id: s.id } })
              }
              accessibilityRole="button"
              className="flex-row items-center gap-3 active:opacity-80"
            >
              <View className="flex-1 gap-0.5">
                <Text numberOfLines={1} className="text-base font-semibold text-ink">
                  {s.name}
                </Text>
                <Text numberOfLines={1} className="text-xs text-ink-muted">
                  {formatDay(s.next_charge_on)}
                  {s.account ? `, con ${s.account.name}` : ''}
                </Text>
              </View>
              <Text className="text-base font-bold tabular-nums text-ink">
                {formatAmount(s.amount)}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text className="text-sm text-ink-muted">
            Sin suscripciones en los próximos {days} días.
          </Text>
        )}

        {msi.plans > 0 ? (
          <View className="flex-row items-center justify-between gap-3 border-t border-line pt-3">
            <View className="flex-1 gap-0.5">
              <Text className="text-sm font-semibold text-ink">Compras a meses</Text>
              <Text className="text-xs text-ink-muted">
                Por pagar en {msi.plans === 1 ? '1 plan activo' : `${msi.plans} planes activos`}
              </Text>
            </View>
            <Text className="text-base font-bold tabular-nums text-ink">
              {formatAmount(msi.pending)}
            </Text>
          </View>
        ) : null}
      </HomeCard>
    </HomeSection>
  );
}
