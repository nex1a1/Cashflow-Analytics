// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@/test-utils/renderHook';
import { useChartDataEngine } from '../useChartDataEngine';
import type { Category, TransactionDisplay } from '@/types';

// Real engine; only the dashboard context is replaced.
const h = vi.hoisted(() => ({ ctx: {} as Record<string, unknown> }));
vi.mock('@/views/Dashboard/context/DashboardContext', () => ({ useDashboardContext: () => h.ctx }));

const categories: Category[] = [
  { id: 'c-food', name: 'ข้าว', type: 'expense', color: '#F97316', allocation_type: 'need' },
  { id: 'c-fun', name: 'บันเทิง', type: 'expense', color: '#A855F7', allocation_type: 'want' },
  { id: 'c-misc', name: 'จิปาถะ', type: 'expense', color: '#38BDF8' },
  { id: 'c-unused', name: 'ไม่เคยใช้', type: 'expense', color: '#EF4444', allocation_type: 'need' },
  { id: 'c-salary', name: 'เงินเดือน', type: 'income', color: '#10B981' },
];
const tx = (id: string, date: string, category_id: string | undefined, amount: number, category = ''): TransactionDisplay =>
  ({ id, date, category, category_id, description: id, amount });

const dates = ['2026-10-01', '2026-10-02', '2026-10-03'];
const analytics = (over: Record<string, unknown> = {}) => ({
  mainChartType: 'combo',
  mainChartData: {
    labels: dates,
    datasets: [
      { label: 'Income', data: [0, 100, 0], backgroundColor: 'rgba(16,185,129,0.6)', borderColor: '#10B981' },
      { label: 'Expense', data: [50, 20, 0], backgroundColor: '#EF4444' },
      { label: 'Cashflow', data: [-50, 80, 0], borderColor: '#38BDF8', backgroundColor: 'rgba(56,189,248,0.2)' },
    ],
  },
  datesInPeriod: dates,
  sortedMonthsKeys: ['2026-08', '2026-09', '2026-10'],
  dailyCatMap: { 'c-food': { '2026-10-01': 50, '2026-10-02': 20 }, 'c-fun': { '2026-10-02': 300 }, 'c-misc': {} },
  monthlyCatMap: { 'c-food': { '2026-08': 400, '2026-09': 500, '2026-10': 70 }, 'c-fun': { '2026-08': 0, '2026-09': 100, '2026-10': 300 } },
  ...over,
});
const baseCtx = (over: Record<string, unknown> = {}) => ({
  transactions: [tx('a', '2026-10-01', 'c-food', 50), tx('b', '2026-10-02', 'c-fun', 300)],
  analytics: analytics(), categories, filterPeriod: '2026-10', dashboardCategory: 'ALL',
  hideFixedExpenses: false, hideWantExpenses: false, chartGroupBy: 'daily', ...over,
});
const baseProps = { chartViewType: 'line', isBreakdown: false, isSmoothLine: false, sankeyData: null as any, chartGroupMode: 'daily', hiddenDatasets: [] as string[] };

const run = (ctx: Record<string, unknown> = {}, props: Partial<typeof baseProps> = {}) => {
  h.ctx = baseCtx(ctx);
  const hook = renderHook(() => useChartDataEngine({ ...baseProps, ...props }));
  const out = hook.result.current;
  hook.unmount();
  return out;
};
const labelsOf = (r: ReturnType<typeof run>) => (r.displayChartData as any).datasets.map((d: any) => d.label);

beforeEach(() => { h.ctx = baseCtx(); });

