import {
  EMPTY_FILTERS,
  type FilterableTransaction,
  activeFilterCount,
  applyFilters,
  isFiltering,
  matchesFilters,
  normalizeText,
  toggleValue,
} from '@/features/transactions/filters';

const base: FilterableTransaction = {
  kind: 'expense',
  amount: 1250.5,
  category: 'Súper',
  description: 'Despensa semanal',
  account_id: 'a1',
  to_account_id: null,
  account: { name: 'Nómina', institution: 'BBVA' },
  to_account: null,
};

const transfer: FilterableTransaction = {
  kind: 'transfer',
  amount: 3000,
  category: null,
  description: null,
  account_id: 'a1',
  to_account_id: 'a2',
  account: { name: 'Nómina', institution: 'BBVA' },
  to_account: { name: 'Oro', institution: 'Banorte' },
};

describe('normalizeText', () => {
  it('drops accents, case and surrounding spaces', () => {
    expect(normalizeText('  Súper NÓMINA ')).toBe('super nomina');
  });
});

describe('matchesFilters', () => {
  it('matches everything without filters', () => {
    expect(matchesFilters(base, EMPTY_FILTERS)).toBe(true);
  });

  it('searches description, category and accounts ignoring accents', () => {
    const q = (query: string) => matchesFilters(base, { ...EMPTY_FILTERS, query });
    expect(q('super')).toBe(true);
    expect(q('DESPENSA')).toBe(true);
    expect(q('bbva nomina')).toBe(true);
    expect(q('gasolina')).toBe(false);
    // Every word must match.
    expect(q('despensa gasolina')).toBe(false);
  });

  it('searches the amount as typed or with thousands separators', () => {
    const q = (query: string) => matchesFilters(base, { ...EMPTY_FILTERS, query });
    expect(q('1250')).toBe(true);
    expect(q('1,250.50')).toBe(true);
    expect(q('999')).toBe(false);
  });

  it('searches the destination account of a transfer', () => {
    expect(matchesFilters(transfer, { ...EMPTY_FILTERS, query: 'banorte' })).toBe(true);
  });

  it('filters by kind and category', () => {
    expect(matchesFilters(base, { ...EMPTY_FILTERS, kinds: ['income'] })).toBe(false);
    expect(matchesFilters(base, { ...EMPTY_FILTERS, kinds: ['income', 'expense'] })).toBe(true);
    expect(matchesFilters(base, { ...EMPTY_FILTERS, categories: ['Comida'] })).toBe(false);
    expect(matchesFilters(transfer, { ...EMPTY_FILTERS, categories: ['Súper'] })).toBe(false);
  });

  it('filters by account on either side of a transfer', () => {
    expect(matchesFilters(transfer, { ...EMPTY_FILTERS, accountIds: ['a2'] })).toBe(true);
    expect(matchesFilters(base, { ...EMPTY_FILTERS, accountIds: ['a2'] })).toBe(false);
  });

  it('filters by an inclusive amount range', () => {
    const range = (minAmount: number | null, maxAmount: number | null) =>
      matchesFilters(base, { ...EMPTY_FILTERS, minAmount, maxAmount });
    expect(range(1250.5, null)).toBe(true);
    expect(range(null, 1250.5)).toBe(true);
    expect(range(1300, null)).toBe(false);
    expect(range(null, 1000)).toBe(false);
    expect(range(1000, 2000)).toBe(true);
  });
});

describe('activeFilterCount / isFiltering', () => {
  it('counts filters apart from the search text', () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(
      activeFilterCount({ ...EMPTY_FILTERS, query: 'x', kinds: ['expense'], minAmount: 10 }),
    ).toBe(2);
  });

  it('ignores a blank search', () => {
    expect(isFiltering({ ...EMPTY_FILTERS, query: '   ' })).toBe(false);
    expect(isFiltering({ ...EMPTY_FILTERS, query: 'a' })).toBe(true);
    expect(isFiltering({ ...EMPTY_FILTERS, accountIds: ['a1'] })).toBe(true);
  });
});

describe('applyFilters', () => {
  it('keeps the matching rows in order', () => {
    expect(applyFilters([base, transfer], { ...EMPTY_FILTERS, kinds: ['transfer'] })).toEqual([
      transfer,
    ]);
    const rows = [base, transfer];
    expect(applyFilters(rows, EMPTY_FILTERS)).toBe(rows);
  });
});

describe('toggleValue', () => {
  it('adds and removes values', () => {
    expect(toggleValue(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleValue(['a', 'b'], 'a')).toEqual(['b']);
  });
});
