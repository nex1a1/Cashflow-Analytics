// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import CalendarBlock, { CalendarBlockProps } from '../CalendarBlock';
import { periodUnitDates } from '@/utils/dateHelpers';
import { click } from '@/test-utils/dom';
import { DAY_TYPES, tx } from '../../__tests__/fixtures';

let root: Root | null = null;
let container: HTMLElement | null = null;

const NOV = periodUnitDates('2026-11', false); // 1 พ.ย. 2026 = Sunday, 30 days
const OCT = periodUnitDates('2026-10', false); // 1 ต.ค. 2026 = Thursday, 31 days
const CYCLE = periodUnitDates('2026-09', true); // 25 ก.ย. (Friday) → 24 ต.ค. 2026

const props = (over: Partial<CalendarBlockProps> = {}): CalendarBlockProps => ({
  dates: NOV,
  title: 'พฤศจิกายน 2026',
  firstDayOfMonth: 0,
  suffixDaysCount: 5,
  monthInc: 0,
  monthExp: 0,
  monthNet: 0,
  monthSav: 0,
  calendarData: {},
  dayTypes: {},
  dayTypeConfig: DAY_TYPES,
  dayTypeCounts: {},
  handleDayTypeChange: vi.fn(),
  onSelectDate: vi.fn(),
  excludedCategoryIds: new Set(),
  toggleCategory: vi.fn(),
  maxDailyExpense: 0,
  ...over,
});

const mount = (p: CalendarBlockProps) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<CalendarBlock {...p} />));
  return p;
};
const text = () => container!.textContent ?? '';
const pills = () => [...container!.querySelectorAll<HTMLElement>('h2 + div > span')];
const pill = (prefix: string) => pills().find(p => p.textContent!.startsWith(prefix));
const grid = () => container!.querySelectorAll('.grid.grid-cols-7')[1] as HTMLElement;
const dayBtn = (label: string) => container!.querySelector<HTMLButtonElement>(`button[aria-label="ดูรายละเอียดวันที่ ${label}"]`);
const cellOf = (label: string) => dayBtn(label)!.closest('.group') as HTMLElement;
const blanks = () => [...grid().children].filter(c => !c.querySelector('button'));
const five = (date: string) => ({ exp: 500, inc: 0, items: Array.from({ length: 5 }, (_, i) => tx(`${date}_${i}`, date, 100)), incItems: [] });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 12));
});
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  document.body.innerHTML = '';
  root = null; container = null;
  vi.useRealTimers();
});

describe('CalendarBlock header', () => {
  it('title only when the month is empty', () => {
    mount(props());
    expect(container!.querySelector('h2')!.textContent).toBe('พฤศจิกายน 2026');
    expect(pills()).toHaveLength(0);
  });

  it('income, expense and a positive balance in green', () => {
    mount(props({ monthInc: 10000, monthExp: 4000, monthNet: 6000 }));
    expect(pill('▲')!.textContent).toBe('▲ ฿10,000.00');
    expect(pill('▼')!.textContent).toBe('▼ ฿4,000.00');
    expect(pill('คงเหลือ')!.textContent).toBe('คงเหลือ ฿6,000.00');
    expect(pill('คงเหลือ')!.classList.contains('text-income')).toBe(true);
  });

  it('a deficit reads −฿ in danger red', () => {
    mount(props({ monthExp: 500, monthNet: -500 }));
    expect(pill('▲')).toBeUndefined();
    expect(pill('คงเหลือ')!.textContent).toBe('คงเหลือ −฿500.00');
    expect(pill('คงเหลือ')!.classList.contains('text-danger')).toBe(true);
  });

  it('a zero balance after spending everything is green', () => {
    mount(props({ monthInc: 100, monthExp: 100, monthNet: 0 }));
    expect(pill('คงเหลือ')!.textContent).toBe('คงเหลือ ฿0.00');
    expect(pill('คงเหลือ')!.classList.contains('text-income')).toBe(true);
  });

  it('income only still shows the balance', () => {
    mount(props({ monthInc: 100, monthNet: 100 }));
    expect(pill('▼')).toBeUndefined();
    expect(pill('คงเหลือ')).toBeDefined();
  });

  it('net invested shows inside the balance; net sells read −฿', () => {
    mount(props({ monthSav: 1500 }));
    expect(pill('ในนี้')!.textContent).toBe('ในนี้ลงทุน/ออม ฿1,500.00');
    act(() => root!.render(<CalendarBlock {...props({ monthSav: -200 })} />));
    expect(pill('ในนี้')!.textContent).toBe('ในนี้ลงทุน/ออม −฿200.00');
  });

  it('hidden categories: count + a button that shows them all', () => {
    const p = mount(props({ excludedCategoryIds: new Set(['a', 'b']) }));
    const btn = [...container!.querySelectorAll('button')].find(b => b.textContent!.includes('ซ่อน 2 หมวดหมู่'))!;
    click(btn);
    expect(p.toggleCategory).toHaveBeenCalledWith('CLEAR_ALL');
    expect(p.onSelectDate).not.toHaveBeenCalled();
  });

  it('no hide button when nothing is hidden', () => {
    mount(props());
    expect(text()).not.toContain('ซ่อน');
  });
});

