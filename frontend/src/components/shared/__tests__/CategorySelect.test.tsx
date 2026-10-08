// @vitest-environment jsdom
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
let onChange: ReturnType<typeof vi.fn>;
let windowKey: ReturnType<typeof vi.fn>;
let scrollIntoView: ReturnType<typeof vi.fn>;

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

describe('CategorySelect — default trigger', () => {
  it('shows the placeholder until something is chosen', () => {
    render();
    expect(trigger().textContent).toBe('เลือกหมวดหมู่...');
    render({ placeholder: 'หมวด?' });
    expect(trigger().textContent).toBe('หมวด?');
    render({ value: 'nope' });
    expect(trigger().textContent).toBe('เลือกหมวดหมู่...');
  });

  it('shows the chosen category, with its group in front when it has one', () => {
    render({ value: 'e1' });
    expect(trigger().textContent).toBe('ผันแปร›ค่ากิน');
    render({ value: 'e4' });
    expect(trigger().textContent).toBe('ไม่มีกลุ่ม');
  });

  it('finds the group through cashflow_group_id as well', () => {
    render({ value: 'x', categories: [{ id: 'x', name: 'จากไอดี', type: 'expense', cashflow_group_id: 'gf' }] });
    expect(trigger().textContent).toBe('ประจำ›จากไอดี');
  });

  it('draws the category icon in its colour', () => {
    render({ value: 'e1' });
    expect(trigger().querySelector('svg.lucide-tag')).not.toBeNull();
    expect((trigger().querySelector('svg.lucide-tag') as SVGElement).style.color).toBe(css('color', '#FF8800'));
  });

  it('forwards id, class and type=button', () => {
    render({ id: 'my-cat', className: 'extra-class' });
    expect(trigger().id).toBe('my-cat');
    expect(trigger().classList.contains('extra-class')).toBe(true);
    expect(trigger().type).toBe('button');
  });

  it('sizes: md is the default, sm is shorter', () => {
    render();
    expect(trigger().classList.contains('h-9')).toBe(true);
    render({ size: 'sm' });
    expect(trigger().classList.contains('h-8')).toBe(true);
    expect(trigger().classList.contains('h-9')).toBe(false);
  });

  it('an error turns the border danger-red', () => {
    render({ error: true });
    expect(trigger().classList.contains('border-danger')).toBe(true);
    render({ error: false });
    expect(trigger().classList.contains('border-danger')).toBe(false);
  });

  it('disabled: dimmed, not clickable', () => {
    render({ disabled: true });
    expect(trigger().disabled).toBe(true);
    expect(trigger().classList.contains('opacity-50')).toBe(true);
    open();
    expect(popover()).toBeNull();
    render({ disabled: false });
    expect(trigger().classList.contains('opacity-50')).toBe(false);
  });
});

describe('CategorySelect — pill trigger', () => {
  it('is the compact cell form: title tells the category, or the placeholder', () => {
    render({ variant: 'pill', value: 'e1' });
    expect(trigger().classList.contains('category-pill-trigger')).toBe(true);
    expect(trigger().title).toBe('หมวดหมู่: ค่ากิน');
    expect(trigger().textContent).toBe('ผันแปร›ค่ากิน');
    render({ variant: 'pill', value: '' });
    expect(trigger().title).toBe('เลือกหมวดหมู่...');
    expect(trigger().textContent).toBe('เลือกหมวดหมู่...');
  });

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

  it('writes the name in a readable version of the colour', () => {
    render({ variant: 'pill', value: 'e1' });
    expect((trigger().querySelector('.truncate.flex') as HTMLElement).style.color).toBe(css('color', readable('#FF8800')));
  });

  it('opens like the default one', () => {
    render({ variant: 'pill' });
    open();
    expect(popover()).not.toBeNull();
  });

  it('disabled', () => {
    render({ variant: 'pill', disabled: true });
    open();
    expect(popover()).toBeNull();
  });

  it('forwards id and class', () => {
    render({ variant: 'pill', id: 'pill-id', className: 'pill-extra' });
    expect(trigger().id).toBe('pill-id');
    expect(trigger().classList.contains('pill-extra')).toBe(true);
  });
});

