import { monthsBetween, today } from '@/lib/date';

/**
 * Progress of a "meses sin intereses" purchase. The first payment is assumed
 * to land in the month after the purchase (typical statement cycle).
 */
export function installmentProgress(amount: number, months: number, purchasedOn: string) {
  const monthly = Math.round((amount / months) * 100) / 100;
  const paid = Math.min(months, Math.max(0, monthsBetween(purchasedOn, today())));
  return {
    monthly,
    paid,
    remainingAmount: Math.max(0, amount - monthly * paid),
    isDone: paid >= months,
  };
}
