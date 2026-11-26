import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage';

type ColorSchemePreference = 'system' | 'light' | 'dark';

export const REMINDER_DAYS_OPTIONS = [1, 2, 3, 5, 7] as const;
export type ReminderDays = (typeof REMINDER_DAYS_OPTIONS)[number];

type SettingsState = {
  /** The welcome screens were shown (or skipped) once; never show them again. */
  hasSeenOnboarding: boolean;
  completeOnboarding: () => void;
  colorScheme: ColorSchemePreference;
  setColorScheme: (value: ColorSchemePreference) => void;
  /** Mask money amounts ("$ ••••") across the app. */
  hideAmounts: boolean;
  setHideAmounts: (value: boolean) => void;
  /** Require Face ID / fingerprint when opening the app. */
  biometricLock: boolean;
  setBiometricLock: (value: boolean) => void;
  /** Master switch for local reminders (card payments, subscriptions). */
  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;
  cardReminders: boolean;
  setCardReminders: (value: boolean) => void;
  subscriptionReminders: boolean;
  setSubscriptionReminders: (value: boolean) => void;
  /** The day before and the day of each payday (only with an income profile). */
  paydayReminders: boolean;
  setPaydayReminders: (value: boolean) => void;
  /** How many days before a due date / charge to remind. */
  reminderDaysBefore: ReminderDays;
  setReminderDaysBefore: (value: ReminderDays) => void;
  /** Last used account / categories, preselected when adding a movement. */
  lastAccountId: string | null;
  lastCategories: { expense?: string; income?: string };
  rememberTransaction: (entry: {
    kind: 'expense' | 'income' | 'transfer';
    accountId: string;
    category: string | null;
  }) => void;
  /** Accounts turned on/off by hand in "Pagos del mes" (the rest use the per-type default). */
  paymentFunds: Record<string, boolean>;
  setPaymentFund: (accountId: string, included: boolean) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      completeOnboarding: () => set({ hasSeenOnboarding: true }),
      colorScheme: 'system',
      setColorScheme: (colorScheme) => set({ colorScheme }),
      hideAmounts: false,
      setHideAmounts: (hideAmounts) => set({ hideAmounts }),
      biometricLock: false,
      setBiometricLock: (biometricLock) => set({ biometricLock }),
      notificationsEnabled: false,
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      cardReminders: true,
      setCardReminders: (cardReminders) => set({ cardReminders }),
      subscriptionReminders: true,
      setSubscriptionReminders: (subscriptionReminders) => set({ subscriptionReminders }),
      // Older persisted state lacks it: persist's default shallow merge keeps this default.
      paydayReminders: true,
      setPaydayReminders: (paydayReminders) => set({ paydayReminders }),
      reminderDaysBefore: 3,
      setReminderDaysBefore: (reminderDaysBefore) => set({ reminderDaysBefore }),
      lastAccountId: null,
      lastCategories: {},
      rememberTransaction: ({ kind, accountId, category }) =>
        set((state) => ({
          lastAccountId: accountId,
          lastCategories:
            kind === 'transfer' || !category
              ? state.lastCategories
              : { ...state.lastCategories, [kind]: category },
        })),
      paymentFunds: {},
      setPaymentFund: (accountId, included) =>
        set((state) => ({ paymentFunds: { ...state.paymentFunds, [accountId]: included } })),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