describe('useChartDataEngine — categories that have data in the period', () => {
  it('lists the categories with a positive amount in the period, named by the category list', () => {
    expect([...run().categoriesWithData].sort()).toEqual(['ข้าว', 'บันเทิง']);
  });

  it('ignores other periods, zero or negative amounts and rows without a date', () => {
    const r = run({ transactions: [
      tx('in', '2026-10-01', 'c-food', 50),
      tx('old', '2026-09-30', 'c-fun', 50),
      tx('zero', '2026-10-02', 'c-misc', 0),
      tx('neg', '2026-10-02', 'c-misc', -5),
      tx('nodate', '', 'c-misc', 5),
    ] });
    expect([...r.categoriesWithData]).toEqual(['ข้าว']);
  });

  it('falls back to the row\'s own category name when the id is unknown', () => {
    const r = run({ transactions: [tx('legacy', '2026-10-01', 'c-gone', 10, 'ชื่อเก่า')] });
    expect([...r.categoriesWithData]).toEqual(['ชื่อเก่า']);
  });

  it('with nothing in the period every expense category stays selectable (the legend is never empty)', () => {
    const r = run({ transactions: [] });
    expect([...r.categoriesWithData].sort()).toEqual(['ข้าว', 'จิปาถะ', 'บันเทิง', 'ไม่เคยใช้'].sort());
  });

  it('no categories: an empty set', () => {
    h.ctx = baseCtx({ categories: undefined });
    const hook = renderHook(() => useChartDataEngine(baseProps));
    expect(hook.result.current.categoriesWithData.size).toBe(0);
    hook.unmount();
  });

  it('a pay-cycle period is read as a cycle', () => {
    const r = run({ filterPeriod: 'cycle:2026-09', transactions: [tx('in', '2026-10-20', 'c-food', 5), tx('out', '2026-10-26', 'c-fun', 5)] });
    expect([...r.categoriesWithData]).toEqual(['ข้าว']);
  });
});

describe('useChartDataEngine — what the chart is fed', () => {
  it('Sankey: its own data, untouched, and no legend', () => {
    const sankey = { datasets: [{ data: [{ from: 'a', to: 'b', flow: 1 }] }] };
    const r = run({}, { chartViewType: 'sankey', sankeyData: sankey });
    expect(r.displayChartData).toBe(sankey);
    expect(r.legendDatasets).toEqual([]);
  });

  it('null while there is no chart data yet', () => {
    expect(run({ analytics: analytics({ mainChartData: undefined }) }).displayChartData).toBeNull();
    expect(run({ analytics: undefined }).displayChartData).toBeNull();
  });

  it('the Cashflow series is always a line on its own axis, even in the bar view', () => {
    const r = run({}, { chartViewType: 'bar' });
    const cash = (r.displayChartData as any).datasets.find((d: any) => d.label === 'Cashflow');
    expect(cash).toMatchObject({ type: 'line', yAxisID: 'y1', borderWidth: 4 });
    const income = (r.displayChartData as any).datasets.find((d: any) => d.label === 'Income');
    expect(income.type).toBe('bar');
  });

  it('line view: every series is a line with points; bar view: bars without points', () => {
    const line = run({}, { chartViewType: 'line' }).displayChartData as any;
    const expense = line.datasets.find((d: any) => d.label === 'Expense');
    expect(expense).toMatchObject({ type: 'line', pointRadius: 4, borderWidth: 4, borderColor: '#EF4444' });

    const bar = run({}, { chartViewType: 'bar' }).displayChartData as any;
    const barExpense = bar.datasets.find((d: any) => d.label === 'Expense');
    expect(barExpense).toMatchObject({ type: 'bar', pointRadius: 0, borderWidth: 0, borderRadius: 0 });
  });

  it('bar colours: a solid fill comes from the border colour so a translucent fill does not wash the bars out', () => {
    const bar = run({}, { chartViewType: 'bar' }).displayChartData as any;
    expect(bar.datasets.find((d: any) => d.label === 'Income').backgroundColor).toBe('#10B981'); // rgba(..0.6) → border colour
    expect(bar.datasets.find((d: any) => d.label === 'Expense').backgroundColor).toBe('#EF4444');
  });

  it('smooth lines get curve tension, straight lines none', () => {
    const smooth = run({}, { isSmoothLine: true }).displayChartData as any;
    const straight = run({}, { isSmoothLine: false }).displayChartData as any;
    expect(smooth.datasets.every((d: any) => d.tension === 0.4)).toBe(true);
    expect(straight.datasets.every((d: any) => d.tension === 0)).toBe(true);
  });

  it('legend-hidden series are flagged hidden', () => {
    const d = run({}, { hiddenDatasets: ['Expense'] }).displayChartData as any;
    expect(d.datasets.find((x: any) => x.label === 'Expense').hidden).toBe(true);
    expect(d.datasets.find((x: any) => x.label === 'Income').hidden).toBe(false);
  });

  it('with several categories picked the lines are a little thinner so they stay readable', () => {
    const many = run({ dashboardCategory: ['ข้าว', 'บันเทิง'] }).displayChartData as any;
    expect(many.datasets.find((d: any) => d.label === 'Expense').borderWidth).toBe(3);
    const all = run({ dashboardCategory: ['ALL', 'ข้าว'] }).displayChartData as any;
    expect(all.datasets.find((d: any) => d.label === 'Expense').borderWidth).toBe(4);
  });

  it('legend shows only series that have something above zero', () => {
    const r = run();
    expect(r.legendDatasets.map((d: any) => d.label)).toEqual(['Income', 'Expense', 'Cashflow']);
    const empty = run({ analytics: analytics({ mainChartData: { labels: dates, datasets: [{ label: 'Income', data: [0, 0, 0] }, { label: 'Expense', data: [1, 0, 0] }] } }) });
    expect(empty.legendDatasets.map((d: any) => d.label)).toEqual(['Expense']);
  });
});

