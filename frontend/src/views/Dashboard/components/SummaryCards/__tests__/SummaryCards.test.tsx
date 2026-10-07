// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import SummaryCards from '..';
import { SummaryForecasting } from '../Forecasting/SummaryForecasting';
import { SummaryGhostPacer } from '../GhostPacer/SummaryGhostPacer';
import { click, key, q, byText } from '@/test-utils/dom';
import type { SummaryAnalytics, ForecastingDetails, GhostPacerDetails } from '../types';

// Real cards, real thresholds. Only the dashboard context and the two Chart.js canvases (jsdom has no canvas) are replaced.
const h = vi.hoisted(() => ({ analytics: null as unknown, skeleton: false }));
vi.mock('@/views/Dashboard/context/DashboardContext', () => ({
  useDashboardContext: () => ({ analytics: h.analytics, showSkeleton: h.skeleton }),
}));
vi.mock('@/views/Dashboard/components/SummaryCards/Forecasting/ForecastingTrajectoryChart', () => ({ ForecastingTrajectoryChart: () => null }));
vi.mock('@/views/Dashboard/components/SummaryCards/GhostPacer/GhostPacerChart', () => ({ GhostPacerChart: () => null }));

const days = (n: number) => Array.from({ length: n }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);

/** A healthy month: nothing breaches a rule. 30 days, income 30,000, expense 20,000. */
const healthy: SummaryAnalytics = {
  totalIncome: 30_000, totalExpense: 20_000, netCashflow: 10_000, savingsRate: 33, totalSavings: 3_000,
  datesInPeriod: days(30), prevTotals: { income: 0, expense: 0, txCount: 0 }, periodLabel: 'MoM',
  dailyAvg: 666.67, foodPercentage: 20, foodTotal: 4_000, foodDailyAvg: 133.33, foodPctOfIncome: 13.3, foodWorkdayAvg: 150, foodHolidayAvg: 100,
  dailyWorkdayAvg: 700, dailyHolidayAvg: 600, maxFoodDayAmount: 450, variableTotal: 6_000, fixedTotal: 14_000, topWantCategories: [],
  rentPercentage: 20, rentTotal: 6_000, rentSub: { rent: 5_000, electricity: 600, internet: 400, water: 0 },
  subscriptionTotal: 900, subscriptionPctOfIncome: 3, subscriptionPercentage: 4.5, subscriptionCount: 3, subscriptionSub: {},
  topSubscriptionServices: [{ name: 'Netflix', amount: 419 }, { name: 'Spotify', amount: 481 }],
  projectedExpense: 20_000, safeToSpend: 500, projectedSurplus: 10_000,
};
const withData = (over: Partial<SummaryAnalytics> = {}): SummaryAnalytics => ({ ...healthy, ...over });

let root: Root | null = null;
let container: HTMLElement | null = null;
const mountNode = (node: React.ReactElement) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(node));
};
const show = (over: Partial<SummaryAnalytics> = {}, skeleton = false) => {
  h.analytics = withData(over);
  h.skeleton = skeleton;
  mountNode(<SummaryCards />);
};
const text = () => document.body.textContent ?? '';
const card = (label: string) => q(`[aria-label^="${label}"]`)!;
const overBadges = () => [...document.querySelectorAll('span')].filter(s => s.textContent === 'เกินเกณฑ์').length;
const pill = (startsWith: string) => [...document.querySelectorAll<HTMLElement>('div[title]')].find(d => d.textContent?.startsWith(startsWith));

beforeEach(() => { h.analytics = null; h.skeleton = false; });
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

describe('SummaryCards — wiring', () => {
  it('renders nothing without analytics', () => {
    mountNode(<SummaryCards />);
    expect(container!.innerHTML).toBe('');
  });
});

