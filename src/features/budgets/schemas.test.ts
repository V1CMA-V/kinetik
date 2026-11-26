import { budgetSchema, budgetToFormValues } from '@/features/budgets/schemas';
import type { Tables } from '@/types/database';

describe('budgetSchema', () => {
  it('parses the amount', () => {
    expect(budgetSchema.parse({ category: 'Comida', amount: ' 4,500.5 ' })).toEqual({
      category: 'Comida',
      amount: 4500.5,
    });
  });

  it.each(['0', '-10', '', '1.234'])('rejects the amount %p', (amount) => {
    expect(budgetSchema.safeParse({ category: 'Comida', amount }).success).toBe(false);
  });

  it('requires a category', () => {
    expect(budgetSchema.safeParse({ category: '', amount: '100' }).success).toBe(false);
  });

  it('round-trips a stored budget', () => {
    const stored = { category: 'Comida', amount: 4500 } as Tables<'budgets'>;
    expect(budgetToFormValues(stored)).toEqual({ category: 'Comida', amount: '4500.00' });
    expect(budgetSchema.parse(budgetToFormValues(stored))).toEqual({
      category: 'Comida',
      amount: 4500,
    });
  });
});
