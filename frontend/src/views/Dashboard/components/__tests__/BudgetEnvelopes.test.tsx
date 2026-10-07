// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import BudgetEnvelopes from '../BudgetEnvelopes';
import '@/test-utils/dom'; // switches React's act environment on
import type { CashflowGroup, Category, TransactionDisplay } from '@/types';

// Real component and real envelope maths. Replaced: the dashboard context, the budgets hook (settings) and "today".
const h = vi.hoisted(() => ({
  ctx: {} as Record<string, unknown>,
  budgets: {} as Record<string, number>,
}));
vi.mock('@/views/Dashboard/context/DashboardContext', () => ({ useDashboardContext: () => h.ctx }));
vi.mock('@/hooks/useBudgets', () => ({ default: () => ({ budgets: h.budgets, setBudget: async () => true }) }));
vi.mock('@/utils/payCycle', async (orig) => ({ ...(await orig<typeof import('@/utils/payCycle')>()), localTodayIso: () => '2026-10-15' }));

const sat = (baht: number) => baht * 100;
const groups: CashflowGroup[] = [
  { id: 'g-rent', name: 'ที่พัก', type: 'expense', allocation_type: 'need', order_index: 1 },
  { id: 'g-food', name: 'ค่ากิน', type: 'expense', allocation_type: 'need', order_index: 2 },
  { id: 'g-fun', name: 'บันเทิง', type: 'expense', allocation_type: 'want', order_index: 3 },
];
const categories: Category[] = [
  { id: 'c-rent', name: 'ค่าเช่า', type: 'expense', cashflow_group_id: 'g-rent' },
  { id: 'c-food', name: 'ข้าว', type: 'expense', cashflow_group_id: 'g-food' },
  { id: 'c-fun', name: 'หนัง', type: 'expense', cashflow_group_id: 'g-fun' },
];
const tx = (id: string, date: string, category_id: string, amount: number, group_type: TransactionDisplay['group_type'] = 'expense'): TransactionDisplay =>
  ({ id, date, category: category_id, category_id, description: id, amount, group_type });

const set = (over: Record<string, unknown> = {}) => {
  h.ctx = {
    transactions: [], categories, cashflowGroups: groups, filterPeriod: '2026-10', isLoading: false,
    getFilterLabel: (p?: string) => `ช่วง ${p}`, ...over,
  };
};

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<BudgetEnvelopes />));
};
const rows = () => [...document.querySelectorAll('li')];
const row = (name: string) => rows().find(r => r.textContent!.includes(name))!;

beforeEach(() => { h.budgets = { 'g-food': sat(5_000), 'g-fun': sat(2_000) }; set(); });
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

describe('BudgetEnvelopes — when it shows', () => {
  it('shows one row per budgeted group, in group order, and skips groups without a budget', () => {
    mount();
    expect(rows().map(r => r.querySelector('span span.truncate')?.textContent)).toEqual(['ค่ากิน', 'บันเทิง']);
    expect(document.body.textContent).not.toContain('ที่พัก');
  });

  it('is hidden for a year, a range and multi-month selections (a monthly budget cannot be compared with them)', () => {
    for (const filterPeriod of ['2026', '2026-08_2026-10', '2026-08,2026-10', 'ALL', 'cycle:2026-01_2026-12']) {
      set({ filterPeriod });
      mount();
      expect(container!.innerHTML, filterPeriod).toBe('');
      act(() => root!.unmount()); container!.remove();
    }
  });

  it('is hidden when no group has a budget, or the budgeted group no longer exists', () => {
    h.budgets = {};
    mount();
    expect(container!.innerHTML).toBe('');
    act(() => root!.unmount()); container!.remove();
    h.budgets = { 'g-gone': sat(1_000) };
    mount();
    expect(container!.innerHTML).toBe('');
  });

  it('a single month is labelled "เดือน", a single pay cycle "รอบ"', () => {
    mount();
    expect(document.querySelector('section')!.getAttribute('aria-label')).toBe('งบต่อเดือน');
    act(() => root!.unmount()); container!.remove();
    set({ filterPeriod: 'cycle:2026-09' });
    mount();
    expect(document.querySelector('section')!.getAttribute('aria-label')).toBe('งบต่อรอบ');
    expect(document.body.textContent).toContain('งบ · ช่วง cycle:2026-09');
  });
});

