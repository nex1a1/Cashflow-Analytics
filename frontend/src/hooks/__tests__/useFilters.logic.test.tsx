// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@/test-utils/renderHook';
import useFilters from '../useFilters';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { toCycleKey } from '@/utils/payCycle';
import type { TransactionDisplay } from '@/types';

const h = vi.hoisted(() => ({ calls: [] as string[], result: [] as unknown[], fail: false }));
// plain functions: nothing here calls vi.restoreAllMocks()
vi.mock('@/services/api', () => ({
  transactionService: {
    search: (q: string) => { h.calls.push(q); return h.fail ? Promise.reject(new Error('down')) : Promise.resolve(h.result); },
  },
}));

const cats: any[] = [
  { id: 'c-food', name: 'ค่ากิน', type: 'expense', allocation_type: 'need', cashflow_group_id: 'g-food' },
  { id: 'c-fun', name: 'บันเทิง', type: 'expense', allocation_type: 'want', cashflowGroup: 'g-fun' }, // linked by the camel-case field
  { id: 'c-salary', name: 'เงินเดือน', type: 'income', cashflow_group_id: 'g-sal' },
  { id: 'c-gold', name: 'ออมทอง', type: 'savings', cashflow_group_id: 'g-sav' },
];
const tx = (id: string, date: string, category_id: string, amount: number, extra: Record<string, unknown> = {}): TransactionDisplay => {
  const c = cats.find(x => x.id === category_id);
  return { id, date, category_id, category: c.name, amount, description: id, ...extra } as TransactionDisplay;
};
// 2026-01-03 Sat · 05 Mon · 06 Tue
const data = [
  tx('food', '2026-01-03', 'c-food', 100),
  tx('fun', '2026-01-05', 'c-fun', 300),
  tx('pay', '2026-01-05', 'c-salary', 30000),
  tx('gold', '2026-01-06', 'c-gold', 2000, { allocation_type: 'savings' }),
  tx('sell', '2026-01-06', 'c-gold', -500, { allocation_type: 'savings' }),
  tx('feb', '2026-02-02', 'c-food', 50),
];

let hook: ReturnType<typeof setup>;
const setup = (transactions = data, masterPeriods: string[] = []) => {
  const r = renderHook(() => useFilters({ transactions, categories: cats, masterPeriods }));
  act(() => { r.result.current.setFilterPeriod('2026-01'); });
  return r;
};
const f = () => hook.result.current;
const ids = () => f().displayTransactions.map(t => t.id);
const set = (fn: (c: ReturnType<typeof f>) => void) => act(() => fn(f()));

beforeEach(() => { h.calls.length = 0; h.result = []; h.fail = false; try { localStorage.clear(); } catch { /* ignore */ } });
afterEach(() => { hook?.unmount(); vi.useRealTimers(); });

describe('useFilters — period', () => {
  it('opens on the current calendar month', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 15, 12));
    hook = renderHook(() => useFilters({ transactions: [], categories: cats }));
    expect(f().filterPeriod).toBe('2026-03');
  });

  it('opens on the current pay cycle when that was the last mode used', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 30, 12)); // after the 25th
    localStorage.setItem(STORAGE_KEYS.PERIOD_MODE, 'cycle');
    hook = renderHook(() => useFilters({ transactions: [], categories: cats }));
    expect(f().filterPeriod).toBe(`cycle:${toCycleKey('2026-03-30')}`);
  });

  it('remembers calendar vs cycle mode', () => {
    hook = setup();
    expect(localStorage.getItem(STORAGE_KEYS.PERIOD_MODE)).toBe('calendar');
    set(c => c.setFilterPeriod('cycle:2026-01'));
    expect(localStorage.getItem(STORAGE_KEYS.PERIOD_MODE)).toBe('cycle');
  });

  it('only a single month or cycle is editable; a year, range or "all" is read-only', () => {
    hook = setup();
    expect(f().isReadOnlyView).toBe(false);
    for (const p of ['2026', 'ALL', '2026-01_2026-03', '2026-01,2026-03']) {
      set(c => c.setFilterPeriod(p));
      expect(f().isReadOnlyView, p).toBe(true);
    }
    set(c => c.setFilterPeriod('cycle:2026-01'));
    expect(f().isReadOnlyView).toBe(false);
  });

  it('changing the period drops a date picked for the previous one', () => {
    hook = setup();
    set(c => c.setAdvancedFilterDate('2026-01-05'));
    set(c => c.setFilterPeriod('2026-02'));
    expect(f().advancedFilterDate).toBe('ALL');
  });

  it('shows only rows of the period (month, year, everything)', () => {
    hook = setup();
    expect(ids()).toEqual(['food', 'fun', 'pay', 'gold', 'sell']);
    set(c => c.setFilterPeriod('2026-02'));
    expect(ids()).toEqual(['feb']);
    set(c => c.setFilterPeriod('2026'));
    expect(ids()).toHaveLength(6);
    set(c => c.setFilterPeriod('ALL'));
    expect(ids()).toHaveLength(6);
  });
});

