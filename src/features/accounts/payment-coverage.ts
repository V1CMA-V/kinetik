/**
 * Can the money in your accounts cover this month's card payments? (pure, no React/Supabase)
 *
 * - "Due" is what's left to pay of each card's last closed statement (pago para no
 *   generar intereses minus payments since the cut).
 * - "Next" is the estimated statement in progress (closes at the next cut).
 * - Funds are bank, cash or investment accounts; by default bank and cash count,
 *   investments don't. `overrides` turns single accounts on or off.
 * - Only `currency` amounts are added up; other currencies are left out.
 * - Income (optional) is projected conservatively: only the schedule's fixed pay
 *   counts, never variable income. A payday counts toward a card payment only when
 *   `today < payday < dueDate`: pay landing today is assumed to be in the balance
 *   already, and pay landing on the due date itself is NOT counted (it may arrive
 *   too late to make the payment on time).
 */
import { type IncomeSchedule, nextPayday, paydaysBetween } from '@/features/income/schedule';
import { addDays, today as todayISO } from '@/lib/date';

import type { AccountType } from './constants';
import type { CardSummary } from './statements';

export type FundAccount = {
  id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  currency: string;
  balance: number;
};

export type FundOverrides = Record<string, boolean>;

export type CoveredPayment = {
  accountId: string;
  name: string;
  institution: string | null;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
  /** Money still left after paying this card and every card due before it (negative = short). */
  leftAfter: number;
  covered: boolean;
  /** Fixed income landing after today and before this due date (0 without income). */
  incomeBefore: number;
  /** leftAfter + incomeBefore (negative = short even with your pay). */
  leftAfterWithIncome: number;
  coveredWithIncome: boolean;
  /** Earliest payday after which this payment is covered, when today's money alone isn't enough. */
  coveringPayday: string | null;
};

/** A card's statement in progress: what's been charged since the last cut. */
export type NextStatement = {
  accountId: string;
  name: string;
  cutDate: string;
  dueDate: string;
  amount: number;
};

export type FundRow = FundAccount & { included: boolean };

export type PaymentCoverage = {
  /** Pending statements, soonest due first. */
  payments: CoveredPayment[];
  dueTotal: number;
  funds: FundRow[];
  available: number;
  /** available - dueTotal: positive means it's enough. */
  balance: number;
  /** Estimated statements in progress (next cut), every card. */
  nextTotal: number;
  /** Statements in progress with something charged, soonest due first. */
  nextStatements: NextStatement[];
  /** available - dueTotal - nextTotal. */
  balanceWithNext: number;
  /** First payday after today (null without income). */
  nextPayday: string | null;
  /** Paydays after today and before the last due date. */
  paydaysUntilLastDue: string[];
  /** Fixed income of `paydaysUntilLastDue`. */
  incomeUntilLastDue: number;
  /** available + incomeUntilLastDue - dueTotal. */
  balanceWithIncome: number;
};

const FUND_TYPES: AccountType[] = ['bank_account', 'cash', 'investment'];

const round2 = (n: number) => Math.round(n * 100) / 100;

export function isFundIncluded(
  account: Pick<FundAccount, 'id' | 'type'>,
  overrides: FundOverrides,
) {
  return overrides[account.id] ?? account.type !== 'investment';
}

export function computePaymentCoverage({
  cards,
  accounts,
  overrides,
  currency,
  income = null,
  today = todayISO(),
}: {
  cards: CardSummary[];
  accounts: FundAccount[];
  overrides: FundOverrides;
  currency: string;
  /** Fixed pay schedule to project with; null/omitted = only today's money. */
  income?: IncomeSchedule | null;
  /** `YYYY-MM-DD`; defaults to the device's date. */
  today?: string;
}): PaymentCoverage {
  const funds: FundRow[] = accounts
    .filter((a) => FUND_TYPES.includes(a.type) && a.currency === currency)
    .map((a) => ({ ...a, included: isFundIncluded(a, overrides) }));
  // An overdrawn account doesn't take money away from the others.
  const available = round2(
    funds.reduce((sum, f) => (f.included ? sum + Math.max(0, f.balance) : sum), 0),
  );

  const sameCurrency = cards.filter((c) => c.currency === currency);
  const pending = sameCurrency
    .filter((c) => !c.statement.isPaid)
    .map((c) => ({
      accountId: c.accountId,
      name: c.name,
      institution: c.institution,
      amount: c.statement.remainingToPay,
      dueDate: c.statement.dueDate,
      daysUntilDue: c.statement.daysUntilDue,
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || b.amount - a.amount);

  // Strictly after today and strictly before the last due date (see header).
  const lastDue = pending.at(-1)?.dueDate;
  const payAmount = income && income.pay_amount > 0 ? income.pay_amount : 0;
  const paydays =
    income && payAmount && lastDue
      ? paydaysBetween(income, addDays(today, 1), addDays(lastDue, -1))
      : [];

  let left = available;
  const payments: CoveredPayment[] = pending.map((p) => {
    left = round2(left - p.amount);
    const before = paydays.filter((d) => d < p.dueDate);
    const incomeBefore = round2(before.length * payAmount);
    const leftAfterWithIncome = round2(left + incomeBefore);
    const covered = left >= 0;
    const coveredWithIncome = leftAfterWithIncome >= 0;
    const coveringPayday =
      !covered && coveredWithIncome
        ? (before.find((_, i) => round2(left + (i + 1) * payAmount) >= 0) ?? null)
        : null;
    return {
      ...p,
      leftAfter: left,
      covered,
      incomeBefore,
      leftAfterWithIncome,
      coveredWithIncome,
      coveringPayday,
    };
  });

  const dueTotal = round2(payments.reduce((sum, p) => sum + p.amount, 0));
  const nextTotal = round2(
    sameCurrency.reduce((sum, c) => sum + c.statement.currentPeriod.total, 0),
  );
  const nextStatements: NextStatement[] = sameCurrency
    .filter((c) => c.statement.currentPeriod.total > 0)
    .map((c) => ({
      accountId: c.accountId,
      name: c.name,
      cutDate: c.statement.nextCutDate,
      dueDate: c.statement.currentPeriod.dueDate,
      amount: c.statement.currentPeriod.total,
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || b.amount - a.amount);
  const incomeUntilLastDue = round2(paydays.length * payAmount);

  return {
    payments,
    dueTotal,
    funds,
    available,
    balance: round2(available - dueTotal),
    nextTotal,
    nextStatements,
    balanceWithNext: round2(available - dueTotal - nextTotal),
    nextPayday: income && payAmount ? nextPayday(income, addDays(today, 1)) : null,
    paydaysUntilLastDue: paydays,
    incomeUntilLastDue,
    balanceWithIncome: round2(available + incomeUntilLastDue - dueTotal),
  };
}
