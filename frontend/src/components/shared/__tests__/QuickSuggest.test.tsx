// @vitest-environment jsdom
import type { Mock } from 'vitest';
type AnyMock = Mock<(...args: any[]) => any>;
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import QuickSuggest, { QuickSuggestProps } from '../QuickSuggest';
import { click, type, choose, q, byText } from '@/test-utils/dom';
import type { Category, CashflowGroup, FrequentItem } from '@/types';

let root: Root;
let host: HTMLDivElement;
let onApply: AnyMock;

const cat = (id: string, name: string, type: Category['type'], group: string, color = '#3B82F6'): Category =>
  ({ id, name, type, cashflowGroup: group, color, icon: 'tag' });
const CATS: Category[] = [
  cat('c-food', 'ค่ากิน', 'expense', 'g-var', '#FF8800'),
  cat('c-trip', 'เดินทาง', 'expense', 'g-var', '#0088FF'),
  cat('c-rent', 'ค่าเช่า', 'expense', 'g-fix', '#AA00FF'),
  cat('c-sal', 'เงินเดือน', 'income', 'g-inc'),
  cat('c-fund', 'กองทุน', 'savings', 'g-sav'),
];
const group = (id: string, name: string, type: CashflowGroup['type'], order: number): CashflowGroup =>
  ({ id, name, type, allocation_type: null, order_index: order, icon: 'folder', color: '#888888' });
const GROUPS: CashflowGroup[] = [
  group('g-var', 'ผันแปร', 'expense', 2),
  group('g-fix', 'ประจำ', 'expense', 1),
  group('g-inc', 'รายได้', 'income', 1),
  group('g-sav', 'ออมเงิน', 'savings', 1),
];
const item = (categoryId: string, categoryName: string, description: string, amount: number, count: number, lastDate: string, allocation_type: FrequentItem['allocation_type'] = null): FrequentItem =>
  ({ categoryId, categoryName, description, amount, count, lastDate, allocation_type });
const ITEMS: FrequentItem[] = [
  item('c-food', 'ค่ากิน', 'ข้าวมันไก่', 60, 10, '2026-10-05', 'need'),
  item('c-food', 'ค่ากิน', 'กาแฟ', 80, 6, '2026-10-07', 'want'),
  item('c-rent', 'ค่าเช่า', 'ค่าห้อง', 6000, 3, '2026-10-01', 'need'),
  item('c-trip', 'เดินทาง', 'BTS', 45, 10, '2026-10-06', 'need'),
  item('c-food', 'ค่ากิน', 'ชาบู', 650, 2, '2026-09-20', 'want'),
  item('c-food', 'ค่ากิน', 'บุฟเฟ่ต์', 2500, 1, '2026-09-01', 'want'),
  item('c-sal', 'เงินเดือน', 'เงินเดือนบริษัท', 50000, 4, '2026-09-25'),
  item('c-fund', 'กองทุน', 'กองทุน SSF', 3000, 2, '2026-09-26', 'savings'),
];
// frequent order for expenses: BTS (10, newer) · ข้าวมันไก่ (10) · กาแฟ (6) · ค่าห้อง (3) · ชาบู (2) · บุฟเฟ่ต์ (1)
const EXPENSE_BY_FREQUENCY = ['BTS', 'ข้าวมันไก่', 'กาแฟ', 'ค่าห้อง', 'ชาบู', 'บุฟเฟ่ต์'];

// Both real callers pass stable arrays / maps; fresh ones on every render (the component's defaults) would hide a stale memo dependency.
const NO_MAP = {};
const NO_TRANSACTIONS: never[] = [];
const base = (): QuickSuggestProps => ({ transactions: NO_TRANSACTIONS, categories: CATS, catMap: NO_MAP, cashflowGroups: GROUPS, formType: 'expense', frequentItems: ITEMS, onApplySuggestion: onApply });
const render = (p: Partial<QuickSuggestProps> = {}) => act(() => root.render(<QuickSuggest {...base()} {...p} />));

beforeEach(() => {
  onApply = vi.fn();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
});

