const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(amount: number, currency = 'MXN') {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency });
    formatters.set(currency, formatter);
  }
  return formatter.format(amount);
}

const MAX_INTEGER_DIGITS = 12;

const groupThousands = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/**
 * Formats what the user types in an amount field as `1,234.56` (MXN style):
 * thousands separators, at most two decimals and no leading zeros. Idempotent,
 * so it also formats stored values like `1234.50`. A trailing comma typed on
 * keyboards whose decimal key is `,` is read as the decimal point.
 */
export function formatAmountInput(text: string, { allowNegative = false } = {}) {
  const negative = allowNegative && text.trim().startsWith('-');
  let clean = text.replace(/[^\d.,]/g, '');
  if (clean.endsWith(',') && !clean.includes('.')) clean = `${clean.slice(0, -1)}.`;
  clean = clean.replace(/,/g, '');

  const [rawInteger = '', ...decimalParts] = clean.split('.');
  const hasDecimal = decimalParts.length > 0;
  const decimals = decimalParts.join('').slice(0, 2);
  let integer = rawInteger.replace(/^0+(?=\d)/, '').slice(0, MAX_INTEGER_DIGITS);
  if (!integer && hasDecimal) integer = '0';

  const body = `${groupThousands(integer)}${hasDecimal ? `.${decimals}` : ''}`;
  return `${negative ? '-' : ''}${body}`;
}

/** Completes a typed amount to two decimals (`1,234.5` → `1,234.50`). Empty stays empty. */
export function finalizeAmountInput(text: string, options?: { allowNegative?: boolean }) {
  const formatted = formatAmountInput(text, options);
  const sign = formatted.startsWith('-') ? '-' : '';
  const body = formatted.slice(sign.length);
  if (!body) return '';
  const [integer, decimals = ''] = body.split('.');
  return `${sign}${integer || '0'}.${decimals.padEnd(2, '0')}`;
}
