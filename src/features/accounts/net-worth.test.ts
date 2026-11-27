import {
  type BalanceMovement,
  balanceEffect,
  netWorthAt,
  summarizeNetWorth,
} from '@/features/accounts/net-worth';

describe('summarizeNetWorth', () => {
  it('subtracts card debt from what you have', () => {
    expect(
      summarizeNetWorth([
        { type: 'bank_account', balance: 10000 },
        { type: 'cash', balance: 500 },
        { type: 'credit_card', balance: -3000.25 },
      ]),
    ).toEqual({ available: 10500, debt: 3000.25, net: 7499.75 });
  });

  it('ignores a card paid in excess', () => {
    expect(summarizeNetWorth([{ type: 'credit_card', balance: 200 }])).toEqual({
      available: 0,
      debt: 0,
      net: 0,
    });
  });
});

const move = (m: Partial<BalanceMovement>): BalanceMovement => ({
  kind: 'expense',
  amount: 100,
  account_id: 'bank',
  to_account_id: null,
  occurred_on: '2026-11-10',
  ...m,
});

describe('balanceEffect', () => {
  it('mirrors the balance trigger', () => {
    expect(balanceEffect(move({ kind: 'income' }), 'bank')).toBe(100);
    expect(balanceEffect(move({ kind: 'expense' }), 'bank')).toBe(-100);
    const transfer = move({ kind: 'transfer', to_account_id: 'card' });
    expect(balanceEffect(transfer, 'bank')).toBe(-100);
    expect(balanceEffect(transfer, 'card')).toBe(100);
    expect(balanceEffect(transfer, 'other')).toBe(0);
  });
});

describe('netWorthAt', () => {
  const accounts = [
    { id: 'bank', type: 'bank_account' as const, balance: 9000 },
    { id: 'card', type: 'credit_card' as const, balance: -2000 },
  ];

  it('undoes the movements dated after each point', () => {
    const movements = [
      move({ kind: 'income', amount: 5000, occurred_on: '2026-11-15' }),
      move({ kind: 'expense', amount: 2000, account_id: 'card', occurred_on: '2026-11-20' }),
      move({ kind: 'expense', amount: 1000, occurred_on: '2026-10-05' }),
    ];
    const [sep, oct, nov] = netWorthAt(accounts, movements, [
      '2026-09-30',
      '2026-10-31',
      '2026-11-30',
    ]);

    expect(nov).toEqual({ date: '2026-11-30', available: 9000, debt: 2000, net: 7000 });
    // Before November's income and card expense.
    expect(oct).toEqual({ date: '2026-10-31', available: 4000, debt: 0, net: 4000 });
    // Before October's expense too.
    expect(sep.net).toBe(5000);
  });

  it("doesn't change net worth with a card payment, only the split", () => {
    const payment = move({
      kind: 'transfer',
      amount: 1500,
      to_account_id: 'card',
      occurred_on: '2026-11-25',
    });
    const [before, after] = netWorthAt(accounts, [payment], ['2026-11-24', '2026-11-25']);
    expect(before).toMatchObject({ available: 10500, debt: 3500, net: 7000 });
    expect(after).toMatchObject({ available: 9000, debt: 2000, net: 7000 });
  });

  it('leaves out movements of accounts not passed in', () => {
    const archived = move({ account_id: 'archived', amount: 999, occurred_on: '2026-11-15' });
    const [point] = netWorthAt(accounts, [archived], ['2026-10-31']);
    expect(point.net).toBe(7000);
  });
});
