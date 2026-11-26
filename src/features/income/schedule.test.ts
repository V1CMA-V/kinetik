import {
  describeSchedule,
  incomeBetween,
  monthlyIncome,
  nextPayday,
  paydaysBetween,
  type IncomeSchedule,
} from './schedule';

const semimonthly: IncomeSchedule = {
  pay_amount: 10000,
  pay_frequency: 'semimonthly',
  pay_day_1: 15,
  pay_day_2: 31,
  anchor_date: null,
};

const biweekly: IncomeSchedule = {
  pay_amount: 8000,
  pay_frequency: 'biweekly',
  pay_day_1: null,
  pay_day_2: null,
  anchor_date: '2026-11-06',
};

describe('monthlyIncome', () => {
  it('averages paydays per month', () => {
    expect(monthlyIncome(semimonthly)).toBe(20000);
    expect(monthlyIncome({ pay_amount: 1200, pay_frequency: 'weekly' })).toBe(5200);
    expect(monthlyIncome({ pay_amount: 6000, pay_frequency: 'biweekly' })).toBe(13000);
    expect(monthlyIncome({ pay_amount: 30000, pay_frequency: 'monthly' })).toBe(30000);
  });
});

describe('paydaysBetween', () => {
  it('clamps day 31 to the last day of short months', () => {
    expect(paydaysBetween(semimonthly, '2027-02-01', '2027-03-31')).toEqual([
      '2027-02-15',
      '2027-02-28',
      '2027-03-15',
      '2027-03-31',
    ]);
  });

  it('includes both ends of the range', () => {
    expect(paydaysBetween(semimonthly, '2026-11-15', '2026-11-30')).toEqual([
      '2026-11-15',
      '2026-11-30',
    ]);
  });

  it('dedupes days that clamp to the same date', () => {
    const s = { ...semimonthly, pay_day_1: 29, pay_day_2: 30 };
    expect(paydaysBetween(s, '2027-02-01', '2027-02-28')).toEqual(['2027-02-28']);
  });

  it('counts weekly/biweekly paydays from the anchor, before or after it', () => {
    expect(paydaysBetween(biweekly, '2026-11-01', '2026-12-31')).toEqual([
      '2026-11-06',
      '2026-11-20',
      '2026-12-04',
      '2026-12-18',
    ]);
    expect(paydaysBetween(biweekly, '2026-10-01', '2026-10-31')).toEqual([
      '2026-10-09',
      '2026-10-23',
    ]);
    const weekly = { ...biweekly, pay_frequency: 'weekly' as const };
    expect(paydaysBetween(weekly, '2026-11-07', '2026-11-20')).toEqual([
      '2026-11-13',
      '2026-11-20',
    ]);
  });

  it('crosses DST changes without drifting', () => {
    const s = { ...biweekly, anchor_date: '2026-03-06' };
    expect(paydaysBetween(s, '2026-03-01', '2026-04-30')).toEqual([
      '2026-03-06',
      '2026-03-20',
      '2026-04-03',
      '2026-04-17',
    ]);
  });

  it('returns nothing for an empty or incomplete schedule', () => {
    expect(paydaysBetween(semimonthly, '2026-12-01', '2026-11-01')).toEqual([]);
    expect(paydaysBetween({ ...biweekly, anchor_date: null }, '2026-11-01', '2026-12-01')).toEqual(
      [],
    );
  });
});

describe('nextPayday / incomeBetween', () => {
  it('finds the next payday on or after a date', () => {
    expect(nextPayday(semimonthly, '2026-11-15')).toBe('2026-11-15');
    expect(nextPayday(semimonthly, '2026-11-16')).toBe('2026-11-30');
    expect(nextPayday(biweekly, '2026-11-21')).toBe('2026-12-04');
  });

  it('adds up the pay in a range', () => {
    expect(incomeBetween(semimonthly, '2026-11-01', '2026-12-20')).toBe(30000);
  });
});

describe('describeSchedule', () => {
  it('summarizes the schedule', () => {
    expect(describeSchedule(semimonthly)).toBe('Días 15 y último');
    expect(describeSchedule({ ...semimonthly, pay_frequency: 'monthly', pay_day_2: null })).toBe(
      'Día 15',
    );
    expect(describeSchedule(biweekly)).toBe('Cada 2 semanas');
  });
});
