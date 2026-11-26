/**
 * Can the money in your accounts cover this month's card payments? (pure, no React/Supabase)
 *
 * - "Due" is what's left to pay of each card's last closed statement (pago para no
 *   generar intereses minus payments since the cut).
 * - "Next" is the estimated statement in progress (closes at the next cut).
 * - Funds are bank, cash or investment accounts; by default bank and cash count,
 *   investments don't. `overrides` turns single accounts on or off.
 * - Only `currency` amounts are added up; other currencies are left out.
 */
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
  /** available - dueTotal - nextTotal. */
  balanceWithNext: number;
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
}: {
  cards: CardSummary[];
  accounts: FundAccount[];
  overrides: FundOverrides;
  currency: string;
}): PaymentCoverage {
  const funds: FundRow[] = accounts
    .filter((a) => FUND_TYPES.includes(a.type) && a.currency === currency)
    .map((a) => ({ ...a, included: isFundIncluded(a, overrides) }));
  // An overdrawn account doesn't take money away from the others.
  const available = round2(
    funds.reduce((sum, f) => (f.included ? sum + Math.max(0, f.balance) : sum), 0),
  );

  const sameCurrency = cards.filter((c) => c.currency === currency);
  let left = available;
  const payments: CoveredPayment[] = sameCurrency
    .filter((c) => !c.statement.isPaid)
    .map((c) => ({
      accountId: c.accountId,
      name: c.name,
      institution: c.institution,
      amount: c.statement.remainingToPay,
      dueDate: c.statement.dueDate,
      daysUntilDue: c.statement.daysUntilDue,
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || b.amount - a.amount)
    .map((p) => {
      left = round2(left - p.amount);
      return { ...p, leftAfter: left, covered: left >= 0 };
    });

  const dueTotal = round2(payments.reduce((sum, p) => sum + p.amount, 0));
  const nextTotal = round2(
    sameCurrency.reduce((sum, c) => sum + c.statement.currentPeriod.total, 0),
  );

  return {
    payments,
    dueTotal,
    funds,
    available,
    balance: round2(available - dueTotal),
    nextTotal,
    balanceWithNext: round2(available - dueTotal - nextTotal),
  };
}
