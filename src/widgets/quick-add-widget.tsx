import { FlexWidget, TextWidget, type WidgetInfo } from 'react-native-android-widget';

import { formatMoney } from '@/lib/format';

import { currentMonthKey, readWidgetSnapshot, type WidgetSnapshot } from './snapshot';

// Widgets are rendered to Android RemoteViews: only the library's *Widget
// primitives work here (no RN views, no NativeWind, no hooks).

const BRAND = '#208AEF';
const APP_URI = 'kinetik://';
const HIDDEN_AMOUNT = '$ ••••';

type Theme = { background: `#${string}`; text: `#${string}`; muted: `#${string}` };

const LIGHT: Theme = { background: '#FFFFFF', text: '#111827', muted: '#6B7280' };
const DARK: Theme = { background: '#1C1C1E', text: '#F3F4F6', muted: '#9CA3AF' };

function summaryText(snapshot: WidgetSnapshot | null) {
  if (!snapshot || snapshot.monthKey !== currentMonthKey()) return 'Abre Kinetik para actualizar';
  const amount = snapshot.hideAmounts ? HIDDEN_AMOUNT : formatMoney(snapshot.monthSpent);
  return `Gastado este mes: ${amount}`;
}

function ActionButton({ label, kind, compact }: { label: string; kind: string; compact: boolean }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: `kinetik://transactions/new?kind=${kind}` }}
      accessibilityLabel={label}
      style={{
        flex: 1,
        height: 'match_parent',
        backgroundColor: BRAND,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <TextWidget
        text={label}
        style={{ fontSize: compact ? 14 : 16, fontWeight: 'bold', color: '#FFFFFF' }}
      />
    </FlexWidget>
  );
}

function QuickAddWidget({ theme, height }: { theme: Theme; height: number }) {
  const compact = height < 100;
  const summary = summaryText(readWidgetSnapshot());

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: APP_URI }}
      accessibilityLabel="Abrir Kinetik"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: theme.background,
        borderRadius: 20,
        padding: compact ? 8 : 12,
        flexGap: compact ? 4 : 8,
      }}
    >
      {compact ? null : (
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'column' }}>
          <TextWidget text="Kinetik" style={{ fontSize: 12, fontWeight: 'bold', color: BRAND }} />
          <TextWidget
            text={summary}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 15, fontWeight: '600', color: theme.text }}
          />
        </FlexWidget>
      )}
      <FlexWidget style={{ flex: 1, width: 'match_parent', flexDirection: 'row', flexGap: 8 }}>
        <ActionButton label="+ Gasto" kind="expense" compact={compact} />
        <ActionButton label="+ Ingreso" kind="income" compact={compact} />
      </FlexWidget>
      {compact ? (
        <TextWidget
          text={summary}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 11, color: theme.muted }}
        />
      ) : null}
    </FlexWidget>
  );
}

/** Light + dark variants; the launcher picks one based on the system theme. */
export function renderQuickAddWidget(info: Pick<WidgetInfo, 'height'>) {
  return {
    light: <QuickAddWidget theme={LIGHT} height={info.height} />,
    dark: <QuickAddWidget theme={DARK} height={info.height} />,
  };
}
