import type { CreditCardStatement } from '@/features/accounts/credit-card';
import {
  computePaymentCoverage,
  type FundAccount,
  isFundIncluded,
} from '@/features/accounts/payment-coverage';
import type { CardSummary } from '@/features/accounts/statements';
import type { IncomeSchedule } from '@/features/income/schedule';

const statement = (overrides: Partial<CreditCardStatement>): CreditCardStatement => ({
  lastCutDate: '2026-11-10',
  nextCutDate: '2026-12-10',
  dueDate: '2026-11-30',
  daysUntilDue: 4,
  statementAmount: 0,
  paidSinceCut: 0,
  remainingToPay: 0,
  isPaid: true,
  currentPeriod: {
    charges: 0,
    refunds: 0,
    msiInstallments: 0,
    msiPlans: 0,
    total: 0,
    dueDate: '2026-12-30',
  },
  msiPending: 0,
  activeMsiPlans: 0,
  ...overrides,
});

const card = (
  accountId: string,
  remainingToPay: number,
  dueDate: string,
  nextTotal = 0,
  currency = 'MXN',
): CardSummary => ({
  accountId,
  name: accountId,
  institution: null,
  currency,
  statement: statement({
    remainingToPay,
    statementAmount: remainingToPay,
    isPaid: remainingToPay === 0,
    dueDate,
    currentPeriod: { ...statement({}).currentPeriod, total: nextTotal },
  }),
});

const fund = (overrides: Partial<FundAccount>): FundAccount => ({
  id: 'debit',
  name: 'Débito',
  type: 'bank_account',
  institution: null,
  currency: 'MXN',
  balance: 0,
  ...overrides,
});

describe('isFundIncluded', () => {
  it('counts bank and cash by default but not investments', () => {
    expect(isFundIncluded({ id: 'a', type: 'bank_account' }, {})).toBe(true);
    expect(isFundIncluded({ id: 'a', type: 'cash' }, {})).toBe(true);
    expect(isFundIncluded({ id: 'a', type: 'investment' }, {})).toBe(false);
  });

  it('lets the user override the default', () => {
    expect(isFundIncluded({ id: 'a', type: 'investment' }, { a: true })).toBe(true);
    expect(isFundIncluded({ id: 'a', type: 'bank_account' }, { a: false })).toBe(false);
  });
});

describe('computePaymentCoverage', () => {
  const base = { overrides: {}, currency: 'MXN' };

  it('reports the shortfall and which cards can be paid, soonest due first', () => {
    const result = computePaymentCoverage({
      ...base,
      cards: [card('banorte', 7771.59, '2026-11-30'), card('nu', 6929.21, '2026-11-25')],
      accounts: [
        fund({ id: 'nomina', balance: 8000 }),
        fund({ id: 'cash', type: 'cash', balance: 300 }),
      ],
    });

    expect(result.available).toBe(8300);
    expect(result.dueTotal).toBe(14700.8);
    expect(result.balance).toBe(-6400.8);
    expect(result.payments.map((p) => [p.accountId, p.covered, p.leftAfter])).toEqual([
      ['nu', true, 1370.79],
      ['banorte', false, -6400.8],
    ]);
  });

  it('skips paid statements but still projects the statement in progress', () => {
    const result = computePaymentCoverage({
      ...base,
      cards: [card('paid', 0, '2026-11-30', 1500), card('due', 1000, '2026-12-02', 500)],
      accounts: [fund({ balance: 2500 })],
    });

    expect(result.payments.map((p) => p.accountId)).toEqual(['due']);
    expect(result.balance).toBe(1500);
    expect(result.nextTotal).toBe(2000);
    expect(result.balanceWithNext).toBe(-500);
  });

  it('ignores excluded, overdrawn, investment and foreign-currency accounts', () => {
    const result = computePaymentCoverage({
      overrides: { off: false },
      currency: 'MXN',
      cards: [card('usd', 900, '2026-11-30', 0, 'USD')],
      accounts: [
        fund({ id: 'on', balance: 100 }),
        fund({ id: 'off', balance: 1000 }),
        fund({ id: 'overdrawn', balance: -50 }),
        fund({ id: 'turbo', type: 'investment', balance: 5000 }),
        fund({ id: 'dollars', currency: 'USD', balance: 70 }),
      ],
    });

    expect(result.available).toBe(100);
    expect(result.funds.map((f) => [f.id, f.included])).toEqual([
      ['on', true],
      ['off', false],
      ['overdrawn', true],
      ['turbo', false],
    ]);
    expect(result.payments).toEqual([]);
    expect(result.balance).toBe(100);
  });
});

