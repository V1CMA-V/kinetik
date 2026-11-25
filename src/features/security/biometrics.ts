import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

export type BiometricSupport =
  | { status: 'loading' }
  | { status: 'no-hardware' }
  | { status: 'not-enrolled' }
  | { status: 'ready'; name: string };

/** Human name of the enrolled biometrics, e.g. "Face ID" or "huella". */
function biometricName(types: LocalAuthentication.AuthenticationType[]): string {
  const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  const finger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);

  if (Platform.OS === 'ios') {
    if (face) return 'Face ID';
    if (finger) return 'Touch ID';
  } else {
    if (face && finger) return 'huella o rostro';
    if (finger) return 'huella';
    if (face) return 'reconocimiento facial';
  }
  return 'biometría';
}

export async function getBiometricSupport(): Promise<BiometricSupport> {
  if (Platform.OS === 'web') return { status: 'no-hardware' };
  try {
    const [hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    if (!hasHardware) return { status: 'no-hardware' };
    if (!isEnrolled) return { status: 'not-enrolled' };
    return { status: 'ready', name: biometricName(types) };
  } catch {
    return { status: 'no-hardware' };
  }
}

/** Device biometric support, refreshed whenever the app returns to the foreground. */
export function useBiometricSupport(): BiometricSupport {
  const [support, setSupport] = useState<BiometricSupport>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      getBiometricSupport().then((value) => {
        if (!cancelled) setSupport(value);
      });
    };

    refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return support;
}

let authInFlight = false;

/**
 * True while a system authentication prompt opened by the app is showing.
 * The prompt itself can move the app to `inactive`/`background`, so the app
 * lock uses this to avoid re-locking (or covering) because of its own prompt.
 */
export function isAuthenticating() {
  return authInFlight;
}

/** Shows the system biometric prompt (falls back to the device passcode). */
export async function authenticate(
  promptMessage: string,
): Promise<LocalAuthentication.LocalAuthenticationResult> {
  if (authInFlight) return { success: false, error: 'app_cancel' };
  authInFlight = true;
  try {
    return await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancelar',
      fallbackLabel: 'Usar código',
    });
  } catch {
    return { success: false, error: 'unknown' };
  } finally {
    authInFlight = false;
  }
}
