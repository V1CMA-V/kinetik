import { z } from 'zod';

import type { Tables } from '@/types/database';

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

export const budgetSchema = z
  .object({
    category: z.string().min(1, 'Elige una categoría'),
    amount: z
      .string()
      .transform((value) => value.trim().replace(/,/g, ''))
      .refine((value) => AMOUNT_PATTERN.test(value) && Number(value) > 0, 'Escribe el monto')
      .transform(Number),
  })
  .transform((values) => ({
    category: values.category,
    amount: values.amount,
  }));

export type BudgetFormInput = z.input<typeof budgetSchema>;
export type BudgetFormOutput = z.output<typeof budgetSchema>;

export function budgetToFormValues(budget: Tables<'budgets'>): BudgetFormInput {
  return {
    category: budget.category,
    amount: budget.amount.toFixed(2),
  };
}
