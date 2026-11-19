// @vitest-environment jsdom
import React, { useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { click, byText } from '@/test-utils/dom';
import DatePicker, { DatePickerProps } from '../DatePicker';

let root: Root | null = null;
let host: HTMLDivElement | null = null;
let onChange = vi.fn();

function Harness({ initial, ...rest }: Omit<DatePickerProps, 'value' | 'onChange'> & { initial: string }) {
  const [v, setV] = useState(initial);
  return <DatePicker {...rest} value={v} onChange={x => { onChange(x); setV(x); }} />;
}
const render = (props: Omit<DatePickerProps, 'value' | 'onChange'> & { initial: string }, wrap?: (el: React.ReactElement) => React.ReactElement) => {
  onChange = vi.fn();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  const el = <Harness {...props} />;
  act(() => root!.render(wrap ? wrap(el) : el));
};

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null; host = null;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const trigger = () => host!.querySelector<HTMLButtonElement>('button')!;
const popover = () => host!.querySelector<HTMLElement>('div.w-80');
const open = () => click(trigger());
const title = () => popover()!.querySelector('span.tracking-wider')!.textContent;
const cells = () => [...popover()!.querySelectorAll<HTMLButtonElement>('div.gap-y-0\\.5 > button')];
const gridKids = () => popover()!.querySelector('div.gap-y-0\\.5')!.children.length;
const day = (d: number) => cells().find(b => b.querySelector('span:not([class])')?.textContent === String(d))!;
const btn = (text: string) => byText('div.w-80 button', text) as HTMLButtonElement;
const byTitle = (t: string) => popover()!.querySelector<HTMLButtonElement>(`button[title="${t}"]`)!;
const summary = () => popover()!.querySelector('span.uppercase.text-slate-400')?.textContent;
const chips = () => [...popover()!.querySelectorAll('span.rounded-pill.bg-accent\\/15')].map(c => c.textContent);

const mouse = (el: Element, type: string, init: MouseEventInit = {}) =>
  act(() => { el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...init })); });
const press = (el: Element) => mouse(el, 'mousedown');
const enter = (el: Element) => mouse(el, 'mouseover');
const release = () => act(() => { window.dispatchEvent(new MouseEvent('mouseup')); });
/** A keyboard Enter/Space on a button is a click with detail 0; a real mouse click has detail >= 1. */
const keyClick = (el: Element) => mouse(el, 'click', { detail: 0 });
const pin = (iso: string) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(iso)); };

describe('opening and closing', () => {

  it('listeners are gone once it closes', () => {
    render({ initial: '2026-10-09' });
    open();
    const remove = vi.spyOn(document, 'removeEventListener');
    const removeW = vi.spyOn(window, 'removeEventListener');
    open();
    expect(remove.mock.calls.map(c => c[0])).toContain('mousedown');
    expect(removeW.mock.calls.some(c => c[0] === 'keydown' && c[2] === true)).toBe(true);
  });
});

describe('several dates (allowAll)', () => {
  // 'ALL' opens on today's month: pin it to October, where these days are
  beforeEach(() => pin('2026-10-09T10:00:00'));
  const props = { allowAll: true, placeholder: 'วันที่' };

  it('press + release on a day toggles it, and nothing is sent until confirm', () => {
    render({ initial: 'ALL', ...props });
    open();
    press(day(15)); release(); mouse(day(15), 'click', { detail: 1 });
    expect(chips()).toEqual(['15 ต.ค.']);
    expect(onChange).not.toHaveBeenCalled();
    press(day(15)); release(); mouse(day(15), 'click', { detail: 1 });
    expect(chips()).toEqual([]);
  });

});