describe('CategorySelect — the list', () => {
  it('opens in the page body with the categories of the type, grouped and ordered', () => {
    render();
    open();
    expect(popover()!.parentElement).toBe(document.body);
    expect(headers()).toEqual(['ประจำ1', 'ผันแปร2', 'ทั่วไป / อื่นๆ1']);
    expect(rowNames()).toEqual(EXPENSE_ROWS);
  });

  it('other types show their own categories', () => {
    render({ type: 'income' });
    open();
    expect(rowNames()).toEqual(['เงินเดือน']);
    render({ type: 'savings' });
    expect(rowNames()).toEqual(['กองทุน']);
  });

  it('without a type, everything is listed', () => {
    render({ type: undefined });
    open();
    expect(rows()).toHaveLength(CATS.length);
  });

  it('the chosen one has a check mark and a darker row', () => {
    render({ value: 'e2' });
    open();
    expect(rows().map(r => r.querySelectorAll('svg.lucide-check').length)).toEqual([0, 0, 1, 0]);
    expect(rows()[2].classList.contains('bg-neutral-800/60')).toBe(true);
  });

  it('the row text is only the name until a search is typed', () => {
    render();
    open();
    expect(rows()[0].textContent).toBe('ค่าเช่า');
  });

  it('a click chooses: reports the id, closes the list, clears the search', () => {
    render();
    open();
    click(rows()[1]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('e1');
    expect(popover()).toBeNull();
    open();
    expect(search().value).toBe('');
  });

  it('hands focus back to the trigger, so a keyboard user does not land on the page body', () => {
    render();
    open();
    click(rows()[0]);
    expect(document.activeElement).toBe(trigger());
  });

  it('...unless the caller wants focus somewhere else next: that wins, after a moment', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const next = document.createElement('input');
    document.body.appendChild(next);
    render({ onSelectNextFocus: () => next.focus() });
    open();
    click(rows()[0]);
    act(() => { vi.advanceTimersByTime(19); });
    expect(document.activeElement).not.toBe(next);
    act(() => { vi.advanceTimersByTime(1); });
    expect(document.activeElement).toBe(next);
  });

  it('the next-focus callback is not called unless something was chosen', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const onNext = vi.fn();
    render({ onSelectNextFocus: onNext });
    open();
    press(search(), 'Escape');
    act(() => { vi.advanceTimersByTime(100); });
    expect(onNext).not.toHaveBeenCalled();
  });

  it('focuses the search box shortly after opening', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    render();
    open();
    act(() => { vi.advanceTimersByTime(29); });
    expect(document.activeElement).not.toBe(search());
    act(() => { vi.advanceTimersByTime(1); });
    expect(document.activeElement).toBe(search());
  });

  it('closing before that focuses nothing', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    render();
    open();
    act(() => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    act(() => { vi.advanceTimersByTime(100); });
    expect(document.activeElement).not.toBe(search());
  });
});

