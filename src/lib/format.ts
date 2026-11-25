const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(amount: number, currency = 'MXN') {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency });
    formatters.set(currency, formatter);
  }
  return formatter.format(amount);
}
