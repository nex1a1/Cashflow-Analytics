import { describe, it, expect, vi } from 'vitest';
import { computeCoreAnalytics, elapsedDatesOf } from '../analyticsAggregation';
import type { CashflowGroup, Category, TransactionDisplay } from '../../types';

const groups: CashflowGroup[] = [
  { id: 'g_inc', name: 'เงินเดือน', type: 'income', allocation_type: null, order_index: 1 },
  { id: 'g_food', name: 'ค่ากิน', type: 'expense', allocation_type: 'need', order_index: 2 },
  { id: 'g_fun', name: 'บันเทิง', type: 'expense', allocation_type: 'want', order_index: 5 },
  { id: 'g_sav', name: 'ลงทุน/ออม', type: 'savings', allocation_type: 'savings', order_index: 6 },
];
const categories: Category[] = [
  { id: 'c_inc', name: 'เงินเดือน', type: 'income', cashflowGroup: 'g_inc' },
  { id: 'c_food', name: 'ข้าว', type: 'expense', cashflowGroup: 'g_food' },
  { id: 'c_fun', name: 'หนัง', type: 'expense', cashflowGroup: 'g_fun' },
  { id: 'c_sav', name: 'กองทุน', type: 'savings', cashflowGroup: 'g_sav' },
];
const tx = (id: string, date: string, category_id: string, amount: number): TransactionDisplay =>
  ({ id, date, category: '', category_id, description: '', amount });

// March 2026: 1 Mar is a Sunday → 22 weekdays, 9 weekend days
const transactions = [
  tx('1', '2026-03-01', 'c_inc', 30000),
  tx('2', '2026-03-02', 'c_food', 300), // Mon
  tx('3', '2026-03-07', 'c_food', 200), // Sat
  tx('4', '2026-03-03', 'c_sav', 5000),
  tx('5', '2026-03-04', 'c_fun', 500),
  tx('6', '2026-02-15', 'c_food', 999), // previous month → MoM only
];

describe('computeCoreAnalytics', () => {
  const r = computeCoreAnalytics({
    transactions, categories, cashflowGroups: groups, filterPeriod: '2026-03',
    hideFixedExpenses: false, hideWantExpenses: false, dashboardCategory: 'ALL',
  });

  it('totals one month, keeping savings out of expense', () => {
    expect(r.totals.income).toBe(30000);
    expect(r.totals.expense).toBe(1000);
    expect(r.totals.savings).toBe(5000);
    expect(r.netCashflow).toBe(29000);
    expect(r.savingsRate).toBe(96.7);
    expect(r.totals.food).toBe(500);
    expect([r.totals.fixed, r.totals.variable]).toEqual([500, 500]);
  });

  it('compares with the previous month', () => {
    expect(r.windowMeta.periodLabel).toBe('MoM');
    expect(r.prevTotals).toEqual({ income: 0, expense: 999, net: -999, txCount: 1 });
  });

  it('splits weekday / weekend spend over the days of the month', () => {
    expect(r.dailyWorkdayAvg).toBeCloseTo(800 / 22);
    expect(r.dailyHolidayAvg).toBeCloseTo(200 / 9);
  });

  it('counts invested money once in the SAVE share', () => {
    const save = r.sortedAllocation.find(a => a.id === 'savings')!;
    expect(save.amount).toBe(29000); // 5,000 invested + 24,000 left over
    expect(save.percentage).toBe('96.7');
    expect(r.sortedGroups.map(g => g.id)).toEqual(['g_food', 'g_fun']);
  });
});

describe('computeCoreAnalytics — rent stays out of the per-day figures', () => {
  const rentGroups: CashflowGroup[] = [...groups, { id: 'g_rent', name: 'ภาระที่พักอาศัย', type: 'expense', allocation_type: 'need', order_index: 3 }];
  const rentCats: Category[] = [...categories, { id: 'c_rent', name: 'ค่าเช่า/ค่าหอพัก', type: 'expense', cashflowGroup: 'g_rent' }];
  const r = computeCoreAnalytics({
    transactions: [...transactions, tx('7', '2026-03-02', 'c_rent', 6200)], // paid on a Monday
    categories: rentCats, cashflowGroups: rentGroups, filterPeriod: '2026-03',
    hideFixedExpenses: false, hideWantExpenses: false, dashboardCategory: 'ALL',
  });

  it('keeps the rent-inclusive average and adds one without rent', () => {
    expect(r.totals.rent).toBe(6200);
    expect(r.adjustedDailyAvg).toBeCloseTo(7200 / 31);
    expect(r.livingDailyAvg).toBeCloseTo(1000 / 31);
  });

  it('leaves rent out of the work-day / day-off split, so the day it was paid does not look heavier', () => {
    expect(r.dailyWorkdayAvg).toBeCloseTo(800 / 22);
    expect(r.dailyHolidayAvg).toBeCloseTo(200 / 9);
  });
});

describe('elapsedDatesOf', () => {
  const nov = Array.from({ length: 30 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`);

  it('keeps the days up to and including today in the current month', () => {
    expect(elapsedDatesOf(nov, '2026-11-06')).toEqual(nov.slice(0, 6));
  });

  it('keeps the whole period once it is over, and for a period that has not started yet', () => {
    expect(elapsedDatesOf(nov, '2026-12-15')).toEqual(nov);
    expect(elapsedDatesOf(nov, '2026-10-01')).toEqual(nov);
  });
});

describe('computeCoreAnalytics — a month still in progress', () => {
  it('per-day averages divide by the days so far, not the whole month', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 10, 12)); // 10 March 2026, local time
    try {
      const r = computeCoreAnalytics({
        transactions, categories, cashflowGroups: groups, filterPeriod: '2026-03',
        hideFixedExpenses: false, hideWantExpenses: false, dashboardCategory: 'ALL',
      });
      expect(r.elapsedDays).toBe(10);
      expect(r.adjustedDailyAvg).toBeCloseTo(1000 / 10);
      // 1–10 March: 7 weekdays (2–6, 9, 10), 3 weekend days (1, 7, 8)
      expect(r.dailyWorkdayAvg).toBeCloseTo(800 / 7);
      expect(r.dailyHolidayAvg).toBeCloseTo(200 / 3);
    } finally {
      vi.useRealTimers();
    }
  });
});