describe('CalendarBlock grid', () => {
  it('weekday header with weekends bold', () => {
    mount(props());
    const heads = [...container!.querySelectorAll('.grid.grid-cols-7')[0].children];
    expect(heads.map(h => h.textContent)).toEqual(['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']);
    expect(heads[0].className).toContain('text-weekend');
    expect(heads[6].className).toContain('text-weekend');
    expect(heads[1].className).toContain('text-ink-soft');
    expect(heads[1].className).not.toContain('text-weekend');
  });

  it('leading and trailing blank cells fill whole weeks', () => {
    mount(props({ dates: OCT, firstDayOfMonth: 4, suffixDaysCount: 0 }));
    expect(blanks()).toHaveLength(4);
    expect(grid().children[4].querySelector('button')!.textContent).toBe('1');
    act(() => root!.render(<CalendarBlock {...props()} />));
    expect(blanks()).toHaveLength(5);
    expect(grid().children[0].querySelector('button')!.textContent).toBe('1');
    expect(grid().children).toHaveLength(35);
  });

  it('a 6-day lead and a 2-week tail are possible', () => {
    mount(props({ dates: OCT.slice(0, 1), firstDayOfMonth: 6, suffixDaysCount: 14 }));
    expect(blanks()).toHaveLength(20);
  });

  it('today is marked, weekends use the holiday type, explicit types win', () => {
    mount(props({ dayTypes: { '2026-11-02': 'dt_ot' } }));
    expect(dayBtn('9')!.getAttribute('aria-current')).toBe('date');
    expect(dayBtn('10')!.hasAttribute('aria-current')).toBe(false);
    const badge = (d: string) => cellOf(d).querySelector('.day-type-badge')!.textContent;
    expect(badge('1')).toBe('หยุด'); // Sunday
    expect(badge('3')).toBe('ทำงาน'); // Tuesday
    expect(badge('2')).toBe('โอที');
    expect(dayBtn('7')!.className).toContain('text-weekend'); // Saturday
    expect(dayBtn('6')!.className).not.toContain('text-weekend');
  });

  it('no day types configured: the badge asks to pick one', () => {
    mount(props({ dayTypeConfig: [] }));
    expect(cellOf('3').querySelector('.day-type-badge')!.textContent).toBe('เลือกประเภท');
  });

  it('day data and notes reach the right cell', () => {
    mount(props({
      calendarData: { 5: { exp: 120, inc: 0, items: [tx('a', '2026-11-05', 120, { description: 'ข้าวมันไก่' })], incItems: [] } },
      dayNotes: { '2026-11-06': { text: 'วันเกิดแม่', icon: 'cake' } },
    }));
    expect(cellOf('5').textContent).toContain('ข้าวมันไก่');
    expect(cellOf('4').textContent).not.toContain('ข้าวมันไก่');
    expect(cellOf('6').querySelector('[title="วันเกิดแม่"] .lucide-cake')).not.toBeNull();
  });

  it('clicks open the day and the add modal with the right date', () => {
    const add = vi.fn();
    const p = mount(props({ handleOpenAddModal: add }));
    click(dayBtn('12'));
    expect(p.onSelectDate).toHaveBeenCalledWith('2026-11-12');
    click(container!.querySelector('button[aria-label="เพิ่มรายการวันที่ 13"]'));
    expect(add).toHaveBeenCalledWith('2026-11-13');
  });

  it('calendar months have no month markers or edges', () => {
    mount(props());
    expect(dayBtn('1')).not.toBeNull();
    expect(container!.querySelector('.-top-px.h-\\[2px\\]')).toBeNull();
    expect(container!.querySelector('.-left-px.w-\\[2px\\]')).toBeNull();
  });
});

describe('CalendarBlock pay cycle (25 → 24)', () => {
  const cyc = () => mount(props({ dates: CYCLE, title: 'รอบ ต.ค.', firstDayOfMonth: 5, suffixDaysCount: 0 }));

  it('first cell and the 1st of the next month carry the month name', () => {
    cyc();
    expect(dayBtn('25 ก.ย.')).not.toBeNull();
    expect(dayBtn('1 ต.ค.')).not.toBeNull();
    expect(dayBtn('26')).not.toBeNull();
    expect(dayBtn('2')).not.toBeNull();
    expect(text()).toContain('30 วัน');
  });

  it('a stair-step month edge: top edges under September, left edge at the 1st', () => {
    cyc();
    const top = (l: string) => cellOf(l).querySelector('.-top-px.h-\\[2px\\]') !== null;
    const left = (l: string) => cellOf(l).querySelector('.-left-px.w-\\[2px\\]') !== null;
    // idx 7..12 sit under 25–30 Sep
    expect(['2', '3', '4', '5', '6', '7'].map(top)).toEqual([true, true, true, true, true, true]);
    expect(top('8')).toBe(false); // under 1 Oct
    expect(top('26')).toBe(false); // first row
    expect(top('1 ต.ค.')).toBe(false); // idx 6, first row
    expect(left('1 ต.ค.')).toBe(true);
    expect(left('2')).toBe(false);
    expect(left('25 ก.ย.')).toBe(false);
  });

  it('no left edge when the 1st starts a week row', () => {
    // cycle 25 ต.ค. 2026 (Sunday) → 1 พ.ย. lands on a Sunday
    mount(props({ dates: periodUnitDates('2026-10', true), firstDayOfMonth: 0, suffixDaysCount: 4 }));
    expect(cellOf('1 พ.ย.').querySelector('.-left-px.w-\\[2px\\]')).toBeNull();
    expect(cellOf('1 พ.ย.').querySelector('.-top-px.h-\\[2px\\]')).not.toBeNull();
  });
});

