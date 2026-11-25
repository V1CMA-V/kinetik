import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Text, View } from 'react-native';

import { FormScrollView } from '@/components/form-scroll-view';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { EXPENSE_CATEGORIES } from '@/features/transactions/constants';

import { useBudgets } from '../api';
import { budgetSchema, type BudgetFormInput, type BudgetFormOutput } from '../schemas';

type Props = {
  title: string;
  defaultValues: BudgetFormInput;
  onSubmit: (values: BudgetFormOutput) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  error?: string;
  /** Edit mode locks the category (delete and create another to change it). */
  mode?: 'create' | 'edit';
  /** Extra actions below Guardar/Cancelar (e.g. delete). */
  children?: ReactNode;
};

/** Waits for the existing budgets so create mode only offers free categories. */
export function BudgetForm(props: Props) {
  const budgets = useBudgets();

  if (budgets.isPending) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator />
      </Screen>
    );
  }

  const taken = new Set((budgets.data ?? []).map((b) => b.category));
  const categories =
    props.mode === 'edit'
      ? [props.defaultValues.category]
      : EXPENSE_CATEGORIES.filter((c) => !taken.has(c));

  // While saving, the refetched budgets already include the new one; don't flash this.
  if (!categories.length && !props.isSubmitting) {
    return (
      <Screen className="justify-center gap-4">
        <Text className="text-center text-base text-neutral-500">
          Ya tienes presupuesto en todas las categorías. Toca uno para cambiar su monto.
        </Text>
        <Button title="Volver" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return <BudgetFields {...props} categories={categories} />;
}

function BudgetFields({
  title,
  defaultValues,
  onSubmit,
  submitLabel = 'Guardar',
  isSubmitting,
  error,
  mode = 'create',
  children,
  categories: initialCategories,
}: Props & { categories: string[] }) {
  // Frozen at mount so the chosen chip doesn't vanish when the new budget is refetched.
  const [categories] = useState(initialCategories);
  const { control, handleSubmit, formState } = useForm<BudgetFormInput, unknown, BudgetFormOutput>({
    resolver: zodResolver(budgetSchema),
    defaultValues,
  });

  const submit = handleSubmit(onSubmit);
  const isEdit = mode === 'edit';

  return (
    <Screen>
      <FormScrollView>
        <Text className="text-3xl font-bold text-neutral-900 dark:text-white">{title}</Text>

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
                  <Chip
                    key={c}
                    label={c}
                    selected={value === c}
                    disabled={isEdit}
                    onPress={() => onChange(c)}
                  />
                ))}
              </View>
              {formState.errors.category ? (
                <Text className="text-sm text-red-500">{formState.errors.category.message}</Text>
              ) : isEdit ? (
                <Text className="text-xs text-neutral-500">
                  La categoría no se puede cambiar; elimina este presupuesto y crea otro.
                </Text>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, onBlur, value } }) => (
            <View className="gap-1">
              <Input
                label="Límite al mes"
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={formState.errors.amount?.message}
              />
              <Text className="text-xs text-neutral-500">
                Se aplica igual cada mes. Las compras a MSI cuentan por mensualidad.
              </Text>
            </View>
          )}
        />

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
