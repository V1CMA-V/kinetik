import { computeGoalProgress } from '@/features/goals/progress';

const TODAY = '2026-11-26';
const goal = { target_amount: 10000, target_date: null };

describe('computeGoalProgress', () => {
  it('adds deposits and subtracts withdrawals', () => {
    const p = computeGoalProgress(
      goal,
      [
        { amount: 3000, user_id: 'a' },
        { amount: 2000, user_id: 'b' },
        { amount: -500, user_id: 'a' },
      ],
      TODAY,
    );
    expect(p.saved).toBe(4500);
    expect(p.remaining).toBe(5500);
    expect(p.ratio).toBeCloseTo(0.45);
    expect(p.reached).toBe(false);
    expect(p.byUser).toEqual([
      { userId: 'a', amount: 2500 },
      { userId: 'b', amount: 2000 },
    ]);
  });

  it('marks the goal reached, even when they saved more', () => {
    const p = computeGoalProgress(goal, [{ amount: 12000, user_id: 'a' }], TODAY);
    expect(p.reached).toBe(true);
    expect(p.remaining).toBe(0);
    expect(p.ratio).toBeCloseTo(1.2);
    expect(p.monthlyNeeded).toBeNull();
  });

  it('has no monthly amount without a target date', () => {
    const p = computeGoalProgress(goal, [], TODAY);
    expect(p.monthsLeft).toBeNull();
    expect(p.monthlyNeeded).toBeNull();
    expect(p.overdue).toBe(false);
  });

  it('splits what is missing over the months left', () => {
    const p = computeGoalProgress(
      { target_amount: 12000, target_date: '2027-11-30' },
      [{ amount: 2400, user_id: 'a' }],
      TODAY,
    );
    expect(p.monthsLeft).toBe(12);
    expect(p.monthlyNeeded).toBe(800);
  });

  it('asks for everything this month when the date is this month', () => {
    const p = computeGoalProgress({ target_amount: 1000, target_date: '2026-11-30' }, [], TODAY);
    expect(p.monthsLeft).toBe(1);
    expect(p.monthlyNeeded).toBe(1000);
  });

  it('flags a past date without reaching the goal', () => {
    const p = computeGoalProgress({ target_amount: 1000, target_date: '2026-10-31' }, [], TODAY);
    expect(p.overdue).toBe(true);
    expect(p.monthlyNeeded).toBeNull();
  });

  it('never shows negative progress', () => {
    const p = computeGoalProgress(goal, [{ amount: -100, user_id: 'a' }], TODAY);
    expect(p.ratio).toBe(0);
    expect(p.saved).toBe(-100);
  });
});
