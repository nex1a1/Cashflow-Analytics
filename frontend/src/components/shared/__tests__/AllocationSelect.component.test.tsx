// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import AllocationSelect, { AllocationSelectProps } from '../AllocationSelect';
import { ALLOCATION_COLORS, readable } from '@/constants/theme';
import { hexToRgb } from '@/utils/formatters';
import { click, q } from '@/test-utils/dom';

// jsdom has no layout: the trigger's rectangle is stubbed, the viewport is jsdom's 1024 x 768.
type Rect = { left: number; top: number; width: number; height: number };
let rect: Rect;
let root: Root;
let host: HTMLDivElement;
let onChange: ReturnType<typeof vi.fn>;
let parentClick: ReturnType<typeof vi.fn>;
let windowKey: ReturnType<typeof vi.fn>;
let scrollIntoView: ReturnType<typeof vi.fn>;

const render = (p: Partial<AllocationSelectProps> = {}) =>
  act(() => root.render(<div onClick={parentClick}><AllocationSelect onChange={onChange} {...p} /></div>));

beforeEach(() => {
  rect = { left: 500, top: 100, width: 80, height: 25 };
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

const trigger = () => q<HTMLButtonElement>('button.allocation-trigger')!;
const list = () => q('[role="listbox"]');
const options = () => [...document.querySelectorAll<HTMLButtonElement>('[role="option"]')];
const open = () => click(trigger());
const press = (el: Element, k: string) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  act(() => { el.dispatchEvent(e); });
  return e;
};
/** colour as the browser would normalise it, so a hex token can be compared with element.style */
const css = (prop: 'color' | 'backgroundColor' | 'borderColor', v: string) => { const d = document.createElement('div'); d.style[prop] = v; return d.style[prop]; };
const hover = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });

describe('AllocationSelect — trigger', () => {
  it.each([
    [undefined, 'WANT', 'ทั่วไป'],
    ['want', 'WANT', 'ทั่วไป'],
    ['need', 'NEED', 'จำเป็น'],
    ['savings', 'SAVE', 'เงินออม'],
    [null, 'WANT', 'ทั่วไป'],
    ['bogus', 'WANT', 'ทั่วไป'],
    ['SAVE', 'WANT', 'ทั่วไป'],
  ])('value %s reads %s', (value, label, thai) => {
    render({ value: value as string | null | undefined });
    expect(trigger().textContent).toBe(label);
    expect(trigger().title).toBe(`คลิกเพื่อเปลี่ยนการจัดสรร (ปัจจุบัน: ${label} - ${thai})`);
  });

  it('is tinted with the colour of the current allocation', () => {
    for (const [value, color] of [['need', ALLOCATION_COLORS.need], ['want', ALLOCATION_COLORS.want], ['savings', ALLOCATION_COLORS.savings]] as const) {
      render({ value });
      const rgb = hexToRgb(color);
      expect(trigger().style.backgroundColor).toBe(css('backgroundColor', `rgba(${rgb}, 0.12)`));
      expect(trigger().style.borderColor).toBe(css('borderColor', `rgba(${rgb}, 0.40)`));
      expect(trigger().style.color).toBe(css('color', readable(color)));
    }
  });

  it('is described as a listbox button, closed at first', () => {
    render();
    expect(trigger().getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().type).toBe('button');
    expect(list()).toBeNull();
  });

  it.each([['xs', 'h-[22px]'], ['sm', 'h-[25px]'], ['md', 'h-8'], [undefined, 'h-[25px]']])('size %s → %s', (size, cls) => {
    render({ size: size as AllocationSelectProps['size'] });
    expect(trigger().classList.contains(cls)).toBe(true);
    for (const other of ['h-[22px]', 'h-[25px]', 'h-8'].filter(c => c !== cls)) expect(trigger().classList.contains(other)).toBe(false);
  });

  it('takes an extra class', () => {
    render({ className: 'my-extra' });
    expect(trigger().classList.contains('my-extra')).toBe(true);
  });
});

