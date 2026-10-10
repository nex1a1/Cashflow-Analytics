import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import useAnalytics from '../useAnalytics';

// useAnalytics is only useMemo, so rendering it once on the server and reading its return value is enough
const run = (props: Parameters<typeof useAnalytics>[0]) => {
  let out!: ReturnType<typeof useAnalytics>;
  const Probe = () => { out = useAnalytics(props); return null; };
  renderToString(React.createElement(Probe));
  return out;
};

const groups: any[] = [
  { id: 'g_inc', name: 'เงินเดือน', type: 'income', allocation_type: null, order_index: 1 },
  { id: 'g_food', name: 'ค่ากิน', type: 'expense', allocation_type: 'need', order_index: 2 },
  { id: 'g_rent', name: 'ค่าหอ/ที่พัก', type: 'expense', allocation_type: 'need', order_index: 3 },
  { id: 'g_sav', name: 'ลงทุน/ออม', type: 'savings', allocation_type: 'savings', order_index: 4 },
];
const cats: any[] = [
  { id: 'c_inc', name: 'เงินเดือน', type: 'income', cashflowGroup: 'g_inc' },
  { id: 'c_food', name: 'ข้าว', type: 'expense', cashflowGroup: 'g_food', allocation_type: 'need' },
  { id: 'c_rent', name: 'ค่าเช่า', type: 'expense', cashflowGroup: 'g_rent', allocation_type: 'need' },
  { id: 'c_sav', name: 'กองทุน', type: 'savings', cashflowGroup: 'g_sav', allocation_type: 'savings' },
];
const tx = (id: string, date: string, category_id: string, amount: number, allocation_type: string | null) =>
  ({ id, date, category_id, category: '', description: '', amount, allocation_type, group_type: '' }) as any;

afterEach(() => vi.useRealTimers());

describe('useAnalytics', () => {
  describe('multi-month selection ("2026-08,2026-10", calendar mode)', () => {
    // getPeriodDateRange cannot bound a comma list, so the loader fetches EVERY month and the backend summary
    // covers the whole database — those totals must not replace the client-side totals of the chosen months.
    const allTimeSummary = {
      summary: { income: 300000, expense: 120000, savings: 0 },
      monthly: ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'].map(month => ({ month, income: 50000, expense: 20000, savings: 0, groups: {} })),
    };
    const rows = ['05', '06', '07', '08', '09', '10'].flatMap((m, i) => [
      tx(`i${i}`, `2026-${m}-05`, 'c_inc', 50000, null),
      tx(`f${i}`, `2026-${m}-10`, 'c_food', 20000, 'need'),
    ]);

    it('totals and chart months cover only the selected months', () => {
      const a = run({ transactions: rows, categories: cats, cashflowGroups: groups, filterPeriod: '2026-08,2026-10', summaryData: allTimeSummary });
      expect(a.totalIncome).toBe(100000);
      expect(a.totalExpense).toBe(40000);
      expect(a.sortedMonthsKeys).toEqual(['2026-08', '2026-10']);
    });

    it('a contiguous month range keeps using the backend summary (it is bounded correctly)', () => {
      const a = run({ transactions: rows, categories: cats, cashflowGroups: groups, filterPeriod: '2026-08_2026-10', summaryData: { ...allTimeSummary, summary: { income: 777, expense: 111, savings: 0 } } });
      expect(a.totalIncome).toBe(777);
    });
  });

  describe('allocation (NEED / WANT / SAVE) donut', () => {
    const month = (extra: any[]) => run({
      transactions: [tx('1', '2026-09-05', 'c_inc', 30000, null), tx('2', '2026-09-10', 'c_food', 20000, 'need'), ...extra],
      categories: cats, cashflowGroups: groups, filterPeriod: '2026-09',
    });
    const slice = (a: ReturnType<typeof run>, id: string) => a.sortedAllocation.find((i: any) => i.id === id)!.amount;

    it('money that was invested is not counted again as leftover cash', () => {
      const a = month([tx('3', '2026-09-12', 'c_sav', 5000, 'savings')]);
      // income 30000 = needs 20000 + savings 10000 (5000 invested + 5000 left over)
      expect(slice(a, 'needs')).toBe(20000);
      expect(slice(a, 'savings')).toBe(10000);
      expect(a.sortedAllocation.reduce((s: number, i: any) => s + i.amount, 0)).toBe(30000);
    });

    it('names the slices in plain Thai; the third one is money left over (investing sits inside it)', () => {
      expect(month([]).sortedAllocation.map((i: any) => [i.id, i.name])).toEqual(
        expect.arrayContaining([['needs', 'NEED'], ['wants', 'WANT'], ['savings', 'SAVE']]),
      );
    });

    it('without any investing the whole leftover is savings', () => {
      expect(slice(month([]), 'savings')).toBe(10000);
    });

    it('a sell reduces the invested amount, never below the real leftover', () => {
      const a = month([tx('3', '2026-09-12', 'c_sav', 5000, 'savings'), tx('4', '2026-09-20', 'c_sav', -2000, 'savings')]);
      expect(slice(a, 'savings')).toBe(10000); // net invested 3000 + leftover 7000
    });
  });

  describe('forecast', () => {
    const october = [tx('1', '2026-10-01', 'c_inc', 50000, null), tx('2', '2026-10-01', 'c_rent', 10000, 'need'), tx('3', '2026-10-15', 'c_food', 31000, 'need')];
    const at = (y: number, m: number, d: number) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(y, m - 1, d, 12)); };

    it('on the last day nothing is left to project: expense stays what was actually spent', () => {
      at(2026, 10, 31);
      const f = run({ transactions: october, categories: cats, cashflowGroups: groups, filterPeriod: '2026-10' }).forecastingDetails!;
      expect(f.currentDay).toBe(31);
      expect(f.remainingDays).toBe(0);
      expect(f.projectedExpense).toBe(41000);
      expect(Number.isFinite(f.safeToSpend)).toBe(true);
    });

    it('mid-month still projects the remaining days', () => {
      at(2026, 10, 15);
      const f = run({ transactions: october, categories: cats, cashflowGroups: groups, filterPeriod: '2026-10' }).forecastingDetails!;
      expect(f.currentDay).toBe(15);
      expect(f.remainingDays).toBe(16);
      // rent 10000 + living 31000 so far + (31000 / 15 per day) * 16 remaining
      expect(Math.round(f.projectedExpense)).toBe(Math.round(10000 + 31000 + (31000 / 15) * 16));
    });
  });
});
