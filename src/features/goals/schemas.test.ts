import { contributionSchema, goalSchema, goalToFormValues } from '@/features/goals/schemas';

describe('goalSchema', () => {
  const valid = { name: ' Viaje a Japón ', targetAmount: '80,000', targetDate: '', shared: true };

  it('normalizes a valid goal', () => {
    expect(goalSchema.parse(valid)).toEqual({
      name: 'Viaje a Japón',
      target_amount: 80000,
      target_date: null,
      shared: true,
    });
  });

  it('keeps the target date', () => {
    expect(goalSchema.parse({ ...valid, targetDate: '2027-12-31' }).target_date).toBe('2027-12-31');
  });

  it('rejects an empty name and a zero amount', () => {
    expect(goalSchema.safeParse({ ...valid, name: '  ' }).success).toBe(false);
    expect(goalSchema.safeParse({ ...valid, targetAmount: '0' }).success).toBe(false);
    expect(goalSchema.safeParse({ ...valid, targetAmount: 'abc' }).success).toBe(false);
  });

  it('round-trips a stored goal', () => {
    const values = goalToFormValues({
      id: 'g1',
      user_id: 'u1',
      household_id: 'h1',
      name: 'Enganche',
      target_amount: 250000,
      target_date: null,
      completed_at: null,
      created_at: '',
      updated_at: '',
    });
    expect(values).toEqual({
      name: 'Enganche',
      targetAmount: '250000.00',
      targetDate: '',
      shared: true,
    });
  });
});

describe('contributionSchema', () => {
  const base = {
    kind: 'deposit' as const,
    amount: '1,500.50',
    contributedOn: '2026-11-26',
    note: '',
  };

  it('stores deposits as positive amounts and drops an empty note', () => {
    expect(contributionSchema.parse(base)).toEqual({
      amount: 1500.5,
      contributed_on: '2026-11-26',
      note: null,
    });
  });

  it('stores withdrawals as negative amounts', () => {
    expect(contributionSchema.parse({ ...base, kind: 'withdrawal', note: ' Boletos ' })).toEqual({
      amount: -1500.5,
      contributed_on: '2026-11-26',
      note: 'Boletos',
    });
  });

  it('rejects a zero amount', () => {
    expect(contributionSchema.safeParse({ ...base, amount: '0' }).success).toBe(false);
  });
});
