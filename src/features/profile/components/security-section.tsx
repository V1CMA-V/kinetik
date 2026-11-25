import { useState } from 'react';

import { Section, SwitchRow } from '@/features/profile/components/settings';
import { authenticate, useBiometricSupport } from '@/features/security/biometrics';
import { useSettingsStore } from '@/stores/settings-store';

export function SecuritySection() {
  const biometricLock = useSettingsStore((s) => s.biometricLock);
  const setBiometricLock = useSettingsStore((s) => s.setBiometricLock);
  const support = useBiometricSupport();
  const [busy, setBusy] = useState(false);

  const ready = support.status === 'ready';
  const name = ready ? support.name : 'huella / Face ID';

  let description = `Pide tu ${name} al abrir la app`;
  if (support.status === 'not-enrolled') {
    description = 'Configura una huella o Face ID en los ajustes de tu teléfono';
  } else if (support.status === 'no-hardware') {
    description = 'Tu teléfono no tiene huella ni Face ID disponibles';
  }

  const onValueChange = async (value: boolean) => {
    // Biometrics gone while the lock is on: let the user turn it off.
    if (!value && !ready) {
      setBiometricLock(false);
      return;
    }
    setBusy(true);
    const result = await authenticate(
      value ? 'Confirma para activar el bloqueo' : 'Confirma para desactivar el bloqueo',
    );
    setBusy(false);
    if (result.success) setBiometricLock(value);
  };

  return (
    <Section title="Seguridad">
      <SwitchRow
        label={`Bloquear con ${name}`}
        description={description}
        value={biometricLock}
        onValueChange={onValueChange}
        disabled={busy || (!ready && !biometricLock)}
        last
      />
    </Section>
  );
}