describe('CategorySelect — search', () => {
  it('matches the category name or the group name, ignoring case, and names the group under each match', () => {
    render();
    open();
    type(search(), 'ผันแปร'); // group name
    expect(rowNames()).toEqual(['ค่ากิน', 'ค่าเดินทาง']);
    expect(rows()[0].textContent).toBe('ค่ากินผันแปร');
    type(search(), 'เช่า');
    expect(rowNames()).toEqual(['ค่าเช่า']);
    type(search(), '  เช่า  ');
    expect(rowNames()).toEqual(['ค่าเช่า']);
  });

  it('says so when nothing matches', () => {
    render();
    open();
    type(search(), 'zzzz');
    expect(rows()).toHaveLength(0);
    expect(popover()!.textContent).toContain('ไม่พบหมวดหมู่ที่ตรงกับคำค้นหา');
  });

  it('a ✕ appears with text, clears it and keeps the cursor in the box', () => {
    render();
    open();
    expect(popover()!.querySelector('button.p-0\\.5')).toBeNull();
    type(search(), 'เช่า');
    click(popover()!.querySelector('button.p-0\\.5'));
    expect(search().value).toBe('');
    expect(rows()).toHaveLength(4);
    expect(document.activeElement).toBe(search());
  });

  it('typing highlights the first match', () => {
    render();
    open();
    type(search(), 'ค่า');
    expect(lit()).toEqual([true, false, false]);
  });

  it('reopening starts with an empty search and nothing highlighted', () => {
    render();
    open();
    type(search(), 'เช่า');
    open();
    open();
    expect(search().value).toBe('');
    expect(lit().every(x => !x)).toBe(true);
  });
});

describe('CategorySelect — quick picks (ใช้บ่อย)', () => {
  const picks = () => quick().map(b => b.textContent);

  it('are the categories of the most frequent items, of the right type, each once, at most five', () => {
    const many: Category[] = Array.from({ length: 8 }, (_, i) => cat(`m${i}`, `หมวด${i}`, 'expense', 'gv', i));
    render({ categories: many, frequentItems: [...many.map(m => freq(m.id)), freq('m0'), freq('i1')] });
    open();
    expect(picks()).toEqual(['หมวด0', 'หมวด1', 'หมวด2', 'หมวด3', 'หมวด4']);
  });

  it('skip items whose category is gone or of another type', () => {
    render({ frequentItems: [freq('ghost'), freq('i1'), freq('e3')] });
    open();
    expect(picks()).toEqual(['ค่าเช่า']);
  });

  it('with type "all" every type is eligible', () => {
    render({ type: 'all', frequentItems: [freq('i1'), freq('e3')] });
    open();
    expect(picks()).toEqual(['เงินเดือน', 'ค่าเช่า']);
  });

  it('fall back to the categories of the recent transactions when there are no frequent items', () => {
    const t = (category_id: string) => ({ id: Math.random().toString(), category_id } as unknown as TransactionDisplay);
    render({ transactions: [t('e3'), t('e1'), t('e1'), t('e1'), t('i1')] });
    open();
    expect(picks()).toEqual(['ค่ากิน', 'ค่าเช่า']);
  });

  it('frequent items that all miss fall back to the transactions too', () => {
    const t = (category_id: string) => ({ id: Math.random().toString(), category_id } as unknown as TransactionDisplay);
    render({ frequentItems: [freq('ghost')], transactions: [t('e2')] });
    open();
    expect(picks()).toEqual(['ค่าเดินทาง']);
  });

  it('are absent when there is no history', () => {
    render();
    open();
    expect(popover()!.textContent).not.toContain('ใช้บ่อย');
  });

  it('are hidden while searching', () => {
    render({ frequentItems: [freq('e3')] });
    open();
    expect(popover()!.textContent).toContain('ใช้บ่อย');
    type(search(), 'ค่า');
    expect(popover()!.textContent).not.toContain('ใช้บ่อย');
  });

  it('a click chooses, and the chosen one is lit', () => {
    render({ frequentItems: [freq('e3'), freq('e1')], value: 'e1' });
    open();
    expect(quick()[1].classList.contains('border-accent/70')).toBe(true);
    expect(quick()[0].classList.contains('border-accent/70')).toBe(false);
    click(quick()[0]);
    expect(onChange).toHaveBeenCalledWith('e3');
    expect(popover()).toBeNull();
  });
});

