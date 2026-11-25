import { NativeTabs } from 'expo-router/native-tabs';
import { useEffect } from 'react';

import { useReminderScheduler } from '@/features/notifications/use-reminder-scheduler';
import { useProcessDueSubscriptions } from '@/features/subscriptions/api';
import { useThemeColors } from '@/theme/colors';
import { useWidgetSync } from '@/widgets/use-widget-sync';

export default function AppLayout() {
  const colors = useThemeColors();
  const { mutate: processDueSubscriptions } = useProcessDueSubscriptions();

  // Register subscription charges that came due since the last time the app was opened.
  useEffect(() => {
    processDueSubscriptions();
  }, [processDueSubscriptions]);

  // Local reminders for card payments and upcoming subscription charges.
  useReminderScheduler();

  // Keeps the Android home-screen widget (month spending) up to date.
  useWidgetSync();

  return (
    <NativeTabs
      backgroundColor={colors.card}
      indicatorColor={colors['accent-soft']}
      iconColor={{ default: colors['ink-muted'], selected: colors['accent-ink'] }}
      labelStyle={{
        default: { color: colors['ink-muted'], fontFamily: 'Inter' },
        selected: { color: colors['accent-ink'], fontFamily: 'Inter' },
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="accounts">
        <NativeTabs.Trigger.Label>Cuentas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'creditcard', selected: 'creditcard.fill' }}
          md="account_balance_wallet"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="transactions">
        <NativeTabs.Trigger.Label>Movimientos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'list.bullet.rectangle', selected: 'list.bullet.rectangle.fill' }}
          md="receipt_long"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="analysis">
        <NativeTabs.Trigger.Label>Análisis</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }}
          md="bar_chart"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md="account_circle"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