describe('SummaryVitals — income, expense, net cashflow', () => {
  it('shows the three totals with per-day averages over the days in the period', () => {
    show();
    const t = text();
    expect(t).toContain('30,000.00'); // รายรับรวม
    expect(t).toContain('20,000.00'); // รายจ่ายรวม
    expect(t).toContain('10,000.00'); // กระแสเงินสดสุทธิ
    expect(t).toContain('เฉลี่ย ฿1,000.00 / วัน'); // 30,000 / 30
    expect(t).toContain('เฉลี่ย ฿666.67 / วัน'); // 20,000 / 30
  });

  it('"ใช้ไป X%" is neutral while spending is within income and turns danger once it passes 100%', () => {
    show();
    expect(pill('ใช้ไป 67%')!.className).not.toContain('text-danger');
    act(() => root!.unmount()); container!.remove();

    show({ totalIncome: 10_000, totalExpense: 12_000, netCashflow: -2_000, savingsRate: -20 });
    expect(pill('ใช้ไป 120%')!.className).toContain('text-danger');
  });

  it('with no income at all the share reads 0%, not Infinity / NaN', () => {
    show({ totalIncome: 0, totalExpense: 500, netCashflow: -500, savingsRate: 0 });
    expect(text()).toContain('ใช้ไป 0%');
    expect(text()).not.toMatch(/NaN|Infinity/);
  });

  it('a healthy surplus is green and says "เหลือ"', () => {
    show();
    expect(pill('เหลือ 33%')!.className).toContain('text-emerald-400');
    expect(pill('เหลือ 33%')!.textContent).not.toContain('ต่ำกว่าเกณฑ์');
    expect(byText('span', 'เหลือ')).not.toBeNull();
  });

  it('a surplus under the 10% rule is amber and says it is below the rule — still not a deficit', () => {
    show({ netCashflow: 1_500, savingsRate: 5 });
    const p = pill('เหลือ 5%')!;
    expect(p.className).toContain('text-amber-400');
    expect(p.textContent).toContain('ต่ำกว่าเกณฑ์');
    expect(byText('span', 'เหลือ')).not.toBeNull();
    expect(byText('span', 'ขาดดุล')).toBeNull();
  });

  it('a deficit is danger, says "ขาดดุล" and drops the surplus wording', () => {
    show({ totalExpense: 33_000, netCashflow: -3_000, savingsRate: -10 });
    expect(pill('เหลือ -10%')!.className).toContain('text-danger');
    expect(byText('span', 'ขาดดุล')).not.toBeNull();
    expect(pill('เหลือ -10%')!.textContent).not.toContain('ต่ำกว่าเกณฑ์');
  });

  it('carries no grade of its own (the strategic panel owns the single grade)', () => {
    show();
    const vitals = document.querySelector('h2')!.closest('.flex-col')!;
    expect(vitals.textContent).not.toMatch(/เกรด/);
  });

  it('says "ช่วงแรก" when there is no earlier period to compare with', () => {
    show();
    expect([...document.querySelectorAll('div[title]')].filter(d => d.textContent === 'ช่วงแรก')).toHaveLength(3);
  });

  it('compares with the previous month when there is prior data: income up, expense down, both good', () => {
    show({ prevTotals: { income: 20_000, expense: 25_000, txCount: 12 } });
    const income = pill('↑ 50.0%')!;
    const expense = pill('↓ 20.0%')!;
    expect(income.textContent).toBe('↑ 50.0% เทียบเดือนก่อน');
    expect(income.className).toContain('text-emerald-400');
    expect(expense.textContent).toBe('↓ 20.0% เทียบเดือนก่อน');
    expect(expense.className).toContain('text-emerald-400'); // less spending is the good direction
    expect(income.title).toContain('ช่วงก่อนหน้า: ฿20,000.00');
  });

  it('spending more than before is the bad direction (danger)', () => {
    show({ prevTotals: { income: 30_000, expense: 10_000, txCount: 5 } });
    const expense = pill('↑ 100.0%')!;
    expect(expense.className).toContain('text-danger');
  });

  it('"ทั้งหมด" for an all-time view, which has nothing to compare with', () => {
    show({ periodLabel: 'ALL', prevTotals: { income: 1, expense: 1, txCount: 3 } });
    expect([...document.querySelectorAll('div[title]')].filter(d => d.textContent === 'ทั้งหมด')).toHaveLength(3);
  });

  it('skeleton: no numbers, no pills, shimmer instead', () => {
    show({}, true);
    expect(text()).not.toContain('30,000.00');
    expect(text()).not.toContain('ใช้ไป');
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(3);
  });
});

