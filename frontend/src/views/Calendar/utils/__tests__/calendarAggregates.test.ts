import { describe, it, expect } from 'vitest';
import { processCalendarTransaction, type CalendarDayData, type CalendarTotals } from '../calendarAggregates';
import type { CashflowGroup, Category, TransactionDisplay } from '../../../../types';

const groups: CashflowGroup[] = [
  { id: 'g_inc', name: 'รายรับ', type: 'income', allocation_type: null, order_index: 0 },
  { id: 'g_need', name: 'จำเป็น', type: 'expense', allocation_type: 'need', order_index: 1 },
  { id: 'g_want', name: 'ตามใจ', type: 'expense', allocation_type: 'want', order_index: 2 },
  { id: 'g_sav', name: 'ลงทุน', type: 'savings', allocation_type: 'savings', order_index: 3 },
];
const cats: Category[] = [
  { id: 'c_sal', name: 'เงินเดือน', type: 'income', cashflowGroup: 'g_inc' },
  { id: 'c_rent', name: 'ค่าเช่า', type: 'expense', cashflowGroup: 'g_need' },
  { id: 'c_fun', name: 'ดูหนัง', type: 'expense', cashflowGroup: 'g_want' },
  { id: 'c_fund', name: 'กองทุน', type: 'savings', cashflowGroup: 'g_sav' },
  // category says expense but its group is savings — the group wins (same rule as Dashboard)
  { id: 'c_odd', name: 'หมวดเพี้ยน', type: 'expense', cashflowGroup: 'g_sav' },
];

const tx = (id: string, date: string, category_id: string, amount: number): TransactionDisplay =>
  ({ id, date, category_id, category: '', description: id, amount });

function run(txs: TransactionDisplay[], excluded = new Set<string>()) {
  const dayData: Record<number, CalendarDayData> = {};
  for (let d = 1; d <= 31; d++) dayData[d] = { inc: 0, exp: 0, items: [], incItems: [] };
  const totals: CalendarTotals = { tInc: 0, tExp: 0, tNeed: 0, tWant: 0, tSav: 0 };
  const catAlloc = {};
  const byId = new Map(cats.map(c => [c.id, c]));
  txs.forEach(t => processCalendarTransaction(t, x => byId.get(x.category_id ?? ''), groups, excluded, dayData, catAlloc, totals));
  return { dayData, totals };
}

describe('processCalendarTransaction', () => {
  it('counts expenses into the day, the month and need/want', () => {
    const { dayData, totals } = run([tx('a', '2026-10-31', 'c_rent', 4500), tx('b', '2026-10-31', 'c_fun', 270)]);
    expect(dayData[31].exp).toBe(4770);
    expect(totals).toMatchObject({ tExp: 4770, tNeed: 4500, tWant: 270, tSav: 0 });
  });

  it('counts income separately from expense', () => {
    const { dayData, totals } = run([tx('a', '2026-10-25', 'c_sal', 25180)]);
    expect(dayData[25].inc).toBe(25180);
    expect(dayData[25].exp).toBe(0);
    expect(totals.tInc).toBe(25180);
  });

  it('keeps savings rows out of expense totals but still lists them on the day', () => {
    const { dayData, totals } = run([tx('a', '2026-10-05', 'c_fund', 1000)]);
    expect(dayData[5].exp).toBe(0);
    expect(dayData[5].items).toHaveLength(1);
    expect(totals).toMatchObject({ tExp: 0, tNeed: 0, tWant: 0, tSav: 1000 });
  });

  it('nets sells (negative amounts) against buys', () => {
    const { totals } = run([tx('a', '2026-10-05', 'c_fund', 1000), tx('b', '2026-10-06', 'c_fund', -400)]);
    expect(totals.tSav).toBe(600);
    expect(totals.tExp).toBe(0);
  });

  it('lets the group type win over the category type', () => {
    const { totals } = run([tx('a', '2026-10-05', 'c_odd', 500)]);
    expect(totals).toMatchObject({ tExp: 0, tSav: 500 });
  });

  it('skips excluded categories entirely', () => {
    const { dayData, totals } = run([tx('a', '2026-10-05', 'c_fund', 1000), tx('b', '2026-10-05', 'c_rent', 10)], new Set(['c_fund']));
    expect(dayData[5].items).toHaveLength(1);
    expect(totals).toMatchObject({ tExp: 10, tSav: 0 });
  });

  it('ignores dates that are not part of the period', () => {
    const dayData: Record<number, CalendarDayData> = { 1: { inc: 0, exp: 0, items: [], incItems: [] } };
    const totals: CalendarTotals = { tInc: 0, tExp: 0, tNeed: 0, tWant: 0, tSav: 0 };
    processCalendarTransaction(tx('a', '2026-10-15', 'c_rent', 99), () => cats[1], groups, new Set(), dayData, {}, totals);
    expect(totals.tExp).toBe(0);
  });
});
