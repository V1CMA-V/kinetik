import { z } from 'zod';

import { Constants, type Tables } from '@/types/database';

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

export const subscriptionSchema = z
  .object({
    name: z.string().trim().min(1, 'Escribe el nombre').max(60, 'Máximo 60 caracteres'),
    amount: z
      .string()
      .transform((value) => value.trim().replace(/,/g, ''))
      .refine((value) => AMOUNT_PATTERN.test(value) && Number(value) > 0, 'Escribe el monto')
      .transform(Number),
    frequency: z.enum(Constants.public.Enums.billing_frequency),
    accountId: z.string().min(1, 'Elige con qué se cobra'),
    nextChargeOn: z.iso.date(),
  })
  .transform((values) => ({
    name: values.name,
    amount: values.amount,
    frequency: values.frequency,
    account_id: values.accountId,
    anchor_on: values.nextChargeOn,
  }));

export type SubscriptionFormInput = z.input<typeof subscriptionSchema>;
export type SubscriptionFormOutput = z.output<typeof subscriptionSchema>;

/** Maps a stored subscription back to form values (the date shown is the pending charge). */
export function subscriptionToFormValues(
  subscription: Tables<'subscriptions'>,
): SubscriptionFormInput {
  return {
    name: subscription.name,
    amount: subscription.amount.toFixed(2),
    frequency: subscription.frequency,
    accountId: subscription.account_id,
    nextChargeOn: subscription.next_charge_on,
  };
}
