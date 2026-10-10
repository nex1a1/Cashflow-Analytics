// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { GhostPacerChart } from '../GhostPacer/GhostPacerChart';
import { tc } from '@/constants/theme';
import '@/test-utils/dom';

const ro = vi.hoisted(() => ({ cb: null as null | ((e: unknown[]) => void), disconnect: vi.fn() }));
globalThis.ResizeObserver = class {
  constructor(cb: (e: unknown[]) => void) { ro.cb = cb; }
  observe() {}
  disconnect() { ro.disconnect(); }
} as unknown as typeof ResizeObserver;

// Plot runs x 54 → 644 at the default 800-unit width (156 kept on the right for the badges).
const PAD_L = 54, PLOT_W = 590;
const dayX = (d: number, days = 31) => PAD_L + (d / days) * PLOT_W;
const cum = (perDay: number, n: number) => Array.from({ length: n }, (_, i) => (i + 1) * perDay);

const base = {
  currentDay: 10, lastDayOfMonth: 31,
  currentDailySeries: cum(500, 10),     // 5,000 by today
  prevDailySeries: cum(400, 30),        // last month had 30 days: 4,000 by day 10, 12,000 in all
  benchmarkDailySeries: cum(450, 31),
  projectedExpense: 15500, ghostTotalExpense: 12000,
  paceColor: '#123456', currentPeriod: 'ต.ค. 2569', prevPeriod: 'ก.ย. 2569',
};
type Props = typeof base;

let root: Root | null = null;
let container: HTMLElement;
const mount = (p: Partial<Props> = {}) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<GhostPacerChart {...base} {...p} />));
};
const remount = (p: Partial<Props> = {}) => { act(() => root!.unmount()); mount(p); };
const svg = () => container.querySelector('svg.cursor-crosshair')!; // the legend's Ghost icon is an svg too
const hover = (x: number, width = 800) => {
  const s = svg();
  s.getBoundingClientRect = () => ({ left: 0, top: 0, width, height: 202, right: width, bottom: 202, x: 0, y: 0, toJSON() {} }) as DOMRect;
  act(() => { s.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x })); });
};
const leave = () => act(() => { svg().dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })); });
const tip = () => container.querySelector('g.pointer-events-none');
const tipText = () => tip()!.textContent ?? '';
const delta = () => [...tip()!.querySelectorAll('text')][1];
const texts = () => [...container.querySelectorAll('text')].map(t => t.textContent ?? '');
const badge = (prefix: string) => [...container.querySelectorAll('g[transform]')].find(g => g.textContent?.startsWith(prefix));
const translateY = (g: Element) => Number(g.getAttribute('transform')!.match(/, ([-\d.]+)\)/)![1]);
const paths = (stroke: string) => [...container.querySelectorAll('path')].filter(p => p.getAttribute('stroke') === stroke);

beforeEach(() => { ro.cb = null; ro.disconnect.mockClear(); });
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  document.body.innerHTML = '';
});

