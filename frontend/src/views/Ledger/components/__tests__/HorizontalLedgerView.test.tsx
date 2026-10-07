// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import HorizontalLedgerView from '../HorizontalView/HorizontalLedgerView';
import { byText, click, key, q } from '@/test-utils/dom';
import { formatMoney, THAI_MONTHS } from '@/utils/formatters';
import type { Category, DayType, TransactionDisplay } from '@/types';
import type { HeatmapEngineOptions } from '../../hooks/useHeatmapEngine';

const categories: Category[] = [
  { id: 'c-food', name: 'ค่ากิน', type: 'expense', color: '#F97316', icon: 'wallet' },
  { id: 'c-fun', name: 'บันเทิง', type: 'expense', color: '#A855F7' },
];
const tx = (id: string, category_id: string, amount: number, date: string, description = id): TransactionDisplay => {
  const c = categories.find(x => x.id === category_id)!;
  return { id, category_id, category: c.name, amount, date, description, group_type: 'expense' } as TransactionDisplay;
};
const WORK: DayType = { id: 'dt-work', name: 'workday', label: 'วันทำงาน', color: '#3B82F6' };
const HOL: DayType = { id: 'dt-hol', name: 'holiday', label: 'วันหยุด', color: '#F59E0B' };
const OT: DayType = { id: 'dt-ot', name: 'ot', label: 'โอที', color: '#10B981' };

// 30 Jan Fri · 31 Sat · 1 Feb Sun · 2 Feb Mon (a day with nothing spent)
const rows = [
  tx('a', 'c-food', 100, '2026-01-30'),
  tx('b', 'c-food', 50, '2026-01-31'),
  tx('c', 'c-fun', 200, '2026-01-31', 'ดูหนัง'),
  tx('d', 'c-food', 70, '2026-02-01', 'ข้าว'),
  tx('e', 'c-food', 30, '2026-02-01', 'น้ำ'),
];
const dates = ['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02'];

let root: Root | null = null;
let container: HTMLElement | null = null;
type Props = React.ComponentProps<typeof HorizontalLedgerView>;
const mount = (over: Partial<Props> = {}) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(
    <HorizontalLedgerView displayTransactions={rows} categories={categories} formatMoney={formatMoney} allDates={dates}
      dayTypeConfig={[WORK, HOL]} dayTypes={{}} {...over} />,
  ));
};
const text = () => container!.textContent!;
const bodyRows = () => [...container!.querySelectorAll<HTMLTableRowElement>('tbody tr')];
/** The date rows only (month banners have one cell). */
const dateRows = () => bodyRows().filter(r => r.cells.length > 1);
const cellsOf = (r: HTMLTableRowElement) => [...r.cells];
const norm = (c: string) => { const d = document.createElement('div'); d.style.borderLeftColor = c; return d.style.borderLeftColor; };
const rect = (left: number, top: number, width = 60, height = 34) =>
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) });
const hover = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: null })); });
const leaveTable = () => act(() => { q('table')!.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })); });
const tip = () => document.body.querySelector<HTMLElement>('.fixed.z-\\[99999\\]');

beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('HorizontalLedgerView — empty', () => {
  it('says there is nothing to show', () => {
    mount({ displayTransactions: [] });
    expect(text()).toContain('ยังไม่มีรายการจ่ายในมุมมองนี้');
    expect(q('table')).toBeNull();
  });

  it('offers to clear the table filters only when they are on and there is a handler', () => {
    mount({ displayTransactions: [], isFilterActive: true, clearFilters: undefined });
    expect(byText('button', 'ล้างตัวกรองตาราง')).toBeNull();
    act(() => root!.unmount()); container!.remove();
    mount({ displayTransactions: [], isFilterActive: false, clearFilters: vi.fn() });
    expect(byText('button', 'ล้างตัวกรองตาราง')).toBeNull();
    act(() => root!.unmount()); container!.remove();
    const clear = vi.fn();
    mount({ displayTransactions: [], isFilterActive: true, clearFilters: clear });
    click(byText('button', 'ล้างตัวกรองตาราง'));
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('income / savings only is also "nothing to show"', () => {
    mount({ displayTransactions: [{ ...rows[0], group_type: 'income', category: 'x', category_id: 'none' } as TransactionDisplay] });
    expect(text()).toContain('ยังไม่มีรายการจ่ายในมุมมองนี้');
  });
});

describe('HorizontalLedgerView — layout', () => {
  it('a column per category that has spending, DATE on the left and the daily total on the right', () => {
    mount();
    const heads = [...container!.querySelectorAll('thead th')].map(t => t.textContent!.trim());
    expect(heads).toEqual(['DATE', 'ค่ากิน', 'บันเทิง', 'รวมรายวัน']);
  });

  it('a row for every day of the period — also the days with no spending', () => {
    mount();
    expect(dateRows()).toHaveLength(4);
  });

  it('month banners: YEAR for the first one, MONTH for the next, in Buddhist-era years', () => {
    mount();
    const banners = bodyRows().filter(r => r.cells.length === 1).map(r => r.textContent);
    expect(banners).toEqual([`YEAR${THAI_MONTHS[0]} 2569`, `MONTH${THAI_MONTHS[1]} 2569`]);
  });

  it('a new year is marked YEAR again', () => {
    mount({
      displayTransactions: [tx('x', 'c-food', 1, '2026-12-31'), tx('y', 'c-food', 1, '2027-01-01')],
      allDates: ['2026-12-31', '2027-01-01'],
    });
    const banners = bodyRows().filter(r => r.cells.length === 1).map(r => r.textContent);
    expect(banners).toEqual([`YEAR${THAI_MONTHS[11]} 2569`, `YEAR${THAI_MONTHS[0]} 2570`]);
  });

  it('banners span every column', () => {
    mount();
    expect(bodyRows().find(r => r.cells.length === 1)!.cells[0].colSpan).toBe(4);
  });

  it('every row names its weekday and date', () => {
    mount();
    expect(dateRows()[0].cells[0].textContent).toContain('30');
    expect(dateRows()[1].cells[0].textContent).toContain('31');
  });
});

describe('HorizontalLedgerView — cells', () => {
  it('shows the sum of a day for a category', () => {
    mount();
    expect(cellsOf(dateRows()[0])[1].textContent).toBe('100.00');
    expect(cellsOf(dateRows()[1])[2].textContent).toBe('200.00');
  });

  it('several rows in one cell show a ×N badge and their total', () => {
    mount();
    const c = cellsOf(dateRows()[2])[1];
    expect(c.textContent).toContain('×2');
    expect(c.textContent).toContain('100.00');
  });

  it('an empty cell is a dot and is not focusable', () => {
    mount();
    const empty = cellsOf(dateRows()[0])[2];
    expect(empty.textContent).toBe('·');
    expect(empty.getAttribute('tabindex')).toBeNull();
    expect(empty.getAttribute('aria-label')).toBeNull();
  });

  it('a cell with data is focusable and describes itself', () => {
    mount();
    const c = cellsOf(dateRows()[2])[1];
    expect(c.tabIndex).toBe(0);
    expect(c.getAttribute('aria-label')).toBe('2026-02-01 ค่ากิน ฿100.00 (2 รายการ)');
  });

  it('a bigger cell is drawn stronger than a smaller one', () => {
    mount();
    const bg = (c: HTMLElement) => (c.firstElementChild as HTMLElement).style.background;
    expect(bg(cellsOf(dateRows()[1])[2])).not.toBe(bg(cellsOf(dateRows()[0])[1]));
  });

  it('a day and category with no spending are a plain, quiet cell', () => {
    mount();
    expect(cellsOf(dateRows()[3])[1].textContent).toBe('·');
  });
});

describe('HorizontalLedgerView — totals', () => {
  it('each day, with nothing shown for a day without spending', () => {
    mount();
    const total = (i: number) => cellsOf(dateRows()[i]).at(-1)!.textContent;
    expect(total(0)).toBe('฿100.00');
    expect(total(1)).toBe('฿250.00');
    expect(total(2)).toBe('฿100.00');
    expect(total(3)).toBe('');
  });

  it('the footer: each category and the grand total', () => {
    mount();
    const foot = [...container!.querySelectorAll('tfoot td')].map(t => t.textContent);
    expect(foot).toEqual(['รวม', '฿250.00', '฿200.00', '฿450.00']);
  });

  it('a category with a total of zero shows nothing in the footer', () => {
    mount({ displayTransactions: [tx('z', 'c-food', 0, '2026-01-30')], allDates: ['2026-01-30'] });
    const foot = [...container!.querySelectorAll('tfoot td')].map(t => t.textContent);
    expect(foot[1]).toBe('');
  });
});

describe('HorizontalLedgerView — day type colours on the date cell', () => {
  const edge = (i: number) => (dateRows()[i].cells[0].firstElementChild as HTMLElement).style.borderLeftColor;

  it('an unmarked weekday takes the workday colour, a weekend the holiday colour', () => {
    mount();
    expect(edge(0)).toBe(norm(WORK.color!)); // Fri 30 Jan
    expect(edge(1)).toBe(norm(HOL.color!));  // Sat 31 Jan
    expect(edge(2)).toBe(norm(HOL.color!));  // Sun 1 Feb
    expect(edge(3)).toBe(norm(WORK.color!)); // Mon 2 Feb
  });

  it('…found by the day types\' NAMES, so the order in Settings does not matter', () => {
    mount({ dayTypeConfig: [OT, WORK, HOL] });
    expect(edge(0)).toBe(norm(WORK.color!));
    expect(edge(1)).toBe(norm(HOL.color!));
  });

  it('a day the user marked uses that type', () => {
    mount({ dayTypeConfig: [WORK, HOL, OT], dayTypes: { '2026-01-30': 'dt-ot' } });
    expect(edge(0)).toBe(norm(OT.color!));
    expect(edge(3)).toBe(norm(WORK.color!));
  });

  it('with no day types the cell is still drawn, in the muted colour', () => {
    mount({ dayTypeConfig: [] });
    expect(edge(0)).not.toBe('');
  });
});

describe('HorizontalLedgerView — spend bar behind the date', () => {
  const bar = (i: number) => dateRows()[i].cells[0].querySelector<HTMLElement>('div > div[style*="position: absolute"]')!;

  it('is as long as the day is compared with the busiest day', () => {
    mount();
    expect(bar(1).style.width).toBe('100%'); // 250 is the busiest
    expect(bar(0).style.width).toBe('40%');  // 100 / 250
    expect(bar(2).style.width).toBe('40%');
  });

  it('a tiny day still shows a sliver (at least 4%)', () => {
    mount({ displayTransactions: [tx('big', 'c-food', 10000, '2026-01-30'), tx('tiny', 'c-food', 1, '2026-01-31')], allDates: ['2026-01-30', '2026-01-31'] });
    expect(bar(1).style.width).toBe('4%');
  });

  it('a day with NO spending has no bar at all', () => {
    mount();
    expect(bar(3).style.width).toBe('0%');
  });
});

describe('HorizontalLedgerView — tooltip', () => {
  const firstFoodCell = () => cellsOf(dateRows()[2])[1]; // 2 rows: ข้าว 70 + น้ำ 30

  it('shows nothing until a cell is hovered', () => {
    mount();
    expect(tip()).toBeNull();
  });

  it('hovering a cell lists its rows and, for several, their total', () => {
    rect(300, 400);
    mount();
    hover(firstFoodCell());
    const t = tip()!;
    expect(t.textContent).toContain('ค่ากิน');
    expect(t.textContent).toContain('2026-02-01');
    expect(t.textContent).toContain('ข้าว');
    expect(t.textContent).toContain('฿70.00');
    expect(t.textContent).toContain('น้ำ');
    expect(t.textContent).toContain('รวม 2 รายการ');
    expect(t.textContent).toContain('฿100.00');
  });

  it('a single row has no total line', () => {
    rect(300, 400);
    mount();
    hover(cellsOf(dateRows()[0])[1]);
    expect(tip()!.textContent).not.toContain('รวม 1 รายการ');
  });

  it('an item without a description says so', () => {
    rect(300, 400);
    mount({ displayTransactions: [tx('n', 'c-food', 5, '2026-01-30', '')], allDates: ['2026-01-30'] });
    hover(cellsOf(dateRows()[0])[1]);
    expect(tip()!.textContent).toContain('ไม่มีรายละเอียด');
  });

  it('opens above the cell, centred on it', () => {
    rect(300, 400, 60);
    mount();
    hover(firstFoodCell());
    expect(tip()!.style.left).toBe('330px');
    expect(tip()!.style.top).toBe('392px');
    expect(tip()!.style.transform).toBe('translate(-50%, -100%)');
  });

  it('opens BELOW a cell that is near the top of the window, so it is not cut off', () => {
    rect(300, 100, 60, 34);
    mount();
    hover(firstFoodCell());
    expect(tip()!.style.top).toBe('142px'); // bottom (134) + 8
    expect(tip()!.style.transform).toBe('translate(-50%, 0%)');
  });

  it('moving off the table hides it; an empty cell shows none', () => {
    rect(300, 400);
    mount();
    hover(firstFoodCell());
    expect(tip()).not.toBeNull();
    leaveTable();
    expect(tip()).toBeNull();
    hover(cellsOf(dateRows()[0])[2]); // empty
    expect(tip()).toBeNull();
  });

  it('works from the keyboard: focusing a cell shows it, leaving hides it', () => {
    rect(300, 400);
    mount();
    act(() => firstFoodCell().focus());
    expect(tip()).not.toBeNull();
    act(() => firstFoodCell().blur());
    expect(tip()).toBeNull();
  });
});

describe('HorizontalLedgerView — arrow keys move between cells that have data', () => {
  const at = (rowIdx: number, col: number) => cellsOf(dateRows()[rowIdx])[col];
  const press = (el: HTMLElement, k: string) => { act(() => el.focus()); key(el, k); };

  it('right / left within a day, skipping nothing that has data', () => {
    mount();
    press(at(1, 1), 'ArrowRight'); // 31 Jan: food → fun
    expect(document.activeElement).toBe(at(1, 2));
    press(at(1, 2), 'ArrowLeft');
    expect(document.activeElement).toBe(at(1, 1));
  });

  it('down / up in a column', () => {
    mount();
    press(at(0, 1), 'ArrowDown'); // 30 Jan → 31 Jan, food
    expect(document.activeElement).toBe(at(1, 1));
    press(at(1, 1), 'ArrowUp');
    expect(document.activeElement).toBe(at(0, 1));
  });

  it('empty cells are skipped over: from food straight to travel when fun has nothing that day', () => {
    const withTrip: Category[] = [...categories, { id: 'c-trip', name: 'เที่ยว', type: 'expense', color: '#06B6D4' }];
    const data = [
      { ...tx('f', 'c-food', 10, '2026-01-30'), category: 'ค่ากิน' } as TransactionDisplay,
      { ...tx('t', 'c-food', 20, '2026-01-30'), category_id: 'c-trip', category: 'เที่ยว' } as TransactionDisplay,
      tx('u', 'c-fun', 5, '2026-01-31'), // makes "fun" a column
    ];
    mount({ categories: withTrip, displayTransactions: data, allDates: ['2026-01-30', '2026-01-31'] });
    const heads = [...container!.querySelectorAll('thead th')].map(t => t.textContent!.trim());
    expect(heads).toEqual(['DATE', 'ค่ากิน', 'บันเทิง', 'เที่ยว', 'รวมรายวัน']);
    press(at(0, 1), 'ArrowRight');
    expect(document.activeElement).toBe(at(0, 3));
    press(at(0, 3), 'ArrowLeft');
    expect(document.activeElement).toBe(at(0, 1));
  });

  it('stays put when nothing further that way has data', () => {
    mount();
    press(at(0, 1), 'ArrowRight'); // 30 Jan: fun is empty and nothing is beyond it
    expect(document.activeElement).toBe(at(0, 1));
  });

  it('stays put at the edge of the table', () => {
    mount();
    press(at(0, 1), 'ArrowUp');
    expect(document.activeElement).toBe(at(0, 1));
    press(at(0, 1), 'ArrowLeft');
    expect(document.activeElement).toBe(at(0, 1));
  });

  it('moves down past the month banner into the next month', () => {
    mount();
    press(at(1, 1), 'ArrowDown'); // 31 Jan food → (banner) → 1 Feb food
    expect(document.activeElement).toBe(at(2, 1));
    press(at(2, 1), 'ArrowUp');
    expect(document.activeElement).toBe(at(1, 1));
  });

  it('a skipped empty cell in the same column: down from 31 Jan "fun" finds nothing below and stays', () => {
    mount();
    press(at(1, 2), 'ArrowDown');
    expect(document.activeElement).toBe(at(1, 2));
  });

  it('other keys do nothing special', () => {
    mount();
    press(at(1, 1), 'a');
    expect(document.activeElement).toBe(at(1, 1));
  });
});

describe('HorizontalLedgerView — it uses the table filters it is given', () => {
  const view = (filterOptions: HeatmapEngineOptions) => mount({ filterOptions });

  it('a category list narrows the columns', () => {
    view({ selectedCategories: ['บันเทิง'] });
    expect([...container!.querySelectorAll('thead th')].map(t => t.textContent!.trim())).toEqual(['DATE', 'บันเทิง', 'รวมรายวัน']);
  });

  it('hiding zero days removes the empty day', () => {
    view({ hideZeroDays: true });
    expect(dateRows()).toHaveLength(3);
  });

  it('an empty category list shows the empty state, with a way out', () => {
    mount({ filterOptions: { selectedCategories: [] }, isFilterActive: true, clearFilters: vi.fn() });
    expect(text()).toContain('ยังไม่มีรายการจ่ายในมุมมองนี้');
    expect(byText('button', 'ล้างตัวกรองตาราง')).not.toBeNull();
  });
});
