import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Switch, View } from 'react-native';

import { FormScrollView } from '@/components/form-scroll-view';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/theme/colors';

import { goalSchema, type GoalFormInput, type GoalFormOutput } from '../schemas';
import { TargetDateField } from './target-date-field';

/** Quick picks; tapping one fills the name. */
const IDEAS = ['Viaje', 'Enganche', 'Fondo de emergencia', 'Auto', 'Boda', 'Vacaciones'];

type Props = {
  title: string;
  defaultValues: GoalFormInput;
  onSubmit: (values: GoalFormOutput) => void;
  /** Offers the share switch when set. */
  partnerName?: string;
  /** Only the owner can share or unshare a goal. */
  shareLocked?: boolean;
  submitLabel?: string;
  isSubmitting?: boolean;
  error?: string;
  /** Extra actions below Guardar/Cancelar (e.g. delete). */
  children?: ReactNode;
};

export function GoalForm({
  title,
  defaultValues,
  onSubmit,
  partnerName,
  shareLocked,
  submitLabel = 'Guardar',
  isSubmitting,
  error,
  children,
}: Props) {
  const colors = useThemeColors();
  const { control, handleSubmit, formState, setValue } = useForm<
    GoalFormInput,
    unknown,
    GoalFormOutput
  >({
    resolver: zodResolver(goalSchema),
    defaultValues,
  });

  const submit = handleSubmit(onSubmit);

  return (
    <Screen>
      <FormScrollView>
        <Text className="font-display text-3xl font-bold text-ink">{title}</Text>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <View className="gap-2">
              <Input
                label="Nombre"
                placeholder="Ej. Viaje a Japón"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                maxLength={60}
                error={formState.errors.name?.message}
              />
              <View className="flex-row flex-wrap gap-2">
                {IDEAS.map((idea) => (
                  <Chip
                    key={idea}
                    label={idea}
                    selected={value === idea}
                    onPress={() => setValue('name', idea, { shouldValidate: true })}
                  />
                ))}
              </View>
            </View>
          )}
        />

        <Controller
          control={control}
          name="targetAmount"
          render={({ field: { onChange, onBlur, value } }) => (
            <MoneyInput
              label="¿Cuánto quieren juntar?"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={formState.errors.targetAmount?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="targetDate"
          render={({ field: { value, onChange } }) => (
            <TargetDateField value={value} onChange={onChange} />
          )}
        />

        {partnerName ? (
          <Controller
            control={control}
            name="shared"
            render={({ field: { value, onChange } }) => (
              <View className="flex-row items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
                <View className="flex-1 gap-0.5">
                  <Text className="text-base font-semibold text-ink">Meta en pareja</Text>
                  <Text className="text-xs text-ink-muted">
                    {shareLocked
                      ? 'Solo quien creó la meta puede dejar de compartirla.'
                      : `${partnerName} y tú verán el avance y podrán registrar aportaciones.`}
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Meta en pareja"
                  value={value}
                  disabled={shareLocked}
                  onValueChange={onChange}
                  trackColor={{ false: colors.outline, true: colors.accent }}
                  thumbColor={colors.card}
                />
              </View>
            )}
          />
        ) : null}

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
