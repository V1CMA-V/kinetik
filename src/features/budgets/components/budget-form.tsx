import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { FormScrollView } from '@/components/form-scroll-view';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { MoneyInput } from '@/components/ui/money-input';
import { useCategories } from '@/features/categories/api';
import { useIncomeProfile } from '@/features/income/api';
import { monthlyIncome } from '@/features/income/schedule';
import { useFormatMoney } from '@/hooks/use-format-money';
import { finalizeAmountInput } from '@/lib/format';

import { useBudgets } from '../api';
import { budgetSchema, type BudgetFormInput, type BudgetFormOutput } from '../schemas';
import { BUDGET_GROUPS, categoryGroup, suggestBudget } from '../suggestions';
import { useRecentSpending } from '../use-recent-spending';

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

/** Waits for the existing budgets (and custom categories) so create mode only offers free ones. */
export function BudgetForm(props: Props) {
  const budgets = useBudgets();
  const expenseCategories = useCategories('expense');

  if (budgets.isPending || expenseCategories.isLoading) {
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
      : expenseCategories.categories.filter((c) => !taken.has(c));

  // While saving, the refetched budgets already include the new one; don't flash this.
  if (!categories.length && !props.isSubmitting) {
    return (
      <Screen className="justify-center gap-4">
        <Text className="text-center text-base text-ink-muted">
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
  const { control, handleSubmit, formState, setValue } = useForm<
    BudgetFormInput,
    unknown,
    BudgetFormOutput
  >({
    resolver: zodResolver(budgetSchema),
    defaultValues,
  });
  const category = useWatch({ control, name: 'category' });

  const submit = handleSubmit(onSubmit);
  const isEdit = mode === 'edit';

  return (
    <Screen>
      <FormScrollView>
        <Text className="font-display text-3xl font-bold text-ink">{title}</Text>

        <Controller
          control={control}
          name="category"
          render={({ field: { value, onChange } }) => (
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-ink-muted">Categoría</Text>
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
                <Text className="text-sm text-expense">{formState.errors.category.message}</Text>
              ) : isEdit ? (
                <Text className="text-xs text-ink-muted">
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
              <MoneyInput
                label="Límite al mes"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={formState.errors.amount?.message}
              />
              <Text className="text-xs text-ink-muted">
                Se aplica igual cada mes. Las compras a MSI cuentan por mensualidad.
              </Text>
              <SuggestedAmount
                category={category}
                onPick={(amount) =>
                  setValue('amount', finalizeAmountInput(String(amount)), {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
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

type SuggestionProps = { category: string; onPick: (amount: number) => void };

/** "Sugerido: $X" chip from the 50/30/20 rule; only with an income profile. */
function SuggestedAmount({ category, onPick }: SuggestionProps) {
  const { data: profile } = useIncomeProfile();
  const income = profile ? monthlyIncome(profile) : 0;
  // Only then load the spending history behind the suggestion.
  if (!category || !(income > 0)) return null;
  return <SuggestionChip category={category} income={income} onPick={onPick} />;
}

function SuggestionChip({ category, income, onPick }: SuggestionProps & { income: number }) {
  const formatAmount = useFormatMoney();
  const recent = useRecentSpending();
  if (recent.isPending) return null;

  // Without history (or if it failed to load) the pool is split evenly.
  const amount = suggestBudget(category, income, recent.data);
  if (!amount) return null;

  const label = `Sugerido: ${formatAmount(amount)}`;
  const group = BUDGET_GROUPS[categoryGroup(category)].label.toLowerCase();

  return (
    <View className="mt-1 flex-row flex-wrap items-center gap-x-2 gap-y-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Usa este monto como límite"
        hitSlop={4}
        onPress={() => onPick(amount)}
        className="rounded-full bg-accent-soft px-3 py-1.5 active:opacity-70"
      >
        <Text className="text-sm font-semibold tabular-nums text-accent-ink">{label}</Text>
      </Pressable>
      <Text className="text-xs text-ink-muted">según la regla 50/30/20 ({group})</Text>
    </View>
  );
}
