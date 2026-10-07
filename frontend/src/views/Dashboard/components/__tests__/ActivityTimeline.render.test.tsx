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
const clone = () => rail().querySelector<HTMLElement>('[aria-hidden="true"]');
const liveLegend = () => [...rail().children].filter(c => c.getAttribute('aria-hidden') !== 'true').map(c => c.textContent).join(' ');
const tip = () => document.body.querySelector<HTMLElement>('.fixed.pointer-events-none');
const emptyCells = (cls: string) => document.querySelectorAll(`div.${cls}.bg-transparent`).length;

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

describe('ActivityTimeline — when it shows', () => {
  it('renders nothing when the period has no day-type counts', () => {
    set({ dayTypeCounts: {} });
    mount();
    expect(container!.innerHTML).toBe('');
    remount();
    set({ dayTypeCounts: undefined });
    remount();
    expect(container!.innerHTML).toBe('');
  });

  it('while loading it shows a placeholder instead of cells and legend — even before any counts exist', () => {
    set({ dayTypeCounts: {} }, { showSkeleton: true });
    mount();
    expect(container!.textContent).toContain('ปฏิทินการใช้จ่าย');
    expect(cells()).toHaveLength(0);
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(2);
    expect(liveLegend()).not.toContain('สรุปประเภทวัน');
  });

  it('says so when the period has no dates', () => {
    set({ datesInPeriod: [] });
    mount();
    expect(container!.textContent).toContain('ไม่มีรายการในวันที่เลือก');
    expect(cells()).toHaveLength(0);
  });
});