describe('useChartDataEngine — breakdown by category', () => {
  const bd = (ctx = {}, props: Partial<typeof baseProps> = {}) => run(ctx, { isBreakdown: true, chartViewType: 'bar', ...props });

  it('"ALL": one series per expense category that has data, never income or empty categories', () => {
    expect(labelsOf(bd())).toEqual(['ข้าว', 'บันเทิง']);
  });

  it('daily values for a single month', () => {
    const d = bd().displayChartData as any;
    expect(d.labels).toEqual(dates);
    expect(d.datasets[0]).toMatchObject({ label: 'ข้าว', data: [50, 20, 0], borderColor: '#F97316', backgroundColor: '#F97316', type: 'bar' });
    expect(d.datasets[1].data).toEqual([0, 300, 0]);
  });

  it('monthly values when the period spans months and grouping is monthly', () => {
    const d = bd({ filterPeriod: '2026-08_2026-10', chartGroupBy: 'monthly', transactions: [tx('a', '2026-08-05', 'c-food', 1), tx('b', '2026-09-05', 'c-fun', 1)] }).displayChartData as any;
    expect(d.datasets.map((s: any) => s.data)).toEqual([[400, 500, 70], [0, 100, 300]]);
  });

  it('a single month is always daily, whatever the grouping says', () => {
    const d = bd({ chartGroupBy: 'monthly' }).displayChartData as any;
    expect(d.datasets[0].data).toEqual([50, 20, 0]);
  });

  it('a multi-month period grouped by day stays daily', () => {
    const d = bd({ filterPeriod: '2026-08_2026-10', chartGroupBy: 'daily' }).displayChartData as any;
    expect(d.datasets[0].data).toEqual([50, 20, 0]);
  });

  it('a chosen list of categories (by name or id) limits the series', () => {
    expect(labelsOf(bd({ dashboardCategory: ['บันเทิง'] }))).toEqual(['บันเทิง']);
    expect(labelsOf(bd({ dashboardCategory: ['c-food'] }))).toEqual(['ข้าว']);
    expect(labelsOf(bd({ dashboardCategory: 'บันเทิง' }))).toEqual(['บันเทิง']);
  });

  it('a chosen category with no data in the period is not drawn', () => {
    expect(labelsOf(bd({ dashboardCategory: ['ไม่เคยใช้'] }))).toEqual([]);
  });

  it('"only WANT" (NEED hidden) keeps everything that is not NEED', () => {
    expect(labelsOf(bd({ hideFixedExpenses: true, transactions: [tx('a', '2026-10-01', 'c-food', 50), tx('b', '2026-10-02', 'c-fun', 300), tx('c', '2026-10-02', 'c-misc', 5)] }))).toEqual(['บันเทิง', 'จิปาถะ']);
  });

  it('"only NEED" (WANT hidden) keeps just the NEED categories', () => {
    expect(labelsOf(bd({ hideWantExpenses: true, transactions: [tx('a', '2026-10-01', 'c-food', 50), tx('b', '2026-10-02', 'c-fun', 300), tx('c', '2026-10-02', 'c-misc', 5)] }))).toEqual(['ข้าว']);
  });

  it('line style: translucent fill, thinner line, points; hidden series are flagged', () => {
    const d = bd({}, { chartViewType: 'line', hiddenDatasets: ['ข้าว'] }).displayChartData as any;
    expect(d.datasets[0]).toMatchObject({ type: 'line', backgroundColor: '#F97316' + '33', borderWidth: 2.5, pointRadius: 3, hidden: true });
    expect(d.datasets[1].hidden).toBe(false);
  });

  it('a category missing from the map reads 0, not undefined', () => {
    const d = bd({ transactions: [tx('a', '2026-10-01', 'c-misc', 5)], dashboardCategory: ['จิปาถะ'] }).displayChartData as any;
    expect(d.datasets[0].data).toEqual([0, 0, 0]);
  });
});
