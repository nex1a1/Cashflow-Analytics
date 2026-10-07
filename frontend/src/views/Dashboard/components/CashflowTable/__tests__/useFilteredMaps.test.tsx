// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@/test-utils/renderHook';
import { useFilteredMaps } from '../useFilteredMaps';
import { toCycleKey } from '@/utils/payCycle';
import type { CashflowGroup, Category, TransactionDisplay } from '@/types';
import type { Analytics } from '../types';

const groups: CashflowGroup[] = [
  { id: 'g-inc', name: 'รายรับ', type: 'income', allocation_type: null, order_index: 1 },
  { id: 'g-need', name: 'จำเป็น', type: 'expense', allocation_type: 'need', order_index: 2 },
  { id: 'g-mixed', name: 'ผสม', type: 'expense', allocation_type: 'want', order_index: 3 },
];
const categories: Category[] = [
  { id: 'c-salary', name: 'เงินเดือน', cashflow_group_id: 'g-inc' },
  { id: 'c-rent', name: 'ค่าเช่า', cashflow_group_id: 'g-need' },
  { id: 'c-snack', name: 'ขนม', cashflow_group_id: 'g-mixed' },
  { id: 'c-gym', name: 'ฟิตเนส', cashflow_group_id: 'g-mixed', allocation_type: 'need' }, // category beats group
];
const analytics = { sortedCashflow: [{ monthStr: '2026-08', groups: {} }, { monthStr: '2026-09', groups: {} }] } as unknown as Analytics;
const tx = (id: string, date: string, category_id: string | undefined, amount: number, extra: Record<string, unknown> = {}) =>
  ({ id, date, category_id, category: '', description: id, amount, ...extra }) as unknown as TransactionDisplay;
const rows = [
  tx('salary', '2026-08-25', 'c-salary', 30_000),
  tx('rent', '2026-08-01', 'c-rent', 8_000),
  tx('snack', '2026-08-03', 'c-snack', 200),
  tx('gym', '2026-08-04', 'c-gym', 900),
  tx('snack-sep', '2026-09-03', 'c-snack', 300),
];

const run = (excluded: string[], over: Partial<Parameters<typeof useFilteredMaps>[0]> = {}) => {
  const h = renderHook(() => useFilteredMaps({
    transactions: rows, categories, cashflowGroups: groups, excludedAllocations: new Set(excluded), analytics, ...over,
  }));
  const value = h.result.current;
  h.unmount();
  return value;
};

describe('useFilteredMaps', () => {
  it('does nothing while no allocation is hidden (the analytics figures are used as they are)', () => {
    const { filteredCatMap, filteredGroupMap } = run([]);
    expect(filteredCatMap).toEqual({});
    expect(filteredGroupMap).toEqual({});
  });

  it('starts every category / group / month at 0 once a filter is on, so a hidden figure reads 0 rather than "unknown"', () => {
    const { filteredCatMap, filteredGroupMap } = run(['savings']);
    expect(filteredCatMap['c-gym']).toEqual({ '2026-08': 900, '2026-09': 0 });
    expect(Object.keys(filteredGroupMap)).toEqual(['g-inc', 'g-need', 'g-mixed']);
  });

  it('hiding WANT removes the WANT rows: a row\'s own allocation, else its category\'s, else its group\'s', () => {
    const { filteredCatMap, filteredGroupMap } = run(['want']);
    expect(filteredCatMap['c-snack']).toEqual({ '2026-08': 0, '2026-09': 0 }); // group default 'want'
    expect(filteredCatMap['c-gym']['2026-08']).toBe(900);                       // category says NEED
    expect(filteredGroupMap['g-mixed']).toEqual({ '2026-08': 900, '2026-09': 0 });
  });

  it('a row\'s own allocation beats both', () => {
    const { filteredCatMap } = run(['want'], { transactions: [tx('x', '2026-08-04', 'c-gym', 100, { allocation_type: 'want' })] });
    expect(filteredCatMap['c-gym']['2026-08']).toBe(0);
    const again = run(['need'], { transactions: [tx('y', '2026-08-04', 'c-snack', 100, { allocation_type: 'need' })] });
    expect(again.filteredCatMap['c-snack']['2026-08']).toBe(0);
  });

  it('hiding NEED removes NEED rows and keeps WANT rows', () => {
    const { filteredCatMap } = run(['need']);
    expect(filteredCatMap['c-rent']['2026-08']).toBe(0);
    expect(filteredCatMap['c-gym']['2026-08']).toBe(0);
    expect(filteredCatMap['c-snack']).toEqual({ '2026-08': 200, '2026-09': 300 });
  });

  it('allocation filters never touch income', () => {
    for (const hide of [['want'], ['need'], ['want', 'need', 'savings']]) {
      expect(run(hide).filteredCatMap['c-salary']['2026-08']).toBe(30_000);
    }
  });

  it('rows are added up per month', () => {
    const { filteredCatMap, filteredGroupMap } = run(['savings'], { transactions: [...rows, tx('snack2', '2026-08-20', 'c-snack', 50)] });
    expect(filteredCatMap['c-snack']['2026-08']).toBe(250);
    expect(filteredGroupMap['g-mixed']['2026-08']).toBe(250 + 900);
  });

  it('skips deleted rows, rows without a category, and rows of an unknown category or without a date', () => {
    const { filteredCatMap } = run(['savings'], { transactions: [
      tx('del', '2026-08-04', 'c-rent', 9_999, { is_deleted: true }),
      tx('no-cat', '2026-08-04', undefined, 9_999),
      tx('ghost', '2026-08-04', 'c-ghost', 9_999),
      tx('no-date', '', 'c-rent', 9_999),
    ] });
    expect(Object.values(filteredCatMap).flatMap(m => Object.values(m)).every(v => v === 0)).toBe(true);
  });

  it('ignores rows in months the table does not show', () => {
    const { filteredCatMap } = run(['savings'], { transactions: [tx('out', '2027-01-04', 'c-rent', 1_000)] });
    expect(filteredCatMap['c-rent']).toEqual({ '2026-08': 0, '2026-09': 0 });
  });

  it('pay-cycle mode groups rows by cycle: the 25th starts the next one', () => {
    const cycleAnalytics = { sortedCashflow: [{ monthStr: '2026-07', groups: {} }, { monthStr: '2026-08', groups: {} }] } as unknown as Analytics;
    const { filteredCatMap } = run(['savings'], {
      analytics: cycleAnalytics, keyFn: toCycleKey,
      transactions: [tx('a', '2026-08-24', 'c-rent', 100), tx('b', '2026-08-25', 'c-rent', 200)],
    });
    expect(filteredCatMap['c-rent']).toEqual({ '2026-07': 100, '2026-08': 200 });
  });

});
