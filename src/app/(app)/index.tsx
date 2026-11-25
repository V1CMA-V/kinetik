import { Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { useAuthStore } from '@/stores/auth-store';

export default function HomeScreen() {
  const email = useAuthStore((s) => s.session?.user.email);

  return (
    <Screen className="justify-center">
      <View className="gap-2">
        <Text className="text-3xl font-bold text-neutral-900 dark:text-white">Hola 👋</Text>
        <Text className="text-base text-neutral-500">{email}</Text>
      </View>
    </Screen>
  );
}
