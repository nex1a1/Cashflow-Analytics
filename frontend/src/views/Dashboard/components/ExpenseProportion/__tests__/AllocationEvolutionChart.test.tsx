// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { AllocationEvolutionChart } from '../AllocationEvolutionChart';
import type { AllocationEvolutionMonth } from '@/utils/allocationEvolutionHelpers';
import { tc } from '@/constants/theme';
import '@/test-utils/dom';

const ro = vi.hoisted(() => ({ cb: null as null | ((e: unknown[]) => void), disconnect: vi.fn() }));
globalThis.ResizeObserver = class {
  constructor(cb: (e: unknown[]) => void) { ro.cb = cb; }
  observe() {}
  disconnect() { ro.disconnect(); }
} as unknown as typeof ResizeObserver;

// Default box 800 × 210: plot x 38 → 784, y 16 (100%) → 184 (0%).
const PAD_L = 38, PLOT_W = 746;
const yOf = (pct: number) => 184 - (pct / 100) * 168;
const xOf = (i: number, n: number) => PAD_L + (i / Math.max(1, n - 1)) * PLOT_W;

/** Percentages of a ฿10,000 income (0/0/0 = a month with nothing recorded); above 100 in sum = overspent. */
const m = (ym: string, need: number, want: number, sav: number): AllocationEvolutionMonth => {
  const total = need + want + sav ? 10000 : 0;
  const overPct = Math.max(0, need + want + sav - 100);
  return {
    ym, needAmt: need * 100, wantAmt: want * 100, savingsAmt: sav * 100, total, needPct: need, wantPct: want, savingsPct: sav,
    overAmt: overPct * 100, overPct, noIncome: false,
  };
};
const MONTHS = [m('2026-06', 40, 20, 40), m('2026-07', 55, 35, 10), m('2026-08', 0, 0, 0), m('2026-09', 30, 10, 60)];
const run = (n: number) => Array.from({ length: n }, (_, i) => m(`20${24 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`, 50, 30, 20));

let root: Root | null = null;
let container: HTMLElement;
const mount = (months = MONTHS, currentKey = '2026-08') => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<AllocationEvolutionChart months={months} currentKey={currentKey} />));
};
const remount = (months = MONTHS, currentKey = '2026-08') => { act(() => root!.unmount()); mount(months, currentKey); };
const svg = () => container.querySelector('svg.cursor-crosshair')!;
const hover = (x: number, width = 800) => {
  const s = svg();
  s.getBoundingClientRect = () => ({ left: 0, top: 0, width, height: 210, right: width, bottom: 210, x: 0, y: 0, toJSON() {} }) as DOMRect;
  act(() => { s.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x })); });
};
const leave = () => act(() => { svg().dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })); });
const tip = () => container.querySelector('g.pointer-events-none');
const ticks = () => [...container.querySelectorAll('text[text-anchor="middle"]')].map(t => t.textContent);
const pct = (label: string) => [...tip()!.querySelectorAll('tspan')].find(s => s.textContent === label)!;
const callout = () => container.querySelector('.text-danger.bg-danger\\/5');

beforeEach(() => { ro.cb = null; ro.disconnect.mockClear(); });
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  document.body.innerHTML = '';
});

