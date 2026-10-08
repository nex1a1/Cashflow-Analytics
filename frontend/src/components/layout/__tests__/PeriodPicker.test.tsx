// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import PeriodPicker, { PeriodPickerProps } from '../PeriodPicker';
import { click, key, q, byText } from '@/test-utils/dom';
import type { GroupedOptions } from '@/types';
import { cycleSpanLabel } from '@/utils/payCycle';

// "Today" is 8 Oct 2026: calendar month 2026-10, and pay cycle 2026-09 (25 Sep – 24 Oct, named after the salary month).
// Only Date is faked: a faked setTimeout would hang act().
const TODAY = new Date(2026, 9, 8, 12, 0, 0);

const yr = (months: string[], quarters: string[] = [], halves: string[] = []) => ({
  months: new Set(months), quarters: new Set(quarters), halves: new Set(halves),
});
// 2026 has data in Mar, Jul, Sep, Oct (halves: H1 only; quarters: Q1, Q3, Q4). 2025 has Nov, Dec and no quarter / half entries.
const OPTS: GroupedOptions = {
  yearsMap: {
    '2026': yr(['2026-03', '2026-07', '2026-09', '2026-10'], ['2026-Q1', '2026-Q3', '2026-Q4'], ['2026-H1']),
    '2025': yr(['2025-11', '2025-12']),
  },
  sortedYears: ['2026', '2025'],
};
const EMPTY: GroupedOptions = { yearsMap: {}, sortedYears: [] };

let root: Root;
let host: HTMLDivElement;
let setPeriod: ReturnType<typeof vi.fn>;

const render = (p: Partial<PeriodPickerProps> = {}) => {
  const props: PeriodPickerProps = { filterPeriod: '2026-10', setFilterPeriod: setPeriod, groupedOptions: OPTS, ...p };
  act(() => root.render(<PeriodPicker {...props} />));
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(TODAY);
  setPeriod = vi.fn();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
  vi.useRealTimers();
});

const trigger = () => q<HTMLButtonElement>('button[aria-haspopup="dialog"]')!;
const dialog = () => q('[role="dialog"]');
const open = () => click(trigger());
const btn = (label: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const tab = (text: string) => byText('[role="dialog"] button', text) as HTMLButtonElement;
const yearBtn = (y: string) => [...document.querySelectorAll<HTMLButtonElement>('button[aria-expanded]')].find(b => b.textContent?.includes(y) && b !== trigger())!;
const isExpanded = (y: string) => yearBtn(y).getAttribute('aria-expanded') === 'true';
const has = (el: Element, cls: string) => el.classList.contains(cls);
/** month pill of one year (the year must be expanded); cycle pills carry the 25–24 span after the month name */
const pill = (ym: string) => {
  const [y, m] = ym.split('-');
  const name = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][Number(m) - 1];
  return [...yearBtn(y).parentElement!.querySelectorAll<HTMLButtonElement>('.grid-cols-3 > button')].find(b => b.textContent!.startsWith(name))!;
};
const pillTexts = (y: string) => [...yearBtn(y).parentElement!.querySelectorAll('.grid-cols-3 > button')].map(b => b.textContent);
const quickBtns = () => [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] .flex-1.text-center')];
const label = () => trigger().textContent;

