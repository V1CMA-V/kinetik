import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/features/transactions/constants';

import { includesCategory, isBuiltInCategory, mergeCategories, withCategory } from './categories';

describe('mergeCategories', () => {
  it('returns the built-ins without custom categories', () => {
    expect(mergeCategories('expense', [])).toEqual([...EXPENSE_CATEGORIES]);
    expect(mergeCategories('income', [])).toEqual([...INCOME_CATEGORIES]);
  });

  it('adds custom ones alphabetically before "Otros"', () => {
    const list = mergeCategories('expense', ['Mascotas', 'Bebé', 'Ahorro']);
    expect(list.slice(-4)).toEqual(['Ahorro', 'Bebé', 'Mascotas', 'Otros']);
    expect(list.slice(0, 3)).toEqual(['Comida', 'Súper', 'Transporte']);
  });

  it('sorts accented names like Spanish speakers expect', () => {
    expect(mergeCategories('income', ['Óscar', 'Nueva', 'Ñame']).slice(-4)).toEqual([
      'Nueva',
      'Ñame',
      'Óscar',
      'Otros',
    ]);
  });

  it('skips custom names that repeat a built-in or each other', () => {
    const list = mergeCategories('expense', ['super', 'OTROS', 'Mascotas', 'mascotas ', '  ']);
    expect(list).toHaveLength(EXPENSE_CATEGORIES.length + 1);
    expect(list.filter((c) => normalizeKey(c) === 'mascotas')).toHaveLength(1);
    expect(list.at(-1)).toBe('Otros');
  });

  it('keeps kinds apart', () => {
    expect(mergeCategories('income', ['Comida'])).toContain('Comida');
  });
});

const normalizeKey = (s: string) => s.trim().toLowerCase();

describe('isBuiltInCategory', () => {
  it('ignores case and accents', () => {
    expect(isBuiltInCategory('expense', 'SUPER')).toBe(true);
    expect(isBuiltInCategory('income', 'nomina')).toBe(true);
    expect(isBuiltInCategory('income', 'Súper')).toBe(false);
  });
});

describe('includesCategory', () => {
  it('matches ignoring case and accents', () => {
    expect(includesCategory(['Bebé'], ' bebe ')).toBe(true);
    expect(includesCategory(['Bebé'], 'Bebida')).toBe(false);
  });
});

describe('withCategory', () => {
  it('appends a category missing from the list', () => {
    expect(withCategory(['Comida'], 'Viejo')).toEqual(['Comida', 'Viejo']);
  });

  it('leaves the list alone otherwise', () => {
    const list = ['Comida'];
    expect(withCategory(list, 'Comida')).toBe(list);
    expect(withCategory(list, undefined)).toBe(list);
    expect(withCategory(list, null)).toBe(list);
  });
});
