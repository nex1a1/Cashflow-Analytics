import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import useAnalytics from '../useAnalytics';

const run = (props: Parameters<typeof useAnalytics>[0]) => {
  let out!: ReturnType<typeof useAnalytics>;
  const Probe = () => { out = useAnalytics(props); return null; };
  renderToString(React.createElement(Probe));
  return out;
};

const groups: any[] = [
  { id: 'g_inc', name: 'เงินเดือน', type: 'income', allocation_type: null, order_index: 1 },
  { id: 'g_food', name: 'ค่ากิน', type: 'expense', allocation_type: 'need', order_index: 2 },
  { id: 'g_rent', name: 'ค่าหอ/ที่พัก', type: 'expense', allocation_type: 'need', order_index: 3 },
  { id: 'g_sub', name: 'บริการรายเดือน', type: 'expense', allocation_type: 'want', order_index: 4 },
  { id: 'g_fun', name: 'บันเทิง', type: 'expense', allocation_type: 'want', order_index: 5 },
  { id: 'g_sav', name: 'ลงทุน/ออม', type: 'savings', allocation_type: 'savings', order_index: 6 },
];
const cats: any[] = [
  { id: 'c_inc', name: 'เงินเดือน', type: 'income', cashflowGroup: 'g_inc' },
  { id: 'c_food', name: 'ข้าว', type: 'expense', cashflowGroup: 'g_food', icon: 'utensils' },
  { id: 'c_rent', name: 'ค่าเช่า/ค่าหอพัก', type: 'expense', cashflowGroup: 'g_rent' },
  { id: 'c_elec', name: 'ค่าไฟ', type: 'expense', cashflowGroup: 'g_rent' },
  { id: 'c_net', name: 'ค่าเน็ต', type: 'expense', cashflowGroup: 'g_rent' },
  { id: 'c_water', name: 'ค่าน้ำ', type: 'expense', cashflowGroup: 'g_rent' },
  { id: 'c_soft', name: 'ซอฟต์แวร์ & AI', type: 'expense', cashflowGroup: 'g_sub' },
  { id: 'c_shop', name: 'สมาชิกช้อปปิ้ง', type: 'expense', cashflowGroup: 'g_sub' },
  { id: 'c_stream', name: 'ความบันเทิง & สตรีมมิ่ง', type: 'expense', cashflowGroup: 'g_sub' },
  { id: 'c_misc_sub', name: 'อื่นๆ', type: 'expense', cashflowGroup: 'g_sub', icon: 'star' },
  { id: 'c_movie', name: 'หนัง', type: 'expense', cashflowGroup: 'g_fun', icon: 'film' },
  { id: 'c_game', name: 'เกม', type: 'expense', cashflowGroup: 'g_fun' },
  { id: 'c_bar', name: 'บาร์', type: 'expense', cashflowGroup: 'g_fun' },
  { id: 'c_book', name: 'หนังสือ', type: 'expense', cashflowGroup: 'g_fun' },
  { id: 'c_toy', name: 'ของเล่น', type: 'expense', cashflowGroup: 'g_fun' },
  { id: 'c_sav', name: 'กองทุน', type: 'savings', cashflowGroup: 'g_sav' },
];
const tx = (id: string, date: string, category_id: string, amount: number, over: any = {}) =>
  ({ id, date, category_id, category: '', description: '', amount, allocation_type: null, ...over }) as any;
const month = (rows: any[], extra: Partial<Parameters<typeof useAnalytics>[0]> = {}) =>
  run({ transactions: rows, categories: cats, cashflowGroups: groups, filterPeriod: '2026-09', ...extra });

afterEach(() => vi.useRealTimers());

