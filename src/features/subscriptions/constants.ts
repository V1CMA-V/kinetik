import type { Enums } from '@/types/database';

export type BillingFrequency = Enums<'billing_frequency'>;

export const FREQUENCIES: Record<
  BillingFrequency,
  { label: string; short: string; monthsPerCharge: number }
> = {
  monthly: { label: 'Mensual', short: 'mes', monthsPerCharge: 1 },
  quarterly: { label: 'Trimestral', short: 'trimestre', monthsPerCharge: 3 },
  yearly: { label: 'Anual', short: 'año', monthsPerCharge: 12 },
};

export const FREQUENCY_ORDER: BillingFrequency[] = ['monthly', 'quarterly', 'yearly'];

/** Quick picks; tapping one fills the name. */
export const POPULAR_SERVICES = [
  'Spotify',
  'Netflix',
  'Amazon Prime',
  'Disney+',
  'Max',
  'YouTube Premium',
  'Apple Music',
  'iCloud+',
  'Google One',
  'ChatGPT Plus',
  'Xbox Game Pass',
  'PlayStation Plus',
  'Crunchyroll',
  'Mercado Libre Nivel',
  'Gimnasio',
] as const;
