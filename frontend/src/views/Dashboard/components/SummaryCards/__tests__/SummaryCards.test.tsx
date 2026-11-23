// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import SummaryCards from '..';
import { SummaryForecasting } from '../Forecasting/SummaryForecasting';
import { click, key, q, byText } from '@/test-utils/dom';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import type { SummaryAnalytics, ForecastingDetails } from '../types';

// Real cards, real thresholds. Only the dashboard context and the two Chart.js canvases (jsdom has no canvas) are replaced.
const h = vi.hoisted(() => ({ analytics: null as unknown, skeleton: false, forecastChart: null as null | Record<string, unknown> }));
vi.mock('@/views/Dashboard/context/DashboardContext', () => ({
  useDashboardContext: () => ({ analytics: h.analytics, showSkeleton: h.skeleton }),
}));
vi.mock('@/views/Dashboard/components/SummaryCards/Forecasting/ForecastingTrajectoryChart', () => ({
  ForecastingTrajectoryChart: (props: Record<string, unknown>) => { h.forecastChart = props; return null; },
}));

const days = (n: number) => Array.from({ length: n }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);

/** A healthy month: nothing breaches a rule. 30 days, income 30,000, expense 20,000 (NEED 14,000 + WANT 6,000). */
const healthy: SummaryAnalytics = {
  totalIncome: 30_000, totalExpense: 20_000, netCashflow: 10_000, savingsRate: 33.3, totalSavings: 3_000,
  datesInPeriod: days(30), prevTotals: { income: 0, expense: 0, txCount: 0 }, periodLabel: 'MoM',
  dailyAvg: 666.67, livingDailyAvg: 466.67, foodPercentage: 15, foodTotal: 3_000, foodDailyAvg: 100, foodPctOfIncome: 10, foodWorkdayAvg: 150, foodHolidayAvg: 100,
  dailyWorkdayAvg: 700, dailyHolidayAvg: 600, maxFoodDayAmount: 450, wantTotal: 6_000, needTotal: 14_000, topWantCategories: [],
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
const remount = (over: Partial<SummaryAnalytics> = {}) => {
  act(() => root!.unmount()); container!.remove();
  show(over);
};
const text = () => document.body.textContent ?? '';
const card = (label: string) => q(`section[aria-label="${label}"]`)!;
const edge = (label: string) => card(label).querySelector<HTMLElement>('[data-edge]')!.className;
/** The hover / focus detail layer of a card (always in the DOM, hidden with `visibility` until shown). */
const openDetails = (label: string) => card(label).querySelector<HTMLElement>('[data-details]')!;
const overBadges = () => [...document.querySelectorAll('span')].filter(s => s.textContent === 'เกินเกณฑ์').length;
const nearBadges = () => [...document.querySelectorAll('span')].filter(s => s.textContent === 'ใกล้เกณฑ์').length;
const pill = (startsWith: string) => [...document.querySelectorAll<HTMLElement>('[title]')].find(d => d.textContent?.startsWith(startsWith));

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

describe('SummaryVitals — income, expense, money left', () => {
  it('shows the three totals with per-day averages over the days in the period', () => {
    show();
    const t = text();
    expect(t).toContain('30,000.00'); // รายรับรวม
    expect(t).toContain('20,000.00'); // รายจ่ายรวม
    expect(t).toContain('10,000.00'); // เงินเหลือสุทธิ
    expect(t).toContain('เฉลี่ย ฿1,000.00 / วัน'); // 30,000 / 30
    expect(t).toContain('เฉลี่ย ฿666.67 / วัน'); // 20,000 / 30
  });

  it('per-day averages divide by the days that have passed, not the whole month', () => {
    show({ elapsedDays: 6 }); // day 6 of the current month
    expect(text()).toContain('เฉลี่ย ฿5,000.00 / วัน'); // 30,000 / 6
    expect(text()).not.toContain('เฉลี่ย ฿1,000.00 / วัน');
  });

  it('"ใช้ไป" and "เหลือ" add up to 100%, and "ใช้ไป" turns danger only past 100%', () => {
    show();
    expect(pill('ใช้ไป 66.7%')!.className).not.toContain('text-danger');
    expect(pill('เหลือ 33.3%')).toBeDefined();
    remount({ totalIncome: 10_000, totalExpense: 12_000, netCashflow: -2_000, savingsRate: -20 });
    expect(pill('ใช้ไป 120.0%')!.className).toContain('text-danger');
  });

  it('with no income it says there is nothing to compare with instead of a 0% share', () => {
    show({ totalIncome: 0, totalExpense: 500, netCashflow: -500, savingsRate: 0 });
    expect(text()).toContain('ไม่มีรายรับให้เทียบ');
    expect(text()).not.toContain('ใช้ไป');
    expect(text()).not.toMatch(/NaN|Infinity/);
  });

  it('a healthy surplus is green and says how much of it was invested', () => {
    show();
    expect(pill('เหลือ 33.3%')!.className).toContain('text-income');
    expect(pill('เหลือ 33.3%')!.textContent).not.toContain('ต่ำกว่าเกณฑ์');
    expect(text()).toContain('ในนั้นลงทุน ฿3,000.00');
  });

  it('a surplus under the rule is amber and says it is below the rule — still not a deficit', () => {
    show({ netCashflow: 1_500, savingsRate: 5 });
    const p = pill('เหลือ 5.0%')!;
    expect(p.className).toContain('text-warn');
    expect(p.textContent).toContain('ต่ำกว่าเกณฑ์');
    expect(byText('span', 'ขาดดุล')).toBeNull();
  });

  it('a deficit is danger, says "ขาดดุล" and drops the surplus wording', () => {
    show({ totalExpense: 33_000, netCashflow: -3_000, savingsRate: -10 });
    expect(pill('เหลือ -10.0%')!.className).toContain('text-danger');
    expect(byText('span', 'ขาดดุล')).not.toBeNull();
    expect(pill('เหลือ -10.0%')!.textContent).not.toContain('ต่ำกว่าเกณฑ์');
  });

  it('carries no grade of its own (the strategic panel owns the single grade)', () => {
    show();
    const vitals = document.querySelector('h2')!.closest('.flex-col')!;
    expect(vitals.textContent).not.toMatch(/เกรด/);
  });

  it('a healthy period draws no coloured edges at all; a deficit gets a red bar (a bar, not a border: the border lock greys borders)', () => {
    show();
    expect(document.querySelector('[data-edge]')).toBeNull();
    remount({ netCashflow: -1, savingsRate: -0.1 });
    const edges = [...document.querySelectorAll<HTMLElement>('[data-edge]')].map(e => e.className);
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.every(c => c.includes('bg-danger'))).toBe(true);
    expect(document.querySelector('[class*="border-l-"]')).toBeNull();
  });

  it('says "ช่วงแรก" when there is no earlier period to compare with', () => {
    show();
    expect([...document.querySelectorAll('[title]')].filter(d => d.textContent === 'ช่วงแรก')).toHaveLength(3);
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
    expect([...document.querySelectorAll('[title]')].filter(d => d.textContent === 'ทั้งหมด')).toHaveLength(3);
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
    remount({ totalExpense: 33_000, netCashflow: -3_000, savingsRate: -10, rentPercentage: 40 });
    expect(byText('span[title]', 'เกรด D · ต้องปรับ')).not.toBeNull();
    expect(text()).toContain('เกินเกณฑ์ [ ที่พัก · ขาดดุล ]');
  });

  it('the lifestyle share is WANT spending over income, not over expense', () => {
    show({ wantTotal: 9_500 }); // 31.7% of 30,000 — over the 30% rule
    expect(text()).toContain('เกินเกณฑ์ [ WANT ]');
    expect(card('รายจ่ายตามใจ').textContent).toContain('31.7%');
  });

  it('stays on screen on every tab — it is the verdict for the period', () => {
    show({ showForecasting: true, forecastingDetails: {} as ForecastingDetails });
    click(byText('[role="tab"]', 'พยากรณ์สิ้นเดือน')!);
    expect(byText('span[title]', 'เกรด A · ดีเยี่ยม')).not.toBeNull();
  });

  it('no grade while loading', () => {
    show({}, true);
    expect(text()).not.toMatch(/เกรด [ABCD]/);
  });
});