describe('subscriptions', () => {
  const rows = [
    tx('s1', '2026-09-01', 'c_soft', 700, { description: 'ChatGPT Plus' }),
    tx('s2', '2026-09-02', 'c_soft', 300, { description: 'Claude' }),
    tx('s3', '2026-09-03', 'c_shop', 99, { description: 'Shopee VIP' }),
    tx('s4', '2026-09-04', 'c_stream', 419, { description: 'Netflix' }),
    tx('s5', '2026-09-05', 'c_stream', 169, { description: 'Netflix' }),
    tx('s6', '2026-09-06', 'c_misc_sub', 50, { description: '' }),
    tx('i', '2026-09-25', 'c_inc', 10000),
  ];

  it('totals, count and the split by kind', () => {
    const a = month(rows);
    expect(a.subscriptionTotal).toBe(1737);
    expect(a.subscriptionCount).toBe(6);
    expect(a.subscriptionSub).toEqual({ software: 1000, shopping: 99, streaming: 588, other: 50 });
    expect(a.subscriptionPercentage).toBe('100.0');
    expect(a.subscriptionPctOfIncome).toBe('17.4');
  });

  it('top services: grouped by description, summed, top 4 by amount, icon by keyword or category', () => {
    const a = month(rows);
    expect(a.topSubscriptionServices.map((s: any) => [s.name, s.amount, s.count])).toEqual([
      ['ChatGPT Plus', 700, 1], ['Netflix', 588, 2], ['Claude', 300, 1], ['Shopee VIP', 99, 1],
    ]);
    const icon = (n: string) => a.topSubscriptionServices.find((s: any) => s.name === n)!.icon;
    expect(icon('ChatGPT Plus')).toBe('bot');
    expect(icon('Netflix')).toBe('popcorn');
    expect(icon('Shopee VIP')).toBe('shopping-bag');
  });

  it('a row without a description is named after its category and uses its icon', () => {
    const a = month([tx('x', '2026-09-06', 'c_misc_sub', 50)]);
    expect(a.topSubscriptionServices[0]).toMatchObject({ name: 'อื่นๆ', icon: 'star', count: 1 });
  });

  it('an unknown service gets the repeat icon', () => {
    const a = month([tx('x', '2026-09-06', 'c_soft', 50, { description: 'Notion' })]);
    expect(a.topSubscriptionServices[0].icon).toBe('repeat');
  });

  it('a subscription category name counts even outside a subscription group', () => {
    const a = month([tx('x', '2026-09-06', 'c_x', 80)], {
      categories: [...cats, { id: 'c_x', name: 'สตรีมมิ่งเพลง', type: 'expense', cashflowGroup: 'g_fun' }],
    });
    expect(a.subscriptionTotal).toBe(80);
    expect(a.subscriptionSub.streaming).toBe(80);
  });

  it('a plain entertainment subscription counts as streaming', () => {
    const a = month([tx('x', '2026-09-06', 'c_x', 80)], {
      categories: [...cats, { id: 'c_x', name: 'บันเทิงรายเดือน', type: 'expense', cashflowGroup: 'g_sub' }],
    });
    expect(a.subscriptionSub.streaming).toBe(80);
  });

  it('no income: % of income is 0', () => {
    const a = month([tx('x', '2026-09-06', 'c_soft', 50)]);
    expect(a.subscriptionPctOfIncome).toBe(0);
  });
});

describe('rent and food', () => {
  it('rent splits into rent / electricity / internet / water', () => {
    const a = month([
      tx('1', '2026-09-01', 'c_rent', 4500), tx('2', '2026-09-01', 'c_elec', 600),
      tx('3', '2026-09-01', 'c_net', 400), tx('4', '2026-09-01', 'c_water', 100),
      tx('i', '2026-09-25', 'c_inc', 20000),
    ]);
    expect(a.rentTotal).toBe(5600);
    expect(a.rentSub).toEqual({ rent: 4500, electricity: 600, internet: 400, water: 100 });
    expect(a.rentPercentage).toBe('28.0');
  });

  it('food: total, % of spending and of income, workday vs holiday averages, busiest day', () => {
    const a = month([
      tx('1', '2026-09-07', 'c_food', 100), tx('2', '2026-09-07', 'c_food', 50), // Monday
      tx('3', '2026-09-06', 'c_food', 300), // Sunday
      tx('r', '2026-09-01', 'c_rent', 550),
      tx('i', '2026-09-25', 'c_inc', 1000),
    ]);
    expect(a.foodTotal).toBe(450);
    expect(a.foodPercentage).toBe('45.0');
    expect(a.foodPctOfIncome).toBe('45.0');
    // Sept 2026: 8 weekend days, 22 weekdays
    expect(a.foodWorkdayAvg).toBeCloseTo(150 / 22);
    expect(a.foodHolidayAvg).toBeCloseTo(300 / 8);
    expect(a.maxFoodDayAmount).toBe(300);
  });

  it('a group named like rent/food counts by keyword when the matching group id is another one', () => {
    const g2 = [...groups, { id: 'g_rent2', name: 'ค่าเช่าโกดัง', type: 'expense', allocation_type: 'need', order_index: 9 },
      { id: 'g_food2', name: 'อาหารแมว', type: 'expense', allocation_type: 'want', order_index: 10 }];
    const c2 = [...cats, { id: 'c_r2', name: 'โกดัง', type: 'expense', cashflowGroup: 'g_rent2' }, { id: 'c_f2', name: 'แมว', type: 'expense', cashflowGroup: 'g_food2' }];
    const a = month([tx('1', '2026-09-01', 'c_r2', 1000), tx('2', '2026-09-01', 'c_f2', 70)], { cashflowGroups: g2, categories: c2 });
    expect(a.rentTotal).toBe(1000);
    expect(a.foodTotal).toBe(70);
  });

  it('no spending: percentages are 0, no busiest day', () => {
    const a = month([tx('i', '2026-09-25', 'c_inc', 1000)]);
    expect(a.foodPercentage).toBe(0);
    expect(a.maxFoodDayAmount).toBe(0);
  });
});

