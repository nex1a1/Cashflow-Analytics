// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@/test-utils/renderHook';
import { useSankeyEngine } from '../useSankeyEngine';
import type { CashflowGroup, Category, TransactionDisplay } from '@/types';

// Real engine; only the dashboard context is replaced.
const h = vi.hoisted(() => ({ ctx: {} as Record<string, unknown> }));
vi.mock('@/views/Dashboard/context/DashboardContext', () => ({ useDashboardContext: () => h.ctx }));

const groups: CashflowGroup[] = [
  { id: 'g-inc', name: 'เงินเดือน', type: 'income', allocation_type: null, order_index: 1, color: '#10B981' },
  { id: 'g-need', name: 'ที่พัก', type: 'expense', allocation_type: 'need', order_index: 2, color: '#38BDF8' },
  { id: 'g-want', name: 'ตามใจ', type: 'expense', allocation_type: 'want', order_index: 3, color: '#F59E0B' },
  { id: 'g-sav', name: 'ลงทุน', type: 'savings', allocation_type: 'savings', order_index: 4, color: '#34D399' },
];
const categories: Category[] = [
  { id: 'c-salary', name: 'เงินเดือน', cashflow_group_id: 'g-inc', order_index: 1 },
  { id: 'c-rent', name: 'ค่าเช่า', cashflow_group_id: 'g-need', order_index: 2, color: '#0EA5E9' },
  { id: 'c-food', name: 'ข้าว', cashflow_group_id: 'g-need', order_index: 1, color: '#F97316' },
  { id: 'c-fun', name: 'บันเทิง', cashflow_group_id: 'g-want', order_index: 3 },
  { id: 'c-fund', name: 'กองทุน', cashflow_group_id: 'g-sav', order_index: 4 },
];
const tx = (id: string, date: string, category_id: string, amount: number, extra: Partial<TransactionDisplay> = {}): TransactionDisplay =>
  ({ id, date, category: category_id, category_id, description: id, amount, ...extra });

const month = [
  tx('s', '2026-10-25', 'c-salary', 30_000),
  tx('rent', '2026-10-01', 'c-rent', 8_000),
  tx('food', '2026-10-02', 'c-food', 2_000),
  tx('fun', '2026-10-03', 'c-fun', 4_000),
  tx('fund', '2026-10-04', 'c-fund', 6_000),
];

const set = (over: Record<string, unknown> = {}) => {
  h.ctx = { analytics: {}, transactions: month, categories, cashflowGroups: groups, filterPeriod: '2026-10', ...over };
};
const run = (props: Partial<Parameters<typeof useSankeyEngine>[0]> = {}) => {
  const hook = renderHook(() => useSankeyEngine({ chartViewType: 'sankey', sankeySortMode: 'amount', ...props }));
  const out = hook.result.current as any;
  hook.unmount();
  return out;
};
const flows = (props = {}) => run(props).datasets[0].data as Array<{ from: string; to: string; flow: number; percent: string; color?: string; allocBreakdown?: any }>;
const find = (list: ReturnType<typeof flows>, from: string, to: string) => list.find(f => f.from.startsWith(from) && f.to.startsWith(to));

beforeEach(() => set());

describe('useSankeyEngine — when it produces anything', () => {
  it('only for the Sankey view', () => {
    expect(run({ chartViewType: 'line' })).toBeNull();
    expect(run({ chartViewType: 'bar' })).toBeNull();
  });

  it('needs analytics, transactions and groups', () => {
    for (const missing of ['analytics', 'transactions', 'cashflowGroups']) {
      set({ [missing]: undefined });
      expect(run()).toBeNull();
    }
  });

  it('an empty period still gives a (flow-less) chart rather than nothing', () => {
    set({ transactions: [] });
    expect(flows()).toEqual([]);
  });
});

