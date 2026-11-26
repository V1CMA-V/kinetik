import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, SectionList, View } from 'react-native';

import { alert } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/screen';
import {
  type Subscription,
  useDeleteSubscription,
  useProcessDueSubscriptions,
  useSetSubscriptionActive,
  useSubscriptions,
} from '@/features/subscriptions/api';
import {
  SubscriptionCard,
  nextChargeLabel,
} from '@/features/subscriptions/components/subscription-card';
import { FREQUENCIES } from '@/features/subscriptions/constants';
import { useFormatMoney } from '@/hooks/use-format-money';
import { useThemeColors } from '@/theme/colors';

export default function SubscriptionsScreen() {
  const formatAmount = useFormatMoney();
  const colors = useThemeColors();
  const subscriptions = useSubscriptions();
  const processDue = useProcessDueSubscriptions();
  const setActive = useSetSubscriptionActive();
  const remove = useDeleteSubscription();

  const all = useMemo(() => subscriptions.data ?? [], [subscriptions.data]);

  // Already sorted active-first, then by next charge (see useSubscriptions).
  const { active, paused, monthly } = useMemo(() => {
    const active = all.filter((s) => s.is_active);
    const paused = all.filter((s) => !s.is_active);
    // Monthly-equivalent cost (quarterly / 3, yearly / 12).
    const monthly = active.reduce(
      (sum, s) => sum + s.amount / FREQUENCIES[s.frequency].monthsPerCharge,
      0,
    );
    return { active, paused, monthly };
  }, [all]);

  const sections = useMemo(
    () =>
      [
        { title: 'Activas', data: active },
        { title: 'En pausa', data: paused },
      ].filter((s) => s.data.length),
    [active, paused],
  );

  const next = active[0];

  const showOptions = (s: Subscription) => {
    alert(s.name, undefined, [
      {
        text: s.is_active ? 'Pausar' : 'Reanudar',
        onPress: () => setActive.mutate({ id: s.id, isActive: !s.is_active }),
      },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () =>
          alert(
            'Eliminar suscripción',
            'Los cargos que ya se registraron se quedan en Movimientos.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(s.id) },
            ],
          ),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const refresh = () => {
    processDue.mutate();
    subscriptions.refetch();
  };

  return (
    <Screen className="pt-4">
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerClassName="pb-8"
        stickySectionHeadersEnabled={false}
        refreshing={subscriptions.isRefetching}
        onRefresh={refresh}
        ListHeaderComponent={
          <View className="mb-2 gap-5">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-3">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Volver a movimientos"
                  hitSlop={4}
                  onPress={() => router.back()}
                  className="h-11 w-11 items-center justify-center rounded-full border border-line bg-card active:opacity-70"
                  style={{ borderRadius: 22 }}
                >
                  <Icon ios="chevron.left" android="chevron_left" color={colors.ink} />
                </Pressable>
                <Text className="font-display text-3xl font-bold text-ink">Suscripciones</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Agregar suscripción"
                hitSlop={4}
                onPress={() => router.push('/transactions/new-subscription')}
                className="h-11 w-11 items-center justify-center rounded-full bg-accent active:opacity-80"
                style={{ borderRadius: 22 }}
              >
                <Icon ios="plus" android="add" color={colors['on-accent']} size={24} />
              </Pressable>
            </View>

            {all.length ? (
              <View className="gap-4 rounded-card border border-line bg-card p-5">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1 gap-1">
                    <Text className="text-sm font-medium text-ink-muted">Pagas al mes</Text>
                    <Text
                      adjustsFontSizeToFit
                      numberOfLines={1}
                      className="font-display text-3xl font-bold tabular-nums text-ink"
                    >
                      {formatAmount(monthly)}
                    </Text>
                    <Text className="text-xs text-ink-muted">
                      <Text className="text-xs font-semibold tabular-nums text-ink">
                        {formatAmount(monthly * 12)}
                      </Text>{' '}
                      al año
                    </Text>
                  </View>
                  <View className="rounded-full bg-sunken px-2.5 py-1">
                    <Text className="text-xs font-semibold text-ink">
                      {active.length === 1 ? '1 activa' : `${active.length} activas`}
                    </Text>
                  </View>
                </View>

                {next ? (
                  <View className="flex-row items-center gap-3 border-t border-line pt-4">
                    <View
                      className="h-9 w-9 items-center justify-center rounded-full bg-accent-soft"
                      style={{ borderRadius: 18 }}
                    >
                      <Icon ios="calendar" android="event" color={colors['accent-ink']} size={18} />
                    </View>
                    <View className="flex-1 gap-0.5">
                      <Text className="text-xs text-ink-muted">Próximo cargo</Text>
                      <Text numberOfLines={1} className="text-sm font-semibold text-ink">
                        {next.name} · {nextChargeLabel(next.next_charge_on)}
                      </Text>
                    </View>
                    <Text className="text-sm font-bold tabular-nums text-ink">
                      {formatAmount(next.amount)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View className="mb-2 mt-5 flex-row items-baseline justify-between px-1">
            <Text className="text-lg font-bold text-ink">{section.title}</Text>
            <Text className="text-sm font-semibold text-ink-muted">{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <SubscriptionCard
            subscription={item}
            index={index}
            count={section.data.length}
            onPress={() =>
              router.push({
                pathname: '/transactions/subscription/[id]',
                params: { id: item.id },
              })
            }
            onLongPress={() => showOptions(item)}
          />
        )}
        ListEmptyComponent={
          subscriptions.isPending ? (
            <ActivityIndicator className="mt-8" />
          ) : subscriptions.isError ? (
            <Text className="mt-8 text-center text-expense">{subscriptions.error.message}</Text>
          ) : (
            <View className="mt-6 items-center gap-3 rounded-card border border-line bg-card p-6">
              <View
                className="h-12 w-12 items-center justify-center rounded-full bg-accent-soft"
                style={{ borderRadius: 24 }}
              >
                <Icon ios="repeat" android="autorenew" color={colors['accent-ink']} />
              </View>
              <Text className="text-center text-base font-semibold text-ink">
                Sin suscripciones
              </Text>
              <Text className="text-center text-sm text-ink-muted">
                Agrega Spotify, Netflix, Prime… y sus cargos se registrarán solos cada mes,
                trimestre o año.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          all.length ? (
            <Text className="mt-5 text-center text-xs text-ink-muted">
              Toca para editar · mantén presionada para pausar o eliminar
            </Text>
          ) : undefined
        }
      />
    </Screen>
  );
}