describe('AllocationEvolutionChart', () => {
  it('has a plain-Thai legend; the third band is money left over, not savings', () => {
    mount();
    const t = container.textContent!;
    expect(t).toContain('แนวโน้ม 50/30/20');
    expect(t).not.toContain('EVOLUTION');
    expect(t).toContain('NEED เป้า 50%');
    expect(t).toContain('WANT เพดาน 30%');
    expect(t).toContain('SAVE เป้า 20%');
    expect(t).not.toContain('เงินออม');
  });

  it('stacks need, want and leftover to 100%, and collapses an empty month instead of inventing a leftover', () => {
    mount();
    const [need, , leftover] = [...container.querySelectorAll('path[fill-opacity]')].map(p => p.getAttribute('d')!);
    expect(need.startsWith(`M ${PAD_L} ${yOf(40)}`)).toBe(true);
    // leftover band's top edge: 100% for months with data, 0% for the empty August
    expect(leftover).toContain(`L ${xOf(1, 4)} ${yOf(100)}`);
    expect(leftover).toContain(`L ${xOf(2, 4)} ${yOf(0)}`);
    expect(leftover).not.toContain(`L ${xOf(2, 4)} ${yOf(100)}`);
  });

  it('keeps a 0–100% axis with no overspend marks while every month is within income', () => {
    mount();
    expect(container.querySelector('[data-overspend]')).toBeNull();
    expect(container.textContent).not.toContain('100% = รายรับ');
    expect(container.textContent).not.toContain('110%');
  });

  it('grows the axis for an overspent month, hatches the part above income, and clips past 150% with its real %', () => {
    // 120% → axis 0–120%: the 100% line sits at 100/120 of the plot height
    mount([m('2026-06', 40, 20, 40), m('2026-07', 60, 50, 10)]);
    const y120 = (pct: number) => 184 - (pct / 120) * 168;
    expect(container.textContent).toContain('120%');
    expect(container.textContent).toContain('100% = รายรับ');
    const over = container.querySelector('[data-overspend] path')!.getAttribute('d')!;
    expect(over).toContain(`L ${xOf(1, 2)} ${y120(120)}`);
    expect(over).toContain(`L ${xOf(0, 2)} ${y120(100)}`); // June sits on the line: nothing above it

    // 210% is clipped at the 150% cap and labelled
    remount([m('2026-06', 40, 20, 40), m('2025-10', 90, 110, 10)]);
    expect(container.textContent).toContain('150%');
    expect(container.textContent).toContain('210%');
    const leftover = [...container.querySelectorAll('path[fill-opacity]')][2].getAttribute('d')!;
    expect(leftover).toContain(`L ${xOf(1, 2)} 16`);
  });

  it('shows how much went over income in the tooltip and calls it out', () => {
    mount([m('2026-06', 40, 20, 40), m('2026-07', 60, 50, 10)], '2026-07');
    hover(xOf(1, 2));
    expect(tip()!.textContent).toContain('เกินรายรับ ฿2,000.00 (+20%)');
    expect(tip()!.textContent).toContain('ลงทุน ฿1,000.00'); // nothing left over: the band is investing only
    expect(tip()!.textContent).not.toContain('เหลือ');
    expect(callout()!.textContent).toContain('ใช้เกินรายรับ');
  });

  it('labels every month up to 12, then every 2nd / 3rd with the last one pinned and no crowded neighbour', () => {
    mount();
    expect(ticks()).toEqual(["มิ.ย. '26", "ก.ค. '26", "ส.ค. '26", "ก.ย. '26"]);
    remount(run(14));
    expect(ticks()).toEqual(["ม.ค. '24", "มี.ค. '24", "พ.ค. '24", "ก.ค. '24", "ก.ย. '24", "พ.ย. '24", "ก.พ. '25"]);
    remount(run(26));
    expect(ticks()).toHaveLength(9);
    expect(ticks()[8]).toBe("ก.พ. '26");
    expect(ticks()).not.toContain("ม.ค. '26"); // index 24 sits right before the pinned last tick
  });

  it('hovering a month shows its baht and percentages, red where a target is missed', () => {
    mount();
    expect(tip()).toBeNull();
    hover(xOf(1, 4));
    const t = tip()!.textContent!;
    expect(t).toContain('ก.ค. 2026');
    expect(t).toContain('จำเป็น ฿5,500.00');
    expect(t).toContain('ตามใจ ฿3,500.00');
    expect(t).toContain('เหลือ ฿1,000.00');
    for (const p of ['(55%)', '(35%)', '(10%)']) expect(pct(p).getAttribute('fill')).toBe(tc('danger'));
    expect(tip()!.querySelectorAll('circle')).toHaveLength(3);
    hover(xOf(0, 4));
    for (const p of ['(40%)', '(20%)']) expect(pct(p).getAttribute('fill')).toBe(tc('ink-soft'));
    expect(pct('(40%)').getAttribute('fill')).toBe(tc('ink-soft'));
  });

  it('says "no data" for an empty month, shows a hovered tick even off-stride, and clears on leave', () => {
    mount();
    hover(xOf(2, 4));
    expect(tip()!.textContent).toContain('ไม่มีข้อมูล');
    expect(tip()!.querySelectorAll('circle')).toHaveLength(0);
    leave();
    expect(tip()).toBeNull();
    remount(run(14));
    hover(xOf(1, 14));
    expect(ticks()).toContain("ก.พ. '24");
    hover(xOf(1, 14), 0); // unmeasured box: keep what is shown
    expect(ticks()).toContain("ก.พ. '24");
  });

  it('keeps the tooltip inside the chart near the right edge', () => {
    mount();
    hover(xOf(3, 4));
    const x = Number(tip()!.querySelector('g[transform]')!.getAttribute('transform')!.match(/translate\(([-\d.]+)/)![1]);
    expect(x).toBeCloseTo(xOf(3, 4) - 196 - 12);
  });

  it('calls out the latest month up to now that has data, skipping future-dated and empty ones', () => {
    mount();
    expect(callout()!.textContent).toBe('ก.ค. 2026: รายจ่ายจำเป็นเกินเป้า • รายจ่ายตามใจเกินเพดาน • เงินเหลือต่ำกว่าเป้า');
    remount(MONTHS, '2026-06'); // June is on target: nothing to say
    expect(callout()).toBeNull();
    remount([m('2026-06', 50, 31, 19)], '2026-01'); // only future months: judge the last one
    expect(callout()!.textContent).toBe('มิ.ย. 2026: รายจ่ายตามใจเกินเพดาน • เงินเหลือต่ำกว่าเป้า');
    remount([m('2026-06', 0, 0, 0)], '2026-12');
    expect(callout()).toBeNull();
  });

  it('fills whatever box it is given and stops observing on unmount', () => {
    mount();
    act(() => ro.cb!([{ contentRect: { width: 640, height: 300 } }]));
    expect(svg().getAttribute('viewBox')).toBe('0 0 640 300');
    act(() => ro.cb!([{ contentRect: { width: 0, height: 0 } }]));
    expect(svg().getAttribute('viewBox')).toBe('0 0 640 300');
    act(() => root!.unmount()); root = null;
    expect(ro.disconnect).toHaveBeenCalledTimes(1);
  });
});