describe('AllocationSelect — opening and choosing', () => {
  it('a click opens a listbox of three options in the page body, the current one marked', () => {
    render({ value: 'need' });
    open();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(list()!.parentElement).toBe(document.body);
    expect(list()!.getAttribute('aria-label')).toBe('เลือกประเภทการจัดสรรเงิน');
    expect(options().map(o => o.textContent)).toEqual(['NEEDจำเป็น50%', 'WANTทั่วไป30%', 'SAVEเงินออม20%']);
    expect(options().map(o => o.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(options().map(o => o.querySelectorAll('svg.lucide-check').length)).toEqual([1, 0, 0]);
    expect(options().map(o => o.title)).toEqual([
      'รายจ่ายจำเป็น · ปัจจัย 4 ดำรงชีพ', 'รายจ่ายตามใจ · ไลฟ์สไตล์ ความสุข', 'เงินออม · เงินสำรองฉุกเฉิน · ลงทุน',
    ]);
  });

  it('the selected option is outlined and tinted in its own colour', () => {
    render({ value: 'savings' });
    open();
    const rgb = hexToRgb(ALLOCATION_COLORS.savings);
    const [need, , save] = options();
    expect(save.style.borderColor).toBe(css('borderColor', `rgba(${rgb}, 0.55)`));
    expect(save.style.backgroundColor).toBe(css('backgroundColor', `rgba(${rgb}, 0.14)`));
    expect(need.style.backgroundColor).toBe('');
  });

  it('a click on the trigger again closes it', () => {
    render();
    open();
    open();
    expect(list()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('choosing an option reports it, closes the list and returns focus to the trigger', () => {
    render({ value: 'want' });
    open();
    click(options()[0]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('need');
    expect(list()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('each option reports its own key', () => {
    render();
    for (const [i, k] of ['need', 'want', 'savings'].entries()) { open(); click(options()[i]); expect(onChange).toHaveBeenLastCalledWith(k); }
  });

  it('choosing the current value still reports it', () => {
    render({ value: 'want' });
    open();
    click(options()[1]);
    expect(onChange).toHaveBeenCalledWith('want');
  });

  it('clicks never reach a clickable parent (a table row, a card)', () => {
    render();
    open();
    click(options()[2]);
    open();
    open();
    expect(parentClick).not.toHaveBeenCalled();
    // and a click inside the open list is swallowed too
    open();
    act(() => { list()!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('a mousedown inside the open list never reaches a parent that handles it (a row drag, a card)', () => {
    const parentDown = vi.fn();
    act(() => root.render(<div onMouseDown={parentDown}><AllocationSelect onChange={onChange} /></div>));
    open();
    act(() => { list()!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    act(() => { options()[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(parentDown).not.toHaveBeenCalled();
  });

  it('disabled: cannot be opened by a click or a key', () => {
    render({ disabled: true });
    expect(trigger().disabled).toBe(true);
    open();
    press(trigger(), 'Enter');
    press(trigger(), 'ArrowDown');
    expect(list()).toBeNull();
  });
});

describe('AllocationSelect — look while open, icons', () => {
  const iconOf = (el: Element) => [...el.querySelectorAll('svg')].map(s => s.getAttribute('class')!.split(' ').find(c => c.startsWith('lucide-') && c !== 'lucide'))[0];

  it('each allocation has its own icon on the trigger and in the list', () => {
    const seen = new Set<string | undefined>();
    for (const value of ['need', 'want', 'savings']) { render({ value }); seen.add(iconOf(trigger())); }
    expect(seen.size).toBe(3);
    open();
    expect(new Set(options().map(iconOf)).size).toBe(3);
  });

  it('an unknown value marks WANT as the selected option', () => {
    render({ value: 'bogus' });
    open();
    expect(options().map(o => o.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
  });

  it('while open the trigger drops its tinted border (the ring takes over), turns the chevron, and gets the ring class', () => {
    render({ value: 'need' });
    expect(trigger().style.borderColor).not.toBe('');
    expect(trigger().classList.contains('ring-1')).toBe(false);
    open();
    expect(trigger().style.borderColor).toBe('');
    expect(trigger().classList.contains('ring-1')).toBe(true);
    expect(trigger().querySelector('svg.lucide-chevron-down')!.classList.contains('rotate-180')).toBe(true);
    open();
    expect(trigger().querySelector('svg.lucide-chevron-down')!.classList.contains('rotate-180')).toBe(false);
  });

  it('hovering the last option and pressing Enter picks it (the highlight follows the pointer, not a fixed row)', () => {
    render({ value: 'need' });
    press(trigger(), 'Enter');
    hover(options()[2]);
    press(trigger(), 'Enter');
    expect(onChange).toHaveBeenCalledWith('savings');
  });
});

describe('AllocationSelect — where the list appears', () => {
  const style = () => (list() as HTMLElement).style;

  it('needs room for about 120px: 118px below is not enough, 100px is not enough either', () => {
    rect = { left: 500, top: 600, width: 80, height: 40 }; // below 768 - 640 - 10 = 118 < 120, above 590
    render();
    open();
    expect(style().bottom).toBe(`${768 - 600 + 4}px`);
    open();
    rect = { left: 500, top: 600, width: 80, height: 58 }; // below 100
    open();
    expect(style().bottom).toBe(`${768 - 600 + 4}px`);
  });

  it('130px below is enough', () => {
    rect = { left: 500, top: 600, width: 80, height: 28 }; // below 768 - 628 - 10 = 130
    render();
    open();
    expect(style().top).toBe('632px');
  });

  it('the 10px margins count on both sides when comparing room above and below', () => {
    rect = { left: 500, top: 105, width: 80, height: 553 }; // below 100 (< 120), above 95: not more than below → stays down
    render();
    open();
    expect(style().top).toBe('662px');
    expect(style().bottom).toBe('');
  });

  it('keeps 10px from the right edge', () => {
    rect = { left: 874, top: 100, width: 80, height: 25 }; // would sit at 809: 809 + 210 = 1019 > 1014
    render();
    open();
    expect(style().left).toBe(`${1024 - 210 - 10}px`);
  });

  it('under the trigger, centred on it, 210px wide', () => {
    rect = { left: 500, top: 100, width: 80, height: 25 };
    render();
    open();
    expect(style().top).toBe('129px'); // bottom 125 + 4
    expect(style().bottom).toBe('');
    expect(style().left).toBe('435px'); // 500 + 40 - 105
    expect(style().width).toBe('210px');
  });

  it('stays inside the viewport on the left', () => {
    rect = { left: 0, top: 100, width: 40, height: 25 };
    render();
    open();
    expect(style().left).toBe('10px');
  });

  it('stays inside the viewport on the right', () => {
    rect = { left: 1000, top: 100, width: 80, height: 25 };
    render();
    open();
    expect(style().left).toBe(`${1024 - 210 - 10}px`);
  });

  it('opens upwards when there is no room below but more above', () => {
    rect = { left: 500, top: 735, width: 80, height: 25 }; // bottom 760: 768 - 760 - 10 = -2 below, 725 above
    render();
    open();
    expect(style().bottom).toBe(`${768 - 735 + 4}px`);
    expect(style().top).toBe('');
  });

  it('opens downwards when it is tight both ways but there is more room below', () => {
    rect = { left: 500, top: 20, width: 80, height: 700 }; // below 768 - 720 - 10 = 38, above 10
    render();
    open();
    expect(style().top).toBe('724px');
    expect(style().bottom).toBe('');
  });

  it('opens downwards when there is room below even if there is more above', () => {
    rect = { left: 500, top: 500, width: 80, height: 25 }; // below 768 - 525 - 10 = 233 ≥ 120
    render();
    open();
    expect(style().top).toBe('529px');
  });

  it('follows the trigger when the window is resized, but only while open', () => {
    render();
    open();
    expect(style().left).toBe('435px');
    rect = { ...rect, left: 300 };
    act(() => { window.dispatchEvent(new Event('resize')); });
    expect(style().left).toBe('235px');
  });
});

describe('AllocationSelect — closing', () => {
  it('a mousedown outside closes it; inside the trigger or the list does not', () => {
    render();
    open();
    act(() => { trigger().dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    act(() => { options()[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(list()).not.toBeNull();
    act(() => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(list()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('scrolling the page closes it, scrolling inside the list does not', () => {
    render();
    open();
    act(() => { list()!.dispatchEvent(new Event('scroll')); });
    expect(list()).not.toBeNull();
    act(() => { document.body.dispatchEvent(new Event('scroll')); });
    expect(list()).toBeNull();
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

describe('AllocationSelect — keyboard', () => {
  it.each(['Enter', ' ', 'ArrowDown'])('"%s" on the closed trigger opens it, and the key goes no further', (k) => {
    render();
    const e = press(trigger(), k);
    expect(list()).not.toBeNull();
    expect(e.defaultPrevented).toBe(true);
    expect(windowKey).not.toHaveBeenCalled();
  });

  it('other keys on the closed trigger are left alone — Esc still reaches a surrounding modal', () => {
    render();
    for (const k of ['a', 'Escape', 'Tab', 'ArrowUp']) {
      const e = press(trigger(), k);
      expect(e.defaultPrevented).toBe(false);
    }
    expect(list()).toBeNull();
    expect(windowKey).toHaveBeenCalledTimes(4);
  });

  it.each(['Escape', 'Tab'])('"%s" closes the open list, keeps focus on the trigger and goes no further', (k) => {
    render();
    open();
    windowKey.mockClear();
    const e = press(trigger(), k);
    expect(list()).toBeNull();
    expect(e.defaultPrevented).toBe(true);
    expect(windowKey).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger());
  });

  it('opening by key highlights the current option first; the arrows then move and wrap', () => {
    render({ value: 'savings' });
    press(trigger(), 'Enter');
    const bg = () => options().map(o => o.style.backgroundColor);
    const rgbOf = (c: string) => hexToRgb(c);
    // savings is selected (0.14); nothing else is focused
    expect(bg()[2]).toBe(css('backgroundColor', `rgba(${rgbOf(ALLOCATION_COLORS.savings)}, 0.14)`));
    expect(bg()[0]).toBe('');

    press(trigger(), 'ArrowDown'); // wraps to NEED
    expect(bg()[0]).toBe(css('backgroundColor', `rgba(${rgbOf(ALLOCATION_COLORS.need)}, 0.08)`));
    press(trigger(), 'ArrowUp'); // back to SAVE
    press(trigger(), 'ArrowUp'); // WANT
    expect(bg()[1]).toBe(css('backgroundColor', `rgba(${rgbOf(ALLOCATION_COLORS.want)}, 0.08)`));
    expect(bg()[0]).toBe('');
  });

  it('arrow keys are swallowed and scroll the highlighted option into view', () => {
    render({ value: 'need' });
    press(trigger(), 'Enter');
    scrollIntoView.mockClear();
    windowKey.mockClear();
    const down = press(trigger(), 'ArrowDown');
    const up = press(trigger(), 'ArrowUp');
    expect(down.defaultPrevented && up.defaultPrevented).toBe(true);
    expect(windowKey).not.toHaveBeenCalled();
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
  });

  it('ArrowUp from the first option wraps to the last', () => {
    render({ value: 'need' });
    press(trigger(), 'Enter');
    press(trigger(), 'ArrowUp');
    press(trigger(), 'Enter');
    expect(onChange).toHaveBeenCalledWith('savings');
  });

  it.each(['Enter', ' '])('"%s" picks the highlighted option, closes and refocuses', (k) => {
    render({ value: 'want' });
    press(trigger(), 'Enter'); // highlight = WANT
    press(trigger(), 'ArrowDown'); // SAVE
    windowKey.mockClear();
    const e = press(trigger(), k);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('savings');
    expect(list()).toBeNull();
    expect(e.defaultPrevented).toBe(true);
    expect(windowKey).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger());
  });

  it('other keys inside the open list do nothing', () => {
    render();
    press(trigger(), 'Enter');
    for (const k of ['a', 'Home', 'ArrowLeft']) expect(press(trigger(), k).defaultPrevented).toBe(false);
    expect(list()).not.toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('hovering an option highlights it, and Enter then picks that one', () => {
    render({ value: 'want' });
    press(trigger(), 'Enter');
    hover(options()[0]);
    expect(options()[0].style.backgroundColor).toBe(css('backgroundColor', `rgba(${hexToRgb(ALLOCATION_COLORS.need)}, 0.08)`));
    press(trigger(), 'Enter');
    expect(onChange).toHaveBeenCalledWith('need');
  });

  it('closing resets the highlight: reopening starts on the current value again', () => {
    render({ value: 'want' });
    press(trigger(), 'Enter');
    press(trigger(), 'ArrowDown');
    press(trigger(), 'Escape');
    press(trigger(), 'Enter');
    press(trigger(), 'Enter');
    expect(onChange).toHaveBeenCalledWith('want');
  });
});

describe('AllocationSelect — as a memoised component', () => {
  it('does not need re-rendering to follow a new value', () => {
    render({ value: 'need' });
    expect(trigger().textContent).toBe('NEED');
    render({ value: 'savings' });
    expect(trigger().textContent).toBe('SAVE');
  });
});
