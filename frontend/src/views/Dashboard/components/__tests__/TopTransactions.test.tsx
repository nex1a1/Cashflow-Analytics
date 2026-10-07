// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import TopTransactions from '../TopTransactions';
import { choose, q } from '@/test-utils/dom';
import type { Category, TransactionDisplay } from '@/types';

const h = vi.hoisted(() => ({ ctx: {} as Record<string, unknown>, setTopXLimit: vi.fn() }));
vi.mock('@/views/Dashboard/context/DashboardContext', () => ({ useDashboardContext: () => h.ctx }));

const categories: Category[] = [
  { id: 'c-food', name: 'ค่ากิน', type: 'expense', allocation_type: 'need' },
  { id: 'c-fun', name: 'บันเทิง', type: 'expense', allocation_type: 'want' },
  { id: 'c-trip', name: 'เที่ยว', type: 'expense' }, // no allocation: counts as WANT
  { id: 'c-salary', name: 'เงินเดือน', type: 'income' },
  { id: 'c-gold', name: 'ออมทอง', type: 'savings' },
];
const tx = (id: string, amount: number, category_id: string, extra: Partial<TransactionDisplay> = {}): TransactionDisplay => {
  const cat = categories.find(c => c.id === category_id)!;
  return { id, date: '2026-01-05', category: cat.name, category_id, description: id, amount, group_type: cat.type, ...extra };
};

const set = (over: Record<string, unknown> = {}) => {
  h.ctx = {
    transactions: [], categories, filterPeriod: 'ALL', dashboardCategory: 'ALL', hideFixedExpenses: false, hideWantExpenses: false,
    topXLimit: 7, setTopXLimit: h.setTopXLimit, showSkeleton: false, ...over,
  };
};

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<TopTransactions />));
};
/** Row descriptions in display order. */
const titles = () => [...document.querySelectorAll('p[title]')].map(p => p.textContent);
const chip = () => q('div[title^="คิดเป็น"]');

beforeEach(() => { set(); h.setTopXLimit.mockClear(); });
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

describe('TopTransactions — which rows', () => {
  it('lists expenses only, biggest first, and ranks them', () => {
    set({ transactions: [
      tx('small', 100, 'c-food'), tx('big', 900, 'c-fun'), tx('mid', 450, 'c-trip'),
      tx('pay', 30_000, 'c-salary'), tx('invest', 5_000, 'c-gold'),
    ] });
    mount();
    expect(titles()).toEqual(['big', 'mid', 'small']);
    expect([...document.querySelectorAll('div.w-6.h-6')].map(d => d.textContent)).toEqual(['1', '2', '3']);
  });

  it('only the first N (the limit in the selector), default 7 when the limit is unset', () => {
    const many = Array.from({ length: 12 }, (_, i) => tx(`t${i}`, 100 + i, 'c-food'));
    set({ transactions: many, topXLimit: 5 });
    mount();
    expect(titles()).toHaveLength(5);
    expect(titles()[0]).toBe('t11');
    act(() => root!.unmount()); container!.remove();

    set({ transactions: many, topXLimit: 0 });
    mount();
    expect(titles()).toHaveLength(7);
  });

  it('only rows inside the selected period', () => {
    set({ filterPeriod: '2026-02', transactions: [tx('jan', 500, 'c-food'), tx('feb', 300, 'c-food', { date: '2026-02-10' })] });
    mount();
    expect(titles()).toEqual(['feb']);
  });

  it('a pay-cycle period uses the cycle, not the calendar month', () => {
    set({ filterPeriod: 'cycle:2026-01', transactions: [
      tx('in-cycle', 200, 'c-food', { date: '2026-02-03' }),  // 25 Jan – 24 Feb
      tx('out', 300, 'c-food', { date: '2026-02-25' }),
    ] });
    mount();
    expect(titles()).toEqual(['in-cycle']);
  });

  it('hide fixed (NEED) removes the NEED rows; rows with no allocation count as WANT', () => {
    set({ hideFixedExpenses: true, transactions: [tx('food', 500, 'c-food'), tx('fun', 400, 'c-fun'), tx('trip', 300, 'c-trip')] });
    mount();
    expect(titles()).toEqual(['fun', 'trip']);
  });

  it('a row\'s own allocation beats the category\'s', () => {
    set({ hideFixedExpenses: true, transactions: [tx('food-want', 500, 'c-food', { allocation_type: 'want' })] });
    mount();
    expect(titles()).toEqual(['food-want']);
  });

  it('hide WANT removes the WANT rows (and the unallocated ones)', () => {
    set({ hideWantExpenses: true, transactions: [tx('food', 500, 'c-food'), tx('fun', 400, 'c-fun'), tx('trip', 300, 'c-trip')] });
    mount();
    expect(titles()).toEqual(['food']);
  });

  it('category filter: by id or by a list; "ALL" keeps everything', () => {
    const rows = [tx('food', 500, 'c-food'), tx('fun', 400, 'c-fun'), tx('trip', 300, 'c-trip')];
    set({ transactions: rows, dashboardCategory: 'c-fun' });
    mount();
    expect(titles()).toEqual(['fun']);
    act(() => root!.unmount()); container!.remove();

    set({ transactions: rows, dashboardCategory: ['c-food', 'c-trip'] });
    mount();
    expect(titles()).toEqual(['food', 'trip']);
    act(() => root!.unmount()); container!.remove();

    set({ transactions: rows, dashboardCategory: ['ALL'] });
    mount();
    expect(titles()).toHaveLength(3);
  });

  it('a row with no group_type falls back to its category type, or a negative amount', () => {
    set({ transactions: [
      { ...tx('legacy-exp', 100, 'c-food'), group_type: undefined },
      { ...tx('legacy-inc', 900, 'c-salary'), group_type: undefined },
    ] });
    mount();
    expect(titles()).toEqual(['legacy-exp']);
  });
});

