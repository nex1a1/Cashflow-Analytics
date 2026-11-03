// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import SpendingCalendar from '../SpendingCalendar';
import { CALENDAR_HEAT_CHIP } from '@/views/Calendar/utils/calendarHeat';

const WORK = { id: 'dt-work', name: 'workday', label: 'วันทำงาน', color: '#3B82F6' };
const HOL = { id: 'dt-hol', name: 'holiday', label: 'วันหยุด', color: '#F59E0B' };
const OT = { id: 'dt-ot', name: 'ot', label: 'โอที', color: '#10B981' };
const exp = (date: string, amount: number) => ({ date, amount, group_type: 'expense' });

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = (props: Partial<Parameters<typeof SpendingCalendar>[0]> = {}) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<SpendingCalendar rows={[]} period="2026-10" dayTypes={{}} dayTypeConfig={[WORK, HOL, OT]} {...props} />));
};
const day = (iso: string) => container!.querySelector<HTMLElement>(`[data-day="${iso}"]`)!;
const card = () => document.querySelector<HTMLElement>('[data-hover-card]');
const over = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
const legend = () => [...container!.querySelectorAll('li')].map((l) => l.textContent).join(' | ');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 14, 12)); // 14 Oct 2026
});
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  vi.useRealTimers();
});

describe('SpendingCalendar — one month', () => {
  it('a Sun–Sat grid of the month, padded, with the weekday header', () => {
    mount();
    const rows = container!.querySelectorAll('[role="grid"] [role="row"]');
    expect(rows).toHaveLength(6); // header + 5 weeks (Thu 1 → Sat 31)
    expect(container!.querySelectorAll('[data-day]')).toHaveLength(31);
    expect(rows[1].querySelectorAll('[role="gridcell"]:not([data-day])')).toHaveLength(4);
    expect(rows[0].textContent).toBe('อา.จ.อ.พ.พฤ.ศ.ส.');
  });

  it('each day shows its spend with the calendar heat chip; the bottom line is the day type', () => {
    mount({ rows: [exp('2026-10-05', 120), exp('2026-10-05', 30), exp('2026-10-06', 1500), { date: '2026-10-07', amount: 900, group_type: 'savings' }], dayTypes: { '2026-10-06': 'dt-ot' } });
    expect(day('2026-10-05').textContent).toBe('5฿150');
    expect(day('2026-10-06').querySelector('.font-mono')!.className).toContain(CALENDAR_HEAT_CHIP[3]);
    expect(day('2026-10-07').textContent).toBe('7'); // investing is not spending
    const line = (iso: string) => day(iso).querySelector<HTMLElement>('[data-day-type]')!.style.backgroundColor;
    expect(line('2026-10-06')).toBe('rgb(16, 185, 129)'); // marked OT
    expect(line('2026-10-04')).toBe('rgb(245, 158, 11)'); // Sunday → holiday
    expect(line('2026-10-05')).toBe('rgb(59, 130, 246)'); // Monday → workday
  });

  it('each cell is labelled date · type · amount for screen readers, says when it is plan, and today is marked', () => {
    mount({ rows: [exp('2026-10-20', 4500)] });
    expect(day('2026-10-20').getAttribute('aria-label')).toBe('20 ต.ค. · วันทำงาน · ฿4,500.00 · ลงล่วงหน้า');
    expect(day('2026-10-03').getAttribute('aria-label')).toBe('3 ต.ค. · วันหยุด · ไม่มีรายจ่าย');
    expect(day('2026-10-14').getAttribute('aria-current')).toBe('date');
  });

  it('the legend counts the day types in the month and shows the fixed heat steps', () => {
    mount({ dayTypes: { '2026-10-01': 'dt-ot' } });
    expect(legend()).toContain('วันทำงาน21 วัน');
    expect(legend()).toContain('วันหยุด9 วัน');
    expect(legend()).toContain('โอที1 วัน');
    expect(legend()).toContain('฿3,000+');
  });
});

