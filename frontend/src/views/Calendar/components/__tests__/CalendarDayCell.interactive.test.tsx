// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import CalendarDayCell, { CalendarDayCellProps } from '../CalendarDayCell';
import { CALENDAR_HEAT_COLORS } from '../../utils/calendarHeat';
import { click, key, q } from '@/test-utils/dom';
import { DAY_TYPES, tx, cat } from '../../__tests__/fixtures';
import type { TransactionDisplay } from '@/types';

let root: Root | null = null;
let container: HTMLElement | null = null;

const props = (over: Partial<CalendarDayCellProps> = {}): CalendarDayCellProps => ({
  day: 9,
  dateStr: '2026-10-09',
  isToday: false,
  isWeekend: false,
  dayTypeConfig: DAY_TYPES,
  dayType: 'dt_work',
  handleDayTypeChange: vi.fn(),
  onSelectDate: vi.fn(),
  ...over,
});

const mount = (p: CalendarDayCellProps) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<CalendarDayCell {...p} />));
  return p;
};
const cell = () => container!.firstElementChild as HTMLElement;
const dayBtn = () => container!.querySelector<HTMLButtonElement>('button[aria-label^="ดูรายละเอียดวันที่"]')!;
const chip = () => container!.querySelector<HTMLElement>('span.-ml-1\\.5');
const popover = () => container!.querySelector<HTMLElement>('[role="dialog"]');
const more = (label: string) => container!.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
const data = (items: TransactionDisplay[] = [], incItems: TransactionDisplay[] = []) => ({
  exp: items.filter(i => i.group_type !== 'savings').reduce((s, i) => s + i.amount, 0),
  inc: incItems.reduce((s, i) => s + i.amount, 0),
  items,
  incItems,
});
const exps = (n: number, amount = 100) => Array.from({ length: n }, (_, i) => tx(`e${i}`, '2026-10-09', amount, { description: `จ่าย${i}` }));

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  document.body.innerHTML = '';
  root = null; container = null;
});

describe('CalendarDayCell heat chip and wash', () => {
  const at = (exp: number, isToday = false) => {
    mount(props({ isToday, data: { exp, inc: 0, items: [tx('a', '2026-10-09', exp)], incItems: [] } }));
  };
  const wash = () => [...container!.querySelectorAll<HTMLElement>('.absolute.inset-0')].find(e => e.style.backgroundColor);
  const topBar = () => container!.querySelector('.bg-expense.h-\\[2\\.5px\\]');

  it('below ฿300: plain red text chip, no wash, no bar', () => {
    at(299);
    expect(chip()!.className).toContain('text-expense');
    expect(chip()!.classList.contains('bg-warn/20')).toBe(false);
    expect(chip()!.textContent).toBe('฿299');
    expect(wash()).toBeUndefined();
    expect(topBar()).toBeNull();
  });

  it('฿300 exactly: amber chip and the faint warn wash', () => {
    at(300);
    expect(chip()!.classList.contains('bg-warn/20')).toBe(true);
    expect(wash()!.style.backgroundColor).not.toBe('');
    expect(CALENDAR_HEAT_COLORS[2]).toContain('rgba');
    expect(topBar()).toBeNull();
  });

  it('฿1,000: dark-red chip with display ink', () => {
    at(1000);
    expect(chip()!.classList.contains('bg-expense/25')).toBe(true);
    expect(chip()!.classList.contains('text-ink-display')).toBe(true);
    expect(topBar()).toBeNull();
  });

  it('฿3,000: solid chip plus the red top bar', () => {
    at(3000);
    expect(chip()!.classList.contains('bg-expense')).toBe(true);
    expect(chip()!.classList.contains('text-canvas')).toBe(true);
    expect(topBar()).not.toBeNull();
  });

  it('no expense, no chip and no header row', () => {
    mount(props());
    expect(chip()).toBeNull();
    expect(container!.querySelector('.border-line\\/20')).toBeNull();
  });
});

describe('CalendarDayCell background and day badge', () => {

  it('a weekend with spending or income goes back to canvas', () => {
    mount(props({ isWeekend: true, data: data(exps(1)) }));
    expect(cell().classList.contains('bg-canvas')).toBe(true);
    act(() => root!.render(<CalendarDayCell {...props({ isWeekend: true, data: data([], [tx('i', '2026-10-09', 50)]) })} />));
    expect(cell().classList.contains('bg-canvas')).toBe(true);
  });

});

