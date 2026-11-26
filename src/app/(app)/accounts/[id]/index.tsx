import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { MonthSwitcher } from '@/components/ui/month-switcher';
import { useAccount } from '@/features/accounts/api';
import { ACCOUNT_TYPE_SHORT } from '@/features/accounts/components/account-card';
import { ACCOUNT_TYPE_COLOR } from '@/features/accounts/constants';
import type { CreditCardStatement } from '@/features/accounts/credit-card';
import { useCreditCardStatements } from '@/features/accounts/statements';
import { type Transaction, useAccountTransactions } from '@/features/transactions/api';
import { TransactionRow } from '@/features/transactions/components/transaction-row';
import { SharedBadge } from '@/features/household/components/shared-badge';
import { usePartner } from '@/features/household/api';
import { useFormatMoney } from '@/hooks/use-format-money';
import { useAuthStore } from '@/stores/auth-store';
import { formatDay, formatMonth, formatShortDate, monthRange, today } from '@/lib/date';
import { useThemeColors } from '@/theme/colors';

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const formatAmount = useFormatMoney();
  const colors = useThemeColors();
  const [month, setMonth] = useState(() => monthRange(today()).start);

  const account = useAccount(id);
  const statements = useCreditCardStatements();
  const transactions = useAccountTransactions(id, month);
  const myId = useAuthStore((s) => s.session?.user.id);
  const { partner } = usePartner();

  const isCredit = account.data?.type === 'credit_card';

  // Money in: income and transfers into the account (card payments, for credit cards).
  // Money out: expenses and transfers out of it.
  const { sections, moneyIn, moneyOut } = useMemo(() => {
    const byDay = new Map<string, Transaction[]>();
    let moneyIn = 0;
    let moneyOut = 0;
    for (const t of transactions.data ?? []) {
      if (t.kind === 'income' || (t.kind === 'transfer' && t.to_account_id === id)) {
        moneyIn += t.amount;
      } else {
        moneyOut += t.amount;
      }
      byDay.set(t.occurred_on, [...(byDay.get(t.occurred_on) ?? []), t]);
    }
    const sections = [...byDay.entries()].map(([day, data]) => ({ title: formatDay(day), data }));
    return { sections, moneyIn, moneyOut };
  }, [transactions.data, id]);

  if (account.isPending) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!account.data) {
    return (
      <Screen className="justify-center gap-4">
        <Text className="text-center text-base text-ink-muted">
          {account.error?.message ?? 'No encontramos esta cuenta.'}
        </Text>
        <Button title="Volver" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const current = account.data;
  const isMine = current.user_id === myId;
  const debt = Math.abs(Math.min(current.balance, 0));
  const statement = statements.statements[current.id];
  const maxFlow = Math.max(moneyIn, moneyOut);

  return (
    <Screen className="pt-4">
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerClassName="pb-8"
        stickySectionHeadersEnabled={false}
        refreshing={transactions.isRefetching}
        onRefresh={() => {
          account.refetch();
          statements.refetch();
          transactions.refetch();
        }}
        ListHeaderComponent={
          <View className="mb-2 gap-5">
            <View className="flex-row items-center justify-between gap-3">
              <RoundButton label="Volver a cuentas" onPress={() => router.back()}>
                <Icon ios="chevron.left" android="chevron_left" color={colors.ink} />
              </RoundButton>
              <Text
                numberOfLines={1}
                className="flex-1 text-center text-base font-semibold text-ink"
              >
                {current.name}
              </Text>
              {isMine ? (
                <RoundButton
                  label="Editar cuenta"
                  onPress={() =>
                    router.push({ pathname: '/accounts/[id]/edit', params: { id: current.id } })
                  }
                >
                  <Icon ios="pencil" android="edit" color={colors.ink} size={20} />
                </RoundButton>
              ) : (
                // Keeps the title centered.
                <View className="h-11 w-11" />
              )}
            </View>

            <View className="overflow-hidden rounded-card border border-line bg-card">
              <View className={`h-1.5 ${ACCOUNT_TYPE_COLOR[current.type]}`} />
              <View className="gap-4 p-5">
                <View className="flex-row items-center justify-between gap-3">
                  <Text
                    numberOfLines={1}
                    className="flex-shrink text-xs font-medium text-ink-muted"
                  >
                    {[ACCOUNT_TYPE_SHORT[current.type], current.institution]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                  {current.household_id ? (
                    <SharedBadge owner={isMine ? null : (partner?.name ?? 'tu pareja')} />
                  ) : null}
                  {isCredit && current.statement_day && current.payment_due_day ? (
                    <Text className="text-xs font-medium text-ink-muted">
                      Corte día {current.statement_day}, pago día {current.payment_due_day}
                    </Text>
                  ) : null}
                </View>
                <View className="gap-1">
                  <Text className="text-sm font-medium text-ink-muted">
                    {isCredit ? 'Deuda total' : 'Saldo disponible'}
                  </Text>
                  <Text
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    className="font-display text-4xl font-bold tabular-nums text-ink"
                  >
                    {formatAmount(isCredit ? debt : current.balance, current.currency)}
                  </Text>
                </View>
                {isCredit && current.credit_limit ? (
                  <View className="gap-1.5">
                    <View className="h-2 overflow-hidden rounded-full bg-sunken">
                      <View
                        className="h-full rounded-full bg-accent"
                        style={{
                          width: `${Math.min(100, (debt / current.credit_limit) * 100)}%`,
                        }}
                      />
                    </View>
                    <Text className="text-xs tabular-nums text-ink-muted">
                      Disponible{' '}
                      {formatAmount(Math.max(0, current.credit_limit - debt), current.currency)} de{' '}
                      {formatAmount(current.credit_limit, current.currency)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {isCredit && statement ? (
              <>
                <PaymentStatus statement={statement} currency={current.currency} />
                <CurrentPeriodCard statement={statement} currency={current.currency} />
              </>
            ) : null}

            <View className="flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/transactions/new',
                    params: { kind: 'transfer', accountId: current.id },
                  })
                }
                className="h-12 flex-1 items-center justify-center rounded-full bg-ink active:opacity-80"
              >
                <Text className="text-base font-semibold text-surface">
                  {isCredit ? 'Pagar tarjeta' : 'Transferir'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/transactions/new',
                    params: { kind: 'expense', accountId: current.id },
                  })
                }
                className="h-12 flex-1 items-center justify-center rounded-full border border-ink active:opacity-70"
              >
                <Text className="text-base font-semibold text-ink">Agregar movimiento</Text>
              </Pressable>
            </View>

            <View className="gap-4 rounded-card border border-line bg-card p-4">
              <MonthSwitcher month={month} onChange={setMonth} />
              <FlowBar
                label={isCredit ? 'Pagos' : 'Entradas'}
                value={`+${formatAmount(moneyIn, current.currency)}`}
                ratio={maxFlow ? moneyIn / maxFlow : 0}
                barClassName="bg-ink"
                valueClassName="text-income"
              />
              <FlowBar
                label={isCredit ? 'Cargos' : 'Salidas'}
                value={`-${formatAmount(moneyOut, current.currency)}`}
                ratio={maxFlow ? moneyOut / maxFlow : 0}
                barClassName="bg-accent"
                valueClassName="text-expense"
              />
              <Text className="text-xs text-ink-muted">
                {isCredit
                  ? 'Las compras a meses cuentan completas el día de la compra.'
                  : 'Incluye transferencias de y hacia otras cuentas.'}
              </Text>
            </View>

            {sections.length ? (
              <Text className="-mb-3 mt-1 text-lg font-bold text-ink">Movimientos</Text>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text className="mb-2 mt-5 px-1 text-sm font-semibold text-ink-muted">
            {section.title}
          </Text>
        )}
        renderItem={({ item, index, section }) => (
          <TransactionRow
            transaction={item}
            accountId={current.id}
            group={{ index, count: section.data.length }}
            onPress={() => router.push({ pathname: '/transactions/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          transactions.isPending ? (
            <ActivityIndicator className="mt-8" />
          ) : transactions.isError ? (
            <Text className="mt-8 text-center text-expense">{transactions.error.message}</Text>
          ) : (
            <Text className="mt-8 text-center text-ink-muted">
              Sin movimientos en {formatMonth(month).toLowerCase()}.
            </Text>
          )
        }
      />
    </Screen>
  );
}

function RoundButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-full border border-line bg-card active:opacity-70"
      style={{ borderRadius: 22 }}
    >
      {children}
    </Pressable>
  );
}

function FlowBar({
  label,
  value,
  ratio,
  barClassName,
  valueClassName,
}: {
  label: string;
  value: string;
  ratio: number;
  barClassName: string;
  valueClassName: string;
}) {
  return (
    <View className="gap-1.5">
      <View className="flex-row justify-between">
        <Text className="text-sm text-ink-muted">{label}</Text>
        <Text className={`text-sm font-semibold tabular-nums ${valueClassName}`}>{value}</Text>
      </View>
      <View className="h-2.5 overflow-hidden rounded-full bg-sunken">
        <View
          className={`h-full rounded-full ${barClassName}`}
          style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }}
        />
      </View>
    </View>
  );
}

