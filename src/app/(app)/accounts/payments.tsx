import { router } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { Screen } from '@/components/screen';
import { groupedRowClass } from '@/components/ui/grouped';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ACCOUNT_TYPES } from '@/features/accounts/constants';
import type { CoveredPayment, PaymentCoverage } from '@/features/accounts/payment-coverage';
import { usePaymentCoverage } from '@/features/accounts/use-payment-coverage';
import { Section, SwitchRow } from '@/features/profile/components/settings';
import { useFormatMoney } from '@/hooks/use-format-money';
import { formatShortDate } from '@/lib/date';
import { useThemeColors } from '@/theme/colors';

function dueLabel(days: number, dueDate: string) {
  if (days < 0) return `Venció el ${formatShortDate(dueDate)}`;
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  return `Vence el ${formatShortDate(dueDate)}, en ${days} días`;
}

/** "Con tu pago del 30 nov" / "Con tus 2 pagos hasta el 15 dic". */
function paydaysLabel(paydays: string[]) {
  const last = formatShortDate(paydays[paydays.length - 1]);
  return paydays.length === 1
    ? `Con tu pago del ${last}`
    : `Con tus ${paydays.length} pagos hasta el ${last}`;
}

/** Projection to the last due date counting the fixed pay that lands before it. */
function IncomeProjection({ coverage }: { coverage: PaymentCoverage }) {
  const formatAmount = useFormatMoney();
  const { paydaysUntilLastDue: paydays, balanceWithIncome, nextPayday } = coverage;

  if (!paydays.length) {
    return nextPayday ? (
      <Text className="border-t border-surface/15 pt-3 text-xs font-medium text-surface/70">
        Tu siguiente pago llega el {formatShortDate(nextPayday)}, después de tus vencimientos.
      </Text>
    ) : null;
  }

  const enough = balanceWithIncome >= 0;
  const label = `${paydaysLabel(paydays)} te ${enough ? 'sobran' : 'faltan'}`;
  const amount = formatAmount(Math.abs(balanceWithIncome));
  return (
    <View
      accessible
      accessibilityLabel={`${label} ${amount}`}
      className="flex-row items-baseline justify-between gap-3 border-t border-surface/15 pt-3"
    >
      <Text className="flex-1 text-xs font-medium text-surface/70">{label}</Text>
      <Text
        className={`text-base font-bold tabular-nums ${enough ? 'text-surface' : 'text-accent'}`}
      >
        {amount}
      </Text>
    </View>
  );
}

/** Due total vs. available money, with a bar of how much of it is covered. */
function CoverageHero({ coverage, hasIncome }: { coverage: PaymentCoverage; hasIncome: boolean }) {
  const formatAmount = useFormatMoney();
  const { dueTotal, available, balance } = coverage;
  const enough = balance >= 0;
  const ratio = dueTotal > 0 ? Math.min(1, available / dueTotal) : 1;

  return (
    <View className="gap-5 rounded-card bg-ink p-5">
      <View className="gap-1">
        <Text className="text-sm font-medium text-surface/70">Por pagar de tus cortes</Text>
        <Text
          adjustsFontSizeToFit
          numberOfLines={1}
          className="font-display text-4xl font-bold tabular-nums text-surface"
        >
          {formatAmount(dueTotal)}
        </Text>
      </View>

      <View className="gap-3">
        <View
          accessible
          accessibilityLabel={`Tu dinero cubre el ${Math.round(ratio * 100)} por ciento`}
          className="h-2 flex-row gap-1"
        >
          {ratio > 0 ? (
            <View className="h-full rounded-full bg-accent" style={{ flex: ratio }} />
          ) : null}
          {ratio < 1 ? (
            <View className="h-full rounded-full bg-surface/25" style={{ flex: 1 - ratio }} />
          ) : null}
        </View>
        <View className="flex-row justify-between gap-3">
          <View className="gap-0.5">
            <Text className="text-xs font-medium text-surface/70">Tienes para pagar</Text>
            <Text className="text-base font-semibold tabular-nums text-surface">
              {formatAmount(available)}
            </Text>
          </View>
          <View className="items-end gap-0.5">
            <Text className="text-xs font-medium text-surface/70">
              {dueTotal === 0 ? 'Sin pagos pendientes' : enough ? 'Te sobran' : 'Te faltan'}
            </Text>
            <Text
              className={`text-base font-bold tabular-nums ${enough ? 'text-surface' : 'text-accent'}`}
            >
              {formatAmount(Math.abs(balance))}
            </Text>
          </View>
        </View>
        {hasIncome && dueTotal > 0 ? <IncomeProjection coverage={coverage} /> : null}
      </View>
    </View>
  );
}