describe('CalendarDayCell list and "+N"', () => {
  it('4 expense rows fit without "+N"', () => {
    mount(props({ data: data(exps(4)) }));
    expect(container!.textContent).toContain('จ่าย3');
    expect(container!.querySelector('button[aria-haspopup="dialog"]')).toBeNull();
  });

  it('one income row: no "+N" and no expense-side amount', () => {
    mount(props({ data: data([], [tx('i1', '2026-10-09', 900, { description: 'เงินเดือน', _catObj: cat('c', { color: '#123456' }) })]) }));
    expect(container!.querySelector('button[aria-haspopup="dialog"]')).toBeNull();
    expect(chip()).toBeNull();
    expect((container!.querySelector('.w-\\[3px\\]') as HTMLElement).style.backgroundColor).toBe('rgb(18, 52, 86)');
  });

  it('expenses only: no income total', () => {
    mount(props({ data: data(exps(2)) }));
    expect(container!.textContent).not.toContain('+฿');
  });

  it('5 expense rows: 4 shown, "+1"', () => {
    mount(props({ data: data(exps(5)) }));
    expect(container!.textContent).toContain('จ่าย3');
    expect(container!.textContent).not.toContain('จ่าย4');
    expect(more('ดูอีก 1 รายการ')!.textContent).toBe('+1');
  });

  it('with an income row only 3 expenses fit', () => {
    mount(props({ data: data(exps(4), [tx('i1', '2026-10-09', 900, { description: 'เงินเดือน' })]) }));
    expect(container!.textContent).toContain('จ่าย2');
    expect(container!.textContent).not.toContain('จ่าย3');
    expect(more('ดูอีก 1 รายการ')).not.toBeNull();
    expect(container!.textContent).toContain('+฿900');
    expect(container!.textContent).toContain('+900');
  });

  it('two income rows: one shown, "+1 รายรับ"', () => {
    mount(props({ data: data([], [tx('i1', '2026-10-09', 900, { description: 'เงินเดือน' }), tx('i2', '2026-10-09', 100, { description: 'โบนัส' })]) }));
    expect(container!.textContent).toContain('เงินเดือน');
    expect(container!.textContent).not.toContain('โบนัส');
    expect(more('ดูอีก 1 รายรับ')!.textContent).toBe('+1');
  });

  it('only savings rows over the limit still show "+N" (no expense chip)', () => {
    const sav = Array.from({ length: 5 }, (_, i) => tx(`s${i}`, '2026-10-09', 100, { description: `ออม${i}`, group_type: 'savings' }));
    mount(props({ data: data(sav) }));
    expect(chip()).toBeNull();
    expect(more('ดูอีก 1 รายการ')).not.toBeNull();
  });

  it('savings rows are green, expenses red', () => {
    mount(props({ data: data([tx('a', '2026-10-09', 50, { description: 'ข้าว' }), tx('b', '2026-10-09', 70, { description: 'ทอง', group_type: 'savings' })]) }));
    const amt = (d: string) => [...container!.querySelectorAll<HTMLElement>('[title]')].find(e => e.title.startsWith(d))!.lastElementChild!;
    expect(amt('ข้าว').classList.contains('text-expense')).toBe(true);
    expect(amt('ทอง').classList.contains('text-savings')).toBe(true);
  });

});

describe('CalendarDayCell "+N" popover', () => {
  const open = (p: CalendarDayCellProps) => {
    mount(p);
    click(container!.querySelector('button[aria-haspopup="dialog"]'));
  };

  it('opens without opening the day, lists every row with a count', () => {
    const p = props({ data: data(exps(5), [tx('i1', '2026-10-09', 900, { description: 'เงินเดือน' })]) });
    open(p);
    expect(p.onSelectDate).not.toHaveBeenCalled();
    expect(popover()!.getAttribute('aria-label')).toBe('รายการทั้งหมดวันที่ 9');
    expect(popover()!.textContent).toContain('6 รายการ');
    const rows = popover()!.querySelectorAll('li');
    expect(rows).toHaveLength(6);
    expect(rows[0].textContent).toContain('เงินเดือน');
    expect(rows[0].textContent).toContain('+900.00');
    expect(rows[0].lastElementChild!.classList.contains('text-income')).toBe(true);
    expect(rows[1].lastElementChild!.classList.contains('text-expense')).toBe(true);
    expect(cell().className).toContain('z-50');
    expect(more('ดูอีก 2 รายการ')!.getAttribute('aria-expanded')).toBe('true');
  });

  it('a savings sell in the list reads −500.00 in green', () => {
    const items = [...exps(4), tx('s', '2026-10-09', -500, { description: 'ขายทอง', group_type: 'savings' })];
    open(props({ data: data(items) }));
    const li = [...popover()!.querySelectorAll('li')].find(l => l.textContent!.includes('ขายทอง'))!;
    expect(li.lastElementChild!.textContent).toBe('−500.00');
    expect(li.lastElementChild!.classList.contains('text-income')).toBe(true);
  });

  it('Esc focuses the income "+N" when it is the only trigger', () => {
    open(props({ data: data([], [tx('i1', '2026-10-09', 1, { description: 'a' }), tx('i2', '2026-10-09', 2, { description: 'b' })]) }));
    key(document.body, 'Escape');
    expect(document.activeElement).toBe(more('ดูอีก 1 รายรับ'));
  });

  it('with both "+N" buttons, the expense one is the focus target', () => {
    open(props({ data: data(exps(4), [tx('i1', '2026-10-09', 1, { description: 'a' }), tx('i2', '2026-10-09', 2, { description: 'b' })]) }));
    key(document.body, 'Escape');
    expect(document.activeElement).toBe(more('ดูอีก 1 รายการ'));
  });

});

