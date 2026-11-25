import * as QuickActions from 'expo-quick-actions';
import { router, useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { TRANSACTION_KIND_ORDER, type TransactionKind } from '@/features/transactions/constants';
import { useAuthStore } from '@/stores/auth-store';

/** Window in which a repeated action (same id) is treated as a duplicate delivery. */
const DEDUPE_MS = 1500;

const ITEMS: QuickActions.Action[] = [
  {
    id: 'new-expense',
    title: 'Nuevo gasto',
    subtitle: 'Registra un gasto',
    icon: Platform.OS === 'ios' ? 'symbol:minus.circle' : null,
    params: { kind: 'expense' },
  },
  {
    id: 'new-income',
    title: 'Nuevo ingreso',
    subtitle: 'Registra un ingreso',
    icon: Platform.OS === 'ios' ? 'symbol:plus.circle' : null,
    params: { kind: 'income' },
  },
  {
    id: 'new-transfer',
    title: 'Transferencia',
    subtitle: 'Mueve dinero entre tus cuentas',
    icon: Platform.OS === 'ios' ? 'symbol:arrow.left.arrow.right.circle' : null,
    params: { kind: 'transfer' },
  },
];

// Module-level so remounts (e.g. sign-out → sign-in) don't replay the launch action.
let initialHandled = false;
let lastHandled: { id: string; at: number } | null = null;

function isTransactionKind(value: unknown): value is TransactionKind {
  return TRANSACTION_KIND_ORDER.includes(value as TransactionKind);
}

function openAction(action: QuickActions.Action) {
  const kind = action.params?.kind;
  if (!isTransactionKind(kind)) return;
  // Signed out: the shortcut just opens the app (sign-in screen).
  if (!useAuthStore.getState().session) return;

  // iOS may deliver the launch shortcut both as `initial` and as an event.
  const now = Date.now();
  if (lastHandled?.id === action.id && now - lastHandled.at < DEDUPE_MS) return;
  lastHandled = { id: action.id, at: now };

  // Defer to the next tick so the navigator has committed its state.
  setTimeout(() => router.push({ pathname: '/transactions/new', params: { kind } }));
}

/**
 * Home-screen icon shortcuts (long-press the app icon). Mounted once in the
 * root layout, after auth finished loading.
 *
 * - Shortcuts are registered only while signed in and cleared on sign-out.
 * - Handles the shortcut that cold-started the app (`QuickActions.initial`)
 *   once the root navigator is ready, plus shortcuts used while running.
 */
export function QuickActionsHandler() {
  const hasSession = useAuthStore((s) => !!s.session);
  const isNavigationReady = !!useRootNavigationState()?.key;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    QuickActions.setItems(hasSession ? ITEMS : []).catch(() => {
      // Not supported / no foreground activity: shortcuts are a nice-to-have.
    });
  }, [hasSession]);

  useEffect(() => {
    if (Platform.OS === 'web' || !isNavigationReady) return;

    if (!initialHandled) {
      initialHandled = true;
      if (QuickActions.initial) openAction(QuickActions.initial);
    }

    const subscription = QuickActions.addListener(openAction);
    return () => subscription.remove();
  }, [isNavigationReady]);

  return null;
}
