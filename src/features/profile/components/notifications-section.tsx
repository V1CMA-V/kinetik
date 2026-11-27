import { useState } from 'react';
import { Linking, View } from 'react-native';

import { alert } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { Chip } from '@/components/ui/chip';
import {
  usePartner,
  usePartnerNotifications,
  useSetPartnerNotifications,
} from '@/features/household/api';
import { useIncomeProfile } from '@/features/income/api';
import {
  useNotificationPermission,
  useNotificationPermissionStore,
} from '@/features/notifications/permission';
import { notificationsSupported } from '@/features/notifications/reminders';
import { REMINDER_DAYS_OPTIONS, useSettingsStore } from '@/stores/settings-store';

import { Section, SwitchRow } from './settings';

function showPermissionDeniedAlert() {
  alert(
    'Notificaciones desactivadas',
    'Para recibir avisos, permite las notificaciones de Kinetik en los ajustes de tu teléfono.',
    [
      { text: 'Ahora no', style: 'cancel' },
      { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
    ],
  );
}

export function NotificationsSection() {
  const enabled = useSettingsStore((s) => s.notificationsEnabled);
  const setEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const cardReminders = useSettingsStore((s) => s.cardReminders);
  const setCardReminders = useSettingsStore((s) => s.setCardReminders);
  const subscriptionReminders = useSettingsStore((s) => s.subscriptionReminders);
  const setSubscriptionReminders = useSettingsStore((s) => s.setSubscriptionReminders);
  const paydayReminders = useSettingsStore((s) => s.paydayReminders);
  const setPaydayReminders = useSettingsStore((s) => s.setPaydayReminders);
  const budgetAlerts = useSettingsStore((s) => s.budgetAlerts);
  const setBudgetAlerts = useSettingsStore((s) => s.setBudgetAlerts);
  const hasIncome = !!useIncomeProfile().data;
  const daysBefore = useSettingsStore((s) => s.reminderDaysBefore);
  const setDaysBefore = useSettingsStore((s) => s.setReminderDaysBefore);
  const permission = useNotificationPermission();
  const requestPermission = useNotificationPermissionStore((s) => s.request);
  const [busy, setBusy] = useState(false);

  // Turned on here, but the permission was revoked later in the system settings.
  const revoked = enabled && permission !== null && permission !== 'granted';

  let description = 'Pagos de tarjeta, suscripciones y presupuestos';
  if (!notificationsSupported) description = 'Disponible solo en la app del teléfono';
  else if (revoked) description = 'Permiso desactivado en los ajustes del teléfono';

  const onToggle = async (value: boolean) => {
    if (!value) {
      setEnabled(false);
      return;
    }
    setBusy(true);
    const result = await requestPermission();
    setBusy(false);
    if (result === 'granted') {
      setEnabled(true);
    } else {
      setEnabled(false);
      showPermissionDeniedAlert();
    }
  };

  const showOptions = enabled && !revoked;

  return (
    <Section title="Notificaciones">
      <PartnerActivityRow />
      <SwitchRow
        label="Recordatorios"
        icon={{ ios: 'bell', android: 'notifications' }}
        description={description}
        value={enabled && !revoked}
        onValueChange={onToggle}
        disabled={busy || !notificationsSupported}
        last={!showOptions}
      />
      {showOptions ? (
        <>
          <SwitchRow
            label="Pago de tarjetas"
            description="Antes y el día de la fecha límite de pago"
            value={cardReminders}
            onValueChange={setCardReminders}
          />
          <SwitchRow
            label="Suscripciones"
            description="Antes de cada cobro"
            value={subscriptionReminders}
            onValueChange={setSubscriptionReminders}
          />
          {hasIncome ? (
            <SwitchRow
              label="Días de pago"
              description="El día antes y el día que te pagan"
              value={paydayReminders}
              onValueChange={setPaydayReminders}
            />
          ) : null}
          <SwitchRow
            label="Alertas de presupuesto"
            description="Aviso al llegar al 80% y al 100% de un presupuesto"
            value={budgetAlerts}
            onValueChange={setBudgetAlerts}
          />
          <View className="gap-3 px-4 py-3">
            <Text className="text-base text-ink">Avisarme</Text>
            <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
              {REMINDER_DAYS_OPTIONS.map((days) => (
                <Chip
                  key={days}
                  label={days === 1 ? '1 día' : `${days} días`}
                  selected={daysBefore === days}
                  onPress={() => setDaysBefore(days)}
                />
              ))}
            </View>
            <Text className="text-xs text-ink-muted">antes, a las 9:00</Text>
          </View>
        </>
      ) : null}
    </Section>
  );
}

/** Push when the partner registers a movement on a shared account (only with a partner). */
function PartnerActivityRow() {
  const { partner } = usePartner();
  const preference = usePartnerNotifications();
  const setPreference = useSetPartnerNotifications();
  const permission = useNotificationPermission();
  const requestPermission = useNotificationPermissionStore((s) => s.request);
  const [busy, setBusy] = useState(false);

  if (!partner || !notificationsSupported) return null;

  const granted = permission === 'granted';
  const value = granted && (preference.data ?? true);

  const onToggle = async (next: boolean) => {
    if (next && !granted) {
      setBusy(true);
      const result = await requestPermission();
      setBusy(false);
      if (result !== 'granted') {
        showPermissionDeniedAlert();
        return;
      }
    }
    setPreference.mutate(next);
  };

  return (
    <SwitchRow
      label={`Movimientos de ${partner.name}`}
      icon={{ ios: 'person.2', android: 'group' }}
      description={
        setPreference.error?.message ??
        (granted
          ? 'Cuando registre algo en una cuenta o meta compartida'
          : 'Permite las notificaciones para recibir estos avisos')
      }
      value={value}
      onValueChange={onToggle}
      disabled={busy || preference.isPending || setPreference.isPending}
    />
  );
}
