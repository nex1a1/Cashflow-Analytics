// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import FilterBar from '../Shared/FilterBar';
import HorizontalFilterBar from '../HorizontalView/HorizontalFilterBar';
import { EXCLUDED_HEATMAP_CATEGORIES, HeatmapEngineOptions } from '../../hooks/useHeatmapEngine';
import { byText, click, q, type } from '@/test-utils/dom';
import type { Category, TransactionDisplay } from '@/types';

const h = vi.hoisted(() => ({ matrix: null as any, date: null as any }));
// The category matrix and the date picker are tested on their own; here they only report what they were given.
vi.mock('@/views/Ledger/components/Shared/CategoryMatrixFilter', async () => {
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
const on = (b: HTMLElement) => !b.className.includes('bg-surface border-line');

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
      setAdvancedFilterDate: vi.fn(), setDayTypeFilter: vi.fn(), clearFilters: vi.fn(), setIsExpanded: vi.fn(),
    };
    mount(<FilterBar {...base} {...spies} isExpanded {...over} />);
    return spies;
  };
  const search = () => q<HTMLInputElement>('input[placeholder^="ค้นหา"]')!;
  const advancedToggle = () => [...document.querySelectorAll('button')].find(b => b.textContent!.includes('ตัวกรองขั้นสูง'))!;

  describe('the quick strip', () => {
    it('typing searches; the ✕ clears it and only shows once there is text', () => {
      const s = bar({ isExpanded: false });
      type(search(), 'กาแฟ');
      expect(s.setSearchQuery).toHaveBeenLastCalledWith('กาแฟ');
      expect(q('button[title="ล้างคำค้นหา"]')).toBeNull();
      act(() => root!.unmount()); container!.remove();
      const s2 = bar({ isExpanded: false, searchQuery: 'กาแฟ' });
      click(q('button[title="ล้างคำค้นหา"]'));
      expect(s2.setSearchQuery).toHaveBeenLastCalledWith('');
    });

    it('the type switch: all / income / expense, the current one lit', () => {
      const s = bar({ isExpanded: false, typeFilter: 'INCOME' });
      expect(on(btn('รายรับ'))).toBe(true);
      expect(on(btn('ทั้งหมด'))).toBe(false);
      click(btn('รายจ่าย'));
      expect(s.setTypeFilter).toHaveBeenLastCalledWith('EXPENSE');
      click(btn('ทั้งหมด'));
      expect(s.setTypeFilter).toHaveBeenLastCalledWith('ALL');
      click(btn('รายรับ'));
      expect(s.setTypeFilter).toHaveBeenLastCalledWith('INCOME');
    });

    it('the advanced panel is closed unless asked for', () => {
      bar({ isExpanded: false });
      expect(q('[data-testid="matrix"]')).toBeNull();
      expect(q('input[placeholder="Min"]')).toBeNull();
    });

    it('the advanced button toggles the panel', () => {
      const s = bar({ isExpanded: false });
      click(advancedToggle());
      const updater = s.setIsExpanded.mock.lastCall![0] as (v: boolean) => boolean;
      expect([updater(false), updater(true)]).toEqual([true, false]);
    });

    it('the clear button is only there while a filter is on', () => {
      bar({ isExpanded: false, isFilterActive: false });
      expect(byText('button', 'ล้างตัวกรอง')).toBeNull();
      act(() => root!.unmount()); container!.remove();
      const s = bar({ isExpanded: false, isFilterActive: true });
      click(byText('button', 'ล้างตัวกรอง'));
      expect(s.clearFilters).toHaveBeenCalledTimes(1);
    });

    it('works without the expand handler (it is optional)', () => {
      mount(<FilterBar {...base} />);
      expect(() => click(advancedToggle())).not.toThrow();
    });
  });

  describe('the advanced badge counts what the panel controls (not search, not type)', () => {
    const badge = () => advancedToggle().querySelector('span.font-mono')?.textContent ?? null;

    it('none', () => {
      bar({ isExpanded: false });
      expect(badge()).toBeNull();
    });

    it('search and type do not count', () => {
      bar({ isExpanded: false, searchQuery: 'x', typeFilter: 'INCOME' });
      expect(badge()).toBeNull();
    });

    it('each panel control counts once; a date and a weekday switch are one control', () => {
      bar({ isExpanded: false, allocationFilter: 'need' });
      expect(badge()).toBe('1');
      act(() => root!.unmount()); container!.remove();
      bar({ isExpanded: false, advancedFilterDate: '2026-01-05', dayTypeFilter: 'WEEKEND' });
      expect(badge()).toBe('1');
      act(() => root!.unmount()); container!.remove();
      bar({ isExpanded: false, allocationFilter: 'need', advancedFilterDate: '2026-01-05', advancedFilterGroup: 'g1', advancedFilterCategory: 'ค่ากิน', minAmount: '1', maxAmount: '9' });
      expect(badge()).toBe('6');
    });

    it('a category choice that covers every category is not a filter; fewer is', () => {
      bar({ isExpanded: false, advancedFilterCategory: categories.map(c => c.name) });
      expect(badge()).toBeNull();
      act(() => root!.unmount()); container!.remove();
      bar({ isExpanded: false, advancedFilterCategory: ['ค่ากิน'] });
      expect(badge()).toBe('1');
      act(() => root!.unmount()); container!.remove();
      bar({ isExpanded: false, advancedFilterCategory: [] });
      expect(badge()).toBe('1');
    });
  });

  describe('the advanced panel', () => {
    it('min and max amount', () => {
      const s = bar({ minAmount: '5' });
      expect(q<HTMLInputElement>('input[placeholder="Min"]')!.value).toBe('5');
      type(q('input[placeholder="Min"]'), '10');
      expect(s.setMinAmount).toHaveBeenLastCalledWith('10');
      type(q('input[placeholder="Max"]'), '99');
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

    it('the date picker shows the picked date, or the weekday switch when there is no date', () => {
      bar({ advancedFilterDate: '2026-01-05' });
      expect(h.date.value).toBe('2026-01-05');
      act(() => root!.unmount()); container!.remove();
      bar({ advancedFilterDate: 'ALL', dayTypeFilter: 'WEEKEND' });
      expect(h.date.value).toBe('WEEKEND');
    });

    it('is given the days of the period and lets the user pick "all"', () => {
      bar();
      expect(h.date.availableDates).toEqual(['2026-01-05']);
      expect(h.date.allowAll).toBe(true);
      expect(h.date.filterPeriod).toBe('2026-01');
    });

    it('picking a day clears the weekday switch, and the other way round', () => {
      const s = bar();
      act(() => h.date.onChange('2026-01-09'));
      expect(s.setAdvancedFilterDate).toHaveBeenLastCalledWith('2026-01-09');
      expect(s.setDayTypeFilter).toHaveBeenLastCalledWith('ALL');
      act(() => h.date.onChange('WEEKDAY'));
      expect(s.setAdvancedFilterDate).toHaveBeenLastCalledWith('ALL');
      expect(s.setDayTypeFilter).toHaveBeenLastCalledWith('WEEKDAY');
      act(() => h.date.onChange('WEEKEND'));
      expect(s.setDayTypeFilter).toHaveBeenLastCalledWith('WEEKEND');
    });

    it('the category matrix gets the categories, the current choice, the active names and the type filter', () => {
      bar({ advancedFilterCategory: ['ค่ากิน'], typeFilter: 'EXPENSE' });
      expect(h.matrix.categories).toBe(categories);
      expect(h.matrix.selectedCategories).toEqual(['ค่ากิน']);
      expect(h.matrix.typeFilter).toBe('EXPENSE');
      expect([...h.matrix.activeCategoryNames]).toEqual(['ค่ากิน']);
    });

    it('while a filter is on, a summary bar counts everything that is on (search and type included)', () => {
      bar({ isFilterActive: true, searchQuery: 'x', typeFilter: 'INCOME', allocationFilter: 'need' });
      expect(text()).toContain('3 active');
      expect(text()).toContain('ล้างการคัดกรองทั้งหมด');
    });

    it('the summary bar is not there without an active filter', () => {
      bar({ isFilterActive: false });
      expect(text()).not.toContain('active');
    });

    it('its clear button clears', () => {
      const s = bar({ isFilterActive: true });
      click(btn('ล้างการคัดกรองทั้งหมด'));
      expect(s.clearFilters).toHaveBeenCalledTimes(1);
    });
  });
});

