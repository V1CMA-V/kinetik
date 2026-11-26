import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { addMonths, today } from '@/lib/date';
import { supabase } from '@/lib/supabase';

import { accountKeys, useAccounts } from './api';
import { computeCardStatement, type CreditCardStatement } from './credit-card';

/** MSI plans run up to 24 months, so older purchases can't be billed anymore. */
const HISTORY_MONTHS = 25;

export type CardPayment = {
  accountId: string;
  name: string;
  institution: string | null;
  currency: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
};

export type CardSummary = {
  accountId: string;
  name: string;
  institution: string | null;
  currency: string;
  statement: CreditCardStatement;
};

/**
 * Statement summaries of the active credit cards, keyed by account id. Cards
 * without día de corte / día límite de pago map to `null`. Uses one query for
 * the transactions of every card (charges on it or payments into it).
 */
export function useCreditCardStatements() {
  const accounts = useAccounts();
  const now = today();
  const since = addMonths(now, -HISTORY_MONTHS);

  const cards = useMemo(
    () => (accounts.data ?? []).filter((a) => a.type === 'credit_card'),
    [accounts.data],
  );
  const cardIds = useMemo(() => cards.map((c) => c.id).sort(), [cards]);

  const transactions = useQuery({
    queryKey: accountKeys.cardTransactions(cardIds, since),
    enabled: cardIds.length > 0,
    queryFn: async () => {
      const ids = cardIds.join(',');
      const { data, error } = await supabase
        .from('transactions')
        .select('kind, account_id, to_account_id, amount, occurred_on, installment_months')
        .or(`account_id.in.(${ids}),to_account_id.in.(${ids})`)
        .gte('occurred_on', since);
      if (error) throw error;
      return data;
    },
  });

  const statements = useMemo(() => {
    const byAccount: Record<string, CreditCardStatement | null> = {};
    if (!transactions.data) return byAccount;
    for (const card of cards) {
      byAccount[card.id] = computeCardStatement(
        card.id,
        { statementDay: card.statement_day, paymentDueDay: card.payment_due_day },
        transactions.data,
        now,
      );
    }
    return byAccount;
  }, [cards, transactions.data, now]);

  /** Pending card payments, soonest first (for the Home dashboard). */
  const upcomingPayments = useMemo<CardPayment[]>(
    () =>
      cards
        .flatMap((card) => {
          const s = statements[card.id];
          if (!s || s.isPaid) return [];
          return [
            {
              accountId: card.id,
              name: card.name,
              institution: card.institution,
              currency: card.currency,
              amount: s.remainingToPay,
              dueDate: s.dueDate,
              daysUntilDue: s.daysUntilDue,
            },
          ];
        })
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [cards, statements],
  );

  /** Every configured card with its statement, next payment first (for the Home dashboard). */
  const cardSummaries = useMemo<CardSummary[]>(() => {
    const nextDue = (s: CreditCardStatement) => (s.isPaid ? s.currentPeriod.dueDate : s.dueDate);
    return cards
      .flatMap((card) => {
        const statement = statements[card.id];
        if (!statement) return [];
        return [
          {
            accountId: card.id,
            name: card.name,
            institution: card.institution,
            currency: card.currency,
            statement,
          },
        ];
      })
      .sort((a, b) => nextDue(a.statement).localeCompare(nextDue(b.statement)));
  }, [cards, statements]);

  return {
    statements,
    upcomingPayments,
    cardSummaries,
    isPending: accounts.isPending || (cardIds.length > 0 && transactions.isPending),
    error: accounts.error ?? transactions.error,
    // `refetch` ignores `enabled`, and an empty `in.()` filter is invalid.
    refetch: () => (cardIds.length > 0 ? transactions.refetch() : undefined),
  };
}
