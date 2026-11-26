import { useMemo } from 'react';

import { addMonths, today } from '@/lib/date';

import { useMonthSpending } from './api';
import { spendingByCategory } from './suggestions';

/**
 * Spending per category over the last 3 full months (the current one is left out),
 * for the 50/30/20 suggestions. Reuses the per-month queries of home and analysis.
 */
export function useRecentSpending() {
  const now = today();
  const m1 = useMonthSpending(addMonths(now, -1));
  const m2 = useMonthSpending(addMonths(now, -2));
  const m3 = useMonthSpending(addMonths(now, -3));

  const data = useMemo(
    () =>
      m1.data && m2.data && m3.data
        ? spendingByCategory([m1.data.byCategory, m2.data.byCategory, m3.data.byCategory])
        : undefined,
    [m1.data, m2.data, m3.data],
  );

  return { data, isPending: m1.isPending || m2.isPending || m3.isPending };
}