describe('SummaryStrategic — the single grade', () => {
  it('A when every rule holds, with the all-clear tooltip', () => {
    show();
    const grade = byText('span[title]', 'เกรด A · ดีเยี่ยม')!;
    expect(grade).not.toBeNull();
    expect(grade.title).toBe('ทุกด้านอยู่ในเกณฑ์');
    expect(text()).not.toContain('เกินเกณฑ์ [');
  });

  it('lists the breached rules by name and costs one grade step each', () => {
    show({ rentPercentage: 40, subscriptionPctOfIncome: 6 }); // rent > 30%, subscriptions > 5%
    expect(text()).toContain('เกินเกณฑ์ [ ที่พัก · บริการรายเดือน ]');
    const grade = byText('span[title]', 'เกรด C · พอใช้')!;
    expect(grade).not.toBeNull();
    expect(grade.title).toBe('เกินเกณฑ์ 2 ด้าน');
  });

  it('a deficit alone costs two steps (C) and is named in the list; one more breach makes it D', () => {
    show({ totalExpense: 33_000, netCashflow: -3_000, savingsRate: -10 });
    expect(byText('span[title]', 'เกรด C · พอใช้')).not.toBeNull();
    expect(text()).toContain('ขาดดุล ]');
    act(() => root!.unmount()); container!.remove();

    show({ totalExpense: 33_000, netCashflow: -3_000, savingsRate: -10, rentPercentage: 40 });
    expect(byText('span[title]', 'เกรด D · ต้องปรับ')).not.toBeNull();
    expect(text()).toContain('เกินเกณฑ์ [ ที่พัก · ขาดดุล ]');
  });

  it('the lifestyle share is variable spending over income, not over expense', () => {
    show({ variableTotal: 9_500 }); // 31.7% of 30,000 — over the 30% rule
    expect(text()).toContain('เกินเกณฑ์ [ WANT ]');
    expect(card('รายจ่ายตามใจ').textContent).toContain('31.7%');
  });

  it('no grade while loading', () => {
    show({}, true);
    expect(text()).not.toMatch(/เกรด [ABCD]/);
  });
});