describe('want categories', () => {
  it('top 4 by amount with share of all WANT spending', () => {
    const a = month([
      tx('1', '2026-09-01', 'c_movie', 400), tx('2', '2026-09-01', 'c_game', 300),
      tx('3', '2026-09-01', 'c_bar', 200), tx('4', '2026-09-01', 'c_book', 50),
      tx('5', '2026-09-01', 'c_toy', 50), tx('n', '2026-09-01', 'c_food', 999),
    ]);
    expect(a.variableTotal).toBe(1000);
    expect(a.fixedTotal).toBe(999);
    expect(a.topWantCategories.map((c: any) => [c.name, c.pctOfWant])).toEqual([
      ['หนัง', '40'], ['เกม', '30'], ['บาร์', '20'], ['หนังสือ', '5'],
    ]);
    expect(a.topWantCategories[0].icon).toBe('film');
    expect(a.topWantCategories[1].icon).toBe('shopping-bag');
  });

  it('a row tagged WANT counts even in a NEED group; unknown categories fall back', () => {
    const a = month([tx('1', '2026-09-01', 'c_food', 100, { allocation_type: 'want' }), tx('2', '2026-09-01', 'gone', 30, { allocation_type: 'want' })]);
    expect(a.topWantCategories.map((c: any) => c.name)).toEqual(['ข้าว', 'อื่นๆ']);
  });
});

describe('chart filters', () => {
  const rows = [tx('1', '2026-09-01', 'c_food', 100), tx('2', '2026-09-01', 'c_movie', 40), tx('3', '2026-09-02', 'c_game', 10)];

  it('hide NEED / hide WANT remove those rows from the chart total and category list', () => {
    expect(month(rows, { hideFixedExpenses: true }).chartTotal).toBe(50);
    expect(month(rows, { hideWantExpenses: true }).chartTotal).toBe(100);
    expect(month(rows, { hideWantExpenses: true }).sortedCats.map((c: any) => c.id)).toEqual(['c_food']);
    expect(month(rows, { hideFixedExpenses: true }).totalExpense).toBe(150); // totals stay complete
  });

  it('a category list (by id or name) narrows the chart', () => {
    const a = month(rows, { dashboardCategory: ['c_movie', 'เกม'] });
    expect(a.chartTotal).toBe(50);
    expect(a.sortedCats.map((c: any) => [c.id, c.percentage])).toEqual([['c_movie', '80.0'], ['c_game', '20.0']]);
  });

  it('rows of a deleted category count in the total but are not listed as a category', () => {
    const a = month([...rows, tx('g', '2026-09-03', 'gone', 5)]);
    expect(a.chartTotal).toBe(155);
    expect(a.sortedCats.map((c: any) => c.id)).toEqual(['c_food', 'c_movie', 'c_game']);
  });

  it('a single string works like a one-item list', () => {
    expect(month(rows, { dashboardCategory: 'c_food' }).chartTotal).toBe(100);
  });
});