describe('CategorySelect — quick picks follow their inputs', () => {
  const picks = () => quick().map(b => b.textContent);
  const t = (category_id: string) => ({ id: Math.random().toString(), category_id } as unknown as TransactionDisplay);

  it('without a type any category of the history counts', () => {
    render({ type: undefined, frequentItems: [freq('e3'), freq('i1')] });
    open();
    expect(picks()).toEqual(['ค่าเช่า', 'เงินเดือน']);
  });

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

  it('follow a change of history while mounted', () => {
    render({ frequentItems: RENT, transactions: NO_TX });
    open();
    expect(picks()).toEqual(['ค่าเช่า']);
    render({ frequentItems: FOOD, transactions: NO_TX });
    expect(picks()).toEqual(['ค่ากิน']);
  });

  it('follow a change of type while mounted', () => {
    render({ type: 'expense', frequentItems: RENT_AND_PAY, transactions: NO_TX });
    open();
    expect(picks()).toEqual(['ค่าเช่า']);
    render({ type: 'income', frequentItems: RENT_AND_PAY, transactions: NO_TX });
    expect(picks()).toEqual(['เงินเดือน']);
  });

  it('the list follows a group renamed while mounted', () => {
    render();
    open();
    expect(headers()[0]).toBe('ประจำ1');
    render({ cashflowGroups: GROUPS.map(g => g.id === 'gf' ? { ...g, name: 'ประจำใหม่' } : g) });
    expect(headers()[0]).toBe('ประจำใหม่1');
  });

  it('a lone category is chosen by Enter right after opening, with nothing highlighted', () => {
    render({ type: 'income' });
    open();
    press(search(), 'Enter');
    expect(onChange).toHaveBeenCalledWith('i1');
  });

  it('Enter on a disabled trigger does not open it', () => {
    render({ disabled: true });
    press(trigger(), 'Enter');
    expect(popover()).toBeNull();
  });

  it('shows what was typed in the search box', () => {
    render();
    open();
    type(search(), 'เช่า');
    expect(search().value).toBe('เช่า');
  });

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

  it('the name is lightened when the colour is too dark to read', () => {
    expect(readable(DARK)).not.toBe(DARK);
    render({ variant: 'pill', value: 'dk', categories: dark });
    expect((trigger().querySelector('.truncate.flex') as HTMLElement).style.color).toBe(css('color', readable(DARK)));
  });

  it('follows a colour that changes (the memo is keyed on it)', () => {
    render({ variant: 'pill', value: 'e1' });
    const before = trigger().style.backgroundColor;
    render({ variant: 'pill', value: 'e2' });
    expect(trigger().style.backgroundColor).not.toBe(before);
  });

  it('is a disabled button when disabled, not only a guarded one', () => {
    render({ variant: 'pill', disabled: true });
    expect(trigger().disabled).toBe(true);
  });

  it('the glyph wears the category colour', () => {
    render({ variant: 'pill', value: 'e1' });
    expect((trigger().querySelector('svg.lucide-tag') as SVGElement).style.color).toBe(css('color', '#FF8800'));
  });
});

