// @vitest-environment jsdom
import type { Mock } from 'vitest';
type AnyMock = Mock<(...args: any[]) => any>;
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import CategorySelect, { CategorySelectProps } from '../CategorySelect';
import { readable, tc } from '@/constants/theme';
import { hexToRgb } from '@/utils/formatters';
import { click, type, q } from '@/test-utils/dom';
import type { Category, CashflowGroup, FrequentItem, TransactionDisplay } from '@/types';

// jsdom has no layout: the trigger's rectangle is stubbed, the viewport is jsdom's 1024 x 768.
type Rect = { left: number; top: number; width: number; height: number };
let rect: Rect;
let root: Root;
let host: HTMLDivElement;
let onChange: AnyMock;
let windowKey: AnyMock;
let scrollIntoView: AnyMock;

const cat = (id: string, name: string, type: Category['type'], group: string | null, order: number, color = '#3B82F6'): Category =>
  ({ id, name, type, cashflowGroup: group, order_index: order, color, icon: 'tag' });
const CATS: Category[] = [
  cat('e1', 'ค่ากิน', 'expense', 'gv', 1, '#FF8800'),
  cat('e2', 'ค่าเดินทาง', 'expense', 'gv', 2),
  cat('e3', 'ค่าเช่า', 'expense', 'gf', 1),
  cat('e4', 'ไม่มีกลุ่ม', 'expense', null, 1),
  cat('i1', 'เงินเดือน', 'income', 'gi', 1),
  cat('s1', 'กองทุน', 'savings', 'gs', 1),
];
const grp = (id: string, name: string, type: CashflowGroup['type'], order: number): CashflowGroup =>
  ({ id, name, type, allocation_type: null, order_index: order, icon: 'folder', color: '#888888' });
const GROUPS: CashflowGroup[] = [grp('gv', 'ผันแปร', 'expense', 2), grp('gf', 'ประจำ', 'expense', 1), grp('gi', 'รายได้', 'income', 1), grp('gs', 'ออมเงิน', 'savings', 1)];
const freq = (categoryId: string): FrequentItem => ({ categoryId, categoryName: '', description: 'x', amount: 1, allocation_type: null, count: 1, lastDate: '2026-10-01' });
// expense list as the popover shows it: ประจำ [ค่าเช่า] · ผันแปร [ค่ากิน, ค่าเดินทาง] · ทั่วไป / อื่นๆ [ไม่มีกลุ่ม]
const EXPENSE_ROWS = ['ค่าเช่า', 'ค่ากิน', 'ค่าเดินทาง', 'ไม่มีกลุ่ม'];

const render = (p: Partial<CategorySelectProps> = {}) =>
  act(() => root.render(<CategorySelect onChange={onChange} categories={CATS} cashflowGroups={GROUPS} type="expense" {...p} />));

beforeEach(() => {
  rect = { left: 100, top: 100, width: 320, height: 36 };
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
    ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top, toJSON: () => ({}),
  }));
  scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView as unknown as typeof Element.prototype.scrollIntoView;
  onChange = vi.fn();
  windowKey = vi.fn();
  window.addEventListener('keydown', windowKey);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  window.removeEventListener('keydown', windowKey);
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const trigger = () => host.querySelector<HTMLButtonElement>('button')!;
const popover = () => q<HTMLElement>('div.fixed');
const search = () => q<HTMLInputElement>('input[placeholder="พิมพ์ค้นหาหมวดหมู่ หรือ กลุ่ม..."]')!;
const rows = () => [...document.querySelectorAll<HTMLButtonElement>('.tactical-scrollbar button')];
const rowNames = () => rows().map(r => r.querySelector('span.font-semibold')!.textContent);
const headers = () => [...document.querySelectorAll('.sticky')].map(h => h.textContent);
const quick = () => [...document.querySelectorAll<HTMLButtonElement>('.flex-wrap button')];
const open = () => click(trigger());
const css = (prop: 'color' | 'backgroundColor' | 'borderColor', v: string) => { const d = document.createElement('div'); d.style[prop] = v; return d.style[prop]; };
const press = (el: Element, k: string) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  act(() => { el.dispatchEvent(e); });
  return e;
};
const lit = () => rows().map(r => r.classList.contains('ring-1'));

describe('CategorySelect — pill trigger', () => {

  it('is tinted with the category colour (15% fill, 35% border, 3px solid left edge)', () => {
    render({ variant: 'pill', value: 'e1' });
    const rgb = hexToRgb('#FF8800');
    expect(trigger().style.backgroundColor).toBe(css('backgroundColor', `rgba(${rgb}, 0.15)`));
    expect(trigger().style.borderLeftWidth).toBe('3px');
    expect(trigger().style.borderLeftColor).toBe(css('borderColor', '#FF8800'));
  });

  it('without a category colour it uses the income green or the expense red by type', () => {
    render({ variant: 'pill', type: 'income' });
    expect(trigger().style.borderLeftColor).toBe(css('borderColor', tc('income')));
    render({ variant: 'pill', type: 'expense' });
    expect(trigger().style.borderLeftColor).toBe(css('borderColor', tc('expense')));
    render({ variant: 'pill', type: undefined });
    expect(trigger().style.borderLeftColor).toBe(css('borderColor', tc('expense')));
  });

});

