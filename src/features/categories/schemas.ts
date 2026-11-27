import { z } from 'zod';

import { isBuiltInCategory } from './categories';

export const categorySchema = z
  .object({
    kind: z.enum(['expense', 'income']),
    name: z
      .string()
      .trim()
      .min(1, 'Escribe un nombre')
      .max(40, 'Máximo 40 caracteres')
      // Collapse inner runs of spaces ("Mi   gato" → "Mi gato").
      .transform((value) => value.replace(/\s+/g, ' ')),
  })
  .superRefine((values, ctx) => {
    if (isBuiltInCategory(values.kind, values.name)) {
      ctx.addIssue({ code: 'custom', path: ['name'], message: 'Esa categoría ya existe' });
    }
  });

export type CategoryFormInput = z.input<typeof categorySchema>;
export type CategoryFormOutput = z.output<typeof categorySchema>;

export const EMPTY_CATEGORY_FORM: CategoryFormInput = { kind: 'expense', name: '' };
