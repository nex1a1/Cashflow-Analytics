// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { SparklineGraph } from '../SparklineGraph';
import '@/test-utils/dom';

const h = vi.hoisted(() => ({ ctx: {} as Record<string, unknown> }));
vi.mock('@/views/Dashboard/context/DashboardContext', () => ({ useDashboardContext: () => h.ctx }));

const KEYS = ['2026-07', '2026-08', '2026-09', '2026-10'];
// Baht per month; October is the month in progress (today = 10 Oct 2026)
const MAP = {
  a: { '2026-07': 1000, '2026-08': 1000, '2026-09': 1500, '2026-10': 200 }, // +50% vs August
  b: { '2026-07': 800, '2026-08': 800, '2026-09': 600, '2026-10': 100 },    // −25%
  zz: { '2026-09': 300 },                                                     // new in September, no category record
  idle: { '2026-07': 0 },
};
const CATS = [{ id: 'a', name: 'ค่ากิน', color: '#FF0000', icon: 'utensils' }, { id: 'b', name: 'เดินทาง', color: '#00FF00', icon: 'car' }];
const set = (over: Record<string, unknown> = {}) => {
  h.ctx = { analytics: { sortedMonthsKeys: KEYS, monthlyCatMap: MAP }, categories: CATS, filterPeriod: '2026-07_2026-10', ...over };
};

let root: Root | null = null;
let container: HTMLElement;
const mount = () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<SparklineGraph />));
};
const cards = () => [...container.querySelectorAll<HTMLElement>('.group')];
const card = (name: string) => cards().find(c => c.textContent!.includes(name))!;
const badgeOf = (c: HTMLElement) => c.querySelector<HTMLElement>('span[title].cursor-help.border')!;
const hover = (c: HTMLElement, x: number) => {
  const s = c.querySelector<SVGSVGElement>('svg.cursor-crosshair')!;
  s.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 48, right: 100, bottom: 48, x: 0, y: 0, toJSON() {} }) as DOMRect;
  act(() => { s.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x })); });
};
const leave = (c: HTMLElement) => act(() => {
  c.querySelector('svg.cursor-crosshair')!.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-10T12:00:00'));
  set();
});
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('SparklineGraph', () => {

  it('badges growth red, a drop green, and a category with no prior month as new', () => {
    mount();
    const up = badgeOf(card('ค่ากิน'));
    expect(up.textContent).toBe('↑ 50%');
    expect(up.className).toContain('text-danger');
    expect(up.title).toBe('เทียบกับช่วงก่อนหน้า (ส.ค. 26: 1,000 ฿)');
    const down = badgeOf(card('เดินทาง'));
    expect(down.textContent).toBe('↓ 25%');
    expect(down.className).toContain('text-emerald-400');
    const fresh = badgeOf(card('ไม่ระบุ'));
    expect(fresh.textContent).toBe('ใหม่');
    expect(fresh.title).toBe('ช่วงก่อนหน้าไม่มียอดใช้จ่าย');
  });

  it('over the whole history (ALL) compares the latest month with the average', () => {
    set({ filterPeriod: 'ALL' });
    mount();
    const b = badgeOf(card('ค่ากิน'));
    expect(b.textContent).toBe('↑ 62%'); // 1,500 vs an average of 925
    expect(b.title).toBe('เทียบกับค่าเฉลี่ยรวมทั้งช่วง (925 ฿/เดือน)');
  });

  it('shows the average per month and the latest complete month; per cycle in pay-cycle mode', () => {
    mount();
    const c = card('ค่ากิน');
    expect(c.textContent).toContain('925 ฿/เดือน');
    expect(c.textContent).toContain('ล่าสุด 1,500');
    expect(c.querySelector('[title^="ยอดเดือนล่าสุด"]')!.getAttribute('title')).toBe('ยอดเดือนล่าสุด (ก.ย. 26): 1,500 ฿');
    act(() => root!.unmount());
    set({ filterPeriod: 'cycle:2026-07_2026-10' });
    mount();
    expect(card('ค่ากิน').textContent).toContain('฿/รอบ');
    expect(badgeOf(card('ค่ากิน')).title).toBe('เทียบกับช่วงก่อนหน้า (รอบ ก.ค. 26: 1,000 ฿)');
  });

  it('scrubbing the line shows each month, flags the month in progress, and resets on leave', () => {
    mount();
    const c = card('ค่ากิน');
    expect(c.querySelector('line[stroke-dasharray="3 3"]')).not.toBeNull(); // dashed tail into the unfinished month
    hover(c, 0);
    expect(c.textContent).toContain('ก.ค. 26:');
    expect(c.textContent).toContain('1/4');
    expect(c.textContent).not.toContain('(ยังไม่จบ)');
    hover(c, 100);
    expect(c.textContent).toContain('ต.ค. 26:');
    expect(c.textContent).toContain('(ยังไม่จบ)');
    expect(c.textContent).toContain('4/4');
    expect(c.querySelector('.absolute.pointer-events-none')!.textContent).toBe('200 ฿');
    leave(c);
    expect(c.textContent).toContain('925 ฿/เดือน');
    expect(c.querySelector('.absolute.pointer-events-none')).toBeNull();
  });

});
