import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { useCreditCardStatements } from '@/features/accounts/statements';
import { useSubscriptions } from '@/features/subscriptions/api';
import { useSettingsStore } from '@/stores/settings-store';

import { useNotificationPermission } from './permission';
import { planReminders, type PlanSubscription } from './plan';
import {
  applyReminderPlan,
  cancelAllReminders,
  notificationsSupported,
  setupNotificationHandler,
} from './reminders';

setupNotificationHandler();

const DEBOUNCE_MS = 1000;

/**
 * Keeps the scheduled local reminders in sync with card payments and
 * subscriptions. Mount once, inside the authenticated area.
 */
export function useReminderScheduler() {
  const enabled = useSettingsStore((s) => s.notificationsEnabled);
  const cardReminders = useSettingsStore((s) => s.cardReminders);
  const subscriptionReminders = useSettingsStore((s) => s.subscriptionReminders);
  const daysBefore = useSettingsStore((s) => s.reminderDaysBefore);
  const hideAmounts = useSettingsStore((s) => s.hideAmounts);
  const permission = useNotificationPermission();

  const cards = useCreditCardStatements();
  const subscriptions = useSubscriptions();

  // Re-plan when the app returns to the foreground (reminders may have fired meanwhile).
  const [focusTick, setFocusTick] = useState(0);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setFocusTick((t) => t + 1);
    });
    return () => sub.remove();
  }, []);

  const planSubscriptions = useMemo<PlanSubscription[] | undefined>(
    () =>
      subscriptions.data?.map((s) => ({
        id: s.id,
        name: s.name,
        amount: s.amount,
        next_charge_on: s.next_charge_on,
        is_active: s.is_active,
        accountName: s.account?.name ?? null,
      })),
    [subscriptions.data],
  );

  const active = enabled && permission === 'granted';
  // Only (re)schedule from complete data; on errors keep what is already scheduled.
  const ready =
    !cards.isPending && !cards.error && !subscriptions.error && planSubscriptions !== undefined;
  const cardPayments = cards.upcomingPayments;

  useEffect(() => {
    if (!notificationsSupported || permission === null) return;
    if (!active) {
      cancelAllReminders();
      return;
    }
    if (!ready) return;

    const timer = setTimeout(() => {
      const plan = planReminders({
        now: new Date(),
        daysBefore,
        hideAmounts,
        cardReminders,
        subscriptionReminders,
        cardPayments,
        subscriptions: planSubscriptions ?? [],
      });
      applyReminderPlan(plan);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [
    active,
    permission,
    ready,
    daysBefore,
    hideAmounts,
    cardReminders,
    subscriptionReminders,
    cardPayments,
    planSubscriptions,
    focusTick,
  ]);

  useReminderNavigation();
}

/** Tapping a reminder opens the related screen. */
function useReminderNavigation() {
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const kind = response.notification.request.content.data?.kind;
    if (kind !== 'card' && kind !== 'subscription') return;
    // Handle each tap once (the layout remounts after signing in again).
    Notifications.clearLastNotificationResponse();
    router.navigate(kind === 'card' ? '/accounts' : '/transactions/subscriptions');
  }, [response]);
}
