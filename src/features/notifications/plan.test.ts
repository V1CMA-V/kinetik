import {
  MAX_REMINDERS,
  type PlanInput,
  type PlanSubscription,
  planReminders,
  planSignature,
  reminderMoment,
} from '@/features/notifications/plan';

const subscription = (overrides: Partial<PlanSubscription>): PlanSubscription => ({
  id: 's1',
  name: 'Netflix',
  amount: 299,
  next_charge_on: '2026-11-30',
  is_active: true,
  accountName: 'Nu',
  ...overrides,
});

const input = (overrides: Partial<PlanInput> = {}): PlanInput => ({
  now: new Date(2026, 10, 20, 10),
  daysBefore: 3,
  hideAmounts: false,
  cardReminders: true,
  subscriptionReminders: true,
  cardPayments: [
    {
      accountId: 'c1',
      name: 'Oro',
      institution: 'Banorte',
      currency: 'MXN',
      amount: 1300,
      dueDate: '2026-11-25',
    },
    // Its "before" reminder (Nov 18) already passed.
    {
      accountId: 'c2',
      name: 'Clásica',
      institution: null,
      currency: 'MXN',
      amount: 200,
      dueDate: '2026-11-21',
    },
    // Nothing to pay.
    {
      accountId: 'c3',
      name: 'Platino',
      institution: null,
      currency: 'MXN',
      amount: 0,
      dueDate: '2026-11-28',
    },
  ],
  subscriptions: [
    subscription({}),
    subscription({ id: 's2', is_active: false }),
    // Reminder on Nov 19: already passed.
    subscription({ id: 's3', next_charge_on: '2026-11-22' }),
    // Beyond the 60-day window.
    subscription({ id: 's4', next_charge_on: '2027-03-01' }),
  ],
  ...overrides,
});

describe('reminderMoment', () => {
  it('fires at 09:00 local, days before the date', () => {
    expect(reminderMoment('2026-11-25', 3)).toEqual(new Date(2026, 10, 22, 9));
    expect(reminderMoment('2026-12-01', 3)).toEqual(new Date(2026, 10, 28, 9));
    expect(reminderMoment('2026-11-25')).toEqual(new Date(2026, 10, 25, 9));
  });
});

describe('planReminders', () => {
  it('plans upcoming card and subscription reminders sorted by date', () => {
    const plan = planReminders(input());
    expect(plan.map((r) => [r.id, r.date])).toEqual([
      ['card:c2:2026-11-21:due', new Date(2026, 10, 21, 9)],
      ['card:c1:2026-11-25:before', new Date(2026, 10, 22, 9)],
      ['card:c1:2026-11-25:due', new Date(2026, 10, 25, 9)],
      ['sub:s1:2026-11-30:before', new Date(2026, 10, 27, 9)],
    ]);
  });

  it('writes amounts, card and account in the body', () => {
    const [, before, due, sub] = planReminders(input());
    expect(before).toMatchObject({ kind: 'card', targetId: 'c1' });
    expect(before.body).toBe('Paga $1,300.00 de tu Banorte Oro antes del 25 nov.');
    expect(due.title).toBe('Hoy vence tu tarjeta Oro');
    expect(sub).toMatchObject({ kind: 'subscription', targetId: 's1' });
    expect(sub.title).toBe('Netflix se cobra pronto');
    expect(sub.body).toBe('El 30 nov se cobrarán $299.00 en Nu.');
  });

  it('hides amounts when asked', () => {
    for (const reminder of planReminders(input({ hideAmounts: true }))) {
      expect(reminder.body).not.toMatch(/\$/);
    }
  });

  it('respects the card and subscription switches', () => {
    expect(planReminders(input({ cardReminders: false })).map((r) => r.kind)).toEqual([
      'subscription',
    ]);
    expect(
      planReminders(input({ subscriptionReminders: false })).every((r) => r.kind === 'card'),
    ).toBe(true);
  });

  it(`caps the plan at ${MAX_REMINDERS} reminders`, () => {
    const subscriptions = Array.from({ length: MAX_REMINDERS + 10 }, (_, i) =>
      subscription({ id: `s${i}`, next_charge_on: '2026-12-10' }),
    );
    expect(planReminders(input({ cardPayments: [], subscriptions }))).toHaveLength(MAX_REMINDERS);
  });
});

describe('planSignature', () => {
  it('only changes when the plan changes', () => {
    const plan = planReminders(input());
    expect(planSignature(planReminders(input()))).toBe(planSignature(plan));
    expect(planSignature(planReminders(input({ hideAmounts: true })))).not.toBe(
      planSignature(plan),
    );
  });
});