describe('SummaryStrategic — rule cards', () => {
  it('rent: shows the share and the limit; "เกินเกณฑ์" only past 30%', () => {
    show();
    expect(card('ภาระที่พักอาศัย').textContent).toContain('20.0%');
    expect(card('ภาระที่พักอาศัย').textContent).toContain('< 30% ของรายรับ');
    expect(overBadges()).toBe(0);
    act(() => root!.unmount()); container!.remove();

    show({ rentPercentage: 40 });
    expect(card('ภาระที่พักอาศัย').textContent).toContain('40.0%');
    expect(card('ภาระที่พักอาศัย').className).toContain('border-l-danger');
    expect(overBadges()).toBe(1);
  });

  it('rent: exactly at the limit is not over, and costs nothing in the grade', () => {
    show({ rentPercentage: 30 });
    expect(overBadges()).toBe(0);
    expect(byText('span[title]', 'เกรด A · ดีเยี่ยม')).not.toBeNull();
  });

  it('rent: the detail overlay lists the four items, or says there is no data', () => {
    show();
    expect(card('ภาระที่พักอาศัย').textContent).toContain('฿5,000.00');
    act(() => root!.unmount()); container!.remove();
    show({ rentSub: { rent: 0, electricity: 0, internet: 0, water: 0 } });
    expect(card('ภาระที่พักอาศัย').textContent).toContain('ไม่มีข้อมูลที่พักอาศัยในช่วงนี้');
  });

  it('subscriptions: against income (limit 5%) when there is income, against expense (limit 8%) when there is not', () => {
    show({ subscriptionPctOfIncome: 3 });
    expect(card('บริการรายเดือน').textContent).toContain('3.0%');
    expect(card('บริการรายเดือน').textContent).toContain('< 5% ของรายรับ');
    act(() => root!.unmount()); container!.remove();

    show({ totalIncome: 0, netCashflow: -20_000, savingsRate: 0, subscriptionPercentage: 9 });
    const c = card('บริการรายเดือน').textContent!;
    expect(c).toContain('9.0%');
    expect(c).toContain('< 8% ของรายจ่าย');
    expect(overBadges()).toBe(1);
  });

  it('subscriptions: calm → amber past 80% of the limit → flagged over the limit, each with its word', () => {
    const border = () => card('บริการรายเดือน').className;
    show({ subscriptionPctOfIncome: 3 });
    expect(border()).toContain('border-l-purple-500');
    expect(card('บริการรายเดือน').textContent).toContain('ปลอดภัย');
    expect(overBadges()).toBe(0);
    act(() => root!.unmount()); container!.remove();

    show({ subscriptionPctOfIncome: 4.5 }); // over 4% (80% of 5%) but not over 5%
    expect(border()).toContain('border-l-amber-500');
    expect(card('บริการรายเดือน').textContent).toContain('ปานกลาง');
    expect(overBadges()).toBe(0);
    act(() => root!.unmount()); container!.remove();

    show({ subscriptionPctOfIncome: 6 });
    expect(card('บริการรายเดือน').textContent).toContain('สูงไป');
    expect(overBadges()).toBe(1);
  });

  it('subscriptions: over the limit uses the danger colour like the rent / lifestyle / food cards (not the accent ink)', () => {
    show({ subscriptionPctOfIncome: 6 });
    const c = card('บริการรายเดือน');
    expect(c.className).toContain('border-l-danger');
    expect(c.querySelector('.text-danger')).not.toBeNull();
    expect(c.querySelector('.bg-danger')).not.toBeNull();
    expect(c.className).not.toContain('accent');
    expect(c.querySelector('.text-accent-ink, .bg-accent')).toBeNull();
  });

  it('subscriptions: each service shows its share of the subscription total', () => {
    show();
    const t = card('บริการรายเดือน').textContent!;
    expect(t).toContain('Netflix');
    expect(t).toContain('47%'); // 419 / 900
    expect(t).toContain('53%'); // 481 / 900
  });

  it('food: share of expense against the 25% rule, with the worded status', () => {
    show();
    expect(card('ค่าอาหาร & สัดส่วน').textContent).toContain('สมดุลดี');
    act(() => root!.unmount()); container!.remove();
    show({ foodPercentage: 22 }); // past 80% of 25%
    expect(card('ค่าอาหาร & สัดส่วน').textContent).toContain('ปานกลาง');
    act(() => root!.unmount()); container!.remove();
    show({ foodPercentage: 30 });
    expect(card('ค่าอาหาร & สัดส่วน').textContent).toContain('สัดส่วนสูง');
    expect(overBadges()).toBe(1);
  });

  it('food: daily average, work vs holiday and the peak day; empty overlay when nothing was spent on food', () => {
    show();
    const t = card('ค่าอาหาร & สัดส่วน').textContent!;
    expect(t).toContain('฿133.33');
    expect(t).toContain('ทำงาน ฿150.00');
    expect(t).toContain('หยุด ฿100.00');
    expect(t).toContain('฿450.00'); // peak
    act(() => root!.unmount()); container!.remove();
    show({ foodTotal: 0, foodDailyAvg: 0, foodPercentage: 0 });
    expect(card('ค่าอาหาร & สัดส่วน').textContent).toContain('ไม่มีข้อมูลค่าอาหารในช่วงนี้');
  });

  it('daily expense: the average per day with the whole-period total underneath', () => {
    show();
    const t = card('รายจ่ายเฉลี่ย/วัน').textContent!;
    expect(t).toContain('฿666.67');
    expect(t).toContain('฿20,000.00');
    expect(t).toContain('จำเป็น/วัน');
  });

  it('exactly one card flags itself when one rule breaks (a red card is always a counted breach)', () => {
    show({ foodPercentage: 40 });
    expect(overBadges()).toBe(1);
    expect(text()).toContain('เกินเกณฑ์ [ ค่าอาหาร ]');
  });

  it('skeleton: cards show shimmer and no threshold rows', () => {
    show({}, true);
    expect(text()).not.toContain('เกณฑ์แนะนำ');
    expect(overBadges()).toBe(0);
  });
});

