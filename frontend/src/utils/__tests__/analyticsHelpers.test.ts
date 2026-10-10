import { describe, it, expect } from 'vitest';
import { createCategoryMap, calculateDayTypeCounts, generateMainChartData, CashflowMonthData } from '../analyticsHelpers';
import { tc } from '@/constants/theme';
import { Category, DayType } from '../../types';

const CATS: Category[] = [
  { id: 'cat_salary', name: 'เงินเดือน', type: 'income', cashflow_group_id: 'grp_income' },
  { id: 'cat_food', name: 'อาหาร', type: 'expense', cashflow_group_id: 'grp_food', color: '#FF8800' },
  { id: 'cat_taxi', name: 'แท็กซี่', type: 'expense', cashflow_group_id: 'grp_food' },
];

describe('createCategoryMap', () => {
  it('indexes categories by both name and id', () => {
    const catMap = createCategoryMap(CATS);
    expect(catMap['cat_salary'].name).toBe('เงินเดือน');
    expect(catMap['เงินเดือน'].id).toBe('cat_salary');
    expect(createCategoryMap([])).toEqual({});
  });
});

describe('calculateDayTypeCounts', () => {
  const config: DayType[] = [
    { id: 'WORK', label: 'ทำงาน' },
    { id: 'HOLIDAY', label: 'วันหยุด' },
  ];

  it('counts marked days; every configured type starts at 0', () => {
    const counts = calculateDayTypeCounts(['2026-09-01', '2026-09-02', '2026-09-03'], {
      '2026-09-01': 'WORK', '2026-09-02': 'WORK', '2026-09-03': 'HOLIDAY',
    }, [...config, { id: 'OT', label: 'OT' }]);
    expect(counts).toEqual({ WORK: 2, HOLIDAY: 1, OT: 0 });
  });

  it('unmarked days follow resolveDefaultDayTypeId (by name code) even after day types are re-ordered', () => {
    const reordered: DayType[] = [
      { id: 'HOLIDAY', name: 'holiday', label: 'วันหยุด' },
      { id: 'WORK', name: 'workday', label: 'ทำงาน' },
    ];
    // Mon, Sat, Sun
    expect(calculateDayTypeCounts(['2026-10-05', '2026-10-10', '2026-10-11'], {}, reordered)).toEqual({ WORK: 1, HOLIDAY: 2 });
  });

  it('a day marked with a type that is no longer configured is still counted under it', () => {
    expect(calculateDayTypeCounts(['2026-10-05', '2026-10-06'], { '2026-10-05': 'GONE', '2026-10-06': 'GONE' }, config))
      .toEqual({ WORK: 0, HOLIDAY: 0, GONE: 2 });
  });

  it('no day types at all: nothing to count', () => {
    expect(calculateDayTypeCounts(['2026-10-05'], {}, [])).toEqual({});
  });
});