describe('rows without a group', () => {
  it('fall into the first group of their type', () => {
    const c2 = [...cats, { id: 'c_i2', name: 'โบนัส', type: 'income' }, { id: 'c_s2', name: 'ทอง', type: 'savings' }, { id: 'c_e2', name: 'จิปาถะ', type: 'expense' }];
    const a = month([tx('1', '2026-09-01', 'c_i2', 100), tx('2', '2026-09-01', 'c_s2', 30), tx('3', '2026-09-01', 'c_e2', 20)], { categories: c2 });
    const m = a.sortedCashflow[0];
    expect(m.groups.g_inc).toBe(100);
    expect(m.groups.g_sav).toBe(30);
    expect(m.groups.g_food).toBe(20);
    expect(a.totalIncome).toBe(100);
    expect(a.totalSavings).toBe(30);
  });
});

describe('forecast status', () => {
  const at = (rows: any[], day = 10) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, day, 12)); // Sept has 30 days
    return month(rows).forecastingDetails!;
  };

  // Day 10 of 30, income 30,000: spending E so far projects 3E for the month → leftover = (30,000 − 3E) / 30,000.
  // The pace badge warns BEFORE the deficit, against the app's own leftover target (BUDGET_RULES.surplus.min = 10%):
  // under 10% → over the plan, under 12.5% (10% / WARN_AT) → near the ceiling.
  const pace = (spent: number, day = 10) => at([tx('i', '2026-09-01', 'c_inc', 30000), tx('e', '2026-09-05', 'c_movie', spent)], day).paceStatus;

  it('mid-month: leftover of 12.5% or more is on track', () => {
    expect(pace(8700).code).toBe('ON_TRACK'); // 13%
    expect(pace(8750).code).toBe('ON_TRACK'); // exactly 12.5%
  });

  it('mid-month: leftover under 12.5% is near the ceiling (info), still before any deficit', () => {
    expect(pace(8760)).toMatchObject({ code: 'MODERATE', label: 'ใกล้เพดาน' }); // 12.4%
    expect(pace(9000).code).toBe('MODERATE'); // exactly 10%: the target is still met
  });

  it('mid-month: leftover under the 10% target is over the plan (amber), still before any deficit', () => {
    expect(pace(9010)).toMatchObject({ code: 'OVER_PACING', label: 'ใช้เร็วเกินแผน' }); // 9.9%
    expect(pace(10000).code).toBe('OVER_PACING'); // exactly 0: nothing left, but not negative
  });

  it('a projected deficit is critical', () => {
    const f = at([tx('i', '2026-09-01', 'c_inc', 30000), tx('e', '2026-09-05', 'c_movie', 10010)]);
    expect(f.paceStatus).toMatchObject({ code: 'CRITICAL', label: 'เกินงบประมาณ' });
    expect(f.eomStatus.code).toBe('DEFICIT');
  });

  it('the last day uses what was really spent (no projection left)', () => {
    expect(pace(27100, 30).code).toBe('OVER_PACING'); // 9.7% left
    expect(pace(26500, 30).code).toBe('MODERATE'); // 11.7%
    expect(pace(26000, 30).code).toBe('ON_TRACK'); // 13.3%
  });

  it('the end-of-month badge calls under 10% (the same target) "เหลือน้อย"', () => {
    expect(at([tx('i', '2026-09-01', 'c_inc', 30000), tx('e', '2026-09-05', 'c_movie', 9200)]).eomStatus.code).toBe('TIGHT'); // 8%
    expect(at([tx('i', '2026-09-01', 'c_inc', 30000), tx('e', '2026-09-05', 'c_movie', 9000)]).eomStatus.code).toBe('STABLE'); // exactly 10%
  });

  it('end-of-month bucket: tight under 5%', () => {
    expect(at([tx('i', '2026-09-01', 'c_inc', 30000), tx('e', '2026-09-05', 'c_movie', 9700)]).eomStatus.code).toBe('TIGHT'); // 29100 → 3%
  });

  it('20% exactly is not "stable" any more', () => {
    expect(at([tx('i', '2026-09-01', 'c_inc', 30000), tx('e', '2026-09-05', 'c_movie', 8000)]).eomStatus.code).toBe('EXCELLENT');
    expect(at([tx('i', '2026-09-01', 'c_inc', 30000), tx('e', '2026-09-05', 'c_movie', 8100)]).eomStatus.code).toBe('STABLE');
  });

  it('no income: surplus % is 0, required cuts are reported', () => {
    const f = at([tx('e', '2026-09-05', 'c_movie', 1000)]);
    expect(f.projectedSurplusPct).toBe(0);
    expect(f.requiredReduction).toBe(3000);
    expect(f.safeToSpend).toBe(0);
    expect(f.requiredDailyReduction).toBe(100);
  });

  it('not the current month: no forecast', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 10, 12));
    const a = month([tx('e', '2026-09-05', 'c_movie', 1000)]);
    expect(a.showForecasting).toBe(false);
    expect(a.forecastingDetails).toBeNull();
  });
});

