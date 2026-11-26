import {
  type SubscriptionFormInput,
  subscriptionSchema,
  subscriptionToFormValues,
} from '@/features/subscriptions/schemas';
import type { Tables } from '@/types/database';

const values = (overrides: Partial<SubscriptionFormInput> = {}): SubscriptionFormInput => ({
  name: ' Spotify ',
  amount: '1,299.00',
  frequency: 'yearly',
  accountId: 'a1',
  nextChargeOn: '2026-12-01',
  ...overrides,
});

const errorPaths = (input: SubscriptionFormInput) => {
  const result = subscriptionSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('subscriptionSchema', () => {
  it('maps the form to the DB row, anchoring on the next charge', () => {
    expect(subscriptionSchema.parse(values())).toEqual({
      name: 'Spotify',
      amount: 1299,
      frequency: 'yearly',
      account_id: 'a1',
      anchor_on: '2026-12-01',
    });
  });

  it.each([
    [{ name: '' }, 'name'],
    [{ amount: '0' }, 'amount'],
    [{ amount: '9.999' }, 'amount'],
    [{ accountId: '' }, 'accountId'],
    [{ nextChargeOn: '2026-13-01' }, 'nextChargeOn'],
    [{ frequency: 'weekly' as SubscriptionFormInput['frequency'] }, 'frequency'],
  ])('rejects %p', (overrides, path) => {
    expect(errorPaths(values(overrides))).toEqual([path]);
  });

  it('round-trips a stored subscription', () => {
    const stored = {
      name: 'Spotify',
      amount: 129,
      frequency: 'monthly',
      account_id: 'a1',
      next_charge_on: '2026-12-01',
    } as Tables<'subscriptions'>;
    expect(subscriptionToFormValues(stored)).toEqual({
      name: 'Spotify',
      amount: '129.00',
      frequency: 'monthly',
      accountId: 'a1',
      nextChargeOn: '2026-12-01',
    });
    expect(subscriptionSchema.parse(subscriptionToFormValues(stored))).toMatchObject({
      amount: 129,
      anchor_on: '2026-12-01',
    });
  });
});