describe('GhostPacerChart', () => {
  it('names both months in the legend and labels how each month ends', () => {
    mount({ ghostTotalExpense: 12500 }); // the given total wins over the end of the daily series
    expect(container.textContent).toContain('ต.ค. 2569 (เดือนนี้)');
    expect(container.textContent).toContain('Ghost: ก.ย. 2569 (เดือนก่อน)');
    expect(texts()).toContain('เดือนก่อนจบ ฿12,500');
    expect(texts()).toContain('คาดจบเดือนนี้ ฿15,500');
  });

  it("takes last month's end from its series when no total is given, and hides empty badges", () => {
    mount({ ghostTotalExpense: 0, prevDailySeries: cum(300, 30) });
    expect(texts()).toContain('เดือนก่อนจบ ฿9,000');
    remount({ ghostTotalExpense: 0, prevDailySeries: [], projectedExpense: 0 });
    expect(badge('เดือนก่อนจบ')).toBeUndefined();
    expect(badge('คาดจบเดือนนี้')).toBeUndefined();
  });

  it("draws last month and the 3-month average only when they have spending, and pins last month's pace at today", () => {
    mount();
    expect(paths(tc('info'))).toHaveLength(1);
    expect(paths(tc('ink-body'))).toHaveLength(1);
    const node = [...container.querySelectorAll('circle')].find(c => c.getAttribute('r') === '4')!;
    expect(Number(node.getAttribute('cx'))).toBeCloseTo(dayX(10));
    expect(Number(node.getAttribute('cy'))).toBeCloseTo(176 - (4000 / (15500 * 1.12)) * 156); // last month by day 10, not its end
    remount({ prevDailySeries: Array(30).fill(0), benchmarkDailySeries: Array(31).fill(0) });
    expect(paths(tc('info'))).toHaveLength(0);
    expect(paths(tc('ink-body'))).toHaveLength(0);
    expect([...container.querySelectorAll('circle')].some(c => c.getAttribute('r') === '4')).toBe(false);
  });

  it('maps its viewBox 1:1 to the measured width and stops observing on unmount', () => {
    mount();
    act(() => ro.cb!([{ contentRect: { width: 960, height: 202 } }]));
    expect(svg().getAttribute('viewBox')).toBe('0 0 960 202');
    act(() => ro.cb!([{ contentRect: { width: 0, height: 0 } }]));
    expect(svg().getAttribute('viewBox')).toBe('0 0 960 202');
    act(() => root!.unmount()); root = null;
    expect(ro.disconnect).toHaveBeenCalledTimes(1);
  });

  it('hovering a past day compares both months: spending more is red with a plus', () => {
    mount();
    expect(tip()).toBeNull();
    hover(dayX(5));
    expect(tipText()).toContain('Day 5');
    expect(tipText()).toContain('เดือนนี้: ฿2,500.00');
    expect(tipText()).toContain('เดือนก่อน: ฿2,000.00');
    expect(tipText()).toContain('เฉลี่ย ฿2,250');
    expect(delta().textContent).toBe('+฿500 (+25%)');
    expect(delta().getAttribute('fill')).toBe(tc('danger'));
    hover(dayX(10));
    expect(tipText()).toContain('(วันนี้)');
  });

  it('spending less is green with a true minus on both the baht and the percent; close is amber; equal is ±฿0', () => {
    mount({ currentDailySeries: cum(300, 10) });
    hover(dayX(5));
    expect(delta().textContent).toBe('−฿500 (−25%)');
    expect(delta().getAttribute('fill')).toBe(tc('income'));
    remount({ currentDailySeries: cum(410, 10) });
    hover(dayX(5));
    expect(delta().getAttribute('fill')).toBe(tc('warn'));
    remount({ currentDailySeries: cum(400, 10) });
    hover(dayX(5));
    expect(delta().textContent).toBe('±฿0');
  });

  it('shows no percentage when last month had nothing to compare with', () => {
    mount({ prevDailySeries: [], ghostTotalExpense: 0 });
    hover(dayX(5));
    expect(delta().textContent).toBe('+฿2,500');
    expect(tipText()).toContain('เดือนก่อน: ฿0.00');
  });

  it('projects future days to the month-end estimate and holds a shorter last month at its final total', () => {
    mount();
    hover(dayX(31));
    expect(tipText()).toContain('(คาดการณ์)');
    expect(tipText()).toContain('เดือนนี้: ฿15,500.00');
    expect(tipText()).toContain('เดือนก่อน: ฿12,000.00'); // last month ended on day 30
    expect(tipText()).toContain('เฉลี่ย ฿13,950');
    hover(dayX(20));
    expect(tipText()).toContain('เดือนนี้: ฿10,000.00'); // 5,000 + 10,500 × 10/21
  });

  it('before anything is spent this month, past days read ฿0 and an average that ran out shows nothing', () => {
    mount({ currentDailySeries: [], benchmarkDailySeries: cum(450, 3) });
    hover(dayX(5));
    expect(tipText()).toContain('เดือนนี้: ฿0.00');
    expect(tipText()).not.toContain('เฉลี่ย');
  });

  it('clears the tooltip outside the plot and on mouse leave; ignores an unmeasured box', () => {
    mount();
    hover(dayX(5));
    hover(dayX(31) + 20);
    expect(tip()).toBeNull();
    hover(dayX(5));
    leave();
    expect(tip()).toBeNull();
    hover(dayX(5));
    hover(dayX(9), 0); // unmeasured box: keep what is shown
    expect(tipText()).toContain('Day 5');
  });

  it('keeps the tooltip inside the chart near the right edge', () => {
    mount();
    hover(dayX(31));
    const x = Number(tip()!.querySelector('g[transform]')!.getAttribute('transform')!.match(/translate\(([-\d.]+)/)![1]);
    expect(x).toBeCloseTo(dayX(31) - 210 - 12);
  });

  it('pushes the two month-end badges 16 apart when the totals are close, either way round', () => {
    mount({ projectedExpense: 12500 });
    expect(translateY(badge('เดือนก่อนจบ')!) - translateY(badge('คาดจบเดือนนี้')!)).toBeCloseTo(16);
    remount({ projectedExpense: 11500 });
    expect(translateY(badge('คาดจบเดือนนี้')!) - translateY(badge('เดือนก่อนจบ')!)).toBeCloseTo(16);
  });

  it('drops the first/last day labels and ticks that would collide with the today label', () => {
    mount({ currentDay: 31, currentDailySeries: cum(100, 31) });
    expect(texts().filter(t => t.startsWith('Day '))).toEqual(['Day 1', 'Day 31 (วันนี้)']);
    remount({ currentDay: 1, currentDailySeries: [100] });
    expect(texts().filter(t => t.startsWith('Day '))).toEqual(['Day 1 (วันนี้)', 'Day 31']);
    remount({ currentDay: 12, currentDailySeries: cum(100, 12) });
    expect(texts()).not.toContain('10');
    expect(texts()).toContain('5');
  });
});
