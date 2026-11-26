import { computeIncomeInsights, incomePeriod } from '@/features/analysis/income-insights';
import type { IncomeSchedule } from '@/features/income/schedule';

const semimonthly: IncomeSchedule = {
  pay_amount: 10000,
  pay_frequency: 'semimonthly',
  pay_day_1: 15,
  pay_day_2: 31,
  anchor_date: null,
};

// Fridays: October 2026 has 5 (2, 9, 16, 23, 30).
const weekly: IncomeSchedule = {
  pay_amount: 1000,
  pay_frequency: 'weekly',
  pay_day_1: null,
  pay_day_2: null,
  anchor_date: '2026-10-02',
};

const november = { start: '2026-11-01', end: '2026-11-30' };
const october = { start: '2026-10-01', end: '2026-10-31' };

describe('incomePeriod', () => {
  it('tells past, current and future months apart, inclusive of the edges', () => {
    expect(incomePeriod(november.start, november.end, '2026-11-01')).toBe('current');
    expect(incomePeriod(november.start, november.end, '2026-11-30')).toBe('current');
    expect(incomePeriod(november.start, november.end, '2026-12-01')).toBe('past');
    expect(incomePeriod(november.start, november.end, '2026-10-31')).toBe('future');
  });
});

describe('computeIncomeInsights', () => {
  it('compares the projection against the fixed pay of the current month', () => {
    const r = computeIncomeInsights({
      ...november,
      today: '2026-11-20',
      schedule: semimonthly,
      variableMonthly: 3000,
      spentToDate: 9000,
      projectedSpending: 16400,
      registeredIncome: 10000,
    });
    expect(r).toEqual({
      period: 'current',
      expectedIncome: 20000,
      paydays: 2,
      extras: 3000,
      spending: 16400,
      spentShare: 0.45,
      spendingShare: 0.82,
      savings: 3600,
      savingsRate: 0.18,
      expectedSoFar: 10000,
      paydaysSoFar: 1,
      registeredIncome: 10000,
      incomeGap: 0,
    });
  });

  it('counts every payday in the actual month (5 Fridays)', () => {
    const r = computeIncomeInsights({
      ...october,
      today: '2026-11-26',
      schedule: weekly,
      variableMonthly: 0,
      spentToDate: 4000,
      projectedSpending: null,
      registeredIncome: 4000,
    });
    expect(r.period).toBe('past');
    expect(r.paydays).toBe(5);
    expect(r.expectedIncome).toBe(5000);
    expect(r.spending).toBe(4000);
    expect(r.savings).toBe(1000);
    // Past months expect the whole month.
    expect(r.expectedSoFar).toBe(5000);
    expect(r.incomeGap).toBe(-1000);
  });

  it('uses actual spending for past months even if a projection is passed', () => {
    const r = computeIncomeInsights({
      ...october,
      today: '2026-11-26',
      schedule: semimonthly,
      variableMonthly: 0,
      spentToDate: 12000,
      projectedSpending: 99999,
      registeredIncome: 20000,
    });
    expect(r.spending).toBe(12000);
    expect(r.spendingShare).toBe(0.6);
  });

  it('only expects paydays up to today in the current month, including today', () => {
    const base = {
      ...november,
      schedule: semimonthly,
      variableMonthly: 0,
      spentToDate: 0,
      projectedSpending: 0,
      registeredIncome: 0,
    };
    expect(computeIncomeInsights({ ...base, today: '2026-11-14' }).expectedSoFar).toBe(0);
    expect(computeIncomeInsights({ ...base, today: '2026-11-15' }).expectedSoFar).toBe(10000);
    // Day 31 means the last day: November 30.
    expect(computeIncomeInsights({ ...base, today: '2026-11-30' }).expectedSoFar).toBe(20000);
  });

  it('allows negative savings when spending more than the income', () => {
    const r = computeIncomeInsights({
      ...november,
      today: '2026-11-20',
      schedule: semimonthly,
      variableMonthly: 0,
      spentToDate: 15000,
      projectedSpending: 25000,
      registeredIncome: 20000,
    });
    expect(r.savings).toBe(-5000);
    expect(r.savingsRate).toBe(-0.25);
    expect(r.spendingShare).toBe(1.25);
    expect(r.incomeGap).toBe(10000);
  });

  it('never projects below what was already spent', () => {
    const r = computeIncomeInsights({
      ...november,
      today: '2026-11-20',
      schedule: semimonthly,
      variableMonthly: 0,
      spentToDate: 5000,
      projectedSpending: 4000,
      registeredIncome: 0,
    });
    expect(r.spending).toBe(5000);
  });

  it('returns null ratios instead of NaN/Infinity without expected income', () => {
    const incomplete: IncomeSchedule = { ...weekly, anchor_date: null };
    const r = computeIncomeInsights({
      ...november,
      today: '2026-11-20',
      schedule: incomplete,
      variableMonthly: -50,
      spentToDate: 0,
      projectedSpending: 0,
      registeredIncome: -10,
    });
    expect(r.expectedIncome).toBe(0);
    expect(r.spentShare).toBeNull();
    expect(r.spendingShare).toBeNull();
    expect(r.savingsRate).toBeNull();
    expect(r.savings).toBe(0);
    expect(r.extras).toBe(0);
    expect(r.registeredIncome).toBe(0);
    expect(r.incomeGap).toBe(0);
  });

  it('expects nothing so far for a future month', () => {
    const r = computeIncomeInsights({
      ...november,
      today: '2026-10-15',
      schedule: semimonthly,
      variableMonthly: 0,
      spentToDate: 0,
      projectedSpending: null,
      registeredIncome: 0,
    });
    expect(r.period).toBe('future');
    expect(r.expectedIncome).toBe(20000);
    expect(r.expectedSoFar).toBe(0);
    expect(r.paydaysSoFar).toBe(0);
  });
});
