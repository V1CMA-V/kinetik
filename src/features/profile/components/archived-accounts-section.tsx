import { router } from 'expo-router';

import { useArchivedAccounts } from '@/features/accounts/api';

import { Section, SettingsRow } from './settings';

export function ArchivedAccountsSection() {
  const archived = useArchivedAccounts();
  const count = archived.data?.length;

  return (
    <Section title="Tus cuentas">
      <SettingsRow
        label="Cuentas archivadas"
        icon={{ ios: 'archivebox', android: 'archive' }}
        value={count == null ? undefined : count === 0 ? 'Ninguna' : String(count)}
        onPress={() => router.push('/profile/archived-accounts')}
        last
      />
    </Section>
  );
}
