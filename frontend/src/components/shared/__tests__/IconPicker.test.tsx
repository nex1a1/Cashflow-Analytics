// @vitest-environment jsdom
import type { Mock } from 'vitest';
type AnyMock = Mock<(...args: any[]) => any>;
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import IconPicker, { IconPickerProps } from '../IconPicker';
import { CATEGORY_ICONS, ICON_CATEGORIES } from '@/constants/categoryIcons';
import { tc } from '@/constants/theme';
import { click, type, q, byText } from '@/test-utils/dom';

// jsdom has no layout: the trigger's rectangle is stubbed, the viewport is jsdom's 1024 x 768.
type Rect = { left: number; top: number; width: number; height: number };
let rect: Rect;
let root: Root;
let host: HTMLDivElement;
let onChange: AnyMock;
let windowKey: AnyMock;

const render = (p: Partial<IconPickerProps> = {}) =>
  act(() => root.render(<IconPicker icon={null} onChange={onChange} {...p} />));

const setScroll = (x: number, y: number) => {
  Object.defineProperty(window, 'scrollX', { value: x, configurable: true });
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
};

beforeEach(() => {
  rect = { left: 100, top: 20, width: 32, height: 32 };
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
    ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top, toJSON: () => ({}),
  }));
  setScroll(0, 0);
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

const trigger = () => q<HTMLButtonElement>('button[aria-label="เลือกไอคอน"]')!;
const palette = () => q<HTMLElement>('div.fixed');
const search = () => q<HTMLInputElement>('input[type="text"]')!;
const grid = () => q<HTMLElement>('.grid-cols-12');
const cells = () => [...document.querySelectorAll<HTMLButtonElement>('.grid-cols-12 > button')];
const cell = (key: string) => cells().find(c => c.title === CATEGORY_ICONS.find(i => i.key === key)!.label)!;
const open = () => click(trigger());
const pill = (label: string) => byText('.overflow-x-auto button', label) as HTMLButtonElement;
const pressKey = (k: string, target: Element = document.body) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  act(() => { target.dispatchEvent(e); });
  return e;
};
const shown = () => cells().map(c => c.title);
const labelsOf = (pred: (i: (typeof CATEGORY_ICONS)[number]) => boolean) => CATEGORY_ICONS.filter(pred).map(i => i.label);
const infoBar = () => q('.min-h-\\[28px\\]')!;
const countText = () => document.body.textContent!;

describe('IconPicker — opening', () => {

  it('lists every icon, with its count twice (search bar and info bar)', () => {
    render();
    open();
    expect(cells()).toHaveLength(CATEGORY_ICONS.length);
    expect(countText()).toContain(`${CATEGORY_ICONS.length} ไอคอน`);
    expect(countText()).toContain(`${CATEGORY_ICONS.length} / ${CATEGORY_ICONS.length}`);
  });

});

describe('IconPicker — closing', () => {

  it('removes every document / window listener it added (the same handler serves all three, so check type by type)', () => {
    const spies = [document, window].map(t => ({ add: vi.spyOn(t, 'addEventListener'), rem: vi.spyOn(t, 'removeEventListener') }));
    const types = ['mousedown', 'keydown', 'scroll'];
    render();
    open();
    open();
    const pick = (k: 'add' | 'rem') => spies.flatMap(s => s[k].mock.calls.filter(c => types.includes(c[0])).map(c => c[0] as string)).sort();
    expect(pick('add')).toEqual(['keydown', 'mousedown', 'scroll']);
    expect(pick('rem')).toEqual(['keydown', 'mousedown', 'scroll']);
  });

  it('listens to nothing while closed', () => {
    const spies = [document, window].map(t => vi.spyOn(t, 'addEventListener'));
    render();
    expect(spies.flatMap(s => s.mock.calls.filter(c => ['mousedown', 'keydown', 'scroll'].includes(c[0])))).toHaveLength(0);
  });
});
