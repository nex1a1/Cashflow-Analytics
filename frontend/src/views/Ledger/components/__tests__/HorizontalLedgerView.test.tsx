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
const tip = () => document.body.querySelector<HTMLElement>('.fixed.z-99999');

beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('HorizontalLedgerView — empty', () => {

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

  it('a cell with data is focusable and describes itself', () => {
    mount();
    const c = cellsOf(dateRows()[2])[1];
    expect(c.tabIndex).toBe(0);
    expect(c.getAttribute('aria-label')).toBe('2026-02-01 ค่ากิน ฿100.00 (2 รายการ)');
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

describe('HorizontalLedgerView — tooltip', () => {
  const firstFoodCell = () => cellsOf(dateRows()[2])[1]; // 2 rows: ข้าว 70 + น้ำ 30

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

});

