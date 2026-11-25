import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Alert, FlatList, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import {
  type Subscription,
  useDeleteSubscription,
  useProcessDueSubscriptions,
  useSetSubscriptionActive,
  useSubscriptions,
} from '@/features/subscriptions/api';
import { SubscriptionCard } from '@/features/subscriptions/components/subscription-card';
import { FREQUENCIES } from '@/features/subscriptions/constants';
import { useFormatMoney } from '@/hooks/use-format-money';

export default function SubscriptionsScreen() {
  const formatAmount = useFormatMoney();
  const subscriptions = useSubscriptions();
  const processDue = useProcessDueSubscriptions();
  const setActive = useSetSubscriptionActive();
  const remove = useDeleteSubscription();

  // Monthly-equivalent cost of the active ones (quarterly / 3, yearly / 12).
  const monthly = useMemo(
    () =>
      (subscriptions.data ?? [])
        .filter((s) => s.is_active)
        .reduce((sum, s) => sum + s.amount / FREQUENCIES[s.frequency].monthsPerCharge, 0),
    [subscriptions.data],
  );

  const showOptions = (s: Subscription) => {
    Alert.alert(s.name, undefined, [
      {
        text: s.is_active ? 'Pausar' : 'Reanudar',
        onPress: () => setActive.mutate({ id: s.id, isActive: !s.is_active }),
      },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () =>
          Alert.alert(
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
    <Screen className="pt-6">
      <FlatList
        data={subscriptions.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-2 pb-8"
        refreshing={subscriptions.isRefetching}
        onRefresh={refresh}
        ListHeaderComponent={
          <View className="mb-3 gap-5">
            <View className="flex-row items-center justify-between">
              <Text className="font-display text-3xl font-bold text-ink">Suscripciones</Text>
              <Text
                className="text-base font-semibold text-accent-ink"
                onPress={() => router.back()}
              >
                Listo
              </Text>
            </View>

            <View className="gap-1 rounded-card bg-accent p-5">
              <Text className="text-sm text-on-accent-muted">Pagas al mes</Text>
              <Text className="font-display text-3xl font-bold text-on-accent">
                {formatAmount(monthly)}
              </Text>
              <Text className="text-xs text-on-accent-muted">
                {formatAmount(monthly * 12)} al año · trimestrales y anuales prorrateadas
              </Text>
            </View>

            <Button
              title="Agregar suscripción"
              onPress={() => router.push('/transactions/new-subscription')}
            />
          </View>
        }
        renderItem={({ item }) => (
          <SubscriptionCard
            subscription={item}
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
            <Text className="mt-8 text-center text-ink-muted">
              Agrega Spotify, Netflix, Prime… y sus cargos se registrarán solos cada mes, trimestre
              o año.
            </Text>
          )
        }
        ListFooterComponent={
          subscriptions.data?.length ? (
            <Text className="mt-3 text-center text-xs text-ink-muted">
              Toca para editar · mantén presionada para pausar o eliminar
            </Text>
          ) : undefined
        }
      />
    </Screen>
  );
}