const rows = () => [...document.querySelectorAll<HTMLButtonElement>('button.sugg-item')];
const names = () => rows().map(r => r.querySelector('.items-start > span')!.textContent);
const searchBox = () => q<HTMLInputElement>('input[placeholder="ค้นหาที่เคยบันทึก..."]')!;
const filterBtn = () => q<HTMLButtonElement>('button[title="ตัวกรองเพิ่มเติม"]')!;
const overlay = () => [...document.querySelectorAll<HTMLElement>('div.absolute')].find(d => d.textContent?.includes('ตัวกรองคำแนะนำ')) ?? null;
const openPanel = () => click(filterBtn());
const inPanel = (text: string) => [...overlay()!.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.trim() === text)!;
const inPanelStarting = (text: string) => [...overlay()!.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.trim().startsWith(text))!;
const badge = () => filterBtn().querySelector('.bg-accent')?.textContent ?? null;
const header = () => q('h4')!.textContent!.trim();
const summaryChips = () => [...document.querySelectorAll('.pt-0\\.5 > span')].map(s => s.textContent);
const selects = () => [...overlay()!.querySelectorAll<HTMLSelectElement>('select')];
const showMore = () => click(byText('button', 'ตัวเลือกเพิ่มเติม (ช่วงราคา, การเรียง, จำนวน)'));
/** the folded section remembers whether it was opened, even across closing the panel */
const ensureMore = () => { if (selects().length === 0) showMore(); };
const limitButtons = () => [...[...overlay()!.querySelectorAll('.grid-cols-4')].pop()!.querySelectorAll('button')];

describe('QuickSuggest — the list', () => {

  it('income and savings show their own items only', () => {
    render({ formType: 'income' });
    expect(names()).toEqual(['เงินเดือนบริษัท']);
    render({ formType: 'savings' });
    expect(names()).toEqual(['กองทุน SSF']);
  });

  it('the amount is signed by the form type: −฿ expense, +฿ income, ฿ savings', () => {
    const amountOf = () => rows()[0].querySelector('.tabular-nums')!.textContent;
    render({ formType: 'expense' });
    expect(amountOf()).toBe('−฿45.00');
    render({ formType: 'income' });
    expect(amountOf()).toBe('+฿50,000.00');
    render({ formType: 'savings' });
    expect(amountOf()).toBe('฿3,000.00');
  });

  it('a click applies that suggestion', () => {
    render();
    click(rows()[2]);
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(ITEMS[1]);
  });

  it('while processing the rows are disabled', () => {
    render({ isProcessing: true });
    expect(rows().every(r => r.disabled)).toBe(true);
    click(rows()[0]);
    expect(onApply).not.toHaveBeenCalled();
    render({ isProcessing: false });
    expect(rows().some(r => r.disabled)).toBe(false);
  });

  it('expense rows carry an allocation bar titled NEED / WANT; other types do not', () => {
    render();
    const bars = (r: Element) => [...r.querySelectorAll('div[title]')].map(d => d.getAttribute('title'));
    expect(bars(rows()[0])).toEqual(['NEED']);
    expect(bars(rows()[2])).toEqual(['WANT']);
    render({ formType: 'savings' });
    expect(bars(rows()[0])).toEqual([]);
  });

  it('an expense row without an allocation has no bar', () => {
    render({ frequentItems: [item('c-food', 'ค่ากิน', 'ไม่รู้', 10, 1, '2026-10-01', null)] });
    expect(rows()[0].querySelectorAll('div[title]')).toHaveLength(0);
  });

});

describe('QuickSuggest — search', () => {
  it('matches the description, the category name or the amount, ignoring case', () => {
    render();
    type(searchBox(), 'บีทีเอส');
    expect(names()).toEqual([]);
    type(searchBox(), 'bts');
    expect(names()).toEqual(['BTS']);
    type(searchBox(), 'เช่า'); // category name of ค่าห้อง
    expect(names()).toEqual(['ค่าห้อง']);
    type(searchBox(), '6000'); // amount
    expect(names()).toEqual(['ค่าห้อง']);
    type(searchBox(), 'กาแฟ');
    expect(names()).toEqual(['กาแฟ']);
  });

});

describe('QuickSuggest — the filter panel', () => {

  it('listens for outside clicks only while open, and stops afterwards', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const rem = vi.spyOn(document, 'removeEventListener');
    render();
    expect(add.mock.calls.filter(c => c[0] === 'mousedown')).toHaveLength(0);
    openPanel();
    openPanel();
    const added = add.mock.calls.filter(c => c[0] === 'mousedown').map(c => c[1]);
    const removed = rem.mock.calls.filter(c => c[0] === 'mousedown').map(c => c[1]);
    add.mockRestore(); rem.mockRestore();
    expect(added).toHaveLength(1);
    expect(removed).toEqual(added);
  });

  it('income lists income groups; the allocation block is for expenses only', () => {
    render({ formType: 'income' });
    openPanel();
    expect(inPanel('รายได้')).toBeTruthy();
    expect(overlay()!.textContent).not.toContain('ประเภทการจัดสรร');
    render({ formType: 'expense' }); // a new form type starts the panel over, closed
    openPanel();
    expect(overlay()!.textContent).toContain('ประเภทการจัดสรร');
  });
});