/** Hint under a card payment about how your fixed pay changes it. */
function IncomeHint({ payment, paydays }: { payment: CoveredPayment; paydays: string[] }) {
  const formatAmount = useFormatMoney();
  if (payment.covered) return null;
  if (payment.coveringPayday) {
    return (
      <Text numberOfLines={1} className="text-xs font-medium text-warning">
        Lo cubres con tu pago del {formatShortDate(payment.coveringPayday)}
      </Text>
    );
  }
  if (payment.incomeBefore > 0) {
    const several = paydays.filter((d) => d < payment.dueDate).length > 1;
    return (
      <Text numberOfLines={1} className="text-xs font-medium tabular-nums text-expense">
        Te faltan {formatAmount(Math.min(payment.amount, -payment.leftAfterWithIncome))} aún con{' '}
        {several ? 'tus pagos' : 'tu pago'}
      </Text>
    );
  }
  return null;
}

export default function PaymentsScreen() {
  const formatAmount = useFormatMoney();
  const colors = useThemeColors();
  const {
    coverage,
    setPaymentFund,
    hasIncome,
    incomeKnown,
    isPending,
    isRefetching,
    error,
    refetch,
  } = usePaymentCoverage();
  const { payments, funds, nextTotal, nextStatements, balanceWithNext, paydaysUntilLastDue } =
    coverage;

  return (
    <Screen className="pt-4">
      <ScrollView
        contentContainerClassName="gap-7 pb-10"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            hitSlop={4}
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full border border-line bg-card active:opacity-70"
            style={{ borderRadius: 22 }}
          >
            <Icon ios="chevron.left" android="chevron_left" color={colors.ink} />
          </Pressable>
          <Text className="font-display text-3xl font-bold text-ink">Pagos del mes</Text>
        </View>

        {isPending ? (
          <ActivityIndicator className="mt-8" />
        ) : error ? (
          <Text className="mt-8 text-center text-expense">{error.message}</Text>
        ) : (
          <>
            <CoverageHero coverage={coverage} hasIncome={hasIncome} />

            {incomeKnown && !hasIncome && payments.length ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Agrega tu ingreso para proyectar con tus quincenas"
                onPress={() => router.push('/profile/income')}
                className="flex-row items-center gap-3 rounded-card border border-line bg-card px-4 py-3.5 active:opacity-80"
              >
                <Icon ios="banknote" android="payments" color={colors['ink-muted']} size={20} />
                <Text className="flex-1 text-sm font-medium text-ink">
                  Agrega tu ingreso para proyectar con tus quincenas
                </Text>
                <Icon
                  ios="chevron.right"
                  android="chevron_right"
                  color={colors['ink-muted']}
                  size={18}
                />
              </Pressable>
            ) : null}

            <View className="gap-3">
              <Text className="text-lg font-bold text-ink">Cortes por pagar</Text>
              {payments.length ? (
                <View>
                  {payments.map((p, i) => (
                    <Pressable
                      key={p.accountId}
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({ pathname: '/accounts/[id]', params: { id: p.accountId } })
                      }
                      className={`flex-row items-center gap-3 px-4 py-3.5 active:opacity-80 ${groupedRowClass(i, payments.length)}`}
                    >
                      <View
                        className={`h-2.5 w-2.5 rounded-full ${p.covered ? 'bg-income' : p.coveredWithIncome ? 'bg-warning' : 'bg-expense'}`}
                      />
                      <View className="flex-1 gap-0.5">
                        <Text numberOfLines={1} className="text-base font-semibold text-ink">
                          {p.name}
                        </Text>
                        <Text
                          numberOfLines={1}
                          className={`text-xs font-medium ${p.daysUntilDue < 0 ? 'text-expense' : 'text-ink-muted'}`}
                        >
                          {dueLabel(p.daysUntilDue, p.dueDate)}
                        </Text>
                        <IncomeHint payment={p} paydays={paydaysUntilLastDue} />
                      </View>
                      <View className="items-end gap-0.5">
                        <Text className="text-base font-bold tabular-nums text-ink">
                          {formatAmount(p.amount)}
                        </Text>
                        <Text
                          className={`text-xs font-medium tabular-nums ${p.covered ? 'text-income' : 'text-expense'}`}
                        >
                          {p.covered
                            ? `Quedan ${formatAmount(p.leftAfter)}`
                            : `Faltan ${formatAmount(Math.min(p.amount, -p.leftAfter))}`}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View className="rounded-card border border-line bg-card p-4">
                  <Text className="text-base font-semibold text-ink">Estás al corriente</Text>
                  <Text className="mt-0.5 text-xs text-ink-muted">
                    Ya pagaste todos tus cortes cerrados.
                  </Text>
                </View>
              )}
              {payments.length ? (
                <Text className="text-xs text-ink-muted">
                  En orden de vencimiento: con tu dinero vas pagando una tarjeta tras otra.
                  {hasIncome
                    ? ' Tu pago solo cuenta si llega antes del día límite, no el mismo día.'
                    : ''}
                </Text>
              ) : null}
            </View>

            {nextTotal > 0 ? (
              <View className="gap-3">
                <Text className="text-lg font-bold text-ink">Cortes en curso</Text>
                <View>
                  {nextStatements.map((n, i) => (
                    <Pressable
                      key={n.accountId}
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({ pathname: '/accounts/[id]', params: { id: n.accountId } })
                      }
                      className={`flex-row items-center gap-3 px-4 py-3.5 active:opacity-80 ${groupedRowClass(i, nextStatements.length)}`}
                    >
                      <View className="flex-1 gap-0.5">
                        <Text numberOfLines={1} className="text-base font-semibold text-ink">
                          {n.name}
                        </Text>
                        <Text numberOfLines={1} className="text-xs font-medium text-ink-muted">
                          Cierra el {formatShortDate(n.cutDate)}, pagas antes del{' '}
                          {formatShortDate(n.dueDate)}
                        </Text>
                      </View>
                      <Text className="text-base font-bold tabular-nums text-ink">
                        {formatAmount(n.amount)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View className="gap-1 rounded-card border border-line bg-card p-4">
                  <View className="flex-row items-baseline justify-between gap-3">
                    <Text className="text-sm text-ink-muted">Total en curso</Text>
                    <Text className="text-base font-semibold tabular-nums text-ink">
                      {formatAmount(nextTotal)}
                    </Text>
                  </View>
                  <View className="flex-row items-baseline justify-between gap-3">
                    <Text className="text-sm text-ink-muted">
                      {balanceWithNext >= 0
                        ? 'Si también los apartas, te sobran'
                        : 'Si también los apartas, te faltan'}
                    </Text>
                    <Text
                      className={`text-base font-bold tabular-nums ${balanceWithNext >= 0 ? 'text-income' : 'text-expense'}`}
                    >
                      {formatAmount(Math.abs(balanceWithNext))}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {funds.length ? (
              <Section title="Con qué pagas">
                {funds.map((f, i) => (
                  <SwitchRow
                    key={f.id}
                    label={f.name}
                    description={`${f.institution ?? ACCOUNT_TYPES[f.type].label} · ${formatAmount(f.balance, f.currency)}`}
                    value={f.included}
                    onValueChange={(included) => setPaymentFund(f.id, included)}
                    last={i === funds.length - 1}
                  />
                ))}
              </Section>
            ) : (
              <Text className="text-sm text-ink-muted">
                Agrega una cuenta de débito o efectivo para ver si te alcanza.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
