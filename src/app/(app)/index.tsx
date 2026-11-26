import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Screen } from '@/components/screen';
import { PrivacyToggle } from '@/components/ui/privacy-toggle';
import { useAccounts } from '@/features/accounts/api';
import { useCreditCardStatements } from '@/features/accounts/statements';
import { useBudgetProgress, useMonthSpending } from '@/features/budgets/api';
import { BalanceHero } from '@/features/home/components/balance-hero';
import { HomeSection } from '@/features/home/components/home-section';
import { MonthSpendingSection } from '@/features/home/components/month-spending';
import { MyAccounts } from '@/features/home/components/my-accounts';
import { QuickActions } from '@/features/home/components/quick-actions';
import { UpcomingCharges } from '@/features/home/components/upcoming-charges';
import { UpcomingPayments } from '@/features/home/components/upcoming-payments';
import { getDisplayName } from '@/features/profile/api';
import { useSubscriptions } from '@/features/subscriptions/api';
import { useMonthTransactions } from '@/features/transactions/api';
import { TransactionRow } from '@/features/transactions/components/transaction-row';
import { addDays, addMonths, formatMonth, today } from '@/lib/date';
import { useAuthStore } from '@/stores/auth-store';

/** How far ahead "Próximos cargos" looks for subscriptions. */
const UPCOMING_DAYS = 7;
const RECENT_TRANSACTIONS = 5;

function greeting(hour: number) {
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function HomeScreen() {
  const user = useAuthStore((s) => s.session?.user);
  const displayName = getDisplayName(user);

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
  const showPayments = statements.cardSummaries.length > 0 || unconfiguredCards > 0;

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="gap-8 pb-10 pt-6"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refresh} />}
      >
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="text-sm text-ink-muted">{greeting(new Date().getHours())}</Text>
            <Text numberOfLines={1} className="font-display text-3xl font-bold text-ink">
              {displayName ?? 'Hola'}
            </Text>
          </View>
          <PrivacyToggle />
        </View>

        {accounts.isPending ? (
          <ActivityIndicator className="mt-8" />
        ) : error ? (
          <Text className="mt-8 text-center text-expense">{error.message}</Text>
        ) : (
          <>
            <View className="gap-6">
              <BalanceHero accounts={accounts.data ?? []} />
              <QuickActions />
            </View>

            {cards.length && showPayments ? (
              <UpcomingPayments
                cards={statements.cardSummaries}
                unconfiguredCards={unconfiguredCards}
              />
            ) : null}

            <MyAccounts accounts={accounts.data ?? []} />

            {spending.data ? (
              <MonthSpendingSection
                monthLabel={formatMonth(now).split(' ')[0]}
                spending={spending.data}
                previousTotal={previousSpending.data?.total}
                previousMonthLabel={formatMonth(addMonths(now, -1)).split(' ')[0].toLowerCase()}
                income={income}
                budget={budget.data?.totals}
              />
            ) : null}

            <UpcomingCharges subscriptions={upcomingSubscriptions} days={UPCOMING_DAYS} msi={msi} />

            <HomeSection
              title="Movimientos"
              action={{ label: 'Ver todos', onPress: () => router.push('/transactions') }}
            >
              {recent.length ? (
                <View>
                  {recent.map((t, i) => (
                    <TransactionRow
                      key={t.id}
                      transaction={t}
                      group={{ index: i, count: recent.length }}
                      onPress={() =>
                        router.push({ pathname: '/transactions/[id]', params: { id: t.id } })
                      }
                    />
                  ))}
                </View>
              ) : (
                <Text className="text-sm text-ink-muted">
                  Aún no hay movimientos este mes. Registra uno con Gasto o Ingreso.
                </Text>
              )}
            </HomeSection>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
