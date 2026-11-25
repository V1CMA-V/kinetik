import type { Enums } from '@/types/database';

export type AccountType = Enums<'account_type'>;

export const ACCOUNT_TYPES: Record<AccountType, { label: string; description: string }> = {
  bank_account: { label: 'Cuenta bancaria', description: 'Nómina, débito o ahorro' },
  credit_card: { label: 'Tarjeta de crédito', description: 'Deuda y límite' },
  cash: { label: 'Efectivo', description: 'Dinero en mano' },
  investment: { label: 'Inversión', description: 'CETES, fondos, Nu, etc.' },
};

export const ACCOUNT_TYPE_ORDER: AccountType[] = [
  'bank_account',
  'credit_card',
  'cash',
  'investment',
];

/** Types that belong to a financial institution (cash doesn't). */
export const TYPES_WITH_INSTITUTION: AccountType[] = ['bank_account', 'credit_card', 'investment'];

/** Common Mexican banks and fintechs, shown as quick picks. */
export const INSTITUTIONS = [
  'Banorte',
  'BBVA',
  'Santander',
  'Banamex',
  'HSBC',
  'Scotiabank',
  'Inbursa',
  'Banregio',
  'BanCoppel',
  'Banco Azteca',
  'Nu',
  'Mercado Pago',
  'Hey Banco',
  'Stori',
  'Klar',
  'Spin by OXXO',
] as const;

export const DEFAULT_CURRENCY = 'MXN';
