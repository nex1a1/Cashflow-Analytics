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
    expect(a.wantTotal).toBe(1000);
    expect(a.needTotal).toBe(999);
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
  // The pace badge warns BEFORE the deficit, against the app's own leftover target (BUDGET_RULES.surplus.min = 20%,
  // the SAVE share of 50/30/20): under 20% → over the plan, under 25% (20% / WARN_AT) → near the ceiling.
  const pace = (spent: number, day = 10) => at([tx('i', '2026-09-01', 'c_inc', 30000), tx('e', '2026-09-05', 'c_movie', spent)], day).paceStatus;

  it('mid-month: leftover of 25% or more is on track', () => {
    expect(pace(7400).code).toBe('ON_TRACK'); // 26%
    expect(pace(7500).code).toBe('ON_TRACK'); // exactly 25%
  });

  it('mid-month: leftover under 25% is near the ceiling (info), still before any deficit', () => {
    expect(pace(7510)).toMatchObject({ code: 'MODERATE', label: 'ใกล้เพดาน' }); // 24.9%
    expect(pace(8000).code).toBe('MODERATE'); // exactly 20%: the target is still met
  });

  it('mid-month: leftover under the 20% target is over the plan (amber), still before any deficit', () => {
    expect(pace(8010)).toMatchObject({ code: 'OVER_PACING', label: 'ใช้เร็วเกินแผน' }); // 19.9%
    expect(pace(10000).code).toBe('OVER_PACING'); // exactly 0: nothing left, but not negative
  });

  it('a projected deficit is critical', () => {
    const f = at([tx('i', '2026-09-01', 'c_inc', 30000), tx('e', '2026-09-05', 'c_movie', 10010)]);
    expect(f.paceStatus).toMatchObject({ code: 'CRITICAL', label: 'เกินงบประมาณ' });
    expect(f.eomStatus.code).toBe('DEFICIT');
  });

  it('the last day uses what was really spent (no projection left)', () => {
    expect(pace(24300, 30).code).toBe('OVER_PACING'); // 19% left
    expect(pace(23000, 30).code).toBe('MODERATE'); // 23.3%
    expect(pace(22000, 30).code).toBe('ON_TRACK'); // 26.7%
  });

  it('the end-of-month badge calls under 20% (the same target) "เหลือน้อย"', () => {
    expect(at([tx('i', '2026-09-01', 'c_inc', 30000), tx('e', '2026-09-05', 'c_movie', 8200)]).eomStatus.code).toBe('TIGHT'); // 18%
    expect(at([tx('i', '2026-09-01', 'c_inc', 30000), tx('e', '2026-09-05', 'c_movie', 8000)]).eomStatus.code).toBe('STABLE'); // exactly 20%
  });

  it('end-of-month bucket: tight under 5%', () => {
    expect(at([tx('i', '2026-09-01', 'c_inc', 30000), tx('e', '2026-09-05', 'c_movie', 9700)]).eomStatus.code).toBe('TIGHT'); // 29100 → 3%
  });

  it('25% (target / WARN_AT) and up is "เหลือเงินมาก"', () => {
    expect(at([tx('i', '2026-09-01', 'c_inc', 30000), tx('e', '2026-09-05', 'c_movie', 7500)]).eomStatus.code).toBe('EXCELLENT');
    expect(at([tx('i', '2026-09-01', 'c_inc', 30000), tx('e', '2026-09-05', 'c_movie', 7600)]).eomStatus.code).toBe('STABLE');
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

describe('forecast: fixed bills, missing rows and one-off days', () => {
  const allGroups = [...groups, { id: 'g_bonus', name: 'พิเศษ/โบนัส', type: 'income', allocation_type: null, order_index: 7 }];
  const allCats = [...cats, { id: 'c_bonus', name: 'โบนัส', type: 'income', cashflowGroup: 'g_bonus' }];
  const income = tx('i', '2026-09-01', 'c_inc', 30000);
  const forecast = (rows: any[], day = 5) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, day, 12));
    return month(rows, { categories: allCats, cashflowGroups: allGroups }).forecastingDetails!;
  };

  it('a subscription is paid once: it counts as fixed and is not multiplied by the remaining days', () => {
    const f = forecast([income, tx('m', '2026-09-03', 'c_movie', 500), tx('s', '2026-09-05', 'c_soft', 1000)]);
    expect(f.fixedTotal).toBe(1000);
    expect(f.variableUpToToday).toBe(500);
    expect(f.projectedExpense).toBe(4000); // 1000 + 500 + 100/day * 25
  });

  it('a subscription dated ahead is fixed already, once', () => {
    const f = forecast([income, tx('m', '2026-09-03', 'c_movie', 500), tx('s', '2026-09-20', 'c_soft', 1000)]);
    expect(f.fixedTotal).toBe(1000);
    expect(f.projectedExpense).toBe(4000);
  });

  const billHistory = [
    tx('r7', '2026-07-31', 'c_rent', 4500), tx('r8', '2026-08-31', 'c_rent', 4500),
    tx('e7', '2026-07-31', 'c_elec', 1400), tx('e8', '2026-08-31', 'c_elec', 1500),
  ];

  it('a monthly bill not logged yet is expected at its latest amount', () => {
    const f = forecast([income, tx('m', '2026-09-03', 'c_movie', 500), ...billHistory]);
    expect(f.pendingFixed).toBe(6000);
    expect(f.pendingFixedItems).toEqual(expect.arrayContaining([{ name: 'ค่าเช่า/ค่าหอพัก', amount: 4500 }, { name: 'ค่าไฟ', amount: 1500 }]));
    expect(f.fixedTotal).toBe(6000);
    expect(f.projectedExpense).toBe(9000); // 6000 + 500 + 100/day * 25
    expect(f.safeToSpend).toBe(940); // (30000 - 6000 - 500) / 25
  });

  it('a bill already entered, even ahead of its date, is not expected again', () => {
    const f = forecast([income, tx('m', '2026-09-03', 'c_movie', 500), ...billHistory, tx('r9', '2026-09-30', 'c_rent', 4600)]);
    expect(f.pendingFixed).toBe(1500);
    expect(f.pendingFixedItems).toEqual([{ name: 'ค่าไฟ', amount: 1500 }]);
    expect(f.fixedTotal).toBe(6100);
  });

  it('a bill seen in only one earlier month is not treated as monthly', () => {
    const f = forecast([income, tx('m', '2026-09-03', 'c_movie', 500), tx('r8', '2026-08-31', 'c_rent', 4500)]);
    expect(f.pendingFixed).toBe(0);
    expect(f.pendingFixedItems).toEqual([]);
  });

  it('a service that skipped last month has stopped: it is not expected again', () => {
    const f = forecast([income, tx('m', '2026-09-03', 'c_movie', 500), tx('g6', '2026-06-02', 'c_soft', 750, { description: 'Gemini Pro' }), tx('g7', '2026-07-02', 'c_soft', 750, { description: 'Gemini Pro' })]);
    expect(f.pendingFixed).toBe(0);
  });

  it('a salary that skipped last month is not expected either', () => {
    const f = forecast([tx('m', '2026-09-03', 'c_movie', 500), tx('p6', '2026-06-25', 'c_inc', 25000), tx('p7', '2026-07-25', 'c_inc', 25000)]);
    expect(f.estimatedIncome).toBe(0);
  });

  const salaryHistory = [tx('p7', '2026-07-25', 'c_inc', 25000), tx('p8', '2026-08-25', 'c_inc', 25000)];

  it('a salary not logged yet is estimated for the ceiling; a one-time bonus is not', () => {
    const f = forecast([tx('m', '2026-09-03', 'c_movie', 500), tx('b', '2026-09-02', 'c_bonus', 24), tx('b8', '2026-08-02', 'c_bonus', 9000), ...salaryHistory]);
    expect(f.estimatedIncome).toBe(25000);
    expect(f.maxAllowedExpense).toBe(25024);
    expect(f.projectedSurplus).toBe(25024 - 3000);
  });

  it('a salary already entered ahead needs no estimate', () => {
    const f = forecast([tx('m', '2026-09-03', 'c_movie', 500), tx('p9', '2026-09-25', 'c_inc', 25500), ...salaryHistory]);
    expect(f.estimatedIncome).toBe(0);
    expect(f.maxAllowedExpense).toBe(25500);
  });

  it('pay-cycle view looks for the missing bills in earlier cycles', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 1, 12)); // day 8 of the 25 Aug – 24 Sep cycle
    const a = run({
      transactions: [tx('p6', '2026-06-25', 'c_inc', 25000), tx('p7', '2026-07-25', 'c_inc', 25000), tx('r6', '2026-07-20', 'c_rent', 4500), tx('r7', '2026-08-20', 'c_rent', 4500)],
      categories: allCats, cashflowGroups: allGroups, filterPeriod: 'cycle:2026-08',
    });
    expect(a.forecastingDetails!.estimatedIncome).toBe(25000);
    expect(a.forecastingDetails!.pendingFixed).toBe(4500);
  });

  const normalAugust = Array.from({ length: 25 }, (_, i) => tx(`a${i}`, `2026-08-${String(i + 1).padStart(2, '0')}`, 'c_movie', 100));
  const septemberWithBigBuy = [100, 5000, 100, 100, 100].map((amt, i) => tx(`d${i}`, `2026-09-0${i + 1}`, 'c_movie', amt));

  it('a big day counts as spent, but early in the month only the usual part of it carries on', () => {
    const f = forecast([income, ...normalAugust, ...septemberWithBigBuy]);
    const pace = 100 * (25 / 30) + 1080 * (5 / 30); // capped pace fading into the real one as the month passes
    expect(f.variableUpToToday).toBe(5400);
    expect(f.actualDailyVariableAvg).toBeCloseTo(pace);
    expect(f.oneOffExcluded).toBeCloseTo(5400 - pace * 5);
    expect(f.projectedExpense).toBeCloseTo(5400 + pace * 25);
  });

  it('on the last day the real pace is the whole story', () => {
    const f = forecast([income, ...normalAugust, ...septemberWithBigBuy], 30);
    expect(f.actualDailyVariableAvg).toBeCloseTo(5400 / 30);
    expect(f.oneOffExcluded).toBeCloseTo(0);
  });

  it('rent days do not raise the limit of a usual day', () => {
    const rentDays = Array.from({ length: 5 }, (_, i) => tx(`r${i}`, `2026-08-${26 + i}`, 'c_rent', 9000));
    const f = forecast([income, ...normalAugust, ...rentDays, ...septemberWithBigBuy]);
    expect(f.actualDailyVariableAvg).toBeCloseTo(100 * (25 / 30) + 1080 * (5 / 30));
  });

  it('with too little history every day counts in full', () => {
    const f = forecast([income, ...normalAugust.slice(0, 19), ...septemberWithBigBuy]);
    expect(f.actualDailyVariableAvg).toBe(1080);
    expect(f.oneOffExcluded).toBe(0);
    expect(f.projectedExpense).toBe(5400 + 1080 * 25);
  });

  it('reports the spending that still reaches the 20% leftover target', () => {
    const f = forecast([income, tx('m', '2026-09-05', 'c_movie', 8200)], 10);
    expect(f.projectedExpense).toBe(24600);
    expect(f.targetExpense).toBe(24000); // 80% of income
    expect(f.targetShortfall).toBe(600);
    expect(f.safeToSpendForTarget).toBe(790); // (24000 - 8200) / 20
    expect(f.safeToSpend).toBe(1090); // (30000 - 8200) / 20
  });

  it('once the target is out of reach the daily amount for it is zero, not negative', () => {
    const f = forecast([income, tx('m', '2026-09-05', 'c_movie', 25000)], 10);
    expect(f.safeToSpendForTarget).toBe(0);
  });

  it('on or under the target nothing is short', () => {
    expect(forecast([income, tx('m', '2026-09-05', 'c_movie', 8000)], 10).targetShortfall).toBe(0);
    expect(forecast([income, tx('m', '2026-09-05', 'c_movie', 7000)], 10).targetShortfall).toBe(0);
  });

  describe('range from the months before', () => {
    const today = tx('m', '2026-09-03', 'c_movie', 500); // pace 100/day, 25 days left
    const august = tx('a', '2026-08-20', 'c_movie', 1300); // 26 days after day 5: 50/day
    const july = tx('j', '2026-07-20', 'c_movie', 7800); // 26 days after day 5: 300/day
    const june = tx('n', '2026-06-20', 'c_movie', 5000); // 25 days after day 5: 200/day

    it('spans the lowest and highest rest-of-month pace, on top of what is committed', () => {
      const f = forecast([income, today, august, july, june, tx('r', '2026-09-30', 'c_rent', 1000)]);
      expect(f.projectedRange).toEqual({ low: 1000 + 500 + 50 * 25, high: 1000 + 500 + 300 * 25 });
    });

    it('a monthly bill not logged yet is inside both ends', () => {
      const bills = [tx('r7', '2026-07-31', 'c_rent', 4000), tx('r8', '2026-08-31', 'c_rent', 4000)];
      const f = forecast([income, today, august, july, ...bills]);
      expect(f.projectedRange).toEqual({ low: 4000 + 500 + 50 * 25, high: 4000 + 500 + 300 * 25 });
    });

    it('only the days after today count from those months', () => {
      const f = forecast([income, today, august, july, tx('early', '2026-08-02', 'c_movie', 99999)]);
      expect(f.projectedRange).toEqual({ low: 500 + 50 * 25, high: 500 + 300 * 25 });
    });

    it('rent and subscriptions in those months are not daily pace', () => {
      const f = forecast([income, today, august, july, tx('r', '2026-08-31', 'c_rent', 99999), tx('s', '2026-08-30', 'c_soft', 99999)]);
      expect(f.projectedRange!.high).toBe(500 + 300 * 25);
    });

    it('always contains the forecast: today can be the lowest or the highest', () => {
      const quiet = tx('q', '2026-08-20', 'c_movie', 260); // 10/day
      const quieter = tx('w', '2026-07-20', 'c_movie', 520); // 20/day
      const high = forecast([income, today, quiet, quieter]);
      expect(high.projectedRange).toEqual({ low: 500 + 10 * 25, high: high.projectedExpense });
      const low = forecast([income, tx('m', '2026-09-03', 'c_movie', 50), august, july]);
      expect(low.projectedRange!.low).toBe(low.projectedExpense);
    });

    it('a month that stopped early counts as a quiet rest of month', () => {
      const f = forecast([income, today, tx('a', '2026-08-02', 'c_movie', 100), july]);
      expect(f.projectedRange!.low).toBe(500);
    });

    it('needs two months of spending to say anything', () => {
      expect(forecast([income, today, august]).projectedRange).toBeNull();
      expect(forecast([income, today, august, tx('r', '2026-07-31', 'c_rent', 4000)]).projectedRange).toBeNull(); // a rent-only month is no pace
    });

    it('nothing left to project on the last day', () => {
      expect(forecast([income, today, august, july], 30).projectedRange).toBeNull();
    });

    it('pay-cycle view compares cycle days', () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 7, 29, 12)); // day 5 of the 25 Aug – 24 Sep cycle, 26 days left
      const a = run({
        transactions: [
          tx('t', '2026-08-26', 'c_movie', 500),
          tx('p', '2026-08-10', 'c_movie', 2600), // cycle 25 Jul – 24 Aug: 26 days after day 5, 100/day
          tx('q', '2026-07-10', 'c_movie', 5200), // cycle 25 Jun – 24 Jul: 25 days after day 5, 208/day
        ],
        categories: allCats, cashflowGroups: allGroups, filterPeriod: 'cycle:2026-08',
      });
      expect(a.forecastingDetails!.projectedRange).toEqual({ low: 500 + 100 * 26, high: 500 + 208 * 26 });
    });
  });

  it('a monthly row outside rent and subscriptions stays in the daily pace, it is never "expected"', () => {
    const f = forecast([income, tx('g7', '2026-07-10', 'c_movie', 900, { description: 'ตั๋วรายเดือน' }), tx('g8', '2026-08-10', 'c_movie', 900, { description: 'ตั๋วรายเดือน' })]);
    expect(f.pendingFixed).toBe(0);
    expect(f.pendingFixedItems).toEqual([]);
  });

  it('a usual day is set by the 90th percentile of the spending days before', () => {
    const history = Array.from({ length: 25 }, (_, i) => tx(`h${i}`, `2026-08-${String(i + 1).padStart(2, '0')}`, 'c_movie', i < 19 ? 100 : 300));
    const f = forecast([income, ...history, ...septemberWithBigBuy]); // 22nd of the 25 sorted days = 300, so 4700 of the big day is excess
    expect(f.actualDailyVariableAvg).toBeCloseTo(1080 - (4700 / 5) * (25 / 30));
  });

  it('a big subscription day is fixed already: it is not a big living day too', () => {
    const f = forecast([income, ...normalAugust, ...[100, 100, 100, 100, 100].map((amt, i) => tx(`d${i}`, `2026-09-0${i + 1}`, 'c_movie', amt)), tx('s', '2026-09-02', 'c_soft', 5000)]);
    expect(f.actualDailyVariableAvg).toBe(100);
    expect(f.oneOffExcluded).toBe(0);
  });

  it('a daily-spend row dated ahead has not been spent yet', () => {
    const f = forecast([income, tx('m', '2026-09-03', 'c_movie', 500), tx('later', '2026-09-20', 'c_movie', 900)]);
    expect(f.variableUpToToday).toBe(500);
  });
});

