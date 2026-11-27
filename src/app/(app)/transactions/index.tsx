import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { alert } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/screen';
import { Fab } from '@/components/ui/fab';
import { Icon } from '@/components/ui/icon';
import { MonthSwitcher } from '@/components/ui/month-switcher';
import { usePartner } from '@/features/household/api';
import { ScopeFilter, useScope } from '@/features/household/components/scope-filter';
import { filterByScope } from '@/features/household/scope';
import {
  type Transaction,
  fetchAllTransactions,
  transactionKeys,
  useAllTransactions,
  useDeleteTransaction,
  useMonthTransactions,
} from '@/features/transactions/api';
import { TransactionRow } from '@/features/transactions/components/transaction-row';
import { TransactionSearchBar } from '@/features/transactions/components/transaction-search-bar';
import { exportFileName, transactionsToCsv } from '@/features/transactions/export';
import { activeFilterCount, applyFilters, isFiltering } from '@/features/transactions/filters';
import { shareCsv } from '@/features/transactions/share-csv';
import { useFormatMoney } from '@/hooks/use-format-money';
import { formatDay, formatMonth, monthRange, today } from '@/lib/date';
import { useAuthStore } from '@/stores/auth-store';
import { FILTER_PERIODS, useTransactionFiltersStore } from '@/stores/transaction-filters-store';
import { useThemeColors } from '@/theme/colors';

export default function TransactionsScreen() {
  const formatAmount = useFormatMoney();
  const [month, setMonth] = useState(() => monthRange(today()).start);

  const filters = useTransactionFiltersStore((s) => s.filters);
  const period = useTransactionFiltersStore((s) => s.period);
  const setFilters = useTransactionFiltersStore((s) => s.setFilters);
  const setPeriod = useTransactionFiltersStore((s) => s.setPeriod);
  const resetFilters = useTransactionFiltersStore((s) => s.reset);
  // Typing stays responsive while a long history is filtered.
  const deferredFilters = useDeferredValue(filters);
  const filtering = isFiltering(filters);
  const searchAll = filtering && period === 'all';

  const monthTransactions = useMonthTransactions(month);
  const history = useAllTransactions(searchAll);
  const transactions = searchAll ? history : monthTransactions;
  const remove = useDeleteTransaction();
  const myId = useAuthStore((s) => s.session?.user.id);
  const scope = useScope();

  const { rows, sections, income, expense } = useMemo(() => {
    const rows = applyFilters(filterByScope(transactions.data ?? [], scope), deferredFilters);
    const byDay = new Map<string, Transaction[]>();
    let income = 0;
    let expense = 0;
    for (const t of rows) {
      if (t.kind === 'income') income += t.amount;
      if (t.kind === 'expense') expense += t.amount;
      byDay.set(t.occurred_on, [...(byDay.get(t.occurred_on) ?? []), t]);
    }
    const currentYear = today().slice(0, 4);
    const sections = [...byDay.entries()].map(([day, data]) => ({
      // The whole history spans years: "Lunes, 24 nov 2025".
      title: day.startsWith(currentYear) ? formatDay(day) : `${formatDay(day)} ${day.slice(0, 4)}`,
      data,
    }));
    return { rows, sections, income, expense };
  }, [transactions.data, scope, deferredFilters]);

  const queryClient = useQueryClient();
  const { partner } = usePartner();
  const [exporting, setExporting] = useState(false);

  const runExport = async (label: string, load: () => Promise<Transaction[]>) => {
    setExporting(true);
    try {
      const data = await load();
      if (!data.length) {
        alert('Nada que exportar', 'Todavía no tienes movimientos registrados.');
        return;
      }
      const csv = transactionsToCsv(data, `Cuenta de ${partner?.name ?? 'tu pareja'}`);
      await shareCsv(exportFileName(label), csv);
    } catch (error) {
      alert('No se pudo exportar', error instanceof Error ? error.message : undefined);
    } finally {
      setExporting(false);
    }
  };

  const chooseExport = () => {
    const visibleLabel = searchAll
      ? 'historial-filtrado'
      : `${month.slice(0, 7)}${filtering ? '-filtrado' : ''}`;
    const visible = rows.length
      ? [
          {
            text: `Lo que ves (${rows.length})`,
            onPress: () => runExport(visibleLabel, async () => rows),
          },
        ]
      : [];
    alert(
      'Exportar movimientos',
      'Se crea un archivo CSV que abre Excel, Numbers o Google Sheets. Los gastos van en negativo.',
      [
        ...visible,
        {
          text: 'Todo el historial',
          onPress: () =>
            runExport('historial', () =>
              queryClient.fetchQuery({
                queryKey: transactionKeys.history(),
                queryFn: fetchAllTransactions,
              }),
            ),
        },
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  };

  const confirmDelete = (t: Transaction) => {
    alert('Eliminar movimiento', 'El saldo de las cuentas se ajustará automáticamente.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(t.id) },
    ]);
  };

  const balance = income - expense;

  return (
    <Screen className="pt-6">
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerClassName="pb-24"
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshing={transactions.isRefetching}
        onRefresh={transactions.refetch}
        ListHeaderComponent={
          <View className="mb-2 gap-5">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="font-display text-3xl font-bold text-ink">Movimientos</Text>
              <ExportButton loading={exporting} onPress={chooseExport} />
            </View>

            <View className="flex-row gap-2">
              <ShortcutChip
                label="Suscripciones"
                ios="repeat"
                android="autorenew"
                onPress={() => router.push('/transactions/subscriptions')}
              />
              <ShortcutChip
                label="Presupuestos"
                ios="chart.pie"
                android="pie_chart"
                onPress={() => router.push('/transactions/budgets')}
              />
            </View>

            <TransactionSearchBar
              query={filters.query}
              onChangeQuery={(query) => setFilters({ query })}
              filterCount={activeFilterCount(filters)}
              onPressFilters={() => router.push('/transactions/filters')}
            />

            {filtering ? (
              <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
                {FILTER_PERIODS.map((p) => (
                  <Chip
                    key={p.value}
                    label={p.label}
                    selected={period === p.value}
                    onPress={() => setPeriod(p.value)}
                  />
                ))}
              </View>
            ) : null}

            {searchAll ? null : <MonthSwitcher month={month} onChange={setMonth} />}

            <ScopeFilter />

            <View className="gap-4 rounded-card border border-line bg-card p-4">
              <View className="flex-row">
                <SummaryValue
                  label="Ingresos"
                  value={formatAmount(income)}
                  className="text-income"
                />
                <View className="w-px bg-line" />
                <SummaryValue
                  label="Gastos"
                  value={formatAmount(expense)}
                  className="text-expense"
                  align="end"
                />
              </View>
              <View className="flex-row items-baseline justify-between border-t border-line pt-3">
                <Text className="text-sm font-medium text-ink-muted">
                  {filtering
                    ? `Balance · ${rows.length} ${rows.length === 1 ? 'movimiento' : 'movimientos'}`
                    : 'Balance del mes'}
                </Text>
                <Text
                  className={`font-display text-xl font-bold tabular-nums ${
                    balance < 0 ? 'text-expense' : 'text-ink'
                  }`}
                >
                  {formatAmount(balance)}
                </Text>
              </View>
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text className="mb-2 mt-6 px-1 text-sm font-semibold text-ink-muted">
            {section.title}
          </Text>
        )}
        renderItem={({ item, index, section }) => (
          <TransactionRow
            transaction={item}
            group={{ index, count: section.data.length }}
            onPress={() => router.push({ pathname: '/transactions/[id]', params: { id: item.id } })}
            // Each person deletes only the movements they registered.
            onLongPress={item.user_id === myId ? () => confirmDelete(item) : undefined}
          />
        )}
        ListEmptyComponent={
          transactions.isPending ? (
            <ActivityIndicator className="mt-8" />
          ) : transactions.isError ? (
            <Text className="mt-8 text-center text-expense">{transactions.error.message}</Text>
          ) : filtering ? (
            <View className="mt-8 items-center gap-3">
              <Text className="text-center text-ink-muted">
                Ningún movimiento coincide con tu búsqueda
                {searchAll ? '.' : ` en ${formatMonth(month).toLowerCase()}.`}
              </Text>
              <View className="flex-row gap-2">
                {searchAll ? null : (
                  <Chip
                    label="Buscar en todo el historial"
                    accessibilityRole="button"
                    onPress={() => setPeriod('all')}
                  />
                )}
                <Chip label="Limpiar" accessibilityRole="button" onPress={resetFilters} />
              </View>
            </View>
          ) : (
            <Text className="mt-8 text-center text-ink-muted">
              No hay movimientos en {formatMonth(month).toLowerCase()}. Registra uno con el botón
              Movimiento.
            </Text>
          )
        }
        ListFooterComponent={
          sections.length ? (
            <Text className="mt-4 text-center text-xs text-ink-muted">
              Toca un movimiento para editarlo o mantenlo presionado para eliminarlo.
            </Text>
          ) : undefined
        }
      />
      <Fab label="Movimiento" href="/transactions/new" />
    </Screen>
  );
}