describe('SummaryStrategic — average cash left per day', () => {
  it('positive: net over the days in the period, with the income / fixed / variable / savings breakdown', () => {
    show();
    expect(text()).toContain('฿333.33'); // 10,000 / 30
    expect(text()).toContain('เหลือสุทธิ/วัน · เฉลี่ยจาก 30 วัน');
    expect(text()).toContain('฿1,000.00'); // income per day
    expect(text()).toContain('฿100.00'); // savings per day: 3,000 / 30
  });

  it('negative: shows a minus sign and says "ติดลบสุทธิ/วัน"', () => {
    show({ netCashflow: -3_000 });
    expect(text()).toContain('-฿100.00');
    expect(text()).toContain('ติดลบสุทธิ/วัน');
  });

  it('a one-day period divides by 1, and an empty period list does not divide by 0', () => {
    show({ datesInPeriod: undefined });
    expect(text()).toContain('เฉลี่ยจาก 1 วัน');
    expect(text()).toContain('฿10,000.00');
  });
});

describe('SummaryStrategic — tabs', () => {
  const tab = (label: string) => byText('[role="tab"]', label)!;
  const panel = (id: string) => [...document.querySelectorAll<HTMLElement>('[role="tabpanel"]')].find(p => p.id.endsWith(`-panel-${id}`));

  it('starts on the overview; forecast and month-comparison are disabled with the reason when they cannot apply', () => {
    show();
    expect(tab('ภาพรวมการใช้จ่าย').getAttribute('aria-selected')).toBe('true');
    expect(tab('พยากรณ์สิ้นเดือน').getAttribute('aria-disabled')).toBe('true');
    expect(tab('เทียบเดือนที่แล้ว').getAttribute('aria-disabled')).toBe('true');
    expect(text()).toContain('ต้องเลือกเดือนปัจจุบันเท่านั้น');
    expect(text()).toContain('ต้องเลือกมุมมองรายเดือนเท่านั้น');
    expect(panel('forecast')).toBeUndefined(); // not mounted at all
  });

  it('clicking a disabled tab does nothing', () => {
    show();
    click(tab('พยากรณ์สิ้นเดือน'));
    expect(tab('ภาพรวมการใช้จ่าย').getAttribute('aria-selected')).toBe('true');
  });

  it('enabled tabs switch the visible panel and keep the others mounted (no layout shift)', () => {
    show({ showForecasting: true, isSingleMonthView: true, forecastingDetails: {} as ForecastingDetails, ghostPacerDetails: { hasData: false } as GhostPacerDetails });
    expect(panel('strategic')!.getAttribute('aria-hidden')).toBe('false');
    click(tab('พยากรณ์สิ้นเดือน'));
    expect(tab('พยากรณ์สิ้นเดือน').getAttribute('aria-selected')).toBe('true');
    expect(panel('forecast')!.getAttribute('aria-hidden')).toBe('false');
    expect(panel('strategic')!.getAttribute('aria-hidden')).toBe('true');
    click(tab('เทียบเดือนที่แล้ว'));
    expect(panel('ghost')!.getAttribute('aria-hidden')).toBe('false');
  });

  it('falls back to the overview when the active tab stops being available', () => {
    show({ showForecasting: true, forecastingDetails: {} as ForecastingDetails });
    click(tab('พยากรณ์สิ้นเดือน'));
    expect(tab('พยากรณ์สิ้นเดือน').getAttribute('aria-selected')).toBe('true');
    h.analytics = withData({ showForecasting: false });
    act(() => root!.render(<SummaryCards />));
    expect(tab('ภาพรวมการใช้จ่าย').getAttribute('aria-selected')).toBe('true');
  });

  it('arrow keys, Home and End move focus along the tabs (roving tabindex)', () => {
    show({ showForecasting: true, isSingleMonthView: true, forecastingDetails: {} as ForecastingDetails, ghostPacerDetails: { hasData: false } as GhostPacerDetails });
    const tabs = [...document.querySelectorAll<HTMLElement>('[role="tab"]')];
    expect(tabs.map(t => t.tabIndex)).toEqual([0, -1, -1]);
    act(() => tabs[0].focus());
    key(tabs[0], 'ArrowRight');
    expect(document.activeElement).toBe(tabs[1]);
    key(tabs[1], 'End');
    expect(document.activeElement).toBe(tabs[2]);
    key(tabs[2], 'ArrowRight'); // wraps
    expect(document.activeElement).toBe(tabs[0]);
    key(tabs[0], 'ArrowLeft');
    expect(document.activeElement).toBe(tabs[2]);
    key(tabs[2], 'Home');
    expect(document.activeElement).toBe(tabs[0]);
  });
});

