import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { getPermission, requestPermission, type PermissionState } from './reminders';

type PermissionStore = {
  /** `null` until the first check finishes. */
  permission: PermissionState | null;
  refresh: () => Promise<PermissionState>;
  request: () => Promise<PermissionState>;
};

/** Notification permission shared by the settings UI and the scheduler. */
export const useNotificationPermissionStore = create<PermissionStore>((set) => ({
  permission: null,
  refresh: async () => {
    const permission = await getPermission();
    set({ permission });
    return permission;
  },
  request: async () => {
    const permission = await requestPermission();
    set({ permission });
    return permission;
  },
}));

/**
 * Current notification permission, re-checked whenever the app returns to the
 * foreground (the user may have revoked it in the system settings).
 */
export function useNotificationPermission() {
  const permission = useNotificationPermissionStore((s) => s.permission);
  const refresh = useNotificationPermissionStore((s) => s.refresh);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return permission;
}
