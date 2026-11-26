import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { FormScrollView } from '@/components/form-scroll-view';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Text } from '@/components/ui/text';
import { DateField } from '@/features/transactions/components/date-field';
import { useFormatMoney } from '@/hooks/use-format-money';
import { today } from '@/lib/date';

import {
  contributionSchema,
  type ContributionFormInput,
  type ContributionFormOutput,
} from '../schemas';

type Props = {
  goalName: string;
  /** Still missing, offered as a one-tap amount. */
  remaining: number;
  onSubmit: (values: ContributionFormOutput) => void;
  isSubmitting?: boolean;
  error?: string;
};

const KINDS = [
  { value: 'deposit', label: 'Aportar' },
  { value: 'withdrawal', label: 'Retirar' },
] as const;

export function ContributionForm({ goalName, remaining, onSubmit, isSubmitting, error }: Props) {
  const formatAmount = useFormatMoney();
  const { control, handleSubmit, formState, setValue } = useForm<
    ContributionFormInput,
    unknown,
    ContributionFormOutput
  >({
    resolver: zodResolver(contributionSchema),
    defaultValues: { kind: 'deposit', amount: '', contributedOn: today(), note: '' },
  });

  const kind = useWatch({ control, name: 'kind' });
  const submit = handleSubmit(onSubmit);

  return (
    <Screen>
      <FormScrollView>
        <View className="gap-1">
          <Text className="font-display text-3xl font-bold text-ink">
            {kind === 'deposit' ? 'Aportar' : 'Retirar'}
          </Text>
          <Text numberOfLines={1} className="text-base text-ink-muted">
            {goalName}
          </Text>
        </View>

        <Controller
          control={control}
          name="kind"
          render={({ field: { value, onChange } }) => (
            <View accessibilityRole="radiogroup" className="flex-row rounded-full bg-sunken p-1">
              {KINDS.map((k) => {
                const selected = value === k.value;
                return (
                  <Pressable
                    key={k.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => onChange(k.value)}
                    className={`h-10 flex-1 items-center justify-center rounded-full ${
                      selected ? 'bg-card' : ''
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${selected ? 'text-ink' : 'text-ink-muted'}`}
                    >
                      {k.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        />

        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, onBlur, value } }) => (
            <View className="gap-2">
              <MoneyInput
                label="Cantidad"
                autoFocus
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={formState.errors.amount?.message}
              />
              {kind === 'deposit' && remaining > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  hitSlop={6}
                  onPress={() => setValue('amount', remaining.toFixed(2), { shouldValidate: true })}
                  className="self-start active:opacity-60"
                >
                  <Text className="text-sm font-semibold text-accent-ink">
                    Completar la meta: {formatAmount(remaining)}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="contributedOn"
          render={({ field: { value, onChange } }) => (
            <DateField value={value} onChange={onChange} />
          )}
        />

        <Controller
          control={control}
          name="note"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Nota (opcional)"
              placeholder={kind === 'deposit' ? 'Ej. Aguinaldo' : 'Ej. Boletos de avión'}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              maxLength={120}
              error={formState.errors.note?.message}
            />
          )}
        />

        <Text className="text-xs text-ink-muted">
          Solo registra el avance de la meta; no mueve dinero entre tus cuentas.
        </Text>

        {error ? <Text className="text-sm text-expense">{error}</Text> : null}

        <View className="gap-3">
          <Button
            title={kind === 'deposit' ? 'Aportar' : 'Retirar'}
            loading={isSubmitting}
            onPress={() => submit()}
          />
          <Button title="Cancelar" variant="secondary" onPress={() => router.back()} />
        </View>
      </FormScrollView>
    </Screen>
  );
}
