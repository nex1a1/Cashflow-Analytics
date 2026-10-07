// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import '@/test-utils/dom'; // turns on React's act environment
import { useLedgerData } from '../useLedgerData';
import type { Category, CashflowGroup, TransactionDisplay } from '@/types';

type Args = Parameters<typeof useLedgerData>;
let root: Root | null = null;
let container: HTMLElement | null = null;
let latest: ReturnType<typeof useLedgerData>;

/** Mounts the hook once; `update` re-renders the SAME component with new arguments (state is kept). */
const mount = (...initial: Args) => {
  let args = initial;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  const Probe = () => { latest = useLedgerData(...args); return null; };
  const render = () => act(() => root!.render(<Probe />));
  render();
  return { update: (...next: Args) => { args = next; render(); } };
};
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
});

const tx = (id: string, over: Partial<TransactionDisplay> = {}): TransactionDisplay =>
  ({ id, date: '2026-01-10', category: 'x', amount: 100, description: id, ...over }) as TransactionDisplay;
const many = (n: number, date = '2026-01-10') => Array.from({ length: n }, (_, i) => tx(`t${i}`, { date, amount: 1 + i }));
const idsOf = (rows: TransactionDisplay[]) => rows.map(r => r.id);

describe('useLedgerData — sorting', () => {
  it('starts unsorted (oldest first) and counts as date-sorted', () => {
    mount([tx('b', { date: '2026-01-12' }), tx('a', { date: '2026-01-03' })], '2026-01', '');
    expect(idsOf(latest.sortedTransactions)).toEqual(['a', 'b']);
    expect(latest.sortConfig).toEqual({ key: '', direction: 'asc' });
    expect(latest.isDateSorted).toBe(true);
  });

  it('the first click on a column sorts descending, the next ascending, then back', () => {
    mount([tx('s', { amount: 5 }), tx('m', { amount: 50 }), tx('l', { amount: 500 })], '2026-01', '');
    act(() => latest.handleSort('amount'));
    expect(latest.sortConfig).toEqual({ key: 'amount', direction: 'desc' });
    expect(idsOf(latest.sortedTransactions)).toEqual(['l', 'm', 's']);
    act(() => latest.handleSort('amount'));
    expect(latest.sortConfig.direction).toBe('asc');
    expect(idsOf(latest.sortedTransactions)).toEqual(['s', 'm', 'l']);
    act(() => latest.handleSort('amount'));
    expect(latest.sortConfig.direction).toBe('desc');
  });

  it('switching to another column starts descending again', () => {
    mount([tx('a', { category: 'ก' }), tx('b', { category: 'ข' })], '2026-01', '');
    act(() => latest.handleSort('amount'));
    act(() => latest.handleSort('amount')); // now asc
    act(() => latest.handleSort('category'));
    expect(latest.sortConfig).toEqual({ key: 'category', direction: 'desc' });
    expect(idsOf(latest.sortedTransactions)).toEqual(['b', 'a']);
  });

  it('only the date column counts as date-sorted (that is what keeps a day together on a page)', () => {
    mount([tx('a')], '2026-01', '');
    act(() => latest.handleSort('date'));
    expect(latest.isDateSorted).toBe(true);
    act(() => latest.handleSort('amount'));
    expect(latest.isDateSorted).toBe(false);
  });

  it('does not reorder the list it was given', () => {
    const input = [tx('b', { date: '2026-01-12' }), tx('a', { date: '2026-01-03' })];
    mount(input, '2026-01', '');
    expect(idsOf(input)).toEqual(['b', 'a']);
  });
});