describe('CalendarBlock popover placement', () => {
  const placement = (label: string) => {
    click(cellOf(label).querySelector('button[aria-haspopup="dialog"]'));
    const dlg = cellOf(label).querySelector('[role="dialog"]')!;
    const out = { right: dlg.classList.contains('right-0'), up: dlg.classList.contains('bottom-0') };
    click(dlg.querySelector('button[aria-label="ปิด"]'));
    return out;
  };

  it('Fri/Sat open to the left edge, the last two rows open upward', () => {
    // Nov 2026: 5 rows (35 cells)
    const data = Object.fromEntries(NOV.map(d => [Number(d.slice(8)), five(d)]));
    mount(props({ calendarData: data }));
    expect(placement('1')).toEqual({ right: false, up: false }); // Sun, row 0
    expect(placement('5')).toEqual({ right: false, up: false }); // Thu
    expect(placement('6')).toEqual({ right: true, up: false }); // Fri
    expect(placement('7')).toEqual({ right: true, up: false }); // Sat
    expect(placement('15')).toEqual({ right: false, up: false }); // row 2
    expect(placement('22')).toEqual({ right: false, up: true }); // row 3 = rows − 2
    expect(placement('30')).toEqual({ right: false, up: true }); // row 4
  });

  it('the row count includes leading blanks', () => {
    // Oct 2026: 4 blanks + 31 = 35 → 5 rows; 15 Oct is row 2, 22 Oct is row 3
    const data = Object.fromEntries(OCT.map(d => [Number(d.slice(8)), five(d)]));
    mount(props({ dates: OCT, firstDayOfMonth: 4, suffixDaysCount: 0, calendarData: data }));
    expect(placement('15').up).toBe(false);
    expect(placement('18').up).toBe(true); // Sunday of row 3
    expect(placement('2').right).toBe(true); // Friday
    expect(placement('1').right).toBe(false); // Thursday
  });
});

describe('CalendarBlock footer', () => {
  it('day-type counts skip zeros and use the type colour', () => {
    mount(props({ dayTypeCounts: { dt_work: 21, dt_off: 9, dt_ot: 0 } }));
    const chips = [...container!.querySelectorAll<HTMLElement>('.rounded-pill.text-\\[11px\\].font-black')].filter(c => c.textContent!.includes('('));
    expect(chips.map(c => c.textContent)).toEqual(['ทำงาน (21)', 'หยุด (9)']);
    expect(chips[0].style.backgroundColor).toBe('rgba(59, 130, 246, 0.08)');
    expect(chips[0].style.borderColor).toBe('rgba(59, 130, 246, 0.25)');
    expect((chips[0].firstElementChild as HTMLElement).style.backgroundColor).toBe('rgb(59, 130, 246)');
  });

  it('a type missing from the counts is skipped', () => {
    mount(props({ dayTypeCounts: { dt_off: 2 } }));
    expect(text()).not.toContain('ทำงาน (');
    expect(text()).toContain('หยุด (2)');
  });

  it('heat legend only once there is spending, with the ฿ steps in its tooltips', () => {
    mount(props());
    expect(container!.querySelector('[aria-label="ระดับการใช้จ่ายต่อวัน"]')).toBeNull();
    const days = () => [...container!.querySelectorAll<HTMLElement>('div')].find(d => d.textContent === '30 วัน')!;
    expect(days().className).toContain('ml-auto');
    act(() => root!.render(<CalendarBlock {...props({ maxDailyExpense: 4200.5 })} />));
    const legend = container!.querySelector('[aria-label="ระดับการใช้จ่ายต่อวัน"]')!;
    const titles = [...legend.querySelectorAll<HTMLElement>('[title]')].map(e => [e.textContent!.trim(), e.title]);
    expect(titles).toEqual([
      ['ปกติ', 'ต่ำกว่า ฿300'],
      ['กลาง', '฿300 ขึ้นไป'],
      ['สูง', '฿1,000 ขึ้นไป'],
      ['พีค', '฿3,000 ขึ้นไป'],
    ]);
    expect(legend.textContent).toContain('(สูงสุด ฿4,200.50)');
    expect(days().className).not.toContain('ml-auto');
  });
});
