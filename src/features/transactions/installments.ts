import { installmentAmounts, installmentCuts } from '@/features/accounts/credit-card';
import { monthsBetween, today } from '@/lib/date';

/**
 * Progress of a "meses sin intereses" purchase. With the card's `statementDay`,
 * an installment counts as paid once the statement that bills it has closed.
 * Without it, the first payment is assumed to land in the month after the purchase.
 */
export function installmentProgress(
  amount: number,
  months: number,
  purchasedOn: string,
  statementDay?: number | null,
) {
  const amounts = installmentAmounts(amount, months);
  const now = today();
  const paid = statementDay
    ? installmentCuts(purchasedOn, months, statementDay).filter((cut) => cut <= now).length
    : Math.min(months, Math.max(0, monthsBetween(purchasedOn, now)));
  const billed = amounts.slice(0, paid).reduce((sum, value) => sum + value, 0);
  return {
    monthly: amounts[0],
    paid,
    remainingAmount: Math.max(0, Math.round((amount - billed) * 100) / 100),
    isDone: paid >= months,
  };
}
