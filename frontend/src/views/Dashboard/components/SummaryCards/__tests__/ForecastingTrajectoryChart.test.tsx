// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ForecastingTrajectoryChart } from '../Forecasting/ForecastingTrajectoryChart';
import { tc } from '@/constants/theme';
import '@/test-utils/dom';

const ro = vi.hoisted(() => ({ cb: null as null | ((e: unknown[]) => void), disconnect: vi.fn() }));
globalThis.ResizeObserver = class {
  constructor(cb: (e: unknown[]) => void) { ro.cb = cb; }
  observe() {}
  disconnect() { ro.disconnect(); }
} as unknown as typeof ResizeObserver;

// Geometry of the chart at its default 800-unit width: plot runs x 54 → 664, y 20 → 176.
const PAD_L = 54, PLOT_W = 610, BASE = 176;
const dayX = (d: number, days = 30) => PAD_L + (d / days) * PLOT_W;

const SERIES = [1000, 1000, 2500, 3000, 3000, 4000, 5000, 5200, 6000, 7000];
const base = {
  currentDay: 10, lastDayOfMonth: 30, maxAllowedExpense: 30000,
  fixedTotal: 0, variableUpToToday: 0,
  projectedExpense: 21000, projectedSurplus: 9000, actualDailySeries: SERIES,
};
type Props = typeof base;

let root: Root | null = null;
let container: HTMLElement;
const mount = (p: Partial<Props> = {}) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<ForecastingTrajectoryChart {...base} {...p} />));
};
const svg = () => container.querySelector('svg')!;
const hover = (x: number, width = 800) => {
  const s = svg();
  s.getBoundingClientRect = () => ({ left: 0, top: 0, width, height: 202, right: width, bottom: 202, x: 0, y: 0, toJSON() {} }) as DOMRect;
  act(() => { s.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x })); });
};
const leave = () => act(() => { svg().dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })); });
const tip = () => container.querySelector('g.pointer-events-none');
const texts = () => [...container.querySelectorAll('text')].map(t => t.textContent ?? '');
const dayLabels = () => texts().filter(t => t.startsWith('Day '));
const badge = (prefix: string) => [...container.querySelectorAll('g[transform]')].find(g => g.textContent?.startsWith(prefix))!;
const translate = (g: Element) => g.getAttribute('transform')!.match(/translate\(([-\d.]+), ([-\d.]+)\)/)!.slice(1).map(Number);
const pathBy = (width: string) => [...container.querySelectorAll('path')].find(p => p.getAttribute('stroke-width') === width)!;

beforeEach(() => { ro.cb = null; ro.disconnect.mockClear(); });
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  document.body.innerHTML = '';
});

