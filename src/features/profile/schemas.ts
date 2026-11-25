import { z } from 'zod';

export const DISPLAY_NAME_MAX_LENGTH = 40;
export const PASSWORD_MIN_LENGTH = 8;

/** Trimmed display name; an empty string clears it. */
export const displayNameSchema = z
  .string()
  .trim()
  .max(DISPLAY_NAME_MAX_LENGTH, `Máximo ${DISPLAY_NAME_MAX_LENGTH} caracteres`);

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, 'Escribe tu contraseña actual'),
    next: z.string().min(PASSWORD_MIN_LENGTH, `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`),
    confirm: z.string().min(1, 'Confirma la nueva contraseña'),
  })
  .superRefine((values, ctx) => {
    if (values.next === values.current) {
      ctx.addIssue({
        code: 'custom',
        path: ['next'],
        message: 'Debe ser distinta a la contraseña actual',
      });
    }
    if (values.confirm !== values.next) {
      ctx.addIssue({ code: 'custom', path: ['confirm'], message: 'Las contraseñas no coinciden' });
    }
  });

export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
export type ChangePasswordOutput = z.output<typeof changePasswordSchema>;
