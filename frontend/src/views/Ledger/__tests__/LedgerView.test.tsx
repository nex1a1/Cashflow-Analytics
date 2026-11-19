// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
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

  it('the summary adds up the rows being shown: income, expense, net, and investing apart', () => {
    mount();
    expect(text()).toContain('30,000.00'); // income
    expect(text()).toContain('1,000.00'); // expense
    expect(text()).toContain('29,000.00'); // net (investing stays inside it)
    expect(text()).toContain('ในนี้ลงทุน/ออม ฿2,000.00');
  });

  it('the summary follows the filtered list, not the whole month', () => {
    mount({ displayTransactions: [tx('lunch', 'c-food', 300, '2026-01-06')] });
    expect(text()).toContain('300.00');
    expect(text()).not.toContain('30,000.00');
    expect(q('p span.text-accent-ink')!.textContent).toBe('1');
  });

});

describe('LedgerView — list view', () => {

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

});

describe('LedgerView — table (horizontal) view', () => {
  const toTable = () => click(document.querySelector('button[title="มุมมองตารางแนวนอน"]'));

  it('the table is not narrowed by the LIST\'s own filters', () => {
    mount({ displayTransactions: [tx('lunch', 'c-food', 300, '2026-01-06')], transactions: data });
    toTable();
    expect(q('tfoot')!.textContent).toContain('1,000.00'); // both food rows, though the list shows one
  });

  it('a table filter narrows the table and lights the button; clearing restores it', () => {
    mount({ transactions: [...data, { ...tx('fun', 'c-food', 40, '2026-01-06'), allocation_type: 'want' } as TransactionDisplay, { ...tx('need', 'c-food', 60, '2026-01-06'), allocation_type: 'need' } as TransactionDisplay] });
    toTable();
    click(filterToggle());
    expect(filterToggle().className).not.toContain('border-warn!');
    click(btn('Need'));
    expect(q('tfoot')!.textContent).toContain('60.00');
    expect(q('tfoot')!.textContent).not.toContain('1,100.00');
    expect(filterToggle().className).toContain('border-warn!');
    expect(text()).toContain('1 ตัวกรองทำงานอยู่');
    click(byText('button', 'ล้างตัวกรอง'));
    expect(q('tfoot')!.textContent).toContain('1,100.00');
  });

});
