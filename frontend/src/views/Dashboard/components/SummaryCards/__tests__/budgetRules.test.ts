import { describe, it, expect } from 'vitest';
import { gradeBudget, BUDGET_RULES, type BudgetInputs } from '../helpers';

const healthy: BudgetInputs = {
  rentPct: 20, subscriptionPct: 2, hasIncome: true,
  lifestylePct: 20, foodPctOfExpense: 10, surplusPct: 25, netCashflow: 5000,
};

describe('gradeBudget', () => {
  it('gives A when every rule holds', () => {
    expect(gradeBudget(healthy)).toMatchObject({ breaches: [], grade: { g: 'A' } });
  });

  it('counts a breach exactly when a value crosses the limit the card shows', () => {
    const r = BUDGET_RULES;
    expect(gradeBudget({ ...healthy, rentPct: r.rent.max }).breaches).toEqual([]);
    expect(gradeBudget({ ...healthy, rentPct: r.rent.max + 0.1 }).breaches).toEqual(['ที่พัก']);
    expect(gradeBudget({ ...healthy, subscriptionPct: r.subscription.max + 0.1 }).breaches).toEqual(['บริการรายเดือน']);
    expect(gradeBudget({ ...healthy, hasIncome: false, subscriptionPct: r.subscription.max + 0.1 }).breaches).not.toContain('บริการรายเดือน');
    expect(gradeBudget({ ...healthy, lifestylePct: r.lifestyle.max + 0.1 }).breaches).toEqual(['ตามใจ']);
    expect(gradeBudget({ ...healthy, foodPctOfExpense: r.food.max + 0.1 }).breaches).toEqual(['ค่าอาหาร']);
    expect(gradeBudget({ ...healthy, surplusPct: r.surplus.min - 0.1 }).breaches).toEqual(['เงินเหลือน้อย']);
  });

  it('matches the September 2026 dashboard: lifestyle + subscriptions over → C', () => {
    const r = gradeBudget({
      rentPct: 27.7, subscriptionPct: 6.1, hasIncome: true,
      lifestylePct: 42.5, foodPctOfExpense: 5.8, surplusPct: 13.6, netCashflow: 3411.28,
    });
    expect(r.breaches).toEqual(['บริการรายเดือน', 'ตามใจ']);
    expect(r.grade.g).toBe('C');
  });

  it('weighs a deficit double and floors at D', () => {
    expect(gradeBudget({ ...healthy, surplusPct: -5, netCashflow: -100 })).toMatchObject({ breaches: ['ขาดดุล'], grade: { g: 'C' } });
    expect(gradeBudget({ ...healthy, rentPct: 50, lifestylePct: 50, netCashflow: -1 }).grade.g).toBe('D');
  });
});
