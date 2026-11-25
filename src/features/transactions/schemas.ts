import { z } from 'zod';

import { Constants, type Tables } from '@/types/database';

import { INSTALLMENT_OPTIONS } from './constants';

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

export const transactionSchema = z
  .object({
    kind: z.enum(Constants.public.Enums.transaction_kind),
    amount: z
      .string()
      .transform((value) => value.trim().replace(/,/g, ''))
      .refine((value) => AMOUNT_PATTERN.test(value) && Number(value) > 0, 'Escribe una cantidad')
      .transform(Number),
    accountId: z.string().min(1, 'Elige una cuenta'),
    toAccountId: z.string().optional(),
    category: z.string().optional(),
    description: z.string().trim().max(120, 'Máximo 120 caracteres').optional(),
    occurredOn: z.iso.date(),
    installmentMonths: z
      .number()
      .refine((n) => (INSTALLMENT_OPTIONS as readonly number[]).includes(n))
      .nullable(),
  })
  .superRefine((values, ctx) => {
    if (values.kind === 'transfer') {
      if (!values.toAccountId) {
        ctx.addIssue({ code: 'custom', path: ['toAccountId'], message: 'Elige la cuenta destino' });
      } else if (values.toAccountId === values.accountId) {
        ctx.addIssue({
          code: 'custom',
          path: ['toAccountId'],
          message: 'Debe ser distinta a la de origen',
        });
      }
    } else if (!values.category) {
      ctx.addIssue({ code: 'custom', path: ['category'], message: 'Elige una categoría' });
    }
  })
  .transform((values) => {
    const isTransfer = values.kind === 'transfer';
    return {
      kind: values.kind,
      amount: values.amount,
      account_id: values.accountId,
      to_account_id: isTransfer ? (values.toAccountId ?? null) : null,
      category: isTransfer ? null : (values.category ?? null),
      description: values.description || null,
      occurred_on: values.occurredOn,
      installment_months: values.kind === 'expense' ? values.installmentMonths : null,
    };
  });

export type TransactionFormInput = z.input<typeof transactionSchema>;
export type TransactionFormOutput = z.output<typeof transactionSchema>;

/** Maps a stored transaction back to form values. */
export function transactionToFormValues(transaction: Tables<'transactions'>): TransactionFormInput {
  return {
    kind: transaction.kind,
    amount: transaction.amount.toFixed(2),
    accountId: transaction.account_id,
    toAccountId: transaction.to_account_id ?? undefined,
    category: transaction.category ?? undefined,
    description: transaction.description ?? '',
    occurredOn: transaction.occurred_on,
    installmentMonths: transaction.installment_months,
  };
}
