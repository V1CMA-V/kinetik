import {
  type CardTransaction,
  computeCardStatement,
  cutOnOrAfter,
  cutOnOrBefore,
  daysBetween,
  dueDateForCut,
  installmentAmounts,
  installmentCuts,
} from '@/features/accounts/credit-card';

const CARD = 'card';
const DEBIT = 'debit';
const CYCLE = { statementDay: 15, paymentDueDay: 5 };
const TODAY = '2026-11-20';

const tx = (overrides: Partial<CardTransaction>): CardTransaction => ({
  kind: 'expense',
  account_id: CARD,
  to_account_id: null,
  amount: 0,
  occurred_on: TODAY,
  installment_months: null,
  ...overrides,
});

const payment = (amount: number, occurred_on: string) =>
  tx({ kind: 'transfer', account_id: DEBIT, to_account_id: CARD, amount, occurred_on });

describe('statement cuts', () => {
  it('clamps a cut day that does not exist in the month', () => {
    expect(cutOnOrAfter('2026-02-10', 31)).toBe('2026-02-28');
    expect(cutOnOrAfter('2028-02-10', 31)).toBe('2028-02-29');
  });

  it('finds the cut on or around a date', () => {
    expect(cutOnOrAfter('2026-11-15', 15)).toBe('2026-11-15');
    expect(cutOnOrAfter('2026-11-16', 15)).toBe('2026-12-15');
    expect(cutOnOrBefore('2026-11-14', 15)).toBe('2026-10-15');
    expect(cutOnOrAfter('2026-12-20', 15)).toBe('2027-01-15');
  });

  it('puts the due date after the cut', () => {
    expect(dueDateForCut('2026-11-15', 5)).toBe('2026-12-05');
    expect(dueDateForCut('2026-11-05', 25)).toBe('2026-11-25');
  });
});

describe('MSI installments', () => {
  it('gives the rounding remainder to the last installment', () => {
    const amounts = installmentAmounts(1000, 3);
    expect(amounts).toEqual([333.33, 333.33, 333.34]);
    expect(amounts.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1000, 2);
  });

  it('bills each installment at a consecutive cut', () => {
    expect(installmentCuts('2026-11-20', 3, 15)).toEqual([
      '2026-12-15',
      '2027-01-15',
      '2027-02-15',
    ]);
  });
});

describe('daysBetween', () => {
  it('counts whole days across months and years', () => {
    expect(daysBetween('2026-11-20', '2026-12-05')).toBe(15);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(daysBetween('2026-12-05', '2026-11-20')).toBe(-15);
  });
});

describe('computeCardStatement', () => {
  it('returns null when the card has no cycle', () => {
    expect(
      computeCardStatement(CARD, { statementDay: null, paymentDueDay: 5 }, [], TODAY),
    ).toBeNull();
    expect(
      computeCardStatement(CARD, { statementDay: 15, paymentDueDay: null }, [], TODAY),
    ).toBeNull();
  });

  it('summarizes the last statement, the current period and MSI plans', () => {
    const s = computeCardStatement(
      CARD,
      CYCLE,
      [
        // Last statement (Oct 16 – Nov 15).
        tx({ amount: 1000, occurred_on: '2026-10-20' }),
        tx({ kind: 'income', amount: 200, occurred_on: '2026-11-01' }),
        // Paid before the last cut: belongs to the previous statement.
        payment(100, '2026-11-10'),
        // Current period (after Nov 15).
        payment(500, '2026-11-17'),
        tx({ kind: 'transfer', to_account_id: DEBIT, amount: 300, occurred_on: '2026-11-18' }),
        tx({ kind: 'income', amount: 50, occurred_on: '2026-11-19' }),
        // MSI 3000 in 3: billed at Oct 15, Nov 15 and Dec 15.
        tx({ amount: 3000, occurred_on: '2026-10-01', installment_months: 3 }),
        // Ignored: future-dated and other accounts.
        tx({ amount: 999, occurred_on: '2026-11-25' }),
        tx({ account_id: DEBIT, amount: 999, occurred_on: '2026-11-01' }),
      ],
      TODAY,
    );

    expect(s).toEqual({
      lastCutDate: '2026-11-15',
      nextCutDate: '2026-12-15',
      dueDate: '2026-12-05',
      daysUntilDue: 15,
      statementAmount: 1800,
      paidSinceCut: 500,
      remainingToPay: 1300,
      isPaid: false,
      currentPeriod: {
        charges: 300,
        refunds: 50,
        msiInstallments: 1000,
        msiPlans: 1,
        total: 1250,
        dueDate: '2027-01-05',
      },
      msiPending: 1000,
      activeMsiPlans: 1,
    });
  });

  it('is paid once the payments cover the statement, even when overpaid', () => {
    const s = computeCardStatement(
      CARD,
      CYCLE,
      [tx({ amount: 800, occurred_on: '2026-11-01' }), payment(1000, '2026-11-16')],
      TODAY,
    );
    expect(s?.remainingToPay).toBe(0);
    expect(s?.isPaid).toBe(true);
  });

  it('never reports a negative statement when refunds exceed charges', () => {
    const s = computeCardStatement(
      CARD,
      CYCLE,
      [tx({ kind: 'income', amount: 500, occurred_on: '2026-11-01' })],
      TODAY,
    );
    expect(s?.statementAmount).toBe(0);
    expect(s?.isPaid).toBe(true);
  });

  it('marks the due date as overdue with negative days', () => {
    const s = computeCardStatement(CARD, CYCLE, [], '2026-12-10');
    expect(s?.dueDate).toBe('2026-12-05');
    expect(s?.daysUntilDue).toBe(-5);
  });
});
