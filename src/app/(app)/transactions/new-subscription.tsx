import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { FormScrollView } from '@/components/form-scroll-view';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { useAccounts } from '@/features/accounts/api';
import { useCreateSubscription } from '@/features/subscriptions/api';
import { FREQUENCIES, FREQUENCY_ORDER, POPULAR_SERVICES } from '@/features/subscriptions/constants';
import {
  subscriptionSchema,
  type SubscriptionFormInput,
  type SubscriptionFormOutput,
} from '@/features/subscriptions/schemas';
import { AccountSelect } from '@/features/transactions/components/account-select';
import { DateField } from '@/features/transactions/components/date-field';
import { today } from '@/lib/date';

export default function NewSubscriptionScreen() {
  const accounts = useAccounts();
  const createSubscription = useCreateSubscription();

  const { control, handleSubmit, formState, setValue, getValues } = useForm<
    SubscriptionFormInput,
    unknown,
    SubscriptionFormOutput
  >({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      name: '',
      amount: '',
      frequency: 'monthly',
      accountId: '',
      nextChargeOn: today(),
    },
  });

  const [name, nextChargeOn] = useWatch({ control, name: ['name', 'nextChargeOn'] });
  const accountList = useMemo(() => accounts.data ?? [], [accounts.data]);
  const isPast = nextChargeOn < today();

  // Subscriptions are usually charged to a card; preselect the first credit card.
  useEffect(() => {
    if (!getValues('accountId') && accountList.length) {
      const card = accountList.find((a) => a.type === 'credit_card');
      setValue('accountId', (card ?? accountList[0]).id);
    }
  }, [accountList, getValues, setValue]);

  const onSubmit = handleSubmit((values) =>
    createSubscription.mutate(values, { onSuccess: () => router.back() }),
  );

  if (accounts.isPending) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!accountList.length) {
    return (
      <Screen className="justify-center gap-4">
        <Text className="text-center text-base text-neutral-500">
          Primero agrega la cuenta o tarjeta con la que pagas tus suscripciones.
        </Text>
        <Button title="Agregar cuenta" onPress={() => router.replace('/accounts/new')} />
        <Button title="Cancelar" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <FormScrollView>
        <Text className="text-3xl font-bold text-neutral-900 dark:text-white">
          Nueva suscripción
        </Text>

        <View className="gap-1.5">
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Servicios populares
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2 py-1"
            keyboardShouldPersistTaps="handled"
          >
            {POPULAR_SERVICES.map((service) => (
              <Chip
                key={service}
                label={service}
                selected={name === service}
                onPress={() => setValue('name', service, { shouldValidate: true })}
              />
            ))}
          </ScrollView>
        </View>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Nombre"
              placeholder="Ej. Spotify Familiar"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={formState.errors.name?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Monto por cargo"
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={formState.errors.amount?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="frequency"
          render={({ field: { value, onChange } }) => (
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Frecuencia
              </Text>
              <View className="flex-row rounded-xl bg-neutral-200 p-1 dark:bg-neutral-800">
                {FREQUENCY_ORDER.map((f) => {
                  const selected = f === value;
                  return (
                    <Pressable
                      key={f}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      onPress={() => onChange(f)}
                      className={`flex-1 items-center rounded-lg py-2.5 ${
                        selected ? 'bg-white dark:bg-neutral-950' : ''
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          selected ? 'text-neutral-900 dark:text-white' : 'text-neutral-500'
                        }`}
                      >
                        {FREQUENCIES[f].label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        />

        <Controller
          control={control}
          name="accountId"
          render={({ field: { value, onChange } }) => (
            <AccountSelect
              label="Se cobra en"
              accounts={accountList}
              value={value}
              onChange={onChange}
              error={formState.errors.accountId?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="nextChargeOn"
          render={({ field: { value, onChange } }) => (
            <View className="gap-1">
              <DateField label="Próximo cargo" value={value} onChange={onChange} allowFuture />
              <Text className="text-xs text-neutral-500">
                {isPast
                  ? 'Es una fecha pasada: se registrarán los cargos desde esa fecha hasta hoy.'
                  : 'El gasto se registra solo ese día y luego cada periodo.'}
              </Text>
            </View>
          )}
        />

        {createSubscription.error ? (
          <Text className="text-sm text-red-500">{createSubscription.error.message}</Text>
        ) : null}

        <View className="gap-3">
          <Button
            title="Guardar"
            loading={createSubscription.isPending}
            onPress={() => onSubmit()}
          />
          <Button title="Cancelar" variant="secondary" onPress={() => router.back()} />
        </View>
      </FormScrollView>
    </Screen>
  );
}