describe('SpendingCalendar — hover card', () => {
  const CATS = [
    { id: 'c-food', name: 'อาหาร', type: 'expense', order_index: 1, color: '#F97316' },
    { id: 'c-taxi', name: 'การเดินทาง', type: 'expense', order_index: 2, color: '#22D3EE' },
  ];
  const row = (date: string, category_id: string, amount: number) => ({ date, amount, group_type: 'expense', category_id, category: category_id });

  it('shows both colours (day type bar + dot, spend level chip) and the categories of that day, largest first', () => {
    mount({
      categories: CATS as never,
      dayTypes: { '2026-10-06': 'dt-ot' },
      rows: [row('2026-10-06', 'c-food', 120), row('2026-10-06', 'c-food', 80), row('2026-10-06', 'c-taxi', 1300)],
    });
    expect(card()).toBeNull();
    over(day('2026-10-06'));
    const c = card()!;
    expect(c.textContent).toContain('อ. 6 ต.ค. 2026');
    expect(c.textContent).toContain('โอที');
    expect(c.textContent).toContain('สูง'); // ฿1,500 = level 3
    expect((c.firstElementChild as HTMLElement).style.backgroundColor).toBe('rgb(16, 185, 129)'); // OT colour bar
    const amount = c.querySelector('[data-hover-amount]')!;
    expect(amount.textContent).toBe('฿1,500.00');
    expect(amount.className).toContain(CALENDAR_HEAT_CHIP[3]);
    const items = [...c.querySelectorAll('li')].map((li) => li.textContent);
    expect(items).toEqual(['การเดินทาง฿1,300.00', 'อาหาร×2฿200.00']);
    expect(day('2026-10-06').className).toContain('outline-ink-display'); // the hovered cell is ringed
  });

  it('compares the day with the period average, marks plan days, and closes when the pointer leaves', () => {
    mount({ rows: [row('2026-10-20', 'c-food', 3100)] }); // 3,100 over 31 days = ฿100/day
    over(day('2026-10-20'));
    expect(card()!.textContent).toContain('ล่วงหน้า');
    expect(card()!.textContent).toContain('รายจ่ายที่ลงไว้');
    expect(card()!.textContent).toContain('สูงกว่าเฉลี่ย ฿3,000 (฿100/วัน)');
    over(day('2026-10-03'));
    expect(card()!.textContent).toContain('ไม่มีรายจ่าย');
    expect(card()!.querySelector('ul')).toBeNull();
    act(() => { day('2026-10-03').closest('[role="row"]')!.parentElement!.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })); });
    expect(card()).toBeNull();
  });

  it('the multi-month strip opens the same card', () => {
    mount({ period: '2026-09_2026-10', rows: [row('2026-09-02', 'c-food', 50)] });
    over(day('2026-09-02'));
    expect(card()!.textContent).toContain('พ. 2 ก.ย. 2026');
    expect(card()!.textContent).toContain('ปกติ');
  });
});

describe('SpendingCalendar — several months', () => {
  it('draws one column per week with month labels, coloured by spend; "ประเภทวัน" recolours by day type', () => {
    mount({ period: '2026-09_2026-10', rows: [exp('2026-09-02', 50), exp('2026-10-30', 5000)] });
    expect(container!.querySelectorAll('[data-day]')).toHaveLength(60); // longer periods end at the last row: 1 Sep – 30 Oct
    expect(container!.textContent).toContain('ก.ย.');
    expect(container!.textContent).toContain('ต.ค.');
    expect(day('2026-10-30').style.backgroundColor).toBe('rgb(255, 77, 79)'); // peak = full expense colour
    const toggle = [...container!.querySelectorAll('button')].find((b) => b.textContent === 'ประเภทวัน')!;
    act(() => toggle.click());
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(day('2026-10-30').style.backgroundColor).toBe('rgb(59, 130, 246)'); // Friday → workday
    expect(legend()).toContain('วันหยุด');
  });

  it('renders nothing when the period has no dates', () => {
    mount({ period: 'ALL' });
    expect(container!.innerHTML).toBe('');
  });
});
