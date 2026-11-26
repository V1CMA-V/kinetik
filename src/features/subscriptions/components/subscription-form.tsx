import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { type ReactNode, useEffect, useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { FormScrollView } from '@/components/form-scroll-view';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { type Account, useAccounts } from '@/features/accounts/api';
import { AccountSelect } from '@/features/transactions/components/account-select';
import { DateField } from '@/features/transactions/components/date-field';
import { today } from '@/lib/date';
import { useAuthStore } from '@/stores/auth-store';

import { FREQUENCIES, FREQUENCY_ORDER, POPULAR_SERVICES } from '../constants';
import {
  subscriptionSchema,
  type SubscriptionFormInput,
  type SubscriptionFormOutput,
} from '../schemas';

type Props = {
  title: string;
  defaultValues: SubscriptionFormInput;
  onSubmit: (values: SubscriptionFormOutput) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  error?: string;
  /** Edit mode explains that moving the date restarts the schedule. */
  mode?: 'create' | 'edit';
  /** Extra actions below Guardar/Cancelar (e.g. delete). */
  children?: ReactNode;
};

/** Waits for the accounts so the card preselection runs against the real list. */
export function SubscriptionForm(props: Props) {
  const accounts = useAccounts();
  const myId = useAuthStore((s) => s.session?.user.id);
  // Subscriptions can only be charged to your own accounts, not the ones your partner shares.
  const ownAccounts = useMemo(
    () => accounts.data?.filter((a) => a.user_id === myId),
    [accounts.data, myId],
  );

  if (accounts.isPending) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!ownAccounts?.length) {
    return (
      <Screen className="justify-center gap-4">
        <Text className="text-center text-base text-ink-muted">
          Primero agrega la cuenta o tarjeta con la que pagas tus suscripciones.
        </Text>
        <Button title="Agregar cuenta" onPress={() => router.replace('/accounts/new')} />
        <Button title="Cancelar" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return <SubscriptionFields {...props} accounts={ownAccounts} />;
}

function SubscriptionFields({
  title,
  defaultValues,
  onSubmit,
  submitLabel = 'Guardar',
  isSubmitting,
  error,
  mode = 'create',
  children,
  accounts: accountList,
}: Props & { accounts: Account[] }) {
  const { control, handleSubmit, formState, setValue, getValues } = useForm<
    SubscriptionFormInput,
    unknown,
    SubscriptionFormOutput
  >({
    resolver: zodResolver(subscriptionSchema),
    defaultValues,
  });

  const [name, nextChargeOn] = useWatch({ control, name: ['name', 'nextChargeOn'] });
  const isPast = nextChargeOn < today();
  const dateChanged = nextChargeOn !== defaultValues.nextChargeOn;

  // Subscriptions are usually charged to a card; preselect the first credit card.
  useEffect(() => {
    if (!getValues('accountId') && accountList.length) {
      const card = accountList.find((a) => a.type === 'credit_card');
      setValue('accountId', (card ?? accountList[0]).id);
    }
  }, [accountList, getValues, setValue]);

  const submit = handleSubmit(onSubmit);

  const dateHint =
    mode === 'edit' && !dateChanged
      ? 'Si cambias la fecha, los cargos se reprograman a partir de ese día.'
      : isPast
        ? 'Es una fecha pasada: se registrarán los cargos desde esa fecha hasta hoy.'
        : 'El gasto se registra solo ese día y luego cada periodo.';

  return (
    <Screen>
      <FormScrollView>
        <Text className="font-display text-3xl font-bold text-ink">{title}</Text>

        <View className="gap-1.5">
          <Text className="text-sm font-medium text-ink-muted">Servicios populares</Text>
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
              <Text className="text-sm font-medium text-ink-muted">Frecuencia</Text>
              <View className="flex-row rounded-xl bg-sunken p-1">
                {FREQUENCY_ORDER.map((f) => {
                  const selected = f === value;
                  return (
                    <Pressable
                      key={f}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      onPress={() => onChange(f)}
                      className={`flex-1 items-center rounded-lg py-2.5 ${
                        selected ? 'bg-surface' : ''
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          selected ? 'text-ink' : 'text-ink-muted'
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
              <Text className="text-xs text-ink-muted">{dateHint}</Text>
            </View>
          )}
        />

        {error ? <Text className="text-sm text-expense">{error}</Text> : null}

        <View className="gap-3">
          <Button title={submitLabel} loading={isSubmitting} onPress={() => submit()} />
          <Button title="Cancelar" variant="secondary" onPress={() => router.back()} />
        </View>

        {children}
      </FormScrollView>
    </Screen>
  );
}
