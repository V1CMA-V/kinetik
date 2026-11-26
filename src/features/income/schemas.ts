import { z } from 'zod';

import type { TablesInsert } from '@/types/database';

import { LAST_DAY, type IncomeProfile } from './schedule';

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
const stripCommas = (value: string) => value.trim().replace(/,/g, '');

/** Quincena paydays at least this far apart, so both never clamp to the same date. */
const MIN_SEMIMONTHLY_GAP = 7;

const isValidDay = (v: string) => /^\d{1,2}$/.test(v) && Number(v) >= 1 && Number(v) <= LAST_DAY;

export const incomeSchema = z
  .object({
    payAmount: z
      .string()
      .transform(stripCommas)
      .refine((v) => AMOUNT_PATTERN.test(v) && Number(v) > 0, 'Escribe cuánto te llega por pago')
      .transform(Number),
    frequency: z.enum(['weekly', 'biweekly', 'semimonthly', 'monthly']),
    // Validated in superRefine, only for the frequencies that show them.
    payDay1: z.string().trim(),
    payDay2: z.string().trim(),
    /** `YYYY-MM-DD` of any payday (weekly / biweekly). */
    anchorDate: z.string(),
    /** Account id or '' for none. */
    depositAccountId: z.string(),
    /** Optional; '' = 0. */
    variableMonthly: z
      .string()
      .transform(stripCommas)
      .refine((v) => v === '' || AMOUNT_PATTERN.test(v), 'Escribe una cantidad válida')
      .transform((v) => (v === '' ? 0 : Number(v))),
  })
  .superRefine((values, ctx) => {
    const { frequency, payDay1, payDay2, anchorDate } = values;
    if (frequency === 'weekly' || frequency === 'biweekly') {
      if (!z.iso.date().safeParse(anchorDate).success) {
        ctx.addIssue({ code: 'custom', path: ['anchorDate'], message: 'Elige un día de pago' });
      }
      return;
    }
    if (!isValidDay(payDay1)) {
      ctx.addIssue({ code: 'custom', path: ['payDay1'], message: 'Un día del 1 al 31' });
    }
    if (frequency === 'semimonthly') {
      if (!isValidDay(payDay2)) {
        ctx.addIssue({ code: 'custom', path: ['payDay2'], message: 'Un día del 1 al 31' });
      } else if (isValidDay(payDay1) && Number(payDay2) - Number(payDay1) < MIN_SEMIMONTHLY_GAP) {
        ctx.addIssue({
          code: 'custom',
          path: ['payDay2'],
          message: `Al menos ${MIN_SEMIMONTHLY_GAP} días después del primero`,
        });
      }
    }
  })
  .transform((values): Omit<TablesInsert<'income_profiles'>, 'user_id'> => {
    const byDay = values.frequency === 'semimonthly' || values.frequency === 'monthly';
    return {
      pay_amount: values.payAmount,
      pay_frequency: values.frequency,
      pay_day_1: byDay ? Number(values.payDay1) : null,
      pay_day_2: values.frequency === 'semimonthly' ? Number(values.payDay2) : null,
      anchor_date: byDay ? null : values.anchorDate,
      deposit_account_id: values.depositAccountId || null,
      variable_monthly: values.variableMonthly,
    };
  });

export type IncomeFormInput = z.input<typeof incomeSchema>;
export type IncomeFormOutput = z.output<typeof incomeSchema>;

export const EMPTY_INCOME_FORM: IncomeFormInput = {
  payAmount: '',
  frequency: 'semimonthly',
  payDay1: '15',
  payDay2: String(LAST_DAY),
  anchorDate: '',
  depositAccountId: '',
  variableMonthly: '',
};

export function incomeToFormValues(profile: IncomeProfile): IncomeFormInput {
  return {
    payAmount: profile.pay_amount.toFixed(2),
    frequency: profile.pay_frequency,
    payDay1: profile.pay_day_1 ? String(profile.pay_day_1) : '',
    payDay2: profile.pay_day_2 ? String(profile.pay_day_2) : '',
    anchorDate: profile.anchor_date ?? '',
    depositAccountId: profile.deposit_account_id ?? '',
    variableMonthly: profile.variable_monthly ? profile.variable_monthly.toFixed(2) : '',
  };
}
