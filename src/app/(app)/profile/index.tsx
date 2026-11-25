import { ScrollView, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { AccountSection } from '@/features/profile/components/account-section';
import { ArchivedAccountsSection } from '@/features/profile/components/archived-accounts-section';
import { NotificationsSection } from '@/features/profile/components/notifications-section';
import { PrivacySection } from '@/features/profile/components/privacy-section';
import { SecuritySection } from '@/features/profile/components/security-section';
import { Section } from '@/features/profile/components/settings';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';

const schemes = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
] as const;

export default function ProfileScreen() {
  const signOut = useAuthStore((s) => s.signOut);
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const setColorScheme = useSettingsStore((s) => s.setColorScheme);

  return (
    <Screen className="pt-6">
      <ScrollView contentContainerClassName="gap-8 pb-10" showsVerticalScrollIndicator={false}>
        <Text className="text-3xl font-bold text-neutral-900 dark:text-white">Perfil</Text>

        <AccountSection />
        <SecuritySection />
        <NotificationsSection />
        <PrivacySection />
        <ArchivedAccountsSection />

        <Section title="Tema">
          <View className="flex-row gap-2 p-3">
            {schemes.map((s) => (
              <View key={s.value} className="flex-1">
                <Button
                  title={s.label}
                  variant={colorScheme === s.value ? 'primary' : 'secondary'}
                  onPress={() => setColorScheme(s.value)}
                />
              </View>
            ))}
          </View>
        </Section>

        <Button title="Cerrar sesión" variant="secondary" onPress={signOut} />
      </ScrollView>
    </Screen>
  );
}
