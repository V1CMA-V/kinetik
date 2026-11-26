import { computeProjection } from '@/features/analysis/projection';

describe('computeProjection', () => {
  it('extrapolates the daily average and adds what is already scheduled', () => {
    const p = computeProjection([10, 20, 30, 0, 40], 3, null);
    expect(p).toEqual({
      day: 3,
      daysInMonth: 5,
      spentToDate: 60,
      dailyAverage: 20,
      scheduled: 40,
      projected: 140,
      cumulative: [10, 30, 60, 80, 140],
      previousCumulative: null,
      previousToDate: null,
    });
  });

  it('compares with the previous month up to the same day', () => {
    const p = computeProjection([10, 20, 30, 0, 40], 3, [5, 5, 5, 5]);
    expect(p.previousCumulative).toEqual([5, 10, 15, 20]);
    expect(p.previousToDate).toBe(15);
  });

  it('caps the comparison at the length of a shorter previous month', () => {
    const p = computeProjection([1, 1, 1, 1, 1], 5, [5, 5, 5, 5]);
    expect(p.previousToDate).toBe(20);
    expect(p.projected).toBe(5);
  });

  it('projects only the scheduled spending on day 0', () => {
    const p = computeProjection([0, 0, 50], 0, null);
    expect(p.dailyAverage).toBe(0);
    expect(p.projected).toBe(50);
    expect(p.cumulative).toEqual([0, 0, 50]);
  });
});
