// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import LedgerView, { LedgerViewProps } from '../index';
import { byText, click, q } from '@/test-utils/dom';
import type { Category, CashflowGroup, TransactionDisplay } from '@/types';

vi.mock('@/context/PortfolioContext', () => ({ usePortfolio: () => ({ portfolio: null }) }));
// Pickers and the two filter widgets are covered by their own tests.
vi.mock('@/components/shared/CategorySelect', async () => {
  const React = await import('react');
  return { default: () => React.createElement('span', { 'data-testid': 'cat' }) };
});
vi.mock('@/components/shared/AllocationSelect', async () => {
  const React = await import('react');
  const real = await vi.importActual<typeof import('@/components/shared/AllocationSelect')>('@/components/shared/AllocationSelect');
  return { SegmentedToggle: real.SegmentedToggle, default: () => React.createElement('span', { 'data-testid': 'alloc' }) };
});
vi.mock('@/components/ui/DatePicker', async () => {
  const React = await import('react');
  return { default: () => React.createElement('span', { 'data-testid': 'date' }) };
});
vi.mock('@/views/Ledger/components/common/CategoryMatrixFilter', async () => {
  const React = await import('react');
  return { default: () => React.createElement('span', { 'data-testid': 'matrix' }) };
});

const groups: CashflowGroup[] = [
  { id: 'g-sal', name: 'เงินเดือน', type: 'income', order_index: 1 },
  { id: 'g-food', name: 'ค่ากิน', type: 'expense', order_index: 2 },
  { id: 'g-sav', name: 'ลงทุน/ออม', type: 'savings', order_index: 3 },
] as CashflowGroup[];
const categories: Category[] = [
  { id: 'c-salary', name: 'เงินเดือน', type: 'income', cashflow_group_id: 'g-sal' },
  { id: 'c-food', name: 'ค่ากิน', type: 'expense', cashflow_group_id: 'g-food', color: '#F97316' },
  { id: 'c-gold', name: 'ออมทอง', type: 'savings', cashflow_group_id: 'g-sav' },
];
const tx = (id: string, category_id: string, amount: number, date = '2026-01-05'): TransactionDisplay => {
  const c = categories.find(x => x.id === category_id)!;
  return { id, category_id, category: c.name, amount, date, description: id, group_type: c.type } as TransactionDisplay;
};
const data = [
  tx('pay', 'c-salary', 30000),
  tx('lunch', 'c-food', 300, '2026-01-06'),
  tx('dinner', 'c-food', 700, '2026-01-06'),
  tx('gold', 'c-gold', 2000, '2026-01-07'),
];

