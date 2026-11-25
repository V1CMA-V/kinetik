import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { useAccounts } from '@/features/accounts/api';
import { useCreditCardStatements } from '@/features/accounts/statements';
import { useBudgetProgress, useMonthSpending } from '@/features/budgets/api';
import { HomeSection } from '@/features/home/components/home-section';
import { MoneySummary } from '@/features/home/components/money-summary';
import { MonthSpendingSection } from '@/features/home/components/month-spending';
import { UpcomingCharges } from '@/features/home/components/upcoming-charges';
import { UpcomingPayments } from '@/features/home/components/upcoming-payments';
import { getDisplayName } from '@/features/profile/api';
import { useSubscriptions } from '@/features/subscriptions/api';
import { useMonthTransactions } from '@/features/transactions/api';
import { TransactionRow } from '@/features/transactions/components/transaction-row';
import { addDays, addMonths, formatMonth, today } from '@/lib/date';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';

/** How far ahead "Próximos cargos" looks for subscriptions. */
const UPCOMING_DAYS = 7;
const RECENT_TRANSACTIONS = 5;

export default function HomeScreen() {
  const user = useAuthStore((s) => s.session?.user);
  const displayName = getDisplayName(user);
  const hideAmounts = useSettingsStore((s) => s.hideAmounts);
  const setHideAmounts = useSettingsStore((s) => s.setHideAmounts);

  const now = today();
  const accounts = useAccounts();
  const statements = useCreditCardStatements();
  const spending = useMonthSpending(now);
  const previousSpending = useMonthSpending(addMonths(now, -1));
  const budget = useBudgetProgress(now);
  const transactions = useMonthTransactions(now);
  const subscriptions = useSubscriptions();

  const cards = useMemo(
    () => (accounts.data ?? []).filter((a) => a.type === 'credit_card'),
    [accounts.data],
  );
  const unconfiguredCards = cards.filter((c) => !c.statement_day || !c.payment_due_day).length;

  const msi = useMemo(() => {
    let pending = 0;
    let plans = 0;
    for (const s of Object.values(statements.statements)) {
      if (!s) continue;
      pending += s.msiPending;
      plans += s.activeMsiPlans;
    }
    return { pending: Math.round(pending * 100) / 100, plans };
  }, [statements.statements]);

  const income = (transactions.data ?? []).reduce(
    (sum, t) => (t.kind === 'income' ? sum + t.amount : sum),
    0,
  );
  const recent = (transactions.data ?? []).slice(0, RECENT_TRANSACTIONS);

  const upcomingSubscriptions = useMemo(() => {
    const limit = addDays(now, UPCOMING_DAYS);
    return (subscriptions.data ?? []).filter((s) => s.is_active && s.next_charge_on <= limit);
  }, [subscriptions.data, now]);

  const isRefetching =
    accounts.isRefetching ||
    spending.isRefetching ||
    transactions.isRefetching ||
    subscriptions.isRefetching;

  const refresh = () => {
    accounts.refetch();
    statements.refetch();
    spending.refetch();
    previousSpending.refetch();
    budget.refetch();
    transactions.refetch();
    subscriptions.refetch();
  };

  const error = accounts.error ?? statements.error ?? spending.error ?? transactions.error;

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="gap-7 pb-10 pt-6"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refresh} />}
      >
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 gap-0.5">
            <Text numberOfLines={1} className="font-display text-3xl font-bold text-ink">
              {displayName ? `Hola, ${displayName}` : 'Hola'}
            </Text>
            <Text className="text-sm text-ink-muted">{formatMonth(now)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hideAmounts ? 'Mostrar montos' : 'Ocultar montos'}
            hitSlop={8}
            onPress={() => setHideAmounts(!hideAmounts)}
            className="h-10 w-10 items-center justify-center rounded-full active:opacity-60"
          >
            <Text className="text-xl">{hideAmounts ? '🙈' : '👁'}</Text>
          </Pressable>
        </View>

        {accounts.isPending ? (
          <ActivityIndicator className="mt-8" />
        ) : error ? (
          <Text className="mt-8 text-center text-expense">{error.message}</Text>
        ) : (
          <>
            <MoneySummary accounts={accounts.data ?? []} />

            {cards.length ? (
              <UpcomingPayments
                payments={statements.upcomingPayments}
                unconfiguredCards={unconfiguredCards}
              />
            ) : null}

            {spending.data ? (
              <MonthSpendingSection
                monthLabel={formatMonth(now).split(' ')[0]}
                spending={spending.data}
                previousTotal={previousSpending.data?.total}
                income={income}
                budget={budget.data?.totals}
              />
            ) : null}

            <UpcomingCharges subscriptions={upcomingSubscriptions} days={UPCOMING_DAYS} msi={msi} />

            <HomeSection
              title="Últimos movimientos"
              action={{ label: 'Ver todos', onPress: () => router.push('/transactions') }}
            >
              {recent.length ? (
                <View className="gap-2">
                  {recent.map((t) => (
                    <TransactionRow
                      key={t.id}
                      transaction={t}
                      onPress={() =>
                        router.push({ pathname: '/transactions/[id]', params: { id: t.id } })
                      }
                    />
                  ))}
                </View>
              ) : (
                <Text className="text-sm text-ink-muted">Aún no hay movimientos este mes.</Text>
              )}
            </HomeSection>

            <Button title="Agregar movimiento" onPress={() => router.push('/transactions/new')} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
