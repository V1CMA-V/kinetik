import '@/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { colorScheme as nwColorScheme, useColorScheme } from 'nativewind';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { QuickActionsHandler } from '@/features/quick-actions/quick-actions';
import { AppLock } from '@/features/security/app-lock';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';
import { themeVars, useThemeColors } from '@/theme/colors';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const preference = useSettingsStore((s) => s.colorScheme);
  const session = useAuthStore((s) => s.session);
  const isLoading = useAuthStore((s) => s.isLoading);
  const init = useAuthStore((s) => s.init);
  const colors = useThemeColors();
  const isDark = colorScheme === 'dark';

  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.accent,
        background: colors.surface,
        card: colors.card,
        text: colors.ink,
        border: colors.line,
        notification: colors.accent,
      },
    };
  }, [isDark, colors]);

  useEffect(() => init(), [init]);

  useEffect(() => {
    nwColorScheme.set(preference);
  }, [preference]);

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  return (
    // Design-system CSS variables for the active theme; every className color reads them.
    <View style={[{ flex: 1 }, isDark ? themeVars.dark : themeVars.light]}>
      <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={navigationTheme}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
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
    </View>
  );
}
