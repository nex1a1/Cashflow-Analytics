// @vitest-environment jsdom
import type { Mock } from 'vitest';
type AnyMock = Mock<(...args: any[]) => any>;
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import FilterBar from '../common/FilterBar';
import HorizontalFilterBar from '../HorizontalView/HorizontalFilterBar';
import { EXCLUDED_HEATMAP_CATEGORIES, HeatmapEngineOptions } from '../../hooks/useHeatmapEngine';
import { byText, click, q, type } from '@/test-utils/dom';
import type { Category, TransactionDisplay } from '@/types';

const h = vi.hoisted(() => ({ matrix: null as any, date: null as any }));
// The category matrix and the date picker are tested on their own; here they only report what they were given.
vi.mock('@/views/Ledger/components/common/CategoryMatrixFilter', async () => {
  const React = await import('react');
  return { default: (p: any) => { h.matrix = p; return React.createElement('div', { 'data-testid': 'matrix' }); } };
});
vi.mock('@/components/ui/DatePicker', async () => {
  const React = await import('react');
  return { default: (p: any) => { h.date = p; return React.createElement('div', { 'data-testid': 'date' }); } };
});

const categories: Category[] = [
  { id: 'c-food', name: 'ค่ากิน', type: 'expense' },
  { id: 'c-fun', name: 'บันเทิง', type: 'expense' },
  { id: 'c-rent', name: 'ค่าเช่า/ค่าหอพัก', type: 'expense' },
  { id: 'c-power', name: 'ค่าไฟ', type: 'expense' },
  { id: 'c-net', name: 'ค่าเน็ต', type: 'expense' },
  { id: 'c-water', name: 'ค่าน้ำ', type: 'expense' },
  { id: 'c-salary', name: 'เงินเดือน', type: 'income' },
];
const tx = (id: string, category_id: string): TransactionDisplay => {
  const c = categories.find(x => x.id === category_id)!;
  return { id, category_id, category: c.name, date: '2026-01-05', amount: 100, description: id } as TransactionDisplay;
};

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = (el: React.ReactElement) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(el));
};
const btn = (text: string) => byText('button', text)!;
const text = () => container!.textContent!;
const on = (b: HTMLElement) => b.getAttribute('aria-pressed') === 'true';

beforeEach(() => { h.matrix = null; h.date = null; });
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

describe('FilterBar (list view)', () => {
  const noop = () => {};
  const base = {
    searchQuery: '', setSearchQuery: noop, advancedFilterDate: 'ALL', setAdvancedFilterDate: noop,
    advancedFilterGroup: 'ALL', setAdvancedFilterGroup: noop, advancedFilterCategory: 'ALL' as string | string[], setAdvancedFilterCategory: noop,
    typeFilter: 'ALL', setTypeFilter: noop, allocationFilter: 'ALL', setAllocationFilter: noop, minAmount: '', setMinAmount: noop,
    maxAmount: '', setMaxAmount: noop, dayTypeFilter: 'ALL', setDayTypeFilter: noop, availableDatesInPeriod: ['2026-01-05'],
    cashflowGroups: [], activeCashflowGroupIds: new Set<string>(), activeCategoryNames: new Set<string>(['ค่ากิน']), categories,
    clearFilters: noop, isFilterActive: false, filterPeriod: '2026-01',
  };
  const bar = (over: Record<string, unknown> = {}) => {
    const spies = {
      setSearchQuery: vi.fn(), setTypeFilter: vi.fn(), setAllocationFilter: vi.fn(), setMinAmount: vi.fn(), setMaxAmount: vi.fn(),
      setAdvancedFilterDate: vi.fn(), setDayTypeFilter: vi.fn(), clearFilters: vi.fn(), setAdvancedFilterGroup: vi.fn(),
    };
    mount(<FilterBar {...base} {...spies} {...over} />);
    return spies;
  };
  const search = () => q<HTMLInputElement>('input[placeholder^="ค้นหา"]')!;

  describe('the quick strip', () => {

    it('the type switch: all / income / expense, the current one lit', () => {
      const s = bar({ typeFilter: 'INCOME' });
      expect(on(btn('รายรับ'))).toBe(true);
      expect(on(btn('ทั้งหมด'))).toBe(false);
      click(btn('รายจ่าย'));
      expect(s.setTypeFilter).toHaveBeenLastCalledWith('EXPENSE');
      click(btn('ทั้งหมด'));
      expect(s.setTypeFilter).toHaveBeenLastCalledWith('ALL');
      click(btn('รายรับ'));
      expect(s.setTypeFilter).toHaveBeenLastCalledWith('INCOME');
      click(btn('ลงทุน'));
      expect(s.setTypeFilter).toHaveBeenLastCalledWith('SAVINGS');
    });

  });

  describe('the second row', () => {
    it('min and max amount', () => {
      const s = bar({ minAmount: '5' });
      expect(q<HTMLInputElement>('input[aria-label="ยอดต่ำสุด"]')!.value).toBe('5');
      type(q('input[aria-label="ยอดต่ำสุด"]'), '10');
      expect(s.setMinAmount).toHaveBeenLastCalledWith('10');
      type(q('input[aria-label="ยอดสูงสุด"]'), '99');
      expect(s.setMaxAmount).toHaveBeenLastCalledWith('99');
    });

    it('allocation: all / Need / Want / Save', () => {
      const s = bar({ allocationFilter: 'want' });
      expect(on(btn('Want'))).toBe(true);
      expect(on(btn('Need'))).toBe(false);
      click(btn('Need'));
      expect(s.setAllocationFilter).toHaveBeenLastCalledWith('need');
      click(btn('Save'));
      expect(s.setAllocationFilter).toHaveBeenLastCalledWith('savings');
      click(btn('Want'));
      expect(s.setAllocationFilter).toHaveBeenLastCalledWith('want');
    });

    it('a group picked from the breakdown shows as a chip that clears it', () => {
      const s = bar({ advancedFilterGroup: 'g-food', cashflowGroups: [{ id: 'g-food', name: 'ค่ากิน', type: 'expense' }] });
      expect(text()).toContain('กลุ่ม: ค่ากิน');
      click(q('button[title="ล้างตัวกรองกลุ่ม"]'));
      expect(s.setAdvancedFilterGroup).toHaveBeenLastCalledWith('ALL');
    });

  });
});

