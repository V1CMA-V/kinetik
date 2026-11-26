import type { IncomeSchedule } from '@/features/income/schedule';

import { contributionPerPayday, monthsToReach, suggestedMonthlySavings } from './pace';

const TODAY = '2026-11-26';

const semimonthly: IncomeSchedule = {
  pay_amount: 10000,
  pay_frequency: 'semimonthly',
  pay_day_1: 15,
  pay_day_2: 31,
  anchor_date: null,
};

const weekly: IncomeSchedule = {
  pay_amount: 3000,
  pay_frequency: 'weekly',
  pay_day_1: null,
  pay_day_2: null,
  anchor_date: '2026-11-27',
};

describe('contributionPerPayday', () => {
  it('splits what is missing across the paydays left', () => {
    // Nov 30, Dec 15, Dec 31, Jan 15, Jan 31 → 5 paydays.
    expect(contributionPerPayday(semimonthly, 10000, '2027-01-31', TODAY)).toEqual({
      amount: 2000,
      paydays: 5,
    });
  });

  it('rounds up to whole pesos', () => {
    // Nov 30 and Dec 15.
    expect(contributionPerPayday(semimonthly, 1001, '2026-12-20', TODAY)).toEqual({
      amount: 501,
      paydays: 2,
    });
  });

  it('counts weekly paydays from the anchor', () => {
    // Nov 27, Dec 4, Dec 11, Dec 18.
    expect(contributionPerPayday(weekly, 4000, '2026-12-20', TODAY)?.paydays).toBe(4);
  });

  it('asks for the whole remaining when no payday is left', () => {
    expect(contributionPerPayday(semimonthly, 1500, '2026-11-28', TODAY)).toEqual({
      amount: 1500,
      paydays: 0,
    });
  });

  it('returns null without a date, past the date, once reached or with an incomplete schedule', () => {
    expect(contributionPerPayday(semimonthly, 1000, null, TODAY)).toBeNull();
    expect(contributionPerPayday(semimonthly, 1000, '2026-10-31', TODAY)).toBeNull();
    expect(contributionPerPayday(semimonthly, 0, '2027-01-31', TODAY)).toBeNull();
    expect(
      contributionPerPayday({ ...weekly, anchor_date: null }, 1000, '2027-01-31', TODAY),
    ).toBeNull();
  });

  it('includes today when it is a payday and the target date', () => {
    expect(contributionPerPayday(semimonthly, 1000, '2026-11-30', '2026-11-30')).toEqual({
      amount: 1000,
      paydays: 1,
    });
  });
});

describe('monthsToReach', () => {
  it('rounds up to whole months', () => {
    expect(monthsToReach(10000, 3000)).toBe(4);
    expect(monthsToReach(9000, 3000)).toBe(3);
  });

  it('returns null without extras or once reached', () => {
    expect(monthsToReach(10000, 0)).toBeNull();
    expect(monthsToReach(0, 3000)).toBeNull();
  });
});

describe('suggestedMonthlySavings', () => {
  it('is 20% of the monthly fixed income, rounded', () => {
    expect(suggestedMonthlySavings(semimonthly)).toBe(4000);
    // 3,000 × 52 / 12 = 13,000 → 2,600
    expect(suggestedMonthlySavings(weekly)).toBe(2600);
    expect(suggestedMonthlySavings({ pay_amount: 0, pay_frequency: 'monthly' })).toBe(0);
  });
});
