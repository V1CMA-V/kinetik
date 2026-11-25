import { storage } from '@/lib/storage';

const SNAPSHOT_KEY = 'widget-snapshot';

/** Data the home-screen widget renders. Written by the app, read by the headless widget task. */
export type WidgetSnapshot = {
  /** Sum of `expense` transactions of `monthKey`. */
  monthSpent: number;
  /** `YYYY-MM` the amount belongs to. */
  monthKey: string;
  hideAmounts: boolean;
  /** Epoch ms. */
  updatedAt: number;
};

export function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function readWidgetSnapshot(): WidgetSnapshot | null {
  const raw = storage.getString(SNAPSHOT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WidgetSnapshot;
  } catch {
    return null;
  }
}

/** Stores the snapshot; returns `false` if nothing relevant changed. */
export function writeWidgetSnapshot(snapshot: WidgetSnapshot) {
  const prev = readWidgetSnapshot();
  if (
    prev &&
    prev.monthSpent === snapshot.monthSpent &&
    prev.monthKey === snapshot.monthKey &&
    prev.hideAmounts === snapshot.hideAmounts
  ) {
    return false;
  }
  storage.set(SNAPSHOT_KEY, JSON.stringify(snapshot));
  return true;
}

export function removeWidgetSnapshot() {
  storage.remove(SNAPSHOT_KEY);
}
