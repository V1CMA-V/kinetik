import { z } from 'zod';

import { Constants } from '@/types/database';

import type { Account } from './api';
import { TYPES_WITH_INSTITUTION } from './constants';

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
/** Balances can go below zero (e.g. cash spent past zero, or a card paid in excess). */
const SIGNED_AMOUNT_PATTERN = /^-?\d+(\.\d{1,2})?$/;
const DAY_PATTERN = /^\d{1,2}$/;

const normalizeAmount = (value: string) => value.trim().replace(/,/g, '');

const isValidDay = (value: string) => DAY_PATTERN.test(value) && +value >= 1 && +value <= 31;

/** Accepts "1,234.50", "1234.5" or "-20" and returns a number. */
const signedAmount = (message: string) =>
  z
    .string()
    .transform(normalizeAmount)
    .refine((value) => SIGNED_AMOUNT_PATTERN.test(value), message)
    .transform(Number);

export const accountSchema = z
  .object({
    name: z.string().trim().min(1, 'Escribe un nombre').max(60, 'Máximo 60 caracteres'),
    type: z.enum(Constants.public.Enums.account_type),
    institution: z.string().trim().max(40, 'Máximo 40 caracteres').optional(),
    /** For credit cards this is the current debt (entered as a positive amount). */
    balance: signedAmount('Monto inválido'),
    creditLimit: z.string().optional(),
    /** Día de corte and día límite de pago (1–31), credit cards only. */
    statementDay: z.string().trim().optional(),
    paymentDueDay: z.string().trim().optional(),
    /** Shared with the partner's household (only offered when there is a partner). */
    shared: z.boolean().optional(),
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
    const days = [
      ['statementDay', values.statementDay],
      ['paymentDueDay', values.paymentDueDay],
    ] as const;
    // Both days are optional, but the payment reminder needs the pair.
    const anyDay = days.some(([, value]) => value);
    for (const [path, value] of days) {
      if (value ? !isValidDay(value) : anyDay) {
        ctx.addIssue({
          code: 'custom',
          path: [path],
          message: value ? 'Escribe un día del 1 al 31' : 'Escribe también este día',
        });
      }
    }
  })
  .transform(({ creditLimit, institution, statementDay, paymentDueDay, shared, ...values }) => {
    const isCredit = values.type === 'credit_card';
    const hasInstitution = TYPES_WITH_INSTITUTION.includes(values.type);
    return {
      ...values,
      institution: hasInstitution && institution ? institution : null,
      // Credit debt is stored as a negative balance so the net total is a plain sum.
      balance: isCredit ? -values.balance : values.balance,
      credit_limit: isCredit ? Number(normalizeAmount(creditLimit ?? '')) : null,
      statement_day: isCredit && statementDay ? Number(statementDay) : null,
      payment_due_day: isCredit && paymentDueDay ? Number(paymentDueDay) : null,
      shared: shared ?? false,
    };
  });

export type AccountFormInput = z.input<typeof accountSchema>;
export type AccountFormOutput = z.output<typeof accountSchema>;

/** Maps a stored account back to form values (credit debt is shown as a positive amount). */
export function accountToFormValues(account: Account): AccountFormInput {
  const isCredit = account.type === 'credit_card';
  return {
    name: account.name,
    type: account.type,
    institution: account.institution ?? '',
    balance: (isCredit ? -account.balance : account.balance).toFixed(2),
    creditLimit: account.credit_limit != null ? account.credit_limit.toFixed(2) : '',
    statementDay: account.statement_day != null ? String(account.statement_day) : '',
    paymentDueDay: account.payment_due_day != null ? String(account.payment_due_day) : '',
    shared: account.household_id != null,
  };
}
