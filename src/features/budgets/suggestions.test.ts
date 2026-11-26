import { EXPENSE_CATEGORIES } from '@/features/transactions/constants';

import {
  CATEGORY_GROUPS,
  budgetTotals,
  categoryGroup,
  roundFriendly,
  spendingByCategory,
  suggestBudget,
} from './suggestions';

describe('CATEGORY_GROUPS', () => {
  it('classifies every expense category', () => {
    for (const c of EXPENSE_CATEGORIES) {
      expect(['needs', 'wants']).toContain(CATEGORY_GROUPS[c]);
    }
    expect(Object.keys(CATEGORY_GROUPS).sort()).toEqual([...EXPENSE_CATEGORIES].sort());
  });

  it('treats unknown categories as wants', () => {
    expect(categoryGroup('Súper')).toBe('needs');
    expect(categoryGroup('Mascotas')).toBe('wants');
  });
});

describe('roundFriendly', () => {
  it('rounds to 50 below 1,000 and to 100 from there', () => {
    expect(roundFriendly(1234)).toBe(1200);
    expect(roundFriendly(1250)).toBe(1300);
    expect(roundFriendly(999)).toBe(1000);
    expect(roundFriendly(724)).toBe(700);
    expect(roundFriendly(726)).toBe(750);
  });

  it('never suggests 0 for a positive amount', () => {
    expect(roundFriendly(10)).toBe(50);
    expect(roundFriendly(0)).toBe(0);
    expect(roundFriendly(-5)).toBe(0);
    expect(roundFriendly(NaN)).toBe(0);
  });
});

describe('spendingByCategory', () => {
  it('adds up the months and ignores non-positive amounts', () => {
    expect(
      spendingByCategory([
        [
          { category: 'Súper', amount: 3000 },
          { category: 'Comida', amount: 1000 },
        ],
        [{ category: 'Súper', amount: 2000 }],
        [{ category: 'Viajes', amount: 0 }],
      ]),
    ).toEqual({ Súper: 5000, Comida: 1000 });
  });
});

describe('suggestBudget', () => {
  const income = 20000; // needs pool 10,000, wants pool 6,000

  it('splits the pool evenly without history', () => {
    // 7 needs categories: 10,000 / 7 ≈ 1,428.57
    expect(suggestBudget('Súper', income)).toBe(1400);
    // 6 wants categories: 6,000 / 6
    expect(suggestBudget('Comida', income)).toBe(1000);
  });

  it('uses the category share of its group spending', () => {
    const history = { Súper: 6000, Hogar: 3000, Transporte: 3000, Comida: 9000 };
    // Needs weights: 6,000 + 3,000 + 3,000 + 4 × 600 (5% floor) = 14,400.
    expect(suggestBudget('Súper', income, history)).toBe(4200);
    expect(suggestBudget('Hogar', income, history)).toBe(2100);
    // Wants weights: 9,000 + 5 × 450 = 11,250 → 6,000 × 0.8.
    expect(suggestBudget('Comida', income, history)).toBe(4800);
  });

  it('gives a category without spending a small floor, not $0', () => {
    // 6,000 + 6 × 300 = 7,800 → 10,000 × 300 / 7,800 ≈ 385.
    expect(suggestBudget('Salud', income, { Súper: 6000 })).toBe(400);
  });

  it('keeps the whole group within its pool when every suggestion is accepted', () => {
    const history = { Súper: 6000 };
    const needs = ['Súper', 'Transporte', 'Gasolina', 'Hogar', 'Servicios', 'Salud', 'Educación'];
    const total = needs.reduce((sum, c) => sum + suggestBudget(c, income, history), 0);
    // Only friendly rounding can push it a little over 10,000.
    expect(total).toBeLessThanOrEqual(10000 + needs.length * 50);
  });

  it('returns 0 without income', () => {
    expect(suggestBudget('Súper', 0)).toBe(0);
    expect(suggestBudget('Súper', -100, { Súper: 100 })).toBe(0);
  });
});

describe('budgetTotals', () => {
  it('compares budgets with the income and the 50/30 targets', () => {
    const t = budgetTotals(
      [
        { category: 'Súper', amount: 4000 },
        { category: 'Hogar', amount: 8000 },
        { category: 'Comida', amount: 3000 },
      ],
      20000,
    );
    expect(t.total).toBe(15000);
    expect(t.ratio).toBeCloseTo(0.75);
    expect(t.groups.needs).toEqual({ total: 12000, target: 10000, ratio: 1.2 });
    expect(t.groups.wants).toEqual({ total: 3000, target: 6000, ratio: 0.5 });
  });

  it('avoids dividing by zero without income', () => {
    const t = budgetTotals([{ category: 'Súper', amount: 4000 }], 0);
    expect(t.ratio).toBe(0);
    expect(t.groups.needs).toEqual({ total: 4000, target: 0, ratio: 0 });
  });
});
