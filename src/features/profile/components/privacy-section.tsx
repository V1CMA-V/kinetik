import { router } from 'expo-router';

import { useSettingsStore } from '@/stores/settings-store';

import { Section, SettingsRow, SwitchRow } from './settings';

export function PrivacySection() {
  const hideAmounts = useSettingsStore((s) => s.hideAmounts);
  const setHideAmounts = useSettingsStore((s) => s.setHideAmounts);

  return (
    <Section title="Privacidad">
      <SwitchRow
        label="Ocultar montos"
        icon={{ ios: 'eye.slash', android: 'visibility_off' }}
        description="Muestra $ •••• en lugar de tus saldos y cantidades"
        value={hideAmounts}
        onValueChange={setHideAmounts}
      />
      <SettingsRow
        label="Aviso de privacidad"
        icon={{ ios: 'hand.raised', android: 'privacy_tip' }}
        description="Qué datos guardamos y cómo eliminarlos"
        onPress={() => router.push('/privacy-policy')}
        last
      />
    </Section>
  );
}