describe('CategorySelect — where the list appears', () => {
  const style = () => popover()!.style;

  it('keeps 16px from the right edge: a list 2px short of fitting is pulled back', () => {
    rect = { left: 690, top: 100, width: 320, height: 36 }; // 690 + 320 = 1010 > 1008
    render();
    open();
    expect(style().left).toBe(`${1024 - 320 - 16}px`);
  });

  it('the 16px margin counts below: 358px of room is not enough for 360, and 374px without the margin would be', () => {
    rect = { left: 100, top: 380, width: 320, height: 14 }; // bottom 394: below 768 - 394 - 16 = 358; above 364
    render();
    open();
    expect(style().bottom).toBe(`${768 - 380 + 4}px`);
  });

  it('stays below when it fits, even if there is a little more room above', () => {
    rect = { left: 100, top: 385, width: 320, height: 5 }; // below 362 ≥ 360; above 369
    render();
    open();
    expect(style().top).toBe('394px');
    expect(style().bottom).toBe('');
  });

  it('a trigger that turns into the pill form takes the pill width on its next opening', () => {
    rect = { left: 100, top: 100, width: 120, height: 36 };
    render({ variant: 'default' });
    open();
    expect(style().width).toBe('300px');
    open();
    render({ variant: 'pill' });
    open();
    expect(style().width).toBe('320px');
  });

  it('under the trigger, as wide as it (300–340px), aligned to its left edge', () => {
    rect = { left: 100, top: 100, width: 320, height: 36 };
    render();
    open();
    expect(style().top).toBe('140px'); // 136 + 4
    expect(style().left).toBe('100px');
    expect(style().width).toBe('320px');
    expect(style().maxHeight).toBe('360px');
  });

  it('a narrow trigger still gets at least 300px; a wide one at most 340px', () => {
    rect = { left: 100, top: 100, width: 120, height: 36 };
    render();
    open();
    expect(style().width).toBe('300px');
    open();
    rect = { left: 100, top: 100, width: 600, height: 36 };
    open();
    expect(style().width).toBe('340px');
  });

  it('the pill form is always 320px', () => {
    rect = { left: 100, top: 100, width: 120, height: 28 };
    render({ variant: 'pill' });
    open();
    expect(style().width).toBe('320px');
    open();
    rect = { left: 100, top: 100, width: 600, height: 28 };
    open();
    expect(style().width).toBe('320px');
  });

  it('never wider than the window minus 32px', () => {
    const w = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { value: 280, configurable: true });
    rect = { left: 0, top: 100, width: 320, height: 36 };
    render();
    open();
    expect(style().width).toBe('248px');
    Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
  });

  it('pulled back inside the window on the right, and kept 16px from the left', () => {
    rect = { left: 900, top: 100, width: 320, height: 36 };
    render();
    open();
    expect(style().left).toBe(`${1024 - 320 - 16}px`);
    open();
    rect = { left: 0, top: 100, width: 320, height: 36 };
    open();
    expect(style().left).toBe('16px');
  });

  it('opens upwards when there is no room below but more above, and shrinks to the room', () => {
    rect = { left: 100, top: 500, width: 320, height: 36 }; // below 768 - 536 - 16 = 216 < 360; above 484
    render();
    open();
    expect(style().bottom).toBe(`${768 - 500 + 4}px`);
    expect(style().top).toBe('');
    expect(style().maxHeight).toBe('360px'); // min(360, max(200, 484))
  });

  it('...with at least 200px, at most the room above', () => {
    rect = { left: 100, top: 230, width: 320, height: 500 }; // below 768 - 730 - 16 = 22; above 214
    render();
    open();
    expect(style().bottom).toBe(`${768 - 230 + 4}px`);
    expect(style().maxHeight).toBe('214px');
    open();
    rect = { left: 100, top: 215, width: 320, height: 520 }; // below -3 (<200); above 199 (<200 → 200)
    open();
    expect(style().maxHeight).toBe('200px');
  });

  it('stays below when there is room, even if there is more above', () => {
    rect = { left: 100, top: 400, width: 320, height: 36 }; // below 768 - 436 - 16 = 316 < 360, above 384 → up
    render();
    open();
    expect(style().bottom).toBe(`${768 - 400 + 4}px`);
    open();
    rect = { left: 100, top: 300, width: 320, height: 36 }; // below 416 ≥ 360
    open();
    expect(style().top).toBe('340px');
    expect(style().maxHeight).toBe('360px');
  });

  it('stays below, shrunk to the room (min 200), when above is no bigger', () => {
    rect = { left: 100, top: 20, width: 320, height: 600 }; // below 768 - 620 - 16 = 132; above 4
    render();
    open();
    expect(style().top).toBe('624px');
    expect(style().bottom).toBe('');
    expect(style().maxHeight).toBe('200px');
  });

  it('follows the trigger on resize', () => {
    render();
    open();
    expect(style().left).toBe('100px');
    rect = { ...rect, left: 150 };
    act(() => { window.dispatchEvent(new Event('resize')); });
    expect(style().left).toBe('150px');
  });
});

