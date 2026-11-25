import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Text, View } from 'react-native';

import { FormScrollView } from '@/components/form-scroll-view';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { ACCOUNT_TYPES, type AccountType, TYPES_WITH_INSTITUTION } from '../constants';
import { accountSchema, type AccountFormInput, type AccountFormOutput } from '../schemas';
import { AccountTypePicker } from './account-type-picker';
import { InstitutionPicker } from './institution-picker';

const NAME_PLACEHOLDERS: Record<AccountType, string> = {
  bank_account: 'Ej. Nómina',
  credit_card: 'Ej. Tarjeta Oro',
  cash: 'Ej. Cartera',
  investment: 'Ej. CETES',
};

type Props = {
  title: string;
  defaultValues: AccountFormInput;
  onSubmit: (values: AccountFormOutput) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  error?: string;
  /** In edit mode the type is locked: transactions and MSI depend on it. */
  mode?: 'create' | 'edit';
  /** Extra actions below Guardar/Cancelar (e.g. archive). */
  children?: ReactNode;
};

export function AccountForm({
  title,
  defaultValues,
  onSubmit,
  submitLabel = 'Guardar',
  isSubmitting,
  error,
  mode = 'create',
  children,
}: Props) {
  const { control, handleSubmit, formState } = useForm<
    AccountFormInput,
    unknown,
    AccountFormOutput
  >({
    resolver: zodResolver(accountSchema),
    defaultValues,
  });

  const type = useWatch({ control, name: 'type' });
  const isCredit = type === 'credit_card';
  const hasInstitution = TYPES_WITH_INSTITUTION.includes(type);
  const isEdit = mode === 'edit';

  const submit = handleSubmit(onSubmit);

  return (
    <Screen>
      <FormScrollView>
        <Text className="text-3xl font-bold text-neutral-900 dark:text-white">{title}</Text>

        {isEdit ? (
          <View className="gap-1.5">
            <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Tipo</Text>
            <View className="rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
              <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                {ACCOUNT_TYPES[type].label}
              </Text>
              <Text className="text-xs text-neutral-500">
                El tipo no se puede cambiar porque tus movimientos dependen de él.
              </Text>
            </View>
          </View>
        ) : (
          <Controller
            control={control}
            name="type"
            render={({ field: { value, onChange } }) => (
              <AccountTypePicker value={value} onChange={onChange} />
            )}
          />
        )}

        {hasInstitution ? (
          <Controller
            control={control}
            name="institution"
            render={({ field: { value, onChange } }) => (
              <InstitutionPicker
                value={value}
                onChange={onChange}
                error={formState.errors.institution?.message}
              />
            )}
          />
        ) : null}

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Nombre"
              placeholder={NAME_PLACEHOLDERS[type]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={formState.errors.name?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="balance"
          render={({ field: { onChange, onBlur, value } }) => (
            <View className="gap-1">
              <Input
                label={isCredit ? 'Deuda actual' : 'Saldo actual'}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={formState.errors.balance?.message}
              />
              {isEdit ? (
                <Text className="text-xs text-neutral-500">
                  Si no coincide con tu banco, corrígelo aquí. Tus movimientos no cambian.
                </Text>
              ) : null}
            </View>
          )}
        />

        {isCredit ? (
          <Controller
            control={control}
            name="creditLimit"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Límite de crédito"
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={formState.errors.creditLimit?.message}
              />
            )}
          />
        ) : null}

        {isCredit ? (
          <View className="gap-1">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="statementDay"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Día de corte"
                      placeholder="Ej. 3"
                      keyboardType="number-pad"
                      maxLength={2}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={formState.errors.statementDay?.message}
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="paymentDueDay"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Día límite de pago"
                      placeholder="Ej. 23"
                      keyboardType="number-pad"
                      maxLength={2}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={formState.errors.paymentDueDay?.message}
                    />
                  )}
                />
              </View>
            </View>
            <Text className="text-xs text-neutral-500">
              Lo encuentras en tu estado de cuenta. Te diremos cuánto pagar y antes de qué fecha.
            </Text>
          </View>
        ) : null}

        {error ? <Text className="text-sm text-red-500">{error}</Text> : null}

        <View className="gap-3">
          <Button title={submitLabel} loading={isSubmitting} onPress={() => submit()} />
          <Button title="Cancelar" variant="secondary" onPress={() => router.back()} />
        </View>

        {children}
      </FormScrollView>
    </Screen>
  );
}
