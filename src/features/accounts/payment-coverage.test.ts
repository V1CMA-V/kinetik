import type { CreditCardStatement } from '@/features/accounts/credit-card';
import {
  computePaymentCoverage,
  type FundAccount,
  isFundIncluded,
} from '@/features/accounts/payment-coverage';
import type { CardSummary } from '@/features/accounts/statements';

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
