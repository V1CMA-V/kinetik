import {
  MAX_PAYDAYS,
  MAX_REMINDERS,
  type PlanIncome,
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
  paydayReminders: true,
  income: null,
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
    expect(due.title).toBe('Hoy vence tu tarjeta');
    expect(due.body).toBe('Paga $1,300.00 de tu Banorte Oro hoy para no generar intereses.');
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

const income = (overrides: Partial<PlanIncome> = {}): PlanIncome => ({
  pay_amount: 12500,
  pay_frequency: 'semimonthly',
  pay_day_1: 15,
  pay_day_2: 31,
  anchor_date: null,
  deposit_account_id: 'a1',
  ...overrides,
});

const card = (accountId: string, dueDate: string, amount: number) => ({
  accountId,
  name: accountId,
  institution: null,
  currency: 'MXN',
  amount,
  dueDate,
});

/** Only payday reminders, paydays on the 15th and last day of the month. */
const paydayInput = (overrides: Partial<PlanInput> = {}) =>
  input({
    cardReminders: false,
    subscriptionReminders: false,
    income: income(),
    cardPayments: [
      card('c1', '2026-11-25', 1300), // before the first payday
      card('c2', '2026-11-30', 8000), // on the payday counts
      card('c3', '2026-12-10', 500),
      card('c4', '2026-12-15', 0), // nothing to pay
      card('c5', '2026-12-15', 700), // on the next payday: belongs to the next one
    ],
    ...overrides,
  });

describe('planReminders · paydays', () => {
  it('plans the day before and the payday at 09:00 for the next paydays', () => {
    const plan = planReminders(paydayInput());
    expect(plan.map((r) => [r.id, r.date])).toEqual([
      ['payday:2026-11-30:before', new Date(2026, 10, 29, 9)],
      ['payday:2026-11-30:day', new Date(2026, 10, 30, 9)],
      ['payday:2026-12-15:before', new Date(2026, 11, 14, 9)],
      ['payday:2026-12-15:day', new Date(2026, 11, 15, 9)],
      ['payday:2026-12-31:before', new Date(2026, 11, 30, 9)],
      ['payday:2026-12-31:day', new Date(2026, 11, 31, 9)],
      ['payday:2027-01-15:before', new Date(2027, 0, 14, 9)],
      ['payday:2027-01-15:day', new Date(2027, 0, 15, 9)],
    ]);
    expect(plan.every((r) => r.kind === 'payday')).toBe(true);
  });

  it('summarizes the card payments due until the next payday', () => {
    const [before, day, nextBefore, , lastBefore] = planReminders(paydayInput());
    expect(before.title).toBe('Mañana te pagan');
    expect(before.body).toBe('Tienes 2 pagos de tarjeta antes de tu siguiente pago: $8,500.00.');
    expect(nextBefore.body).toBe('Tienes un pago de tarjeta antes de tu siguiente pago: $700.00.');
    expect(lastBefore.body).toBe(
      'No tienes pagos de tarjeta pendientes antes de tu siguiente pago.',
    );
    expect(day.title).toBe('Hoy te pagan');
    expect(day.body).toBe('Registra tu ingreso de $12,500.00 en un toque.');
  });

  it('prefills the income only on the payday reminder', () => {
    const [before, day] = planReminders(paydayInput());
    expect(before.income).toBeUndefined();
    expect(day).toMatchObject({ targetId: '2026-11-30' });
    expect(day.income).toEqual({
      kind: 'income',
      amount: '12500.00',
      category: 'Nómina',
      accountId: 'a1',
    });
    const [, noAccount] = planReminders(
      paydayInput({ income: income({ deposit_account_id: null }) }),
    );
    expect(noAccount.income).toEqual({ kind: 'income', amount: '12500.00', category: 'Nómina' });
  });

  it('hides amounts when asked', () => {
    const plan = planReminders(paydayInput({ hideAmounts: true }));
    expect(plan[0].body).toBe('Tienes 2 pagos de tarjeta antes de tu siguiente pago.');
    expect(plan[1].body).toBe('Registra tu ingreso en un toque.');
    for (const reminder of plan) expect(reminder.body).not.toMatch(/\$|12,500|8,500/);
  });

  it('skips moments already past on the payday itself', () => {
    const early = planReminders(paydayInput({ now: new Date(2026, 10, 30, 8) }));
    expect(early.slice(0, 2).map((r) => r.id)).toEqual([
      'payday:2026-11-30:day',
      'payday:2026-12-15:before',
    ]);
    const late = planReminders(paydayInput({ now: new Date(2026, 10, 30, 9) }));
    expect(late[0].id).toBe('payday:2026-12-15:before');
  });

  it('needs the switch on and an income profile', () => {
    expect(planReminders(paydayInput({ paydayReminders: false }))).toEqual([]);
    expect(planReminders(paydayInput({ income: null }))).toEqual([]);
    // An incomplete schedule plans nothing.
    expect(
      planReminders(
        paydayInput({ income: income({ pay_frequency: 'weekly', anchor_date: null }) }),
      ),
    ).toEqual([]);
  });

  it(`plans at most ${MAX_PAYDAYS} paydays so card reminders keep their room`, () => {
    const weekly = income({ pay_frequency: 'weekly', anchor_date: '2026-11-20' });
    const plan = planReminders(input({ income: weekly }));
    expect(plan.filter((r) => r.kind === 'payday')).toHaveLength(2 * MAX_PAYDAYS);
    expect(plan.filter((r) => r.kind === 'card')).toHaveLength(3);
    // Payday today (Friday) after 09:00 doesn't take a slot: the next 4 are the following Fridays.
    expect(plan.find((r) => r.kind === 'payday')?.id).toBe('payday:2026-11-27:before');
  });

  it('is deterministic', () => {
    expect(planReminders(paydayInput())).toEqual(planReminders(paydayInput()));
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

  it('changes when the prefilled income changes, even with amounts hidden', () => {
    const hidden = paydayInput({ hideAmounts: true });
    const other = paydayInput({ hideAmounts: true, income: income({ pay_amount: 13000 }) });
    expect(planSignature(planReminders(other))).not.toBe(planSignature(planReminders(hidden)));
  });
});