describe('SummaryStrategic — rule cards', () => {
  it('rent: shows the share and the rule; "เกินเกณฑ์" only past 30%', () => {
    show();
    expect(card('ภาระที่พักอาศัย').textContent).toContain('20.0%');
    expect(card('ภาระที่พักอาศัย').textContent).toContain('< 30% ของรายรับ');
    expect(overBadges()).toBe(0);
    remount({ rentPercentage: 40 });
    expect(card('ภาระที่พักอาศัย').textContent).toContain('40.0%');
    expect(edge('ภาระที่พักอาศัย')).toContain('bg-danger');
    expect(overBadges()).toBe(1);
  });

  it('rent and lifestyle: with no income they say so, and never count as breached', () => {
    show({ totalIncome: 0, netCashflow: -20_000, savingsRate: 0, rentPercentage: 40, wantTotal: 9_000, subscriptionPercentage: 1 });
    expect(card('ภาระที่พักอาศัย').textContent).toContain('ไม่มีรายรับให้เทียบ');
    expect(card('รายจ่ายตามใจ').textContent).toContain('ไม่มีรายรับให้เทียบ');
    expect(card('ภาระที่พักอาศัย').textContent).not.toContain('40.0%');
    expect(text()).toContain('เกินเกณฑ์ [ ขาดดุล ]');
  });

  it('every rule card draws its meter on one scale: the rule tick sits at the same place, the fill is the share of the rule', () => {
    show({ rentPercentage: 15, subscriptionPctOfIncome: 2.5 }); // both exactly half their rule
    const fills = ['ภาระที่พักอาศัย', 'บริการรายเดือน'].map(l =>
      (card(l).querySelector('[aria-hidden="true"].relative > div') as HTMLElement).style.width);
    expect(fills).toEqual(['40%', '40%']); // half of the 80% rule mark
  });

  it('near the rule (past 80% of it) a card says "ใกล้เกณฑ์" and its bar turns amber, without counting as a breach', () => {
    show({ subscriptionPctOfIncome: 4.5 }); // over 4% (80% of 5%) but not over 5%
    expect(nearBadges()).toBe(1);
    expect(card('บริการรายเดือน').querySelector('.bg-warn')).not.toBeNull();
    expect(overBadges()).toBe(0);
    expect(byText('span[title]', 'เกรด A · ดีเยี่ยม')).not.toBeNull();
  });

  it('lifestyle: the top 4 want categories with their share; one fills the row, 2–3 add the total, 4 fill the grid', () => {
    const want = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `w${i}`, name: `ตามใจ${i}`, icon: 'gift', amount: 1_000 * (n - i), pctOfWant: 10 * (n - i) }));
    const lifestyle = () => openDetails('รายจ่ายตามใจ');
    show({ topWantCategories: want(5) });
    expect(lifestyle().textContent).toContain('ตามใจ3');
    expect(card('รายจ่ายตามใจ').textContent).not.toContain('ตามใจ4'); // only four
    expect(card('รายจ่ายตามใจ').textContent).toContain('(50%)');
    expect(card('รายจ่ายตามใจ').textContent).toContain('4 อันดับแรก');
    expect(card('รายจ่ายตามใจ').textContent).not.toContain('รวมรายจ่ายตามใจ');
    remount({ topWantCategories: want(3) });
    expect(lifestyle().textContent).toContain('รวมรายจ่ายตามใจ฿6,000.00(100%)');
    expect(card('รายจ่ายตามใจ').textContent).toContain('3 อันดับแรก');
    remount({ topWantCategories: want(2) });
    expect(lifestyle().textContent).toContain('รวมรายจ่ายตามใจ฿6,000.00');
    expect(card('รายจ่ายตามใจ').textContent).not.toContain('(100%)');
    remount({ topWantCategories: want(1) });
    expect(lifestyle().querySelector('.col-span-2')!.textContent).toContain('ตามใจ0');
    expect(card('รายจ่ายตามใจ').textContent).not.toContain('รวมรายจ่ายตามใจ');
    remount({ topWantCategories: undefined });
    expect(lifestyle().textContent).toContain('ไม่มีรายจ่ายตามใจ');
    expect(card('รายจ่ายตามใจ').textContent).not.toContain('อันดับแรก');
  });

  it('lifestyle: over 30% of income is danger and flagged', () => {
    show({ wantTotal: 10_000 });
    expect(edge('รายจ่ายตามใจ')).toContain('bg-danger');
    expect(card('รายจ่ายตามใจ').textContent).toContain('เกินเกณฑ์');
  });

  it('rent: exactly at the limit is not over, and costs nothing in the grade', () => {
    show({ rentPercentage: 30 });
    expect(overBadges()).toBe(0);
    expect(byText('span[title]', 'เกรด A · ดีเยี่ยม')).not.toBeNull();
  });

  it('rent: the details list the items with their count, or say there is no data', () => {
    show();
    const c = openDetails('ภาระที่พักอาศัย');
    expect(c.textContent).toContain('฿5,000.00');
    expect(c.textContent).toContain('3 รายการ'); // water is 0
    remount({ rentSub: { rent: 0, electricity: 0, internet: 0, water: 0 } });
    expect(openDetails('ภาระที่พักอาศัย').textContent).toContain('ไม่มีข้อมูลที่พักอาศัยในช่วงนี้');
  });

  it('details cover the card on hover or keyboard focus, and stay hidden (visibility, not just opacity) otherwise', () => {
    show();
    const c = card('ภาระที่พักอาศัย');
    const layer = openDetails('ภาระที่พักอาศัย');
    expect(c.tabIndex).toBe(0); // reachable by Tab, so focus can show it too
    expect(c.className).toContain('group');
    expect(layer.className).toContain('invisible');
    expect(layer.className).toContain('group-hover:visible');
    expect(layer.className).toContain('group-focus-visible:visible');
    expect(layer.textContent).toContain('ค่าไฟ');
    expect(c.querySelector('button')).toBeNull(); // no click-to-open button
  });

  it('detail cells stay compact: two rows must fit the 140px rule card (jsdom has no layout, measured live at 89.4px available)', () => {
    show();
    const cells = Array.from(openDetails('ภาระที่พักอาศัย').querySelectorAll<HTMLElement>('.grid > div'));
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(cell.classList.contains('py-1')).toBe(true);
      expect(cell.classList.contains('p-2')).toBe(false);
    }
  });

  it('subscriptions: against income (limit 5%) when there is income, against expense (limit 8%) when there is not', () => {
    show({ subscriptionPctOfIncome: 3 });
    expect(card('บริการรายเดือน').textContent).toContain('3.0%');
    expect(card('บริการรายเดือน').textContent).toContain('< 5% ของรายรับ');
    remount({ totalIncome: 0, netCashflow: -20_000, savingsRate: 0, subscriptionPercentage: 9 });
    const c = card('บริการรายเดือน').textContent!;
    expect(c).toContain('9.0%');
    expect(c).toContain('< 8% ของรายจ่าย');
    expect(overBadges()).toBe(1);
  });

  it('subscriptions: over the limit uses the danger colour like the rent / lifestyle / food cards (not the accent ink)', () => {
    show({ subscriptionPctOfIncome: 6 });
    const c = card('บริการรายเดือน');
    expect(edge('บริการรายเดือน')).toContain('bg-danger');
    expect(c.querySelector('.text-danger')).not.toBeNull();
    expect(c.className.split(' ').filter(k => !k.startsWith('focus-visible:')).join(' ')).not.toContain('accent'); // the focus ring is accent-ink by design
    expect(c.querySelector('.text-accent-ink, .bg-accent')).toBeNull();
    expect(overBadges()).toBe(1);
  });

  it('subscriptions: each service shows its share of the subscription total', () => {
    show();
    const t = openDetails('บริการรายเดือน').textContent!;
    expect(t).toContain('Netflix');
    expect(t).toContain('47%'); // 419 / 900
    expect(t).toContain('53%'); // 481 / 900
    expect(t).toContain('3 รายการ');
  });

  it('food: share of expense as the headline, against the 25% rule, with the worded status in the details', () => {
    show();
    expect(card('ค่าอาหาร').textContent).toContain('15.0%');
    expect(card('ค่าอาหาร').textContent).toContain('< 25% ของรายจ่าย');
    expect(openDetails('ค่าอาหาร').textContent).toContain('สมดุลดี');
    remount({ foodPercentage: 22 }); // past 80% of 25%
    expect(nearBadges()).toBe(1);
    expect(openDetails('ค่าอาหาร').textContent).toContain('ปานกลาง');
    remount({ foodPercentage: 30 });
    expect(openDetails('ค่าอาหาร').textContent).toContain('สัดส่วนสูง');
    expect(overBadges()).toBe(1);
  });

  it('food: daily average and work vs holiday on the card; the peak day in the details; empty details when nothing was spent on food', () => {
    show();
    const t = card('ค่าอาหาร').textContent!;
    expect(t).toContain('฿100.00');
    expect(t).toContain('ทำงาน ฿150.00');
    expect(t).toContain('หยุด ฿100.00');
    expect(openDetails('ค่าอาหาร').textContent).toContain('฿450.00'); // peak
    remount({ foodTotal: 0, foodDailyAvg: 0, foodPercentage: 0 });
    expect(openDetails('ค่าอาหาร').textContent).toContain('ไม่มีข้อมูลค่าอาหารในช่วงนี้');
  });

  it('daily expense: the average per day without rent, rent-inclusive on its own line; no rent → one figure', () => {
    show();
    let t = card('รายจ่ายเฉลี่ย/วัน').textContent!;
    expect(t).toContain('฿466.67');
    expect(t).toContain('ไม่รวมค่าที่พัก');
    expect(t).toContain('รวมค่าที่พักแล้ว฿666.67/วัน');
    remount({ rentTotal: 0, livingDailyAvg: 666.67 });
    t = card('รายจ่ายเฉลี่ย/วัน').textContent!;
    expect(t).toContain('฿666.67');
    expect(t).not.toContain('ค่าที่พัก');
  });

  it('daily expense: work vs holiday, and which of the two costs more', () => {
    show();
    const t = card('รายจ่ายเฉลี่ย/วัน').textContent!;
    expect(t).toContain('เฉลี่ยจาก 30 วัน');
    expect(t).toContain('฿700.00');
    expect(t).toContain('฿600.00');
    expect(t).toContain('วันทำงานจ่ายมากกว่า');
    expect(t).toContain('฿100.00/วัน');
    expect(t).not.toContain('฿20,000.00'); // the total lives in Vitals
  });

  it('exactly one card flags itself when one rule breaks (a red card is always a counted breach)', () => {
    show({ foodPercentage: 40 });
    expect(overBadges()).toBe(1);
    expect(text()).toContain('เกินเกณฑ์ [ ค่าอาหาร ]');
  });

  it('skeleton: cards show shimmer, no rule rows and no detail layer', () => {
    show({}, true);
    expect(text()).not.toContain('เกณฑ์ (');
    expect(document.querySelector('[data-details]')).toBeNull();
    expect(document.querySelector('section[tabindex]')).toBeNull();
    expect(overBadges()).toBe(0);
  });
});

