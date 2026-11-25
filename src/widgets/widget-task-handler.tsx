import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { renderQuickAddWidget } from './quick-add-widget';
import { QUICK_ADD_WIDGET } from './update';

/**
 * Headless task (no React tree, maybe no Supabase session): renders from the
 * MMKV snapshot written by `useWidgetSync`. Clicks use OPEN_URI, handled natively.
 */
export async function widgetTaskHandler({
  widgetInfo,
  widgetAction,
  renderWidget,
}: WidgetTaskHandlerProps) {
  if (widgetInfo.widgetName !== QUICK_ADD_WIDGET) return;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      renderWidget(renderQuickAddWidget(widgetInfo));
      break;
    default:
      break;
  }
}
