import {
  type BudgetExpense,
  amountInMonth,
  budgetStatus,
  computeBudgetProgress,
  computeMonthSpending,
} from '@/features/budgets/progress';

const expense = (overrides: Partial<BudgetExpense>): BudgetExpense => ({
  kind: 'expense',
  amount: 0,
  category: 'Comida',
  occurred_on: '2026-11-10',
  installment_months: null,
  account: null,
  ...overrides,
});

const MONTH = '2026-11-10';
const BUDGETS = [
  { id: 'b1', category: 'Comida', amount: 1000 },
  { id: 'b2', category: 'Transporte', amount: 500 },
];
const EXPENSES: BudgetExpense[] = [
  expense({ amount: 300, occurred_on: '2026-11-05' }),
  expense({ amount: 600, occurred_on: '2026-11-20' }),
  expense({ category: 'Transporte', amount: 600, occurred_on: '2026-11-02' }),
  // Never counted: income and spending outside the month.
  expense({ kind: 'income', amount: 100 }),
  expense({ kind: 'transfer', amount: 100 }),
  expense({ amount: 100, occurred_on: '2026-10-31' }),
  // No category → "Otros".
  expense({ category: null, amount: 50, occurred_on: '2026-11-03' }),
  // MSI without statement day: installment 2 of 3 lands in November.
  expense({
    category: 'Transporte',
    amount: 1200,
    occurred_on: '2026-09-20',
    installment_months: 3,
  }),
  // MSI with cut on the 15th: installment 1 of 3 is billed Nov 15.
  expense({
    category: 'Ocio',
    amount: 900,
    occurred_on: '2026-10-20',
    installment_months: 3,
    account: { statement_day: 15 },
  }),
];

describe('budgetStatus', () => {
  it.each([
    [0, 'ok'],
    [0.79, 'ok'],
    [0.8, 'warning'],
    [1, 'warning'],
    [1.01, 'over'],
  ])('ratio %p is %p', (ratio, status) => {
    expect(budgetStatus(ratio)).toBe(status);
  });
});

describe('amountInMonth', () => {
  const start = '2026-11-01';
  const end = '2026-11-30';

  it('counts regular expenses only inside the month', () => {
    expect(amountInMonth(expense({ amount: 80, occurred_on: '2026-11-30' }), start, end)).toBe(80);
    expect(amountInMonth(expense({ amount: 80, occurred_on: '2026-12-01' }), start, end)).toBe(0);
  });

  it('counts MSI without statement day from the month after the purchase', () => {
    const msi = expense({ amount: 300, occurred_on: '2026-11-05', installment_months: 3 });
    expect(amountInMonth(msi, start, end)).toBe(0);
    expect(amountInMonth(msi, '2026-12-01', '2026-12-31')).toBe(100);
    expect(amountInMonth(msi, '2027-02-01', '2027-02-28')).toBe(100);
    expect(amountInMonth(msi, '2027-03-01', '2027-03-31')).toBe(0);
  });

  it('counts MSI with statement day in the month of each cut', () => {
    const msi = expense({
      amount: 300,
      occurred_on: '2026-11-05',
      installment_months: 3,
      account: { statement_day: 15 },
    });
    expect(amountInMonth(msi, start, end)).toBe(100);
    expect(amountInMonth(msi, '2027-01-01', '2027-01-31')).toBe(100);
    expect(amountInMonth(msi, '2027-02-01', '2027-02-28')).toBe(0);
  });
});

describe('computeBudgetProgress', () => {
  const progress = computeBudgetProgress(MONTH, BUDGETS, EXPENSES);

  it('computes spending per budgeted category in budget order', () => {
    expect(progress.categories).toEqual([
      {
        id: 'b1',
        category: 'Comida',
        budget: 1000,
        spent: 900,
        installmentsSpent: 0,
        remaining: 100,
        ratio: 0.9,
        status: 'warning',
      },
      {
        id: 'b2',
        category: 'Transporte',
        budget: 500,
        spent: 1000,
        installmentsSpent: 400,
        remaining: -500,
        ratio: 2,
        status: 'over',
      },
    ]);
  });

  it('totals budgeted categories and reports the rest as unbudgeted', () => {
    expect(progress.totals).toEqual({
      budget: 1500,
      spent: 1900,
      remaining: -400,
      ratio: 1900 / 1500,
      status: 'over',
    });
    expect(progress.unbudgetedSpent).toBe(350);
  });

  it('handles a month without budgets', () => {
    const empty = computeBudgetProgress(MONTH, [], EXPENSES);
    expect(empty.categories).toEqual([]);
    expect(empty.totals).toMatchObject({ budget: 0, spent: 0, ratio: 0, status: 'ok' });
    expect(empty.unbudgetedSpent).toBe(2250);
  });
});

describe('computeMonthSpending', () => {
  const spending = computeMonthSpending(MONTH, EXPENSES);

  it('totals the month by category, highest first', () => {
    expect(spending.total).toBe(2250);
    expect(spending.installments).toBe(700);
    expect(spending.byCategory).toEqual([
      { category: 'Transporte', amount: 1000 },
      { category: 'Comida', amount: 900 },
      { category: 'Ocio', amount: 300 },
      { category: 'Otros', amount: 50 },
    ]);
  });

  it('spreads spending by day, with MSI on its cut or on day 1', () => {
    expect(spending.byDay).toHaveLength(30);
    expect(spending.byDay[0]).toBe(400); // MSI without statement day
    expect(spending.byDay[1]).toBe(600);
    expect(spending.byDay[2]).toBe(50);
    expect(spending.byDay[4]).toBe(300);
    expect(spending.byDay[14]).toBe(300); // MSI billed at the cut
    expect(spending.byDay[19]).toBe(600);
    expect(spending.byDay.reduce((sum, value) => sum + value, 0)).toBe(spending.total);
  });
});
