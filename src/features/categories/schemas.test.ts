import { categorySchema } from './schemas';

describe('categorySchema', () => {
  it('trims the name', () => {
    expect(categorySchema.parse({ kind: 'expense', name: '  Mi   gato ' })).toEqual({
      kind: 'expense',
      name: 'Mi gato',
    });
  });

  it.each(['', '   ', 'x'.repeat(41)])('rejects the name %p', (name) => {
    expect(categorySchema.safeParse({ kind: 'expense', name }).success).toBe(false);
  });

  it('accepts 40 characters', () => {
    expect(categorySchema.safeParse({ kind: 'income', name: 'x'.repeat(40) }).success).toBe(true);
  });

  it('rejects a built-in of the same kind ignoring case and accents', () => {
    const result = categorySchema.safeParse({ kind: 'expense', name: 'super' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['name']);
    expect(categorySchema.safeParse({ kind: 'income', name: 'NOMINA' }).success).toBe(false);
  });

  it('allows a built-in name of the other kind', () => {
    expect(categorySchema.safeParse({ kind: 'income', name: 'Comida' }).success).toBe(true);
  });

  it('rejects transfers', () => {
    expect(categorySchema.safeParse({ kind: 'transfer', name: 'Algo' }).success).toBe(false);
  });
});
