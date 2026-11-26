import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { FormScrollView } from '@/components/form-scroll-view';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Text } from '@/components/ui/text';
import { useAccounts } from '@/features/accounts/api';
import { DateField } from '@/features/transactions/components/date-field';
import { useFormatMoney } from '@/hooks/use-format-money';
import { today } from '@/lib/date';

import { LAST_DAY, monthlyIncome, PAY_FREQUENCIES, PAY_FREQUENCY_ORDER } from '../schedule';
import { incomeSchema, type IncomeFormInput, type IncomeFormOutput } from '../schemas';

/** Common Mexican pay schedules for "quincenal". */
const SEMIMONTHLY_PRESETS = [
  { label: '15 y último', days: ['15', String(LAST_DAY)] },
  { label: '1 y 15', days: ['1', '15'] },
  { label: '10 y 25', days: ['10', '25'] },
] as const;

type Props = {
  defaultValues: IncomeFormInput;
  onSubmit: (values: IncomeFormOutput) => void;
  isSubmitting?: boolean;
  error?: string;
  children?: ReactNode;
};

export function IncomeForm({ defaultValues, onSubmit, isSubmitting, error, children }: Props) {
  const formatAmount = useFormatMoney();
  const accounts = useAccounts();
  const depositOptions = (accounts.data ?? []).filter((a) => a.type !== 'credit_card');

  const { control, handleSubmit, formState, setValue } = useForm<
    IncomeFormInput,
    unknown,
    IncomeFormOutput
  >({
    resolver: zodResolver(incomeSchema),
    defaultValues,
  });

  const [frequency, payAmount, payDay1, payDay2, anchorDate] = useWatch({
    control,
    name: ['frequency', 'payAmount', 'payDay1', 'payDay2', 'anchorDate'],
  });
  const amount = Number(payAmount.replace(/,/g, ''));
  const monthly = amount > 0 ? monthlyIncome({ pay_amount: amount, pay_frequency: frequency }) : 0;
  const byDay = frequency === 'semimonthly' || frequency === 'monthly';

  // Fields that don't apply to a frequency are ignored by the schema; just seed sensible defaults.
  const selectFrequency = (value: IncomeFormInput['frequency']) => {
    setValue('frequency', value);
    if (value === 'semimonthly' && !payDay2) {
      setValue('payDay1', '15');
      setValue('payDay2', String(LAST_DAY));
    } else if (value === 'monthly' && !payDay1) {
      setValue('payDay1', '1');
    } else if ((value === 'weekly' || value === 'biweekly') && !anchorDate) {
      setValue('anchorDate', today());
    }
  };

  return (
    <Screen>
      <FormScrollView>
        <View className="gap-1">
          <Text className="font-display text-3xl font-bold text-ink">Mis ingresos</Text>
          <Text className="text-sm text-ink-muted">
            Opcional. Solo tú lo ves, ni tu pareja del hogar. Con esto Kinetik proyecta tus pagos,
            te avisa cuando te pagan y sugiere presupuestos.
          </Text>
        </View>

        <View className="gap-1.5">
          <Text className="text-sm font-medium text-ink-muted">¿Cada cuánto te pagan?</Text>
          <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
            {PAY_FREQUENCY_ORDER.map((value) => (
              <Chip
                key={value}
                label={PAY_FREQUENCIES[value].label}
                selected={frequency === value}
                onPress={() => selectFrequency(value)}
              />
            ))}
          </View>
          <Text className="text-xs text-ink-muted">{PAY_FREQUENCIES[frequency].description}</Text>
        </View>

        <Controller
          control={control}
          name="payAmount"
          render={({ field: { onChange, onBlur, value } }) => (
            <View className="gap-1">
              <MoneyInput
                label="¿Cuánto te llega cada pago? (neto)"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={formState.errors.payAmount?.message}
              />
              {monthly > 0 ? (
                <Text className="text-xs text-ink-muted">≈ {formatAmount(monthly)} al mes</Text>
              ) : null}
            </View>
          )}
        />

        {frequency === 'semimonthly' ? (
          <View className="gap-1.5">
            <Text className="text-sm font-medium text-ink-muted">Días de pago</Text>
            <View className="flex-row flex-wrap gap-2">
              {SEMIMONTHLY_PRESETS.map((preset) => (
                <Chip
                  key={preset.label}
                  label={preset.label}
                  selected={payDay1 === preset.days[0] && payDay2 === preset.days[1]}
                  onPress={() => {
                    setValue('payDay1', preset.days[0], { shouldValidate: true });
                    setValue('payDay2', preset.days[1], { shouldValidate: true });
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}

        {byDay ? (
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Controller
                control={control}
                name="payDay1"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={frequency === 'monthly' ? 'Día de pago' : 'Primer día'}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={formState.errors.payDay1?.message}
                  />
                )}
              />
            </View>
            {frequency === 'semimonthly' ? (
              <View className="flex-1">
                <Controller
                  control={control}
                  name="payDay2"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Segundo día"
                      keyboardType="number-pad"
                      maxLength={2}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={formState.errors.payDay2?.message}
                    />
                  )}
                />
              </View>
            ) : null}
          </View>
        ) : (
          <Controller
            control={control}
            name="anchorDate"
            render={({ field: { onChange, value } }) => (
              <View className="gap-1">
                <DateField
                  label="Un día en que te pagaron o te van a pagar"
                  value={value}
                  onChange={onChange}
                  allowFuture
                />
                {formState.errors.anchorDate ? (
                  <Text className="text-sm text-expense">
                    {formState.errors.anchorDate.message}
                  </Text>
                ) : null}
              </View>
            )}
          />
        )}
        {byDay ? (
          <Text className="-mt-3 text-xs text-ink-muted">Usa 31 para el último día del mes.</Text>
        ) : null}

        {depositOptions.length ? (
          <Controller
            control={control}
            name="depositAccountId"
            render={({ field: { onChange, value } }) => (
              <View className="gap-1.5">
                <Text className="text-sm font-medium text-ink-muted">
                  ¿En qué cuenta te depositan? (opcional)
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {depositOptions.map((account) => (
                    <Chip
                      key={account.id}
                      label={account.name}
                      selected={value === account.id}
                      onPress={() => onChange(value === account.id ? '' : account.id)}
                    />
                  ))}
                </View>
                {depositOptions.find((a) => a.id === value)?.household_id ? (
                  <Text className="text-xs text-warning">
                    Es una cuenta compartida: tu pareja verá los ingresos que registres en ella.
                  </Text>
                ) : null}
              </View>
            )}
          />
        ) : null}

        <Controller
          control={control}
          name="variableMonthly"
          render={({ field: { onChange, onBlur, value } }) => (
            <View className="gap-1">
              <MoneyInput
                label="Ingresos extra al mes (opcional)"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={formState.errors.variableMonthly?.message}
              />
              <Text className="text-xs text-ink-muted">
                Freelance, bonos, comisiones… Un promedio. No se cuenta como seguro en tus
                proyecciones.
              </Text>
            </View>
          )}
        />

        {error ? <Text className="text-sm text-expense">{error}</Text> : null}

        <View className="gap-3">
          <Button title="Guardar" loading={isSubmitting} onPress={() => handleSubmit(onSubmit)()} />
          <Button title="Cancelar" variant="secondary" onPress={() => router.back()} />
        </View>

        {children}
      </FormScrollView>
    </Screen>
  );
}

/** Destructive text button under the form. */
export function RemoveIncomeButton({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      className="items-center py-2 active:opacity-70"
    >
      <Text className="text-base font-semibold text-expense">Borrar mis datos de ingreso</Text>
    </Pressable>
  );
}
