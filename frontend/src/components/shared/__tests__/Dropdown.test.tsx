// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { click, key } from '@/test-utils/dom';
import Dropdown, { DropdownProps } from '../Dropdown';

const OPTS = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B', color: '#ff0000' }, { value: 'c', label: 'C' }];
let root: Root;
let host: HTMLDivElement;
let onChange: ReturnType<typeof vi.fn>;
let rect: Partial<DOMRect>;

const render = (p: Partial<DropdownProps> = {}) =>
  act(() => root.render(<Dropdown value="a" options={OPTS} onChange={onChange} aria-label="สินทรัพย์" {...p} />));
const trigger = () => host.querySelector('button')!;
const list = () => document.querySelector<HTMLElement>('[role="listbox"]');
const options = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')];
const activeIdx = () => options().findIndex(o => o.classList.contains('bg-surface-hover'));
const open = () => click(trigger());

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn(); // not implemented by jsdom
  rect = { left: 40, top: 100, bottom: 124, width: 90 };
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ right: 0, height: 24, x: 0, y: 0, toJSON: () => ({}), ...rect }) as DOMRect);
  onChange = vi.fn();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); document.body.innerHTML = ''; vi.restoreAllMocks(); });

describe('Dropdown — trigger', () => {
  it('shows the selected label and its colour dot; nothing selected shows the placeholder', () => {
    render({ value: 'b' });
    expect(trigger().textContent).toBe('B');
    expect(trigger().querySelector<HTMLElement>('span.rounded-full')!.style.backgroundColor).toBe('rgb(255, 0, 0)');
    render({ value: 'zzz', placeholder: 'เลือก' });
    expect(trigger().textContent).toBe('เลือก');
    expect(trigger().querySelector('span.text-ink-muted')).not.toBeNull();
    render({ value: 'zzz' });
    expect(trigger().textContent).toBe('—');
  });

  it('click opens (aria-expanded) and click again closes', () => {
    render();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    open();
    expect(list()).not.toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(list()!.getAttribute('aria-label')).toBe('สินทรัพย์');
    open();
    expect(list()).toBeNull();
  });

  it('disabled never opens', () => {
    render({ disabled: true });
    act(() => { trigger().disabled = false; trigger().click(); }); // even if the click got through
    expect(list()).toBeNull();
    render({ disabled: true });
    key(trigger(), 'ArrowDown');
    expect(list()).toBeNull();
  });
});

describe('Dropdown — list', () => {
  it('marks the selected option and starts on it; with no selection starts on the first', () => {
    render({ value: 'b' });
    open();
    expect(options().map(o => o.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(options()[1].querySelector('svg')).not.toBeNull(); // check mark
    expect(activeIdx()).toBe(1);
    open();
    render({ value: 'zzz' });
    open();
    expect(activeIdx()).toBe(0);
  });

  it('clicking an option picks it, closes and gives focus back to the trigger', () => {
    render();
    open();
    click(options()[2]);
    expect(onChange).toHaveBeenCalledWith('c');
    expect(list()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('hovering moves the highlight', () => {
    render();
    open();
    act(() => { options()[2].dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
    expect(activeIdx()).toBe(2);
  });

  it('opens below with the trigger width (at least 120px), or above when there is no room below', () => {
    render();
    open();
    expect(list()!.style.top).toBe('126px');
    expect(list()!.style.left).toBe('40px');
    expect(list()!.style.width).toBe('120px');
    open();
    rect = { left: 40, top: 700, bottom: 724, width: 200 };
    open();
    expect(list()!.style.bottom).toBe(`${768 - 700 + 2}px`);
    expect(list()!.style.top).toBe('');
    expect(list()!.style.width).toBe('200px');
  });

  it('little room below but even less above: still below', () => {
    rect = { left: 0, top: 30, bottom: 54, width: 100 };
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(100);
    render();
    open();
    expect(list()!.style.top).toBe('56px');
  });
});

describe('Dropdown — keyboard', () => {
  it('ArrowDown / ArrowUp on the closed trigger open it', () => {
    render();
    key(trigger(), 'ArrowDown');
    expect(list()).not.toBeNull();
    key(trigger(), 'Tab');
    key(trigger(), 'ArrowUp');
    expect(list()).not.toBeNull();
    key(trigger(), 'Enter'); // Enter on the closed trigger is the button's own click
  });

  it('other keys on the closed trigger do nothing', () => {
    render();
    key(trigger(), 'x');
    expect(list()).toBeNull();
  });

  it('arrows move and wrap around; Enter or Space picks', () => {
    render();
    open();
    key(trigger(), 'ArrowDown');
    expect(activeIdx()).toBe(1);
    key(trigger(), 'ArrowDown');
    key(trigger(), 'ArrowDown');
    expect(activeIdx()).toBe(0); // wrapped
    key(trigger(), 'ArrowUp');
    expect(activeIdx()).toBe(2); // wrapped back
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    key(trigger(), 'Enter');
    expect(onChange).toHaveBeenLastCalledWith('c');
    open();
    key(trigger(), ' ');
    expect(onChange).toHaveBeenLastCalledWith('a');
    expect(list()).toBeNull();
  });

  it('other keys while open are ignored', () => {
    render();
    open();
    key(trigger(), 'x');
    expect(list()).not.toBeNull();
    expect(activeIdx()).toBe(0);
  });

  it('Esc closes the open list without letting the key reach window (so a surrounding modal stays open)', () => {
    const windowKey = vi.fn();
    window.addEventListener('keydown', windowKey);
    render();
    open();
    key(trigger(), 'Escape');
    expect(list()).toBeNull();
    expect(windowKey).not.toHaveBeenCalled();
    key(trigger(), 'Escape'); // closed: the modal gets it
    expect(windowKey).toHaveBeenCalledTimes(1);
    window.removeEventListener('keydown', windowKey);
  });

  it('Tab closes and lets the key through (focus moves on)', () => {
    const windowKey = vi.fn();
    window.addEventListener('keydown', windowKey);
    render();
    open();
    key(trigger(), 'Tab');
    expect(list()).toBeNull();
    expect(windowKey).toHaveBeenCalledTimes(1);
    window.removeEventListener('keydown', windowKey);
  });
});

describe('Dropdown — closing from outside', () => {
  const fire = (target: EventTarget, type: string) => act(() => { target.dispatchEvent(new Event(type, { bubbles: true })); });

  it('a press outside closes; a press on the list or the trigger does not', () => {
    render();
    open();
    fire(list()!, 'mousedown');
    expect(list()).not.toBeNull();
    fire(trigger(), 'mousedown');
    expect(list()).not.toBeNull();
    fire(document.body, 'mousedown');
    expect(list()).toBeNull();
  });

  it('scrolling the page closes; scrolling inside the list does not', () => {
    render();
    open();
    fire(list()!, 'scroll');
    expect(list()).not.toBeNull();
    fire(document.body, 'scroll');
    expect(list()).toBeNull();
  });

  it('resizing the window closes', () => {
    render();
    open();
    act(() => { window.dispatchEvent(new Event('resize')); });
    expect(list()).toBeNull();
  });

  it('listeners are removed once closed', () => {
    render();
    open();
    const rmDoc = vi.spyOn(document, 'removeEventListener');
    const rmWin = vi.spyOn(window, 'removeEventListener');
    open();
    expect(rmDoc.mock.calls.map(c => c[0])).toContain('mousedown');
    expect(rmWin.mock.calls.map(c => c[0])).toEqual(expect.arrayContaining(['scroll', 'resize']));
  });
});
