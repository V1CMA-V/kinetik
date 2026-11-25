import { z } from 'zod';

export const signInSchema = z.object({
  email: z.email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

export type SignInValues = z.infer<typeof signInSchema>;