describe('useSankeyEngine — standard layout (income → total cash → expense / savings → groups → categories)', () => {
  it('income groups feed Total Cash', () => {
    const f = find(flows(), 'เงินเดือน (30,000.00)', 'Total Cash')!;
    expect(f.flow).toBe(30_000);
    expect(f.to).toBe('Total Cash (30,000.00)');
    expect(f.percent).toBe('100.0% of Total');
  });

  it('Total Cash splits into expense, savings and what is left, each with its share of cash', () => {
    const list = flows();
    expect(find(list, 'Total Cash', 'Expense')).toMatchObject({ to: 'Expense (14,000.00)', flow: 14_000, percent: '46.7% of Cash used' });
    expect(find(list, 'Total Cash', 'Savings')).toMatchObject({ to: 'Savings (6,000.00)', flow: 6_000, percent: '20.0% of Cash saved' });
    expect(find(list, 'Total Cash', 'Remaining')).toMatchObject({ to: 'Remaining Balance (10,000.00)', flow: 10_000, percent: '33.3% เงินคงเหลือสุทธิ' });
  });

  it('every baht that comes in goes somewhere: expense + savings + remaining = income', () => {
    const out = flows().filter(f => f.from.startsWith('Total Cash')).reduce((s, f) => s + f.flow, 0);
    expect(out).toBe(30_000);
  });

  it('expense splits into its groups and each group into its categories, biggest first', () => {
    const list = flows();
    expect(find(list, 'Expense', 'ที่พัก')).toMatchObject({ flow: 10_000, percent: '71.4% of Outflow' });
    expect(find(list, 'Expense', 'ตามใจ')).toMatchObject({ flow: 4_000 });
    expect(find(list, 'ที่พัก', 'ค่าเช่า')).toMatchObject({ flow: 8_000, percent: '80.0% of ที่พัก' });
    expect(find(list, 'ที่พัก', 'ข้าว')).toMatchObject({ flow: 2_000 });
    const order = list.filter(f => f.from.startsWith('ที่พัก')).map(f => f.to);
    expect(order).toEqual(['ค่าเช่า (8,000.00)', 'ข้าว (2,000.00)']);
  });

  it('savings splits into groups and categories with its own share', () => {
    const list = flows();
    expect(find(list, 'Savings', 'ลงทุน')).toMatchObject({ flow: 6_000, percent: '100.0% of Savings' });
    expect(find(list, 'ลงทุน', 'กองทุน')).toMatchObject({ flow: 6_000 });
  });

  it('a sell nets against the buys: a savings group that nets to zero or below does not appear', () => {
    set({ transactions: [...month, tx('sell', '2026-10-20', 'c-fund', -6_000)] });
    const list = flows();
    expect(find(list, 'Total Cash', 'Savings')).toBeUndefined();
    expect(find(list, 'ลงทุน', 'กองทุน')).toBeUndefined();
    expect(find(list, 'Total Cash', 'Remaining')!.flow).toBe(16_000); // the 6,000 is back in the pot
  });

  it('columns follow the 5-column layout: income 0, total cash 1, expense/savings 2, groups 3, categories 4', () => {
    const { column } = run().datasets[0];
    expect(column['เงินเดือน (30,000.00)']).toBe(0);
    expect(column['Total Cash (30,000.00)']).toBe(1);
    expect(column['Expense (14,000.00)']).toBe(2);
    expect(column['Savings (6,000.00)']).toBe(2);
    expect(column['Remaining Balance (10,000.00)']).toBe(2);
    expect(column['ที่พัก (10,000.00)']).toBe(3);
    expect(column['ค่าเช่า (8,000.00)']).toBe(4);
  });

  it('priorities are unique within each column (a clash there would make the layout order arbitrary)', () => {
    for (const mode of ['standard', 'allocation']) {
      const { priority, column } = run({ sankeyMode: mode }).datasets[0];
      const byColumn: Record<number, number[]> = {};
      for (const label of Object.keys(priority)) (byColumn[column[label]] ||= []).push(priority[label]);
      for (const [col, values] of Object.entries(byColumn)) expect(new Set(values).size, `${mode} column ${col}`).toBe(values.length);
    }
  });

  it('sorts groups and categories by amount, or by their own order when asked', () => {
    const byAmount = run({ sankeySortMode: 'amount' }).datasets[0].priority;
    expect(byAmount['ค่าเช่า (8,000.00)']).toBeLessThan(byAmount['ข้าว (2,000.00)']);
    const byIndex = run({ sankeySortMode: 'index' }).datasets[0].priority;
    expect(byIndex['ข้าว (2,000.00)']).toBeLessThan(byIndex['ค่าเช่า (8,000.00)']); // order_index 1 vs 2
  });

  it('only the selected period counts, and deleted rows never do', () => {
    set({ transactions: [...month, tx('old', '2026-09-30', 'c-rent', 99_999), tx('gone', '2026-10-05', 'c-rent', 99_999, { is_deleted: true } as Partial<TransactionDisplay>)] });
    expect(find(flows(), 'Expense', 'ที่พัก')!.flow).toBe(10_000);
  });

  it('a pay-cycle period uses the cycle: 25 Sep – 24 Oct', () => {
    set({ filterPeriod: 'cycle:2026-09', transactions: [tx('in', '2026-09-26', 'c-salary', 30_000), tx('in2', '2026-10-20', 'c-rent', 500), tx('out', '2026-10-26', 'c-rent', 9_999)] });
    const list = flows();
    expect(find(list, 'Total Cash', 'Expense')!.flow).toBe(500);
  });

  it('rows of an unknown category are ignored; a category can be named instead of identified', () => {
    set({ transactions: [...month, tx('ghost', '2026-10-05', 'c-ghost', 5_000), { ...tx('by-name', '2026-10-06', 'c-rent', 700), category_id: undefined, category: 'ค่าเช่า' }] });
    expect(find(flows(), 'ที่พัก', 'ค่าเช่า')!.flow).toBe(8_700);
  });
});

