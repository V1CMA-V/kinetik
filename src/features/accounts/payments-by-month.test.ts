import { groupPaymentsByMonth } from '@/features/accounts/payments-by-month';

describe('groupPaymentsByMonth', () => {
  it('groups statements by the month they are due, oldest first', () => {
    const months = groupPaymentsByMonth(
      [
        {
          accountId: 'a',
          name: 'Oro',
          currency: 'MXN',
          forecasts: [
            { cutDate: '2026-11-20', dueDate: '2026-12-10', status: 'closed', amount: 500 },
            { cutDate: '2026-12-20', dueDate: '2027-01-10', status: 'open', amount: 200 },
          ],
        },
        {
          accountId: 'b',
          name: 'Azul',
          currency: 'MXN',
          forecasts: [
            { cutDate: '2026-11-25', dueDate: '2026-12-05', status: 'closed', amount: 300 },
          ],
        },
        {
          accountId: 'c',
          name: 'Dólares',
          currency: 'USD',
          forecasts: [
            { cutDate: '2026-11-25', dueDate: '2026-12-05', status: 'closed', amount: 99 },
          ],
        },
      ],
      'MXN',
    );

    expect(months.map((m) => [m.month, m.total])).toEqual([
      ['2026-12-01', 800],
      ['2027-01-01', 200],
    ]);
    expect(months[0].payments.map((p) => p.name)).toEqual(['Azul', 'Oro']);
  });
});
