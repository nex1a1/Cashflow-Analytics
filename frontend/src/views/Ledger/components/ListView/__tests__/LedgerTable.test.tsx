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
  return { default: (p: any) => React.createElement('button', { 'data-testid': 'alloc', 'data-value': p.value, onClick: () => p.onChange('need') }, 'alloc') };
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

  it('clicking a sortable header sorts by it', () => {
    mount();
    for (const [label, sortKey] of [['วันเดือนปี', 'date'], ['หมวดหมู่', 'category'], ['จำนวนเงิน', 'amount']] as const) {
      click(container!.querySelector(`th[title="เรียงตาม${label}"]`));
      expect(fn.handleSort).toHaveBeenLastCalledWith(sortKey);
    }
  });

  it('marks the sorted column and its direction', () => {
    mount({ sortConfig: { key: 'amount', direction: 'desc' } });
    const th = (label: string) => container!.querySelector<HTMLElement>(`th[title="เรียงตาม${label}"]`)!;
    expect(th('จำนวนเงิน').className).toContain('text-accent-ink');
    expect(th('หมวดหมู่').className).not.toContain('text-accent-ink bg-surface/60');
    const [up, down] = [...th('จำนวนเงิน').querySelectorAll<HTMLElement>('span span')];
    expect(up.className).not.toContain('text-accent-ink');
    expect(down.className).toContain('text-accent-ink');
    act(() => root!.unmount()); container!.remove();
    mount({ sortConfig: { key: 'amount', direction: 'asc' } });
    const [up2, down2] = [...th('จำนวนเงิน').querySelectorAll<HTMLElement>('span span')];
    expect(up2.className).toContain('text-accent-ink');
    expect(down2.className).not.toContain('text-accent-ink');
  });
});

