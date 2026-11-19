// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import LedgerTable from '../LedgerTable';
import { byText, click, flush, key, q, type } from '@/test-utils/dom';
import { formatMoney } from '@/utils/formatters';
import type { Category, TransactionDisplay } from '@/types';

const h = vi.hoisted(() => ({ portfolio: null as null | { assets: Array<{ id: string; name: string }> } }));
vi.mock('@/context/PortfolioContext', () => ({ usePortfolio: () => ({ portfolio: h.portfolio }) }));
// The two pickers have their own behaviour; here they only need to show what the row gave them.
vi.mock('@/components/shared/CategorySelect', async () => {
  const React = await import('react');
  return { default: (p: any) => React.createElement('button', { 'data-testid': 'cat', 'data-type': p.type, 'data-value': p.value, onClick: () => p.onChange('c-new') }, 'cat') };
});
vi.mock('@/components/shared/AllocationSelect', async () => {
  const React = await import('react');
  const real = await vi.importActual<typeof import('@/components/shared/AllocationSelect')>('@/components/shared/AllocationSelect');
  return { SegmentedToggle: real.SegmentedToggle, default: (p: any) => React.createElement('button', { 'data-testid': 'alloc', 'data-value': p.value, onClick: () => p.onChange('need') }, 'alloc') };
});

const categories: Category[] = [
  { id: 'c-food', name: 'ค่ากิน', type: 'expense' },
  { id: 'c-salary', name: 'เงินเดือน', type: 'income' },
  { id: 'c-gold', name: 'ออมทอง', type: 'savings' },
];
const row = (id: string, over: Partial<TransactionDisplay> = {}): TransactionDisplay =>
  ({ id, date: '2026-01-05', category: 'ค่ากิน', category_id: 'c-food', description: id, amount: 100, ...over }) as TransactionDisplay;

const fn = {
  handleSort: vi.fn(), handleUpdateTransaction: vi.fn(), handleDeleteTransaction: vi.fn(), handleOpenAddModal: vi.fn(), setCurrentPage: vi.fn(),
};
type Props = React.ComponentProps<typeof LedgerTable>;
let root: Root | null = null;
let container: HTMLElement | null = null;
let props: Props;
const render = () => act(() => root!.render(<LedgerTable {...props} />));
const mount = (over: Partial<Props> = {}) => {
  const currentData = over.currentData ?? [row('a')];
  props = {
    currentData, sortedTransactions: currentData, categories, cashflowGroups: [],
    sortConfig: { key: '', direction: 'asc' }, isDateSorted: true,
    pageInc: 0, pageExp: 0, formatMoney, currentPage: 1, totalPages: 1, ...fn, ...over,
  } as Props;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  render();
};
const rows = () => [...container!.querySelectorAll<HTMLTableRowElement>('tbody tr')];
const cell = (r: HTMLElement, i: number) => r.querySelectorAll('td')[i] as HTMLElement;
const footer = () => container!.textContent!;
const nav = (title: string) => container!.querySelector<HTMLButtonElement>(`button[title^="${title}"]`)!;
const pageInput = () => q<HTMLInputElement>('input[aria-label="เลขหน้า"]')!;
/** Runs the argument the table gave setCurrentPage (a number, or an updater) from `current`. */
const resolved = (from: number) => {
  const a = fn.setCurrentPage.mock.lastCall![0];
  return typeof a === 'function' ? a(from) : a;
};

beforeEach(() => { h.portfolio = null; Object.values(fn).forEach(f => f.mockClear()); });
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

describe('LedgerTable — header and sorting', () => {
  it('has date, category, allocation, description and amount columns', () => {
    mount();
    const heads = [...container!.querySelectorAll('thead th')].map(t => t.textContent!.replace(/[▲▼]/g, '').trim());
    expect(heads.slice(0, 5)).toEqual(['วันเดือนปี', 'หมวดหมู่', 'ALLOCATION', 'รายละเอียด', 'จำนวนเงิน']);
  });

});