describe('useFilters — the filters', () => {
  it('type: income / expense / savings', () => {
    hook = setup();
    set(c => c.setTypeFilter('INCOME'));
    expect(ids()).toEqual(['pay']);
    set(c => c.setTypeFilter('EXPENSE'));
    expect(ids()).toEqual(['food', 'fun']);
    set(c => c.setTypeFilter('SAVINGS'));
    expect(ids()).toEqual(['gold', 'sell']);
  });

  it('date: one day, a list, a range, weekdays or weekends', () => {
    hook = setup();
    set(c => c.setAdvancedFilterDate('2026-01-05'));
    expect(ids()).toEqual(['fun', 'pay']);
    set(c => c.setAdvancedFilterDate('2026-01-03,2026-01-06'));
    expect(ids()).toEqual(['food', 'gold', 'sell']);
    set(c => c.setAdvancedFilterDate('2026-01-04:2026-01-05'));
    expect(ids()).toEqual(['fun', 'pay']); // the end day is in
    set(c => c.setAdvancedFilterDate('2026-01-05:2026-01-06'));
    expect(ids()).toEqual(['fun', 'pay', 'gold', 'sell']); // and so is the start day
    set(c => c.setAdvancedFilterDate('WEEKEND'));
    expect(ids()).toEqual(['food']);
    set(c => c.setAdvancedFilterDate('WEEKDAY'));
    expect(ids()).toEqual(['fun', 'pay', 'gold', 'sell']);
  });

  it('category: a list, a single name, or the literal "all"', () => {
    hook = setup();
    set(c => c.setAdvancedFilterCategory(['ค่ากิน', 'เงินเดือน']));
    expect(ids()).toEqual(['food', 'pay']);
    set(c => c.setAdvancedFilterCategory('บันเทิง'));
    expect(ids()).toEqual(['fun']);
    set(c => c.setAdvancedFilterCategory('ALL'));
    expect(ids()).toHaveLength(5);
  });

  it('an EMPTY category list shows nothing', () => {
    hook = setup();
    set(c => c.setAdvancedFilterCategory([]));
    expect(ids()).toEqual([]);
  });

  it('group: by the category\'s group id, whichever field holds it', () => {
    hook = setup();
    set(c => c.setAdvancedFilterGroup('g-food'));
    expect(ids()).toEqual(['food']);
    set(c => c.setAdvancedFilterGroup('g-fun')); // linked through `cashflowGroup`
    expect(ids()).toEqual(['fun']);
  });

  it('amount range compares the size, so a sell (negative) counts by its absolute value', () => {
    hook = setup();
    set(c => c.setMinAmount('400'));
    expect(ids()).toEqual(['pay', 'gold', 'sell']);
    set(c => c.setMaxAmount('600'));
    expect(ids()).toEqual(['sell']);
    set(c => { c.setMinAmount(''); c.setMaxAmount('150'); });
    expect(ids()).toEqual(['food']);
  });

  it('allocation: the row\'s own value, else its category\'s; income never matches', () => {
    hook = setup();
    set(c => c.setAllocationFilter('need'));
    expect(ids()).toEqual(['food']);
    set(c => c.setAllocationFilter('want'));
    expect(ids()).toEqual(['fun']);
    set(c => c.setAllocationFilter('savings'));
    expect(ids()).toEqual(['gold', 'sell']);
  });

  it('a row with no allocation anywhere counts as WANT', () => {
    const noAlloc: any[] = [...cats, { id: 'c-misc', name: 'จิปาถะ', type: 'expense' }];
    hook = renderHook(() => useFilters({ transactions: [{ id: 'm', date: '2026-01-05', category_id: 'c-misc', category: 'จิปาถะ', amount: 10, description: '' } as TransactionDisplay], categories: noAlloc }));
    act(() => { hook.result.current.setFilterPeriod('2026-01'); });
    set(c => c.setAllocationFilter('want'));
    expect(ids()).toEqual(['m']);
    set(c => c.setAllocationFilter('need'));
    expect(ids()).toEqual([]);
  });

  it('weekday / weekend switch', () => {
    hook = setup();
    set(c => c.setDayTypeFilter('WEEKEND'));
    expect(ids()).toEqual(['food']);
    set(c => c.setDayTypeFilter('WEEKDAY'));
    expect(ids()).toEqual(['fun', 'pay', 'gold', 'sell']);
  });

  it('filters combine', () => {
    hook = setup();
    set(c => { c.setTypeFilter('EXPENSE'); c.setMinAmount('200'); });
    expect(ids()).toEqual(['fun']);
  });
});

