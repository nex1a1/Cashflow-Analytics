// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import TopTransactions from '../TopTransactions';
import { THAI_MONTHS_SHORT } from '@/utils/formatters';
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

describe('TopTransactions — row details', () => {
  const dateTag = (rowId: string) => [...document.querySelectorAll('p[title]')].find(p => p.textContent === rowId)!.parentElement!.querySelector('span.rounded-pill')!.textContent!.trim();
  const iso = (offsetDays: number) => {
    const d = new Date(); d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  it('shows the amount without a sign and the category name from the category list', () => {
    set({ transactions: [tx('a', -1234.5, 'c-food')] });
    mount();
    expect(document.body.textContent).toContain('1,234.50');
    expect(document.body.textContent).not.toContain('-1,234.50');
    expect(document.body.textContent).toContain('ค่ากิน');
  });

});