describe('SummaryForecasting — end of month forecast', () => {
  const details: ForecastingDetails = {
    currentDay: 15, lastDayOfMonth: 30, remainingDays: 15, monthProgressPct: 50,
    fixedTotal: 14_000, variableUpToToday: 3_000, projectedVariableRemaining: 3_000, actualDailyVariableAvg: 200,
    projectedSurplusPct: 33, maxAllowedExpense: 21_000, requiredReduction: 0, requiredDailyReduction: 0, actualDailySeries: [],
    projectedSurplus: 10_000,
    paceStatus: { label: 'คุมงบได้ดี', color: '#10B981', bg: 'bg-emerald-950/30' },
    eomStatus: { label: 'โซนปลอดภัยสูง', color: '#10B981', bg: 'bg-emerald-950/40', border: 'border-emerald-500' },
  } as ForecastingDetails & { projectedSurplus: number };
  const forecast = (over: Partial<SummaryAnalytics> = {}, d: Partial<ForecastingDetails> = {}, skeleton = false) =>
    mountNode(<SummaryForecasting analytics={withData({ showForecasting: true, forecastingDetails: { ...details, ...d }, ...over })} showSkeleton={skeleton} />);

  it('renders nothing when forecasting does not apply to the period', () => {
    mountNode(<SummaryForecasting analytics={withData({ showForecasting: false })} />);
    expect(container!.innerHTML).toBe('');
  });

  it('on track: projected spend, the daily ceiling with headroom, and a surplus that needs no cuts', () => {
    forecast();
    const t = text();
    expect(t).toContain('คุมงบได้ดี');
    expect(t).toContain('15/30');
    expect(t).toContain('เหลือ 15 วัน');
    expect(t).toContain('เพดาน ฿21,000.00');
    expect(t).toContain('ใช้จริง ฿200.00/ว');
    expect(t).toContain('+฿300.00/วัน'); // 500 allowed − 200 actual
    expect(t).toContain('อัตราใช้จริง: 40% ของเพดาน');
    expect(t).toContain('ภาระคงที่ 70%'); // 14,000 of the 20,000 projected
    expect(t).toContain('จ่ายแล้ว 15%');
    expect(t).toContain('+฿10,000.00');
    expect(t).toContain('คุมงบได้ตามเป้า');
    expect(t).not.toContain('ต้องลดอีก');
  });

  it('over the ceiling: says how much to cut per day and in total, and the surplus turns negative', () => {
    forecast({ safeToSpend: 100, projectedExpense: 31_500, projectedSurplus: -1_500 }, { actualDailyVariableAvg: 200, requiredDailyReduction: 100, requiredReduction: 1_500, projectedSurplusPct: -5 });
    const t = text();
    expect(t).toContain('-฿100.00/วัน');
    expect(t).toContain('อัตราใช้จริง: 200% ของเพดาน');
    expect(t).toContain('ต้องลดอีก ฿1,500.00');
    expect(t).toContain('-฿1,500.00');
    expect(t).toContain('เฝ้าระวัง');
  });

  it('skeleton hides the headline numbers', () => {
    forecast({}, {}, true);
    expect(text()).not.toContain('+฿10,000.00');
    expect(document.querySelectorAll('.animate-pulse').length).toBe(3);
  });
});