/** Tones of the payment status banner, from most to least urgent. */
const STATUS_TONE = {
  overdue: { box: 'bg-expense-soft', text: 'text-expense', color: 'expense' },
  soon: { box: 'bg-warning/15', text: 'text-warning', color: 'warning' },
  paid: { box: 'bg-income/15', text: 'text-income', color: 'income' },
  calm: { box: 'bg-sunken', text: 'text-ink', color: 'ink-muted' },
} as const;

/** Credit card: how much to pay for the last statement and by when, colored by urgency. */
function PaymentStatus({
  statement: s,
  currency,
}: {
  statement: CreditCardStatement;
  currency: string;
}) {
  const formatAmount = useFormatMoney();
  const colors = useThemeColors();

  const nothingDue = s.statementAmount === 0;
  const overdue = !s.isPaid && !nothingDue && s.daysUntilDue < 0;
  const soon = !s.isPaid && !nothingDue && !overdue && s.daysUntilDue <= 5;
  const tone = STATUS_TONE[overdue ? 'overdue' : soon ? 'soon' : s.isPaid ? 'paid' : 'calm'];

  const title = nothingDue
    ? 'Sin pago pendiente'
    : s.isPaid
      ? 'Pago del corte cubierto'
      : overdue
        ? 'Pago vencido'
        : 'Pago para no generar intereses';

  const detail = nothingDue
    ? null
    : s.isPaid
      ? `Pagaste el corte del ${formatShortDate(s.lastCutDate)}`
      : overdue
        ? `Venció el ${formatShortDate(s.dueDate)}, hace ${-s.daysUntilDue} ${-s.daysUntilDue === 1 ? 'día' : 'días'}`
        : s.daysUntilDue === 0
          ? 'Vence hoy'
          : `Antes del ${formatShortDate(s.dueDate)}, faltan ${s.daysUntilDue} ${s.daysUntilDue === 1 ? 'día' : 'días'}`;

  const icon = overdue
    ? ({ ios: 'exclamationmark.circle.fill', android: 'error' } as const)
    : s.isPaid || nothingDue
      ? ({ ios: 'checkmark.circle.fill', android: 'check_circle' } as const)
      : ({ ios: 'clock', android: 'schedule' } as const);

  return (
    <View className={`gap-3 rounded-card p-4 ${tone.box}`}>
      <View className="flex-row items-start gap-3">
        <Icon ios={icon.ios} android={icon.android} color={colors[tone.color]} size={22} />
        <View className="flex-1 gap-0.5">
          <Text className={`text-base font-semibold ${tone.text}`}>{title}</Text>
          {detail ? <Text className="text-sm text-ink-muted">{detail}</Text> : null}
        </View>
        {!nothingDue && !s.isPaid ? (
          <Text className={`font-display text-xl font-bold tabular-nums ${tone.text}`}>
            {formatAmount(s.remainingToPay, currency)}
          </Text>
        ) : null}
      </View>
      <View className="gap-0.5 border-t border-line pt-3">
        <Text className="text-xs text-ink-muted">
          Último corte el {formatShortDate(s.lastCutDate)}
        </Text>
        {s.msiPending > 0 ? (
          <Text className="text-xs tabular-nums text-ink-muted">
            Meses sin intereses pendientes: {formatAmount(s.msiPending, currency)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Credit card: what the statement in progress adds up to so far (purchases + MSI installments). */
function CurrentPeriodCard({
  statement: s,
  currency,
}: {
  statement: CreditCardStatement;
  currency: string;
}) {
  const formatAmount = useFormatMoney();
  const p = s.currentPeriod;

  return (
    <View className="gap-3 rounded-card border border-line bg-card p-4">
      <View className="flex-row items-start gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-base font-semibold text-ink">Corte en curso</Text>
          <Text className="text-sm text-ink-muted">
            Cierra el {formatShortDate(s.nextCutDate)}, pagas antes del {formatShortDate(p.dueDate)}
          </Text>
        </View>
        <Text className="font-display text-xl font-bold tabular-nums text-ink">
          {formatAmount(p.total, currency)}
        </Text>
      </View>
      <View className="gap-1.5 border-t border-line pt-3">
        <PeriodRow label="Compras del periodo" value={formatAmount(p.charges, currency)} />
        {p.msiInstallments > 0 ? (
          <PeriodRow
            label={`Mensualidades MSI (${p.msiPlans} ${p.msiPlans === 1 ? 'plan' : 'planes'})`}
            value={formatAmount(p.msiInstallments, currency)}
          />
        ) : null}
        {p.refunds > 0 ? (
          <PeriodRow label="Devoluciones" value={`-${formatAmount(p.refunds, currency)}`} />
        ) : null}
      </View>
    </View>
  );
}

function PeriodRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-3">
      <Text className="flex-shrink text-sm text-ink-muted">{label}</Text>
      <Text className="text-sm font-semibold tabular-nums text-ink">{value}</Text>
    </View>
  );
}
