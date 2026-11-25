import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { renderQuickAddWidget } from './quick-add-widget';
import { removeWidgetSnapshot, writeWidgetSnapshot, type WidgetSnapshot } from './snapshot';

export const QUICK_ADD_WIDGET = 'QuickAdd';

/** Re-renders every QuickAdd widget on the home screen from the stored snapshot. */
export async function refreshQuickAddWidget() {
  if (Platform.OS !== 'android') return;
  try {
    await requestWidgetUpdate({ widgetName: QUICK_ADD_WIDGET, renderWidget: renderQuickAddWidget });
  } catch (error) {
    // Native module missing (e.g. a dev build made before installing the lib).
    console.warn('[widgets] update failed', error);
  }
}

export function saveWidgetSnapshot(snapshot: WidgetSnapshot) {
  if (Platform.OS !== 'android') return;
  if (writeWidgetSnapshot(snapshot)) void refreshQuickAddWidget();
}

/** Call on sign-out so the widget stops showing the previous user's data. */
export function clearWidgetSnapshot() {
  if (Platform.OS !== 'android') return;
  removeWidgetSnapshot();
  void refreshQuickAddWidget();
}
