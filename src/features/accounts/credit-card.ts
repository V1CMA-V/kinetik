/**
 * Credit-card statement cycle math (pure, no React/Supabase).
 *
 * Conventions:
 * - Dates are local `YYYY-MM-DD` strings, so they compare correctly as strings.
 * - A cut (día de corte) or due day that doesn't exist in a month is clamped to
 *   the month's last day (corte 31 → Feb 28/29).
 * - Charges: expenses and transfers out of the card (disposiciones). Refunds:
 *   income on the card. Payments: transfers into the card.
 * - MSI installment k (1..n) is billed in the statement that closes at the k-th
 *   cut on or after the purchase date.
 */

export type CardTransaction = {
  kind: 'expense' | 'income' | 'transfer';
  account_id: string;
  to_account_id: string | null;
  amount: number;
  occurred_on: string;
  installment_months: number | null;
};

export type CreditCardStatement = {
  /** Cut that closed the last statement (≤ today). */
  lastCutDate: string;
  /** Next cut (> today). */
  nextCutDate: string;
  /** Due date of the statement that closed on `lastCutDate`. */
  dueDate: string;
  /** Negative when the due date already passed. */
  daysUntilDue: number;
  /** "Pago para no generar intereses" of the last closed statement. */
  statementAmount: number;
  paidSinceCut: number;
  remainingToPay: number;
  isPaid: boolean;
  /** Non-MSI charges since the last cut plus MSI installments billed at the next cut. */
  currentPeriodSpending: number;
  /** Unbilled MSI installments (after the last cut). */
  msiPending: number;
  activeMsiPlans: number;
};

const pad = (n: number) => String(n).padStart(2, '0');
const round2 = (n: number) => Math.round(n * 100) / 100;

const lastDayOfMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

/** `day` of the given month (0-based, may overflow into other years), clamped to its last day. */
function clampedDate(year: number, month: number, day: number) {
  const normalized = new Date(year, month, 1);
  const y = normalized.getFullYear();
  const m = normalized.getMonth();
  return `${y}-${pad(m + 1)}-${pad(Math.min(day, lastDayOfMonth(y, m)))}`;
}

const parts = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
};

/** Same day-of-month `n` months after the cut (clamped). Assumes `iso` is a cut date. */
function shiftCut(cut: string, months: number, statementDay: number) {
  const { y, m } = parts(cut);
  return clampedDate(y, m + months, statementDay);
}

/** First cut on or after `iso`. */
export function cutOnOrAfter(iso: string, statementDay: number) {
  const { y, m } = parts(iso);
  const cut = clampedDate(y, m, statementDay);
  return cut >= iso ? cut : clampedDate(y, m + 1, statementDay);
}

/** Last cut on or before `iso`. */
export function cutOnOrBefore(iso: string, statementDay: number) {
  const { y, m } = parts(iso);
  const cut = clampedDate(y, m, statementDay);
  return cut <= iso ? cut : clampedDate(y, m - 1, statementDay);
}

/** First date after the cut whose day-of-month is `paymentDueDay` (clamped). */
export function dueDateForCut(cut: string, paymentDueDay: number) {
  const { y, m } = parts(cut);
  const due = clampedDate(y, m, paymentDueDay);
  return due > cut ? due : clampedDate(y, m + 1, paymentDueDay);
}

/** Whole days from `a` to `b` (b - a), ignoring DST. */
export function daysBetween(a: string, b: string) {
  const pa = parts(a);
  const pb = parts(b);
  return Math.round((Date.UTC(pb.y, pb.m, pb.d) - Date.UTC(pa.y, pa.m, pa.d)) / 86_400_000);
}

/** Splits an MSI purchase in cents; the rounding remainder goes to the last installment. */
export function installmentAmounts(amount: number, months: number) {
  const monthly = round2(amount / months);
  const last = round2(amount - monthly * (months - 1));
  return Array.from({ length: months }, (_, i) => (i === months - 1 ? last : monthly));
}

/** Cut dates at which each installment of an MSI purchase is billed. */
export function installmentCuts(purchasedOn: string, months: number, statementDay: number) {
  const first = cutOnOrAfter(purchasedOn, statementDay);
  return Array.from({ length: months }, (_, i) => shiftCut(first, i, statementDay));
}

/**
 * Statement summary of a credit card. Returns `null` when the card has no
 * configured cycle. `transactions` may include unrelated rows; only those that
 * touch `accountId` are used.
 */
export function computeCardStatement(
  accountId: string,
  cycle: { statementDay: number | null; paymentDueDay: number | null },
  transactions: CardTransaction[],
  today: string,
): CreditCardStatement | null {
  const { statementDay, paymentDueDay } = cycle;
  if (!statementDay || !paymentDueDay) return null;

  const lastCutDate = cutOnOrBefore(today, statementDay);
  const previousCutDate = shiftCut(lastCutDate, -1, statementDay);
  const nextCutDate = shiftCut(lastCutDate, 1, statementDay);
  const dueDate = dueDateForCut(lastCutDate, paymentDueDay);

  let statementAmount = 0;
  let paidSinceCut = 0;
  let currentPeriodSpending = 0;
  let msiPending = 0;
  let activeMsiPlans = 0;

  for (const t of transactions) {
    // Future-dated rows haven't happened yet.
    if (t.occurred_on > today) continue;

    const inLastStatement = t.occurred_on > previousCutDate && t.occurred_on <= lastCutDate;
    const inCurrentPeriod = t.occurred_on > lastCutDate;

    if (t.to_account_id === accountId) {
      // Payment into the card.
      if (inCurrentPeriod) paidSinceCut += t.amount;
      continue;
    }
    if (t.account_id !== accountId) continue;

    if (t.kind === 'expense' && t.installment_months) {
      const cuts = installmentCuts(t.occurred_on, t.installment_months, statementDay);
      const amounts = installmentAmounts(t.amount, t.installment_months);
      let pendingHere = false;
      cuts.forEach((cut, i) => {
        if (cut === lastCutDate) statementAmount += amounts[i];
        if (cut === nextCutDate) currentPeriodSpending += amounts[i];
        if (cut > lastCutDate) {
          msiPending += amounts[i];
          pendingHere = true;
        }
      });
      if (pendingHere) activeMsiPlans += 1;
      continue;
    }

    // Expenses and cash withdrawals/transfers out of the card are charges.
    const sign = t.kind === 'income' ? -1 : 1;
    if (inLastStatement) statementAmount += sign * t.amount;
    if (inCurrentPeriod && sign > 0) currentPeriodSpending += t.amount;
  }

  statementAmount = Math.max(0, round2(statementAmount));
  paidSinceCut = round2(paidSinceCut);
  const remainingToPay = Math.max(0, round2(statementAmount - paidSinceCut));

  return {
    lastCutDate,
    nextCutDate,
    dueDate,
    daysUntilDue: daysBetween(today, dueDate),
    statementAmount,
    paidSinceCut,
    remainingToPay,
    isPaid: remainingToPay === 0,
    currentPeriodSpending: round2(currentPeriodSpending),
    msiPending: round2(msiPending),
    activeMsiPlans,
  };
}
