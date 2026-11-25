import { useSettingsStore } from '@/stores/settings-store';

import { Section, SwitchRow } from './settings';

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
        last
      />
    </Section>
  );
}
