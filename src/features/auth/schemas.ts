import { z } from 'zod';

import { PASSWORD_MIN_LENGTH } from '@/features/profile/schemas';

const email = z.email('Correo inválido');

export const signInSchema = z.object({
  email,
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

export type SignInValues = z.infer<typeof signInSchema>;

/** Step 1 of "¿Olvidaste tu contraseña?": where to send the code. */
export const resetRequestSchema = z.object({ email });

export type ResetRequestValues = z.infer<typeof resetRequestSchema>;

/** The emailed one-time code: 6 digits by default, configurable up to 8 in Supabase. */
const otpCode = z
  .string()
  .trim()
  .regex(/^\d{6,8}$/, 'Escribe el código de tu correo');

/** Step 2: the emailed code and the new password. */
export const resetPasswordSchema = z
  .object({
    code: otpCode,
    password: z.string().min(PASSWORD_MIN_LENGTH, `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`),
    confirm: z.string().min(1, 'Confirma la nueva contraseña'),
  })
  .superRefine((values, ctx) => {
    if (values.confirm !== values.password) {
      ctx.addIssue({ code: 'custom', path: ['confirm'], message: 'Las contraseñas no coinciden' });
    }
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/** After "Crear cuenta": the code from the confirmation email. */
export const verifyEmailSchema = z.object({ code: otpCode });

export type VerifyEmailValues = z.infer<typeof verifyEmailSchema>;
