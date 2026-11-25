import { isAuthError } from '@supabase/supabase-js';

/** Supabase Auth error codes → what to tell the person, in Spanish. */
const MESSAGES: Partial<Record<string, string>> = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Confirma tu correo antes de iniciar sesión.',
  user_already_exists: 'Ya existe una cuenta con ese correo. Inicia sesión.',
  otp_expired: 'El código no es válido o ya venció. Pide uno nuevo.',
  over_email_send_rate_limit: 'Espera un minuto antes de pedir otro código.',
  over_request_rate_limit: 'Demasiados intentos. Espera un momento y vuelve a intentar.',
  same_password: 'Usa una contraseña distinta a la anterior.',
  weak_password: 'La contraseña es muy débil. Usa una más larga o con más variedad.',
};

export function authErrorMessage(error: unknown): string {
  if (isAuthError(error)) {
    const byCode = error.code ? MESSAGES[error.code] : undefined;
    if (byCode) return byCode;
    if (error.status === 429) return MESSAGES.over_email_send_rate_limit!;
  }
  if (error instanceof Error) {
    if (/network request failed/i.test(error.message)) {
      return 'Sin conexión. Revisa tu internet y vuelve a intentar.';
    }
    return error.message;
  }
  return 'Algo salió mal. Vuelve a intentar.';
}