function ExportButton({ loading, onPress }: { loading: boolean; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Exportar movimientos"
      accessibilityState={{ busy: loading, disabled: loading }}
      disabled={loading}
      onPress={onPress}
      className="h-10 w-10 items-center justify-center rounded-full bg-sunken active:opacity-70"
    >
      {loading ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <Icon ios="square.and.arrow.up" android="ios_share" color={colors.ink} size={18} />
      )}
    </Pressable>
  );
}

function SummaryValue({
  label,
  value,
  className,
  align = 'start',
}: {
  label: string;
  value: string;
  className: string;
  align?: 'start' | 'end';
}) {
  return (
    <View className={`flex-1 gap-0.5 ${align === 'end' ? 'items-end' : ''}`}>
      <Text className="text-xs text-ink-muted">{label}</Text>
      <Text className={`text-lg font-bold tabular-nums ${className}`}>{value}</Text>
    </View>
  );
}

function ShortcutChip({
  label,
  ios,
  android,
  onPress,
}: {
  label: string;
  ios: 'repeat' | 'chart.pie';
  android: 'autorenew' | 'pie_chart';
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="h-10 flex-row items-center gap-1.5 rounded-full bg-sunken px-4 active:opacity-70"
    >
      <Icon ios={ios} android={android} color={colors.ink} size={18} />
      <Text className="text-sm font-semibold text-ink">{label}</Text>
    </Pressable>
  );
}
