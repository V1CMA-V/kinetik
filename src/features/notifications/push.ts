import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

import { useNotificationPermission } from './permission';
import { notificationsSupported } from './reminders';

/** Android channel of the pushes sent by the notify-partner Edge Function. */
export const PARTNER_CHANNEL_ID = 'partner-activity';

/** Token registered by this phone in this session, to remove it on sign-out. */
let registeredToken: string | null = null;

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

async function ensurePartnerChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(PARTNER_CHANNEL_ID, {
    name: 'Movimientos de tu pareja',
    description: 'Gastos e ingresos que registra tu pareja en cuentas compartidas',
    importance: AndroidImportance.HIGH,
  });
}

/**
 * Saves this phone's Expo push token for the signed-in user. Needs a physical
 * device, notification permission and the EAS projectId (`eas init`).
 */
async function registerPushToken() {
  if (!notificationsSupported || !Device.isDevice) return;
  const id = projectId();
  if (!id) {
    if (__DEV__) console.warn('[push] Missing EAS projectId: run `bunx eas-cli init`.');
    return;
  }

  await ensurePartnerChannel();
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  const { error } = await supabase.rpc('register_push_token', {
    p_token: token,
    p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
  });
  if (error) throw error;
  registeredToken = token;
}

/** Stops pushes to this phone (call before signing out). Never throws. */
export async function unregisterPushToken() {
  const token = registeredToken;
  registeredToken = null;
  if (!token) return;
  try {
    await supabase.rpc('unregister_push_token', { p_token: token });
  } catch {
    // Offline: the Edge Function drops the token once Expo reports it as unregistered.
  }
}

/**
 * Registers this phone for push notifications whenever there is a session and permission.
 * Takes the user id (instead of reading the auth store) because the auth store imports
 * this module to unregister on sign-out.
 */
export function usePushRegistration(userId: string | undefined) {
  const permission = useNotificationPermission();

  useEffect(() => {
    if (!userId || permission !== 'granted') return;
    registerPushToken().catch((error: unknown) => {
      if (__DEV__) console.warn('[push] Could not register the push token', error);
    });
  }, [userId, permission]);
}