describe('TopTransactions — the total chip', () => {
  it('sums the shown rows and says what share of all matching expenses they are', () => {
    const rows = Array.from({ length: 8 }, (_, i) => tx(`t${i}`, 100, 'c-food')); // 800 in total, 7 shown
    set({ transactions: rows });
    mount();
    expect(chip()!.textContent).toContain('700.00');
    expect(chip()!.textContent).toContain('88%'); // 700 / 800
    expect(chip()!.title).toBe('คิดเป็น 88% ของรายจ่ายทั้งหมดตามเงื่อนไข (฿800.00)');
  });

  it('everything fits: 100%', () => {
    set({ transactions: [tx('a', 250, 'c-food'), tx('b', 250, 'c-fun')] });
    mount();
    expect(chip()!.textContent).toContain('500.00');
    expect(chip()!.textContent).toContain('100%');
  });
});

describe('TopTransactions — states', () => {
  it('empty: says nothing matches and offers no chip', () => {
    set({ transactions: [tx('pay', 30_000, 'c-salary')] });
    mount();
    expect(document.body.textContent).toContain('ไม่มีรายการรายจ่ายที่ตรงตามเงื่อนไข');
    expect(chip()).toBeNull();
  });

  it('no transactions at all: same empty message', () => {
    mount();
    expect(document.body.textContent).toContain('ไม่มีรายการรายจ่ายที่ตรงตามเงื่อนไข');
  });

  it('skeleton: placeholders for the selected count, the selector is disabled, no chip', () => {
    set({ transactions: [tx('a', 100, 'c-food')], showSkeleton: true, topXLimit: 5 });
    mount();
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(5);
    expect(titles()).toEqual([]);
    expect(q<HTMLSelectElement>('select')!.disabled).toBe(true);
    expect(chip()).toBeNull();
  });

  it('changing the selector reports the new limit as a number', () => {
    mount();
    expect(q<HTMLSelectElement>('select')!.value).toBe('7');
    choose(q('select'), '15');
    expect(h.setTopXLimit).toHaveBeenCalledWith(15);
  });
});

describe('TopTransactions — row details', () => {
  const dateTag = (rowId: string) => [...document.querySelectorAll('p[title]')].find(p => p.textContent === rowId)!.parentElement!.querySelector('span.rounded-pill')!.textContent!.trim();
  const iso = (offsetDays: number) => {
    const d = new Date(); d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  it('relative dates for the last week, DD/MM/YY after that', () => {
    set({ transactions: [
      tx('today', 100, 'c-food', { date: iso(0) }), tx('yesterday', 99, 'c-food', { date: iso(-1) }),
      tx('tomorrow', 98, 'c-food', { date: iso(1) }), tx('three', 97, 'c-food', { date: iso(-3) }),
      tx('old', 96, 'c-food', { date: '2026-01-05' }),
    ] });
    mount();
    expect(dateTag('today')).toBe('วันนี้');
    expect(dateTag('yesterday')).toBe('เมื่อวาน');
    expect(dateTag('tomorrow')).toBe('พรุ่งนี้');
    expect(dateTag('three')).toBe('3 วันที่แล้ว');
    expect(dateTag('old')).toBe('05/01/26');
  });

  it('shows the amount without a sign and the category name from the category list', () => {
    set({ transactions: [tx('a', -1234.5, 'c-food')] });
    mount();
    expect(document.body.textContent).toContain('1,234.50');
    expect(document.body.textContent).not.toContain('-1,234.50');
    expect(document.body.textContent).toContain('ค่ากิน');
  });

  it('the bar behind each row is relative to the biggest, with a small floor so a tiny row is still visible', () => {
    set({ transactions: [tx('big', 1000, 'c-food'), tx('tiny', 1, 'c-food')] });
    mount();
    const widths = [...document.querySelectorAll<HTMLElement>('div.bg-gradient-to-r')].map(d => d.style.width);
    expect(widths[0]).toBe('100%');
    expect(parseFloat(widths[1])).toBeCloseTo(4.096, 2);
  });
});