describe('useFilters — "is a filter on?" and clearing', () => {
  const on = (apply: (c: ReturnType<typeof f>) => void) => { hook = setup(); expect(f().isFilterActive).toBe(false); set(apply); return f().isFilterActive; };

  it('is off by default', () => {
    hook = setup();
    expect(f().isFilterActive).toBe(false);
  });

  it.each([
    ['search text', (c: ReturnType<typeof f>) => c.setSearchQuery('กาแฟ')],
    ['a date', (c: ReturnType<typeof f>) => c.setAdvancedFilterDate('2026-01-05')],
    ['a group', (c: ReturnType<typeof f>) => c.setAdvancedFilterGroup('g-food')],
    ['a category', (c: ReturnType<typeof f>) => c.setAdvancedFilterCategory(['ค่ากิน'])],
    ['a single category name', (c: ReturnType<typeof f>) => c.setAdvancedFilterCategory('ค่ากิน')],
    ['the type', (c: ReturnType<typeof f>) => c.setTypeFilter('INCOME')],
    ['the allocation', (c: ReturnType<typeof f>) => c.setAllocationFilter('need')],
    ['a minimum', (c: ReturnType<typeof f>) => c.setMinAmount('5')],
    ['a maximum', (c: ReturnType<typeof f>) => c.setMaxAmount('5')],
    ['the day type', (c: ReturnType<typeof f>) => c.setDayTypeFilter('WEEKEND')],
  ])('is on for %s', (_name, apply) => {
    expect(on(apply)).toBe(true);
  });

  it('is on when the category selection was cleared to nothing (the list is empty because of it)', () => {
    expect(on(c => c.setAdvancedFilterCategory([]))).toBe(true);
  });

  it('clearFilters resets every filter at once', () => {
    hook = setup();
    set(c => {
      c.setSearchQuery('x'); c.setAdvancedFilterCategory([]); c.setAdvancedFilterGroup('g-food'); c.setAdvancedFilterDate('2026-01-05');
      c.setTypeFilter('INCOME'); c.setAllocationFilter('need'); c.setMinAmount('1'); c.setMaxAmount('9'); c.setDayTypeFilter('WEEKEND');
    });
    expect(f().isFilterActive).toBe(true);
    set(c => c.clearFilters());
    expect(f().isFilterActive).toBe(false);
    expect(ids()).toEqual(['food', 'fun', 'pay', 'gold', 'sell']);
    expect([f().searchQuery, f().typeFilter, f().minAmount, f().maxAmount, f().advancedFilterCategory]).toEqual(['', 'ALL', '', '', 'ALL']);
  });
});

describe('useFilters — what the period contains', () => {
  it('days that have rows, oldest first, once each', () => {
    hook = setup();
    expect(f().availableDatesInPeriod).toEqual(['2026-01-03', '2026-01-05', '2026-01-06']);
  });

  it('every day of a month for the horizontal table', () => {
    hook = setup();
    expect(f().allDatesInPeriod).toHaveLength(31);
    expect(f().allDatesInPeriod[0]).toBe('2026-01-01');
  });

  it('the groups and categories that actually have rows in the period', () => {
    hook = setup();
    expect([...f().activeCashflowGroupIds].sort()).toEqual(['g-food', 'g-fun', 'g-sal', 'g-sav']);
    expect([...f().activeCategoryNames].sort()).toEqual(['ออมทอง', 'บันเทิง', 'เงินเดือน', 'ค่ากิน'].sort());
    set(c => c.setFilterPeriod('2026-02'));
    expect([...f().activeCashflowGroupIds]).toEqual(['g-food']);
    expect([...f().activeCategoryNames]).toEqual(['ค่ากิน']);
  });

  it('a row of a deleted category still counts by its name', () => {
    hook = setup([{ id: 'x', date: '2026-01-05', category: 'หมวดเก่า', amount: 1, description: '' } as TransactionDisplay]);
    expect([...f().activeCategoryNames]).toEqual(['หมวดเก่า']);
    expect([...f().activeCashflowGroupIds]).toEqual([]);
  });

  it.each(Array.from({ length: 12 }, (_, i) => i + 1))('month %i belongs to the right quarter and half-year', (m) => {
    const mm = String(m).padStart(2, '0');
    hook = setup(data, [`2026-${mm}`]);
    const y = f().groupedOptions.yearsMap['2026'];
    expect([...y.quarters]).toEqual([`2026-Q${Math.ceil(m / 3)}`]);
    expect([...y.halves]).toEqual([`2026-H${m <= 6 ? 1 : 2}`]);
  });

  it('period picker options are grouped by year with the quarters and halves that have data', () => {
    hook = setup(data, ['2026-01', '2026-02', '2025-11', '2025-07']);
    const { yearsMap, sortedYears } = f().groupedOptions;
    expect(sortedYears).toEqual(['2026', '2025']);
    expect([...yearsMap['2026'].months].sort()).toEqual(['2026-01', '2026-02']);
    expect([...yearsMap['2026'].quarters]).toEqual(['2026-Q1']);
    expect([...yearsMap['2026'].halves]).toEqual(['2026-H1']);
    expect([...yearsMap['2025'].quarters].sort()).toEqual(['2025-Q3', '2025-Q4']);
    expect([...yearsMap['2025'].halves]).toEqual(['2025-H2']);
    expect(f().rawAvailableMonths).toEqual(['2026-02', '2026-01', '2025-11', '2025-07']); // newest first
  });
});