describe('HorizontalFilterBar (table view)', () => {
  /** Holds the filters in real state, as the Ledger does, and exposes the latest value. */
  let current: HeatmapEngineOptions;
  let clearSpy: AnyMock;
  function Harness({ initial, monthTransactions, activeCount, isFilterActive = false, cats = categories }: {
    initial?: HeatmapEngineOptions; monthTransactions: TransactionDisplay[]; activeCount?: number; isFilterActive?: boolean; cats?: Category[];
  }) {
    const [filters, setFilters] = useState<HeatmapEngineOptions>(initial ?? { selectedCategories: 'ALL', includeFixedCosts: false, allocationFilter: 'ALL', dayTypeFilter: 'ALL', hideZeroDays: false });
    current = filters;
    return (
      <HorizontalFilterBar
        categories={cats} cashflowGroups={[]} monthTransactions={monthTransactions}
        filters={filters} setFilters={setFilters} clearFilters={clearSpy} isFilterActive={isFilterActive} activeCount={activeCount}
      />
    );
  }
  const bar = (monthTransactions: TransactionDisplay[] = [tx('a', 'c-food'), tx('b', 'c-fun')], initial?: HeatmapEngineOptions, extra: { activeCount?: number; isFilterActive?: boolean; cats?: Category[] } = {}) =>
    mount(<Harness monthTransactions={monthTransactions} initial={initial} {...extra} />);
  const change = (v: 'ALL' | string[]) => act(() => h.matrix.onChange(v));
  const FIXED = EXCLUDED_HEATMAP_CATEGORIES;

  beforeEach(() => { clearSpy = vi.fn(); });

  describe('simple switches', () => {

    it('hide days with no spending', () => {
      bar();
      click(byText('button', 'ซ่อนวันไม่มียอดใช้จ่าย'));
      expect(current.hideZeroDays).toBe(true);
      click(byText('button', 'ซ่อนวันไม่มียอดใช้จ่าย'));
      expect(current.hideZeroDays).toBe(false);
    });

    it('the choices are lit when on', () => {
      bar([tx('a', 'c-food')], { selectedCategories: 'ALL', includeFixedCosts: true, allocationFilter: 'need', dayTypeFilter: 'WEEKEND', hideZeroDays: true });
      expect(on(btn('Need'))).toBe(true);
      expect(on(btn('วันหยุด'))).toBe(true);
      expect(byText('button', 'ซ่อนวันไม่มียอดใช้จ่าย')!.className).toContain('text-accent-ink');
      expect(byText('button', 'รวมค่าหอ/น้ำ/ไฟ/เน็ต')!.className).toContain('text-warn');
    });
  });

  describe('"include rent / water / power / internet"', () => {
    const fixedBtn = () => byText('button', 'รวมค่าหอ/น้ำ/ไฟ/เน็ต')!;

    it('does not list a bill twice', () => {
      bar([tx('a', 'c-food')], { selectedCategories: ['ค่ากิน', 'ค่าไฟ'], includeFixedCosts: false });
      click(fixedBtn());
      expect((current.selectedCategories as string[]).filter(n => n === 'ค่าไฟ')).toHaveLength(1);
    });
  });

  describe('the category matrix feeds the table filters', () => {

    it('every expense category (bills included) → the full list and bills on', () => {
      bar();
      change(categories.filter(c => c.type === 'expense').map(c => c.name));
      expect(current.includeFixedCosts).toBe(true);
      expect((current.selectedCategories as string[]).length).toBe(6);
    });

    it('picking every expense category switches the bills on even when the list lacks one of them', () => {
      const noWater = categories.filter(c => c.name !== 'ค่าน้ำ'); // the user never made a water category
      bar([tx('a', 'c-food')], undefined, { cats: noWater });
      change(noWater.filter(c => c.type === 'expense').map(c => c.name));
      expect(current.includeFixedCosts).toBe(true);
    });

    it('the matrix is for expenses, and starts with the categories that have rows ticked', () => {
      bar([tx('a', 'c-food'), tx('b', 'c-salary')]);
      expect(h.matrix.typeFilter).toBe('EXPENSE');
      expect([...h.matrix.activeCategoryNames]).toEqual(['ค่ากิน']); // income is not an expense column
    });

  });

});