describe('HorizontalFilterBar (table view)', () => {
  /** Holds the filters in real state, as the Ledger does, and exposes the latest value. */
  let current: HeatmapEngineOptions;
  let clearSpy: ReturnType<typeof vi.fn>;
  function Harness({ initial, monthTransactions, activeCount, isFilterActive = false }: {
    initial?: HeatmapEngineOptions; monthTransactions: TransactionDisplay[]; activeCount?: number; isFilterActive?: boolean;
  }) {
    const [filters, setFilters] = useState<HeatmapEngineOptions>(initial ?? { selectedCategories: 'ALL', includeFixedCosts: false, allocationFilter: 'ALL', dayTypeFilter: 'ALL', hideZeroDays: false });
    current = filters;
    return (
      <HorizontalFilterBar
        categories={categories} cashflowGroups={[]} monthTransactions={monthTransactions}
        filters={filters} setFilters={setFilters} clearFilters={clearSpy} isFilterActive={isFilterActive} activeCount={activeCount}
      />
    );
  }
  const bar = (monthTransactions: TransactionDisplay[] = [tx('a', 'c-food'), tx('b', 'c-fun')], initial?: HeatmapEngineOptions, extra: { activeCount?: number; isFilterActive?: boolean } = {}) =>
    mount(<Harness monthTransactions={monthTransactions} initial={initial} {...extra} />);
  const change = (v: 'ALL' | string[]) => act(() => h.matrix.onChange(v));
  const FIXED = EXCLUDED_HEATMAP_CATEGORIES;

  beforeEach(() => { clearSpy = vi.fn(); });

  describe('simple switches', () => {
    it('allocation: all / Need / Want', () => {
      bar();
      click(btn('Need'));
      expect(current.allocationFilter).toBe('need');
      click(btn('Want'));
      expect(current.allocationFilter).toBe('want');
      click(btn('ทั้งหมด'));
      expect(current.allocationFilter).toBe('ALL');
    });

    it('weekday / weekend', () => {
      bar();
      click(btn('วันทำงาน'));
      expect(current.dayTypeFilter).toBe('WEEKDAY');
      click(btn('วันหยุด'));
      expect(current.dayTypeFilter).toBe('WEEKEND');
      click(btn('ทุกวัน'));
      expect(current.dayTypeFilter).toBe('ALL');
    });

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

    it('with every category shown it only flips the flag', () => {
      bar();
      click(fixedBtn());
      expect(current.includeFixedCosts).toBe(true);
      expect(current.selectedCategories).toBe('ALL');
      click(fixedBtn());
      expect(current.includeFixedCosts).toBe(false);
    });

    it('with a hand-picked list, turning it on adds all four bills to the list', () => {
      bar([tx('a', 'c-food')], { selectedCategories: ['ค่ากิน'], includeFixedCosts: false });
      click(fixedBtn());
      expect(current.includeFixedCosts).toBe(true);
      expect(new Set(current.selectedCategories as string[])).toEqual(new Set(['ค่ากิน', ...FIXED]));
    });

    it('…and turning it off takes them out again, leaving the rest', () => {
      bar([tx('a', 'c-food')], { selectedCategories: ['ค่ากิน', ...FIXED], includeFixedCosts: true });
      click(fixedBtn());
      expect(current.includeFixedCosts).toBe(false);
      expect(current.selectedCategories).toEqual(['ค่ากิน']);
    });

    it('does not list a bill twice', () => {
      bar([tx('a', 'c-food')], { selectedCategories: ['ค่ากิน', 'ค่าไฟ'], includeFixedCosts: false });
      click(fixedBtn());
      expect((current.selectedCategories as string[]).filter(n => n === 'ค่าไฟ')).toHaveLength(1);
    });
  });

  describe('the category matrix feeds the table filters', () => {
    it('"all" resets the category choice and the bills', () => {
      bar([tx('a', 'c-food')], { selectedCategories: ['ค่ากิน'], includeFixedCosts: true });
      change('ALL');
      expect(current.selectedCategories).toBe('ALL');
      expect(current.includeFixedCosts).toBe(false);
    });

    it('every expense category (bills included) → the full list and bills on', () => {
      bar();
      change(categories.filter(c => c.type === 'expense').map(c => c.name));
      expect(current.includeFixedCosts).toBe(true);
      expect((current.selectedCategories as string[]).length).toBe(6);
    });

    it('exactly the categories that have rows this month → back to "all" (the default view)', () => {
      bar([tx('a', 'c-food'), tx('b', 'c-fun')], { selectedCategories: ['ค่ากิน'], includeFixedCosts: false });
      change(['บันเทิง', 'ค่ากิน']);
      expect(current.selectedCategories).toBe('ALL');
      expect(current.includeFixedCosts).toBe(false);
    });

    it('…and the bills are part of that default only when they are on', () => {
      bar([tx('a', 'c-food'), tx('b', 'c-power')], { selectedCategories: 'ALL', includeFixedCosts: true });
      // with bills on, "active" = food + power + all four bills
      change(['ค่ากิน', ...FIXED]);
      expect(current.selectedCategories).toBe('ALL');
      expect(current.includeFixedCosts).toBe(true);
    });

    it('any other pick is kept as the list', () => {
      bar([tx('a', 'c-food'), tx('b', 'c-fun')]);
      change(['ค่ากิน']);
      expect(current.selectedCategories).toEqual(['ค่ากิน']);
      expect(current.includeFixedCosts).toBe(false);
    });

    it('picking all four bills turns "include bills" on', () => {
      bar([tx('a', 'c-food')]);
      change(['ค่ากิน', ...FIXED]);
      expect(current.includeFixedCosts).toBe(true);
    });

    it('picking some bills keeps the switch as it was; picking none turns it off', () => {
      bar([tx('a', 'c-food')], { selectedCategories: 'ALL', includeFixedCosts: true });
      change(['ค่ากิน', 'ค่าไฟ']);
      expect(current.includeFixedCosts).toBe(true);
      change(['ค่ากิน']);
      expect(current.includeFixedCosts).toBe(false);
    });

    it('clearing the selection keeps an empty list (which shows nothing)', () => {
      bar();
      change([]);
      expect(current.selectedCategories).toEqual([]);
    });

    it('the matrix is for expenses, and starts with the categories that have rows ticked', () => {
      bar([tx('a', 'c-food'), tx('b', 'c-salary')]);
      expect(h.matrix.typeFilter).toBe('EXPENSE');
      expect([...h.matrix.activeCategoryNames]).toEqual(['ค่ากิน']); // income is not an expense column
    });

    it('bills with rows only count as active once "include bills" is on; then all four do', () => {
      bar([tx('a', 'c-food'), tx('b', 'c-power')]);
      expect([...h.matrix.activeCategoryNames]).toEqual(['ค่ากิน']);
      click(byText('button', 'รวมค่าหอ/น้ำ/ไฟ/เน็ต'));
      expect(new Set(h.matrix.activeCategoryNames)).toEqual(new Set(['ค่ากิน', ...FIXED]));
    });
  });

  describe('header', () => {
    it('shows the number of active filters and a clear button only while something is on', () => {
      bar(undefined, undefined, { isFilterActive: false });
      expect(text()).not.toContain('ตัวกรองทำงานอยู่');
      act(() => root!.unmount()); container!.remove();
      bar(undefined, { selectedCategories: ['ค่ากิน'], includeFixedCosts: true, allocationFilter: 'need', dayTypeFilter: 'ALL', hideZeroDays: false }, { isFilterActive: true });
      expect(text()).toContain('3 ตัวกรองทำงานอยู่');
      expect(text()).toContain('3 active');
    });

    it('uses the count the Ledger gives when there is one', () => {
      bar(undefined, undefined, { isFilterActive: true, activeCount: 7 });
      expect(text()).toContain('7 ตัวกรองทำงานอยู่');
    });

    it('both clear buttons clear', () => {
      bar(undefined, undefined, { isFilterActive: true });
      click(byText('button', 'ล้างตัวกรอง'));
      click(byText('button', 'ล้างการคัดกรองทั้งหมด'));
      expect(clearSpy).toHaveBeenCalledTimes(2);
    });
  });
});
