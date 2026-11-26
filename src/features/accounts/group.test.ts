import type { Account } from '@/features/accounts/api';
import { groupAccountsByInstitution } from '@/features/accounts/group';

const account = (id: string, overrides: Partial<Account>) =>
  ({ id, type: 'bank_account', institution: null, balance: 0, ...overrides }) as Account;

describe('groupAccountsByInstitution', () => {
  it('groups by bank in creation order, with cash and others last', () => {
    const sections = groupAccountsByInstitution([
      account('cash', { type: 'cash', balance: 500 }),
      account('nomina', { institution: 'Banorte', balance: 10000 }),
      account('loose', { balance: 100 }),
      account('nu', { institution: 'Nu', balance: 2000 }),
      account('oro', { type: 'credit_card', institution: 'Banorte', balance: 3000 }),
    ]);

    expect(sections.map((s) => [s.title, s.total, s.data.map((a) => a.id)])).toEqual([
      ['Banorte', 13000, ['nomina', 'oro']],
      ['Nu', 2000, ['nu']],
      ['Efectivo', 500, ['cash']],
      ['Otras cuentas', 100, ['loose']],
    ]);
  });

  it('returns no sections without accounts', () => {
    expect(groupAccountsByInstitution([])).toEqual([]);
  });
});
