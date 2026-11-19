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

  it('allocation filters never touch income', () => {
    for (const hide of [['want'], ['need'], ['want', 'need', 'savings']]) {
      expect(run(hide).filteredCatMap['c-salary']['2026-08']).toBe(30_000);
    }
  });

});
