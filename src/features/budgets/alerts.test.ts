import {
  type BudgetAlertsInput,
  planBudgetAlerts,
  reachedThreshold,
  recordBudgetAlerts,
} from '@/features/budgets/alerts';

const input = (overrides: Partial<BudgetAlertsInput> = {}): BudgetAlertsInput => ({
  month: '2026-11',
  categories: [],
  sent: {},
  hideAmounts: false,
  ...overrides,
});

const category = (category: string, spent: number, budget = 1000) => ({
  id: `b-${category}`,
  category,
  budget,
  spent,
});

describe('reachedThreshold', () => {
  it('returns the highest threshold reached', () => {
    expect(reachedThreshold(799.99, 1000)).toBeNull();
    expect(reachedThreshold(800, 1000)).toBe(80);
    expect(reachedThreshold(999.99, 1000)).toBe(80);
    expect(reachedThreshold(1000, 1000)).toBe(100);
    expect(reachedThreshold(1500, 1000)).toBe(100);
  });

  it('ignores budgets without an amount', () => {
    expect(reachedThreshold(100, 0)).toBeNull();
  });

  it('is not fooled by float noise', () => {
    expect(reachedThreshold(0.1 + 0.7, 1)).toBe(80);
  });
});

describe('planBudgetAlerts', () => {
  it('alerts at 80% with the amounts left', () => {
    const [alert, ...rest] = planBudgetAlerts(
      input({ categories: [category('Comida', 850), category('Casa', 100)] }),
    );
    expect(rest).toHaveLength(0);
    expect(alert).toMatchObject({
      id: 'budget:2026-11:Comida:80',
      key: '2026-11:Comida',
      threshold: 80,
      budgetId: 'b-Comida',
      title: 'Presupuesto de Comida al 80%',
    });
    expect(alert.body).toContain('$850.00');
    expect(alert.body).toContain('$1,000.00');
    expect(alert.body).toContain('te quedan $150.00');
  });

  it('jumping past 100% only sends the 100% alert', () => {
    const alerts = planBudgetAlerts(input({ categories: [category('Comida', 1200)] }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ threshold: 100, title: 'Llegaste al límite de Comida' });
    expect(alerts[0].body).toContain('vas $200.00 por encima');
  });

  it('exactly at the budget has no "over" amount', () => {
    const [alert] = planBudgetAlerts(input({ categories: [category('Comida', 1000)] }));
    expect(alert.threshold).toBe(100);
    expect(alert.body).not.toContain('por encima');
  });

  it('sends 100% after 80% was sent', () => {
    const alerts = planBudgetAlerts(
      input({ categories: [category('Comida', 1000)], sent: { '2026-11:Comida': 80 } }),
    );
    expect(alerts.map((a) => a.threshold)).toEqual([100]);
  });

  it('never repeats a threshold in the same month, even after raising the budget', () => {
    expect(
      planBudgetAlerts(
        input({ categories: [category('Comida', 900)], sent: { '2026-11:Comida': 80 } }),
      ),
    ).toEqual([]);
    // Budget raised from 1000 to 2000 after the 100% alert; back to 80%.
    expect(
      planBudgetAlerts(
        input({ categories: [category('Comida', 1700, 2000)], sent: { '2026-11:Comida': 100 } }),
      ),
    ).toEqual([]);
  });

  it('alerts again in a new month', () => {
    const alerts = planBudgetAlerts(
      input({
        month: '2026-12',
        categories: [category('Comida', 900)],
        sent: { '2026-11:Comida': 100 },
      }),
    );
    expect(alerts.map((a) => a.id)).toEqual(['budget:2026-12:Comida:80']);
  });

  it('leaves the amounts out when they are hidden', () => {
    const alerts = planBudgetAlerts(
      input({ hideAmounts: true, categories: [category('Comida', 850), category('Casa', 1200)] }),
    );
    expect(alerts).toHaveLength(2);
    for (const a of alerts) expect(a.body).not.toContain('$');
  });
});

describe('recordBudgetAlerts', () => {
  it('records the alerts and prunes older months', () => {
    const next = recordBudgetAlerts({ '2026-10:Comida': 100, '2026-11:Casa': 80 }, '2026-11', [
      { key: '2026-11:Comida', threshold: 100 },
      { key: '2026-11:Casa', threshold: 100 },
    ]);
    expect(next).toEqual({ '2026-11:Comida': 100, '2026-11:Casa': 100 });
  });

  it('never lowers a recorded threshold', () => {
    expect(
      recordBudgetAlerts({ '2026-11:Comida': 100 }, '2026-11', [
        { key: '2026-11:Comida', threshold: 80 },
      ]),
    ).toEqual({ '2026-11:Comida': 100 });
  });
});
