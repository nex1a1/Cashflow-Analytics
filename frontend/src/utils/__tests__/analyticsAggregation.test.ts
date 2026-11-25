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

describe('computeCoreAnalytics — a year with months still ahead', () => {
  // Today 23 Nov 2026. 2025 has rows only from June; December 2026 holds only rows entered ahead.
  const year = [
    tx('a1', '2025-06-25', 'c_inc', 20000), tx('a2', '2025-06-10', 'c_food', 10000),
    tx('a3', '2025-12-25', 'c_inc', 20000), tx('a4', '2025-12-10', 'c_food', 10000),
    tx('b1', '2026-01-25', 'c_inc', 25000), tx('b2', '2026-01-10', 'c_food', 12000),
    tx('b3', '2026-06-25', 'c_inc', 25000), tx('b4', '2026-06-10', 'c_food', 15000),
    tx('b5', '2026-11-30', 'c_food', 4500), // later this month: still counted, like the table
    tx('b6', '2026-12-25', 'c_inc', 25000), tx('b7', '2026-12-30', 'c_food', 7000), // not started
  ];
  const run = () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 23, 12));
    try {
      return computeCoreAnalytics({
        transactions: year, categories, cashflowGroups: groups, filterPeriod: '2026',
        hideFixedExpenses: false, hideWantExpenses: false, dashboardCategory: 'ALL',
      });
    } finally {
      vi.useRealTimers();
    }
  };

  it('headline totals leave out the month that has not started, and keep it as plan', () => {
    const r = run();
    expect(r.vitals.income).toBe(50000);
    expect(r.vitals.expense).toBe(31500);
    expect(r.vitals.net).toBe(18500);
    expect(r.vitals.planned).toEqual({ income: 25000, expense: 7000, savings: 0 });
    expect(r.totals.income).toBe(75000); // the rest of the dashboard still sees the plan rows
  });

  it('compares only the months both years have', () => {
    const r = run();
    // June is the only started 2026 month whose 2025 month has rows (Dec 2026 has not started)
    expect(r.prevTotals).toMatchObject({ income: 20000, expense: 10000, txCount: 2, months: ['2026-06'] });
    expect(r.prevTotals.current).toEqual({ income: 25000, expense: 15000 });
  });

  it('a pay-cycle year compares with the cycle year before, cycle by cycle', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 23, 12));
    try {
      const r = computeCoreAnalytics({
        transactions: year, categories, cashflowGroups: groups, filterPeriod: 'cycle:2026-01_2026-12',
        hideFixedExpenses: false, hideWantExpenses: false, dashboardCategory: 'ALL',
      });
      expect(r.windowMeta.periodLabel).toBe('YoY');
      // only cycle Jun 2026 has a cycle a year back: cycles Jan / May 2025 (food 10 Jun) began before the first
      // pay day (25 Jun 2025), Nov / Dec 2026 have not started
      expect(r.prevTotals).toMatchObject({ income: 20000, expense: 0, txCount: 1, months: ['2026-06'], cycle: true });
      expect(r.prevTotals.current).toEqual({ income: 25000, expense: 0 });
    } finally {
      vi.useRealTimers();
    }
  });

  it('a single month keeps its rows entered ahead in the headline', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 23, 12));
    try {
      const r = computeCoreAnalytics({
        transactions: year, categories, cashflowGroups: groups, filterPeriod: '2026-12',
        hideFixedExpenses: false, hideWantExpenses: false, dashboardCategory: 'ALL',
      });
      expect(r.vitals.income).toBe(25000);
      expect(r.vitals.planned.income).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