describe('ActivityTimeline — GitHub layout', () => {
  it('draws one button per date, named with the Thai weekday, date and day type', () => {
    mount();
    expect(cells()).toHaveLength(10);
    expect(labels()[0]).toBe('พฤ. 1 ม.ค. 26, ประเภทวัน: วันทำงาน');
    expect(labels()[2]).toBe('ส. 3 ม.ค. 26, ประเภทวัน: วันหยุด');
    expect(labels()[3]).toBe('อา. 4 ม.ค. 26, ประเภทวัน: วันหยุด');
    expect(labels()[4]).toBe('จ. 5 ม.ค. 26, ประเภทวัน: วันทำงาน');
  });

  it('a day the user marked wins over the weekday default — whether the map holds an object or just the id', () => {
    set({}, { dayTypes: { '2026-01-02': { id: 'dt-ot' }, '2026-01-03': 'dt-work' } });
    mount();
    expect(labels()[1]).toContain('ประเภทวัน: โอที');
    expect(labels()[2]).toContain('ประเภทวัน: วันทำงาน'); // a Saturday forced to workday
  });

  it('an unknown type id falls back to the weekday default instead of breaking', () => {
    set({}, { dayTypes: { '2026-01-01': { id: 'deleted-type' } } });
    mount();
    expect(labels()[0]).toContain('ประเภทวัน: วันทำงาน');
  });

  it('weekday defaults: workday on weekdays, holiday on weekends; without those names it uses the first / second type', () => {
    set({}, { dayTypeConfig: [{ id: 'a', name: 'a', label: 'แรก', color: '#111111' }, { id: 'b', name: 'b', label: 'สอง', color: '#222222' }] });
    mount();
    expect(labels()[0]).toContain('แรก');  // Thursday
    expect(labels()[2]).toContain('สอง');  // Saturday
    remount();
    set({}, { dayTypeConfig: [{ id: 'only', name: 'only', label: 'เดียว', color: '#111111' }] });
    remount();
    expect(labels()[2]).toContain('เดียว'); // one type serves weekends too
  });

  it('finds the default types by name, wherever they sit in the list', () => {
    set({}, { dayTypeConfig: [OT, WORK, HOL] }); // index 0 is neither default
    mount();
    expect(labels()[0]).toContain('ประเภทวัน: วันทำงาน'); // Thursday
    expect(labels()[2]).toContain('ประเภทวัน: วันหยุด');  // Saturday
  });

  it('with no day types at all it still renders, as "ทั่วไป"', () => {
    set({}, { dayTypeConfig: [] });
    mount();
    expect(labels()[0]).toContain('ประเภทวัน: ทั่วไป');
    expect(cells()).toHaveLength(10);
  });

  it('colours each cell with its day type (a type without a colour uses the line colour)', () => {
    set({}, { dayTypes: { '2026-01-02': { id: 'dt-ot' } }, dayTypeConfig: [WORK, HOL, { id: 'dt-ot', name: 'ot', label: 'โอที', color: null }] });
    mount();
    expect(cells()[0].style.backgroundColor).toBe(norm('backgroundColor', WORK.color));
    expect(cells()[2].style.backgroundColor).toBe(norm('backgroundColor', HOL.color));
    expect(cells()[1].style.backgroundColor).toBe(norm('backgroundColor', tc('line')));
  });

  it('lays out Sun–Sat rows by week, padding the partial first week', () => {
    mount();
    // Jan 1 is a Thursday → Sun–Wed of week 1 are empty; week 2 is full.
    expect(emptyCells('w-4.h-4')).toBe(4);
    const weeks = [...document.querySelectorAll('div.flex.flex-col.gap-\\[1px\\].shrink-0')].filter(w => w.querySelector('button'));
    expect(weeks.map(w => w.querySelectorAll('button').length)).toEqual([3, 7]);
  });

  it('pads the last partial week too, and labels the weeks where a month starts', () => {
    set({ datesInPeriod: CROSS, dayTypeCounts: { 'dt-work': 3, 'dt-hol': 2 } });
    mount();
    expect(cells()).toHaveLength(5);
    expect(emptyCells('w-4.h-4')).toBe(5 + 4); // Fri+Sat week (5 empty) and Sun–Tue week (4 empty)
    const monthLabels = [...document.querySelectorAll('span.uppercase.tracking-tighter')].map(s => s.textContent);
    expect(monthLabels).toEqual(['ม.ค. 26', 'ก.พ. 26']);
  });

  it('a single month is labelled once, at its first week', () => {
    mount();
    expect([...document.querySelectorAll('span.uppercase.tracking-tighter')].map(s => s.textContent)).toEqual(['ม.ค. 26']);
  });

  it('a period that starts mid-month is labelled with that month, not left without a label', () => {
    set({ datesInPeriod: range('2026-01-14', '2026-01-20'), dayTypeCounts: { 'dt-work': 5, 'dt-hol': 2 } });
    mount();
    expect([...document.querySelectorAll('span.uppercase.tracking-tighter')].map(s => s.textContent)).toEqual(['ม.ค. 26']);
  });

  it('weekday rail: seven labels, weekends marked', () => {
    mount();
    const rows = [...document.querySelectorAll<HTMLElement>('div.h-4.flex.items-center.justify-end')];
    expect(rows.map(r => r.textContent)).toEqual(['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']);
    expect(rows.map(r => r.className.includes('text-weekend'))).toEqual([true, false, false, false, false, false, true]);
  });

  it('rings today only', () => {
    mount();
    const ringed = cells().filter(c => c.classList.contains('ring-1'));
    expect(ringed).toHaveLength(1);
    expect(ringed[0].getAttribute('aria-label')).toContain('จ. 5 ม.ค. 26');
  });

  it('no ring at all when today is outside the period', () => {
    vi.setSystemTime(new Date(2026, 5, 1, 12));
    mount();
    expect(cells().some(c => c.classList.contains('ring-1'))).toBe(false);
  });
});

