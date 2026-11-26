import { useMemo } from 'react';

import { useSettingsStore } from '@/stores/settings-store';

import { useAccounts } from './api';
import { DEFAULT_CURRENCY } from './constants';
import { computePaymentCoverage } from './payment-coverage';
import { useCreditCardStatements } from './statements';

/** Card payments due vs. the money in the accounts chosen to pay them. */
export function usePaymentCoverage() {
  const accounts = useAccounts();
  const statements = useCreditCardStatements();
  const overrides = useSettingsStore((s) => s.paymentFunds);
  const setPaymentFund = useSettingsStore((s) => s.setPaymentFund);

  const coverage = useMemo(
    () =>
      computePaymentCoverage({
        cards: statements.cardSummaries,
        accounts: accounts.data ?? [],
        overrides,
        currency: DEFAULT_CURRENCY,
      }),
    [statements.cardSummaries, accounts.data, overrides],
  );

  return {
    coverage,
    setPaymentFund,
    isPending: accounts.isPending || statements.isPending,
    isRefetching: accounts.isRefetching,
    error: accounts.error ?? statements.error,
    refetch: () => {
      accounts.refetch();
      statements.refetch();
    },
  };
}
