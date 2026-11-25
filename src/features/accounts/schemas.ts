import { z } from 'zod';

import { Constants } from '@/types/database';

import { TYPES_WITH_INSTITUTION } from './constants';

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

const normalizeAmount = (value: string) => value.trim().replace(/,/g, '');

/** Accepts "1,234.50" or "1234.5" and returns a number. */
const amount = (message: string) =>
  z
    .string()
    .transform(normalizeAmount)
    .refine((value) => AMOUNT_PATTERN.test(value), message)
    .transform(Number);

export const accountSchema = z
  .object({
    name: z.string().trim().min(1, 'Escribe un nombre').max(60, 'Máximo 60 caracteres'),
    type: z.enum(Constants.public.Enums.account_type),
    institution: z.string().trim().max(40, 'Máximo 40 caracteres').optional(),
    /** For credit cards this is the current debt (entered as a positive amount). */
    balance: amount('Monto inválido'),
    creditLimit: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.type !== 'credit_card') return;
    if (!AMOUNT_PATTERN.test(normalizeAmount(values.creditLimit ?? ''))) {
      ctx.addIssue({
        code: 'custom',
        path: ['creditLimit'],
        message: 'Escribe el límite de crédito',
      });
    }
  })
  .transform(({ creditLimit, institution, ...values }) => {
    const isCredit = values.type === 'credit_card';
    const hasInstitution = TYPES_WITH_INSTITUTION.includes(values.type);
    return {
      ...values,
      institution: hasInstitution && institution ? institution : null,
      // Credit debt is stored as a negative balance so the net total is a plain sum.
      balance: isCredit ? -values.balance : values.balance,
      credit_limit: isCredit ? Number(normalizeAmount(creditLimit ?? '')) : null,
    };
  });

export type AccountFormInput = z.input<typeof accountSchema>;
export type AccountFormOutput = z.output<typeof accountSchema>;
