import { EMPTY_INCOME_FORM, incomeSchema } from './schemas';

const base = { ...EMPTY_INCOME_FORM, payAmount: '10,000' };

describe('incomeSchema', () => {
  it('parses a quincena schedule', () => {
    expect(incomeSchema.parse(base)).toMatchObject({
      pay_amount: 10000,
      pay_frequency: 'semimonthly',
      pay_day_1: 15,
      pay_day_2: 31,
      anchor_date: null,
      deposit_account_id: null,
      variable_monthly: 0,
    });
  });

  it('ignores invalid days hidden by a weekly frequency', () => {
    const result = incomeSchema.safeParse({
      ...base,
      frequency: 'weekly',
      payDay1: '45',
      anchorDate: '2026-11-27',
    });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ pay_day_1: null, pay_day_2: null });
  });

  it('ignores the second day for monthly pay', () => {
    const result = incomeSchema.safeParse({ ...base, frequency: 'monthly', payDay2: '99' });
    expect(result.success).toBe(true);
  });

  it('rejects quincena days too close together', () => {
    const result = incomeSchema.safeParse({ ...base, payDay1: '29', payDay2: '31' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['payDay2']);
  });

  it('requires a date for weekly pay', () => {
    expect(incomeSchema.safeParse({ ...base, frequency: 'biweekly', anchorDate: '' }).success).toBe(
      false,
    );
  });
});