describe('BudgetEnvelopes — what is counted', () => {
  it('spent = expense rows of the group dated up to today; rows dated later are a plan, not spending', () => {
    set({ transactions: [
      tx('a', '2026-10-05', 'c-food', 3_000),
      tx('b', '2026-10-15', 'c-food', 500), // today counts as spent
      tx('c', '2026-10-20', 'c-food', 700), // future → plan
    ] });
    mount();
    const t = row('ค่ากิน').textContent!;
    expect(t).toContain('฿3,500 / ฿5,000');
    expect(t).toContain('เหลือ ฿1,500');
    expect(t).toContain('แผนอีก ฿700');
    expect(document.body.textContent).toContain('แผน = รายการที่ลงวันที่ล่วงหน้า');
  });

  it('ignores savings / income rows, rows without a category and other months', () => {
    set({ transactions: [
      tx('a', '2026-10-05', 'c-food', 1_000),
      tx('s', '2026-10-05', 'c-food', 9_000, 'savings'),
      tx('i', '2026-10-05', 'c-food', 9_000, 'income'),
      { ...tx('n', '2026-10-05', 'c-food', 9_000), category_id: undefined },
      tx('o', '2026-11-05', 'c-food', 9_000),
    ] });
    mount();
    expect(row('ค่ากิน').textContent).toContain('฿1,000 / ฿5,000');
  });

  it('works out the average of the previous months and says how many months it used', () => {
    set({ transactions: [
      tx('sep', '2026-09-10', 'c-food', 4_000),
      tx('aug', '2026-08-10', 'c-food', 2_000),
      // July has nothing: still one of the three months averaged
    ] });
    mount();
    expect(row('ค่ากิน').textContent).toContain('เฉลี่ย 3 เดือน ฿2,000');
  });

  it('no plan line and no average when there is nothing to show', () => {
    mount();
    expect(document.body.textContent).not.toContain('แผนอีก');
    expect(document.body.textContent).not.toContain('แผน = รายการ');
  });

  it('in cycle mode the unit is "รอบ" and the cycle (25th–24th) decides what is in it', () => {
    set({ filterPeriod: 'cycle:2026-09', transactions: [
      tx('in', '2026-09-25', 'c-food', 1_000),   // first day of the cycle
      tx('in2', '2026-10-05', 'c-food', 500),    // still the 2026-09 cycle
      tx('out', '2026-10-25', 'c-food', 9_000),  // next cycle
    ] });
    mount();
    expect(row('ค่ากิน').textContent).toContain('฿1,500 / ฿5,000');
  });
});

describe('BudgetEnvelopes — colour steps', () => {
  const level = (name: string) => {
    const spent = row(name).querySelector('.tabular-nums span span')!; // the spent figure
    return spent.className;
  };
  const used = (amount: number, id = 'c-fun') => { set({ transactions: [tx('x', '2026-10-05', id, amount)] }); mount(); };

  it('within the budget (or exactly at it): neutral', () => {
    used(2_000);
    expect(level('บันเทิง')).toContain('text-ink-display');
    expect(row('บันเทิง').textContent).toContain('เหลือ ฿0');
  });

  it('up to 120% over: amber, and still spells out the overrun in words', () => {
    used(2_300); // 115%
    expect(level('บันเทิง')).toContain('text-warn');
    expect(row('บันเทิง').textContent).toContain('เกิน ฿300');
  });

  it('past 120%: danger', () => {
    used(2_500); // 125%
    expect(level('บันเทิง')).toContain('text-danger');
    expect(row('บันเทิง').textContent).toContain('เกิน ฿500');
  });

  it('exactly 120% is still amber, not red', () => {
    used(2_400);
    expect(level('บันเทิง')).toContain('text-warn');
  });

  it('the bar fills up to the spent share and never beyond the track', () => {
    used(5_000); // 250%
    const bars = row('บันเทิง').querySelectorAll<HTMLElement>('span[aria-hidden="true"] span');
    expect(bars[0].style.width).toBe('100%');
  });

  it('the planned part is drawn after the spent part and the two never exceed 100%', () => {
    set({ transactions: [tx('a', '2026-10-05', 'c-food', 4_000), tx('b', '2026-10-20', 'c-food', 4_000)] });
    mount();
    const [spent, plan] = row('ค่ากิน').querySelectorAll<HTMLElement>('span[aria-hidden="true"] span');
    expect(spent.style.width).toBe('80%');
    expect(plan.style.left).toBe('80%');
    expect(plan.style.width).toBe('20%'); // clipped: 80% + 100% planned would be 180%
  });
});

describe('BudgetEnvelopes — loading', () => {
  it('shows shimmer instead of numbers while the new period loads (the rows still belong to the old one)', () => {
    set({ isLoading: true, transactions: [tx('a', '2026-10-05', 'c-food', 3_000)] });
    mount();
    expect(document.body.textContent).not.toContain('฿3,000');
    expect(document.querySelectorAll('.animate-pulse').length).toBe(4); // bar + figures for two rows
    expect(rows()).toHaveLength(2);
  });
});
