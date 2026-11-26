import { type TransactionFormInput, transactionSchema } from '@/features/transactions/schemas';

const values = (overrides: Partial<TransactionFormInput> = {}): TransactionFormInput => ({
  kind: 'expense',
  amount: '1,250.50',
  accountId: 'a1',
  toAccountId: undefined,
  category: 'Comida',
  description: '',
  occurredOn: '2026-11-20',
  installmentMonths: null,
  ...overrides,
});

const errorPaths = (input: TransactionFormInput) => {
  const result = transactionSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('transactionSchema', () => {
  it('maps an expense to the DB row', () => {
    expect(transactionSchema.parse(values({ installmentMonths: 6 }))).toEqual({
      kind: 'expense',
      amount: 1250.5,
      account_id: 'a1',
      to_account_id: null,
      category: 'Comida',
      description: null,
      occurred_on: '2026-11-20',
      installment_months: 6,
    });
  });

  it('drops category and MSI from transfers and keeps the destination', () => {
    expect(
      transactionSchema.parse(
        values({ kind: 'transfer', toAccountId: 'a2', installmentMonths: 3 }),
      ),
    ).toMatchObject({ to_account_id: 'a2', category: null, installment_months: null });
  });

  it('only keeps MSI on expenses', () => {
    expect(
      transactionSchema.parse(values({ kind: 'income', installmentMonths: 3 })).installment_months,
    ).toBeNull();
  });

  it.each(['0', '-5', 'abc', '1.234', ''])('rejects the amount %p', (amount) => {
    expect(errorPaths(values({ amount }))).toContain('amount');
  });

  it('requires a category outside transfers', () => {
    expect(errorPaths(values({ category: undefined }))).toEqual(['category']);
  });

  it('requires a different destination account for transfers', () => {
    expect(errorPaths(values({ kind: 'transfer' }))).toEqual(['toAccountId']);
    expect(errorPaths(values({ kind: 'transfer', toAccountId: 'a1' }))).toEqual(['toAccountId']);
  });

  it('rejects MSI terms that are not offered', () => {
    expect(errorPaths(values({ installmentMonths: 5 }))).toEqual(['installmentMonths']);
  });
});
