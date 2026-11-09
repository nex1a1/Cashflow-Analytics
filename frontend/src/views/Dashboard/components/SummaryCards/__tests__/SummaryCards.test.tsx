// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import SummaryCards from '..';
import { SummaryForecasting } from '../Forecasting/SummaryForecasting';
import { SummaryGhostPacer } from '../GhostPacer/SummaryGhostPacer';
import { click, key, q, byText } from '@/test-utils/dom';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import type { SummaryAnalytics, ForecastingDetails, GhostPacerDetails } from '../types';

// Real cards, real thresholds. Only the dashboard context and the two Chart.js canvases (jsdom has no canvas) are replaced.
const h = vi.hoisted(() => ({ analytics: null as unknown, skeleton: false, forecastChart: null as null | Record<string, unknown> }));
vi.mock('@/views/Dashboard/context/DashboardContext', () => ({
  useDashboardContext: () => ({ analytics: h.analytics, showSkeleton: h.skeleton }),
}));
vi.mock('@/views/Dashboard/components/SummaryCards/Forecasting/ForecastingTrajectoryChart', () => ({
  ForecastingTrajectoryChart: (props: Record<string, unknown>) => { h.forecastChart = props; return null; },
}));
vi.mock('@/views/Dashboard/components/SummaryCards/GhostPacer/GhostPacerChart', () => ({ GhostPacerChart: () => null }));

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

  it('enabled tabs switch the panel, and only the open one is mounted', () => {
    show({ showForecasting: true, isSingleMonthView: true, forecastingDetails: {} as ForecastingDetails, ghostPacerDetails: { hasData: false } as GhostPacerDetails });
    expect(panel('strategic')).toBeDefined();
    expect(panel('forecast')).toBeUndefined();
    click(tab('พยากรณ์สิ้นเดือน'));
    expect(tab('พยากรณ์สิ้นเดือน').getAttribute('aria-selected')).toBe('true');
    expect(panel('forecast')).toBeDefined();
    expect(panel('strategic')).toBeUndefined();
    click(tab('เทียบเดือนที่แล้ว'));
    expect(panel('ghost')).toBeDefined();
    expect(panel('forecast')).toBeUndefined();
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
    pendingFixed: 0, pendingFixedItems: [], estimatedIncome: 0, oneOffExcluded: 0, targetExpense: 24_000, targetShortfall: 0, safeToSpendForTarget: 400, projectedRange: null,
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
    // the projected leftover is money left, not savings (SAVE means investing only)
    expect(t).toContain('เหลือ 33%');
    expect(t).not.toContain('ออม 33%');
  });

  it('above the 20% target: every part of the card agrees it is on target', () => {
    forecast({}, { targetExpense: 24_000, targetShortfall: 0, safeToSpendForTarget: 700 });
    const t = text();
    expect(t).toContain('ปลอดภัย');
    expect(t).toContain('คุมงบได้ตามเป้า');
    expect(t).toContain('เพื่อเหลือตามเป้า 20%:');
    expect(t).toContain('฿700.00/วัน');
    expect(t).not.toContain('ต่ำกว่าเป้า');
  });

  it('shows the range and says where it comes from', () => {
    forecast({}, { projectedRange: { low: 18_000, high: 21_000 } });
    expect(text()).toContain('ช่วงจาก 3 เดือนก่อน:');
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
    expect(text()).not.toContain('ช่วงจาก 3 เดือนก่อน');
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
    expect(t).toContain('ต้องลดอีก ฿3,000.00 ถึงเป้า');
    expect(t).not.toContain('ปลอดภัย');
    expect(t).not.toContain('คุมงบได้ตามเป้า');
    expect(byText('div', '+฿3,000.00')?.classList.contains('text-warn')).toBe(true);
  });

  it('names the bills that were expected but not logged yet', () => {
    forecast({}, { pendingFixed: 6_000, pendingFixedItems: [{ name: 'ค่าเช่า', amount: 4_500 }, { name: 'ค่าไฟ', amount: 1_500 }] });
    expect(text()).toContain('รวมที่ยังไม่ลง:');
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

  it('after a big one-off day the pace is called usual, and the left-out amount is shown', () => {
    forecast({}, { oneOffExcluded: 4_000 });
    expect(text()).toContain('ใช้ปกติ ฿200.00/ว');
    expect(text()).toContain('ของชิ้นใหญ่ไม่คูณต่อ:');
    expect(text()).toContain('฿4,000.00');
  });

  it('over the ceiling: says how much to cut per day and in total, and the surplus turns negative', () => {
    forecast({ safeToSpend: 100, projectedExpense: 31_500, projectedSurplus: -1_500 }, { actualDailyVariableAvg: 200, requiredDailyReduction: 100, requiredReduction: 1_500, projectedSurplusPct: -5 });
    const t = text();
    expect(t).toContain('−฿100.00/วัน');
    expect(t).toContain('อัตราใช้จริง: 200% ของเพดาน');
    expect(t).toContain('ต้องลดอีก ฿1,500.00');
    expect(t).toContain('−฿1,500.00');
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
    hasData: true, isCurrentMonth: true, currentPeriod: 'ก.ย.', prevPeriod: 'ส.ค.', currentDay: 15, lastDayOfMonth: 30,
    currentDailySeries: [], prevDailySeries: [], benchmarkDailySeries: [],
    currentSpendToDate: 8_000, ghostSpendToDate: 10_000, benchmarkSpendToDate: 9_000,
    deltaVsGhost: -2_000, deltaVsGhostPct: -20, deltaVsBenchmark: -1_000, deltaVsBenchmarkPct: -11.1,
    projectedExpense: 18_000, ghostTotalExpense: 21_000, deltaEom: -3_000, gapDrivers: [], gapOthers: 0, beatGhostDaily: null, dailyPace: 0,
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

  describe('daily amount to end under last month', () => {
    const LABEL = 'เพื่อจบต่ำกว่าเดือนก่อน:';

    it('under the amount: green, with the current pace on hover', () => {
      pacer({ beatGhostDaily: 400, dailyPace: 300 });
      expect(byText('span', LABEL)).not.toBeNull();
      expect(byText('span', '฿400.00/วัน')?.classList.contains('text-income')).toBe(true);
      expect(q('[title*="ตอนนี้ใช้"]')?.getAttribute('title')).toBe('ตอนนี้ใช้เฉลี่ย ฿300.00/วัน');
    });

    it('within 5% of it: warn colour', () => {
      pacer({ beatGhostDaily: 400, dailyPace: 410 });
      expect(byText('span', '฿400.00/วัน')?.classList.contains('text-warn')).toBe(true);
    });

    it('clearly over it: red', () => {
      pacer({ beatGhostDaily: 400, dailyPace: 500 });
      expect(byText('span', '฿400.00/วัน')?.classList.contains('text-danger')).toBe(true);
    });

    it('already past last month: says so instead of ฿0 a day', () => {
      pacer({ beatGhostDaily: 0, dailyPace: 300 });
      expect(byText('span', 'เกินยอดเดือนก่อนแล้ว')?.classList.contains('text-danger')).toBe(true);
      expect(text()).not.toContain('฿0.00/วัน');
    });

    it('nothing to say: no row', () => {
      pacer({ beatGhostDaily: null });
      expect(byText('span', LABEL)).toBeNull();
    });
  });

  describe('why it differs', () => {
    const drivers = [
      { id: 'a', name: 'หนัง', icon: 'film', current: 300, previous: 1_000, delta: -700 },
      { id: 'b', name: 'ข้าว', icon: 'utensils', current: 1_000, previous: 400, delta: 600 },
    ];

    it('lists the causes with their sign and colour in place of the repeated verdict', () => {
      pacer({ gapDrivers: drivers, gapOthers: 30 });
      const t = text();
      expect(t).toContain('ต่างจากเดือนก่อนเพราะ:');
      expect(t).toContain('หนัง');
      expect(t).not.toContain('ควบคุมงบได้นิ่งกว่า');
      expect(byText('span', '−฿700.00')?.classList.contains('text-income')).toBe(true);
      expect(byText('span', '+฿600.00')?.classList.contains('text-danger')).toBe(true);
      expect(byText('span', 'หมวดอื่นรวม:')).not.toBeNull();
      expect(byText('span', '+฿30.00')?.classList.contains('text-danger')).toBe(true);
    });

    it('shows last month and this month for each cause on hover', () => {
      pacer({ gapDrivers: drivers, gapOthers: 0 });
      expect(q('[title*="หนัง"]')?.getAttribute('title')).toBe('หนัง: เดือนนี้ ฿300.00 · เดือนก่อน ฿1,000.00');
    });

    it('a finished month says "the month viewed" on hover too', () => {
      pacer({ isCurrentMonth: false, gapDrivers: drivers, gapOthers: 0 });
      expect(q('[title*="หนัง"]')?.getAttribute('title')).toBe('หนัง: เดือนที่ดู ฿300.00 · เดือนก่อน ฿1,000.00');
    });

    it('the causes take the place of the two bars, so the card does not grow', () => {
      const bars = () => document.querySelectorAll('.h-1.w-full').length;
      pacer({ gapDrivers: [], gapOthers: 0 });
      expect(bars()).toBe(2);
      act(() => root!.unmount());
      pacer({ gapDrivers: drivers, gapOthers: 0 });
      expect(bars()).toBe(0);
    });

    it('the headline keeps its satang, so the lines add up to it exactly', () => {
      pacer({ deltaVsGhost: -585.39, gapDrivers: drivers, gapOthers: 0 });
      expect(byText('div', '−฿585.39')).not.toBeNull();
    });

    it('no remainder, no remainder line', () => {
      pacer({ gapDrivers: drivers, gapOthers: 0 });
      expect(text()).not.toContain('หมวดอื่นรวม');
    });

    it('a negative remainder keeps the real minus and its colour', () => {
      pacer({ gapDrivers: drivers, gapOthers: -30 });
      expect(byText('span', '−฿30.00')?.classList.contains('text-income')).toBe(true);
    });

    it('nothing to explain: the verdict line stays', () => {
      pacer({ gapDrivers: [], gapOthers: 0 });
      expect(text()).not.toContain('ต่างจากเดือนก่อนเพราะ');
      expect(text()).toContain('ควบคุมงบได้นิ่งกว่า');
    });

    it('skeleton hides the causes', () => {
      pacer({ gapDrivers: drivers, gapOthers: 30 }, true);
      expect(text()).not.toContain('ต่างจากเดือนก่อนเพราะ');
    });
  });

  it('a finished month speaks of its real total, not of a forecast or of "this month"', () => {
    pacer({ isCurrentMonth: false, currentDay: 30, projectedExpense: 19_000, deltaEom: -2_000, currentSpendToDate: 19_000 });
    const t = text();
    expect(t).toContain('ยอดจบเดือน');
    expect(t).toContain('ยอดจบจริงเดือนที่ดู:');
    expect(t).not.toContain('คาดการณ์');
    expect(t).not.toContain('ประมาณการ');
    expect(t).not.toContain('เดือนนี้');
    expect(t).not.toContain('เป้าสิ้นเดือน');
  });

  it('the current month keeps its forecast wording', () => {
    pacer({});
    const t = text();
    expect(t).toContain('คาดการณ์ยอดสิ้นเดือน');
    expect(t).toContain('ประมาณการเดือนนี้:');
    expect(t).toContain('ก.ย. (เดือนนี้):');
  });

  it('every headline shows real satang with a real sign', () => {
    pacer({ deltaVsGhost: 1_500.5, deltaVsBenchmark: -1_252.75, projectedExpense: 9_480.98 });
    expect(byText('div', '+฿1,500.50')).not.toBeNull();
    expect(byText('div', '−฿1,252.75')).not.toBeNull();
    expect(byText('div', '฿9,480.98')).not.toBeNull();
  });

  it('the 3-month benchmark is tagged as 3 months', () => {
    pacer({});
    expect(text()).toContain('3 เดือนก่อน');
  });

  describe('with or without rent', () => {
    const withRent = { ...ghost, ghostSpendToDate: 14_000, ghostTotalExpense: 27_000, currentSpendToDate: 8_000, deltaVsGhost: -6_000 };
    const noRent = { ...ghost, ghostSpendToDate: 8_100, currentSpendToDate: 8_000, deltaVsGhost: -100, deltaVsGhostPct: -1.2 };
    const toggled = (details: GhostPacerDetails = noRent) =>
      mountNode(<SummaryGhostPacer analytics={withData({ ghostPacerDetails: withRent, ghostPacerDetailsNoRent: details })} />);
    const toggle = () => q('button[aria-pressed]') as HTMLButtonElement;

    beforeEach(() => localStorage.removeItem(STORAGE_KEYS.GHOST_INCLUDE_RENT));

    it('starts without rent', () => {
      toggled();
      expect(toggle().getAttribute('aria-pressed')).toBe('false');
      expect(toggle().textContent).toContain('รวมค่าเช่า');
      expect(text()).toContain('฿8,100.00');
      expect(text()).not.toContain('฿14,000.00');
    });

    it('the switch brings rent in and is remembered', () => {
      toggled();
      click(toggle());
      expect(toggle().getAttribute('aria-pressed')).toBe('true');
      expect(text()).toContain('฿14,000.00');
      expect(localStorage.getItem(STORAGE_KEYS.GHOST_INCLUDE_RENT)).toBe('1');
      act(() => root!.unmount());
      toggled();
      expect(toggle().getAttribute('aria-pressed')).toBe('true');
      click(toggle());
      expect(localStorage.getItem(STORAGE_KEYS.GHOST_INCLUDE_RENT)).toBe('0');
    });

    it('no rent anywhere: nothing to switch', () => {
      toggled(withRent);
      expect(toggle()).toBeNull();
    });

    it('rent only in this month forecast still offers the switch', () => {
      mountNode(<SummaryGhostPacer analytics={withData({ ghostPacerDetails: { ...ghost, projectedExpense: 22_500 }, ghostPacerDetailsNoRent: ghost })} />);
      expect(toggle()).not.toBeNull();
    });

    it('a blocked localStorage does not break the card', () => {
      const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
      const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
      toggled();
      click(toggle());
      expect(toggle().getAttribute('aria-pressed')).toBe('true');
      get.mockRestore();
      set.mockRestore();
    });
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
