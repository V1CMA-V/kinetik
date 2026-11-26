import { useMemo } from 'react';

import { useIncomeProfile } from '@/features/income/api';
import { today } from '@/lib/date';
import { useSettingsStore } from '@/stores/settings-store';

import { useAccounts } from './api';
import { DEFAULT_CURRENCY } from './constants';
import { computePaymentCoverage } from './payment-coverage';
import { useCreditCardStatements } from './statements';

/** Card payments due vs. the money in the accounts chosen to pay them (and your fixed pay). */
export function usePaymentCoverage() {
  const accounts = useAccounts();
  const statements = useCreditCardStatements();
  const income = useIncomeProfile();
  const overrides = useSettingsStore((s) => s.paymentFunds);
  const setPaymentFund = useSettingsStore((s) => s.setPaymentFund);
  const now = today();
  const incomeProfile = income.data ?? null;

  const coverage = useMemo(
    () =>
      computePaymentCoverage({
        cards: statements.cardSummaries,
        accounts: accounts.data ?? [],
        overrides,
        currency: DEFAULT_CURRENCY,
        income: incomeProfile,
        today: now,
      }),
    [statements.cardSummaries, accounts.data, overrides, incomeProfile, now],
  );

  return {
    coverage,
    setPaymentFund,
    /** Whether you've set an income profile (only known once it loaded). */
    hasIncome: incomeProfile != null,
    /** False while the income profile is loading or failed, so the prompt to add one isn't shown. */
    incomeKnown: income.isSuccess,
    isPending: accounts.isPending || statements.isPending,
    isRefetching: accounts.isRefetching,
    error: accounts.error ?? statements.error,
    refetch: () => {
      accounts.refetch();
      statements.refetch();
      income.refetch();
    },
  };
}
