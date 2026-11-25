import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { authenticate, isAuthenticating } from '@/features/security/biometrics';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';

/** Time in background after which the app locks again. */
const RELOCK_AFTER_MS = 30_000;

/** Errors meaning biometrics/passcode can no longer be used on this device. */
const UNAVAILABLE_ERRORS = new Set(['not_enrolled', 'not_available', 'passcode_not_set']);

/**
 * Full-screen biometric lock. Mounted once in the root layout.
 *
 * - Active only when `biometricLock` is on and there is a session.
 * - Starts locked on cold start and re-locks after ≥30 s in background.
 * - While the app is not active it shows an opaque cover so the app switcher
 *   snapshot doesn't reveal balances (best effort).
 */
export function AppLock() {
  const biometricLock = useSettingsStore((s) => s.biometricLock);
  const hasSession = useAuthStore((s) => !!s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const enabled = biometricLock && hasSession && Platform.OS !== 'web';

  const [locked, setLocked] = useState(enabled);
  const [covered, setCovered] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  // Signing out drops the lock so it never blocks the sign-in screen (nor the
  // next sign-in, which already proved identity with a password).
  const [prevHasSession, setPrevHasSession] = useState(hasSession);
  if (hasSession !== prevHasSession) {
    setPrevHasSession(hasSession);
    if (!hasSession) {
      setLocked(false);
      setUnavailable(false);
    }
  }

  const unlock = useCallback(async () => {
    if (isAuthenticating()) return;
    const result = await authenticate('Desbloquea Kinetik');
    if (result.success) {
      setLocked(false);
      setUnavailable(false);
    } else {
      setUnavailable(UNAVAILABLE_ERRORS.has(result.error));
    }
  }, []);

  const enabledRef = useRef(enabled);
  const lockedRef = useRef(locked);
  useEffect(() => {
    enabledRef.current = enabled;
    lockedRef.current = locked;
  }, [enabled, locked]);

  // Cold start: prompt right away.
  useEffect(() => {
    if (lockedRef.current && enabledRef.current) unlock();
  }, [unlock]);

  useEffect(() => {
    // Set only by a real trip to the background, never by our own prompt.
    let backgroundAt: number | null = null;

    const sub = AppState.addEventListener('change', (state) => {
      if (!enabledRef.current) {
        backgroundAt = null;
        setCovered(false);
        return;
      }

      if (state !== 'active') {
        if (isAuthenticating()) return;
        setCovered(true);
        if (state === 'background' && backgroundAt === null) backgroundAt = Date.now();
        return;
      }

      setCovered(false);
      if (backgroundAt === null) return;
      const elapsed = Date.now() - backgroundAt;
      backgroundAt = null;

      if (lockedRef.current || elapsed >= RELOCK_AFTER_MS) {
        setLocked(true);
        unlock();
      }
    });
    return () => sub.remove();
  }, [unlock]);

  if (!enabled || (!locked && !covered)) return null;

  return (
    <Modal
      visible
      animationType="none"
      presentationStyle="fullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {
        // Back button must not dismiss the lock.
      }}
    >
      <SafeAreaView className="flex-1 bg-white px-6 dark:bg-neutral-950">
        <View className="flex-1 items-center justify-center gap-3">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-brand-500">
            <Text className="text-3xl font-bold text-white">K</Text>
          </View>
          <Text className="text-3xl font-bold text-neutral-900 dark:text-white">Kinetik</Text>
          {locked ? (
            <Text className="text-center text-base text-neutral-500">
              {unavailable
                ? 'La biometría ya no está disponible en este teléfono. Cierra sesión y entra con tu contraseña.'
                : 'Tu información está bloqueada. Desbloquea para continuar.'}
            </Text>
          ) : null}
        </View>
        {locked ? (
          <View className="gap-3 pb-6">
            {unavailable ? null : <Button title="Desbloquear" onPress={unlock} />}
            <Button title="Cerrar sesión" variant="secondary" onPress={signOut} />
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}
