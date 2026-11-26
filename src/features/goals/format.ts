import { parseISODate } from '@/lib/date';

const monthYear = new Intl.DateTimeFormat('es-MX', { month: 'short', year: 'numeric' });

/** E.g. "dic 2027". */
export function formatTargetMonth(iso: string) {
  return monthYear.format(parseISODate(iso)).replace('.', '');
}
