import { isAuthError, type User } from '@supabase/supabase-js';
import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';

import type { ChangePasswordOutput } from './schemas';

/** Display name kept in Supabase Auth `user_metadata.display_name`; `null` if unset. */
export function getDisplayName(user: User | null | undefined): string | null {
  const name: unknown = user?.user_metadata?.display_name;
  return typeof name === 'string' && name.trim() ? name.trim() : null;
}

/** Error with a Spanish message, optionally tied to a password form field. */
export class ProfileError extends Error {
  readonly field?: keyof ChangePasswordOutput;

  constructor(message: string, field?: keyof ChangePasswordOutput) {
    super(message);
    this.name = 'ProfileError';
    this.field = field;
  }
}

const SESSION_EXPIRED = 'Tu sesión expiró. Cierra sesión y vuelve a entrar.';

/** Maps Supabase Auth errors to Spanish messages. */
function toProfileError(error: unknown, fallback: string): ProfileError {
  if (!isAuthError(error)) return new ProfileError(fallback);
  if (error.name === 'AuthRetryableFetchError') {
    return new ProfileError('No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.');
  }

  switch (error.code) {
    case 'same_password':
      return new ProfileError('La nueva contraseña debe ser distinta a la actual.', 'next');
    case 'weak_password':
      return new ProfileError(
        'La contraseña es muy débil. Usa una más larga que combine letras, números y símbolos.',
        'next',
      );
    case 'reauthentication_needed':
    case 'reauth_nonce_missing':
    case 'reauthentication_not_valid':
      return new ProfileError(
        'Por seguridad necesitas volver a iniciar sesión antes de cambiar la contraseña. Cierra sesión, entra de nuevo e inténtalo otra vez.',
      );
    case 'session_not_found':
    case 'session_expired':
    case 'refresh_token_not_found':
      return new ProfileError(SESSION_EXPIRED);
    case 'over_request_rate_limit':
      return new ProfileError('Demasiados intentos. Espera unos minutos e inténtalo de nuevo.');
    default:
      return new ProfileError(fallback);
  }
}

/** Saves (or clears, with an empty string) the display name. */
export function useUpdateDisplayName() {
  return useMutation({
    mutationFn: async (displayName: string) => {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName || null },
      });
      // No cache to invalidate: USER_UPDATED refreshes `session.user` in the auth store.
      if (error) throw toProfileError(error, 'No se pudo guardar el nombre. Inténtalo de nuevo.');
    },
  });
}

/**
 * Verifies the current password by signing in again (which also yields a fresh session,
 * so "Secure password change" doesn't demand reauthentication) and then updates it.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async ({ current, next }: Pick<ChangePasswordOutput, 'current' | 'next'>) => {
      const email = useAuthStore.getState().session?.user.email;
      if (!email) throw new ProfileError(SESSION_EXPIRED);

      const signIn = await supabase.auth.signInWithPassword({ email, password: current });
      if (signIn.error) {
        if (signIn.error.code === 'invalid_credentials') {
          throw new ProfileError('La contraseña actual no es correcta.', 'current');
        }
        throw toProfileError(signIn.error, 'No se pudo verificar tu contraseña actual.');
      }

      const { error } = await supabase.auth.updateUser({
        password: next,
        // Only checked if the project requires the current password to change it.
        current_password: current,
      });
      if (error) {
        throw toProfileError(error, 'No se pudo cambiar la contraseña. Inténtalo de nuevo.');
      }
    },
  });
}
