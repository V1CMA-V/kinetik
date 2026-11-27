/**
 * Net worth now and at past dates (pure, no React/Supabase).
 *
 * Past balances are rebuilt from today's: every movement dated after a point is
 * undone with the same rule as the `apply_transaction_to_balances` trigger. Only
 * the accounts passed in count, so archived accounts (and their movements) are
 * left out like they are from "Saldo total".
 */
import type { Enums } from '@/types/database';

type NetWorthAccount = { type: Enums<'account_type'>; balance: number };

export type NetWorthSummary = {
  /** Money you have: bank, cash and investments. */
  available: number;
  /** What you owe on credit cards (a card paid in excess doesn't add to `available`). */
  debt: number;
  net: number;
};

const round = (n: number) => Math.round(n * 100) / 100;

export function summarizeNetWorth(accounts: NetWorthAccount[]): NetWorthSummary {
  let available = 0;
  let debt = 0;
  for (const account of accounts) {
    if (account.type === 'credit_card') debt += Math.max(0, -account.balance);
    else available += account.balance;
  }
  return { available: round(available), debt: round(debt), net: round(available - debt) };
}

export type BalanceMovement = {
  kind: Enums<'transaction_kind'>;
  amount: number;
  account_id: string;
  to_account_id: string | null;
  occurred_on: string;
};

/** How much a movement changed the balance of `accountId` (0 if it didn't touch it). */
export function balanceEffect(t: BalanceMovement, accountId: string) {
  let effect = 0;
  if (t.account_id === accountId) effect += t.kind === 'income' ? t.amount : -t.amount;
  if (t.kind === 'transfer' && t.to_account_id === accountId) effect += t.amount;
  return effect;
}

export type NetWorthPoint = NetWorthSummary & { date: string };

/**
 * Net worth at the end of each of `dates` (`YYYY-MM-DD`). `movements` must include
 * every movement dated after the earliest date, future-dated ones too, since
 * today's balances already include them.
 */
export function netWorthAt<A extends NetWorthAccount & { id: string }>(
  accounts: A[],
  movements: BalanceMovement[],
  dates: string[],
): NetWorthPoint[] {
  return dates.map((date) => {
    const later = movements.filter((t) => t.occurred_on > date);
    const balances = accounts.map((account) => ({
      type: account.type,
      balance: later.reduce(
        (balance, t) => balance - balanceEffect(t, account.id),
        account.balance,
      ),
    }));
    return { date, ...summarizeNetWorth(balances) };
  });
}