describe('SummaryGhostPacer — against last month', () => {
  const ghost: GhostPacerDetails = {
    hasData: true, currentPeriod: 'ก.ย.', prevPeriod: 'ส.ค.', currentDay: 15, lastDayOfMonth: 30,
    currentDailySeries: [], prevDailySeries: [], benchmarkDailySeries: [],
    currentSpendToDate: 8_000, ghostSpendToDate: 10_000, benchmarkSpendToDate: 9_000,
    deltaVsGhost: -2_000, deltaVsGhostPct: -20, deltaVsBenchmark: -1_000, deltaVsBenchmarkPct: -11.1,
    projectedExpense: 18_000, ghostTotalExpense: 21_000, deltaEom: -3_000,
    paceStatus: { code: 'LEAD', label: 'นำ', color: '#10B981', bg: 'bg-income/10', border: 'border-income' },
  };
  const pacer = (d: Partial<GhostPacerDetails> | null, skeleton = false) =>
    mountNode(<SummaryGhostPacer analytics={withData({ ghostPacerDetails: d === null ? undefined : { ...ghost, ...d } })} showSkeleton={skeleton} />);

  it('explains itself when there is no month to compare with', () => {
    pacer(null);
    expect(text()).toContain('การเทียบกับเดือนก่อนใช้ได้ในมุมมองรายเดือน');
    pacer({ hasData: false });
  });

  it('spending less than last month at the same day: green wording, minus sign, savings at the end of month', () => {
    pacer({});
    const t = text();
    expect(t).toContain('▼ ช้ากว่า ฿2,000 (20.0%)');
    expect(t).toContain('ใช้น้อยกว่า');
    expect(t).toContain('ควบคุมงบได้นิ่งกว่า');
    expect(t).toContain('ประหยัดกว่าเดือนก่อน');
    expect(t).toContain('ต่ำกว่าเกณฑ์เฉลี่ย');
    expect(t).toContain('฿18,000.00');
    expect(t).toContain('฿21,000.00'); // last month's final total
    expect(q('.text-income')).not.toBeNull();
  });

  it('spending more by more than 5%: red wording and a plus sign', () => {
    pacer({ deltaVsGhost: 1_500, deltaVsGhostPct: 15, deltaVsBenchmark: 1_000, deltaVsBenchmarkPct: 11.1, deltaEom: 2_000 });
    const t = text();
    expect(t).toContain('▲ เร็วกว่า ฿1,500 (15.0%)');
    expect(t).toContain('ใช้มากกว่า');
    expect(t).toContain('ใช้เร็วกว่าเดือนก่อน');
    expect(t).toContain('ยอดจบสูงกว่าเดือนก่อน');
    expect(q('.text-danger')).not.toBeNull();
  });

  it('within 5% either way counts as close, not a win or a loss (warn colour)', () => {
    pacer({ deltaVsGhost: -300, deltaVsGhostPct: -3 }); // 300 of 10,000 = 3%
    expect(text()).toContain('ใกล้เคียง');
    expect(text()).toContain('ใกล้เคียงเดือนก่อน');
    expect(q('.text-warn')).not.toBeNull();
  });

  it('skeleton hides the headline numbers', () => {
    pacer({}, true);
    expect(document.querySelectorAll('.animate-pulse').length).toBe(3);
  });
});
