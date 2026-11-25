import type { Account } from './api';

export type AccountSection = {
  title: string;
  total: number;
  data: Account[];
};

const CASH_GROUP = 'Efectivo';
const OTHER_GROUP = 'Otras cuentas';

function groupTitle(account: Account) {
  if (account.institution) return account.institution;
  return account.type === 'cash' ? CASH_GROUP : OTHER_GROUP;
}

/**
 * Groups accounts by bank (e.g. Banorte → nómina + tarjeta de crédito).
 * Banks keep the order in which their first account was created; cash and
 * accounts without a bank go last.
 */
export function groupAccountsByInstitution(accounts: Account[]): AccountSection[] {
  const sections = new Map<string, AccountSection>();

  for (const account of accounts) {
    const title = groupTitle(account);
    const section = sections.get(title) ?? { title, total: 0, data: [] };
    section.data.push(account);
    section.total += account.balance;
    sections.set(title, section);
  }

  const isFallback = (s: AccountSection) => s.title === CASH_GROUP || s.title === OTHER_GROUP;
  const all = [...sections.values()];
  return [...all.filter((s) => !isFallback(s)), ...all.filter(isFallback)];
}