describe('useLedgerData — the order inside one day follows Settings', () => {
  const groups: CashflowGroup[] = [
    { id: 'g-food', name: 'ค่ากิน', type: 'expense', order_index: 2 },
    { id: 'g-rent', name: 'ที่พัก', type: 'expense', order_index: 1 },
  ] as CashflowGroup[];
  const cats: Category[] = [
    { id: 'c-lunch', name: 'มื้อกลางวัน', type: 'expense', cashflow_group_id: 'g-food', order_index: 2 },
    { id: 'c-coffee', name: 'กาแฟ', type: 'expense', cashflow_group_id: 'g-food', order_index: 1 },
    { id: 'c-rent', name: 'ค่าเช่า', type: 'expense', cashflow_group_id: 'g-rent', order_index: 5 },
    { id: 'c-alias', name: 'ผ่านชื่อกลุ่ม', type: 'expense', cashflowGroup: 'g-rent', order_index: 9 } as Category,
  ];
  const opts = { categories: cats, cashflowGroups: groups };

  it('group order first, then category order, then the bigger amount', () => {
    const rows = [
      tx('lunch', { category_id: 'c-lunch', amount: 80 }),
      tx('coffee-small', { category_id: 'c-coffee', amount: 30 }),
      tx('coffee-big', { category_id: 'c-coffee', amount: 60 }),
      tx('rent', { category_id: 'c-rent', amount: 9000 }),
    ];
    mount(rows, '2026-01', '', opts);
    expect(idsOf(latest.sortedTransactions)).toEqual(['rent', 'coffee-big', 'coffee-small', 'lunch']);
  });

  it('a category linked by the camel-case group field is ordered the same way', () => {
    const rows = [tx('food', { category_id: 'c-coffee' }), tx('alias', { category_id: 'c-alias' })];
    mount(rows, '2026-01', '', opts);
    expect(idsOf(latest.sortedTransactions)).toEqual(['alias', 'food']); // its group (order 1) comes before food (order 2)
  });

  it('rows of an unknown category go last, not first', () => {
    const rows = [tx('ghost', { category_id: 'gone' }), tx('lunch', { category_id: 'c-lunch' })];
    mount(rows, '2026-01', '', opts);
    expect(idsOf(latest.sortedTransactions)).toEqual(['lunch', 'ghost']);
  });

  it('an earlier DATE still beats the settings order', () => {
    const rows = [tx('late-rent', { category_id: 'c-rent', date: '2026-01-20' }), tx('early-lunch', { category_id: 'c-lunch', date: '2026-01-05' })];
    mount(rows, '2026-01', '', opts);
    expect(idsOf(latest.sortedTransactions)).toEqual(['early-lunch', 'late-rent']);
  });
});

describe('useLedgerData — pages', () => {
  it('splits into pages and starts on the first', () => {
    mount(many(120), '2026-01', '');
    // one date → one page (a day is never split when date-sorted)
    expect(latest.pages).toHaveLength(1);
    expect(latest.currentPage).toBe(1);
    act(() => latest.handleSort('amount'));
    expect(latest.pages.map(p => p.length)).toEqual([50, 50, 20]);
  });

  it('no rows → no pages and still page 1', () => {
    mount([], '2026-01', '');
    expect(latest.pages).toEqual([]);
    expect(latest.currentPage).toBe(1);
  });

  it('the page can be changed', () => {
    mount(many(120), '2026-01', '');
    act(() => latest.handleSort('amount'));
    act(() => latest.setCurrentPage(3));
    expect(latest.currentPage).toBe(3);
  });

  it('goes back to page 1 when the sort changes', () => {
    mount(many(120), '2026-01', '');
    act(() => latest.handleSort('amount'));
    act(() => latest.setCurrentPage(3));
    act(() => latest.handleSort('amount'));
    expect(latest.currentPage).toBe(1);
  });

  it('goes back to page 1 when the period, search or any filter changes — each on its own', () => {
    const rows = many(120);
    const m = mount(rows, '2026-01', '');
    act(() => latest.handleSort('amount'));

    // One thing changes per step and everything else keeps the very same value / object.
    const category = ['ค่ากิน'];
    let period = '2026-01';
    let search = '';
    let filters: NonNullable<Args[3]> = {};
    const steps: Array<[string, () => void]> = [
      ['period', () => { period = '2026-02'; }],
      ['search', () => { search = 'กาแฟ'; }],
      ['category', () => { filters = { ...filters, advancedFilterCategory: category }; }],
      ['group', () => { filters = { ...filters, advancedFilterGroup: 'g1' }; }],
      ['date', () => { filters = { ...filters, advancedFilterDate: '2026-02-01' }; }],
      ['type', () => { filters = { ...filters, typeFilter: 'INCOME' }; }],
      ['allocation', () => { filters = { ...filters, allocationFilter: 'need' }; }],
      ['min amount', () => { filters = { ...filters, minAmount: '10' }; }],
      ['max amount', () => { filters = { ...filters, maxAmount: '99' }; }],
      ['day type', () => { filters = { ...filters, dayTypeFilter: 'WEEKEND' }; }],
    ];
    for (const [name, change] of steps) {
      act(() => latest.setCurrentPage(2));
      expect(latest.currentPage, `before ${name}`).toBe(2);
      change();
      m.update(rows, period, search, filters);
      expect(latest.currentPage, `after ${name} changed`).toBe(1);
    }
  });

  it('stays on the page while a row is edited (the list changes, the query does not)', () => {
    const rows = many(120);
    const m = mount(rows, '2026-01', '');
    act(() => latest.handleSort('amount'));
    act(() => latest.setCurrentPage(2));
    m.update(rows.map(r => (r.id === 't5' ? { ...r, description: 'edited' } : r)), '2026-01', '');
    expect(latest.currentPage).toBe(2);
  });

  it('moves back to the last page when the list shrinks below the current page', () => {
    const rows = many(120);
    const m = mount(rows, '2026-01', '');
    act(() => latest.handleSort('amount'));
    act(() => latest.setCurrentPage(3));
    m.update(rows.slice(0, 60), '2026-01', ''); // 2 pages now, same query
    expect(latest.pages).toHaveLength(2);
    expect(latest.currentPage).toBe(2);
  });
});
