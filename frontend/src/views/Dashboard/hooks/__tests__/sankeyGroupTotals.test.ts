import { describe, it, expect } from 'vitest';
import { computeGroupTotals } from '../useSankeyEngine';

const cats = [
  { id: 'c_inc', cashflowGroup: 'g_inc' },
  { id: 'c_food', cashflowGroup: 'g_food' },
  { id: 'c_fund', cashflowGroup: 'g_sav' },
  { id: 'c_gold', cashflowGroup: 'g_sav' },
  { id: 'c_stock', cashflow_group_id: 'g_sav2' },
];

describe('computeGroupTotals (Sankey)', () => {
  it('nets a sell in one savings category against a buy in another', () => {
    // buy fund 10,000 + sell gold 8,000 = net savings 2,000 (what every other view shows)
    const totals = computeGroupTotals(cats, { c_inc: 30000, c_food: 5000, c_fund: 10000, c_gold: -8000, c_stock: 0 });
    expect(totals).toEqual({ g_inc: 30000, g_food: 5000, g_sav: 2000 });
  });

  it('leaves out a group that nets to zero or below (a Sankey link cannot be negative)', () => {
    const totals = computeGroupTotals(cats, { c_inc: 30000, c_food: 0, c_fund: 1000, c_gold: -3000, c_stock: -500 });
    expect(totals).toEqual({ g_inc: 30000 });
  });
});