describe('useSankeyEngine — spending more than comes in', () => {
  const overspent = () => set({ transactions: [tx('s', '2026-10-25', 'c-salary', 10_000), tx('rent', '2026-10-01', 'c-rent', 12_000)] });

  it('adds an "Overspent" source that fills the gap, and no remaining balance', () => {
    overspent();
    const list = flows();
    expect(find(list, 'Overspent', 'Total Cash')).toMatchObject({ flow: 2_000, percent: 'Deficit' });
    expect(find(list, 'Total Cash', 'Remaining')).toBeUndefined();
  });

  it('what leaves Total Cash equals what entered it, overspent included', () => {
    overspent();
    const list = flows();
    const inn = list.filter(f => f.to.startsWith('Total Cash')).reduce((s, f) => s + f.flow, 0);
    const out = list.filter(f => f.from.startsWith('Total Cash')).reduce((s, f) => s + f.flow, 0);
    expect(inn).toBe(12_000);
    expect(out).toBe(12_000);
  });

  it('exactly break-even is a surplus of 0: no overspent, no remaining', () => {
    set({ transactions: [tx('s', '2026-10-25', 'c-salary', 10_000), tx('rent', '2026-10-01', 'c-rent', 10_000)] });
    const list = flows();
    expect(find(list, 'Overspent', 'Total Cash')).toBeUndefined();
    expect(find(list, 'Total Cash', 'Remaining')).toBeUndefined();
  });

  it('no income at all: no division by zero in the percentages', () => {
    set({ transactions: [tx('rent', '2026-10-01', 'c-rent', 500)] });
    const list = flows();
    expect(list.every(f => !/NaN|Infinity/.test(f.percent))).toBe(true);
    expect(find(list, 'Total Cash', 'Expense')!.percent).toBe('0.0% of Cash used');
  });
});

