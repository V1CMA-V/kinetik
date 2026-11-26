import { formatMoney } from '@/lib/format';

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
