// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import DayTypeSelect, { DayTypeSelectProps } from '../DayTypeSelect';
import { readable } from '@/constants/theme';
import { hexToRgb } from '@/utils/formatters';
import { click, q } from '@/test-utils/dom';
import type { DayType } from '@/types';

// jsdom has no layout: the trigger's rectangle is stubbed, the viewport is jsdom's 1024 x 768.
type Rect = { left: number; top: number; width: number; height: number };
let rect: Rect;
let root: Root;
let host: HTMLDivElement;
let onChange: ReturnType<typeof vi.fn>;
let parentClick: ReturnType<typeof vi.fn>;
let windowKey: ReturnType<typeof vi.fn>;
let scrollIntoView: ReturnType<typeof vi.fn>;

const TYPES: DayType[] = [
  { id: 'dt-work', name: 'workday', label: 'ทำงาน', color: '#3B82F6' },
  { id: 'dt-hol', name: 'holiday', label: 'วันหยุด', color: '#F59E0B' },
  { id: 'dt-ot', name: 'ot', label: 'โอที', color: '#10B981' },
];

const render = (p: Partial<DayTypeSelectProps> = {}) =>
  act(() => root.render(<div onClick={parentClick}><DayTypeSelect onChange={onChange} dayTypeConfig={TYPES} value="dt-hol" {...p} /></div>));

beforeEach(() => {
  rect = { left: 500, top: 100, width: 80, height: 23 };
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
    ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top, toJSON: () => ({}),
  }));
  scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView as unknown as typeof Element.prototype.scrollIntoView;
  onChange = vi.fn();
  parentClick = vi.fn();
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
});

const trigger = () => q<HTMLButtonElement>('button.day-type-badge')!;
const popover = () => q<HTMLElement>('div.fixed');
const items = () => [...document.querySelectorAll<HTMLButtonElement>('.tactical-scrollbar button')];
const open = () => click(trigger());
const press = (el: Element, k: string) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  act(() => { el.dispatchEvent(e); });
  return e;
};
const css = (prop: 'color' | 'backgroundColor' | 'borderColor', v: string) => { const d = document.createElement('div'); d.style[prop] = v; return d.style[prop]; };
const hover = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
const rgba = (hex: string, a: number) => `rgba(${hexToRgb(hex)}, ${a})`;

describe('DayTypeSelect — trigger', () => {
  it('shows the label of the current day type, and says so in its tooltip', () => {
    render({ value: 'dt-ot' });
    expect(trigger().textContent).toBe('โอที');
    expect(trigger().title).toBe('คลิกเพื่อเปลี่ยนประเภทวัน (ปัจจุบัน: โอที)');
  });

  it('a value that matches nothing (or none) shows the first day type', () => {
    render({ value: 'nope' });
    expect(trigger().textContent).toBe('ทำงาน');
    render({ value: undefined });
    expect(trigger().textContent).toBe('ทำงาน');
  });

  it('with no day types at all: a placeholder, and nothing to open', () => {
    render({ dayTypeConfig: [] });
    expect(trigger().textContent).toBe('เลือกประเภท');
    expect(trigger().title).toBe('คลิกเพื่อเปลี่ยนประเภทวัน (ปัจจุบัน: )');
  });

  it('the list defaults to empty when the config is missing', () => {
    render({ dayTypeConfig: undefined });
    expect(trigger().textContent).toBe('เลือกประเภท');
  });

  it('is tinted with the day type colour (bg 12%, border 35%, text made readable)', () => {
    render({ value: 'dt-hol', size: 'sm' });
    expect(trigger().style.backgroundColor).toBe(css('backgroundColor', rgba('#F59E0B', 0.12)));
    expect(trigger().style.borderColor).toBe(css('borderColor', rgba('#F59E0B', 0.35)));
    expect(trigger().style.color).toBe(css('color', readable('#F59E0B')));
  });

  it('a day type without a colour falls back to slate', () => {
    render({ dayTypeConfig: [{ id: 'x', label: 'ไม่มีสี' }], value: 'x', size: 'sm' });
    expect(trigger().style.backgroundColor).toBe(css('backgroundColor', rgba('#64748b', 0.12)));
  });

  it.each([
    ['by label', { id: 'a', name: 'other', label: 'ทำงาน', color: '#3B82F6' }],
    ['by id', { id: 'work', name: 'other', label: 'x', color: '#3B82F6' }],
    ['by name', { id: 'a', name: 'work', label: 'x', color: '#3B82F6' }],
  ])('on the small badge a work day is quieter (6% / 20%) — recognised %s', (_how, dt) => {
    render({ dayTypeConfig: [dt as DayType], value: dt.id, size: 'xs' });
    expect(trigger().style.backgroundColor).toBe(css('backgroundColor', rgba('#3B82F6', 0.06)));
    expect(trigger().style.borderColor).toBe(css('borderColor', rgba('#3B82F6', 0.20)));
  });

  it('...but only on the small badge, and only for work days', () => {
    render({ value: 'dt-work', size: 'sm' });
    expect(trigger().style.backgroundColor).toBe(css('backgroundColor', rgba('#3B82F6', 0.12)));
    render({ value: 'dt-hol', size: 'xs' });
    expect(trigger().style.backgroundColor).toBe(css('backgroundColor', rgba('#F59E0B', 0.12)));
    expect(trigger().style.borderColor).toBe(css('borderColor', rgba('#F59E0B', 0.35)));
  });

  it('sizes: xs is the default', () => {
    render();
    expect(trigger().classList.contains('h-[23px]')).toBe(true);
    expect(trigger().classList.contains('h-7')).toBe(false);
    render({ size: 'sm' });
    expect(trigger().classList.contains('h-7')).toBe(true);
    expect(trigger().classList.contains('h-[23px]')).toBe(false);
  });

  it('takes an extra class, and is a plain button', () => {
    render({ className: 'my-extra' });
    expect(trigger().classList.contains('my-extra')).toBe(true);
    expect(trigger().type).toBe('button');
  });

  it('disabled: a click opens nothing', () => {
    render({ disabled: true });
    expect(trigger().disabled).toBe(true);
    open();
    expect(popover()).toBeNull();
  });
});

