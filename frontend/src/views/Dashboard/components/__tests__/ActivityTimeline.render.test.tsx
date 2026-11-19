// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import ActivityTimeline, { getHeatmapColor } from '../ActivityTimeline';
import { click, q } from '@/test-utils/dom';
import { tc } from '@/constants/theme';

const h = vi.hoisted(() => ({ ctx: {} as Record<string, any> }));
vi.mock('@/views/Dashboard/context/DashboardContext', () => ({ useDashboardContext: () => h.ctx }));

const WORK = { id: 'dt-work', name: 'workday', label: 'วันทำงาน', color: '#3B82F6' };
const HOL = { id: 'dt-hol', name: 'holiday', label: 'วันหยุด', color: '#F59E0B' };
const OT = { id: 'dt-ot', name: 'ot', label: 'โอที', color: '#10B981' };

const range = (from: string, to: string) => {
  const out: string[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  for (const end = new Date(`${to}T00:00:00Z`); d <= end; d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10));
  return out;
};
// 2026-01-01 is a Thursday: week 1 = Thu–Sat, week 2 = Sun 4 – Sat 10.
const JAN = range('2026-01-01', '2026-01-10');
// Fri 30 Jan → Tue 3 Feb: two months, two partial weeks.
const CROSS = range('2026-01-30', '2026-02-03');

const set = (analytics: Record<string, unknown> = {}, ctx: Record<string, unknown> = {}) => {
  h.ctx = {
    analytics: { dayTypeCounts: { 'dt-work': 7, 'dt-hol': 3 }, datesInPeriod: JAN, dailyAllMap: {}, globalMaxThreshold: 600, ...analytics },
    dayTypeConfig: [WORK, HOL, OT], dayTypes: {}, showSkeleton: false, ...ctx,
  };
};

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<ActivityTimeline />));
};
const remount = () => { act(() => root!.unmount()); container!.remove(); mount(); };

/** Reads a colour back the way the DOM stores it, so '#3B82F6' and 'rgb(59, 130, 246)' compare equal. */
const norm = (prop: 'backgroundColor' | 'borderColor', v: string) => {
  const d = document.createElement('div');
  d.style[prop] = v;
  return d.style[prop];
};
const cells = () => [...document.querySelectorAll<HTMLButtonElement>('button[aria-label]')];
const labels = () => cells().map(c => c.getAttribute('aria-label'));
const toggle = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')].find(b => b.textContent?.trim() === text)!;
const rail = () => q<HTMLElement>('div[class*="lg:w-[220px]"]')!;
const clone = () => rail().querySelector<HTMLElement>(':scope > [aria-hidden="true"]');
const liveLegend = () => [...rail().children].filter(c => c.getAttribute('aria-hidden') !== 'true').map(c => c.textContent).join(' ');
const tip = () => document.body.querySelector<HTMLElement>('.fixed.pointer-events-none');
const emptyCells = () => document.querySelectorAll("[data-empty-cell]").length;

const hover = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: null })); });
const leave = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: null })); });
const rectAt = (left: number, top: number, width = 16) =>
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ left, top, width, height: 16, right: left + width, bottom: top + 16, x: left, y: top, toJSON: () => ({}) });

beforeEach(() => {
  // "Today" must not depend on the day the suite runs.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 0, 5, 12));
  set();
});
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ActivityTimeline — spending level mode', () => {
  const spend = { '2026-01-01': 100, '2026-01-02': 300, '2026-01-03': 900 }; // threshold 600 → levels 1, 3, 6
  const openHeatmap = () => click(toggle('ระดับการจ่าย'));

  it('colours a day by how big it is against the highest day, and spells the amount out', () => {
    set({ dailyAllMap: spend });
    mount();
    openHeatmap();
    expect(labels()[0]).toBe('พฤ. 1 ม.ค. 26, ยอดรายจ่าย: 100.00 บาท');
    expect(cells()[0].style.backgroundColor).toBe(norm('backgroundColor', getHeatmapColor(1)));
    expect(cells()[1].style.backgroundColor).toBe(norm('backgroundColor', getHeatmapColor(3)));
    expect(cells()[2].style.backgroundColor).toBe(norm('backgroundColor', getHeatmapColor(6)));
    expect(labels()[2]).toContain('900.00 บาท');
    expect(new Set([0, 1, 2].map(i => cells()[i].style.backgroundColor)).size).toBe(3);
  });

  it('a day with no spend is the canvas colour with a hairline border; a day with spend has none', () => {
    set({ dailyAllMap: spend });
    mount();
    openHeatmap();
    expect(labels()[3]).toBe('อา. 4 ม.ค. 26, ยอดรายจ่าย: ไม่มีรายจ่าย');
    expect(cells()[3].style.backgroundColor).toBe(norm('backgroundColor', tc('canvas')));
    expect(cells()[3].style.borderColor).toBe(norm('borderColor', tc('line')));
    expect(cells()[0].style.borderColor).toBe('transparent');
  });

  it('without a global maximum the scale is 100 ฿', () => {
    set({ dailyAllMap: { '2026-01-01': 50 }, globalMaxThreshold: undefined });
    mount();
    openHeatmap();
    expect(cells()[0].style.backgroundColor).toBe(norm('backgroundColor', getHeatmapColor(3))); // 50 / 100 = level 3
  });

});

