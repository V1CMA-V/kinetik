import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { useCreditCardStatements } from '@/features/accounts/statements';
import { useIncomeProfile } from '@/features/income/api';
import { useSubscriptions } from '@/features/subscriptions/api';
import { useSettingsStore } from '@/stores/settings-store';

import { useNotificationPermission } from './permission';
import { type PaydayIncomeParams, planReminders, type PlanSubscription } from './plan';
import {
  applyReminderPlan,
  cancelAllReminders,
  notificationsSupported,
  setupNotificationHandler,
} from './reminders';

setupNotificationHandler();

const DEBOUNCE_MS = 1000;

/**
 * Keeps the scheduled local reminders in sync with card payments,
 * subscriptions and paydays. Mount once, inside the authenticated area.
 */
export function useReminderScheduler() {
  const enabled = useSettingsStore((s) => s.notificationsEnabled);
  const cardReminders = useSettingsStore((s) => s.cardReminders);
  const subscriptionReminders = useSettingsStore((s) => s.subscriptionReminders);
  const paydayReminders = useSettingsStore((s) => s.paydayReminders);
  const daysBefore = useSettingsStore((s) => s.reminderDaysBefore);
  const hideAmounts = useSettingsStore((s) => s.hideAmounts);
  const permission = useNotificationPermission();

  const cards = useCreditCardStatements();
  const subscriptions = useSubscriptions();
  const incomeProfile = useIncomeProfile();

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
    !cards.isPending &&
    !cards.error &&
    !subscriptions.error &&
    planSubscriptions !== undefined &&
    // Income is optional: a failed load (or refetch) never blocks card/subscription reminders.
    (incomeProfile.data !== undefined || incomeProfile.isError);
  const cardPayments = cards.upcomingPayments;
  const income = incomeProfile.data ?? null;

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
        paydayReminders,
        cardPayments,
        subscriptions: planSubscriptions ?? [],
        income,
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
    paydayReminders,
    cardPayments,
    planSubscriptions,
    income,
    focusTick,
  ]);

  useReminderNavigation();
}

/** Tapping a reminder opens the related screen. */
function useReminderNavigation() {
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const data = response.notification.request.content.data;
    const kind = data?.kind;
    if (
      kind !== 'card' &&
      kind !== 'subscription' &&
      kind !== 'payday' &&
      kind !== 'partner-transaction' &&
      kind !== 'partner-goal'
    ) {
      return;
    }
    // Handle each tap once (the layout remounts after signing in again).
    Notifications.clearLastNotificationResponse();
    if (kind === 'partner-transaction') {
      // Push from the notify-partner Edge Function: open the movement.
      if (typeof data?.transactionId === 'string') {
        router.navigate({ pathname: '/transactions/[id]', params: { id: data.transactionId } });
      }
      return;
    }
    if (kind === 'partner-goal') {
      // Push from the notify-partner Edge Function: open the shared goal.
      if (typeof data?.goalId === 'string') {
        router.navigate({ pathname: '/accounts/goals/[id]', params: { id: data.goalId } });
      }
      return;
    }
    if (kind === 'payday') {
      // On the payday: register the income prefilled. The day before: review the payments.
      const income = toIncomeParams(data?.income);
      // `push` so a fresh form opens even if this screen is already mounted.
      if (income) router.push({ pathname: '/transactions/new', params: income });
      else router.navigate('/accounts/payments');
      return;
    }
    router.navigate(kind === 'card' ? '/accounts' : '/transactions/subscriptions');
  }, [response]);
}

/** Reads the prefill stored in a payday notification (untyped data from the OS). */
function toIncomeParams(value: unknown): PaydayIncomeParams | null {
  if (!value || typeof value !== 'object') return null;
  const { amount, category, accountId } = value as Record<string, unknown>;
  if (typeof amount !== 'string' || typeof category !== 'string') return null;
  return {
    kind: 'income',
    amount,
    category,
    ...(typeof accountId === 'string' ? { accountId } : {}),
  };
}