describe('generateMainChartData', () => {
  const month = (income: number, totalExp: number): CashflowMonthData => ({ monthStr: '', income, totalExp, totalSav: 0, groups: {} });
  const base = {
    chartGroupBy: 'monthly' as 'daily' | 'monthly',
    filterPeriod: '2026',
    sortedMonthsKeys: ['2026-01', '2026-02'],
    cashflowMap: { '2026-01': month(1000, 400), '2026-02': month(500, 900) },
    datesInPeriod: ['2026-01-05', '2026-02-10'],
    dailyAllMap: { '2026-01-05': 40, '2026-02-10': 90 },
    hideFixedExpenses: false,
    hideWantExpenses: false,
    dashboardCategory: ['ALL'] as string | string[],
    monthlyAllMap: { '2026-01': 400, '2026-02': 900 },
    monthlyCatMap: { cat_food: { '2026-02': 300 } },
    dailyCatMap: { cat_food: { '2026-02-10': 30 } },
    catMap: createCategoryMap(CATS),
  };
  const run = (over: Partial<typeof base> = {}) => generateMainChartData({ ...base, ...over }) as any;

  it('several months, everything: a combo of net cashflow (line) + income and expense (bars) per month', () => {
    const { chartType, chartData } = run();
    expect(chartType).toBe('combo');
    expect(chartData.labels).toEqual(['มกราคม 2026', 'กุมภาพันธ์ 2026']);
    expect(chartData.datasets.map((d: any) => [d.type, d.label, d.data])).toEqual([
      ['line', 'Cashflow', [600, -400]],
      ['bar', 'รายรับ', [1000, 500]],
      ['bar', 'รายจ่ายรวม', [400, 900]],
    ]);
  });

  it('a month missing from the map counts as zero', () => {
    const { chartData } = run({ sortedMonthsKeys: ['2026-01', '2026-03'] });
    expect(chartData.datasets.map((d: any) => d.data)).toEqual([[600, 0], [1000, 0], [400, 0]]);
  });

  it('a hidden allocation drops the combo (income no longer matches the bars) for a line', () => {
    expect(run({ hideFixedExpenses: true }).chartType).toBe('line');
    expect(run({ hideWantExpenses: true }).chartType).toBe('line');
  });

  it('the ALL line: label and colour say which expenses it holds; the monthly totals are its data', () => {
    const want = run({ hideFixedExpenses: true }).chartData.datasets[0];
    expect(want).toMatchObject({ label: 'รายจ่ายตามใจ (บาท)', borderColor: tc('expense'), data: [400, 900], fill: true, borderWidth: 2, borderDash: [], pointRadius: 0 });
    const need = run({ hideWantExpenses: true }).chartData.datasets[0];
    expect(need).toMatchObject({ label: 'รายจ่ายจำเป็น (บาท)', borderColor: tc('alloc-need'), backgroundColor: tc('alloc-need', 0.1) });
  });

  it('ALL beside a category: the total turns into a dashed guide line, and nothing is filled', () => {
    const { chartType, chartData } = run({ dashboardCategory: ['ALL', 'อาหาร'] });
    expect(chartType).toBe('line');
    const [all, food] = chartData.datasets;
    expect(all).toMatchObject({ label: 'รายจ่ายรวมทั้งหมด (บาท)', borderColor: tc('expense'), backgroundColor: tc('expense', 0.1), borderWidth: 3, borderDash: [5, 5], fill: false });
    expect(food).toMatchObject({ label: 'อาหาร', data: [0, 300], borderColor: '#FF8800', backgroundColor: 'rgba(255, 136, 0, 0.1)', fill: false, pointRadius: 3 });
  });

  it('one category alone is filled; a category without its own colour gets the muted ink', () => {
    const [food] = run({ dashboardCategory: ['อาหาร'] }).chartData.datasets;
    expect(food.fill).toBe(true);
    const [taxi] = run({ dashboardCategory: 'แท็กซี่' }).chartData.datasets;
    expect(taxi).toMatchObject({ label: 'แท็กซี่', data: [0, 0], borderColor: tc('ink-muted') });
  });

  it('a name that is not a category still draws (empty), keyed by itself', () => {
    const [x] = run({ dashboardCategory: ['cat_food'], filterPeriod: '2026' }).chartData.datasets;
    expect(x.data).toEqual([0, 300]); // an id works as well as a name
    const [y] = run({ dashboardCategory: ['ไม่มี'] }).chartData.datasets;
    expect(y.data).toEqual([0, 0]);
  });

  it('days across several months: one bar per day labelled DD/MM, coloured by what is shown', () => {
    const { chartType, chartData } = run({ chartGroupBy: 'daily' });
    expect(chartType).toBe('daily-expense');
    expect(chartData.labels).toEqual(['05/01', '10/02']);
    expect(chartData.datasets).toHaveLength(1);
    expect(chartData.datasets[0]).toMatchObject({ type: 'bar', label: 'รายจ่ายจริง', data: [40, 90], backgroundColor: tc('accent') });
    expect(run({ chartGroupBy: 'daily', hideFixedExpenses: true }).chartData.datasets[0]).toMatchObject({ label: 'รายจ่ายตามใจ', backgroundColor: tc('warn'), borderColor: tc('warn') });
    expect(run({ chartGroupBy: 'daily', hideWantExpenses: true }).chartData.datasets[0]).toMatchObject({ label: 'รายจ่ายจำเป็น', backgroundColor: tc('ink-body'), borderColor: tc('ink-body') });
    expect(run({ chartGroupBy: 'daily', hideFixedExpenses: true, hideWantExpenses: true }).chartData.datasets[0].label).toBe('รายจ่ายตามใจ');
  });

  it('a single month (or pay cycle) is always by day, labelled วันที่ DD, with points on the lines', () => {
    for (const filterPeriod of ['2026-02', 'cycle:2026-02']) {
      const { chartType, chartData } = run({ filterPeriod, datesInPeriod: ['2026-02-10'] });
      expect(chartType).toBe('daily-expense');
      expect(chartData.labels).toEqual(['วันที่ 10']);
    }
    const [all, food] = run({ filterPeriod: '2026-02', datesInPeriod: ['2026-02-10'], dashboardCategory: ['ALL', 'อาหาร'] }).chartData.datasets;
    expect(all).toMatchObject({ data: [90], pointRadius: 3 });
    expect(food).toMatchObject({ data: [30], pointRadius: 3 });
  });

  it('category lines by day over several months have no points', () => {
    const [food] = run({ chartGroupBy: 'daily', dashboardCategory: ['อาหาร'] }).chartData.datasets;
    expect(food).toMatchObject({ data: [0, 30], pointRadius: 0 });
  });

  it('a label that is not a date is shown as is', () => {
    expect(run({ chartGroupBy: 'daily', datesInPeriod: ['x'] }).chartData.labels).toEqual(['x']);
    expect(run({ filterPeriod: '2026-02', datesInPeriod: ['x'] }).chartData.labels).toEqual(['x']);
  });
});
