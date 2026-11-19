// @vitest-environment jsdom
import type { Mock } from 'vitest';
type AnyMock = Mock<(...args: any[]) => any>;
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
const EARLY_JAN = new Date(2027, 0, 5, 12); // still inside the cycle named December 2026

const yr = (months: string[], quarters: string[] = [], halves: string[] = []) => ({
  months: new Set(months), quarters: new Set(quarters), halves: new Set(halves),
});
/** months only, years sorted newest first */
const opts = (map: Record<string, string[]>): GroupedOptions => ({
  yearsMap: Object.fromEntries(Object.entries(map).map(([y, ms]) => [y, yr(ms)])),
  sortedYears: Object.keys(map).sort().reverse(),
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
const CYC = 'cycle:2026-09';

let root: Root;
let host: HTMLDivElement;
let setPeriod: AnyMock;

const render = (p: Partial<PeriodPickerProps> = {}) => {
  const props: PeriodPickerProps = { filterPeriod: '2026-10', setFilterPeriod: setPeriod, groupedOptions: OPTS, ...p };
  act(() => root.render(<PeriodPicker {...props} />));
};
/** render with the cycle switch allowed whenever the period is a cycle one, then open */
const openAt = (filterPeriod: string, p: Partial<PeriodPickerProps> = {}) => {
  render({ filterPeriod, allowCycle: filterPeriod.startsWith('cycle:'), ...p });
  open();
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
const dlgBtn = (text: string) => byText('[role="dialog"] button', text) as HTMLButtonElement | null;
const tab = (text: string) => dlgBtn(text)!;
const text = () => dialog()!.textContent;
const yearBtns = () => [...document.querySelectorAll<HTMLButtonElement>('button[aria-expanded]')].filter(b => b !== trigger());
const yearBtn = (y: string) => yearBtns().find(b => b.textContent?.includes(y))!;
const isExpanded = (y: string) => yearBtn(y).getAttribute('aria-expanded') === 'true';
const yearsWithDot = () => yearBtns().filter(b => b.querySelector('.rounded-full')).map(b => b.textContent!.slice(0, 4));
const has = (el: Element, cls: string) => el.classList.contains(cls);
const pressed = (el: Element) => el.getAttribute('aria-pressed');
/** month pill of one year (the year must be expanded); cycle pills carry the 25–24 span after the month name */
const pill = (ym: string) => {
  const [y, m] = ym.split('-');
  const name = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][Number(m) - 1];
  return [...yearBtn(y).parentElement!.querySelectorAll<HTMLButtonElement>('.grid-cols-3 > button')].find(b => b.textContent!.startsWith(name))!;
};
const pillTexts = (y: string) => [...yearBtn(y).parentElement!.querySelectorAll('.grid-cols-3 > button')].map(b => b.textContent);
const halfPills = (y: string) => [...yearBtn(y).parentElement!.querySelectorAll<HTMLElement>('.grid-cols-2 > *')];
const quarterPills = (y: string) => [...yearBtn(y).parentElement!.querySelectorAll<HTMLElement>('.grid-cols-4 > *')];
const wholeYear = (y: string) => [...yearBtn(y).parentElement!.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent!.startsWith(`ทั้งปี ${y}`))!;
const quickBtns = () => [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] .flex-1.text-center')];
const quickTexts = () => quickBtns().map(b => b.textContent);
const allBtn = () => dlgBtn('ดูข้อมูลทั้งหมด')!;
const chips = () => [...document.querySelectorAll('[role="dialog"] span.rounded-pill')].map(c => c.textContent);
const label = () => trigger().textContent;
const spanOf = (from: string, to?: string) => cycleSpanLabel(from, to);

describe('PeriodPicker — trigger', () => {

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

});

describe('PeriodPicker — closing', () => {

  // The Export modal closes itself on an Esc that reaches window. Closing the dropdown must swallow the key,
  // otherwise one press closes the dropdown AND the whole modal (and the user loses the export settings).
  // An Esc on a closed picker must still pass through, so the surrounding modal can close.

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
});

describe('PeriodPicker — เดี่ยว (single) mode', () => {

  it('quick row: this month, last month, whole year → the values the period uses', () => {
    openAt('2026-03');
    expect(quickTexts()).toEqual(['เดือนนี้', 'เดือนก่อน', 'ทั้งปี 2026']);
    click(quickBtns()[0]);
    click(trigger());
    click(quickBtns()[1]);
    click(trigger());
    click(quickBtns()[2]);
    expect(setPeriod.mock.calls).toEqual([['2026-10'], ['2026-09'], ['2026']]);
  });

  // [case, today, data, quick buttons offered, what "เดือนก่อน" selects]

  // [mode, whether the year that was open stays open when another one is expanded]

  it('half and quarter pills: only those with data, the rest leave an empty slot; none for a year without them', () => {
    openAt('2026-10');
    expect(halfPills('2026').map(e => e.textContent)).toEqual(['H1', '']);
    expect(halfPills('2026').map(e => e.tagName)).toEqual(['BUTTON', 'SPAN']);
    expect(quarterPills('2026').map(e => e.textContent)).toEqual(['Q1', '', 'Q3', 'Q4']);
    click(halfPills('2026')[0]); // picking closes the dropdown: reopen to reach the quarter row
    click(trigger());
    click(quarterPills('2026')[2]);
    expect(setPeriod.mock.calls).toEqual([['2026-H1'], ['2026-Q3']]);

    click(trigger());
    click(yearBtn('2025'));
    expect(halfPills('2025')).toHaveLength(0);
    expect(quarterPills('2025')).toHaveLength(0);
  });

});

describe('PeriodPicker — pay-cycle mode (25–24)', () => {
  // cycle keys come from the months that have data: month M gives cycle M (from the 25th) and cycle M-1 (days 1–24)
  //   2026: 02 03 06 07 08 09 10 (7 cycles)   2025: 10 11 12 (3 cycles)
  const stem = (t: string | null) => t!.split(/\d/)[0];
  const yearCount = () => yearBtns().map(b => b.textContent);

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

  it('quick row: this cycle / last cycle / whole cycle-year, each with its dates as the tooltip', () => {
    openAt(CYC);
    const [now, prev, year] = quickBtns();
    expect(quickTexts()).toEqual(['รอบนี้', 'รอบก่อน', 'ทั้งปี 2026']);
    expect(now.title).toBe('25 ก.ย. 26 – 24 ต.ค. 26 · 30 วัน');
    expect(prev.title).toBe(spanOf('2026-08'));
    expect(year.title).toBe('25 ม.ค. 26 – 24 ม.ค. 27 · 365 วัน');
    click(now); click(trigger()); click(quickBtns()[1]); click(trigger()); click(quickBtns()[2]);
    click(trigger()); click(allBtn());
    expect(setPeriod.mock.calls).toEqual([['cycle:2026-09'], ['cycle:2026-08'], ['cycle:2026-01_2026-12'], ['cycle:ALL']]);
  });

});
