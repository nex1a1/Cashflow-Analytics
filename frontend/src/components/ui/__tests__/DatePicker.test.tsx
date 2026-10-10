// @vitest-environment jsdom
import React, { useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
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

describe('trigger', () => {
  it('shows the date as text, or the placeholder', () => {
    render({ initial: '2026-10-09' });
    expect(trigger().textContent).toBe('ศ. 9 ต.ค. 2026');
    act(() => root!.unmount()); host!.remove();
    render({ initial: '', placeholder: 'วันที่' });
    expect(trigger().textContent).toBe('วันที่');
    expect(trigger().querySelector('span')!.classList.contains('text-ink-body')).toBe(true);
    act(() => root!.unmount()); host!.remove();
    render({ initial: 'ALL', allowAll: true, placeholder: 'วันที่' });
    expect(trigger().querySelector('span')!.classList.contains('text-ink-body')).toBe(true); // every day = nothing chosen
  });

  it('uses the given class, else its own', () => {
    render({ initial: '2026-10-09', className: 'mine' });
    expect(trigger().className).toBe('mine');
    act(() => root!.unmount()); host!.remove();
    render({ initial: '2026-10-09' });
    expect(trigger().className).toContain('h-9');
    expect(trigger().querySelector('span')!.classList.contains('text-ink-display')).toBe(true);
  });

  it('hud variant: an active value lights the border and the corner dot; "ALL" does not', () => {
    render({ initial: '2026-10-09', variant: 'hud', allowAll: true });
    expect(trigger().classList.contains('border-accent-ink')).toBe(true);
    expect(trigger().querySelector('span.bg-accent')).not.toBeNull();
    expect(trigger().textContent).toBe('ศ. 9 ต.ค. 2026');
    act(() => root!.unmount()); host!.remove();
    render({ initial: 'ALL', variant: 'hud', allowAll: true, placeholder: 'วันที่' });
    expect(trigger().classList.contains('border-accent-ink')).toBe(false);
    expect(trigger().querySelector('span.bg-accent')).toBeNull();
    expect(trigger().textContent).toBe('วันที่');
  });

  it('hud variant: the trigger opens and closes', () => {
    render({ initial: '2026-10-09', variant: 'hud', allowAll: true });
    open();
    expect(popover()).not.toBeNull();
    open();
    expect(popover()).toBeNull();
  });

  it('a custom trigger gets the display text and opens / closes the popover', () => {
    const seen: string[] = [];
    render({
      initial: '2026-10-09',
      customTrigger: ({ open: o, setOpen, display, value }) => {
        seen.push(`${display}|${value}|${o}`);
        return <button type="button" className="custom" onClick={() => setOpen(!o)}>{display}</button>;
      },
    });
    expect(host!.querySelector('.custom')!.textContent).toBe('ศ. 9 ต.ค. 2026');
    click(host!.querySelector('.custom'));
    expect(popover()).not.toBeNull();
    expect(seen.at(-1)).toBe('ศ. 9 ต.ค. 2026|2026-10-09|true');
    click(host!.querySelector('.custom'));
    expect(popover()).toBeNull();
  });
});

describe('opening and closing', () => {
  it('the trigger toggles it; the open picker sits above its neighbours', () => {
    render({ initial: '2026-10-09' });
    expect(host!.firstElementChild!.classList.contains('z-20')).toBe(true);
    open();
    expect(popover()).not.toBeNull();
    expect(host!.firstElementChild!.classList.contains('z-[60]')).toBe(true);
    open();
    expect(popover()).toBeNull();
  });

  it('a press outside closes it, a press inside does not', () => {
    render({ initial: '2026-10-09' });
    open();
    press(popover()!);
    expect(popover()).not.toBeNull();
    press(document.body);
    expect(popover()).toBeNull();
  });

  it('Esc closes it and never reaches a modal behind it', () => {
    const modalEsc = vi.fn();
    window.addEventListener('keydown', modalEsc);
    render({ initial: '2026-10-09' });
    open();
    act(() => { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true })); });
    expect(popover()).not.toBeNull();
    expect(modalEsc).toHaveBeenCalledTimes(1);
    act(() => { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(popover()).toBeNull();
    expect(modalEsc).toHaveBeenCalledTimes(1);
    act(() => { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(modalEsc).toHaveBeenCalledTimes(2); // closed: Esc is the modal's again
    window.removeEventListener('keydown', modalEsc);
  });

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

describe('month grid', () => {
  it('opens on the month of the value with the weekday offset (Oct 2026 starts on Thursday)', () => {
    render({ initial: '2026-10-09' });
    open();
    expect(title()).toBe('ตุลาคม 2026');
    expect(cells()).toHaveLength(31);
    expect(gridKids()).toBe(4 + 31);
    const labels = [...popover()!.querySelectorAll('div.grid-cols-7.mb-1 > div')];
    expect(labels.map(d => d.textContent)).toEqual(['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']);
    expect(labels.map(d => d.classList.contains('text-weekend'))).toEqual([true, false, false, false, false, false, true]);
  });

  it('a month that starts on Sunday has no blanks; Saturday has six (May 2027)', () => {
    render({ initial: '2026-11-03' });
    open();
    expect(gridKids()).toBe(30);
    act(() => root!.unmount()); host!.remove();
    render({ initial: '2027-05-03' });
    open();
    expect(gridKids()).toBe(6 + 31);
  });

  it('with no date it opens on the period (a pay cycle opens on its 25th month)', () => {
    render({ initial: 'ALL', allowAll: true, filterPeriod: '2026-03' });
    open();
    expect(title()).toBe('มีนาคม 2026');
    act(() => root!.unmount()); host!.remove();
    render({ initial: 'ALL', allowAll: true, filterPeriod: 'cycle:2026-07' });
    open();
    expect(title()).toBe('กรกฎาคม 2026');
  });

  it('month and year arrows move the view; reopening goes back to the value', () => {
    render({ initial: '2026-10-09' });
    open();
    click(byTitle('เดือนถัดไป (+1 เดือน)'));
    expect(title()).toBe('พฤศจิกายน 2026');
    click(byTitle('เดือนก่อนหน้า (-1 เดือน)'));
    click(byTitle('เดือนก่อนหน้า (-1 เดือน)'));
    expect(title()).toBe('กันยายน 2026');
    click(byTitle('ปีถัดไป (+1 ปี)'));
    expect(title()).toBe('กันยายน 2027');
    click(byTitle('ปีก่อนหน้า (-1 ปี)'));
    click(byTitle('ปีก่อนหน้า (-1 ปี)'));
    expect(title()).toBe('กันยายน 2025');
    open(); open();
    expect(title()).toBe('ตุลาคม 2026');
  });

  it('the year arrows stop at 2000 and 2050', () => {
    render({ initial: '2000-03-01' });
    open();
    const prev = byTitle('จำกัดปีขั้นต่ำ 2000');
    expect(prev.disabled).toBe(true);
    expect(byTitle('ปีถัดไป (+1 ปี)').disabled).toBe(false);
    act(() => root!.unmount()); host!.remove();
    render({ initial: '2050-03-01' });
    open();
    expect(byTitle('จำกัดปีสูงสุด 2050').disabled).toBe(true);
    expect(byTitle('ปีก่อนหน้า (-1 ปี)').disabled).toBe(false);
  });

  it('today has a ring, weekends are bold, days with data get a dot', () => {
    pin('2026-10-09T10:00:00');
    render({ initial: '2026-10-01', availableDates: ['2026-10-05'] });
    open();
    expect(day(9).classList.contains('ring-1')).toBe(true);
    expect(day(8).classList.contains('ring-1')).toBe(false);
    expect(day(10).classList.contains('text-weekend')).toBe(true);
    expect(day(11).classList.contains('text-weekend')).toBe(true);
    expect(day(12).classList.contains('text-weekend')).toBe(false);
    expect(day(5).querySelector('span.bg-accent.rounded-full')).not.toBeNull();
    expect(day(6).querySelector('span.rounded-full')).toBeNull();
  });

  it('the selected day hides its data dot (the fill already marks it)', () => {
    render({ initial: '2026-10-05', availableDates: ['2026-10-05'] });
    open();
    expect(day(5).querySelector('span.rounded-full')).toBeNull();
  });

  it('a picked day leaves no drag behind', () => {
    render({ initial: '2026-10-09' });
    open();
    press(day(15)); // no release yet
    open();
    expect(day(15).classList.contains('bg-accent')).toBe(true);
    expect(day(9).classList.contains('bg-accent')).toBe(false);
  });

  it('today only rings in its own month and year', () => {
    pin('2026-10-09T10:00:00');
    render({ initial: '2026-09-01' });
    open();
    expect(day(9).classList.contains('ring-1')).toBe(false);
    act(() => root!.unmount()); host!.remove();
    render({ initial: '2025-10-01' });
    open();
    expect(day(9).classList.contains('ring-1')).toBe(false);
  });

  it('the current value is filled in', () => {
    render({ initial: '2026-10-14' });
    open();
    expect(day(14).classList.contains('bg-accent')).toBe(true);
    expect(day(13).classList.contains('bg-accent')).toBe(false);
  });
});

describe('day-type strip', () => {
  const CONFIG = [
    { id: 'w', name: 'workday', label: 'ทำงาน', color: '#00ff00' },
    { id: 'p', name: 'public', label: 'วันหยุดนักขัตฤกษ์', color: '#0000ff' },
    { id: 'h', name: 'holiday', label: 'วันหยุด', color: '#ff0000' },
  ];
  const strip = (d: number) => day(d).querySelector<HTMLElement>('span.absolute.top-0');

  it('a marked day shows its own type', () => {
    render({ initial: '2026-10-09', dayTypeConfig: CONFIG, dayTypes: { '2026-10-09': 'p' } });
    open();
    expect(day(9).title).toBe('ประเภทวัน: วันหยุดนักขัตฤกษ์');
    expect(strip(9)!.style.backgroundColor).toBe('rgb(0, 0, 255)');
  });

  it('an unmarked day uses the same default as the calendar (resolveDefaultDayTypeId)', () => {
    render({ initial: '2026-10-09', dayTypeConfig: CONFIG });
    open();
    expect(day(10).title).toBe('ประเภทวัน: วันหยุด'); // Saturday → the "holiday" type, not the first label containing หยุด
    expect(day(9).title).toBe('ประเภทวัน: ทำงาน');
  });

  it('without names it falls back by position like the calendar does', () => {
    const legacy = [
      { id: 'a', name: 'ลาป่วย', label: 'ลาป่วย', color: '#111111' },
      { id: 'b', name: 'ทำงาน', label: 'ทำงาน', color: '#222222' },
    ];
    render({ initial: '2026-10-09', dayTypeConfig: legacy, dayTypes: { '2026-10-08': 'gone' } });
    open();
    expect(day(9).title).toBe('ประเภทวัน: ลาป่วย');
    expect(day(8).title).toBe('ประเภทวัน: ลาป่วย'); // an id that no longer exists falls back too
    expect(day(10).title).toBe('ประเภทวัน: ทำงาน');
  });

  it('no day types: no strip and no title', () => {
    render({ initial: '2026-10-09' });
    open();
    expect(strip(9)).toBeNull();
    expect(day(9).hasAttribute('title')).toBe(false);
  });
});

describe('single date', () => {
  it('pressing a day picks it and closes', () => {
    render({ initial: '2026-10-09' });
    open();
    press(day(15));
    expect(onChange).toHaveBeenCalledWith('2026-10-15');
    expect(popover()).toBeNull();
    expect(trigger().textContent).toBe('พฤ. 15 ต.ค. 2026');
  });

  it('the keyboard (Enter on a day) picks it too', () => {
    render({ initial: '2026-10-09' });
    open();
    keyClick(day(3));
    expect(onChange).toHaveBeenCalledWith('2026-10-03');
    expect(popover()).toBeNull();
  });

  it('a day in another month is written with that month', () => {
    render({ initial: '2026-10-09' });
    open();
    click(byTitle('เดือนก่อนหน้า (-1 เดือน)'));
    press(day(1));
    expect(onChange).toHaveBeenCalledWith('2026-09-01');
  });

  it('presets pick and close', () => {
    pin('2026-10-09T10:00:00');
    render({ initial: '2026-02-14' });
    open(); click(btn('เมื่อวาน')); // the day before today, not before the shown date
    expect(onChange).toHaveBeenLastCalledWith('2026-10-08');
    expect(popover()).toBeNull();
    open(); click(byTitle('เดือนก่อนหน้า (-1 เดือน)')); click(btn('วันนี้'));
    expect(onChange).toHaveBeenLastCalledWith('2026-10-09');
    open(); click(byTitle('เดือนถัดไป (+1 เดือน)')); click(btn('ต้นเดือน'));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-01');
    open(); click(btn('สิ้นเดือน'));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-30');
  });

  it('"วันนี้" is today even when the picker was opened before midnight', () => {
    pin('2026-10-09T23:59:00');
    render({ initial: '2026-10-09' });
    open(); open();
    vi.setSystemTime(new Date('2026-10-10T00:01:00'));
    open(); click(btn('วันนี้'));
    expect(onChange).toHaveBeenLastCalledWith('2026-10-10');
    open(); click(btn('เมื่อวาน'));
    expect(onChange).toHaveBeenLastCalledWith('2026-10-09');
  });

  it('a single-date field has no clear button, no mode row, no summary and no confirm', () => {
    render({ initial: '2026-10-09' });
    open();
    expect(byText('div.w-80 button', 'ล้าง')).toBeNull();
    expect(byText('div.w-80 button', 'ทุกวัน')).toBeNull();
    expect(summary()).toBeUndefined();
    expect(popover()!.textContent).not.toContain('ยืนยัน');
  });
});

describe('several dates (allowAll)', () => {
  const props = { allowAll: true, placeholder: 'วันที่' };

  it('opens with the value already selected', () => {
    render({ initial: '2026-10-01,2026-10-02,2026-10-05', ...props });
    open();
    expect(summary()).toBe('สรุปวันที่เลือก (3 วัน):');
    expect(chips()).toEqual(['1 - 2 ต.ค. (2 วัน)', '5 ต.ค.']);
    expect(btn('ยืนยัน (3)').disabled).toBe(false);
  });

  it('a draft left unconfirmed is dropped: reopening shows the value again', () => {
    render({ initial: '2026-10-05', ...props });
    open();
    keyClick(day(20));
    press(document.body);
    open();
    expect(chips()).toEqual(['5 ต.ค.']);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('nothing selected: empty summary and the confirm is disabled with a reason', () => {
    render({ initial: 'ALL', ...props });
    open();
    expect(summary()).toBe('สรุปวันที่เลือก (0 วัน):');
    expect(popover()!.textContent).toContain('ยังไม่ได้เลือกวัน');
    const confirm = btn('ยืนยัน');
    expect(confirm.disabled).toBe(true);
    expect(confirm.title).toBe('กรุณาเลือกวันที่ก่อนยืนยัน');
  });

  it('a range that crosses a month is labelled with both months', () => {
    render({ initial: '2026-01-31,2026-02-01', ...props });
    open();
    expect(chips()).toEqual(['31 ม.ค. - 1 ก.พ. (2 วัน)']);
  });

  it('press + release on a day toggles it, and nothing is sent until confirm', () => {
    render({ initial: 'ALL', ...props });
    open();
    press(day(15)); release(); mouse(day(15), 'click', { detail: 1 });
    expect(chips()).toEqual(['15 ต.ค.']);
    expect(onChange).not.toHaveBeenCalled();
    press(day(15)); release(); mouse(day(15), 'click', { detail: 1 });
    expect(chips()).toEqual([]);
  });

  it('the keyboard can select and unselect days', () => {
    render({ initial: 'ALL', ...props });
    open();
    keyClick(day(15));
    keyClick(day(16));
    expect(chips()).toEqual(['15 - 16 ต.ค. (2 วัน)']);
    keyClick(day(15));
    expect(chips()).toEqual(['16 ต.ค.']);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('dragging adds the whole range, previewed while dragging (either direction)', () => {
    render({ initial: 'ALL', ...props });
    open();
    press(day(13)); enter(day(11));
    expect(day(12).classList.contains('bg-accent/35')).toBe(true); // middle of the preview
    expect(day(11).classList.contains('bg-accent')).toBe(true);
    expect(day(11).classList.contains('bg-accent/35')).toBe(false); // the ends are solid
    expect(day(13).classList.contains('bg-accent/35')).toBe(false);
    expect(day(13).classList.contains('bg-accent')).toBe(true);
    expect(chips()).toEqual([]); // the summary only changes on release
    enter(day(10));
    release();
    expect(chips()).toEqual(['10 - 13 ต.ค. (4 วัน)']);
    expect(day(14).classList.contains('bg-accent')).toBe(false);
  });

  it('dragging from a selected day removes the range instead', () => {
    render({ initial: '2026-10-10,2026-10-11,2026-10-12,2026-10-13', ...props });
    open();
    press(day(11)); enter(day(12)); release();
    expect(chips()).toEqual(['10 ต.ค.', '13 ต.ค.']);
  });

  it('after the release, hovering no longer extends the selection', () => {
    render({ initial: 'ALL', allowAll: true });
    open();
    press(day(10)); release();
    enter(day(13));
    expect(day(12).classList.contains('bg-accent/35')).toBe(false);
    expect(day(13).classList.contains('bg-accent')).toBe(false);
    release();
    expect(chips()).toEqual(['10 ต.ค.']);
  });

  it('hovering without pressing selects nothing', () => {
    render({ initial: 'ALL', ...props });
    open();
    enter(day(12));
    release();
    expect(chips()).toEqual([]);
  });

  it('confirm sends the sorted list (one day = just the date) and closes', () => {
    render({ initial: 'ALL', ...props });
    open();
    keyClick(day(20)); keyClick(day(3));
    expect(chips()).toEqual(['3 ต.ค.', '20 ต.ค.']); // in date order, not click order
    click(btn('ยืนยัน (2)'));
    expect(onChange).toHaveBeenCalledWith('2026-10-03,2026-10-20');
    expect(popover()).toBeNull();
    expect(trigger().textContent).toBe('3, 20 ต.ค.');
    open();
    keyClick(day(20));
    click(btn('ยืนยัน (1)'));
    expect(onChange).toHaveBeenLastCalledWith('2026-10-03');
  });

  it('the × on a chip removes that range only', () => {
    render({ initial: '2026-10-01,2026-10-02,2026-10-05', ...props });
    open();
    click(popover()!.querySelector('button[title="ลบช่วงนี้"]'));
    expect(chips()).toEqual(['5 ต.ค.']);
  });

  it('presets jump the view and select only that day', () => {
    pin('2026-10-09T10:00:00');
    render({ initial: '2026-03-03,2026-03-04', ...props });
    open();
    click(btn('วันนี้'));
    expect(title()).toBe('ตุลาคม 2026');
    expect(chips()).toEqual(['9 ต.ค.']);
    expect(onChange).not.toHaveBeenCalled();
    expect(popover()).not.toBeNull();
  });

  it('clear goes back to every day and closes', () => {
    render({ initial: '2026-10-01', ...props });
    open();
    click(btn('ล้าง'));
    expect(onChange).toHaveBeenCalledWith('ALL');
    expect(popover()).toBeNull();
    expect(trigger().textContent).toBe('วันที่');
  });
});

describe('weekday / weekend modes', () => {
  const props = { allowAll: true, placeholder: 'วันที่', availableDates: ['2026-10-09', '2026-10-10'] };
  const mode = (label: string) => [...popover()!.querySelectorAll<HTMLButtonElement>('div.mb-2\\.5 > button')].find(b => b.textContent === label)!;

  it('every day is the default mode, until days are picked', () => {
    render({ initial: 'ALL', ...props });
    open();
    expect(mode('ทุกวัน').classList.contains('bg-surface-elevated')).toBe(true);
    expect(mode('จ-ศ').classList.contains('bg-blue-950/60')).toBe(false);
    keyClick(day(12));
    expect(mode('ทุกวัน').classList.contains('bg-surface-elevated')).toBe(false);
  });

  it('จ-ศ highlights weekdays, dims weekends and keeps the picker open; again → every day', () => {
    render({ initial: 'ALL', ...props });
    open();
    click(mode('จ-ศ'));
    expect(onChange).toHaveBeenLastCalledWith('WEEKDAY');
    expect(popover()).not.toBeNull();
    expect(mode('จ-ศ').classList.contains('bg-blue-950/60')).toBe(true);
    expect(mode('ทุกวัน').classList.contains('bg-surface-elevated')).toBe(false);
    expect(day(9).classList.contains('bg-blue-950/50')).toBe(true);
    expect(day(9).querySelector('span.bg-blue-400')).not.toBeNull();
    expect(day(10).classList.contains('opacity-40')).toBe(true);
    expect(day(10).querySelector('span.rounded-full')).toBeNull(); // a dimmed day hides its dot
    expect(trigger().textContent).toBe('วันทำงาน (จ.-ศ.)');
    click(mode('จ-ศ'));
    expect(onChange).toHaveBeenLastCalledWith('ALL');
  });

  it('ส-อา is the mirror image', () => {
    render({ initial: 'ALL', ...props });
    open();
    click(mode('ส-อา'));
    expect(onChange).toHaveBeenLastCalledWith('WEEKEND');
    expect(mode('ส-อา').classList.contains('bg-amber-950/60')).toBe(true);
    expect(day(10).classList.contains('bg-amber-950/50')).toBe(true);
    expect(day(10).querySelector('span.bg-amber-400')).not.toBeNull();
    expect(day(9).classList.contains('opacity-40')).toBe(true);
    expect(day(9).querySelector('span.rounded-full')).toBeNull();
    click(mode('ทุกวัน'));
    expect(onChange).toHaveBeenLastCalledWith('ALL');
  });

  it('picking a day inside a mode drops the mode look for that draft', () => {
    render({ initial: 'WEEKDAY', ...props });
    open();
    keyClick(day(12));
    expect(day(13).classList.contains('bg-blue-950/50')).toBe(false);
    expect(mode('ทุกวัน').classList.contains('bg-surface-elevated')).toBe(false);
    act(() => root!.unmount()); host!.remove();
    render({ initial: 'WEEKEND', ...props });
    open();
    keyClick(day(12));
    expect(day(10).classList.contains('bg-amber-950/50')).toBe(false);
    expect(day(13).classList.contains('opacity-40')).toBe(false);
  });

  it('switching mode clears the draft', () => {
    render({ initial: 'ALL', ...props });
    open();
    keyClick(day(12));
    click(mode('ส-อา'));
    expect(chips()).toEqual([]);
  });
});

describe('placement', () => {
  const rect = (r: Partial<DOMRect>) => ({ left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}), ...r }) as DOMRect;
  const place = () => popover()!.className;

  it('room on the right and below: opens down and left-aligned', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect({ left: 100, top: 50, bottom: 80 }));
    render({ initial: '2026-10-09' });
    open();
    expect(place()).toContain('left-0');
    expect(place()).toContain('top-[calc(100%+6px)]');
  });

  it('near the right edge it right-aligns (the 16px margin counts)', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect({ left: 1024 - 330, top: 50, bottom: 80 }));
    render({ initial: '2026-10-09' });
    open();
    expect(place()).toContain('right-0');
  });

  it('exactly enough room stays left', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect({ left: 1024 - 336, top: 50, bottom: 80 }));
    render({ initial: '2026-10-09' });
    open();
    expect(place()).toContain('left-0');
  });

  it('no room below but room above: opens upward (380px is the popover height)', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect({ left: 10, top: 400, bottom: 420 })); // 348px below
    render({ initial: '2026-10-09' });
    open();
    expect(place()).toContain('bottom-[calc(100%+6px)]');
  });

  it('room below and above: stays below', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect({ left: 10, top: 382, bottom: 386 })); // 382px below
    render({ initial: '2026-10-09' });
    open();
    expect(place()).toContain('top-[calc(100%+6px)]');
  });

  it('no room either way: stays below', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect({ left: 10, top: 380, bottom: 410 }));
    render({ initial: '2026-10-09' });
    open();
    expect(place()).toContain('top-[calc(100%+6px)]');
  });

  it('a clipping (overflow) parent is the edge, not the window', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('clip') ? rect({ right: 400, bottom: 300 }) : rect({ left: 100, top: 20, bottom: 40 });
    });
    for (const style of [{ overflow: 'hidden' }, { overflowX: 'auto' as const }, { overflowX: 'hidden' as const }, { overflowY: 'auto' as const }, { overflow: 'auto' }]) {
      render({ initial: '2026-10-09' }, el => <div className="clip" style={style}><div>{el}</div></div>);
      open();
      expect(place()).toContain('right-0');
      act(() => root!.unmount()); host!.remove(); root = null;
    }
  });

  it('a parent that does not clip is ignored', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('clip') ? rect({ right: 400, bottom: 300 }) : rect({ left: 100, top: 20, bottom: 40 });
    });
    render({ initial: '2026-10-09' }, el => <div className="clip" style={{ overflow: 'visible' }}>{el}</div>);
    open();
    expect(place()).toContain('left-0');
  });

  it('a clipping parent with little room below sends it upward', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('clip') ? rect({ right: 1024, bottom: 450 }) : rect({ left: 10, top: 382, bottom: 386 }); // the window has room, the parent does not
    });
    render({ initial: '2026-10-09' }, el => <div className="clip" style={{ overflow: 'hidden' }}>{el}</div>);
    open();
    expect(place()).toContain('bottom-[calc(100%+6px)]');
  });
});
