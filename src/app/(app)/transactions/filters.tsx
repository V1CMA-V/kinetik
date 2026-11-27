import { router } from 'expo-router';
import { type ReactNode, useMemo, useState } from 'react';
import { View } from 'react-native';

import { FormScrollView } from '@/components/form-scroll-view';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { MoneyInput } from '@/components/ui/money-input';
import { Text } from '@/components/ui/text';
import { useAccounts } from '@/features/accounts/api';
import { useCategories } from '@/features/categories/api';
import { TRANSACTION_KINDS, TRANSACTION_KIND_ORDER } from '@/features/transactions/constants';
import { activeFilterCount, toggleValue } from '@/features/transactions/filters';
import { finalizeAmountInput } from '@/lib/format';
import { FILTER_PERIODS, useTransactionFiltersStore } from '@/stores/transaction-filters-store';

/** "1,234.50" → 1234.5; empty → null. */
const parseAmount = (text: string) => {
  const value = Number(text.replace(/,/g, ''));
  return text.trim() === '' || Number.isNaN(value) ? null : value;
};

const amountText = (value: number | null) =>
  value === null ? '' : finalizeAmountInput(String(value));

export default function TransactionFiltersScreen() {
  const filters = useTransactionFiltersStore((s) => s.filters);
  const period = useTransactionFiltersStore((s) => s.period);
  const setFilters = useTransactionFiltersStore((s) => s.setFilters);
  const setPeriod = useTransactionFiltersStore((s) => s.setPeriod);
  const clearFilters = useTransactionFiltersStore((s) => s.clearFilters);
  const accounts = useAccounts();
  // Built-ins show right away; custom ones join when loaded.
  const { categories: expenseCategories } = useCategories('expense');
  const { categories: incomeCategories } = useCategories('income');
  // Expense categories first, then the income-only ones ("Otros" appears once). Selected
  // ones that no longer exist (a deleted custom category) stay so they can be unchecked.
  const categories = useMemo(
    () => [...new Set([...expenseCategories, ...incomeCategories, ...filters.categories])],
    [expenseCategories, incomeCategories, filters.categories],
  );

  // Typed text is kept locally so "1,2" isn't reformatted while editing.
  const [min, setMin] = useState(() => amountText(filters.minAmount));
  const [max, setMax] = useState(() => amountText(filters.maxAmount));
  const invalidRange =
    filters.minAmount !== null &&
    filters.maxAmount !== null &&
    filters.minAmount > filters.maxAmount;

  return (
    <Screen>
      <FormScrollView>
        <Text className="font-display text-3xl font-bold text-ink">Filtros</Text>

        <Section title="Buscar en">
          {FILTER_PERIODS.map((p) => (
            <Chip
              key={p.value}
              label={p.label}
              selected={period === p.value}
              onPress={() => setPeriod(p.value)}
            />
          ))}
        </Section>

        <Section title="Tipo" multiple>
          {TRANSACTION_KIND_ORDER.map((kind) => (
            <MultiChip
              key={kind}
              label={TRANSACTION_KINDS[kind].label}
              checked={filters.kinds.includes(kind)}
              onPress={() => setFilters({ kinds: toggleValue(filters.kinds, kind) })}
            />
          ))}
        </Section>

        <Section title="Categoría" multiple>
          {categories.map((category) => (
            <MultiChip
              key={category}
              label={category}
              checked={filters.categories.includes(category)}
              onPress={() => setFilters({ categories: toggleValue(filters.categories, category) })}
            />
          ))}
        </Section>

        {accounts.data?.length ? (
          <Section title="Cuenta" multiple>
            {accounts.data.map((account) => (
              <MultiChip
                key={account.id}
                label={[account.institution, account.name].filter(Boolean).join(' · ')}
                checked={filters.accountIds.includes(account.id)}
                onPress={() =>
                  setFilters({ accountIds: toggleValue(filters.accountIds, account.id) })
                }
              />
            ))}
          </Section>
        ) : null}

        <View className="gap-3">
          <Text className="text-sm font-medium text-ink-muted">Monto</Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <MoneyInput
                label="Desde"
                value={min}
                onChangeText={(text) => {
                  setMin(text);
                  setFilters({ minAmount: parseAmount(text) });
                }}
              />
            </View>
            <View className="flex-1">
              <MoneyInput
                label="Hasta"
                value={max}
                onChangeText={(text) => {
                  setMax(text);
                  setFilters({ maxAmount: parseAmount(text) });
                }}
              />
            </View>
          </View>
          {invalidRange ? (
            <Text className="text-sm text-expense">
              El monto mínimo es mayor que el máximo; no habrá resultados.
            </Text>
          ) : null}
        </View>

        <View className="gap-3">
          <Button title="Ver resultados" onPress={() => router.back()} />
          {activeFilterCount(filters) > 0 ? (
            <Button
              title="Limpiar filtros"
              variant="secondary"
              onPress={() => {
                clearFilters();
                setMin('');
                setMax('');
              }}
            />
          ) : null}
        </View>
      </FormScrollView>
    </Screen>
  );
}

function Section({
  title,
  multiple = false,
  children,
}: {
  title: string;
  multiple?: boolean;
  children: ReactNode;
}) {
  return (
    <View className="gap-3">
      <Text className="text-sm font-medium text-ink-muted">
        {title}
        {multiple ? <Text className="text-xs text-ink-muted"> · puedes elegir varios</Text> : null}
      </Text>
      <View
        accessibilityRole={multiple ? undefined : 'radiogroup'}
        className="flex-row flex-wrap gap-2"
      >
        {children}
      </View>
    </View>
  );
}

function MultiChip({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Chip
      label={label}
      selected={checked}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    />
  );
}