describe('useFilters — search', () => {
  const found = [tx('found', '2026-01-05', 'c-fun', 123), tx('other-month', '2026-02-05', 'c-fun', 9)];
  const settle = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };

  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); });

  it('waits for a pause in typing (300 ms) before asking the server', async () => {
    hook = setup();
    set(c => c.setSearchQuery('กา'));
    act(() => { vi.advanceTimersByTime(200); });
    set(c => c.setSearchQuery('กาแฟ'));
    act(() => { vi.advanceTimersByTime(200); });
    expect(h.calls).toEqual([]);
    act(() => { vi.advanceTimersByTime(150); });
    await settle();
    expect(h.calls).toEqual(['กาแฟ']);
  });

  it('shows what the server found (within the period) instead of the local list', async () => {
    h.result = found;
    hook = setup();
    set(c => c.setSearchQuery('  กาแฟ '));
    act(() => { vi.advanceTimersByTime(300); });
    await settle();
    expect(h.calls).toEqual(['กาแฟ']); // trimmed
    expect(ids()).toEqual(['found']);
  });

  it('a blank search goes back to the normal list and does not call the server', async () => {
    hook = setup();
    set(c => c.setSearchQuery('   '));
    act(() => { vi.advanceTimersByTime(300); });
    await settle();
    expect(h.calls).toEqual([]);
    expect(ids()).toHaveLength(5);
  });

  it('clearing the search brings the full list back', async () => {
    h.result = found;
    hook = setup();
    set(c => c.setSearchQuery('กาแฟ'));
    act(() => { vi.advanceTimersByTime(300); });
    await settle();
    set(c => c.setSearchQuery(''));
    act(() => { vi.advanceTimersByTime(300); });
    await settle();
    expect(ids()).toEqual(['food', 'fun', 'pay', 'gold', 'sell']);
  });

  it('the other filters still apply to search results', async () => {
    h.result = [tx('a', '2026-01-05', 'c-fun', 123), tx('b', '2026-01-05', 'c-food', 500)];
    hook = setup();
    set(c => c.setSearchQuery('x'));
    act(() => { vi.advanceTimersByTime(300); });
    await settle();
    set(c => c.setMinAmount('300'));
    expect(ids()).toEqual(['b']);
  });

  it('an edit made while a search is showing is reflected in the result rows', async () => {
    h.result = [tx('a', '2026-01-05', 'c-fun', 123)];
    let transactions = data;
    const r = renderHook(() => useFilters({ transactions, categories: cats }));
    hook = r;
    act(() => { r.result.current.setFilterPeriod('2026-01'); });
    act(() => { r.result.current.setSearchQuery('x'); });
    act(() => { vi.advanceTimersByTime(300); });
    await settle();
    expect(r.result.current.displayTransactions[0].amount).toBe(123);
    // the row is edited elsewhere → the context hands down a new transactions array
    transactions = [...data.filter(t => t.id !== 'fun'), { ...tx('a', '2026-01-05', 'c-fun', 777) }];
    act(() => { r.result.current.setMinAmount('1'); }); // any state change re-renders the hook with the new array
    await settle();
    expect(r.result.current.displayTransactions[0].amount).toBe(777);
  });
});
