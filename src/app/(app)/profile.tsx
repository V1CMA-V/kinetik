import { Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
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
    <Screen className="gap-8 pt-6">
      <Text className="text-3xl font-bold text-neutral-900 dark:text-white">Perfil</Text>

      <View className="gap-3">
        <Text className="text-sm font-medium text-neutral-500">Tema</Text>
        <View className="flex-row gap-2">
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
      </View>

      <Button title="Cerrar sesión" variant="secondary" onPress={signOut} />
    </Screen>
  );
}