describe('ForecastingTrajectoryChart', () => {
  it('labels spend to date, the month-end projection and the ceiling, with quarter marks of the ceiling on the axis', () => {
    mount();
    const all = texts();
    expect(all).toContain('วันนี้: ฿7,000.00');
    expect(all).toContain('จบเดือน ฿21,000.00');
    expect(all).toContain('เพดาน ฿30,000.00');
    for (const v of ['฿30,000', '฿22,500', '฿15,000', '฿7,500', '฿0']) expect(all).toContain(v);
    // one point per recorded day after the ฿0 start of the month, starting at the baseline
    const d = pathBy('2.5').getAttribute('d')!;
    expect(d.startsWith(`M ${PAD_L} ${BASE}`)).toBe(true);
    expect(d.split(' L ')).toHaveLength(SERIES.length + 1);
  });

  it('falls back to fixed + day-to-day spend when there is no daily series yet', () => {
    mount({ actualDailySeries: [], fixedTotal: 4000, variableUpToToday: 1500 });
    expect(texts()).toContain('วันนี้: ฿5,500.00');
    hover(dayX(10)); // the tooltip agrees with the pill
    expect(tip()!.textContent).toContain('สะสม: ฿5,500.00');
  });

  it('draws the projection green while it ends under the ceiling and red once it ends over it', () => {
    mount();
    expect(pathBy('2').getAttribute('stroke')).toBe(tc('income'));
    expect(container.querySelector('.border-dashed.border-emerald-400')).not.toBeNull();
    act(() => root!.unmount());
    mount({ projectedExpense: 33000, projectedSurplus: -3000 });
    expect(pathBy('2').getAttribute('stroke')).toBe(tc('expense'));
    expect(container.querySelector('.border-dashed.border-danger')).not.toBeNull();
  });

  it('maps its viewBox 1:1 to the measured width and stops observing on unmount', () => {
    mount();
    expect(svg().getAttribute('viewBox')).toBe('0 0 800 202');
    act(() => ro.cb!([{ contentRect: { width: 1000.4, height: 202 } }]));
    expect(svg().getAttribute('viewBox')).toBe('0 0 1000 202');
    act(() => ro.cb!([{ contentRect: { width: 0, height: 0 } }])); // hidden card: keep the last width
    expect(svg().getAttribute('viewBox')).toBe('0 0 1000 202');
    act(() => root!.unmount()); root = null;
    expect(ro.disconnect).toHaveBeenCalledTimes(1);
  });

  it('hovering a past day shows what was spent that day, the running total and its share of the ceiling', () => {
    mount();
    expect(tip()).toBeNull();
    hover(dayX(1));
    expect(tip()!.textContent).toContain('Day 1');
    expect(tip()!.textContent).toContain('+฿1,000');
    hover(dayX(2)); // nothing new that day
    expect(tip()!.textContent).toContain('฿0');
    expect(tip()!.textContent).not.toContain('+฿');
    expect(tip()!.textContent).toContain('สะสม: ฿1,000.00');
    expect(tip()!.textContent).toContain('3% เพดาน');
    hover(dayX(3));
    expect(tip()!.textContent).toContain('+฿1,500');
    expect(tip()!.textContent).toContain('สะสม: ฿2,500.00');
    expect(tip()!.textContent).toContain('8% เพดาน');
  });

  it('marks today, and projects future days along the straight line to the month-end estimate', () => {
    mount();
    hover(dayX(10));
    expect(tip()!.textContent).toContain('(วันนี้)');
    expect(tip()!.textContent).toContain('+฿1,000');
    hover(dayX(20));
    const t = tip()!.textContent!;
    expect(t).toContain('(คาดการณ์)');
    expect(t).toContain('วันละ ฿700'); // (21,000 − 7,000) / 20 days left
    expect(t).toContain('สะสม: ฿14,000.00'); // halfway from 7,000 to 21,000
    expect(t).toContain('47% เพดาน');
    expect(tip()!.querySelector('line')!.getAttribute('stroke')).toBe(tc('income'));
  });

  it('clears the tooltip outside the plot and when the mouse leaves; ignores an unmeasured box', () => {
    mount();
    hover(dayX(5));
    hover(PAD_L - 10);
    expect(tip()).toBeNull();
    hover(dayX(5));
    leave();
    expect(tip()).toBeNull();
    hover(dayX(5));
    hover(dayX(9), 0); // unmeasured box: keep what is shown
    expect(tip()!.textContent).toContain('Day 5');
  });

  it('flags a running total over the ceiling in red and uses the danger colour for a deficit projection', () => {
    mount({ currentDay: 1, actualDailySeries: [35000], projectedExpense: 40000, projectedSurplus: -10000 });
    hover(dayX(1));
    const pct = [...tip()!.querySelectorAll('tspan')].find(s => s.textContent === '117%')!;
    expect(pct.getAttribute('fill')).toBe(tc('danger'));
    hover(dayX(5));
    expect(tip()!.querySelector('line')!.getAttribute('stroke')).toBe(tc('danger'));
  });

  it('keeps the tooltip inside the chart near the right edge', () => {
    mount();
    hover(dayX(30));
    const [x] = translate(tip()!.querySelector('g[transform]')!);
    expect(x).toBeCloseTo(dayX(30) - 192 - 12);
  });

  it('pushes the month-end and ceiling badges 16 apart when their values are close, either way round', () => {
    mount({ projectedExpense: 29000, projectedSurplus: 1000 });
    expect(translate(badge('จบเดือน'))[1] - translate(badge('เพดาน'))[1]).toBeCloseTo(16);
    expect(translate(badge('เพดาน'))[1]).toBeCloseTo(BASE - 156 / 1.12 - 7); // the ceiling badge stays on its line
    act(() => root!.unmount());
    mount({ projectedExpense: 31000, projectedSurplus: -1000 });
    expect(translate(badge('เพดาน'))[1] - translate(badge('จบเดือน'))[1]).toBeCloseTo(16);
  });

  it('puts the today pill above the dot, or below it when the dot is near the top, and never past the plot', () => {
    mount();
    const dot = () => Number([...container.querySelectorAll('circle')].find(c => c.getAttribute('r') === '2.5')!.getAttribute('cy'));
    expect(translate(badge('วันนี้:'))[1]).toBeLessThan(dot());
    act(() => root!.unmount());
    mount({ currentDay: 30, actualDailySeries: Array.from({ length: 30 }, (_, i) => (i + 1) * 1100), projectedExpense: 33000, projectedSurplus: -3000 });
    const [x, y] = translate(badge('วันนี้:'));
    expect(y).toBeGreaterThan(dot());
    expect(x).toBeCloseTo(dayX(30) - 52); // half the pill width in from the plot's right edge
  });

  it('never prints two axis labels on top of each other (first day, last day, ticks next to today)', () => {
    mount({ currentDay: 30, actualDailySeries: Array.from({ length: 30 }, () => 100) });
    expect(dayLabels()).toEqual(['Day 1', 'Day 30 (วันนี้)']);
    act(() => root!.unmount());
    mount({ currentDay: 1, actualDailySeries: [100] });
    expect(dayLabels()).toEqual(['Day 1 (วันนี้)', 'Day 30']);
    act(() => root!.unmount());
    mount({ currentDay: 12, actualDailySeries: Array.from({ length: 12 }, () => 100) });
    // "Day 12 (วันนี้)" is ~95px wide around today: tick 10 (41px away) would collide, 5 and 15 do not
    expect(texts()).not.toContain('10');
    expect(texts()).toContain('5');
    expect(texts()).toContain('15');
  });
});
