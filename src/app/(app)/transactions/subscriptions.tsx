import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Alert, FlatList, Text, View } from 'react-native';

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
import { formatMoney } from '@/lib/format';

export default function SubscriptionsScreen() {
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
              <Text className="text-3xl font-bold text-neutral-900 dark:text-white">
                Suscripciones
              </Text>
              <Text
                className="text-base font-semibold text-brand-500"
                onPress={() => router.back()}
              >
                Listo
              </Text>
            </View>

            <View className="gap-1 rounded-2xl bg-brand-500 p-5">
              <Text className="text-sm text-brand-50">Pagas al mes</Text>
              <Text className="text-3xl font-bold text-white">{formatMoney(monthly)}</Text>
              <Text className="text-xs text-brand-100">
                {formatMoney(monthly * 12)} al año · trimestrales y anuales prorrateadas
              </Text>
            </View>

            <Button
              title="Agregar suscripción"
              onPress={() => router.push('/transactions/new-subscription')}
            />
          </View>
        }
        renderItem={({ item }) => (
          <SubscriptionCard subscription={item} onLongPress={() => showOptions(item)} />
        )}
        ListEmptyComponent={
          subscriptions.isPending ? (
            <ActivityIndicator className="mt-8" />
          ) : subscriptions.isError ? (
            <Text className="mt-8 text-center text-red-500">{subscriptions.error.message}</Text>
          ) : (
            <Text className="mt-8 text-center text-neutral-500">
              Agrega Spotify, Netflix, Prime… y sus cargos se registrarán solos cada mes, trimestre
              o año.
            </Text>
          )
        }
        ListFooterComponent={
          subscriptions.data?.length ? (
            <Text className="mt-3 text-center text-xs text-neutral-500">
              Mantén presionada una suscripción para pausarla o eliminarla
            </Text>
          ) : undefined
        }
      />
    </Screen>
  );
}
