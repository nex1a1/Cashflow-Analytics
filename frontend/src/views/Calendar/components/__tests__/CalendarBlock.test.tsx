// @vitest-environment jsdom
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