describe('useSankeyEngine — NEED / WANT / SAVINGS layout', () => {
  const alloc = (props = {}) => flows({ sankeyMode: 'allocation', ...props });

  it('Total Cash splits by allocation, using the row\'s own allocation, else its group\'s', () => {
    const list = alloc();
    expect(find(list, 'Total Cash', 'Need')).toMatchObject({ to: 'Need - จำเป็น (10,000.00)', flow: 10_000, percent: '33.3% of Cash used' });
    expect(find(list, 'Total Cash', 'Want')).toMatchObject({ flow: 4_000 });
    expect(find(list, 'Total Cash', 'Savings')).toMatchObject({ flow: 6_000, percent: '20.0% of Cash saved' });
    expect(find(list, 'Total Cash', 'Remaining')!.flow).toBe(10_000);
  });

  it('a row marked NEED inside a WANT group moves that part of the category across', () => {
    set({ transactions: [...month.filter(t => t.id !== 'fun'), tx('fun-want', '2026-10-03', 'c-fun', 3_000), tx('fun-need', '2026-10-04', 'c-fun', 1_000, { allocation_type: 'need' })] });
    const list = alloc();
    expect(find(list, 'Total Cash', 'Need')!.flow).toBe(11_000);
    expect(find(list, 'Total Cash', 'Want')!.flow).toBe(3_000);
    // the category sits under whichever side holds most of it, and shows both parts
    expect(find(list, 'Want', 'บันเทิง')).toMatchObject({ flow: 3_000 });
    expect(find(list, 'Need', 'บันเทิง')).toMatchObject({ flow: 1_000 });
    expect(find(list, 'Want', 'บันเทิง')!.allocBreakdown).toMatchObject({ need: 1_000, want: 3_000, total: 4_000, catName: 'บันเทิง' });
  });

  it('categories hang under their allocation, biggest first, savings categories under Savings', () => {
    const list = alloc();
    expect(list.filter(f => f.from.startsWith('Need')).map(f => f.to)).toEqual(['ค่าเช่า (8,000.00)', 'ข้าว (2,000.00)']);
    expect(find(list, 'Want', 'บันเทิง')).toMatchObject({ flow: 4_000, percent: '100.0% of Want' });
    expect(find(list, 'Savings', 'กองทุน')).toMatchObject({ flow: 6_000, percent: '100.0% of Savings' });
  });

  it('sorting by order puts the lower order_index first', () => {
    const list = alloc({ sankeySortMode: 'index' });
    expect(list.filter(f => f.from.startsWith('Need')).map(f => f.to)).toEqual(['ข้าว (2,000.00)', 'ค่าเช่า (8,000.00)']);
  });

  it('an expense group with no allocation of its own counts as WANT', () => {
    set({ cashflowGroups: groups.map(g => (g.id === 'g-need' ? { ...g, allocation_type: null } : g)) });
    const list = alloc();
    expect(find(list, 'Total Cash', 'Need')).toBeUndefined();
    expect(find(list, 'Total Cash', 'Want')!.flow).toBe(14_000);
  });

  it('what leaves Total Cash still equals income', () => {
    const out = alloc().filter(f => f.from.startsWith('Total Cash')).reduce((s, f) => s + f.flow, 0);
    expect(out).toBe(30_000);
  });

  it('exactly break-even: nothing is left over, so no remaining-balance flow', () => {
    set({ transactions: [tx('s', '2026-10-25', 'c-salary', 10_000), tx('rent', '2026-10-01', 'c-rent', 10_000)] });
    expect(find(alloc(), 'Total Cash', 'Remaining')).toBeUndefined();
  });

  it('a category split evenly between NEED and WANT is listed under NEED', () => {
    set({ transactions: [tx('s', '2026-10-25', 'c-salary', 30_000), tx('fun-want', '2026-10-03', 'c-fun', 2_000), tx('fun-need', '2026-10-04', 'c-fun', 2_000, { allocation_type: 'need' })] });
    const list = alloc();
    expect(list.filter(f => f.to.startsWith('บันเทิง')).map(f => f.from.split(' ')[0])).toEqual(['Need', 'Want']);
    expect(find(list, 'Need', 'บันเทิง')!.allocBreakdown).toMatchObject({ need: 2_000, want: 2_000, total: 4_000 });
  });

  it('and with a deficit the overspent source fills the gap', () => {
    set({ transactions: [tx('s', '2026-10-25', 'c-salary', 5_000), tx('rent', '2026-10-01', 'c-rent', 8_000)] });
    const list = alloc();
    expect(find(list, 'Overspent', 'Total Cash')!.flow).toBe(3_000);
    expect(find(list, 'Total Cash', 'Remaining')).toBeUndefined();
  });
});

describe('useSankeyEngine — chart options', () => {
  it('link colours are the flow\'s own colour at 45%, and 90% on hover', () => {
    const ds = run().datasets[0];
    const ctx = { dataset: { data: [{ color: '#FF0000' }] }, dataIndex: 0 };
    expect(ds.colorFrom(ctx)).toBe('rgba(255, 0, 0, 0.45)');
    expect(ds.colorTo(ctx)).toBe('rgba(255, 0, 0, 0.45)');
    expect(ds.hoverColorFrom(ctx)).toBe('rgba(255, 0, 0, 0.9)');
    expect(ds.hoverColorTo(ctx)).toBe('rgba(255, 0, 0, 0.9)');
  });

  it('a flow without a colour gets the muted fallback instead of failing', () => {
    const ds = run().datasets[0];
    expect(ds.colorFrom({ dataset: { data: [{}] }, dataIndex: 0 })).toMatch(/^rgba\(\d+, \d+, \d+, 0\.45\)$/);
    expect(ds.colorFrom({ dataset: undefined, dataIndex: 0 })).toMatch(/^rgba\(/);
  });

});