describe('CategorySelect — closing', () => {
  it('a mousedown outside closes it and returns focus to the trigger; inside does not', () => {
    render();
    open();
    act(() => { trigger().dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    act(() => { search().dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(popover()).not.toBeNull();
    act(() => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(popover()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('scrolling the page closes it, scrolling inside the list does not', () => {
    render();
    open();
    act(() => { popover()!.querySelector('.tactical-scrollbar')!.dispatchEvent(new Event('scroll')); });
    expect(popover()).not.toBeNull();
    act(() => { document.body.dispatchEvent(new Event('scroll')); });
    expect(popover()).toBeNull();
  });

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
  it.each(['Enter', ' ', 'ArrowDown'])('"%s" on the closed trigger opens it (and does not submit a form)', (k) => {
    render();
    const e = press(trigger(), k);
    expect(popover()).not.toBeNull();
    expect(e.defaultPrevented).toBe(true);
  });

  it('other keys on the closed trigger do nothing — Esc still reaches a surrounding modal', () => {
    render();
    for (const k of ['a', 'Escape', 'Tab', 'ArrowUp']) expect(press(trigger(), k).defaultPrevented).toBe(false);
    expect(popover()).toBeNull();
    expect(windowKey).toHaveBeenCalledTimes(4);
  });

  it('Esc closes the open list, hands focus back and goes no further', () => {
    render();
    open();
    windowKey.mockClear();
    const e = press(search(), 'Escape');
    expect(popover()).toBeNull();
    expect(e.defaultPrevented).toBe(true);
    expect(windowKey).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger());
  });

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

  it('arrow keys are not left to scroll the page', () => {
    render();
    open();
    expect(press(search(), 'ArrowDown').defaultPrevented).toBe(true);
    expect(press(search(), 'ArrowUp').defaultPrevented).toBe(true);
  });

  it('arrows on an empty result do nothing', () => {
    render();
    open();
    type(search(), 'zzzz');
    press(search(), 'ArrowDown');
    press(search(), 'ArrowUp');
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('Enter picks the highlighted row', () => {
    render();
    open();
    press(search(), 'ArrowDown');
    press(search(), 'ArrowDown');
    const e = press(search(), 'Enter');
    expect(onChange).toHaveBeenCalledWith('e1');
    expect(popover()).toBeNull();
    expect(e.defaultPrevented).toBe(true);
  });

  it('Enter with a single match picks it even if nothing is highlighted', () => {
    render();
    open();
    type(search(), 'เช่า');
    // typing highlights the first row; move off it with ArrowDown/Up wrap so nothing... (one row: it stays on 0)
    press(search(), 'Enter');
    expect(onChange).toHaveBeenCalledWith('e3');
  });

  it('Enter with several matches and nothing highlighted picks nothing', () => {
    render();
    open();
    press(search(), 'Enter');
    expect(onChange).not.toHaveBeenCalled();
    expect(popover()).not.toBeNull();
  });

  it('Enter with no match picks nothing', () => {
    render();
    open();
    type(search(), 'zzzz');
    press(search(), 'Enter');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a space typed into the search is not swallowed', () => {
    render();
    open();
    expect(press(search(), ' ').defaultPrevented).toBe(false);
    expect(popover()).not.toBeNull();
  });

  it('hovering a row highlights it, and Enter picks that one', () => {
    render();
    open();
    act(() => { rows()[3].dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
    expect(lit()).toEqual([false, false, false, true]);
    press(search(), 'Enter');
    expect(onChange).toHaveBeenCalledWith('e4');
  });

  it('the keys work from the trigger too (it keeps focus when opened with the mouse)', () => {
    render();
    open();
    press(trigger(), 'ArrowDown');
    press(trigger(), 'Enter');
    expect(onChange).toHaveBeenCalledWith('e3');
  });
});