describe('PeriodPicker — trigger', () => {
  it('shows the label of the current period', () => {
    render({ filterPeriod: '2026-10' });
    expect(label()).toBe('ตุลาคม 2026');
    render({ filterPeriod: '2026' });
    expect(label()).toBe('ปี 2026');
    render({ filterPeriod: 'ALL' });
    expect(label()).toBe('ดูภาพรวมทั้งหมด');
    render({ filterPeriod: '2026-03_2026-07' });
    expect(label()).toBe('มีนาคม 2026 - กรกฎาคม 2026');
    render({ filterPeriod: '2026-03,2026-07' });
    expect(label()).toBe('เลือกเฉพาะเจาะจง (2 เดือน)');
  });

  it('is closed at first and toggles on each click (aria-expanded follows)', () => {
    render();
    expect(dialog()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    open();
    expect(dialog()).not.toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(dialog()!.getAttribute('aria-label')).toBe('เลือกช่วงเวลา');
    open();
    expect(dialog()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('the "current month" button jumps to this month and is disabled when already there', () => {
    render({ filterPeriod: '2026-03' });
    expect(btn('ไปเดือนปัจจุบัน').disabled).toBe(false);
    click(btn('ไปเดือนปัจจุบัน'));
    expect(setPeriod).toHaveBeenCalledWith('2026-10');
    render({ filterPeriod: '2026-10' });
    expect(btn('ไปเดือนปัจจุบัน').disabled).toBe(true);
  });

  it('previous / next step one month, across a year boundary', () => {
    render({ filterPeriod: '2026-10' });
    click(btn('เดือนก่อนหน้า'));
    click(btn('เดือนถัดไป'));
    expect(setPeriod.mock.calls).toEqual([['2026-09'], ['2026-11']]);
    setPeriod.mockClear();
    render({ filterPeriod: '2026-01' });
    click(btn('เดือนก่อนหน้า'));
    render({ filterPeriod: '2026-12' });
    click(btn('เดือนถัดไป'));
    expect(setPeriod.mock.calls).toEqual([['2025-12'], ['2027-01']]);
  });

  it.each(['2026', 'ALL', '2026-Q1', '2026-03_2026-07', '2026-03,2026-07'])('the steppers are disabled for "%s" (only one plain month can be stepped)', (p) => {
    render({ filterPeriod: p });
    expect(btn('เดือนก่อนหน้า').disabled).toBe(true);
    expect(btn('เดือนถัดไป').disabled).toBe(true);
    click(btn('เดือนถัดไป'));
    expect(setPeriod).not.toHaveBeenCalled();
  });

  it('opening the dropdown does not change the period', () => {
    render();
    open();
    expect(setPeriod).not.toHaveBeenCalled();
  });
});

describe('PeriodPicker — closing', () => {
  it('a mousedown outside closes it, one inside does not', () => {
    render();
    open();
    act(() => { dialog()!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(dialog()).not.toBeNull();
    act(() => { trigger().dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(dialog()).not.toBeNull();
    act(() => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(dialog()).toBeNull();
  });

  it('Esc closes it and hands focus back to the trigger', () => {
    render();
    open();
    tab('ช่วงเวลา').focus();
    key(document.body, 'Escape');
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('other keys leave it open', () => {
    render();
    open();
    key(document.body, 'Enter');
    key(document.body, 'a');
    expect(dialog()).not.toBeNull();
  });

  // The Export modal closes itself on an Esc that reaches window. Closing the dropdown must swallow the key,
  // otherwise one press closes the dropdown AND the whole modal (and the user loses the export settings).
  it('Esc closes only the dropdown: a window-level Esc listener (the Export modal) never sees it', () => {
    const windowKey = vi.fn();
    window.addEventListener('keydown', windowKey);
    render();
    open();
    key(document.body, 'Escape');
    expect(dialog()).toBeNull();
    expect(windowKey).not.toHaveBeenCalled();
    window.removeEventListener('keydown', windowKey);
  });

  it('Esc on a closed picker is left alone, so a surrounding modal can still close', () => {
    const windowKey = vi.fn();
    window.addEventListener('keydown', windowKey);
    render();
    key(document.body, 'Escape');
    expect(windowKey).toHaveBeenCalledTimes(1);
    open();
    key(document.body, 'Escape'); // swallowed
    key(document.body, 'Escape'); // closed again: passes through
    expect(windowKey).toHaveBeenCalledTimes(2);
    window.removeEventListener('keydown', windowKey);
  });

  it('picking a period closes it', () => {
    render();
    open();
    click(pill('2026-09'));
    expect(dialog()).toBeNull();
  });

  it('floating: the panel is fixed, and scrolling anywhere outside closes it, scrolling inside does not', () => {
    render({ floating: true });
    open();
    expect(has(dialog()!, 'fixed')).toBe(true);
    expect(has(dialog()!, 'absolute')).toBe(false);
    act(() => { dialog()!.querySelector('.overflow-y-auto')!.dispatchEvent(new Event('scroll')); });
    expect(dialog()).not.toBeNull();
    act(() => { document.body.dispatchEvent(new Event('scroll')); });
    expect(dialog()).toBeNull();
  });

  it('not floating: the panel hangs under the trigger and a scroll elsewhere leaves it open', () => {
    render();
    open();
    expect(has(dialog()!, 'absolute')).toBe(true);
    expect(has(dialog()!, 'fixed')).toBe(false);
    act(() => { document.body.dispatchEvent(new Event('scroll')); });
    expect(dialog()).not.toBeNull();
  });

  it('removes every document / window listener it added once closed', () => {
    const spies = [document, window].map(t => ({ add: vi.spyOn(t, 'addEventListener'), rem: vi.spyOn(t, 'removeEventListener') }));
    const types = ['mousedown', 'keydown', 'scroll'];
    render({ floating: true });
    open();
    open();
    const handlers = (k: 'add' | 'rem') => spies.flatMap(s => s[k].mock.calls.filter(c => types.includes(c[0])).map(c => c[1]));
    const added = handlers('add');
    const removed = handlers('rem');
    spies.forEach(s => { s.add.mockRestore(); s.rem.mockRestore(); });
    expect(added).toHaveLength(3); // outside click, Esc, scroll
    expect(removed).toEqual(expect.arrayContaining(added));
  });

  it('only listens for scroll when floating', () => {
    const add = vi.spyOn(window, 'addEventListener');
    render();
    open();
    const scrolls = add.mock.calls.filter(c => c[0] === 'scroll').length;
    add.mockRestore();
    expect(scrolls).toBe(0);
  });
});

describe('PeriodPicker — เดี่ยว (single) mode', () => {
  it('opens on เดี่ยว with the ด่วน row and the ดูข้อมูลทั้งหมด row', () => {
    render();
    open();
    expect(tab('เดี่ยว').getAttribute('aria-pressed')).toBe('true');
    expect(tab('ช่วงเวลา').getAttribute('aria-pressed')).toBe('false');
    expect(tab('หลายเดือน').getAttribute('aria-pressed')).toBe('false');
    expect(dialog()!.textContent).toContain('ด่วน');
    expect(byText('[role="dialog"] button', 'ดูข้อมูลทั้งหมด')).not.toBeNull();
  });

  it('quick row: this month, last month, whole year → the values the period uses', () => {
    render({ filterPeriod: '2026-03' });
    open();
    expect(quickBtns().map(b => b.textContent)).toEqual(['เดือนนี้', 'เดือนก่อน', 'ทั้งปี 2026']);
    click(quickBtns()[0]);
    click(trigger());
    click(quickBtns()[1]);
    click(trigger());
    click(quickBtns()[2]);
    expect(setPeriod.mock.calls).toEqual([['2026-10'], ['2026-09'], ['2026']]);
  });

  it('quick row only offers what has data', () => {
    // only March 2026 exists: no current month, no last month, but the year is there
    render({ groupedOptions: { yearsMap: { '2026': yr(['2026-03']) }, sortedYears: ['2026'] } });
    open();
    expect(quickBtns().map(b => b.textContent)).toEqual(['ทั้งปี 2026']);
  });

  it('quick row: only the current month exists', () => {
    render({ groupedOptions: { yearsMap: { '2026': yr(['2026-10']) }, sortedYears: ['2026'] } });
    open();
    expect(quickBtns().map(b => b.textContent)).toEqual(['เดือนนี้', 'ทั้งปี 2026']);
  });

  it('quick row: only last month exists', () => {
    render({ groupedOptions: { yearsMap: { '2026': yr(['2026-09']) }, sortedYears: ['2026'] } });
    open();
    expect(quickBtns().map(b => b.textContent)).toEqual(['เดือนก่อน', 'ทั้งปี 2026']);
  });

  it('quick row is absent when no year of data matches today', () => {
    render({ groupedOptions: { yearsMap: { '2024': yr(['2024-05']) }, sortedYears: ['2024'] } });
    open();
    expect(dialog()!.textContent).not.toContain('ด่วน');
    expect(quickBtns()).toHaveLength(0);
  });

  it('last month in the previous year is found across the January boundary', () => {
    vi.setSystemTime(new Date(2027, 0, 5, 12));
    render({ filterPeriod: '2026-12', groupedOptions: { yearsMap: { '2026': yr(['2026-12']), '2027': yr(['2027-01']) }, sortedYears: ['2027', '2026'] } });
    open();
    expect(quickBtns().map(b => b.textContent)).toEqual(['เดือนนี้', 'เดือนก่อน', 'ทั้งปี 2027']);
    click(quickBtns()[1]);
    expect(setPeriod).toHaveBeenCalledWith('2026-12');
  });

  it('early January with data only in December: just "เดือนก่อน" is offered (this year has no data yet)', () => {
    vi.setSystemTime(new Date(2027, 0, 5, 12));
    render({ filterPeriod: '2026-12', groupedOptions: { yearsMap: { '2026': yr(['2026-12']) }, sortedYears: ['2026'] } });
    open();
    expect(quickBtns().map(b => b.textContent)).toEqual(['เดือนก่อน']);
  });

  it('marks the quick button that matches the current period', () => {
    render({ filterPeriod: '2026-09' });
    open();
    const [now, prev, year] = quickBtns();
    expect(has(now, 'border-accent-ink')).toBe(false);
    expect(has(prev, 'border-accent-ink')).toBe(true);
    expect(has(year, 'border-accent-ink')).toBe(false);
    render({ filterPeriod: '2026' });
    expect(has(quickBtns()[2], 'border-accent-ink')).toBe(true);
    expect(has(quickBtns()[1], 'border-accent-ink')).toBe(false);
  });

  it('ดูข้อมูลทั้งหมด selects ALL and is highlighted only when ALL is the period', () => {
    render({ filterPeriod: '2026-10' });
    open();
    const all = byText('[role="dialog"] button', 'ดูข้อมูลทั้งหมด')!;
    expect(has(all, 'border-accent-ink')).toBe(false);
    click(all);
    expect(setPeriod).toHaveBeenCalledWith('ALL');
    render({ filterPeriod: 'ALL' });
    open();
    expect(has(byText('[role="dialog"] button', 'ดูข้อมูลทั้งหมด')!, 'border-accent-ink')).toBe(true);
  });

  it('lists the years newest first, with their month count', () => {
    render();
    open();
    const years = [...document.querySelectorAll('button[aria-expanded]')].filter(b => b !== trigger()).map(b => b.textContent);
    expect(years).toEqual(['20264 เดือน', '20252 เดือน']);
  });

  it('expands the year of the period; the other starts collapsed', () => {
    render({ filterPeriod: '2025-12' });
    open();
    expect(isExpanded('2025')).toBe(true);
    expect(isExpanded('2026')).toBe(false);
  });

  it('a collapsed year shows none of its months or shortcuts', () => {
    render({ filterPeriod: '2025-12' });
    open();
    expect(yearBtn('2026').parentElement!.querySelectorAll('button')).toHaveLength(1); // just the year header
    expect(yearBtn('2025').parentElement!.querySelectorAll('.grid-cols-3 > button')).toHaveLength(2);
    click(yearBtn('2025'));
    expect(yearBtn('2025').parentElement!.querySelectorAll('button')).toHaveLength(1);
  });

  it('the chevron of the trigger turns over while open', () => {
    render();
    const chevron = () => trigger().querySelector('svg.lucide-chevron-down')!;
    expect(chevron().classList.contains('rotate-180')).toBe(false);
    open();
    expect(chevron().classList.contains('rotate-180')).toBe(true);
  });

  it('a period whose year has no data falls back to the newest year', () => {
    render({ filterPeriod: '2020-01' });
    open();
    expect(isExpanded('2026')).toBe(true);
    expect(isExpanded('2025')).toBe(false);
  });

  it('single mode keeps one year open at a time; clicking the open year collapses it', () => {
    render({ filterPeriod: '2026-10' });
    open();
    click(yearBtn('2025'));
    expect(isExpanded('2025')).toBe(true);
    expect(isExpanded('2026')).toBe(false);
    click(yearBtn('2025'));
    expect(isExpanded('2025')).toBe(false);
  });

  it('months of a year are listed newest first with Thai short names, and clicking one selects it', () => {
    render({ filterPeriod: '2026-10' });
    open();
    expect(pillTexts('2026')).toEqual(['ต.ค.', 'ก.ย.', 'ก.ค.', 'มี.ค.']);
    click(pill('2026-07'));
    expect(setPeriod).toHaveBeenCalledWith('2026-07');
  });

  it('highlights the selected month only', () => {
    render({ filterPeriod: '2026-09' });
    open();
    expect(has(pill('2026-09'), 'bg-accent')).toBe(true);
    expect(has(pill('2026-10'), 'bg-accent')).toBe(false);
    expect(has(pill('2026-07'), 'bg-accent')).toBe(false);
  });

  it('a dot next to the year marks the year holding the selection', () => {
    render({ filterPeriod: '2026-09' });
    open();
    expect(yearBtn('2026').querySelector('.rounded-full')).not.toBeNull();
    expect(yearBtn('2025').querySelector('.rounded-full')).toBeNull();
  });

  it('the dot is red in เดี่ยว, green in ช่วงเวลา and amber in หลายเดือน', () => {
    const dotClass = () => yearBtn('2026').querySelector('.rounded-full')!.className;
    render({ filterPeriod: '2026-09' });
    open();
    expect(dotClass()).toContain('bg-accent');
    click(tab('ช่วงเวลา'));
    click(pill('2026-03'));
    expect(dotClass()).toContain('bg-income');
    expect(dotClass()).not.toContain('bg-accent');
    click(tab('หลายเดือน'));
    click(pill('2026-03'));
    expect(dotClass()).toContain('bg-warn');
    expect(dotClass()).not.toContain('bg-income');
  });

  it('standard pills are plain buttons (no pressed state; that belongs to หลายเดือน)', () => {
    render({ filterPeriod: '2026-09' });
    open();
    expect(pill('2026-09').hasAttribute('aria-pressed')).toBe(false);
  });

  it('no year gets the dot when the period is ALL', () => {
    render({ filterPeriod: 'ALL' });
    open();
    expect(document.querySelectorAll('button[aria-expanded] .rounded-full')).toHaveLength(0);
  });

  it('a year with data offers "ทั้งปี" in its own list (not only in the quick row) and selects the bare year', () => {
    render({ filterPeriod: '2026-10' });
    open();
    const inList = (y: string) => [...yearBtn(y).parentElement!.querySelectorAll('button')].find(b => b.textContent === `ทั้งปี ${y}`)!;
    click(inList('2026'));
    expect(setPeriod).toHaveBeenCalledWith('2026');
    click(trigger());
    click(yearBtn('2025'));
    click(inList('2025')); // a year that is not "this year" has no quick-row twin
    expect(setPeriod).toHaveBeenLastCalledWith('2025');
  });

  it('"ทั้งปี" is highlighted when it is the period', () => {
    render({ filterPeriod: '2026' });
    open();
    // the quick-row button of the same name is the first match; the one in the year list comes last
    const inList = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].filter(b => b.textContent?.trim() === 'ทั้งปี 2026').pop()!;
    expect(has(inList, 'border-accent-ink')).toBe(true);
    expect(has(inList, 'bg-accent/15')).toBe(true);
  });

  it('half and quarter pills: only those with data, the rest leave an empty slot', () => {
    render({ filterPeriod: '2026-10' });
    open();
    const section = yearBtn('2026').parentElement!;
    const halves = [...section.querySelectorAll('.grid-cols-2 > *')];
    expect(halves.map(e => e.textContent)).toEqual(['H1', '']);
    expect(halves.map(e => e.tagName)).toEqual(['BUTTON', 'SPAN']);
    const quarters = [...section.querySelectorAll('.grid-cols-4 > *')];
    expect(quarters.map(e => e.textContent)).toEqual(['Q1', '', 'Q3', 'Q4']);
    click(halves[0] as HTMLElement); // picking closes the dropdown: reopen to reach the quarter row
    click(trigger());
    click(yearBtn('2026').parentElement!.querySelectorAll('.grid-cols-4 > *')[2]);
    expect(setPeriod.mock.calls).toEqual([['2026-H1'], ['2026-Q3']]);
  });

  it('no half / quarter rows at all for a year without them', () => {
    render({ filterPeriod: '2025-12' });
    open();
    const section = yearBtn('2025').parentElement!;
    expect(section.querySelectorAll('.grid-cols-2')).toHaveLength(0);
    expect(section.querySelectorAll('.grid-cols-4')).toHaveLength(0);
  });

  it('highlights the half or quarter that is the period', () => {
    render({ filterPeriod: '2026-Q3' });
    open();
    const section = yearBtn('2026').parentElement!;
    const q3 = [...section.querySelectorAll<HTMLElement>('.grid-cols-4 > *')][2];
    expect(has(q3, 'bg-accent')).toBe(true);
    expect(has([...section.querySelectorAll<HTMLElement>('.grid-cols-4 > *')][0], 'bg-accent')).toBe(false);
  });

  it('shows "ยังไม่มีข้อมูล" when there is nothing to pick', () => {
    render({ groupedOptions: EMPTY, filterPeriod: 'ALL' });
    open();
    expect(dialog()!.textContent).toContain('ยังไม่มีข้อมูล');
    expect(document.querySelectorAll('button[aria-expanded]')).toHaveLength(1); // only the trigger
  });

  it('the month pills have no 25–24 caption in calendar mode', () => {
    render();
    open();
    expect(pill('2026-10').title).toBe('');
    expect(pill('2026-10').children).toHaveLength(0);
  });

  it('the pay-cycle switch is not offered unless allowed', () => {
    render();
    open();
    expect(byText('[role="dialog"] button', 'เดือนปฏิทิน')).toBeNull();
    expect(byText('[role="dialog"] button', 'รอบเงินเดือน 25–24')).toBeNull();
  });
});

describe('PeriodPicker — ช่วงเวลา (range) mode', () => {
  const openRange = (p: string = '2026-10') => { render({ filterPeriod: p }); open(); click(tab('ช่วงเวลา')); };
  const confirm = () => byText('[role="dialog"] button', 'ยืนยันช่วงเวลานี้') ?? byText('[role="dialog"] button', 'รอเลือกช่วงเวลา...');

  it('walks the user through start → end and confirms an ordered range', () => {
    openRange();
    expect(tab('ช่วงเวลา').getAttribute('aria-pressed')).toBe('true');
    expect(dialog()!.textContent).toContain('เลือกเดือนเริ่มต้น');
    expect(dialog()!.textContent).not.toContain('ด่วน');
    expect(byText('[role="dialog"] button', 'ดูข้อมูลทั้งหมด')).toBeNull();
    expect((confirm() as HTMLButtonElement).disabled).toBe(true);
    expect(confirm()!.textContent).toBe('รอเลือกช่วงเวลา...');

    click(pill('2026-09'));
    expect(dialog()!.textContent).toContain('เลือกเดือนสิ้นสุด');
    expect(dialog()!.textContent).toContain('จาก: กันยายน 2026 → เลือกเดือนสิ้นสุด');
    expect((confirm() as HTMLButtonElement).disabled).toBe(true);

    click(pill('2026-03'));
    expect(dialog()!.textContent).toContain('พร้อมยืนยัน');
    expect(dialog()!.textContent).toContain('มีนาคม 2026 — กันยายน 2026'); // sorted: the earlier month is the start
    expect(confirm()!.textContent).toBe('ยืนยันช่วงเวลานี้');
    expect((confirm() as HTMLButtonElement).disabled).toBe(false);
    click(confirm());
    expect(setPeriod).toHaveBeenCalledWith('2026-03_2026-09');
    expect(dialog()).toBeNull();
  });

  it('start and end on the same month give that single month', () => {
    openRange();
    click(pill('2026-07'));
    click(pill('2026-07'));
    click(confirm());
    expect(setPeriod).toHaveBeenCalledWith('2026-07');
  });

  it('a third click starts a new range', () => {
    openRange();
    click(pill('2026-03'));
    click(pill('2026-07'));
    click(pill('2026-09'));
    expect(dialog()!.textContent).toContain('เลือกเดือนสิ้นสุด');
    expect(dialog()!.textContent).toContain('จาก: กันยายน 2026');
    expect((confirm() as HTMLButtonElement).disabled).toBe(true);
  });

  it('the step badges show where the user is', () => {
    openRange();
    const badges = () => [...document.querySelectorAll('.w-4.h-4.font-bold.border')].map(b => has(b, 'bg-income'));
    expect(badges()).toEqual([true, false]);
    click(pill('2026-03'));
    expect(badges()).toEqual([false, true]);
    click(pill('2026-07'));
    expect(badges()).toEqual([false, false]);
  });

  it('colours the two ends and the months between, nothing outside', () => {
    openRange();
    click(pill('2026-03'));
    click(pill('2026-09'));
    expect(has(pill('2026-03'), 'bg-income')).toBe(true);
    expect(has(pill('2026-09'), 'bg-income')).toBe(true);
    expect(has(pill('2026-07'), 'bg-income/20')).toBe(true);
    expect(has(pill('2026-07'), 'bg-income')).toBe(false);
    expect(has(pill('2026-10'), 'bg-income')).toBe(false);
    expect(has(pill('2026-10'), 'bg-income/20')).toBe(false);
  });

  it('the ✕ clears the range and the hint comes back', () => {
    openRange();
    click(pill('2026-03'));
    click(pill('2026-07'));
    click(btn('ล้างช่วงเวลา'));
    expect(dialog()!.textContent).toContain('เลือกเดือนเริ่มต้น');
    expect(btn('ล้างช่วงเวลา')).toBeNull();
    expect(has(pill('2026-03'), 'bg-income')).toBe(false);
  });

  it('the ✕ appears only once a start is chosen', () => {
    openRange();
    expect(btn('ล้างช่วงเวลา')).toBeNull();
    click(pill('2026-03'));
    expect(btn('ล้างช่วงเวลา')).not.toBeNull();
  });

  it('shows the instruction before anything is picked', () => {
    openRange();
    expect(dialog()!.textContent).toContain('คลิกเดือนเริ่มต้น จากนั้นเลือกเดือนสิ้นสุด');
  });

  it('reopens on ช่วงเวลา with the saved range filled in, and both of its years expanded', () => {
    openRange('2025-11_2026-03');
    expect(tab('ช่วงเวลา').getAttribute('aria-pressed')).toBe('true');
    expect(dialog()!.textContent).toContain('พร้อมยืนยัน');
    expect(isExpanded('2025')).toBe(true);
    expect(isExpanded('2026')).toBe(true);
    expect(has(pill('2025-11'), 'bg-income')).toBe(true);
    expect(has(pill('2026-03'), 'bg-income')).toBe(true);
    expect(has(pill('2025-12'), 'bg-income/20')).toBe(true);
  });

  it('a dot marks every year the range touches', () => {
    openRange('2025-11_2026-03');
    expect(yearBtn('2025').querySelector('.rounded-full')).not.toBeNull();
    expect(yearBtn('2026').querySelector('.rounded-full')).not.toBeNull();
    // start chosen but not the end: the start's year only
    click(btn('ล้างช่วงเวลา'));
    click(pill('2025-12'));
    expect(yearBtn('2025').querySelector('.rounded-full')).not.toBeNull();
    expect(yearBtn('2026').querySelector('.rounded-full')).toBeNull();
  });

  it('there is no dot when nothing is picked', () => {
    openRange();
    expect(document.querySelectorAll('button[aria-expanded] .rounded-full')).toHaveLength(0);
  });

  it('range mode keeps several years open at once', () => {
    openRange('2026-10');
    click(yearBtn('2025'));
    expect(isExpanded('2025')).toBe(true);
    expect(isExpanded('2026')).toBe(true);
  });

  it('half / quarter / whole-year shortcuts are not offered while picking a range', () => {
    openRange();
    expect(byText('[role="dialog"] button', 'ทั้งปี 2026')).toBeNull();
    expect(document.querySelectorAll('.grid-cols-2, .grid-cols-4')).toHaveLength(0);
  });

  it('switching the mode forgets the half-made range', () => {
    openRange();
    click(pill('2026-03'));
    click(tab('หลายเดือน'));
    click(tab('ช่วงเวลา'));
    expect(dialog()!.textContent).toContain('เลือกเดือนเริ่มต้น');
    expect(has(pill('2026-03'), 'bg-income')).toBe(false);
  });

  it('switching the mode forgets a finished range too, both ends', () => {
    openRange();
    click(pill('2026-03'));
    click(pill('2026-09'));
    click(tab('หลายเดือน'));
    click(tab('ช่วงเวลา'));
    expect(dialog()!.textContent).toContain('เลือกเดือนเริ่มต้น');
    for (const m of ['2026-03', '2026-07', '2026-09']) {
      expect(has(pill(m), 'bg-income')).toBe(false);
      expect(has(pill(m), 'bg-income/20')).toBe(false);
    }
    // the next click starts fresh instead of finishing the old range
    click(pill('2026-07'));
    expect(dialog()!.textContent).toContain('เลือกเดือนสิ้นสุด');
  });

  it('switching from หลายเดือน to ช่วงเวลา drops the picks, and back to เดี่ยว too', () => {
    render({ filterPeriod: '2026-10' });
    open();
    click(tab('หลายเดือน'));
    click(pill('2026-03'));
    click(tab('เดี่ยว'));
    click(tab('หลายเดือน'));
    expect(pill('2026-03').getAttribute('aria-pressed')).toBe('false');
    expect(dialog()!.textContent).toContain('คลิกเดือนใดก็ได้');
  });

  it('only the months after the start and before the end are "between" — earlier months of a lower year are not', () => {
    openRange();
    click(pill('2026-07'));
    click(pill('2026-09'));
    click(yearBtn('2025'));
    expect(has(pill('2025-12'), 'bg-income/20')).toBe(false);
    expect(has(pill('2026-03'), 'bg-income/20')).toBe(false);
    expect(has(pill('2026-10'), 'bg-income/20')).toBe(false);
  });

  it('a range inside one year puts no dot on the years around it', () => {
    const three: GroupedOptions = { ...OPTS, yearsMap: { ...OPTS.yearsMap, '2027': yr(['2027-01']) }, sortedYears: ['2027', '2026', '2025'] };
    render({ filterPeriod: '2026-03_2026-07', groupedOptions: three });
    open();
    expect(yearBtn('2026').querySelector('.rounded-full')).not.toBeNull();
    expect(yearBtn('2025').querySelector('.rounded-full')).toBeNull();
    expect(yearBtn('2027').querySelector('.rounded-full')).toBeNull();
  });

  it('clearing the range also unlights the end month', () => {
    openRange();
    click(pill('2026-03'));
    click(pill('2026-07'));
    click(btn('ล้างช่วงเวลา'));
    expect(has(pill('2026-07'), 'bg-income')).toBe(false);
    expect(has(pill('2026-09'), 'bg-income/20')).toBe(false);
  });

  it('a period that changes while the dropdown is open re-syncs the tabs and selection', () => {
    render({ filterPeriod: '2026-10' });
    open();
    expect(tab('เดี่ยว').getAttribute('aria-pressed')).toBe('true');
    render({ filterPeriod: '2026-03_2026-07' });
    expect(tab('ช่วงเวลา').getAttribute('aria-pressed')).toBe('true');
    expect(has(pill('2026-03'), 'bg-income')).toBe(true);
    render({ filterPeriod: '2026-03,2026-07' });
    expect(tab('หลายเดือน').getAttribute('aria-pressed')).toBe('true');
    expect(pill('2026-07').getAttribute('aria-pressed')).toBe('true');
  });

  it('options that change while it is open expand the newest year when the period\'s year is gone', () => {
    render({ filterPeriod: '2026-10' });
    open();
    expect(isExpanded('2026')).toBe(true);
    render({ filterPeriod: '2026-10', groupedOptions: { yearsMap: { '2024': yr(['2024-05']) }, sortedYears: ['2024'] } });
    expect(isExpanded('2024')).toBe(true);
  });

  it('clicking the mode already on changes nothing', () => {
    openRange();
    click(pill('2026-03'));
    click(tab('ช่วงเวลา'));
    expect(has(pill('2026-03'), 'bg-income')).toBe(true);
  });
});

describe('PeriodPicker — หลายเดือน (multi) mode', () => {
  const openMulti = (p: string = '2026-10') => { render({ filterPeriod: p }); open(); click(tab('หลายเดือน')); };
  const confirm = () => [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(b => /^(ยืนยันการเลือก|เลือกเดือนที่ต้องการ)/.test(b.textContent!))!;
  const chips = () => [...document.querySelectorAll('[role="dialog"] span.rounded-pill')].map(c => c.textContent);

  it('no empty chip tray (it would add a gap) until something is picked', () => {
    openMulti();
    expect(document.querySelector('[role="dialog"] .flex-wrap')).toBeNull();
    click(pill('2026-03'));
    expect(document.querySelector('[role="dialog"] .flex-wrap')).not.toBeNull();
  });

  it('starts with the hint and nothing to confirm', () => {
    openMulti();
    expect(dialog()!.textContent).toContain('คลิกเดือนใดก็ได้เพื่อเพิ่มเข้าการเลือก');
    expect(confirm().textContent).toBe('เลือกเดือนที่ต้องการ');
    expect(confirm().disabled).toBe(true);
    expect(byText('[role="dialog"] button', 'ล้าง')!.hasAttribute('disabled')).toBe(true);
    expect(chips()).toEqual([]);
  });

  it('a click adds a month, a second click removes it (aria-pressed follows)', () => {
    openMulti();
    expect(pill('2026-03').getAttribute('aria-pressed')).toBe('false');
    click(pill('2026-03'));
    expect(pill('2026-03').getAttribute('aria-pressed')).toBe('true');
    expect(has(pill('2026-03'), 'bg-warn')).toBe(true);
    expect(dialog()!.textContent).not.toContain('คลิกเดือนใดก็ได้');
    click(pill('2026-03'));
    expect(pill('2026-03').getAttribute('aria-pressed')).toBe('false');
    expect(dialog()!.textContent).toContain('คลิกเดือนใดก็ได้');
  });

  it('chips are sorted by month with a short name and 2-digit year, whatever order they were picked in', () => {
    openMulti();
    click(yearBtn('2025'));
    click(pill('2026-09'));
    click(pill('2025-12'));
    click(pill('2026-03'));
    expect(chips()).toEqual(['ธ.ค. 25', 'มี.ค. 26', 'ก.ย. 26']);
  });

  it('confirms one month as that month, several as a sorted list', () => {
    openMulti();
    click(pill('2026-09'));
    expect(confirm().textContent).toBe('ยืนยันการเลือก (1)');
    click(confirm());
    expect(setPeriod).toHaveBeenLastCalledWith('2026-09');

    openMulti();
    click(pill('2026-10'));
    click(pill('2026-03'));
    click(pill('2026-07'));
    expect(confirm().textContent).toBe('ยืนยันการเลือก (3)');
    click(confirm());
    expect(setPeriod).toHaveBeenLastCalledWith('2026-03,2026-07,2026-10');
    expect(dialog()).toBeNull();
  });

  it('a chip ✕ removes that month only', () => {
    openMulti();
    click(pill('2026-03'));
    click(pill('2026-07'));
    click(btn('เอา มีนาคม 2026 ออก'));
    expect(pill('2026-03').getAttribute('aria-pressed')).toBe('false');
    expect(pill('2026-07').getAttribute('aria-pressed')).toBe('true');
    expect(chips()).toEqual(['ก.ค. 26']);
  });

  it('ล้าง empties the selection', () => {
    openMulti();
    click(pill('2026-03'));
    click(pill('2026-07'));
    click(byText('[role="dialog"] button', 'ล้าง'));
    expect(chips()).toEqual([]);
    expect(confirm().disabled).toBe(true);
  });

  it('reopens on หลายเดือน with the saved list picked and its years expanded', () => {
    render({ filterPeriod: '2025-12,2026-03' });
    open();
    expect(tab('หลายเดือน').getAttribute('aria-pressed')).toBe('true');
    expect(isExpanded('2025')).toBe(true);
    expect(isExpanded('2026')).toBe(true);
    expect(pill('2025-12').getAttribute('aria-pressed')).toBe('true');
    expect(pill('2026-03').getAttribute('aria-pressed')).toBe('true');
    expect(pill('2026-10').getAttribute('aria-pressed')).toBe('false');
    expect(confirm().textContent).toBe('ยืนยันการเลือก (2)');
  });

  it('the year dot shows only for years that hold a picked month', () => {
    openMulti();
    click(pill('2026-03'));
    expect(yearBtn('2026').querySelector('.rounded-full')).not.toBeNull();
    expect(yearBtn('2025').querySelector('.rounded-full')).toBeNull();
  });

  it('multi mode keeps several years open at once', () => {
    openMulti();
    click(yearBtn('2025'));
    expect(isExpanded('2025')).toBe(true);
    expect(isExpanded('2026')).toBe(true);
  });

  it('switching the mode forgets the picks', () => {
    openMulti();
    click(pill('2026-03'));
    click(tab('ช่วงเวลา'));
    click(tab('หลายเดือน'));
    expect(chips()).toEqual([]);
  });

  it('a parent re-render with the same options keeps the picks in progress', () => {
    openMulti();
    click(pill('2026-03'));
    render({ filterPeriod: '2026-10' });
    expect(pill('2026-03').getAttribute('aria-pressed')).toBe('true');
  });
});

describe('PeriodPicker — pay-cycle mode (25–24)', () => {
  // cycle keys come from the months that have data: month M gives cycle M (from the 25th) and cycle M-1 (days 1–24)
  //   2026: 02 03 06 07 08 09 10 (7 cycles)   2025: 10 11 12 (3 cycles)
  const CYC = 'cycle:2026-09';
  const openCycle = (p: string = CYC) => { render({ filterPeriod: p, allowCycle: true }); open(); };
  const stem = (t: string | null) => t!.split(/\d/)[0];
  const spanOf = (from: string, to?: string) => cycleSpanLabel(from, to);
  const sw = (text: string) => byText('[role="dialog"] button', text) as HTMLButtonElement;
  const yearCount = () => [...document.querySelectorAll('button[aria-expanded]')].filter(b => b !== trigger()).map(b => b.textContent);
  const wholeYear = (y: string) => [...yearBtn(y).parentElement!.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent!.startsWith(`ทั้งปี ${y}`))!;

  it('labels the trigger with the cycle and its dates, and speaks of รอบ everywhere', () => {
    render({ filterPeriod: CYC, allowCycle: true });
    expect(label()).toBe('รอบ ก.ย. 2026 (25 ก.ย. – 24 ต.ค.)');
    expect(btn('ไปรอบปัจจุบัน')).not.toBeNull();
    expect(btn('รอบก่อนหน้า')).not.toBeNull();
    expect(btn('รอบถัดไป')).not.toBeNull();
    expect(btn('ไปเดือนปัจจุบัน')).toBeNull();
  });

  it('"today" is the cycle holding 8 Oct (the one named September), and is disabled when already there', () => {
    render({ filterPeriod: 'cycle:2026-03', allowCycle: true });
    click(btn('ไปรอบปัจจุบัน'));
    expect(setPeriod).toHaveBeenCalledWith('cycle:2026-09');
    render({ filterPeriod: CYC, allowCycle: true });
    expect(btn('ไปรอบปัจจุบัน').disabled).toBe(true);
  });

  it('the steppers keep the cycle: prefix, and are disabled for ranges and ALL', () => {
    render({ filterPeriod: CYC, allowCycle: true });
    click(btn('รอบก่อนหน้า'));
    click(btn('รอบถัดไป'));
    expect(setPeriod.mock.calls).toEqual([['cycle:2026-08'], ['cycle:2026-10']]);
    for (const p of ['cycle:ALL', 'cycle:2026-01_2026-12', 'cycle:2026-03,2026-07']) {
      render({ filterPeriod: p, allowCycle: true });
      expect(btn('รอบก่อนหน้า').disabled).toBe(true);
      expect(btn('รอบถัดไป').disabled).toBe(true);
    }
  });

  describe('calendar ↔ cycle switch', () => {
    it('shows the current mode pressed, with a tooltip explaining each', () => {
      openCycle();
      expect(sw('รอบเงินเดือน 25–24').getAttribute('aria-pressed')).toBe('true');
      expect(sw('เดือนปฏิทิน').getAttribute('aria-pressed')).toBe('false');
      expect(has(sw('รอบเงินเดือน 25–24'), 'border-b-accent-ink')).toBe(true);
      expect(has(sw('เดือนปฏิทิน'), 'border-b-accent-ink')).toBe(false);
      expect(sw('รอบเงินเดือน 25–24').title).toContain('วันที่ 25');
      expect(sw('เดือนปฏิทิน').title).toBe('วันที่ 1 ถึงสิ้นเดือน');
    });

    it('calendar mode presses the other side', () => {
      render({ filterPeriod: '2026-10', allowCycle: true });
      open();
      expect(sw('เดือนปฏิทิน').getAttribute('aria-pressed')).toBe('true');
      expect(sw('รอบเงินเดือน 25–24').getAttribute('aria-pressed')).toBe('false');
    });

    it('switching converts the period to the same stretch of time in the other mode, and the dropdown stays open', () => {
      render({ filterPeriod: '2026-10', allowCycle: true });
      open();
      click(sw('รอบเงินเดือน 25–24'));
      expect(setPeriod).toHaveBeenLastCalledWith('cycle:2026-09');
      expect(dialog()).not.toBeNull();

      render({ filterPeriod: 'cycle:2026-03_2026-07', allowCycle: true }); // already open: just a new period
      click(sw('เดือนปฏิทิน'));
      expect(setPeriod).toHaveBeenLastCalledWith('2026-04_2026-08');
    });

    it('ALL stays ALL, and a calendar year becomes the current cycle', () => {
      render({ filterPeriod: 'ALL', allowCycle: true });
      open();
      click(sw('รอบเงินเดือน 25–24'));
      expect(setPeriod).toHaveBeenLastCalledWith('cycle:ALL');
      render({ filterPeriod: '2026', allowCycle: true });
      click(sw('รอบเงินเดือน 25–24'));
      expect(setPeriod).toHaveBeenLastCalledWith('cycle:2026-09');
    });

    it('clicking the mode already on does nothing', () => {
      openCycle();
      click(sw('รอบเงินเดือน 25–24'));
      expect(setPeriod).not.toHaveBeenCalled();
    });
  });

  it('the mode tabs say รอบ and carry the unit in their tooltips', () => {
    openCycle();
    expect(tab('เดี่ยว').title).toBe('เลือก 1 รอบ, ไตรมาส, หรือปี');
    expect(tab('ช่วงเวลา').title).toBe('เลือกช่วงรอบต่อเนื่อง');
    expect(tab('หลายรอบ').title).toBe('เลือกหลายรอบแบบอิสระ ไม่ต้องต่อเนื่อง');
    expect(byText('[role="dialog"] button', 'หลายเดือน')).toBeNull();
  });

  it('quick row: this cycle / last cycle / whole cycle-year, each with its dates as the tooltip', () => {
    openCycle();
    const [now, prev, year] = quickBtns();
    expect(quickBtns().map(b => b.textContent)).toEqual(['รอบนี้', 'รอบก่อน', 'ทั้งปี 2026']);
    expect(now.title).toBe('25 ก.ย. 26 – 24 ต.ค. 26 · 30 วัน');
    expect(prev.title).toBe(spanOf('2026-08'));
    expect(year.title).toBe('25 ม.ค. 26 – 24 ม.ค. 27 · 365 วัน');
    expect(has(now, 'border-accent-ink')).toBe(true); // the period is the current cycle
    click(now); click(trigger()); click(quickBtns()[1]); click(trigger()); click(quickBtns()[2]);
    expect(setPeriod.mock.calls).toEqual([['cycle:2026-09'], ['cycle:2026-08'], ['cycle:2026-01_2026-12']]);
  });

  it('the cycle-year quick button is highlighted when the whole cycle-year is the period', () => {
    openCycle('cycle:2026-01_2026-12');
    expect(has(quickBtns()[2], 'border-accent-ink')).toBe(true);
    expect(has(quickBtns()[0], 'border-accent-ink')).toBe(false);
  });

  it('ดูข้อมูลทั้งหมด selects cycle:ALL', () => {
    openCycle();
    click(byText('[role="dialog"] button', 'ดูข้อมูลทั้งหมด'));
    expect(setPeriod).toHaveBeenCalledWith('cycle:ALL');
    openCycle('cycle:ALL');
    expect(has(byText('[role="dialog"] button', 'ดูข้อมูลทั้งหมด')!, 'border-accent-ink')).toBe(true);
  });

  it('lists cycles, not months: M and M-1 for every month with data, counted per year', () => {
    openCycle();
    expect(yearCount()).toEqual(['20267 รอบ', '20253 รอบ']);
    expect(pillTexts('2026').map(stem)).toEqual(['ต.ค.', 'ก.ย.', 'ส.ค.', 'ก.ค.', 'มิ.ย.', 'มี.ค.', 'ก.พ.']);
  });

  it("January data reaches into the previous year (days 1–24 belong to December's cycle)", () => {
    render({ filterPeriod: 'cycle:2026-01', allowCycle: true, groupedOptions: { yearsMap: { '2026': yr(['2026-01']) }, sortedYears: ['2026'] } });
    open();
    expect(yearCount()).toEqual(['20261 รอบ', '20251 รอบ']);
    click(yearBtn('2025'));
    expect(pillTexts('2025').map(stem)).toEqual(['ธ.ค.']);
  });

  it('every cycle pill spells out its 25–24 dates, and picking one selects the cycle', () => {
    openCycle();
    expect(pillTexts('2026')[0]).toBe('ต.ค.25 ต.ค. – 24 พ.ย.');
    expect(pill('2026-10').title).toBe('25 ต.ค. 26 – 24 พ.ย. 26 · 31 วัน');
    expect(pill('2026-02').textContent).toBe('ก.พ.25 ก.พ. – 24 มี.ค.');
    click(pill('2026-07'));
    expect(setPeriod).toHaveBeenCalledWith('cycle:2026-07');
  });

  it('highlights the selected cycle only', () => {
    openCycle('cycle:2026-07');
    expect(has(pill('2026-07'), 'bg-accent')).toBe(true);
    expect(has(pill('2026-09'), 'bg-accent')).toBe(false);
  });

  it('the dates under an idle pill are muted; under a lit pill they keep the pill\'s own colour', () => {
    openCycle('cycle:2026-07');
    const caption = (ym: string) => pill(ym).querySelector('span')!;
    expect(caption('2026-09').classList.contains('text-ink-muted')).toBe(true);
    expect(caption('2026-07').classList.contains('text-ink-muted')).toBe(false);
  });

  it('year / half / quarter presets are cycle ranges named by salary month; each shows its dates', () => {
    openCycle();
    const section = yearBtn('2026').parentElement!;
    expect(wholeYear('2026').textContent).toBe(`ทั้งปี 2026${spanOf('2026-01', '2026-12')}`);
    expect(wholeYear('2026').title).toBe(spanOf('2026-01', '2026-12'));
    const halves = [...section.querySelectorAll<HTMLElement>('.grid-cols-2 > *')];
    const quarters = [...section.querySelectorAll<HTMLElement>('.grid-cols-4 > *')];
    expect(halves.map(e => e.textContent)).toEqual(['H1', 'H2']);
    expect(quarters.map(e => e.textContent)).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
    expect(halves[0].title).toBe(spanOf('2026-01', '2026-06'));
    expect(quarters[2].title).toBe(spanOf('2026-07', '2026-09'));
  });

  it('picking a cycle preset sends the range with the prefix', () => {
    openCycle();
    click(wholeYear('2026'));
    expect(setPeriod).toHaveBeenLastCalledWith('cycle:2026-01_2026-12');
    openCycle();
    click(yearBtn('2026').parentElement!.querySelectorAll('.grid-cols-2 > *')[0]);
    expect(setPeriod).toHaveBeenLastCalledWith('cycle:2026-01_2026-06');
    openCycle();
    click(yearBtn('2026').parentElement!.querySelectorAll('.grid-cols-2 > *')[1]);
    expect(setPeriod).toHaveBeenLastCalledWith('cycle:2026-07_2026-12');
    openCycle();
    click(yearBtn('2026').parentElement!.querySelectorAll('.grid-cols-4 > *')[0]);
    expect(setPeriod).toHaveBeenLastCalledWith('cycle:2026-01_2026-03');
    openCycle();
    click(yearBtn('2026').parentElement!.querySelectorAll('.grid-cols-4 > *')[3]);
    expect(setPeriod).toHaveBeenLastCalledWith('cycle:2026-10_2026-12');
  });

  it('a year with a few cycles offers only the presets that overlap them', () => {
    openCycle('cycle:2025-11');
    const section = yearBtn('2025').parentElement!;
    expect([...section.querySelectorAll('.grid-cols-2 > *')].map(e => e.textContent)).toEqual(['', 'H2']);
    expect([...section.querySelectorAll('.grid-cols-4 > *')].map(e => e.textContent)).toEqual(['', '', '', 'Q4']);
    expect(wholeYear('2025')).toBeTruthy();
  });

  it('a preset period reopens in เดี่ยว (a range underneath, but not a custom range) with its pill lit', () => {
    openCycle('cycle:2026-01_2026-03');
    expect(tab('เดี่ยว').getAttribute('aria-pressed')).toBe('true');
    expect(tab('ช่วงเวลา').getAttribute('aria-pressed')).toBe('false');
    expect(isExpanded('2026')).toBe(true);
    const quarters = yearBtn('2026').parentElement!.querySelectorAll<HTMLElement>('.grid-cols-4 > *');
    expect(has(quarters[0], 'bg-accent')).toBe(true);
    expect(has(quarters[1], 'bg-accent')).toBe(false);
    expect(yearBtn('2026').querySelector('.rounded-full')).not.toBeNull();
  });

  it('the whole-year preset is highlighted when it is the period', () => {
    openCycle('cycle:2026-01_2026-12');
    expect(has(wholeYear('2026'), 'bg-accent/15')).toBe(true);
  });

  it('a custom cycle range reopens in ช่วงเวลา, and confirming it keeps the prefix', () => {
    openCycle('cycle:2026-03_2026-07');
    expect(tab('ช่วงเวลา').getAttribute('aria-pressed')).toBe('true');
    expect(dialog()!.textContent).toContain(spanOf('2026-03', '2026-07'));
    click(byText('[role="dialog"] button', 'ยืนยันช่วงเวลานี้'));
    expect(setPeriod).toHaveBeenCalledWith('cycle:2026-03_2026-07');
  });

  it('range mode in cycles: รอบ in the hints, dates in the summary, prefix on the result', () => {
    openCycle();
    click(tab('ช่วงเวลา'));
    expect(dialog()!.textContent).toContain('เลือกรอบเริ่มต้น');
    expect(dialog()!.textContent).toContain('คลิกรอบเริ่มต้น จากนั้นเลือกรอบสิ้นสุด');
    click(pill('2026-09'));
    expect(dialog()!.textContent).toContain('จาก: รอบ ก.ย. 2026 (25 ก.ย. – 24 ต.ค.) → เลือกรอบสิ้นสุด');
    click(pill('2026-03'));
    expect(dialog()!.textContent).toContain(spanOf('2026-03', '2026-09'));
    click(byText('[role="dialog"] button', 'ยืนยันช่วงเวลานี้'));
    expect(setPeriod).toHaveBeenCalledWith('cycle:2026-03_2026-09');
  });

  it('multi mode in cycles: รอบ in the hints and the remove label, prefix on the result', () => {
    openCycle();
    click(tab('หลายรอบ'));
    expect(dialog()!.textContent).toContain('คลิกรอบใดก็ได้เพื่อเพิ่มเข้าการเลือก');
    expect(byText('[role="dialog"] button', 'เลือกรอบที่ต้องการ')).not.toBeNull();
    click(pill('2026-07'));
    click(pill('2026-03'));
    expect(btn('เอา รอบ มี.ค. 2026 (25 มี.ค. – 24 เม.ย.) ออก')).not.toBeNull();
    click(byText('[role="dialog"] button', 'ยืนยันการเลือก (2)'));
    expect(setPeriod).toHaveBeenCalledWith('cycle:2026-03,2026-07');
  });

  it('a saved cycle list reopens in หลายรอบ', () => {
    openCycle('cycle:2026-03,2026-07');
    expect(tab('หลายรอบ').getAttribute('aria-pressed')).toBe('true');
    expect(pill('2026-03').getAttribute('aria-pressed')).toBe('true');
    expect(pill('2026-07').getAttribute('aria-pressed')).toBe('true');
  });

  it('with no data at all the cycle list says so', () => {
    render({ filterPeriod: 'cycle:ALL', allowCycle: true, groupedOptions: EMPTY });
    open();
    expect(dialog()!.textContent).toContain('ยังไม่มีข้อมูล');
  });

  it('a parent re-render with the same options keeps the picks in progress (the cycle list is derived once)', () => {
    openCycle();
    click(tab('หลายรอบ'));
    click(pill('2026-07'));
    render({ filterPeriod: CYC, allowCycle: true });
    expect(pill('2026-07').getAttribute('aria-pressed')).toBe('true');
  });

  it('leaving cycle mode lists the calendar months again, and the quick row and today button follow', () => {
    render({ filterPeriod: CYC, allowCycle: true });
    open();
    expect(quickBtns().map(b => b.textContent)).toEqual(['รอบนี้', 'รอบก่อน', 'ทั้งปี 2026']);
    render({ filterPeriod: '2026-03', allowCycle: true });
    expect(pillTexts('2026')).toEqual(['ต.ค.', 'ก.ย.', 'ก.ค.', 'มี.ค.']);
    expect(quickBtns().map(b => b.textContent)).toEqual(['เดือนนี้', 'เดือนก่อน', 'ทั้งปี 2026']);
    click(btn('ไปเดือนปัจจุบัน'));
    expect(setPeriod).toHaveBeenLastCalledWith('2026-10');
  });

  it('entering cycle mode from calendar mode switches the quick row and today button too', () => {
    render({ filterPeriod: '2026-03', allowCycle: true });
    open();
    render({ filterPeriod: 'cycle:2026-03', allowCycle: true });
    expect(quickBtns().map(b => b.textContent)).toEqual(['รอบนี้', 'รอบก่อน', 'ทั้งปี 2026']);
    click(btn('ไปรอบปัจจุบัน'));
    expect(setPeriod).toHaveBeenLastCalledWith('cycle:2026-09');
  });

  it('new options while in cycle mode produce a new cycle list', () => {
    openCycle();
    expect(yearCount()).toEqual(['20267 รอบ', '20253 รอบ']);
    render({ filterPeriod: CYC, allowCycle: true, groupedOptions: { yearsMap: { '2024': yr(['2024-05']) }, sortedYears: ['2024'] } });
    expect(yearCount()).toEqual(['20242 รอบ']);
  });

  it('early January: the cycle year is the previous year (cycle December), so "ทั้งปี" names that year', () => {
    vi.setSystemTime(new Date(2027, 0, 5, 12)); // 5 Jan 2027 is still in the cycle named December 2026
    render({ filterPeriod: 'cycle:2026-12', allowCycle: true, groupedOptions: { yearsMap: { '2026': yr(['2026-12']), '2027': yr(['2027-01']) }, sortedYears: ['2027', '2026'] } });
    open();
    expect(quickBtns().map(b => b.textContent)).toEqual(['รอบนี้', 'รอบก่อน', 'ทั้งปี 2026']);
    click(quickBtns()[2]);
    expect(setPeriod).toHaveBeenLastCalledWith('cycle:2026-01_2026-12');
  });
});