describe('LedgerTable — what each kind of row shows', () => {
  const inc = row('inc', { category: 'เงินเดือน', category_id: 'c-salary', amount: 30000 });
  const exp = row('exp', { amount: 1234.5 });
  const buy = row('buy', { category: 'ออมทอง', category_id: 'c-gold', amount: 2000 });
  const sell = row('sell', { category: 'ออมทอง', category_id: 'c-gold', amount: -500 });

  it('income: picker for income, no allocation, +฿', () => {
    mount({ currentData: [inc] });
    const r = rows()[0];
    expect(r.querySelector('[data-testid="cat"]')!.getAttribute('data-type')).toBe('income');
    expect(r.querySelector('[data-testid="alloc"]')).toBeNull();
    expect(cell(r, 2).textContent).toBe('—');
    expect(cell(r, 4).textContent).toBe('+฿30,000.00');
  });

  it('expense: picker for expense, an allocation picker, −฿', () => {
    mount({ currentData: [exp] });
    const r = rows()[0];
    expect(r.querySelector('[data-testid="cat"]')!.getAttribute('data-type')).toBe('expense');
    expect(r.querySelector('[data-testid="alloc"]')).not.toBeNull();
    expect(cell(r, 4).textContent).toBe('−฿1,234.50');
  });

  it('an expense with no allocation of its own shows WANT; its own allocation wins', () => {
    mount({ currentData: [exp, row('n', { allocation_type: 'need' })] });
    expect(rows().map(r => r.querySelector('[data-testid="alloc"]')!.getAttribute('data-value'))).toEqual(['want', 'need']);
  });

  it('savings: picker for savings, a buy badge, the amount without a sign', () => {
    mount({ currentData: [buy] });
    const r = rows()[0];
    expect(r.querySelector('[data-testid="cat"]')!.getAttribute('data-type')).toBe('savings');
    expect(q('[role="radio"][aria-checked="true"]')!.textContent).toBe('ซื้อ');
    expect(r.querySelector('[data-testid="alloc"]')).toBeNull();
    expect(cell(r, 4).textContent).toBe('฿2,000.00');
  });

  it('a negative savings amount is a SELL, shown as its size', () => {
    mount({ currentData: [sell] });
    expect(q('[role="radio"][aria-checked="true"]')!.textContent).toBe('ขาย');
    expect(cell(rows()[0], 4).textContent).toBe('฿500.00');
  });

  it('the type comes from the row\'s group when its category is not found', () => {
    mount({ currentData: [row('x', { category: 'หมวดที่ถูกลบ', category_id: 'gone', group_type: 'income', amount: 10 })] });
    expect(rows()[0].querySelector('[data-testid="cat"]')!.getAttribute('data-type')).toBe('income');
    expect(cell(rows()[0], 4).textContent).toBe('+฿10.00');
  });

  it('a row with no category id is matched to its category by name', () => {
    mount({ currentData: [{ id: 'by-name', date: '2026-01-05', category: 'เงินเดือน', amount: 900, description: '' } as TransactionDisplay] });
    expect(rows()[0].querySelector('[data-testid="cat"]')!.getAttribute('data-type')).toBe('income');
    expect(cell(rows()[0], 4).textContent).toBe('+฿900.00');
  });

  it('an income row can never look like savings, even if its group says savings', () => {
    mount({ currentData: [row('x', { category: 'เงินเดือน', category_id: 'c-salary', group_type: 'savings', amount: 10 })] });
    expect(byText('button', 'ซื้อ')).toBeNull();
  });

  it('a zero amount is an empty cell, not "0.00" typed in', () => {
    mount({ currentData: [row('z', { amount: 0 })] });
    expect(cell(rows()[0], 4).textContent).toBe('−฿0.00');
  });

  it('the toggle title says the asset and the units', () => {
    h.portfolio = { assets: [{ id: 'a1', name: 'ทองคำแท่ง' }] };
    mount({ currentData: [{ ...buy, id: 'buy-asset', asset_id: 'a1', units: 2.5 } as TransactionDisplay, { ...sell, id: 'sell-asset', asset_id: 'a1', units: 1 } as TransactionDisplay, buy] });
    const titles = [...container!.querySelectorAll('[role="radiogroup"]')].map(g => g.parentElement!.getAttribute('title'));
    expect(titles[0]).toBe('ทองคำแท่ง · 2.5 หน่วย');
    expect(titles[1]).toBe('ทองคำแท่ง · 1 หน่วย');
    expect(titles[2]).toBe('ออมทั่วไป'); // no asset
    expect(titles[2]).not.toContain('หน่วย');
  });

  it('an asset that is no longer in the portfolio falls back to "ออมทั่วไป"', () => {
    h.portfolio = { assets: [] };
    mount({ currentData: [{ ...buy, asset_id: 'gone', units: 1 } as TransactionDisplay] });
    expect(container!.querySelector('td div[title*="ออมทั่วไป"]')).not.toBeNull();
  });

});

