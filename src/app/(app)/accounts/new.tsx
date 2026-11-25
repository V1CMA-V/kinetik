import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Text, View } from 'react-native';

import { FormScrollView } from '@/components/form-scroll-view';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateAccount } from '@/features/accounts/api';
import { AccountTypePicker } from '@/features/accounts/components/account-type-picker';
import { InstitutionPicker } from '@/features/accounts/components/institution-picker';
import { type AccountType, TYPES_WITH_INSTITUTION } from '@/features/accounts/constants';
import {
  accountSchema,
  type AccountFormInput,
  type AccountFormOutput,
} from '@/features/accounts/schemas';

const NAME_PLACEHOLDERS: Record<AccountType, string> = {
  bank_account: 'Ej. Nómina',
  credit_card: 'Ej. Tarjeta Oro',
  cash: 'Ej. Cartera',
  investment: 'Ej. CETES',
};

export default function NewAccountScreen() {
  const { control, handleSubmit, formState } = useForm<
    AccountFormInput,
    unknown,
    AccountFormOutput
  >({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      type: 'bank_account',
      institution: '',
      balance: '',
      creditLimit: '',
    },
  });

  const type = useWatch({ control, name: 'type' });
  const isCredit = type === 'credit_card';
  const hasInstitution = TYPES_WITH_INSTITUTION.includes(type);
  const createAccount = useCreateAccount();

  const onSubmit = handleSubmit((values) =>
    createAccount.mutate(values, { onSuccess: () => router.back() }),
  );

  return (
    <Screen>
      <FormScrollView>
        <Text className="text-3xl font-bold text-neutral-900 dark:text-white">Nueva cuenta</Text>

        <Controller
          control={control}
          name="type"
          render={({ field: { value, onChange } }) => (
            <AccountTypePicker value={value} onChange={onChange} />
          )}
        />

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
            <Input
              label={isCredit ? 'Deuda actual' : 'Saldo actual'}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={formState.errors.balance?.message}
            />
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

        {createAccount.error ? (
          <Text className="text-sm text-red-500">{createAccount.error.message}</Text>
        ) : null}

        <View className="gap-3">
          <Button title="Guardar" loading={createAccount.isPending} onPress={() => onSubmit()} />
          <Button title="Cancelar" variant="secondary" onPress={() => router.back()} />
        </View>
      </FormScrollView>
    </Screen>
  );
}