const fn = {
  setSearchQuery: vi.fn(), handleOpenAddModal: vi.fn(), handleUpdateTransaction: vi.fn(), handleDeleteTransaction: vi.fn(),
  setAdvancedFilterCategory: vi.fn(), setAdvancedFilterGroup: vi.fn(), setAdvancedFilterDate: vi.fn(), setTypeFilter: vi.fn(),
  setAllocationFilter: vi.fn(), setMinAmount: vi.fn(), setMaxAmount: vi.fn(), setDayTypeFilter: vi.fn(), setFilterPeriod: vi.fn(), clearFilters: vi.fn(),
};
const props = (over: Partial<LedgerViewProps> = {}): LedgerViewProps => ({
  displayTransactions: data, transactions: data, getFilterLabel: p => `ช่วง ${p}`, filterPeriod: '2026-01', searchQuery: '',
  categories, cashflowGroups: groups, advancedFilterCategory: 'ALL', advancedFilterGroup: 'ALL', advancedFilterDate: 'ALL', typeFilter: 'ALL',
  allocationFilter: 'ALL', minAmount: '', maxAmount: '', dayTypeFilter: 'ALL', availableDatesInPeriod: ['2026-01-05'],
  allDatesInPeriod: Array.from({ length: 31 }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`), isFilterActive: false, isLoading: false,
  ...fn, ...over,
}) as LedgerViewProps;

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = (over: Partial<LedgerViewProps> = {}) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<LedgerView {...props(over)} />));
};
const btn = (text: string) => byText('button', text)!;
const text = () => container!.textContent!;
const filterToggle = () => [...document.querySelectorAll('button')].find(b => b.textContent!.startsWith('ตัวกรอง'))!;
const tableRows = () => container!.querySelectorAll('tbody tr');

beforeEach(() => Object.values(fn).forEach(f => f.mockClear()));
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

describe('LedgerView — header and summary', () => {
  it('names the page, the period and how many rows the list holds', () => {
    mount();
    expect(text()).toContain('บัญชีแยกประเภท');
    expect(text()).toContain('ช่วง 2026-01');
    expect(q('p span.text-accent-ink')!.textContent).toBe('4');
  });

  it('the summary adds up the rows being shown: income, expense, net, and investing apart', () => {
    mount();
    expect(text()).toContain('30,000.00'); // income
    expect(text()).toContain('1,000.00'); // expense
    expect(text()).toContain('29,000.00'); // net (investing stays inside it)
    expect(text()).toContain('ในนี้ลงทุน/ออม 2,000.00');
  });

  it('the summary follows the filtered list, not the whole month', () => {
    mount({ displayTransactions: [tx('lunch', 'c-food', 300, '2026-01-06')] });
    expect(text()).toContain('300.00');
    expect(text()).not.toContain('30,000.00');
    expect(q('p span.text-accent-ink')!.textContent).toBe('1');
  });

  it('the header add buttons open the add modal', () => {
    mount();
    click(btn('เพิ่มรายจ่าย'));
    expect(fn.handleOpenAddModal).toHaveBeenLastCalledWith('', 'expense');
  });

  it('works with the optional props left out', () => {
    expect(() => mount({ cashflowGroups: undefined, dayTypes: undefined, dayTypeConfig: undefined, transactions: undefined, activeCategoryNames: undefined })).not.toThrow();
  });
});

describe('LedgerView — group breakdown', () => {
  it('is collapsed at first, says how many groups, and expands on click', () => {
    mount();
    expect(text()).toContain('ขยายดูการจำแนกตามกลุ่มรายรับ-รายจ่าย (3 กลุ่ม)');
    expect(text()).not.toContain('การออมและลงทุน');
    click(container!.querySelector('button[title^="ขยาย/หุบ"]'));
    expect(text()).toContain('การออมและลงทุน');
    expect(text()).toContain('หุบการจำแนก');
  });

  it('clicking a group card filters by that group', () => {
    mount();
    click(container!.querySelector('button[title^="ขยาย/หุบ"]'));
    const card = [...container!.querySelectorAll('button')].find(b => b.querySelector('span[title="ค่ากิน"]'))!;
    click(card);
    expect(fn.setAdvancedFilterGroup).toHaveBeenLastCalledWith('g-food');
  });

  it('clicking the card of the group that is already the filter clears it', () => {
    mount({ advancedFilterGroup: 'g-food' });
    click(container!.querySelector('button[title^="ขยาย/หุบ"]'));
    const card = [...container!.querySelectorAll('button')].find(b => b.querySelector('span[title="ค่ากิน"]'))!;
    click(card);
    expect(fn.setAdvancedFilterGroup).toHaveBeenLastCalledWith('ALL');
  });

  it('no toggle when nothing has money', () => {
    mount({ displayTransactions: [], transactions: [] });
    expect(container!.querySelector('button[title^="ขยาย/หุบ"]')).toBeNull();
  });
});

describe('LedgerView — list view', () => {
  it('shows the rows and the list filter bar', () => {
    mount();
    expect(tableRows()).toHaveLength(4);
    expect(q('input[placeholder^="ค้นหา"]')).not.toBeNull();
  });

  it('searching goes through to the owner of the search state', () => {
    mount();
    const input = q<HTMLInputElement>('input[placeholder^="ค้นหา"]')!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    act(() => { setter.call(input, 'ข้าว'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(fn.setSearchQuery).toHaveBeenLastCalledWith('ข้าว');
  });

  it('the filter button opens and closes the advanced panel', () => {
    mount();
    expect(q('input[placeholder="Min"]')).toBeNull();
    click(filterToggle());
    expect(q('input[placeholder="Min"]')).not.toBeNull();
    click(filterToggle());
    expect(q('input[placeholder="Min"]')).toBeNull();
  });

  it('a row on page 1 of one day: the page totals count income and expense of THIS page', () => {
    mount();
    expect(text()).toContain('รายรับหน้านี้฿30,000.00');
    expect(text()).toContain('รายจ่ายหน้านี้฿1,000.00');
  });

  it('pages: more than 50 rows are split, and the totals follow the page you are on', () => {
    const many = Array.from({ length: 120 }, (_, i) => tx(`e${i}`, 'c-food', 10, '2026-01-06'));
    mount({ displayTransactions: many, transactions: many });
    // sorted by date one day is never split → one page of 120
    expect(text()).toContain('หน้า 1 • แสดง 120 จาก 120 รายการ');
    click(container!.querySelector('th[title="เรียงตามจำนวนเงิน"]')); // sort by amount → pages of 50
    expect(text()).toContain('แสดง 50 จาก 120 รายการ');
    expect(text()).toContain('/3');
    expect(text()).toContain('รายจ่ายหน้านี้฿500.00');
    click(container!.querySelector('button[title^="หน้าสุดท้าย"]'));
    expect(text()).toContain('หน้า 3 • แสดง 20 จาก 120 รายการ');
    expect(text()).toContain('รายจ่ายหน้านี้฿200.00');
  });

  it('sorting by a column is remembered by the view (the rows reorder)', () => {
    mount();
    const firstDesc = () => tableRows()[0].querySelector<HTMLInputElement>('input[placeholder="รายละเอียด..."]')!.value;
    expect(firstDesc()).toBe('pay'); // oldest first
    click(container!.querySelector('th[title="เรียงตามจำนวนเงิน"]'));
    expect(firstDesc()).toBe('pay'); // 30,000 is the biggest
    click(container!.querySelector('th[title="เรียงตามจำนวนเงิน"]'));
    expect(firstDesc()).toBe('lunch'); // ascending now: 300 first
  });
});

describe('LedgerView — empty and loading', () => {
  it('an empty list says so; the clear button only appears when a filter is on', () => {
    mount({ displayTransactions: [], isFilterActive: false });
    expect(text()).toContain('ไม่พบรายการ');
    expect(container!.querySelectorAll('button').length).toBeGreaterThan(0);
    expect([...container!.querySelectorAll('button')].some(b => b.textContent === 'ล้างตัวกรอง')).toBe(false);
  });

  it('with a filter on, the empty state can clear it', () => {
    mount({ displayTransactions: [], isFilterActive: true });
    const clearButtons = [...container!.querySelectorAll('button')].filter(b => b.textContent!.includes('ล้างตัวกรอง'));
    click(clearButtons[clearButtons.length - 1]);
    expect(fn.clearFilters).toHaveBeenCalled();
  });

  it('while the very first load has nothing yet, a loading overlay shows over an empty first page', () => {
    mount({ displayTransactions: [], transactions: [], isLoading: true });
    expect(text()).toContain('กำลังโหลดรายการ...');
    expect(text()).not.toContain('ไม่พบรายการ');
    expect(text()).toContain('หน้า 1 • แสดง 0 จาก 0 รายการ');
    expect(q<HTMLInputElement>('input[aria-label="เลขหน้า"]')!.value).toBe('1');
    expect(text()).toContain('/1'); // one (empty) page, never "page 1 of 0"
  });

  it('a reload that already has rows does not cover them', () => {
    mount({ isLoading: true });
    expect(text()).not.toContain('กำลังโหลดรายการ...');
    expect(tableRows()).toHaveLength(4);
  });

  it('"no rows" is not the loading state when not loading', () => {
    mount({ displayTransactions: [], transactions: [], isLoading: false });
    expect(text()).not.toContain('กำลังโหลดรายการ...');
  });

  it('a filter that matches nothing is not "loading" even if the month has rows (and the overlay needs both lists empty)', () => {
    mount({ displayTransactions: [], transactions: data, isLoading: true });
    expect(text()).not.toContain('กำลังโหลดรายการ...');
  });
});

describe('LedgerView — table (horizontal) view', () => {
  const toTable = () => click(document.querySelector('button[title="มุมมองตารางแนวนอน"]'));

  it('swaps the list for the day-by-category table and drops the list filter bar', () => {
    mount();
    toTable();
    expect(q('table.heatmap-table')).not.toBeNull();
    expect(q('input[placeholder^="ค้นหา"]')).toBeNull();
    expect(text()).not.toContain('หน้า 1 •');
  });

  it('the row count in the header is the month\'s, not the list filter\'s', () => {
    mount({ displayTransactions: [tx('lunch', 'c-food', 300, '2026-01-06')], transactions: data });
    expect(q('p span.text-accent-ink')!.textContent).toBe('1');
    toTable();
    expect(q('p span.text-accent-ink')!.textContent).toBe('4'); // every row of the month
  });

  it('only the period\'s rows go into the table (a row of another month is left out)', () => {
    const other = tx('feb', 'c-food', 999, '2026-02-10');
    mount({ transactions: [...data, other], displayTransactions: data });
    toTable();
    expect(q('p span.text-accent-ink')!.textContent).toBe('4');
    expect(q('tfoot')!.textContent).not.toContain('999');
  });

  it('the table is not narrowed by the LIST\'s own filters', () => {
    mount({ displayTransactions: [tx('lunch', 'c-food', 300, '2026-01-06')], transactions: data });
    toTable();
    expect(q('tfoot')!.textContent).toContain('1,000.00'); // both food rows, though the list shows one
  });

  it('the filter button now opens the TABLE filter panel (and says so)', () => {
    mount();
    toTable();
    expect(filterToggle().textContent).toBe('ตัวกรองตาราง');
    expect(text()).not.toContain('ตัวกรองตารางรายวัน');
    click(filterToggle());
    expect(text()).toContain('ตัวกรองตารางรายวัน');
  });

  it('a table filter narrows the table and lights the button; clearing restores it', () => {
    mount({ transactions: [...data, { ...tx('fun', 'c-food', 40, '2026-01-06'), allocation_type: 'want' } as TransactionDisplay, { ...tx('need', 'c-food', 60, '2026-01-06'), allocation_type: 'need' } as TransactionDisplay] });
    toTable();
    click(filterToggle());
    expect(filterToggle().className).not.toContain('!border-warn');
    click(btn('Need'));
    expect(q('tfoot')!.textContent).toContain('60.00');
    expect(q('tfoot')!.textContent).not.toContain('1,100.00');
    expect(filterToggle().className).toContain('!border-warn');
    expect(text()).toContain('1 ตัวกรองทำงานอยู่');
    click(byText('button', 'ล้างตัวกรอง'));
    expect(q('tfoot')!.textContent).toContain('1,100.00');
  });

  it('switching on "include rent / water / power / internet" counts as a table filter too', () => {
    mount();
    toTable();
    click(filterToggle());
    expect(filterToggle().className).not.toContain('!border-warn');
    click(byText('button', 'รวมค่าหอ/น้ำ/ไฟ/เน็ต'));
    expect(filterToggle().className).toContain('!border-warn');
  });

  it('table filters are kept when switching to the list and back', () => {
    mount();
    toTable();
    click(filterToggle());
    click(btn('Want'));
    click(document.querySelector('button[title="มุมมองรายการ"]'));
    toTable();
    expect(filterToggle().className).toContain('!border-warn');
  });

  it('an empty table offers to clear the table filter that emptied it', () => {
    mount();
    toTable();
    click(filterToggle());
    click(btn('Need')); // the fixture's food rows have no allocation, which counts as WANT — so no NEED rows
    expect(text()).toContain('ยังไม่มีรายการจ่ายในมุมมองนี้');
    click(byText('button', 'ล้างตัวกรองตาราง'));
    expect(q('table.heatmap-table')).not.toBeNull();
  });
});
