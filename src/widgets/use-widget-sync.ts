import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useMonthTransactions } from '@/features/transactions/api';
import { today } from '@/lib/date';
import { useSettingsStore } from '@/stores/settings-store';

import { currentMonthKey } from './snapshot';
import { saveWidgetSnapshot } from './update';

/**
 * Keeps the home-screen widget snapshot (month spending + "Ocultar montos") in sync.
 * Mount once inside the signed-in layout.
 */
export function useWidgetSync() {
  const { data } = useMonthTransactions(today());
  const hideAmounts = useSettingsStore((s) => s.hideAmounts);
  const monthSpent = data?.reduce((sum, t) => (t.kind === 'expense' ? sum + t.amount : sum), 0);

  useEffect(() => {
    if (Platform.OS !== 'android' || monthSpent === undefined) return;
    saveWidgetSnapshot({
      monthSpent,
      monthKey: currentMonthKey(),
      hideAmounts,
      updatedAt: Date.now(),
    });
  }, [monthSpent, hideAmounts]);
}