describe('QuickSuggest — groups and categories', () => {

  it('"เลือกทั้งหมดในกลุ่ม" twice does not duplicate', () => {
    render();
    openPanel();
    click(inPanel('ผันแปร'));
    click(inPanel('เลือกทั้งหมดในกลุ่ม'));
    click(inPanel('เลือกทั้งหมดในกลุ่ม'));
    expect(badge()).toBe('2');
  });

  // a derived group takes its name from a group object, found on the category map or on the category itself

});

describe('QuickSuggest — allocation, amount, sort, limit', () => {
  it('the allocation buttons filter expenses and show as a removable chip', () => {
    render();
    openPanel();
    click(inPanel('NEED'));
    expect(names()).toEqual(['BTS', 'ข้าวมันไก่', 'ค่าห้อง']);
    expect(badge()).toBe('1');
    openPanel();
    expect(summaryChips()).toEqual(['need']); // shown upper-case by CSS
    click(q('.pt-0\\.5 > span button'));
    expect(names()).toEqual(EXPENSE_BY_FREQUENCY);
  });

  it('WANT works too, "ทั้งหมด" clears, and SAVE is not offered (SAVE means investing, not an expense)', () => {
    render();
    openPanel();
    expect(inPanel('SAVE')).toBeFalsy();
    click(inPanel('WANT'));
    expect(names()).toEqual(['กาแฟ', 'ชาบู', 'บุฟเฟ่ต์']);
    click(inPanel('ทั้งหมด'));
    expect(names()).toEqual(EXPENSE_BY_FREQUENCY);
  });

  it('amount range, sort and limit are folded away until asked for', () => {
    render();
    openPanel();
    expect(selects()).toHaveLength(0);
    showMore();
    expect(selects()).toHaveLength(2);
    showMore();
    expect(selects()).toHaveLength(0);
  });

  it('amount ranges include their edges correctly', () => {
    const amounts = [99.99, 100, 500, 500.01, 2000, 2000.01].map((a, i) => item('c-food', 'ค่ากิน', `a${a}`, a, 1, `2026-10-0${i + 1}`));
    render({ frequentItems: amounts });
    openPanel();
    showMore();
    const amount = () => selects()[0];
    choose(amount(), 'under100');
    expect(names().sort()).toEqual(['a99.99']);
    choose(amount(), '100to500');
    expect(names().sort()).toEqual(['a100', 'a500']);
    choose(amount(), '500to2000');
    expect(names().sort()).toEqual(['a2000', 'a500.01']);
    choose(amount(), 'over2000');
    expect(names().sort()).toEqual(['a2000.01']);
    choose(amount(), 'ALL');
    expect(names()).toHaveLength(6);
  });

  it('the amount filter shows as a chip', () => {
    render();
    openPanel();
    showMore();
    choose(selects()[0], 'over2000');
    openPanel();
    expect(summaryChips()).toEqual(['ช่วงราคา']);
    click(q('.pt-0\\.5 > span button'));
    expect(names()).toEqual(EXPENSE_BY_FREQUENCY);
  });
});

describe('QuickSuggest — badge and reset', () => {
  it('counts each active filter once: categories, allocation, amount, sort, limit', () => {
    render();
    openPanel();
    click(inPanel('ผันแปร'));
    click(inPanel('เลือกทั้งหมดในกลุ่ม'));
    expect(badge()).toBe('2');
    click(inPanel('WANT'));
    expect(badge()).toBe('3');
    showMore();
    choose(selects()[0], 'under100');
    expect(badge()).toBe('4');
    choose(selects()[1], 'recent');
    expect(badge()).toBe('5');
    click(limitButtons()[1]);
    expect(badge()).toBe('6');
    expect(overlay()!.textContent).toContain('6 ตัวกรอง');
  });

  it('the allocation filter does not count for income or savings', () => {
    render();
    openPanel();
    click(inPanel('WANT'));
    expect(badge()).toBe('1');
    render({ formType: 'income' });
    expect(badge()).toBeNull();
  });

});

