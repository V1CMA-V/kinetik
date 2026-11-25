import { Stack } from 'expo-router';

import { useSettingsStore } from '@/stores/settings-store';

export default function AuthLayout() {
  const hasSeenOnboarding = useSettingsStore((s) => s.hasSeenOnboarding);
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Welcome screens: only until they're finished or skipped once. */}
      <Stack.Protected guard={!hasSeenOnboarding}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
