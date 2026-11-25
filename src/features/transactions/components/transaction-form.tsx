import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { type ReactNode, useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { FormScrollView } from '@/components/form-scroll-view';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { type Account, useAccounts } from '@/features/accounts/api';
import { useFormatMoney } from '@/hooks/use-format-money';
import { useThemeColors } from '@/theme/colors';

import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  INSTALLMENT_OPTIONS,
  TRANSACTION_KIND_ORDER,
  TRANSACTION_KINDS,
} from '../constants';
import {
  transactionSchema,
  type TransactionFormInput,
  type TransactionFormOutput,
} from '../schemas';
import { AccountSelect } from './account-select';
import { DateField } from './date-field';

type Props = {
  title: string;
  defaultValues: TransactionFormInput;
  onSubmit: (values: TransactionFormOutput) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  error?: string;
  /** Create mode focuses the amount and preselects the first account. */
  mode?: 'create' | 'edit';
  /** Extra actions below Guardar/Cancelar (e.g. delete). */
  children?: ReactNode;
};

/** Waits for the accounts so the form (and its MSI rules) starts with the real account list. */
export function TransactionForm(props: Props) {
  const accounts = useAccounts();

  if (accounts.isPending) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!accounts.data?.length) {
    return (
      <Screen className="justify-center gap-4">
        <Text className="text-center text-base text-ink-muted">
          Primero agrega una cuenta para registrar movimientos.
        </Text>
        <Button title="Agregar cuenta" onPress={() => router.replace('/accounts/new')} />
        <Button title="Cancelar" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return <TransactionFields {...props} accounts={accounts.data} />;
}

function TransactionFields({
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
  const formatAmount = useFormatMoney();
  const colors = useThemeColors();
  const { control, handleSubmit, formState, setValue, getValues } = useForm<
    TransactionFormInput,
    unknown,
    TransactionFormOutput
  >({
    resolver: zodResolver(transactionSchema),
    defaultValues,
  });

  const [kind, accountId, toAccountId, amount, installmentMonths] = useWatch({
    control,
    name: ['kind', 'accountId', 'toAccountId', 'amount', 'installmentMonths'],
  });

  const account = accountList.find((a) => a.id === accountId);
  const toAccount = accountList.find((a) => a.id === toAccountId);
  const canUseInstallments = kind === 'expense' && account?.type === 'credit_card';
  const numericAmount = Number(amount.replace(/,/g, '')) || 0;

  // Preselect the first account when creating.
  useEffect(() => {
    if (!getValues('accountId') && accountList.length) {
      setValue('accountId', accountList[0].id);
    }
  }, [accountList, getValues, setValue]);

  // MSI only applies to credit-card expenses. An unknown (archived) account keeps its MSI as is.
  const loseInstallments =
    kind !== 'expense' || (account !== undefined && account.type !== 'credit_card');
  useEffect(() => {
    if (loseInstallments && installmentMonths !== null) {
      setValue('installmentMonths', null);
    }
  }, [loseInstallments, installmentMonths, setValue]);

  const changeKind = (next: TransactionFormInput['kind']) => {
    if (next === kind) return;
    setValue('kind', next);
    setValue('category', undefined);
    setValue('toAccountId', undefined);
  };

  const submit = handleSubmit(onSubmit);
  const categories = kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <Screen>
      <FormScrollView>
        <Text className="font-display text-3xl font-bold text-ink">{title}</Text>

        {/* Kind */}
        <View className="flex-row rounded-xl bg-sunken p-1">
          {TRANSACTION_KIND_ORDER.map((k) => {
            const selected = k === kind;
            return (
              <Pressable
                key={k}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => changeKind(k)}
                className={`flex-1 items-center rounded-lg py-2.5 ${selected ? 'bg-surface' : ''}`}
              >
                <Text
                  className={`text-sm font-semibold ${selected ? 'text-ink' : 'text-ink-muted'}`}
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
              <Text className="text-sm font-medium text-ink-muted">Cantidad</Text>
              <View className="flex-row items-center">
                <Text className="font-display text-4xl font-bold text-ink-muted">$</Text>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="0.00"
                  placeholderTextColor={colors['ink-muted']}
                  keyboardType="decimal-pad"
                  autoFocus={mode === 'create'}
                  className={`min-w-32 text-center font-display text-5xl font-bold ${
                    kind === 'income' ? 'text-income' : 'text-ink'
                  }`}
                />
              </View>
              {formState.errors.amount ? (
                <Text className="text-sm text-expense">{formState.errors.amount.message}</Text>
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
                  <Text className="text-xs text-ink-muted">
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
              <View className="gap-2 rounded-card border border-line p-4">
                <Text className="text-sm font-medium text-ink-muted">¿Meses sin intereses?</Text>
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
                  <Text className="text-sm text-ink-muted">
                    {value} pagos de{' '}
                    <Text className="font-semibold text-ink">
                      {formatAmount(numericAmount / value)}
                    </Text>
                    . Tu disponible baja {formatAmount(numericAmount)} desde hoy.
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
                <Text className="text-sm font-medium text-ink-muted">Categoría</Text>
                <View className="flex-row flex-wrap gap-2">
                  {categories.map((c) => (
                    <Chip key={c} label={c} selected={value === c} onPress={() => onChange(c)} />
                  ))}
                </View>
                {formState.errors.category ? (
                  <Text className="text-sm text-expense">{formState.errors.category.message}</Text>
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