describe('LedgerTable — editing a row', () => {
  it('picking another category updates category_id', () => {
    mount({ currentData: [row('r1')] });
    click(q('[data-testid="cat"]'));
    expect(fn.handleUpdateTransaction).toHaveBeenCalledWith('r1', 'category_id', 'c-new');
  });

  it('picking another allocation updates allocation_type', () => {
    mount({ currentData: [row('r1')] });
    click(q('[data-testid="alloc"]'));
    expect(fn.handleUpdateTransaction).toHaveBeenCalledWith('r1', 'allocation_type', 'need');
  });

  it('editing the description saves it when the field is left', () => {
    mount({ currentData: [row('r1', { description: 'old' })] });
    const input = q<HTMLInputElement>('input[placeholder="รายละเอียด..."]')!;
    expect(input.value).toBe('old');
    type(input, 'new text');
    act(() => { input.focus(); input.blur(); });
    expect(fn.handleUpdateTransaction).toHaveBeenCalledWith('r1', 'description', 'new text');
  });

  it('editing an expense / income amount saves a positive number', async () => {
    mount({ currentData: [row('e1', { amount: 100 })] });
    click(cell(rows()[0], 4).querySelector('.amount-editable-box'));
    await flush();
    type(q('input[aria-label="จำนวนเงิน"]'), '250');
    act(() => q<HTMLInputElement>('input[aria-label="จำนวนเงิน"]')!.blur());
    await flush();
    expect(fn.handleUpdateTransaction).toHaveBeenCalledWith('e1', 'amount', 250);
  });

  it('editing a SELL keeps it negative (the sign is the direction)', async () => {
    mount({ currentData: [row('s1', { category: 'ออมทอง', category_id: 'c-gold', amount: -500 })] });
    click(cell(rows()[0], 4).querySelector('.amount-editable-box'));
    await flush();
    type(q('input[aria-label="จำนวนเงิน"]'), '700');
    act(() => q<HTMLInputElement>('input[aria-label="จำนวนเงิน"]')!.blur());
    await flush();
    expect(fn.handleUpdateTransaction).toHaveBeenCalledWith('s1', 'amount', -700);
  });

  it('editing a BUY keeps it positive', async () => {
    mount({ currentData: [row('b1', { category: 'ออมทอง', category_id: 'c-gold', amount: 500 })] });
    click(cell(rows()[0], 4).querySelector('.amount-editable-box'));
    await flush();
    type(q('input[aria-label="จำนวนเงิน"]'), '900');
    act(() => q<HTMLInputElement>('input[aria-label="จำนวนเงิน"]')!.blur());
    await flush();
    expect(fn.handleUpdateTransaction).toHaveBeenCalledWith('b1', 'amount', 900);
  });

  it('the buy / sell toggle flips the sign of the amount', () => {
    mount({ currentData: [row('b1', { category: 'ออมทอง', category_id: 'c-gold', amount: 500 }), row('s1', { category: 'ออมทอง', category_id: 'c-gold', amount: -300 })] });
    const [r1, r2] = rows();
    click([...r1.querySelectorAll<HTMLElement>('[role="radio"]')].find(b => b.textContent === 'ขาย'));
    expect(fn.handleUpdateTransaction).toHaveBeenLastCalledWith('b1', 'amount', -500);
    click([...r2.querySelectorAll<HTMLElement>('[role="radio"]')].find(b => b.textContent === 'ซื้อ'));
    expect(fn.handleUpdateTransaction).toHaveBeenLastCalledWith('s1', 'amount', 300);
  });
});

