import { installmentProgress } from '@/features/transactions/installments';

describe('installmentProgress', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 10, 20, 12) });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('counts installments whose statement already closed', () => {
    expect(installmentProgress(1000, 3, '2026-10-01', 15)).toEqual({
      monthly: 333.33,
      paid: 2,
      remainingAmount: 333.34,
      isDone: false,
    });
  });

  it('assumes the first payment the month after the purchase without statement day', () => {
    expect(installmentProgress(1000, 3, '2026-10-01')).toMatchObject({
      paid: 1,
      remainingAmount: 666.67,
      isDone: false,
    });
  });

  it('has nothing paid in the month of the purchase', () => {
    expect(installmentProgress(600, 6, '2026-11-02', null)).toMatchObject({
      monthly: 100,
      paid: 0,
      remainingAmount: 600,
    });
  });

  it('is done after the last installment and never goes past it', () => {
    expect(installmentProgress(900, 3, '2026-01-10')).toEqual({
      monthly: 300,
      paid: 3,
      remainingAmount: 0,
      isDone: true,
    });
  });
});