describe('ActivityTimeline — legend rail', () => {
  it('day type mode: each type that occurs with its days and share; types that never occur are left out', () => {
    mount();
    expect(liveLegend()).toContain('สรุปประเภทวัน');
    expect(liveLegend()).toContain('วันทำงาน');
    expect(liveLegend()).toContain('(7 วัน / 70.0%)');
    expect(liveLegend()).toContain('วันหยุด');
    expect(liveLegend()).toContain('(3 วัน / 30.0%)');
    expect(liveLegend()).not.toContain('โอที');
  });

  it('spending level mode: a seven-step scale from "น้อย" to "มาก" and the highest day it is measured against', () => {
    mount();
    click(toggle('ระดับการจ่าย'));
    expect(liveLegend()).toContain('ระดับความเข้ม');
    expect(liveLegend()).not.toContain('สรุปประเภทวัน');
    expect(liveLegend()).toContain('น้อย');
    expect(liveLegend()).toContain('มาก');
    expect(liveLegend()).toContain('600.00 ฿');
    const swatches = [...rail().children].filter(c => c.getAttribute('aria-hidden') !== 'true')
      .flatMap(c => [...c.querySelectorAll<HTMLElement>('div.w-3.h-3.shrink-0.border')]);
    expect(swatches).toHaveLength(7);
    expect(swatches.map(s => s.style.backgroundColor)).toEqual([0, 1, 2, 3, 4, 5, 6].map(l => norm('backgroundColor', getHeatmapColor(l))));
    expect(swatches[0].style.borderColor).toBe(norm('borderColor', tc('line-strong')));
    expect(swatches[3].style.borderColor).toBe('transparent');
  });

});

describe('ActivityTimeline — calendar layout', () => {
  const openCalendar = () => click(toggle('ปฏิทินทั่วไป'));
  const cards = () => [...document.querySelectorAll<HTMLElement>('div.w-\\[162px\\]')];

  it('keeps the chosen mode across layouts (spending level stays spending level)', () => {
    set({ dailyAllMap: { '2026-01-01': 600 } });
    mount();
    click(toggle('ระดับการจ่าย'));
    openCalendar();
    expect(labels()[0]).toContain('ยอดรายจ่าย: 600.00 บาท');
    expect(cells()[0].style.backgroundColor).toBe(norm('backgroundColor', getHeatmapColor(6)));
    expect(toggle('ปฏิทินทั่วไป').getAttribute('aria-pressed')).toBe('true');
    expect(toggle('GitHub แนวนอน').getAttribute('aria-pressed')).toBe('false');
  });

});

describe('ActivityTimeline — tooltip', () => {

  it('in spending level mode it shows the amount, or "ไม่มีรายจ่าย"', () => {
    rectAt(100, 200);
    set({ dailyAllMap: { '2026-01-01': 1234.5 } });
    mount();
    click(toggle('ระดับการจ่าย'));
    hover(cells()[0]);
    expect(tip()!.textContent).toContain('1,234.50 ฿');
    hover(cells()[1]);
    expect(tip()!.textContent).toContain('ไม่มีรายจ่าย');
    expect(tip()!.textContent).toContain('ศ. 2 ม.ค. 26');
  });

});
