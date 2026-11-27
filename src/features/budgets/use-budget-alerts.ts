import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useNotificationPermission } from '@/features/notifications/permission';
import { notificationsSupported, presentNow } from '@/features/notifications/reminders';
import { today } from '@/lib/date';
import { useSettingsStore } from '@/stores/settings-store';

import { planBudgetAlerts, recordBudgetAlerts } from './alerts';
import { useBudgetProgress } from './api';

/**
 * Shows a notification when a budgeted category reaches 80% / 100% of this
 * month's budget (once per month, category and threshold). Works while the app
 * is open: the partner's movements arrive through realtime and refresh the
 * progress. Mount once, inside the authenticated area.
 */
export function useBudgetAlerts() {
  const enabled = useSettingsStore((s) => s.notificationsEnabled);
  const budgetAlerts = useSettingsStore((s) => s.budgetAlerts);
  const hideAmounts = useSettingsStore((s) => s.hideAmounts);
  const permission = useNotificationPermission();

  // Re-read the date when the app returns to the foreground (the month may have changed).
  const [day, setDay] = useState(today);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setDay(today());
    });
    return () => sub.remove();
  }, []);

  const progress = useBudgetProgress(day);
  const categories = progress.data?.categories;
  const active = notificationsSupported && enabled && permission === 'granted' && budgetAlerts;

  useEffect(() => {
    if (!active || !categories || progress.error) return;
    const month = day.slice(0, 7);
    const { budgetAlertsSent, setBudgetAlertsSent } = useSettingsStore.getState();
    const alerts = planBudgetAlerts({ month, categories, sent: budgetAlertsSent, hideAmounts });
    if (alerts.length === 0) return;

    // Record first: a failing (or repeated) presentation must never spam the same alert.
    setBudgetAlertsSent(recordBudgetAlerts(budgetAlertsSent, month, alerts));
    for (const a of alerts) {
      presentNow({
        id: a.id,
        title: a.title,
        body: a.body,
        data: { kind: 'budget', budgetId: a.budgetId },
      }).catch(() => {
        // Best effort: the alert stays recorded as sent.
      });
    }
  }, [active, categories, progress.error, day, hideAmounts]);
}
