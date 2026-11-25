import '@/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { colorScheme as nwColorScheme, useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { QuickActionsHandler } from '@/features/quick-actions/quick-actions';
import { AppLock } from '@/features/security/app-lock';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const preference = useSettingsStore((s) => s.colorScheme);
  const session = useAuthStore((s) => s.session);
  const isLoading = useAuthStore((s) => s.isLoading);
  const init = useAuthStore((s) => s.init);

  useEffect(() => init(), [init]);

  useEffect(() => {
    nwColorScheme.set(preference);
  }, [preference]);

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <KeyboardProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!!session} redirectTo="/sign-in">
              <Stack.Screen name="(app)" />
            </Stack.Protected>
            <Stack.Protected guard={!session} redirectTo="/">
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
          <QuickActionsHandler />
          <AppLock />
        </ThemeProvider>
      </QueryClientProvider>
    </KeyboardProvider>
  );
}