describe('LedgerTable — dates', () => {
  const data = [row('a', { date: '2026-01-05' }), row('b', { date: '2026-01-05' }), row('c', { date: '2026-01-06' })];

  it('shows the date once per day (a Thai weekday badge + the date); later rows of the day show ↳', () => {
    mount({ currentData: data });
    const first = cell(rows()[0], 0);
    expect(first.textContent).toContain('5 ม.ค. 26');
    expect(first.querySelector('.day-badge-pill')).not.toBeNull();
    expect(cell(rows()[1], 0).textContent).toContain('↳');
    expect(cell(rows()[1], 0).querySelector('.day-badge-pill')).toBeNull();
    expect(cell(rows()[2], 0).textContent).toContain('6 ม.ค. 26');
  });

  it('draws a stronger line where the day changes', () => {
    mount({ currentData: data });
    expect(rows().map(r => r.className.includes('border-t-line-strong'))).toEqual([false, false, true]);
  });

  it('when sorted by something else, every row names its own date and there are no day lines', () => {
    mount({ currentData: data, isDateSorted: false });
    expect(rows().every(r => !r.className.includes('border-t-line-strong'))).toBe(true);
    expect(rows().map(r => cell(r, 0).textContent!.includes('ม.ค. 26'))).toEqual([true, true, true]);
    expect(rows().some(r => cell(r, 0).textContent!.includes('↳'))).toBe(false);
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
    expect(byText('button', 'ซื้อ')).not.toBeNull();
    expect(r.querySelector('[data-testid="alloc"]')).toBeNull();
    expect(cell(r, 4).textContent).toBe('฿2,000.00');
  });

  it('a negative savings amount is a SELL, shown as its size', () => {
    mount({ currentData: [sell] });
    expect(byText('button', 'ขาย')).not.toBeNull();
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

  it('the badge title says buy / sell, the asset and the units', () => {
    h.portfolio = { assets: [{ id: 'a1', name: 'ทองคำแท่ง' }] };
    mount({ currentData: [{ ...buy, id: 'buy-asset', asset_id: 'a1', units: 2.5 } as TransactionDisplay, { ...sell, id: 'sell-asset', asset_id: 'a1', units: 1 } as TransactionDisplay, buy] });
    const titles = [...container!.querySelectorAll('td button[title*="คลิกเพื่อสลับซื้อ/ขาย"]')].map(b => b.getAttribute('title'));
    expect(titles[0]).toContain('ซื้อ · ทองคำแท่ง · 2.5 หน่วย');
    expect(titles[1]).toContain('ขาย · ทองคำแท่ง · 1 หน่วย');
    expect(titles[2]).toContain('ซื้อ · ออมทั่วไป'); // no asset
    expect(titles[2]).not.toContain('หน่วย');
  });

  it('an asset that is no longer in the portfolio falls back to "ออมทั่วไป"', () => {
    h.portfolio = { assets: [] };
    mount({ currentData: [{ ...buy, asset_id: 'gone', units: 1 } as TransactionDisplay] });
    expect(container!.querySelector('td button[title*="ออมทั่วไป"]')).not.toBeNull();
  });

  it('works while the portfolio has not loaded', () => {
    h.portfolio = null;
    expect(() => mount({ currentData: [buy] })).not.toThrow();
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

  it('the buy / sell badge flips the sign of the amount', () => {
    mount({ currentData: [row('b1', { category: 'ออมทอง', category_id: 'c-gold', amount: 500 }), row('s1', { category: 'ออมทอง', category_id: 'c-gold', amount: -300 })] });
    click(byText('button', 'ซื้อ'));
    expect(fn.handleUpdateTransaction).toHaveBeenLastCalledWith('b1', 'amount', -500);
    click(byText('button', 'ขาย'));
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

  it('the add buttons are also on the repeated-date rows (↳)', () => {
    mount({ currentData: [row('a'), row('b')] });
    expect(cell(rows()[1], 0).querySelectorAll('button')).toHaveLength(3);
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

  it('with no description the delete button names the category', () => {
    mount({ currentData: [row('r1', { description: '' })] });
    expect(cell(rows()[0], 5).querySelector('button')!.getAttribute('aria-label')).toContain('ค่ากิน');
  });
});

describe('LedgerTable — footer', () => {
  it('says which page, how many rows are shown and how many there are', () => {
    mount({ currentData: [row('a'), row('b')], sortedTransactions: Array.from({ length: 7 }, (_, i) => row(`r${i}`)), currentPage: 2, totalPages: 4 });
    expect(footer()).toContain('หน้า 2 • แสดง 2 จาก 7 รายการ');
  });

  it('shows the income and expense of the page', () => {
    mount({ pageInc: 30000, pageExp: 1234.5 });
    expect(footer()).toContain('รายรับหน้านี้฿30,000.00');
    expect(footer()).toContain('รายจ่ายหน้านี้฿1,234.50');
  });
});

describe('LedgerTable — paging buttons', () => {
  it('a single page: nothing to move to', () => {
    mount({ currentPage: 1, totalPages: 1 });
    for (const t of ['หน้าแรกสุด', 'หน้าก่อนหน้า', 'หน้าถัดไป', 'หน้าสุดท้าย']) expect(nav(t).disabled, t).toBe(true);
    expect(footer()).not.toContain('-5');
    expect(footer()).not.toContain('+5');
  });

  it('on the first page you can only go forward; on the last only back', () => {
    mount({ currentPage: 1, totalPages: 3 });
    expect([nav('หน้าแรกสุด').disabled, nav('หน้าก่อนหน้า').disabled, nav('หน้าถัดไป').disabled, nav('หน้าสุดท้าย').disabled]).toEqual([true, true, false, false]);
    act(() => root!.unmount()); container!.remove();
    mount({ currentPage: 3, totalPages: 3 });
    expect([nav('หน้าแรกสุด').disabled, nav('หน้าก่อนหน้า').disabled, nav('หน้าถัดไป').disabled, nav('หน้าสุดท้าย').disabled]).toEqual([false, false, true, true]);
  });

  it('first / previous / next / last', () => {
    mount({ currentPage: 3, totalPages: 5 });
    click(nav('หน้าแรกสุด'));
    expect(resolved(3)).toBe(1);
    click(nav('หน้าก่อนหน้า'));
    expect(resolved(3)).toBe(2);
    click(nav('หน้าถัดไป'));
    expect(resolved(3)).toBe(4);
    click(nav('หน้าสุดท้าย'));
    expect(resolved(3)).toBe(5);
  });

  it('previous / next never go past the ends', () => {
    mount({ currentPage: 2, totalPages: 5 });
    click(nav('หน้าก่อนหน้า'));
    expect(resolved(1)).toBe(1);
    click(nav('หน้าถัดไป'));
    expect(resolved(5)).toBe(5);
  });

  it('jumps of 5 appear above 5 pages and of 10 above 10 pages', () => {
    for (const [totalPages, five, ten] of [[5, false, false], [6, true, false], [10, true, false], [11, true, true]] as const) {
      mount({ currentPage: 6, totalPages });
      expect(!!byText('button', '-5'), `${totalPages} pages: ±5`).toBe(five);
      expect(!!byText('button', '+5'), `${totalPages} pages: +5`).toBe(five);
      expect(!!byText('button', '-10'), `${totalPages} pages: ±10`).toBe(ten);
      expect(!!byText('button', '+10'), `${totalPages} pages: +10`).toBe(ten);
      act(() => root!.unmount()); container!.remove();
    }
  });

  it('the jumps are clamped to the first / last page', () => {
    mount({ currentPage: 6, totalPages: 20 });
    click(byText('button', '-5'));
    expect(resolved(6)).toBe(1);
    expect(resolved(20)).toBe(15);
    click(byText('button', '+5'));
    expect(resolved(18)).toBe(20);
    click(byText('button', '-10'));
    expect(resolved(4)).toBe(1);
    expect(resolved(15)).toBe(5);
    click(byText('button', '+10'));
    expect(resolved(15)).toBe(20);
    expect(resolved(3)).toBe(13);
  });

  it('the jump buttons are disabled at the ends', () => {
    mount({ currentPage: 1, totalPages: 20 });
    expect(byText('button', '-5')!.hasAttribute('disabled')).toBe(true);
    expect(byText('button', '-10')!.hasAttribute('disabled')).toBe(true);
    expect(byText('button', '+5')!.hasAttribute('disabled')).toBe(false);
    act(() => root!.unmount()); container!.remove();
    mount({ currentPage: 20, totalPages: 20 });
    expect(byText('button', '+5')!.hasAttribute('disabled')).toBe(true);
    expect(byText('button', '+10')!.hasAttribute('disabled')).toBe(true);
  });

  it('titles tell where each button goes', () => {
    mount({ currentPage: 3, totalPages: 12 });
    expect(nav('หน้าก่อนหน้า').title).toContain('ไปหน้า 2');
    expect(nav('หน้าถัดไป').title).toContain('ไปหน้า 4');
    expect(nav('ถอยหลัง 5').title).toContain('ไปหน้า 1');
    expect(nav('ข้ามไปข้างหน้า 5').title).toContain('ไปหน้า 8');
    expect(nav('หน้าสุดท้าย').title).toContain('หน้า 12');
  });
});

describe('LedgerTable — typing a page number', () => {
  it('shows the current page out of the total', () => {
    mount({ currentPage: 3, totalPages: 9 });
    expect(pageInput().value).toBe('3');
    expect(footer()).toContain('/9');
  });

  it('Enter goes to that page', () => {
    mount({ currentPage: 1, totalPages: 9 });
    type(pageInput(), '4');
    key(pageInput(), 'Enter');
    expect(fn.setCurrentPage).toHaveBeenCalledWith(4);
  });

  it('leaving the box also goes there', () => {
    mount({ currentPage: 1, totalPages: 9 });
    act(() => pageInput().focus());
    type(pageInput(), '6');
    act(() => pageInput().blur());
    expect(fn.setCurrentPage).toHaveBeenLastCalledWith(6);
  });

  it('too big goes to the last page, zero / junk / empty go to the first, and the box shows the result', () => {
    mount({ currentPage: 2, totalPages: 9 });
    for (const [typed, expected] of [['99', 9], ['0', 1], ['abc', 1], ['', 1], ['-3', 1]] as const) {
      type(pageInput(), typed);
      key(pageInput(), 'Enter');
      expect(fn.setCurrentPage, typed).toHaveBeenLastCalledWith(expected);
      expect(pageInput().value, typed).toBe(String(expected));
    }
  });

  it('arrow up / down step one page, within the range', () => {
    mount({ currentPage: 5, totalPages: 9 });
    key(pageInput(), 'ArrowUp');
    expect(resolved(5)).toBe(6);
    expect(resolved(9)).toBe(9);
    key(pageInput(), 'ArrowDown');
    expect(resolved(5)).toBe(4);
    expect(resolved(1)).toBe(1);
  });

  it('follows the page when it changes from outside (a filter resets to page 1)', () => {
    mount({ currentPage: 5, totalPages: 9 });
    props = { ...props, currentPage: 1 };
    render();
    expect(pageInput().value).toBe('1');
  });

  it('a typed-but-unsent number is replaced when the page changes', () => {
    mount({ currentPage: 5, totalPages: 9 });
    type(pageInput(), '7');
    props = { ...props, currentPage: 2 };
    render();
    expect(pageInput().value).toBe('2');
  });
});
