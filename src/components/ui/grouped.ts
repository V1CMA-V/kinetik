/**
 * Classes for one row of an inset grouped list: rows share one card, split by
 * hairlines, instead of each row being its own bordered card.
 */
export function groupedRowClass(index: number, count: number) {
  const first = index === 0;
  const last = index === count - 1;
  return [
    'border-x border-line bg-card',
    first ? 'rounded-t-card border-t' : '',
    last ? 'rounded-b-card border-b' : 'border-b',
  ].join(' ');
}