describe('LedgerTable — row buttons', () => {
  it('adds an income / expense / savings row on that date', () => {
    mount({ currentData: [row('r1', { date: '2026-01-05' })] });
    click(q('button[title="เพิ่มรายรับ (2026-01-05)"]'));
    expect(fn.handleOpenAddModal).toHaveBeenLastCalledWith('2026-01-05', 'income');
    click(q('button[title="เพิ่มรายจ่าย (2026-01-05)"]'));
    expect(fn.handleOpenAddModal).toHaveBeenLastCalledWith('2026-01-05', 'expense');
    click(q('button[title="เพิ่มลงทุน/ออม (2026-01-05)"]'));
    expect(fn.handleOpenAddModal).toHaveBeenLastCalledWith('2026-01-05', 'savings');
  });

  it('deleting takes two clicks: the first only arms the button', () => {
    mount({ currentData: [row('r1', { description: 'ข้าวมันไก่' })] });
    const del = cell(rows()[0], 5).querySelector('button')!;
    expect(del.getAttribute('aria-label')).toContain('ข้าวมันไก่');
    click(del);
    expect(fn.handleDeleteTransaction).not.toHaveBeenCalled();
    click(cell(rows()[0], 5).querySelector('button'));
    expect(fn.handleDeleteTransaction).toHaveBeenCalledWith('r1');
  });

});

describe('LedgerTable — footer', () => {

  it('shows the income and expense of the page', () => {
    mount({ pageInc: 30000, pageExp: 1234.5 });
    expect(footer()).toContain('รายรับหน้านี้฿30,000.00');
    expect(footer()).toContain('รายจ่ายหน้านี้฿1,234.50');
  });
});

describe('LedgerTable — typing a page number', () => {
  it('shows the current page out of the total', () => {
    mount({ currentPage: 3, totalPages: 9 });
    expect(pageInput().value).toBe('3');
    expect(footer()).toContain('/9');
  });

});

