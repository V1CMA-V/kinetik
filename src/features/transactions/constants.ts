import type { Enums } from '@/types/database';

export type TransactionKind = Enums<'transaction_kind'>;

export const TRANSACTION_KINDS: Record<TransactionKind, { label: string }> = {
  expense: { label: 'Gasto' },
  income: { label: 'Ingreso' },
  transfer: { label: 'Transferencia' },
};

export const TRANSACTION_KIND_ORDER: TransactionKind[] = ['expense', 'income', 'transfer'];

export const EXPENSE_CATEGORIES = [
  'Comida',
  'Súper',
  'Transporte',
  'Gasolina',
  'Hogar',
  'Servicios',
  'Salud',
  'Entretenimiento',
  'Compras',
  'Educación',
  'Suscripciones',
  'Viajes',
  'Otros',
] as const;

export const INCOME_CATEGORIES = [
  'Nómina',
  'Freelance',
  'Ventas',
  'Reembolso',
  'Inversiones',
  'Regalo',
  'Otros',
] as const;

/** Plans commonly offered by Mexican banks for "meses sin intereses". */
export const INSTALLMENT_OPTIONS = [3, 6, 9, 12, 18, 24] as const;
