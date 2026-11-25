import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import { planSignature, type Reminder } from './plan';

export const REMINDER_CHANNEL_ID = 'reminders';

/** Local notifications only exist on the native apps. */
export const notificationsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

const REMINDER_ID_PREFIXES = ['card:', 'sub:'];
const isReminderId = (id: string) => REMINDER_ID_PREFIXES.some((p) => id.startsWith(p));

export type PermissionState = 'granted' | 'denied' | 'undetermined';

function toPermissionState(p: Notifications.NotificationPermissionsStatus): PermissionState {
  if (p.granted) return 'granted';
  const ios = p.ios?.status;
  if (ios === IosAuthorizationStatus.PROVISIONAL || ios === IosAuthorizationStatus.EPHEMERAL) {
    return 'granted';
  }
  return p.status === 'undetermined' ? 'undetermined' : 'denied';
}

export async function getPermission(): Promise<PermissionState> {
  if (!notificationsSupported) return 'denied';
  try {
    return toPermissionState(await Notifications.getPermissionsAsync());
  } catch {
    return 'denied';
  }
}

export async function requestPermission(): Promise<PermissionState> {
  if (!notificationsSupported) return 'denied';
  try {
    // On Android 13+ the prompt only shows once a channel exists.
    await ensureChannel();
    return toPermissionState(await Notifications.requestPermissionsAsync());
  } catch {
    return 'denied';
  }
}

let handlerSet = false;

/** Show reminders (banner + notification list) while the app is in the foreground. */
export function setupNotificationHandler() {
  if (!notificationsSupported || handlerSet) return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Recordatorios',
    description: 'Pagos de tarjeta y cobros de suscripciones',
    importance: AndroidImportance.HIGH,
  });
}

async function cancelScheduledReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => isReminderId(n.identifier))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** Signature of the plan currently scheduled; `null` = unknown (reconcile on next apply). */
let appliedSignature: string | null = null;
/** Serializes apply/cancel calls so they never interleave. */
let queue: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>) {
  queue = queue.then(task).catch(() => {
    // Leave the state unknown so the next apply starts from scratch.
    appliedSignature = null;
  });
  return queue;
}

/** Replaces the scheduled reminders with `plan` (no-op if it didn't change). */
export function applyReminderPlan(plan: Reminder[]) {
  if (!notificationsSupported) return Promise.resolve();
  const signature = planSignature(plan);
  return enqueue(async () => {
    if (signature === appliedSignature) return;
    appliedSignature = null;
    await cancelScheduledReminders();
    if (plan.length > 0) await ensureChannel();
    for (const r of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: {
          title: r.title,
          body: r.body,
          data: { kind: r.kind, targetId: r.targetId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: r.date,
          channelId: REMINDER_CHANNEL_ID,
        },
      });
    }
    appliedSignature = signature;
  });
}

/** Cancels every scheduled reminder (sign-out, reminders turned off, permission revoked). */
export function cancelAllReminders() {
  return applyReminderPlan([]);
}