describe('SummaryStrategic — average money left per day', () => {
  it('positive: written as the sum it is — income − NEED − WANT — with investing shown inside the result', () => {
    show();
    expect(text()).toContain('฿333.33'); // 10,000 / 30
    expect(text()).toContain('เหลือสุทธิ/วัน · เฉลี่ยจาก 30 วัน');
    expect(text()).toContain('฿1,000.00'); // income per day
    expect(text()).toContain('−฿466.67'); // NEED 14,000 / 30
    expect(text()).toContain('−฿200.00'); // WANT 6,000 / 30
    expect(text()).toContain('ในนั้นลงทุน ฿100.00/วัน'); // 3,000 / 30
  });

  it('divides by the days that have passed in the current month', () => {
    show({ elapsedDays: 10 });
    expect(text()).toContain('฿1,000.00'); // 10,000 / 10
    expect(text()).toContain('เฉลี่ยจาก 10 วัน');
  });

  it('negative: shows a minus sign and says "ติดลบสุทธิ/วัน"', () => {
    show({ netCashflow: -3_000 });
    expect(text()).toContain('−฿100.00');
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

  it('starts on the overview; forecast is disabled with the reason when it cannot apply', () => {
    show();
    expect(tab('ภาพรวมการใช้จ่าย').getAttribute('aria-selected')).toBe('true');
    expect(tab('พยากรณ์สิ้นเดือน').getAttribute('aria-disabled')).toBe('true');
    expect(text()).toContain('ต้องเลือกเดือนปัจจุบันเท่านั้น');
    expect(panel('forecast')).toBeUndefined(); // not mounted at all
  });

  it('clicking a disabled tab does nothing', () => {
    show();
    click(tab('พยากรณ์สิ้นเดือน'));
    expect(tab('ภาพรวมการใช้จ่าย').getAttribute('aria-selected')).toBe('true');
  });

  it('enabled tabs switch the panel, and only the open one is mounted', () => {
    show({ showForecasting: true, forecastingDetails: {} as ForecastingDetails });
    expect(panel('strategic')).toBeDefined();
    expect(panel('forecast')).toBeUndefined();
    click(tab('พยากรณ์สิ้นเดือน'));
    expect(tab('พยากรณ์สิ้นเดือน').getAttribute('aria-selected')).toBe('true');
    expect(panel('forecast')).toBeDefined();
    expect(panel('strategic')).toBeUndefined();
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
    show({ showForecasting: true, forecastingDetails: {} as ForecastingDetails });
    const tabs = [...document.querySelectorAll<HTMLElement>('[role="tab"]')];
    expect(tabs.map(t => t.tabIndex)).toEqual([0, -1]);
    act(() => tabs[0].focus());
    key(tabs[0], 'ArrowRight');
    expect(document.activeElement).toBe(tabs[1]);
    key(tabs[1], 'ArrowRight'); // wraps
    expect(document.activeElement).toBe(tabs[0]);
    key(tabs[0], 'End');
    expect(document.activeElement).toBe(tabs[1]);
    key(tabs[1], 'ArrowLeft');
    expect(document.activeElement).toBe(tabs[0]);
    key(tabs[0], 'End');
    key(tabs[1], 'Home');
    expect(document.activeElement).toBe(tabs[0]);
    key(tabs[0], 'Enter'); // not a move key
    expect(document.activeElement).toBe(tabs[0]);
    act(() => tabs[0].blur());
    key(q('[role="tablist"]')!, 'ArrowRight'); // focus is not on a tab: nothing to move
    expect(document.activeElement).toBe(document.body);
  });
});

describe('SummaryForecasting — end of month forecast', () => {
  const details: ForecastingDetails = {
    currentDay: 15, lastDayOfMonth: 30, remainingDays: 15, monthProgressPct: 50,
    fixedTotal: 14_000, variableUpToToday: 3_000, projectedVariableRemaining: 3_000, actualDailyVariableAvg: 200,
    projectedSurplusPct: 33, maxAllowedExpense: 21_000, requiredReduction: 0, requiredDailyReduction: 0, actualDailySeries: [],
    projectedSurplus: 10_000,
    pendingFixed: 0, pendingFixedItems: [], estimatedIncome: 0, oneOffExcluded: 0, plannedAhead: 0, targetExpense: 24_000, targetShortfall: 0, safeToSpendForTarget: 400, projectedRange: null,
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
    expect(t).toContain('รายรับ ฿21,000.00');
    expect(t).toContain('ตอนนี้ใช้ ฿200.00/วัน');
    expect(t).toContain('+฿300.00/วัน'); // 500 allowed − 200 actual
    expect(t).toContain('ยังเหลือที่ว่าง:');
    expect(t).toContain('ใช้อยู่ 40% ของที่ใช้ได้');
    expect(t).toContain('บิลประจำ 70%'); // 14,000 of the 20,000 projected
    expect(t).toContain('ใช้ไปแล้ว 15%');
    expect(t).toContain('+฿10,000.00');
    expect(t).toContain('คุมงบได้ตามเป้า');
    expect(t).not.toContain('ขาดอีก');
    // the projected leftover is money left, not savings (SAVE means investing only)
    expect(t).toContain('เหลือ 33%');
    expect(t).toContain('เป้า 20% = ฿4,200.00');
    expect(t).not.toContain('ออม 33%');
  });

  it('above the 20% target: every part of the card agrees it is on target', () => {
    forecast({}, { targetExpense: 24_000, targetShortfall: 0, safeToSpendForTarget: 700 });
    const t = text();
    expect(t).toContain('ถึงเป้าแล้ว');
    expect(t).toContain('คุมงบได้ตามเป้า');
    expect(t).toContain('ถ้าจะให้เหลือ 20%:');
    expect(t).toContain('ใช้ได้ ฿700.00/วัน');
    expect(t).not.toContain('ต่ำกว่าเป้า');
  });

  it('shows the range and says where it comes from', () => {
    forecast({}, { projectedRange: { low: 18_000, high: 21_000 } });
    expect(text()).toContain('ถ้าใช้แบบ 3 เดือนก่อน:');
    expect(text()).toContain('฿18,000.00 – ฿21,000.00');
    expect(q('[title*="3 เดือนก่อน"]')?.getAttribute('title')).toBe('ถ้าวันที่เหลือใช้เท่าเดือนที่น้อยที่สุดหรือมากที่สุดใน 3 เดือนก่อน หรือเท่าตอนนี้');
  });

  it('hands the range and the target to the chart', () => {
    const projectedRange = { low: 18_000, high: 21_000 };
    forecast({}, { projectedRange, targetExpense: 24_000 });
    expect(h.forecastChart).toMatchObject({ projectedRange, targetExpense: 24_000 });
  });

  it('no range: no row', () => {
    forecast({}, { projectedRange: null });
    expect(text()).not.toContain('ถ้าใช้แบบ 3 เดือนก่อน');
  });

  it('exactly on the 20% target still counts as on target', () => {
    forecast({ projectedSurplus: 6_000, projectedExpense: 24_000 }, { projectedSurplusPct: 20 });
    expect(text()).toContain('คุมงบได้ตามเป้า');
    expect(text()).not.toContain('ต่ำกว่าเป้า');
  });

  it('positive but under the 20% target: no "safe" wording, says how much is missing (warn colour)', () => {
    forecast({ projectedSurplus: 3_000, projectedExpense: 27_000 }, {
      projectedSurplusPct: 10, targetExpense: 24_000, targetShortfall: 3_000, safeToSpendForTarget: 400,
      paceStatus: { label: 'ใช้เร็วเกินแผน', color: '#F59E0B', bg: 'bg-amber-950/30' },
      eomStatus: { label: 'เหลือน้อย', color: '#F59E0B', bg: 'bg-amber-950/40', border: 'border-amber-500' },
    });
    const t = text();
    expect(t).toContain('ต่ำกว่าเป้า 20%');
    expect(t).toContain('ขาดอีก ฿3,000.00 ถึงเป้า');
    expect(t).not.toContain('ถึงเป้าแล้ว');
    expect(t).not.toContain('คุมงบได้ตามเป้า');
    expect(byText('div', '+฿3,000.00')?.classList.contains('text-warn')).toBe(true);
  });

  it('names the bills that were expected but not logged yet', () => {
    forecast({}, { pendingFixed: 6_000, pendingFixedItems: [{ name: 'ค่าเช่า', amount: 4_500 }, { name: 'ค่าไฟ', amount: 1_500 }] });
    expect(text()).toContain('ในนี้ยังไม่ได้ลง (คาดจากเดือนก่อน):');
    expect(text()).toContain('฿6,000.00');
    expect(q('[title*="ค่าเช่า"]')?.getAttribute('title')).toContain('ค่าไฟ');
  });

  it('says when the ceiling leans on an estimated salary', () => {
    forecast({}, { estimatedIncome: 25_000 });
    expect(text()).toContain('รวมรายรับที่ยังไม่ลง ฿25,000.00 จากประวัติ');
  });

  it('says nothing about bills or salary when all of it is logged', () => {
    forecast();
    expect(text()).not.toContain('ยังไม่ลง');
  });

  it('after a lump the left-out amount is shown and says why', () => {
    forecast({}, { oneOffExcluded: 4_000 });
    expect(text()).toContain('ของเป็นก้อน (นับครั้งเดียว):');
    expect(text()).toContain('฿4,000.00');
    expect(q('[title*="นับว่าจ่ายแล้ว"]')).not.toBeNull();
  });

  it('splits what is still to come into the daily pace and the rows planned ahead', () => {
    forecast({}, { remainingDays: 15, actualDailyVariableAvg: 200, projectedVariableRemaining: 4_000, plannedAhead: 1_000 });
    const t = text();
    expect(t).toContain('คาดว่าใช้อีก (15 วัน):');
    expect(t).toContain('ค่ากินอยู่ ฿200.00 × 15 วัน:');
    expect(t).toContain('฿3,000.00');
    expect(t).toContain('รายการที่ลงแผนไว้:');
    expect(t).toContain('฿1,000.00');
  });

  it('nothing planned ahead: no split', () => {
    forecast();
    expect(text()).not.toContain('รายการที่ลงแผนไว้');
  });

  it('when the 20% target is out of reach it says so instead of ฿0.00 a day', () => {
    forecast({}, { safeToSpendForTarget: 0 });
    expect(text()).toContain('เดือนนี้ไม่ทันแล้ว');
    expect(text()).not.toContain('ใช้ได้ ฿0.00/วัน');
  });

  it('over the ceiling: says how much to cut per day and in total, and the surplus turns negative', () => {
    forecast({ safeToSpend: 100, projectedExpense: 31_500, projectedSurplus: -1_500 }, { actualDailyVariableAvg: 200, requiredDailyReduction: 100, requiredReduction: 1_500, projectedSurplusPct: -5 });
    const t = text();
    expect(t).toContain('−฿100.00/วัน');
    expect(t).toContain('ต้องลดวันละ:');
    expect(t).toContain('ใช้อยู่ 200% ของที่ใช้ได้');
    expect(t).toContain('ใช้น้อยลงอีก ฿1,500.00 ถึงไม่ติดลบ');
    expect(t).toContain('−฿1,500.00');
    expect(t).toContain('ติดลบ');
  });

  it('skeleton hides the headline numbers', () => {
    forecast({}, {}, true);
    expect(text()).not.toContain('+฿10,000.00');
    expect(document.querySelectorAll('.animate-pulse').length).toBe(3);
  });
});

