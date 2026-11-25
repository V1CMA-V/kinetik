import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { FormScrollView } from '@/components/form-scroll-view';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { useAccounts } from '@/features/accounts/api';
import { useCreateTransaction } from '@/features/transactions/api';
import { AccountSelect } from '@/features/transactions/components/account-select';
import { DateField } from '@/features/transactions/components/date-field';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  INSTALLMENT_OPTIONS,
  TRANSACTION_KIND_ORDER,
  TRANSACTION_KINDS,
} from '@/features/transactions/constants';
import {
  transactionSchema,
  type TransactionFormInput,
  type TransactionFormOutput,
} from '@/features/transactions/schemas';
import { today } from '@/lib/date';
import { formatMoney } from '@/lib/format';

export default function NewTransactionScreen() {
  const accounts = useAccounts();
  const createTransaction = useCreateTransaction();

  const { control, handleSubmit, formState, setValue, getValues } = useForm<
    TransactionFormInput,
    unknown,
    TransactionFormOutput
  >({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      kind: 'expense',
      amount: '',
      accountId: '',
      toAccountId: undefined,
      category: undefined,
      description: '',
      occurredOn: today(),
      installmentMonths: null,
    },
  });

  const [kind, accountId, toAccountId, amount, installmentMonths] = useWatch({
    control,
    name: ['kind', 'accountId', 'toAccountId', 'amount', 'installmentMonths'],
  });

  const accountList = useMemo(() => accounts.data ?? [], [accounts.data]);
  const account = accountList.find((a) => a.id === accountId);
  const toAccount = accountList.find((a) => a.id === toAccountId);
  const canUseInstallments = kind === 'expense' && account?.type === 'credit_card';
  const numericAmount = Number(amount.replace(/,/g, '')) || 0;

  // Preselect the first account once accounts load.
  useEffect(() => {
    if (!getValues('accountId') && accountList.length) {
      setValue('accountId', accountList[0].id);
    }
  }, [accountList, getValues, setValue]);

  // MSI only applies to credit-card expenses.
  useEffect(() => {
    if (!canUseInstallments && installmentMonths !== null) {
      setValue('installmentMonths', null);
    }
  }, [canUseInstallments, installmentMonths, setValue]);

  const changeKind = (next: TransactionFormInput['kind']) => {
    setValue('kind', next);
    setValue('category', undefined);
    setValue('toAccountId', undefined);
  };

  const onSubmit = handleSubmit((values) =>
    createTransaction.mutate(values, { onSuccess: () => router.back() }),
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
          Primero agrega una cuenta para registrar movimientos.
        </Text>
        <Button title="Agregar cuenta" onPress={() => router.replace('/accounts/new')} />
        <Button title="Cancelar" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const categories = kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <Screen>
      <FormScrollView>
        <Text className="text-3xl font-bold text-neutral-900 dark:text-white">
          Nuevo movimiento
        </Text>

        {/* Kind */}
        <View className="flex-row rounded-xl bg-neutral-200 p-1 dark:bg-neutral-800">
          {TRANSACTION_KIND_ORDER.map((k) => {
            const selected = k === kind;
            return (
              <Pressable
                key={k}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => changeKind(k)}
                className={`flex-1 items-center rounded-lg py-2.5 ${
                  selected ? 'bg-white dark:bg-neutral-950' : ''
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    selected ? 'text-neutral-900 dark:text-white' : 'text-neutral-500'
                  }`}
                >
                  {TRANSACTION_KINDS[k].label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Amount */}
        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, onBlur, value } }) => (
            <View className="items-center gap-1">
              <Text className="text-sm font-medium text-neutral-500">Cantidad</Text>
              <View className="flex-row items-center">
                <Text className="text-4xl font-bold text-neutral-400">$</Text>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  autoFocus
                  className={`min-w-32 text-center text-5xl font-bold ${
                    kind === 'income' ? 'text-green-600' : 'text-neutral-900 dark:text-white'
                  }`}
                />
              </View>
              {formState.errors.amount ? (
                <Text className="text-sm text-red-500">{formState.errors.amount.message}</Text>
              ) : null}
            </View>
          )}
        />

        {/* Accounts */}
        <Controller
          control={control}
          name="accountId"
          render={({ field: { value, onChange } }) => (
            <AccountSelect
              label={kind === 'transfer' ? 'Desde' : kind === 'income' ? 'Entra a' : 'Pagado con'}
              accounts={accountList}
              value={value}
              onChange={onChange}
              error={formState.errors.accountId?.message}
            />
          )}
        />

        {kind === 'transfer' ? (
          <Controller
            control={control}
            name="toAccountId"
            render={({ field: { value, onChange } }) => (
              <View className="gap-1">
                <AccountSelect
                  label="Hacia"
                  accounts={accountList}
                  excludeId={accountId}
                  value={value}
                  onChange={onChange}
                  error={formState.errors.toAccountId?.message}
                />
                {toAccount?.type === 'credit_card' ? (
                  <Text className="text-xs text-neutral-500">
                    Pago de tarjeta: reduce la deuda de {toAccount.name}.
                  </Text>
                ) : null}
              </View>
            )}
          />
        ) : null}

        {/* MSI */}
        {canUseInstallments ? (
          <Controller
            control={control}
            name="installmentMonths"
            render={({ field: { value, onChange } }) => (
              <View className="gap-2 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
                <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  ¿Meses sin intereses?
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <Chip label="No" selected={value === null} onPress={() => onChange(null)} />
                  {INSTALLMENT_OPTIONS.map((months) => (
                    <Chip
                      key={months}
                      label={`${months} MSI`}
                      selected={value === months}
                      onPress={() => onChange(months)}
                    />
                  ))}
                </View>
                {value && numericAmount > 0 ? (
                  <Text className="text-sm text-neutral-600 dark:text-neutral-400">
                    {value} pagos de{' '}
                    <Text className="font-semibold text-neutral-900 dark:text-white">
                      {formatMoney(numericAmount / value)}
                    </Text>
                    . Tu disponible baja {formatMoney(numericAmount)} desde hoy.
                  </Text>
                ) : null}
              </View>
            )}
          />
        ) : null}

        {/* Category */}
        {kind !== 'transfer' ? (
          <Controller
            control={control}
            name="category"
            render={({ field: { value, onChange } }) => (
              <View className="gap-1.5">
                <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Categoría
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {categories.map((c) => (
                    <Chip key={c} label={c} selected={value === c} onPress={() => onChange(c)} />
                  ))}
                </View>
                {formState.errors.category ? (
                  <Text className="text-sm text-red-500">{formState.errors.category.message}</Text>
                ) : null}
              </View>
            )}
          />
        ) : null}

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Descripción (opcional)"
              placeholder={
                kind === 'income'
                  ? 'Ej. Quincena'
                  : kind === 'transfer'
                    ? 'Ej. Pago tarjeta'
                    : 'Ej. Liverpool'
              }
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={formState.errors.description?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="occurredOn"
          render={({ field: { value, onChange } }) => (
            <DateField value={value} onChange={onChange} />
          )}
        />

        {createTransaction.error ? (
          <Text className="text-sm text-red-500">{createTransaction.error.message}</Text>
        ) : null}

        <View className="gap-3">
          <Button
            title="Guardar"
            loading={createTransaction.isPending}
            onPress={() => onSubmit()}
          />
          <Button title="Cancelar" variant="secondary" onPress={() => router.back()} />
        </View>
      </FormScrollView>
    </Screen>
  );
}