describe('ghost pacer from the real aggregation', () => {
  const at = (y: number, m: number, d: number, rows: any[]) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(y, m - 1, d, 12));
    return month(rows);
  };

  it('a finished month compares its real total: no ฿0 forecast and no fake win', () => {
    const a = at(2026, 11, 10, [tx('c', '2026-09-05', 'c_movie', 3000), tx('p', '2026-08-05', 'c_movie', 2000)]);
    expect(a.ghostPacerDetails!.isCurrentMonth).toBe(false);
    expect(a.ghostPacerDetails!.projectedExpense).toBe(3000);
    expect(a.ghostPacerDetails!.deltaEom).toBe(1000);
    expect(a.ghostPacerDetailsNoRent!.projectedExpense).toBe(3000);
  });

  it('the current month keeps the forecast', () => {
    const a = at(2026, 9, 15, [tx('c', '2026-09-05', 'c_movie', 3000)]);
    expect(a.ghostPacerDetails!.isCurrentMonth).toBe(true);
    expect(a.ghostPacerDetails!.projectedExpense).toBe(a.forecastingDetails!.projectedExpense);
  });

  it('rent paid three days later does not read as spending less once rent is left out', () => {
    const a = at(2026, 9, 5, [
      tx('c', '2026-09-02', 'c_movie', 1000), tx('p', '2026-08-02', 'c_movie', 1000),
      tx('r8', '2026-08-03', 'c_rent', 4500), tx('r9', '2026-09-06', 'c_rent', 4500),
    ]);
    expect(a.ghostPacerDetails!.ghostSpendToDate).toBe(5500);
    expect(a.ghostPacerDetails!.paceStatus.code).toBe('LEAD');
    const noRent = a.ghostPacerDetailsNoRent!;
    expect(noRent.ghostSpendToDate).toBe(1000);
    expect(noRent.currentSpendToDate).toBe(1000);
    expect(noRent.paceStatus.code).toBe('TIED');
    expect(noRent.ghostTotalExpense).toBe(1000);
    expect(a.ghostPacerDetails!.projectedExpense).toBe(10500); // 4500 + 1000 + 200/day * 25
    expect(noRent.projectedExpense).toBe(6000);
  });

  it('a rent bill still expected leaves the no-rent forecast too; a missing subscription does not', () => {
    const a = at(2026, 9, 5, [
      tx('c', '2026-09-02', 'c_movie', 1000),
      tx('r7', '2026-07-03', 'c_rent', 4500), tx('r8', '2026-08-03', 'c_rent', 4500),
      tx('s7', '2026-07-03', 'c_soft', 700), tx('s8', '2026-08-03', 'c_soft', 700),
    ]);
    expect(a.ghostPacerDetails!.projectedExpense).toBe(4500 + 700 + 1000 + 200 * 25);
    expect(a.ghostPacerDetailsNoRent!.projectedExpense).toBe(700 + 1000 + 200 * 25);
  });

  it('rent as the only spending still has something to compare', () => {
    const a = at(2026, 9, 5, [tx('r8', '2026-08-03', 'c_rent', 4500)]);
    expect(a.ghostPacerDetails!.hasData).toBe(true);
    expect(a.ghostPacerDetailsNoRent!.hasData).toBe(true);
  });

  describe('daily amount that still ends under last month', () => {
    const movie = (id: string, date: string, amt: number) => tx(id, date, 'c_movie', amt);

    it('counts rent entered ahead as already committed, in each comparison on its own terms', () => {
      const a = at(2026, 9, 5, [movie('c', '2026-09-02', 1000), movie('p', '2026-08-02', 2000), tx('r8', '2026-08-03', 'c_rent', 5000), tx('r9', '2026-09-30', 'c_rent', 4500)]);
      expect(a.ghostPacerDetails!.beatGhostDaily).toBe(60); // (7000 - 4500 - 1000) / 25
      expect(a.ghostPacerDetailsNoRent!.beatGhostDaily).toBe(40); // (2000 - 1000) / 25
      expect(a.ghostPacerDetails!.dailyPace).toBe(200);
      expect(a.ghostPacerDetailsNoRent!.dailyPace).toBe(200);
    });

    it('counts a monthly bill not logged yet as committed too', () => {
      const a = at(2026, 9, 5, [movie('c', '2026-09-02', 1000), movie('p', '2026-08-02', 2000), tx('r7', '2026-07-03', 'c_rent', 4500), tx('r8', '2026-08-03', 'c_rent', 4500)]);
      expect(a.ghostPacerDetails!.beatGhostDaily).toBe(40); // (6500 - 4500 - 1000) / 25
      expect(a.ghostPacerDetailsNoRent!.beatGhostDaily).toBe(40); // (2000 - 1000) / 25: the expected rent is not its concern
    });

    it('counts a subscription as committed in both comparisons', () => {
      const a = at(2026, 9, 5, [movie('c', '2026-09-02', 1000), movie('p', '2026-08-02', 2000), tx('s', '2026-09-20', 'c_soft', 500)]);
      expect(a.ghostPacerDetailsNoRent!.beatGhostDaily).toBe(20); // (2000 - 500 - 1000) / 25
    });

    it('agrees with the forecast: under the allowance is exactly when the month ends lower', () => {
      const g = at(2026, 9, 5, [movie('c', '2026-09-02', 1000), movie('p', '2026-08-02', 2000)]).ghostPacerDetails!;
      expect(g.dailyPace > g.beatGhostDaily!).toBe(g.deltaEom > 0);
      expect(g.projectedExpense).toBe(6000);
    });

    it('already past last month: zero, never negative', () => {
      const g = at(2026, 9, 5, [movie('c', '2026-09-02', 3000), movie('p', '2026-08-02', 1000)]).ghostPacerDetails!;
      expect(g.beatGhostDaily).toBe(0);
    });

    it('nothing to say on the last day, in a finished month, or without a last month', () => {
      const rows = [movie('c', '2026-09-02', 1000), movie('p', '2026-08-02', 2000)];
      expect(at(2026, 9, 30, rows).ghostPacerDetails!.beatGhostDaily).toBeNull();
      expect(at(2026, 11, 10, rows).ghostPacerDetails!.beatGhostDaily).toBeNull();
      expect(at(2026, 9, 5, [movie('c', '2026-09-02', 1000)]).ghostPacerDetails!.beatGhostDaily).toBeNull();
    });
  });

  describe('which categories make the gap', () => {
    const gapRows = [
      tx('c1', '2026-09-02', 'c_food', 1000), tx('p1', '2026-08-02', 'c_food', 400),
      tx('c2', '2026-09-03', 'c_movie', 300), tx('p2', '2026-08-03', 'c_movie', 1000),
      tx('c3', '2026-09-01', 'c_game', 300), tx('p3', '2026-08-01', 'c_game', 100),
      tx('c4', '2026-09-01', 'c_bar', 20),
      tx('c5', '2026-09-01', 'c_book', 10),
    ];

    it('names the biggest changes first, in either direction, up to the same day of last month', () => {
      const later = [tx('c9', '2026-09-20', 'c_toy', 9000), tx('p9', '2026-08-20', 'c_toy', 7000)];
      const g = at(2026, 9, 5, [...gapRows, ...later]).ghostPacerDetails!;
      expect(g.gapDrivers).toEqual([
        { id: 'c_movie', name: 'หนัง', icon: 'film', color: undefined, current: 300, previous: 1000, delta: -700 },
        { id: 'c_food', name: 'ข้าว', icon: 'utensils', color: undefined, current: 1000, previous: 400, delta: 600 },
        expect.objectContaining({ id: 'c_game', delta: 200 }),
      ]);
    });

    it('the rest is summed, so the lines add up to the headline gap', () => {
      const g = at(2026, 9, 5, gapRows).ghostPacerDetails!;
      expect(g.gapOthers).toBe(30);
      expect(g.gapDrivers.reduce((s, d) => s + d.delta, g.gapOthers)).toBe(g.deltaVsGhost);
    });

    it('rent is a driver only in the with-rent comparison', () => {
      const rows = [...gapRows, tx('r9', '2026-09-04', 'c_rent', 5000)];
      const a = at(2026, 9, 5, rows);
      expect(a.ghostPacerDetails!.gapDrivers[0]).toMatchObject({ id: 'c_rent', delta: 5000 });
      expect(a.ghostPacerDetailsNoRent!.gapDrivers.map(d => d.id)).toEqual(['c_movie', 'c_food', 'c_game']);
      expect(a.ghostPacerDetailsNoRent!.gapOthers).toBe(30);
    });

    it('a category that no longer exists still has a label', () => {
      const g = at(2026, 9, 5, [tx('c', '2026-09-02', 'gone', 500), tx('p', '2026-08-02', 'c_food', 100)]).ghostPacerDetails!;
      expect(g.gapDrivers[0]).toMatchObject({ id: 'gone', name: 'ไม่ระบุหมวด', delta: 500 });
    });
  });

  it('other periods have no comparison in either variant', () => {
    const a = at(2026, 9, 5, [tx('r8', '2026-08-03', 'c_rent', 4500)]);
    const year = run({ transactions: [tx('r8', '2026-08-03', 'c_rent', 4500)], categories: cats, cashflowGroups: groups, filterPeriod: '2026' });
    expect(a.ghostPacerDetailsNoRent).toBeDefined();
    expect(year.ghostPacerDetailsNoRent!.hasData).toBe(false);
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
