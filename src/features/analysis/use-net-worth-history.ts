import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useAccounts } from '@/features/accounts/api';
import { type NetWorthPoint, netWorthAt } from '@/features/accounts/net-worth';
import type { Scope } from '@/features/household/scope';
import { transactionKeys } from '@/features/transactions/api';
import { addMonths, monthRange, today } from '@/lib/date';
import { fetchAllPages } from '@/lib/fetch-all-pages';
import { supabase } from '@/lib/supabase';

import { HISTORY_MONTHS } from './use-spending-history';

export type NetWorthMonth = {
  /** Month start (`YYYY-MM-01`). */
  month: string;
  /** End of the month, or today for the current one; `null` for future months and before you started. */
  point: NetWorthPoint | null;
};

/**
 * Net worth at the end of the 6 months that end at `month` (oldest first), rebuilt
 * from today's balances. With a personal / shared `scope`, only those accounts count.
 */
export function useNetWorthHistory(month: string, scope: Scope = 'all') {
  const now = today();
  const months = useMemo(
    () =>
      Array.from({ length: HISTORY_MONTHS }, (_, i) => addMonths(month, i - (HISTORY_MONTHS - 1))),
    [month],
  );
  const since = monthRange(months[0]).end;

  const accounts = useAccounts();
  // Under `transactionKeys.all` so money mutations and realtime updates refresh it.
  const movements = useQuery({
    queryKey: [...transactionKeys.all, 'net-worth', since],
    queryFn: () =>
      fetchAllPages((from, to) =>
        supabase
          .from('transactions')
          .select('id, kind, amount, account_id, to_account_id, occurred_on')
          .gt('occurred_on', since)
          .order('occurred_on', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
  });

  const data = useMemo((): NetWorthMonth[] | undefined => {
    if (!accounts.data || !movements.data) return undefined;
    const scoped = accounts.data.filter((a) =>
      scope === 'all' ? true : scope === 'shared' ? !!a.household_id : !a.household_id,
    );
    if (!scoped.length) return months.map((m) => ({ month: m, point: null }));

    // History starts when the first account was added (or a movement backdated before it).
    const ids = new Set(scoped.map((a) => a.id));
    const firstDay = [
      ...scoped.map((a) => a.created_at.slice(0, 10)),
      ...movements.data
        .filter((t) => ids.has(t.account_id) || (!!t.to_account_id && ids.has(t.to_account_id)))
        .map((t) => t.occurred_on),
    ].sort()[0];

    const dates = months.map((m) => {
      const { start, end } = monthRange(m);
      return start > now || end < firstDay ? null : end < now ? end : now;
    });
    const points = netWorthAt(
      scoped,
      movements.data,
      dates.filter((d): d is string => d !== null),
    );
    const byDate = new Map(points.map((p) => [p.date, p]));
    return months.map((m, i) => ({
      month: m,
      point: dates[i] ? (byDate.get(dates[i]) ?? null) : null,
    }));
  }, [accounts.data, movements.data, scope, months, now]);

  return {
    data,
    isPending: accounts.isPending || movements.isPending,
    error: accounts.error ?? movements.error ?? null,
    isRefetching: accounts.isRefetching || movements.isRefetching,
    refetch: () => {
      accounts.refetch();
      movements.refetch();
    },
  };
}
