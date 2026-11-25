/** Local-date helpers. Dates are exchanged with the DB as `YYYY-MM-DD` strings. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses `YYYY-MM-DD` as a local date (avoids the UTC shift of `new Date(iso)`). */
export function parseISODate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today() {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number) {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** First and last day of the month that contains `iso`. */
export function monthRange(iso: string) {
  const date = parseISODate(iso);
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

export function addMonths(iso: string, months: number) {
  const date = parseISODate(iso);
  return toISODate(new Date(date.getFullYear(), date.getMonth() + months, 1));
}

/** Whole calendar months between two dates (b - a). */
export function monthsBetween(a: string, b: string) {
  const da = parseISODate(a);
  const db = parseISODate(b);
  return (db.getFullYear() - da.getFullYear()) * 12 + db.getMonth() - da.getMonth();
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const monthFormatter = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
const dayFormatter = new Intl.DateTimeFormat('es-MX', {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
});

export function formatMonth(iso: string) {
  return capitalize(monthFormatter.format(parseISODate(iso)));
}

/** "Hoy", "Ayer" or e.g. "Lunes, 24 nov". */
export function formatDay(iso: string) {
  const now = today();
  if (iso === now) return 'Hoy';
  if (iso === addDays(now, -1)) return 'Ayer';
  return capitalize(dayFormatter.format(parseISODate(iso)));
}

const shortDateFormatter = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });

/** E.g. "23 dic". */
export function formatShortDate(iso: string) {
  return shortDateFormatter.format(parseISODate(iso));
}