describe('DayTypeSelect — the list', () => {
  it('opens in the page body with one row per day type, the current one marked', () => {
    render({ value: 'dt-hol' });
    open();
    expect(popover()!.parentElement).toBe(document.body);
    expect(items().map(i => i.textContent)).toEqual(['ทำงาน', 'วันหยุด', 'โอที']);
    expect(items().map(i => i.querySelectorAll('svg.lucide-check').length)).toEqual([0, 1, 0]);
  });

  it('each row has a colour bar in its own colour; the selected label is made readable', () => {
    render({ value: 'dt-hol' });
    open();
    const bar = (i: number) => items()[i].querySelector<HTMLElement>('.w-1\\.5')!.style.backgroundColor;
    expect(bar(0)).toBe(css('backgroundColor', '#3B82F6'));
    expect(bar(1)).toBe(css('backgroundColor', '#F59E0B'));
    const label = (i: number) => items()[i].querySelector<HTMLElement>('span.truncate')!.style.color;
    expect(label(1)).toBe(css('color', readable('#F59E0B')));
    expect(label(0)).toBe('');
  });

  it('the selected row is outlined at 50% and tinted at 14% in its colour; the others are plain', () => {
    render({ value: 'dt-hol' });
    open();
    expect(items()[1].style.borderColor).toBe(css('borderColor', rgba('#F59E0B', 0.5)));
    expect(items()[1].style.backgroundColor).toBe(css('backgroundColor', rgba('#F59E0B', 0.14)));
    expect(items()[2].style.backgroundColor).toBe('');
  });

  it('the header names the list and the footer teaches the keys', () => {
    render();
    open();
    expect(popover()!.textContent).toContain('ประเภทวัน');
    expect(popover()!.textContent).toContain('↑↓ นำทาง');
    expect(popover()!.textContent).toContain('Esc ปิด');
  });

  it('with a date, the header also shows its weekday chip and day + month', () => {
    render({ dateStr: '2026-10-08' }); // a Thursday
    open();
    expect(popover()!.textContent).toContain('พฤ.');
    expect(popover()!.textContent).toContain('8 ต.ค.');
  });

  it('every weekday gets its own chip', () => {
    const want = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    for (let d = 4; d <= 10; d++) { // 4 Oct 2026 is a Sunday
      render({ dateStr: `2026-10-${String(d).padStart(2, '0')}` });
      open();
      expect(popover()!.textContent).toContain(want[d - 4]);
      open();
    }
  });

  it('without a date there is no weekday chip and no date', () => {
    render();
    open();
    const header = popover()!.querySelector('.border-b')!;
    expect(header.children).toHaveLength(1);
    expect(header.textContent).toBe('ประเภทวัน');
  });

  it('an unparseable date shows no weekday chip', () => {
    render({ dateStr: 'not-a-date' });
    open();
    expect(popover()!.querySelector('.border')!.textContent).not.toMatch(/พฤ\.|อา\./);
  });

  it('is never wider or taller than its limits', () => {
    render();
    open();
    expect(popover()!.style.maxHeight).toBe('380px');
    expect(popover()!.style.width).toBe('205px');
  });

  it('choosing a row reports its id, closes the list and returns focus to the trigger', () => {
    render({ value: 'dt-hol' });
    open();
    click(items()[2]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('dt-ot');
    expect(popover()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('choosing the current value reports it too', () => {
    render({ value: 'dt-hol' });
    open();
    click(items()[1]);
    expect(onChange).toHaveBeenCalledWith('dt-hol');
  });

  it('clicking the trigger again closes it; no click ever reaches the parent', () => {
    render();
    open();
    open();
    expect(popover()).toBeNull();
    open();
    act(() => { popover()!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    click(items()[0]);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('opening starts on the current value; an unknown value starts on the first row', () => {
    render({ value: 'dt-ot' });
    open();
    press(trigger(), 'Enter');
    expect(onChange).toHaveBeenCalledWith('dt-ot');
    onChange.mockClear();
    render({ value: 'nope' });
    open();
    press(trigger(), 'Enter');
    expect(onChange).toHaveBeenCalledWith('dt-work');
  });
});

describe('DayTypeSelect — colours that must stay readable', () => {
  const DARK = '#1E3A8A';
  const darkTypes: DayType[] = [{ id: 'dk', name: 'x', label: 'มืด', color: DARK }, { id: 'dk2', name: 'y', label: 'มืดสอง', color: DARK }];

  it('(the dark colour used here really needs lightening)', () => {
    expect(readable(DARK)).not.toBe(DARK);
  });

  it('the badge text, the selected row label and its check are all lightened', () => {
    render({ dayTypeConfig: darkTypes, value: 'dk', size: 'sm' });
    expect(trigger().style.color).toBe(css('color', readable(DARK)));
    open();
    expect(items()[0].querySelector<HTMLElement>('span.truncate')!.style.color).toBe(css('color', readable(DARK)));
    expect((items()[0].querySelector('svg.lucide-check') as SVGElement).style.color).toBe(css('color', readable(DARK)));
  });
});

describe('DayTypeSelect — rows', () => {
  it('a type without a colour gets the slate bar', () => {
    render({ dayTypeConfig: [{ id: 'x', label: 'ไม่มีสี' }, TYPES[0]], value: 'dt-work' });
    open();
    const bar = items()[0].querySelector<HTMLElement>('.w-1\\.5')!;
    expect(bar.style.backgroundColor).toBe(css('backgroundColor', '#64748b'));
  });

  it('the selected row, when the pointer is on another one, keeps its own look', () => {
    render({ value: 'dt-hol' });
    open();
    expect(items()[1].classList.contains('bg-surface-hover')).toBe(true); // opened on it: highlighted
    act(() => { items()[0].dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
    expect(items()[0].classList.contains('bg-surface-hover')).toBe(true);
    expect(items()[1].classList.contains('bg-canvas')).toBe(true);
    expect(items()[1].classList.contains('bg-surface-hover')).toBe(false);
    expect(items()[2].classList.contains('bg-transparent')).toBe(true);
  });

  it('a mousedown inside the open list never reaches a parent that handles it', () => {
    const parentDown = vi.fn();
    act(() => root.render(<div onMouseDown={parentDown}><DayTypeSelect onChange={onChange} dayTypeConfig={TYPES} value="dt-hol" /></div>));
    open();
    act(() => { popover()!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    act(() => { items()[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(parentDown).not.toHaveBeenCalled();
  });

  it('opening with the keyboard positions the list just like a click (not at the page corner)', () => {
    rect = { left: 500, top: 100, width: 80, height: 23 };
    render();
    press(trigger(), 'Enter');
    expect(popover()!.style.top).toBe('127px');
    expect(popover()!.style.left).toBe('375px');
  });

  it('the position follows a topOffset or day-type count that changed after mount', () => {
    rect = { left: 500, top: 100, width: 80, height: 23 };
    render({ topOffset: 4 });
    render({ topOffset: 20 });
    open();
    expect(popover()!.style.top).toBe('143px');
    open();
    // a long list now needs 360px of room: 768 - 523 - 12 = 233 is not enough, so it flips (it did not with 3 types)
    rect = { left: 500, top: 500, width: 80, height: 23 };
    const many = Array.from({ length: 40 }, (_, i) => ({ id: `d${i}`, label: `ประเภท ${i}`, color: '#3B82F6' }));
    render({ topOffset: 20, dayTypeConfig: many, value: 'd0' });
    open();
    expect(popover()!.style.bottom).toBe(`${768 - 500 + 4}px`);
  });
});

describe('DayTypeSelect — where the list appears', () => {
  const style = () => popover()!.style;

  it('needs about 178px for 3 types: 156px below is not enough, 176px is not enough, 188px is', () => {
    rect = { left: 500, top: 500, width: 80, height: 100 }; // below 768 - 600 - 12 = 156
    render();
    open();
    expect(style().bottom).toBe(`${768 - 500 + 4}px`);
    open();
    rect = { left: 500, top: 540, width: 80, height: 40 }; // below 768 - 580 - 12 = 176
    open();
    expect(style().bottom).toBe(`${768 - 540 + 4}px`);
    open();
    rect = { left: 500, top: 520, width: 80, height: 48 }; // below 768 - 568 - 12 = 188
    open();
    expect(style().top).toBe('572px');
  });

  it('the 12px margins count on both sides when comparing room above and below', () => {
    rect = { left: 500, top: 105, width: 80, height: 551 }; // below 100 (< 178), above 93: not more than below → stays down
    render();
    open();
    expect(style().top).toBe('660px');
    expect(style().bottom).toBe('');
  });

  it('under the trigger, right-aligned to it, 4px below', () => {
    rect = { left: 500, top: 100, width: 80, height: 23 };
    render();
    open();
    expect(style().top).toBe('127px'); // bottom 123 + 4
    expect(style().bottom).toBe('');
    expect(style().left).toBe('375px'); // right 580 - 205
  });

  it('topOffset widens the gap under the trigger', () => {
    render({ topOffset: 14 });
    open();
    expect(style().top).toBe('137px');
  });

  it('stays inside the viewport on the left', () => {
    rect = { left: 0, top: 100, width: 80, height: 23 };
    render();
    open();
    expect(style().left).toBe('12px');
  });

  it('stays inside the viewport on the right', () => {
    rect = { left: 990, top: 100, width: 80, height: 23 };
    render();
    open();
    expect(style().left).toBe(`${1024 - 205 - 12}px`);
  });

  it('opens upwards (ignoring topOffset) when there is no room below but more above', () => {
    rect = { left: 500, top: 700, width: 80, height: 23 }; // below 768 - 723 - 12 = 33 < 178; above 688
    render({ topOffset: 14 });
    open();
    expect(style().bottom).toBe(`${768 - 700 + 4}px`);
    expect(style().top).toBe('');
  });

  it('stays below when it is tight both ways but there is more room below', () => {
    rect = { left: 500, top: 20, width: 80, height: 690 }; // below 768 - 710 - 12 = 46 < 178; above 8
    render();
    open();
    expect(style().top).toBe('714px');
  });

  it('stays below when it fits, even if there is more room above', () => {
    rect = { left: 500, top: 500, width: 80, height: 23 }; // below 233 ≥ 178
    render();
    open();
    expect(style().top).toBe('527px');
  });

  it('a long list needs room for 360px at most', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ id: `d${i}`, label: `ประเภท ${i}`, color: '#3B82F6' }));
    rect = { left: 500, top: 450, width: 80, height: 23 }; // below 768 - 473 - 12 = 283 < 360 (capped), above 438 → up
    render({ dayTypeConfig: many, value: 'd0' });
    open();
    expect(style().bottom).toBe(`${768 - 450 + 4}px`);
  });

  it('a short list needs less room', () => {
    rect = { left: 500, top: 450, width: 80, height: 23 }; // below 283 ≥ 1 * 36 + 70 → stays down
    render({ dayTypeConfig: [TYPES[0]], value: 'dt-work' });
    open();
    expect(style().top).toBe('477px');
  });

  it('follows the trigger when the window is resized', () => {
    render();
    open();
    expect(style().left).toBe('375px');
    rect = { ...rect, left: 300 };
    act(() => { window.dispatchEvent(new Event('resize')); });
    expect(style().left).toBe('175px');
  });
});

describe('DayTypeSelect — closing', () => {
  it('a mousedown outside closes it; inside the trigger or the list does not', () => {
    render();
    open();
    act(() => { trigger().dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    act(() => { items()[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(popover()).not.toBeNull();
    act(() => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(popover()).toBeNull();
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
    open();
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

describe('DayTypeSelect — keyboard', () => {
  it.each(['Enter', ' ', 'ArrowDown'])('"%s" on the closed trigger opens it, and the key goes no further', (k) => {
    render();
    const e = press(trigger(), k);
    expect(popover()).not.toBeNull();
    expect(e.defaultPrevented).toBe(true);
    expect(windowKey).not.toHaveBeenCalled();
  });

  it('other keys on the closed trigger are left alone — Esc still reaches a surrounding modal', () => {
    render();
    for (const k of ['a', 'Escape', 'Tab', 'ArrowUp']) expect(press(trigger(), k).defaultPrevented).toBe(false);
    expect(popover()).toBeNull();
    expect(windowKey).toHaveBeenCalledTimes(4);
  });

  // AllocationSelect, the sibling picker, closes on Tab as well; a list left floating while focus moves on is a trap for keyboard users.
  it.each(['Escape', 'Tab'])('"%s" closes the open list, keeps focus on the trigger and goes no further', (k) => {
    render();
    open();
    windowKey.mockClear();
    const e = press(trigger(), k);
    expect(popover()).toBeNull();
    expect(e.defaultPrevented).toBe(true);
    expect(windowKey).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger());
  });

  it('arrows move the highlight and wrap at both ends', () => {
    render({ value: 'dt-ot' });
    press(trigger(), 'Enter');
    const lit = () => items().map(i => i.classList.contains('bg-surface-hover') && !i.classList.contains('hover:bg-surface-hover'));
    expect(lit()).toEqual([false, false, true]);
    press(trigger(), 'ArrowDown'); // wraps to the first
    expect(lit()).toEqual([true, false, false]);
    press(trigger(), 'ArrowUp'); // wraps back to the last
    expect(lit()).toEqual([false, false, true]);
    press(trigger(), 'ArrowUp');
    expect(lit()).toEqual([false, true, false]);
  });

  it('arrows are swallowed and scroll the highlighted row into view', () => {
    render();
    press(trigger(), 'Enter');
    scrollIntoView.mockClear();
    windowKey.mockClear();
    expect(press(trigger(), 'ArrowDown').defaultPrevented).toBe(true);
    expect(press(trigger(), 'ArrowUp').defaultPrevented).toBe(true);
    expect(windowKey).not.toHaveBeenCalled();
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
  });

  it.each(['Enter', ' '])('"%s" picks the highlighted row, closes and refocuses', (k) => {
    render({ value: 'dt-work' });
    press(trigger(), 'Enter');
    press(trigger(), 'ArrowDown');
    windowKey.mockClear();
    const e = press(trigger(), k);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('dt-hol');
    expect(popover()).toBeNull();
    expect(e.defaultPrevented).toBe(true);
    expect(windowKey).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger());
  });

  it('other keys inside the open list do nothing', () => {
    render();
    press(trigger(), 'Enter');
    for (const k of ['a', 'Home', 'ArrowLeft']) expect(press(trigger(), k).defaultPrevented).toBe(false);
    expect(popover()).not.toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('hovering a row highlights it (tint at 8%), and Enter then picks that one', () => {
    render({ value: 'dt-hol' });
    press(trigger(), 'Enter');
    hover(items()[2]);
    expect(items()[2].style.backgroundColor).toBe(css('backgroundColor', rgba('#10B981', 0.08)));
    expect(items()[2].style.borderColor).toBe('rgb(var(--overlay) / 0.1)');
    press(trigger(), 'Enter');
    expect(onChange).toHaveBeenCalledWith('dt-ot');
  });

  it('closing resets the highlight: reopening starts on the current value again', () => {
    render({ value: 'dt-hol' });
    press(trigger(), 'Enter');
    press(trigger(), 'ArrowDown');
    press(trigger(), 'Escape');
    press(trigger(), 'Enter');
    press(trigger(), 'Enter');
    expect(onChange).toHaveBeenCalledWith('dt-hol');
  });

  it('with nothing to list the arrows do nothing and Enter selects nothing', () => {
    render({ dayTypeConfig: [], value: undefined });
    press(trigger(), 'Enter');
    expect(popover()).not.toBeNull();
    press(trigger(), 'ArrowDown');
    press(trigger(), 'ArrowUp');
    press(trigger(), 'Enter');
    expect(onChange).not.toHaveBeenCalled();
  });
});