describe('QuickSuggest — category filter owned by the parent', () => {
  // a parent that stores the filter: a real state, so the value goes round
  const Controlled = () => {
    const [v, setV] = useState<string | string[] | undefined>([]);
    return <><QuickSuggest {...base()} suggCatFilter={v} setSuggCatFilter={setV} /><output data-v>{JSON.stringify(v)}</output></>;
  };
  const parentValue = () => JSON.parse(q('[data-v]')!.textContent!);

  it('hands the parent an updater that copes with whatever form the stored filter has (string, ALL, nothing)', () => {
    const setter = vi.fn();
    render({ suggCatFilter: 'c-trip', setSuggCatFilter: setter });
    setter.mockClear(); // the mount-time reset
    openPanel();
    click(inPanelStarting('ผันแปร')); // its chip carries the count of picked categories
    click(overlay()!.querySelectorAll<HTMLButtonElement>('.max-h-24 button')[0]); // add ค่ากิน
    const updater = setter.mock.calls.at(-1)![0] as (prev: unknown) => unknown;
    expect(updater('c-trip')).toEqual(['c-trip', 'c-food']);
    expect(updater(['c-trip'])).toEqual(['c-trip', 'c-food']);
    expect(updater('ALL')).toEqual(['c-food']);
    expect(updater(undefined)).toEqual(['c-food']);
    expect(updater('')).toEqual(['c-food']);
  });

  it('starts the parent\'s filter over when it mounts and whenever the form type changes', () => {
    const setter = vi.fn();
    render({ suggCatFilter: ['c-trip'], setSuggCatFilter: setter });
    const reset = () => (setter.mock.calls.at(-1)![0] as (p: unknown) => unknown)(['c-trip']);
    expect(reset()).toEqual([]);
    setter.mockClear();
    render({ suggCatFilter: ['c-trip'], setSuggCatFilter: setter, formType: 'income' });
    expect(setter).toHaveBeenCalled();
    expect(reset()).toEqual([]);
  });

  it('toggling and "ยกเลิกในกลุ่ม" cope with ids that are numbers on one side and text on the other', () => {
    const setter = vi.fn();
    render({ suggCatFilter: [7 as unknown as string], setSuggCatFilter: setter, categories: [{ ...CATS[0], id: '7' }, CATS[1]], frequentItems: [] });
    openPanel();
    click(inPanelStarting('ผันแปร'));
    const chips = overlay()!.querySelectorAll<HTMLButtonElement>('.max-h-24 button');
    click(chips[0]); // category "7"
    const toggle = setter.mock.calls.at(-1)![0] as (prev: unknown[]) => unknown[];
    expect(toggle([7])).toEqual([]); // 7 and '7' are the same category: removed
    expect(toggle(['c-trip'])).toEqual(['c-trip', '7']);
    click(inPanel('ยกเลิกในกลุ่ม'));
    const cancel = setter.mock.calls.at(-1)![0] as (prev: unknown[]) => unknown[];
    expect(cancel([7, 'other'])).toEqual(['other']);
  });

});

describe('QuickSuggest — filters that must start over, and the fine print', () => {
  const setEverything = () => {
    type(searchBox(), 'ก');
    openPanel();
    click(inPanel('ผันแปร'));
    click(inPanel('เลือกทั้งหมดในกลุ่ม'));
    click(inPanel('WANT'));
    ensureMore();
    choose(selects()[0], 'under100');
    choose(selects()[1], 'recent');
    click(limitButtons()[1]);
  };
  const expectClean = () => {
    expect(names()).toEqual(EXPENSE_BY_FREQUENCY);
    expect(badge()).toBeNull();
    expect(searchBox().value).toBe('');
  };

  it('an amount range, a sort or a limit that is on keeps the folded section open', () => {
    render();
    openPanel();
    showMore();
    choose(selects()[0], 'over2000');
    showMore();
    expect(selects()).toHaveLength(2);
    choose(selects()[0], 'ALL'); // nothing keeps it open any more, and it was folded by hand
    expect(selects()).toHaveLength(0);
    showMore();
    choose(selects()[1], 'recent');
    showMore();
    expect(selects()).toHaveLength(2);
    choose(selects()[1], 'frequent');
    expect(selects()).toHaveLength(0);
    showMore();
    click(limitButtons()[1]);
    showMore();
    expect(selects()).toHaveLength(2);
  });

});

describe('QuickSuggest — the list re-enters when a filter changes', () => {
  const list = () => q('.m-stagger')!;

  it('applying a suggestion leaves the list alone (no mark, no re-mount)', () => {
    render();
    const before = list();
    click(rows()[0]);
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(list()).toBe(before);
    expect(rows()[0].getAttribute('aria-pressed')).toBeNull();
  });
});