describe('period-over-period window', () => {
  const prevRows = (dates: string[]) => dates.map((d, i) => tx(`p${i}`, d, 'c_movie', 10));
  const label = (period: string, rows: any[] = []) => {
    const a = run({ transactions: rows, categories: cats, cashflowGroups: groups, filterPeriod: period });
    return [a.periodLabel, a.prevTotals.expense];
  };

  it('quarter: the previous quarter, wrapping to Q4 of last year', () => {
    expect(label('2026-Q1', prevRows(['2025-09-30', '2025-10-01', '2025-12-31', '2026-01-01']))).toEqual(['QoQ', 20]);
    expect(label('2026-Q3', prevRows(['2026-03-31', '2026-04-01', '2026-06-30', '2026-07-01']))).toEqual(['QoQ', 20]);
  });

  it('half year: H1 looks at last year\'s H2, H2 at H1', () => {
    expect(label('2026-H1', prevRows(['2025-06-30', '2025-07-01', '2025-12-31', '2026-01-01']))).toEqual(['HoH', 20]);
    expect(label('2026-H2', prevRows(['2025-12-31', '2026-01-01', '2026-06-30', '2026-07-01']))).toEqual(['HoH', 20]);
  });

  it('year: the year before', () => {
    expect(label('2026', prevRows(['2024-12-31', '2025-01-01', '2025-12-31', '2026-01-01']))).toEqual(['YoY', 20]);
  });

  it('month: the month before, across a year end', () => {
    expect(label('2026-01', prevRows(['2025-11-30', '2025-12-01', '2025-12-31', '2026-01-01']))).toEqual(['MoM', 20]);
  });

  it('pay cycle: the cycle before (25 → 24)', () => {
    expect(label('cycle:2026-10', prevRows(['2026-09-24', '2026-09-25', '2026-10-24', '2026-10-25']))).toEqual(['MoM', 20]);
  });

  it('a range: the same number of days right before it', () => {
    // rows on 1 Aug and 31 Oct span the range (92 days); previous = 1 May → 31 Jul
    expect(label('2026-08_2026-10', prevRows(['2026-04-30', '2026-05-01', '2026-07-31', '2026-08-01', '2026-10-31']))).toEqual(['PoP', 20]);
  });

  it('all time has nothing before it', () => {
    expect(label('ALL', prevRows(['2026-01-01']))).toEqual(['ALL', 0]);
  });
});

describe('backend summary', () => {
  const summary = { summary: { income: 9, expense: 8, savings: 7 }, monthly: [{ month: '2026-08', income: 5, expense: 4, savings: 3, groups: { g_food: 4 } }] };

  it('a range uses the backend totals and monthly rows', () => {
    const a = run({ transactions: [tx('e', '2026-08-05', 'c_food', 100)], categories: cats, cashflowGroups: groups, filterPeriod: '2026-08_2026-09', summaryData: summary });
    expect([a.totalIncome, a.totalExpense, a.totalSavings]).toEqual([9, 8, 7]);
    expect(a.sortedCashflow.find((m: any) => m.monthStr === '2026-08')).toMatchObject({ income: 5, totalExp: 4, totalSav: 3, groups: { g_food: 4 } });
  });

  it('a single month keeps its own row totals', () => {
    const a = run({ transactions: [tx('e', '2026-08-05', 'c_food', 100)], categories: cats, cashflowGroups: groups, filterPeriod: '2026-08', summaryData: summary });
    expect(a.totalExpense).toBe(100);
  });

  it('a summary without parts changes nothing', () => {
    const a = run({ transactions: [tx('e', '2026-08-05', 'c_food', 100)], categories: cats, cashflowGroups: groups, filterPeriod: '2026-08_2026-09', summaryData: {} });
    expect(a.totalExpense).toBe(100);
  });

  it('a monthly row without groups gets an empty map', () => {
    const a = run({ transactions: [], categories: cats, cashflowGroups: groups, filterPeriod: '2026', summaryData: { monthly: [{ month: '2026-01', income: 1, expense: 0, savings: 0 }] } });
    expect(a.sortedCashflow[0].groups).toEqual({});
  });
});