describe('LedgerTable — moving rows to another day', () => {
  const move = vi.fn();
  const trigger = (r: HTMLElement) => r.querySelector<HTMLButtonElement>('[data-date-trigger]')!;
  const editor = () => q<HTMLInputElement>('[role="dialog"] input')!;
  const modClick = (el: Element, mods: MouseEventInit) => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...mods })); });
  const three = () => [row('a', { date: '2026-01-05' }), row('b', { date: '2026-01-06' }), row('c', { date: '2026-01-31' })];
  beforeEach(() => move.mockReset().mockResolvedValue(true));

  it('Enter moves just that row; Esc cancels without saving', async () => {
    mount({ currentData: three(), handleMoveTransactions: move });
    click(trigger(rows()[0]));
    type(editor(), '2026-02-01');
    expect(q('[role="dialog"]')!.textContent).toContain('1 ก.พ. 26');
    key(editor(), 'Enter');
    await flush();
    expect(move).toHaveBeenCalledWith([{ id: 'a', date: '2026-02-01' }]);
    expect(q('[role="dialog"]')).toBeNull();

    click(trigger(rows()[1]));
    key(editor(), 'Escape');
    expect(q('[role="dialog"]')).toBeNull();
    expect(move).toHaveBeenCalledTimes(1);
  });

  it('arrow keys step the date; an invalid entry shows the hint and does not save', () => {
    mount({ currentData: three(), handleMoveTransactions: move });
    click(trigger(rows()[0]));
    key(editor(), 'ArrowUp');
    expect(editor().value).toBe('2026-01-06');
    type(editor(), 'xx');
    expect(editor().getAttribute('aria-invalid')).toBe('true');
    key(editor(), 'Enter');
    expect(move).not.toHaveBeenCalled();
  });

  it('Ctrl+click picks rows, Shift+click a range; the date editor then moves them all', async () => {
    mount({ currentData: three(), handleMoveTransactions: move });
    modClick(cell(rows()[0], 3), { ctrlKey: true });
    modClick(cell(rows()[2], 3), { shiftKey: true });
    expect(rows().map(r => r.getAttribute('aria-selected'))).toEqual(['true', 'true', 'true']);
    expect(footer()).toContain('เลือก 3');

    click(trigger(rows()[1]));
    expect(q('[role="dialog"]')!.textContent).toContain('ย้าย 3 รายการ');
    type(editor(), '+1m');
    expect(q('[role="dialog"]')!.textContent).toContain('เลื่อน +1 เดือน');
    key(editor(), 'Enter');
    await flush();
    expect(move).toHaveBeenCalledWith([
      { id: 'a', date: '2026-02-05' }, { id: 'b', date: '2026-02-06' }, { id: 'c', date: '2026-02-28' },
    ]);
    expect(rows().some(r => r.getAttribute('aria-selected') === 'true')).toBe(false);
  });

  it('a row outside the selection moves alone', async () => {
    mount({ currentData: three(), handleMoveTransactions: move });
    modClick(cell(rows()[0], 3), { ctrlKey: true });
    click(trigger(rows()[2]));
    type(editor(), '25');
    key(editor(), 'Enter');
    await flush();
    expect(move).toHaveBeenCalledWith([{ id: 'c', date: '2026-01-25' }]);
  });
});

describe('LedgerTable — move calendar', () => {
  const move = vi.fn();
  const open = () => { click(container!.querySelector('[data-date-trigger]')); };
  const dialog = () => q('[role="dialog"]')!;
  beforeEach(() => move.mockReset().mockResolvedValue(true));

  it('shows the row month with the old day marked; clicking a day moves there at once', async () => {
    mount({ currentData: [row('a', { date: '2026-01-05' })], handleMoveTransactions: move });
    open();
    expect(dialog().textContent).toContain('มกราคม 2026');
    expect(q('[data-day="2026-01-05"]')!.getAttribute('title')).toBe('วันเดิม');
    click(q('[data-day="2026-01-20"]'));
    await flush();
    expect(move).toHaveBeenCalledWith([{ id: 'a', date: '2026-01-20' }]);
    expect(q('[role="dialog"]')).toBeNull();
  });

  it('the month title opens a 12-month grid with year arrows for long jumps', async () => {
    mount({ currentData: [row('a', { date: '2026-01-05' })], handleMoveTransactions: move });
    open();
    click(byText('[role="dialog"] button', 'มกราคม 2026'));
    click(q('[aria-label="ปีถัดไป"]'));
    click(byText('[role="dialog"] button', 'มิ.ย.'));
    expect(dialog().textContent).toContain('มิถุนายน 2027');
    click(q('[data-day="2027-06-25"]'));
    await flush();
    expect(move).toHaveBeenCalledWith([{ id: 'a', date: '2027-06-25' }]);
  });

  it('with several rows picked, a clicked day sends them all to that date', async () => {
    mount({ currentData: [row('a', { date: '2026-01-05' }), row('b', { date: '2026-01-09' })], handleMoveTransactions: move });
    const tr = rows();
    act(() => { cell(tr[0], 3).dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true })); });
    act(() => { cell(tr[1], 3).dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true })); });
    click(tr[1].querySelector('[data-date-trigger]'));
    click(q('[data-day="2026-01-30"]'));
    await flush();
    expect(move).toHaveBeenCalledWith([{ id: 'a', date: '2026-01-30' }, { id: 'b', date: '2026-01-30' }]);
  });
});