describe('computePaymentCoverage with income', () => {
  const quincena: IncomeSchedule = {
    pay_amount: 10000,
    pay_frequency: 'semimonthly',
    pay_day_1: 15,
    pay_day_2: 31,
    anchor_date: null,
  };
  const base = { overrides: {}, currency: 'MXN', today: '2026-11-26' };

  it('mirrors the plain values when there is no income profile', () => {
    const result = computePaymentCoverage({
      ...base,
      income: null,
      cards: [card('nu', 1000, '2026-12-20'), card('bbva', 3000, '2026-12-01')],
      accounts: [fund({ balance: 2000 })],
    });

    expect(
      result.payments.map((p) => [
        p.accountId,
        p.incomeBefore,
        p.leftAfterWithIncome,
        p.coveredWithIncome,
        p.coveringPayday,
      ]),
    ).toEqual([
      ['bbva', 0, -1000, false, null],
      ['nu', 0, -2000, false, null],
    ]);
    expect(result.nextPayday).toBeNull();
    expect(result.paydaysUntilLastDue).toEqual([]);
    expect(result.incomeUntilLastDue).toBe(0);
    expect(result.balanceWithIncome).toBe(result.balance);
  });

  it('keeps working without income or today (existing callers)', () => {
    const result = computePaymentCoverage({
      overrides: {},
      currency: 'MXN',
      cards: [card('nu', 500, '2026-11-30')],
      accounts: [fund({ balance: 1000 })],
    });

    expect(result.payments[0]).toMatchObject({
      leftAfter: 500,
      covered: true,
      incomeBefore: 0,
      leftAfterWithIncome: 500,
      coveredWithIncome: true,
      coveringPayday: null,
    });
  });

  it('covers a later payment with the quincena that lands before it', () => {
    const result = computePaymentCoverage({
      ...base,
      income: quincena,
      cards: [card('bbva', 3000, '2026-11-29'), card('nu', 6000, '2026-12-20')],
      accounts: [fund({ balance: 4000 })],
    });

    expect(result.nextPayday).toBe('2026-11-30');
    expect(result.paydaysUntilLastDue).toEqual(['2026-11-30', '2026-12-15']);
    expect(result.incomeUntilLastDue).toBe(20000);
    expect(result.balanceWithIncome).toBe(15000);
    expect(
      result.payments.map((p) => [
        p.accountId,
        p.covered,
        p.incomeBefore,
        p.leftAfterWithIncome,
        p.coveredWithIncome,
        p.coveringPayday,
      ]),
    ).toEqual([
      // Due before the next payday: only today's money.
      ['bbva', true, 0, 1000, true, null],
      // Short by 5,000 today; the 30 nov pay already closes the gap.
      ['nu', false, 20000, 15000, true, '2026-11-30'],
    ]);
  });

  it('names the payday that closes the gap, not just the first one', () => {
    const result = computePaymentCoverage({
      ...base,
      income: quincena,
      cards: [card('nu', 15000, '2026-12-20')],
      accounts: [fund({ balance: 0 })],
    });

    expect(result.payments[0]).toMatchObject({
      covered: false,
      incomeBefore: 20000,
      leftAfterWithIncome: 5000,
      coveredWithIncome: true,
      coveringPayday: '2026-12-15',
    });
  });

  it('reports what is still short even with the pay', () => {
    const result = computePaymentCoverage({
      ...base,
      income: { ...quincena, pay_amount: 2000 },
      cards: [card('nu', 9000, '2026-12-10')],
      accounts: [fund({ balance: 1000 })],
    });

    expect(result.payments[0]).toMatchObject({
      leftAfter: -8000,
      incomeBefore: 2000,
      leftAfterWithIncome: -6000,
      coveredWithIncome: false,
      coveringPayday: null,
    });
    expect(result.balanceWithIncome).toBe(-6000);
  });

  it('does not count pay landing on the due date itself', () => {
    const result = computePaymentCoverage({
      ...base,
      income: quincena,
      cards: [card('nu', 3000, '2026-11-30')],
      accounts: [fund({ balance: 1000 })],
    });

    expect(result.paydaysUntilLastDue).toEqual([]);
    expect(result.payments[0]).toMatchObject({
      incomeBefore: 0,
      leftAfterWithIncome: -2000,
      coveredWithIncome: false,
      coveringPayday: null,
    });
    expect(result.nextPayday).toBe('2026-11-30');
  });

  it("does not count today's pay (it's assumed to be in the balance)", () => {
    const result = computePaymentCoverage({
      ...base,
      today: '2026-12-15',
      income: quincena,
      cards: [card('nu', 3000, '2026-12-20')],
      accounts: [fund({ balance: 1000 })],
    });

    expect(result.paydaysUntilLastDue).toEqual([]);
    expect(result.nextPayday).toBe('2026-12-31');
    expect(result.payments[0]).toMatchObject({
      incomeBefore: 0,
      coveredWithIncome: false,
      coveringPayday: null,
    });
  });

  it('never projects income for overdue payments', () => {
    const result = computePaymentCoverage({
      ...base,
      income: quincena,
      cards: [card('late', 3000, '2026-11-20')],
      accounts: [fund({ balance: 0 })],
    });

    expect(result.payments[0]).toMatchObject({ incomeBefore: 0, coveredWithIncome: false });
    expect(result.incomeUntilLastDue).toBe(0);
  });
});