describe('ActivityTimeline — spending level mode', () => {
  const spend = { '2026-01-01': 100, '2026-01-02': 300, '2026-01-03': 900 }; // threshold 600 → levels 1, 3, 6
  const openHeatmap = () => click(toggle('ระดับการจ่าย'));

  it('starts on day type; the toggle swaps to spending level and back', () => {
    set({ dailyAllMap: spend });
    mount();
    expect(toggle('ประเภทวัน').getAttribute('aria-pressed')).toBe('true');
    expect(toggle('ระดับการจ่าย').getAttribute('aria-pressed')).toBe('false');
    openHeatmap();
    expect(toggle('ประเภทวัน').getAttribute('aria-pressed')).toBe('false');
    expect(toggle('ระดับการจ่าย').getAttribute('aria-pressed')).toBe('true');
    click(toggle('ประเภทวัน'));
    expect(labels()[0]).toContain('ประเภทวัน:');
  });

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

  it('keeps today ringed in this mode', () => {
    mount();
    openHeatmap();
    expect(cells().filter(c => c.classList.contains('ring-1'))).toHaveLength(1);
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

  it('shares are of the days counted, not of the days in the period', () => {
    set({ dayTypeCounts: { 'dt-work': 1, 'dt-hol': 2, 'dt-ot': 1 } });
    mount();
    expect(liveLegend()).toContain('(1 วัน / 25.0%)');
    expect(liveLegend()).toContain('(2 วัน / 50.0%)');
    expect(liveLegend()).toContain('โอที');
  });

  it('a type with no colour gets a neutral swatch', () => {
    set({ dayTypeCounts: { 'dt-ot': 2 } }, { dayTypeConfig: [WORK, HOL, { id: 'dt-ot', name: 'ot', label: 'โอที', color: null }] });
    mount();
    const swatch = rail().querySelector<HTMLElement>('div.w-3.h-3.border-black\\/20')!;
    expect(swatch.style.backgroundColor).toBe(norm('backgroundColor', '#475569'));
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

  it('GitHub layout keeps a hidden copy of the OTHER mode so the rail never changes height', () => {
    mount();
    expect(clone()!.textContent).toContain('ระดับความเข้ม');
    expect(clone()!.className).toContain('invisible');
    click(toggle('ระดับการจ่าย'));
    expect(clone()!.textContent).toContain('สรุปประเภทวัน');
  });

  it('the rail is as tall as the taller of the two modes (GitHub layout only)', () => {
    const desc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')!;
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get(this: HTMLElement) { return this.getAttribute('aria-hidden') === 'true' ? 300 : 120; },
    });
    try {
      mount();
      expect(rail().style.minHeight).toBe('300px');
      click(toggle('ปฏิทินทั่วไป'));
      expect(rail().style.minHeight).toBe(''); // calendar layout sizes itself
      expect(clone()).toBeNull();
      click(toggle('GitHub แนวนอน'));
      expect(rail().style.minHeight).toBe('300px');
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', desc);
    }
  });

  it('does not pin a height when nothing can be measured', () => {
    mount();
    expect(rail().style.minHeight).toBe('');
  });
});

describe('ActivityTimeline — calendar layout', () => {
  const openCalendar = () => click(toggle('ปฏิทินทั่วไป'));
  const cards = () => [...document.querySelectorAll<HTMLElement>('div.w-\\[162px\\]')];

  it('one card per month, titled in Thai, with a Sun–Sat header', () => {
    set({ datesInPeriod: CROSS, dayTypeCounts: { 'dt-work': 3, 'dt-hol': 2 } });
    mount();
    openCalendar();
    expect(cards()).toHaveLength(2);
    expect(cards().map(c => c.querySelector('span')!.textContent)).toEqual(['ม.ค. 26', 'ก.พ. 26']);
    expect([...cards()[0].querySelectorAll('div.w-\\[20px\\].text-center')].map(d => d.textContent)).toEqual(['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']);
  });

  it('the card header marks Saturday and Sunday as weekend', () => {
    mount();
    openCalendar();
    const head = [...cards()[0].querySelectorAll<HTMLElement>('div.w-\\[20px\\].text-center')];
    expect(head.map(d => d.className.includes('text-weekend'))).toEqual([true, false, false, false, false, false, true]);
  });

  it('months are in time order even when the dates arrive out of order', () => {
    set({ datesInPeriod: ['2026-02-02', '2026-01-30'], dayTypeCounts: { 'dt-work': 2 } });
    mount();
    openCalendar();
    expect(cards().map(c => c.querySelector('span')!.textContent)).toEqual(['ม.ค. 26', 'ก.พ. 26']);
  });

  it('draws the whole month, but only the days in the period are buttons; the rest are dimmed', () => {
    mount();
    openCalendar();
    expect(cards()).toHaveLength(1);
    const card = cards()[0];
    expect(card.querySelectorAll('button')).toHaveLength(10);
    expect(card.querySelectorAll('div.opacity-20')).toHaveLength(21); // 31 − 10
    expect(card.querySelectorAll('div.w-\\[20px\\].h-\\[20px\\].bg-transparent')).toHaveLength(4); // Jan 1 is a Thursday
  });

  it('February 2026 starts on a Sunday (no padding) and has 28 days', () => {
    set({ datesInPeriod: range('2026-02-01', '2026-02-03'), dayTypeCounts: { 'dt-work': 3 } });
    mount();
    openCalendar();
    const card = cards()[0];
    expect(card.querySelectorAll('div.bg-transparent.w-\\[20px\\]')).toHaveLength(0);
    expect(card.querySelectorAll('button')).toHaveLength(3);
    expect(card.querySelectorAll('div.opacity-20')).toHaveLength(25);
  });

  it('cells carry the same names, colours and today ring as the GitHub layout', () => {
    mount();
    const before = labels();
    openCalendar();
    expect(labels()).toEqual(before);
    expect(cells()[0].style.backgroundColor).toBe(norm('backgroundColor', WORK.color));
    expect(cells().filter(c => c.classList.contains('ring-1'))).toHaveLength(1);
  });

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

  it('keeps the legend', () => {
    mount();
    openCalendar();
    expect(liveLegend()).toContain('(7 วัน / 70.0%)');
  });
});

describe('ActivityTimeline — tooltip', () => {
  it('shows nothing until a day is hovered', () => {
    mount();
    expect(tip()).toBeNull();
  });

  it('hover shows the date and day type, centred over the cell; leaving hides it', () => {
    rectAt(100, 200);
    mount();
    hover(cells()[0]);
    const t = tip()!;
    expect(t.textContent).toContain('พฤ. 1 ม.ค. 26');
    expect(t.textContent).toContain('วันทำงาน');
    expect(t.style.left).toBe('108px'); // 100 + 16 / 2
    expect(t.style.top).toBe('194px');  // 6px above the cell
    leave(cells()[0]);
    expect(tip()).toBeNull();
  });

  it('is portalled to the body, not clipped inside the card', () => {
    rectAt(100, 200);
    mount();
    hover(cells()[0]);
    expect(container!.contains(tip())).toBe(false);
    expect(tip()!.parentElement).toBe(document.body);
  });

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

  it('keeps the tooltip inside the window on both sides, and below the top edge', () => {
    mount();
    rectAt(0, 200);
    hover(cells()[0]);
    expect(tip()!.style.left).toBe('70px');
    vi.restoreAllMocks();
    rectAt(5000, 200);
    hover(cells()[0]);
    expect(tip()!.style.left).toBe(`${window.innerWidth - 70}px`);
    vi.restoreAllMocks();
    rectAt(300, 3);
    hover(cells()[0]);
    expect(tip()!.style.top).toBe('10px');
  });

  it('works from the keyboard: focus shows it, blur hides it', () => {
    rectAt(100, 200);
    mount();
    act(() => cells()[4].focus());
    expect(tip()!.textContent).toContain('จ. 5 ม.ค. 26');
    act(() => cells()[4].blur());
    expect(tip()).toBeNull();
  });

  it('works in the calendar layout as well', () => {
    rectAt(100, 200);
    mount();
    click(toggle('ปฏิทินทั่วไป'));
    hover(cells()[2]);
    expect(tip()!.textContent).toContain('ส. 3 ม.ค. 26');
    expect(tip()!.textContent).toContain('วันหยุด');
  });

  it('a marked day shows its own type', () => {
    rectAt(100, 200);
    set({}, { dayTypes: { '2026-01-01': { id: 'dt-ot' } } });
    mount();
    hover(cells()[0]);
    expect(tip()!.textContent).toContain('โอที');
  });
});
