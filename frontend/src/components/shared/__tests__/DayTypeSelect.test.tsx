// @vitest-environment jsdom
import type { Mock } from 'vitest';
type AnyMock = Mock<(...args: any[]) => any>;
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
let onChange: AnyMock;
let parentClick: AnyMock;
let windowKey: AnyMock;
let scrollIntoView: AnyMock;

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

});

describe('DayTypeSelect — the list', () => {

  it('the selected row is outlined at 50% and tinted at 14% in its colour; the others are plain', () => {
    render({ value: 'dt-hol' });
    open();
    expect(items()[1].style.borderColor).toBe(css('borderColor', rgba('#F59E0B', 0.5)));
    expect(items()[1].style.backgroundColor).toBe(css('backgroundColor', rgba('#F59E0B', 0.14)));
    expect(items()[2].style.backgroundColor).toBe('');
  });

});

describe('DayTypeSelect — closing', () => {

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

  // AllocationSelect, the sibling picker, closes on Tab as well; a list left floating while focus moves on is a trap for keyboard users.

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

  it('hovering a row highlights it (tint at 8%), and Enter then picks that one', () => {
    render({ value: 'dt-hol' });
    press(trigger(), 'Enter');
    hover(items()[2]);
    expect(items()[2].style.backgroundColor).toBe(css('backgroundColor', rgba('#10B981', 0.08)));
    expect(items()[2].style.borderColor).toBe('rgb(var(--overlay) / 0.1)');
    press(trigger(), 'Enter');
    expect(onChange).toHaveBeenCalledWith('dt-ot');
  });

});
