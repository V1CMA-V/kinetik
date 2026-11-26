import { finalizeAmountInput, formatAmountInput, formatMoney } from '@/lib/format';

describe('formatMoney', () => {
  it('formats MXN by default', () => {
    expect(formatMoney(1234.5)).toBe('$1,234.50');
    expect(formatMoney(-50)).toBe('-$50.00');
    expect(formatMoney(0)).toBe('$0.00');
  });

  // Intl separates the code with a non-breaking space.
  it('formats other currencies with their code', () => {
    expect(formatMoney(1234.5, 'USD')).toBe('USD 1,234.50');
  });
});

describe('formatAmountInput', () => {
  it('groups thousands and keeps up to two decimals', () => {
    expect(formatAmountInput('1234')).toBe('1,234');
    expect(formatAmountInput('1234567.891')).toBe('1,234,567.89');
    expect(formatAmountInput('1,2345')).toBe('12,345');
    expect(formatAmountInput('1234.50')).toBe('1,234.50');
  });

  it('cleans what the user types', () => {
    expect(formatAmountInput('$ 007')).toBe('7');
    expect(formatAmountInput('.5')).toBe('0.5');
    expect(formatAmountInput('1.2.3')).toBe('1.23');
    expect(formatAmountInput('')).toBe('');
  });

  it('reads a trailing comma as the decimal point', () => {
    expect(formatAmountInput('12,')).toBe('12.');
    expect(formatAmountInput('1,234,')).toBe('1,234.');
  });

  it('keeps the sign only when allowed', () => {
    expect(formatAmountInput('-1500')).toBe('1,500');
    expect(formatAmountInput('-1500', { allowNegative: true })).toBe('-1,500');
    expect(formatAmountInput('-', { allowNegative: true })).toBe('-');
  });
});

describe('finalizeAmountInput', () => {
  it('pads to two decimals', () => {
    expect(finalizeAmountInput('1,234')).toBe('1,234.00');
    expect(finalizeAmountInput('1,234.5')).toBe('1,234.50');
    expect(finalizeAmountInput('12.')).toBe('12.00');
    expect(finalizeAmountInput('-20', { allowNegative: true })).toBe('-20.00');
  });

  it('leaves empty input empty', () => {
    expect(finalizeAmountInput('')).toBe('');
    expect(finalizeAmountInput('-', { allowNegative: true })).toBe('');
  });
});
