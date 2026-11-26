import {
  addDays,
  addMonths,
  formatDay,
  formatMonth,
  formatShortDate,
  monthRange,
  monthsBetween,
  parseISODate,
  toISODate,
} from '@/lib/date';

describe('ISO date helpers', () => {
  it('parses and formats local dates without a UTC shift', () => {
    expect(parseISODate('2026-11-01')).toEqual(new Date(2026, 10, 1));
    expect(toISODate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('adds days across months and years', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('returns the first and last day of the month', () => {
    expect(monthRange('2026-11-20')).toEqual({ start: '2026-11-01', end: '2026-11-30' });
    expect(monthRange('2028-02-10')).toEqual({ start: '2028-02-01', end: '2028-02-29' });
  });

  it('adds months landing on the first day', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-01');
    expect(addMonths('2026-11-20', -12)).toBe('2025-11-01');
  });

  it('counts calendar months between dates', () => {
    expect(monthsBetween('2026-11-30', '2026-12-01')).toBe(1);
    expect(monthsBetween('2025-11-20', '2026-11-01')).toBe(12);
    expect(monthsBetween('2026-11-20', '2026-10-20')).toBe(-1);
  });
});

describe('date labels', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 10, 20, 12) });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('says Hoy and Ayer for recent days', () => {
    expect(formatDay('2026-11-20')).toBe('Hoy');
    expect(formatDay('2026-11-19')).toBe('Ayer');
    expect(formatDay('2026-11-18')).toMatch(/^Miércoles/);
  });

  it('formats months and short dates in Spanish', () => {
    expect(formatMonth('2026-11-20')).toBe('Noviembre de 2026');
    expect(formatShortDate('2026-11-25')).toBe('25 nov');
  });
});
