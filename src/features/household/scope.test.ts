import { filterByScope, matchesScope } from '@/features/household/scope';

const personal = { household_id: null };
const shared = { household_id: 'h1' };

describe('matchesScope', () => {
  it('shows everything with "all"', () => {
    expect(matchesScope({ account: personal }, 'all')).toBe(true);
    expect(matchesScope({ account: shared }, 'all')).toBe(true);
  });

  it('classifies income and expenses by their account', () => {
    expect(matchesScope({ account: personal, to_account: null }, 'personal')).toBe(true);
    expect(matchesScope({ account: personal, to_account: null }, 'shared')).toBe(false);
    expect(matchesScope({ account: shared, to_account: null }, 'shared')).toBe(true);
    expect(matchesScope({ account: shared, to_account: null }, 'personal')).toBe(false);
  });

  it('shows a personal-to-shared transfer in both views', () => {
    const t = { account: personal, to_account: shared };
    expect(matchesScope(t, 'personal')).toBe(true);
    expect(matchesScope(t, 'shared')).toBe(true);
  });

  it("treats a hidden source account (partner's personal) as shared", () => {
    const t = { account: null, to_account: shared };
    expect(matchesScope(t, 'shared')).toBe(true);
    expect(matchesScope(t, 'personal')).toBe(false);
  });

  it('keeps transfers between personal accounts out of the shared view', () => {
    const t = { account: personal, to_account: personal };
    expect(matchesScope(t, 'shared')).toBe(false);
    expect(matchesScope(t, 'personal')).toBe(true);
  });
});

describe('filterByScope', () => {
  it('returns the same array for "all"', () => {
    const rows = [{ account: personal }];
    expect(filterByScope(rows, 'all')).toBe(rows);
  });

  it('filters the rows of a scope', () => {
    const rows = [{ account: personal }, { account: shared }];
    expect(filterByScope(rows, 'shared')).toEqual([{ account: shared }]);
  });
});
