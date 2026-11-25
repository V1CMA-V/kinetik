import { useCallback } from 'react';

import { formatMoney } from '@/lib/format';
import { useSettingsStore } from '@/stores/settings-store';

export const HIDDEN_AMOUNT = '$ ••••';

/**
 * Money formatter that respects the "Ocultar montos" setting. Use it in
 * components instead of calling `formatMoney` directly, so they re-render when
 * the setting changes.
 */
export function useFormatMoney() {
  const hidden = useSettingsStore((s) => s.hideAmounts);
  return useCallback(
    (amount: number, currency?: string) => (hidden ? HIDDEN_AMOUNT : formatMoney(amount, currency)),
    [hidden],
  );
}