describe('CategorySelect — quick picks follow their inputs', () => {
  const picks = () => quick().map(b => b.textContent);
  const t = (category_id: string) => ({ id: Math.random().toString(), category_id } as unknown as TransactionDisplay);

  it('a category used twice appears once', () => {
    render({ frequentItems: [freq('e3'), freq('e3'), freq('e1')] });
    open();
    expect(picks()).toEqual(['ค่าเช่า', 'ค่ากิน']);
  });

  it('the transaction fallback assumes expenses when no type is given, and shows at most five', () => {
    const many: Category[] = Array.from({ length: 8 }, (_, i) => cat(`m${i}`, `หมวด${i}`, 'expense', 'gv', i));
    render({ type: undefined, categories: [...many, CATS[4]], transactions: [...many.map(m => t(m.id)), t('i1'), t('i1'), t('i1')] });
    open();
    expect(picks()).toHaveLength(5);
    expect(picks()).not.toContain('เงินเดือน'); // income has the most rows, but the default type is expense
  });

  // stable arrays, as a form passes them: fresh ones on every render would hide a stale memo dependency
  const RENT = [freq('e3')];
  const FOOD = [freq('e1')];
  const RENT_AND_PAY = [freq('e3'), freq('i1')];
  const NO_TX: TransactionDisplay[] = []; // the component's own default would be a fresh array on every render

  it('a group with no colour gets the expense red bar', () => {
    render({ cashflowGroups: GROUPS.map(g => ({ ...g, color: null })) });
    open();
    const bar = document.querySelector<HTMLElement>('.sticky .w-1')!;
    const probe = document.createElement('div');
    probe.style.backgroundColor = tc('expense');
    expect(bar.style.backgroundColor).toBe(probe.style.backgroundColor);
  });

  it('each row\'s icon sits on a 14% tint of the category colour', () => {
    render();
    open();
    const row = rows().find(r => r.textContent === 'ค่ากิน')!;
    const probe = document.createElement('div');
    probe.style.backgroundColor = `rgba(${hexToRgb('#FF8800')}, 0.14)`;
    expect(row.querySelector<HTMLElement>('span.w-5')!.style.backgroundColor).toBe(probe.style.backgroundColor);
  });
});

describe('CategorySelect — the pill, in detail', () => {
  const DARK = '#1E3A8A';
  const dark: Category[] = [cat('dk', 'มืด', 'expense', 'gv', 9, DARK)];

  it('the border is a 35% tint, the edge is solid', () => {
    render({ variant: 'pill', value: 'e1' });
    const probe = document.createElement('div');
    probe.style.borderTopColor = `rgba(${hexToRgb('#FF8800')}, 0.35)`;
    expect(trigger().style.borderTopColor).toBe(probe.style.borderTopColor);
  });

});

describe('CategorySelect — closing', () => {

  it('removes every document / window listener it added', () => {
    const spies = [document, window].map(t => ({ add: vi.spyOn(t, 'addEventListener'), rem: vi.spyOn(t, 'removeEventListener') }));
    const types = ['mousedown', 'resize', 'scroll'];
    render();
    open();
    press(search(), 'Escape');
    const pick = (k: 'add' | 'rem') => spies.flatMap(s => s[k].mock.calls.filter(c => types.includes(c[0])).map(c => c[1]));
    const added = pick('add');
    expect(added).toHaveLength(3);
    expect(pick('rem')).toEqual(expect.arrayContaining(added));
  });

  it('listens to nothing while closed', () => {
    const spies = [document, window].map(t => vi.spyOn(t, 'addEventListener'));
    render();
    expect(spies.flatMap(s => s.mock.calls.filter(c => ['mousedown', 'resize', 'scroll'].includes(c[0])))).toHaveLength(0);
  });
});

describe('CategorySelect — keyboard', () => {

  it('the arrows move a highlight that wraps both ways and scrolls into view', () => {
    render();
    open();
    expect(lit()).toEqual([false, false, false, false]);
    press(search(), 'ArrowDown');
    expect(lit()).toEqual([true, false, false, false]);
    press(search(), 'ArrowUp'); // wraps to the last
    expect(lit()).toEqual([false, false, false, true]);
    press(search(), 'ArrowDown'); // wraps to the first
    expect(lit()).toEqual([true, false, false, false]);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    expect(scrollIntoView).toHaveBeenCalledTimes(3);
  });

});
