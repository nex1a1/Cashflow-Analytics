// @vitest-environment jsdom
import type { Mock } from 'vitest';
type AnyMock = Mock<(...args: any[]) => any>;
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { click, key } from '@/test-utils/dom';
import Dropdown, { DropdownProps } from '../Dropdown';

const OPTS = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B', color: '#ff0000' }, { value: 'c', label: 'C' }];
let root: Root;
let host: HTMLDivElement;
let onChange: AnyMock;
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

describe('Dropdown — keyboard', () => {

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

});

describe('Dropdown — closing from outside', () => {
  const fire = (target: EventTarget, type: string) => act(() => { target.dispatchEvent(new Event(type, { bubbles: true })); });

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
