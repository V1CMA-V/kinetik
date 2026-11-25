import { NativeTabs } from 'expo-router/native-tabs';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';

import { useProcessDueSubscriptions } from '@/features/subscriptions/api';

export default function AppLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { mutate: processDueSubscriptions } = useProcessDueSubscriptions();

  // Register subscription charges that came due since the last time the app was opened.
  useEffect(() => {
    processDueSubscriptions();
  }, [processDueSubscriptions]);

  return (
    <NativeTabs
      backgroundColor={isDark ? '#0A0A0A' : '#FFFFFF'}
      indicatorColor={isDark ? '#262626' : '#D9EAFF'}
      labelStyle={{ selected: { color: isDark ? '#FFFFFF' : '#1258A8' } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
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
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
