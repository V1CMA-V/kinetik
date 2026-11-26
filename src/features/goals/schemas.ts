import { z } from 'zod';

import type { Tables } from '@/types/database';

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

const amountField = (message: string) =>
  z
    .string()
    .transform((value) => value.trim().replace(/,/g, ''))
    .refine((value) => AMOUNT_PATTERN.test(value) && Number(value) > 0, message)
    .transform(Number);

export const goalSchema = z
  .object({
    name: z.string().trim().min(1, 'Ponle un nombre').max(60, 'Máximo 60 caracteres'),
    targetAmount: amountField('Escribe cuánto quieres juntar'),
    /** `YYYY-MM-DD` or '' for no date. */
    targetDate: z.union([z.iso.date(), z.literal('')]),
    /** Shared with the partner's household (only offered when there is a partner). */
    shared: z.boolean(),
  })
  .transform((values) => ({
    name: values.name,
    target_amount: values.targetAmount,
    target_date: values.targetDate || null,
    shared: values.shared,
  }));

export type GoalFormInput = z.input<typeof goalSchema>;
export type GoalFormOutput = z.output<typeof goalSchema>;

export function goalToFormValues(goal: Tables<'goals'>): GoalFormInput {
  return {
    name: goal.name,
    targetAmount: goal.target_amount.toFixed(2),
    targetDate: goal.target_date ?? '',
    shared: goal.household_id !== null,
  };
}

export const contributionSchema = z
  .object({
    kind: z.enum(['deposit', 'withdrawal']),
    amount: amountField('Escribe una cantidad'),
    contributedOn: z.iso.date(),
    note: z.string().trim().max(120, 'Máximo 120 caracteres'),
  })
  .transform((values) => ({
    // Withdrawals are stored as negative amounts.
    amount: values.kind === 'withdrawal' ? -values.amount : values.amount,
    contributed_on: values.contributedOn,
    note: values.note || null,
  }));

export type ContributionFormInput = z.input<typeof contributionSchema>;
export type ContributionFormOutput = z.output<typeof contributionSchema>;
