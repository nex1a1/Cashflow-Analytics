// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import QuickSuggest, { QuickSuggestProps } from '../QuickSuggest';
import { click, type, choose, q, byText } from '@/test-utils/dom';
import type { Category, CashflowGroup, FrequentItem } from '@/types';

let root: Root;
let host: HTMLDivElement;
let onApply: ReturnType<typeof vi.fn>;

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
  it('shows the suggestions of the form type, most frequent first (ties: most recent)', () => {
    render();
    expect(names()).toEqual(EXPENSE_BY_FREQUENCY);
    expect(header()).toBe('รายการแนะนำ (6)');
  });

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

  it('shows how many times it was used', () => {
    render();
    expect(rows()[0].textContent).toContain('10x');
    expect(rows()[2].textContent).toContain('6x');
  });

  it('a row shows its category, and the group name when the category knows its group', () => {
    const catMap = { 'c-food': { ...CATS[0], _group: { id: 'g-var', name: 'ผันแปร' } } };
    render({ catMap });
    const food = rows().find(r => r.textContent!.includes('ข้าวมันไก่'))!;
    expect(food.textContent).toContain('ผันแปร');
    expect(food.textContent).toContain('›');
    expect(food.textContent).toContain('ค่ากิน');
    const trip = rows().find(r => r.textContent!.includes('BTS'))!;
    expect(trip.textContent).not.toContain('›');
  });

  it('an item with no description falls back to the category name, then to "อื่นๆ"', () => {
    render({ frequentItems: [item('c-food', 'ค่ากิน', '', 50, 1, '2026-10-01'), item('c-trip', '', '', 20, 1, '2026-10-02')], categories: [CATS[0], { ...CATS[1], name: '' }] });
    expect(names().sort()).toEqual(['ค่ากิน', 'อื่นๆ'].sort());
  });

  it('items of an unknown category are not suggested; the category may also be found by name', () => {
    render({ frequentItems: [item('ghost', 'ผี', 'ลึกลับ', 10, 1, '2026-10-01'), item('old-id', 'ค่ากิน', 'หาจากชื่อ', 10, 1, '2026-10-01')] });
    expect(names()).toEqual(['หาจากชื่อ']);
  });

  it('with nothing to suggest it says so, and the header has no count', () => {
    render({ frequentItems: [] });
    expect(q('p.text-center')!.textContent!.trim()).toBe('ไม่พบคำแนะนำที่ตรงกับตัวกรอง');
    expect(header()).toBe('รายการแนะนำ');
  });

  it('works with no props at all but the required ones', () => {
    act(() => root.render(<QuickSuggest formType="expense" onApplySuggestion={onApply} />));
    expect(rows()).toHaveLength(0);
    expect(header()).toBe('รายการแนะนำ');
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

  it('puts a custom class on the wrapper and the slot right under the header', () => {
    render({ className: 'my-wrap', headerSlot: <div data-slot="x">รายการประจำ</div> });
    expect(host.firstElementChild!.classList.contains('my-wrap')).toBe(true);
    const slot = q('[data-slot="x"]')!;
    expect(slot.previousElementSibling!.tagName).toBe('H4');
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

  it('blank search does not filter', () => {
    render();
    type(searchBox(), '   ');
    expect(names()).toEqual(EXPENSE_BY_FREQUENCY);
  });

  it('a ✕ replaces the magnifier while there is text, and clears it', () => {
    render();
    const box = () => searchBox().parentElement!;
    expect(box().querySelector('svg.lucide-search')).not.toBeNull();
    expect(box().querySelector('button')).toBeNull();
    type(searchBox(), 'bts');
    expect(box().querySelector('svg.lucide-search')).toBeNull();
    click(box().querySelector('button'));
    expect(searchBox().value).toBe('');
    expect(names()).toEqual(EXPENSE_BY_FREQUENCY);
  });

  it('searching counts as no filter in the badge', () => {
    render();
    type(searchBox(), 'bts');
    expect(badge()).toBeNull();
  });
});

describe('QuickSuggest — the filter panel', () => {
  it('is closed at first, opens from the button and closes from ✕ or the green button', () => {
    render();
    expect(overlay()).toBeNull();
    openPanel();
    expect(overlay()).not.toBeNull();
    click(overlay()!.querySelector('button[title="ปิดหน้าต่างตัวกรอง"]'));
    expect(overlay()).toBeNull();
    openPanel();
    click(inPanelStarting('แสดงผลลัพธ์'));
    expect(overlay()).toBeNull();
  });

  it('the filter button toggles it', () => {
    render();
    openPanel();
    openPanel();
    expect(overlay()).toBeNull();
  });

  it('the result button shows how many items match', () => {
    render();
    openPanel();
    expect(inPanelStarting('แสดงผลลัพธ์').textContent).toBe('แสดงผลลัพธ์ (6 รายการ)');
  });

  it('a mousedown outside closes it; on the panel or the filter button it does not', () => {
    render();
    openPanel();
    act(() => { overlay()!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    act(() => { filterBtn().dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(overlay()).not.toBeNull();
    act(() => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(overlay()).toBeNull();
  });

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

  it('lists the groups of the form type by order (not by id), and nothing else', () => {
    render();
    openPanel();
    const chips = [...overlay()!.querySelectorAll('.rounded-pill.cursor-pointer')].map(b => b.textContent!.trim());
    expect(chips.slice(0, 2)).toEqual(['ประจำ', 'ผันแปร']);
    expect(chips).not.toContain('รายได้');
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
  it('a group chip filters to that group, a second click clears it', () => {
    render();
    openPanel();
    click(inPanel('ผันแปร'));
    expect(names()).toEqual(['BTS', 'ข้าวมันไก่', 'กาแฟ', 'ชาบู', 'บุฟเฟ่ต์']);
    expect(badge()).toBe('1');
    click(inPanel('ผันแปร'));
    expect(names()).toEqual(EXPENSE_BY_FREQUENCY);
    expect(badge()).toBeNull();
  });

  it('opening a group lists its categories; picking some filters to them and counts each', () => {
    render();
    openPanel();
    click(inPanel('ผันแปร'));
    const chipsOf = () => [...overlay()!.querySelectorAll<HTMLButtonElement>('.max-h-24 button')];
    expect(chipsOf().map(c => c.textContent!.trim())).toEqual(['ค่ากิน', 'เดินทาง']);
    click(chipsOf()[1]);
    expect(names()).toEqual(['BTS']);
    expect(badge()).toBe('1'); // categories count instead of the group
    click(chipsOf()[0]);
    expect(names()).toEqual(['BTS', 'ข้าวมันไก่', 'กาแฟ', 'ชาบู', 'บุฟเฟ่ต์']);
    expect(badge()).toBe('2');
    // the group chip shows how many of its categories are picked
    expect(inPanelStarting('ผันแปร').textContent).toBe('ผันแปร2');
    // clicking a picked category again drops it
    click(chipsOf()[1]);
    expect(names()).toEqual(['ข้าวมันไก่', 'กาแฟ', 'ชาบู', 'บุฟเฟ่ต์']);
  });

  it('categories from other groups can be mixed in', () => {
    render();
    openPanel();
    click(inPanel('ผันแปร'));
    click(overlay()!.querySelector<HTMLButtonElement>('.max-h-24 button')!);
    click(inPanel('ประจำ'));
    click(overlay()!.querySelector<HTMLButtonElement>('.max-h-24 button')!);
    expect(names()).toEqual(['ข้าวมันไก่', 'กาแฟ', 'ค่าห้อง', 'ชาบู', 'บุฟเฟ่ต์']);
    expect(badge()).toBe('2');
  });

  it('"เลือกทั้งหมดในกลุ่ม" picks every category of the open group, "ยกเลิกในกลุ่ม" drops only those', () => {
    render();
    openPanel();
    click(inPanel('ประจำ'));
    click(overlay()!.querySelector<HTMLButtonElement>('.max-h-24 button')!);
    click(inPanel('ผันแปร'));
    click(inPanel('เลือกทั้งหมดในกลุ่ม'));
    expect(names()).toEqual(['BTS', 'ข้าวมันไก่', 'กาแฟ', 'ค่าห้อง', 'ชาบู', 'บุฟเฟ่ต์']);
    expect(badge()).toBe('3');
    click(inPanel('ยกเลิกในกลุ่ม'));
    expect(names()).toEqual(['ค่าห้อง']);
    expect(badge()).toBe('1');
  });

  it('"เลือกทั้งหมดในกลุ่ม" twice does not duplicate', () => {
    render();
    openPanel();
    click(inPanel('ผันแปร'));
    click(inPanel('เลือกทั้งหมดในกลุ่ม'));
    click(inPanel('เลือกทั้งหมดในกลุ่ม'));
    expect(badge()).toBe('2');
  });

  it('shows the open group name and a "ล้างหมวด (n)" button that clears group and categories', () => {
    render();
    openPanel();
    expect(overlay()!.textContent).not.toContain('ล้างหมวด');
    click(inPanel('ผันแปร'));
    expect(overlay()!.querySelector('strong')!.textContent).toBe('ผันแปร');
    expect(inPanelStarting('ล้างหมวด').textContent!.trim()).toBe('ล้างหมวด');
    click(inPanel('เลือกทั้งหมดในกลุ่ม'));
    expect(inPanelStarting('ล้างหมวด').textContent!.trim()).toBe('ล้างหมวด (2)');
    click(inPanelStarting('ล้างหมวด'));
    expect(names()).toEqual(EXPENSE_BY_FREQUENCY);
    expect(badge()).toBeNull();
    expect(overlay()!.querySelector('.max-h-24')).toBeNull();
  });

  it('with the panel closed, the picked categories show as chips that can be removed one by one', () => {
    render();
    openPanel();
    click(inPanel('ผันแปร'));
    click(inPanel('เลือกทั้งหมดในกลุ่ม'));
    openPanel();
    expect(summaryChips().slice(0, 2)).toEqual(['ค่ากิน', 'เดินทาง']);
    click(q('button[title="ลบหมวด เดินทาง"]'));
    expect(names()).toEqual(['ข้าวมันไก่', 'กาแฟ', 'ชาบู', 'บุฟเฟ่ต์']);
    expect(summaryChips()).toEqual(['ค่ากิน']);
  });

  it('with only a group picked, the chip names the group and ✕ removes it', () => {
    render();
    openPanel();
    click(inPanel('ผันแปร'));
    openPanel();
    expect(summaryChips()).toEqual(['กลุ่ม: ผันแปร']);
    click(q('button[title="ลบตัวกรองกลุ่ม"]'));
    expect(names()).toEqual(EXPENSE_BY_FREQUENCY);
    expect(q('.pt-0\\.5')).toBeNull();
  });

  it('once a category is picked, the group chip gives way to the category chips', () => {
    render();
    openPanel();
    click(inPanel('ผันแปร'));
    click(overlay()!.querySelector<HTMLButtonElement>('.max-h-24 button')!);
    openPanel();
    expect(summaryChips()).toEqual(['ค่ากิน']);
  });

  it('a category picked outside the loaded list still gets a chip (by id)', () => {
    render({ suggCatFilter: ['ghost'], setSuggCatFilter: () => {} });
    expect(summaryChips()).toEqual(['ghost']);
  });

  it('with no groups configured, groups are derived from the categories', () => {
    render({ cashflowGroups: [] });
    openPanel();
    const chips = [...overlay()!.querySelectorAll('.rounded-pill.cursor-pointer')].map(b => b.textContent!.trim());
    expect(chips.sort()).toEqual(['g-fix', 'g-var'].sort());
  });

  it('...or from the category map when categories carry their group object', () => {
    const catMap = { 'c-food': { ...CATS[0], cashflowGroup: undefined, _group: { id: 'g-var', name: 'ผันแปร' } } };
    render({ cashflowGroups: [], categories: [{ ...CATS[0], cashflowGroup: null }], catMap });
    openPanel();
    expect(inPanel('ผันแปร')).toBeTruthy();
  });

  it('groups of another type are not used even if the list has no groups for this one', () => {
    render({ cashflowGroups: [GROUPS[2]], categories: CATS });
    openPanel();
    const chips = [...overlay()!.querySelectorAll('.rounded-pill.cursor-pointer')].map(b => b.textContent!.trim());
    expect(chips).not.toContain('รายได้');
    expect(chips.sort()).toEqual(['g-fix', 'g-var'].sort());
  });
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

  it('expenses filter by NEED / WANT only: SAVE means investing, so it is not offered', () => {
    render();
    openPanel();
    expect(inPanel('SAVE')).toBeFalsy();
  });

  it('WANT works too, and "ทั้งหมด" clears', () => {
    render();
    openPanel();
    click(inPanel('WANT'));
    expect(names()).toEqual(['กาแฟ', 'ชาบู', 'บุฟเฟ่ต์']);
    click(inPanel('ทั้งหมด'));
    expect(names()).toEqual(EXPENSE_BY_FREQUENCY);
  });

  it('the active allocation button is lit', () => {
    render();
    openPanel();
    expect(inPanel('ทั้งหมด').classList.contains('border-slate-500')).toBe(true);
    click(inPanel('WANT'));
    expect(inPanel('WANT').classList.contains('border-amber-500/60')).toBe(true);
    expect(inPanel('ทั้งหมด').classList.contains('border-slate-500')).toBe(false);
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

  it('sorts by recency, price either way and alphabet', () => {
    render();
    openPanel();
    showMore();
    const sort = () => selects()[1];
    choose(sort(), 'recent');
    expect(names()).toEqual(['กาแฟ', 'BTS', 'ข้าวมันไก่', 'ค่าห้อง', 'ชาบู', 'บุฟเฟ่ต์']);
    choose(sort(), 'amountDesc');
    expect(names()).toEqual(['ค่าห้อง', 'บุฟเฟ่ต์', 'ชาบู', 'กาแฟ', 'ข้าวมันไก่', 'BTS']);
    choose(sort(), 'amountAsc');
    expect(names()).toEqual(['BTS', 'ข้าวมันไก่', 'กาแฟ', 'ชาบู', 'บุฟเฟ่ต์', 'ค่าห้อง']);
    choose(sort(), 'alphabetical');
    expect(names()).toEqual([...EXPENSE_BY_FREQUENCY].sort((a, b) => a.localeCompare(b)));
    choose(sort(), 'frequent');
    expect(names()).toEqual(EXPENSE_BY_FREQUENCY);
  });

  it('the sort options are plain Thai text — no emoji (the project uses Lucide icons only)', () => {
    render();
    openPanel();
    showMore();
    const labels = [...selects()[1].options].map(o => o.textContent!);
    expect(labels).toHaveLength(5);
    for (const l of labels) expect(l).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(labels[0]).toBe('ยอดนิยม (ความถี่)');
  });

  it('the limit buttons are the default, 20, 30 and all; the default is not repeated', () => {
    render();
    openPanel();
    ensureMore();
    expect(limitButtons().map(b => b.textContent)).toEqual(['10 รายการ', '20 รายการ', '30 รายการ', 'ทั้งหมด']);
    render({ defaultLimit: 20 }); // a new default limit starts the panel over, closed
    openPanel();
    ensureMore();
    expect(limitButtons().map(b => b.textContent)).toEqual(['20 รายการ', '30 รายการ', 'ทั้งหมด']);
    render({ defaultLimit: 5 });
    openPanel();
    ensureMore();
    expect(limitButtons().map(b => b.textContent)).toEqual(['5 รายการ', '20 รายการ', '30 รายการ', 'ทั้งหมด']);
  });

  it('the active limit button is lit', () => {
    render();
    openPanel();
    ensureMore();
    expect(limitButtons()[0].classList.contains('border-accent-ink')).toBe(true);
    click(limitButtons()[2]);
    expect(limitButtons()[2].classList.contains('border-accent-ink')).toBe(true);
    expect(limitButtons()[0].classList.contains('border-accent-ink')).toBe(false);
  });

  it('shows only as many items as the limit; the default limit is a prop', () => {
    render({ defaultLimit: 3 });
    expect(names()).toEqual(EXPENSE_BY_FREQUENCY.slice(0, 3));
    expect(header()).toBe('รายการแนะนำ (3)');
    render({ defaultLimit: 10 });
    expect(names()).toHaveLength(6);
  });

  it('picking another limit shows more (or all), as a chip with its own ✕', () => {
    render({ defaultLimit: 2 });
    openPanel();
    ensureMore();
    click(limitButtons()[1]); // 20
    expect(names()).toHaveLength(6);
    expect(badge()).toBe('1');
    openPanel();
    expect(summaryChips()).toEqual(['แสดง 20']);
    click(q('.pt-0\\.5 > span button'));
    expect(names()).toHaveLength(2);
    openPanel();
    ensureMore();
    click(limitButtons()[3]); // all
    openPanel();
    expect(summaryChips()).toEqual(['แสดงทั้งหมด']);
  });

  it('a secondary filter that is on keeps the folded section open', () => {
    render();
    openPanel();
    showMore();
    choose(selects()[1], 'recent');
    showMore(); // would fold it...
    expect(selects()).toHaveLength(2); // ...but a sort is active
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

  it('"รีเซ็ต" (panel) and "ล้างทั้งหมด" (chip row) put everything back, including the search', () => {
    render();
    type(searchBox(), 'ก');
    openPanel();
    click(inPanel('WANT'));
    showMore();
    choose(selects()[1], 'recent');
    click(inPanelStarting('รีเซ็ต'));
    expect(names()).toEqual(EXPENSE_BY_FREQUENCY);
    expect(searchBox().value).toBe('');
    expect(badge()).toBeNull();
    expect(inPanelStarting('รีเซ็ต')).toBeUndefined(); // no reset button without filters

    click(inPanel('NEED'));
    openPanel();
    click(byText('button', 'ล้างทั้งหมด'));
    expect(names()).toEqual(EXPENSE_BY_FREQUENCY);
    expect(badge()).toBeNull();
  });

  it('changing the form type starts the filters over', () => {
    render();
    openPanel();
    click(inPanel('WANT'));
    type(searchBox(), 'ชา');
    render({ formType: 'savings' });
    expect(searchBox().value).toBe('');
    expect(overlay()).toBeNull();
    expect(names()).toEqual(['กองทุน SSF']);
    expect(badge()).toBeNull();
  });

  it('changing the default limit applies it straight away', () => {
    render({ defaultLimit: 2 });
    expect(names()).toHaveLength(2);
    render({ defaultLimit: 4 });
    expect(names()).toHaveLength(4);
  });
});

describe('QuickSuggest — category filter owned by the parent', () => {
  // a parent that stores the filter: a real state, so the value goes round
  const Controlled = () => {
    const [v, setV] = useState<string | string[] | undefined>([]);
    return <><QuickSuggest {...base()} suggCatFilter={v} setSuggCatFilter={setV} /><output data-v>{JSON.stringify(v)}</output></>;
  };
  const parentValue = () => JSON.parse(q('[data-v]')!.textContent!);

  it('reads an array', () => {
    render({ suggCatFilter: ['c-trip'], setSuggCatFilter: vi.fn() });
    expect(names()).toEqual(['BTS']);
  });

  it('reads a single id, and treats ALL or empty as nothing selected', () => {
    render({ suggCatFilter: 'c-trip', setSuggCatFilter: vi.fn() });
    expect(names()).toEqual(['BTS']);
    render({ suggCatFilter: 'ALL', setSuggCatFilter: vi.fn() });
    expect(names()).toEqual(EXPENSE_BY_FREQUENCY);
    render({ suggCatFilter: '', setSuggCatFilter: vi.fn() });
    expect(names()).toEqual(EXPENSE_BY_FREQUENCY);
  });

  it('writes picks back to the parent as an array', () => {
    act(() => root.render(<Controlled />));
    openPanel();
    click(inPanel('ผันแปร'));
    const chips = [...overlay()!.querySelectorAll<HTMLButtonElement>('.max-h-24 button')];
    click(chips[0]); // ค่ากิน
    expect(parentValue()).toEqual(['c-food']);
    click(chips[1]); // เดินทาง
    expect(parentValue()).toEqual(['c-food', 'c-trip']);
    click(chips[0]);
    expect(parentValue()).toEqual(['c-trip']);
    expect(names()).toEqual(['BTS']);
  });

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

  it('a parent that gives nothing back is still driven by its value', () => {
    render({ suggCatFilter: undefined, setSuggCatFilter: undefined });
    openPanel();
    click(inPanel('ผันแปร'));
    click(overlay()!.querySelector<HTMLButtonElement>('.max-h-24 button')!);
    expect(names()).toEqual(['ข้าวมันไก่', 'กาแฟ', 'ชาบู', 'บุฟเฟ่ต์']); // kept locally
  });

  it('mixed-type ids (number vs string) are matched by their text', () => {
    render({ suggCatFilter: [7 as unknown as string], setSuggCatFilter: () => {}, categories: [{ ...CATS[0], id: '7' }], frequentItems: [item('7', 'ค่ากิน', 'เจ็ด', 7, 1, '2026-10-01')] });
    expect(names()).toEqual(['เจ็ด']);
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

  it('a chip is found through the category map, or through the list by its text id', () => {
    render({ suggCatFilter: ['mapped'], setSuggCatFilter: () => {}, catMap: { mapped: { id: 'mapped', name: 'จากแมป', color: '#123456' } } });
    expect(summaryChips()).toEqual(['จากแมป']);
    render({ suggCatFilter: [7 as unknown as string], setSuggCatFilter: () => {}, categories: [{ ...CATS[0], id: '7', name: 'เจ็ด' }], catMap: {} });
    expect(summaryChips()).toEqual(['เจ็ด']);
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

  it('a new form type starts every filter over: group, categories, allocation, range, sort and limit', () => {
    render();
    setEverything();
    render({ formType: 'savings' });
    expect(names()).toEqual(['กองทุน SSF']);
    render({ formType: 'expense' });
    expectClean();
    expect(q('.pt-0\\.5')).toBeNull();
    openPanel();
    expect(overlay()!.querySelector('.max-h-24')).toBeNull();
    expect(inPanel('ทั้งหมด').classList.contains('border-slate-500')).toBe(true);
    ensureMore();
    expect(selects().map(s => s.value)).toEqual(['ALL', 'frequent']);
    expect(limitButtons()[0].classList.contains('border-accent-ink')).toBe(true);
  });

  it.each([['the panel button', 'รีเซ็ต'], ['the chip row', 'ล้างทั้งหมด']])('%s puts back every filter and the search', (_n, text) => {
    render();
    setEverything();
    if (text === 'ล้างทั้งหมด') { openPanel(); click(byText('button', text)); openPanel(); } else click(inPanelStarting(text));
    expectClean();
    expect(overlay()!.querySelector('.max-h-24')).toBeNull();
    expect(inPanelStarting('ล้างหมวด')).toBeUndefined();
    expect(inPanel('ทั้งหมด').classList.contains('border-slate-500')).toBe(true);
    expect(selects().map(s => s.value)).toEqual(['ALL', 'frequent']);
    expect(limitButtons()[0].classList.contains('border-accent-ink')).toBe(true);
  });

  it('the chip row is for a closed panel only', () => {
    render();
    openPanel();
    click(inPanel('NEED'));
    expect(q('.pt-0\\.5')).toBeNull();
    openPanel();
    expect(q('.pt-0\\.5')).not.toBeNull();
  });

  it('an amount range or a limit that is on keeps the folded section open', () => {
    render();
    openPanel();
    showMore();
    choose(selects()[0], 'over2000');
    showMore();
    expect(selects()).toHaveLength(2);
    choose(selects()[0], 'ALL'); // nothing keeps it open any more, and it was folded by hand
    expect(selects()).toHaveLength(0);
    showMore();
    click(limitButtons()[1]);
    showMore();
    expect(selects()).toHaveLength(2);
  });

  it('the range and sort boxes show what is picked', () => {
    render();
    openPanel();
    showMore();
    choose(selects()[0], 'under100');
    choose(selects()[1], 'amountAsc');
    expect(selects().map(s => s.value)).toEqual(['under100', 'amountAsc']);
  });

  it('the arrow beside "ตัวเลือกเพิ่มเติม" turns over while it is open', () => {
    render();
    openPanel();
    const arrow = () => byText('button', 'ตัวเลือกเพิ่มเติม (ช่วงราคา, การเรียง, จำนวน)')!.querySelector('svg')!;
    expect(arrow().classList.contains('rotate-180')).toBe(false);
    showMore();
    expect(arrow().classList.contains('rotate-180')).toBe(true);
  });

  it('"ทั้งหมด" for the limit shows every item', () => {
    render({ defaultLimit: 2 });
    openPanel();
    ensureMore();
    click(limitButtons()[3]);
    expect(names()).toEqual(EXPENSE_BY_FREQUENCY);
  });

  it('the list follows new history while mounted', () => {
    render({ frequentItems: [ITEMS[0]] });
    expect(names()).toEqual(['ข้าวมันไก่']);
    render({ frequentItems: [ITEMS[1]] });
    expect(names()).toEqual(['กาแฟ']);
  });

  it('the list re-sorts when the sort changes (and not just when something else does)', () => {
    render();
    openPanel();
    showMore();
    choose(selects()[1], 'amountDesc');
    expect(names()[0]).toBe('ค่าห้อง');
  });

  it('search ignores case in what was typed', () => {
    render();
    type(searchBox(), 'BTS');
    expect(names()).toEqual(['BTS']);
    type(searchBox(), 'ค่ากิน');
    expect(names()).toHaveLength(4);
  });

  it('the box shows what was typed', () => {
    render();
    type(searchBox(), 'bts');
    expect(searchBox().value).toBe('bts');
  });

  it('a row names its category from the category, falling back to the item\'s own name when the category has none', () => {
    const rowCat = () => rows()[0].querySelector('.items-start > div > span:last-child')!.textContent;
    render({ frequentItems: [item('c-food', 'ชื่อเก่า', 'x', 10, 1, '2026-10-01')] });
    expect(rowCat()).toBe('ค่ากิน');
    render({ categories: [{ ...CATS[0], name: '' }], frequentItems: [item('c-food', 'สำรอง', 'y', 10, 1, '2026-10-01')] });
    expect(rowCat()).toBe('สำรอง');
  });

  it('income amounts are green, expenses red', () => {
    const amount = () => rows()[0].querySelector('.tabular-nums')!;
    render({ formType: 'expense' });
    expect(amount().classList.contains('text-expense')).toBe(true);
    render({ formType: 'income' });
    expect(amount().classList.contains('text-emerald-400')).toBe(true);
    expect(amount().classList.contains('text-expense')).toBe(false);
  });
});

describe('QuickSuggest — where a category\'s group comes from', () => {
  const noGroup = (c: Category): Category => ({ ...c, cashflowGroup: undefined });
  const chipNames = () => [...overlay()!.querySelectorAll<HTMLButtonElement>('.max-h-24 button')].map(b => b.textContent!.trim());

  it('derived groups: from the category\'s own group object', () => {
    const cats = CATS.map(c => c.type === 'expense' ? { ...noGroup(c), _group: { id: c.cashflowGroup, name: c.cashflowGroup === 'g-var' ? 'ผันแปร' : 'ประจำ' } } as Category : c);
    render({ cashflowGroups: [], categories: cats });
    openPanel();
    expect([...overlay()!.querySelectorAll('.rounded-pill.cursor-pointer')].map(b => b.textContent!.trim())).toEqual(['ผันแปร', 'ประจำ']);
  });

  it('derived groups can be picked, and then filter by the group they were made from', () => {
    render({ cashflowGroups: [] });
    openPanel();
    click(inPanel('g-var'));
    expect(names()).toEqual(['BTS', 'ข้าวมันไก่', 'กาแฟ', 'ชาบู', 'บุฟเฟ่ต์']);
  });

  it('categories know their group through the category map', () => {
    const catMap = Object.fromEntries(CATS.map(c => [c.id, { ...c, cashflowGroup: undefined, _group: { id: c.cashflowGroup } }]));
    render({ categories: CATS.map(noGroup), catMap });
    openPanel();
    click(inPanel('ผันแปร'));
    expect(chipNames()).toEqual(['ค่ากิน', 'เดินทาง']);
    expect(names()).toEqual(['BTS', 'ข้าวมันไก่', 'กาแฟ', 'ชาบู', 'บุฟเฟ่ต์']);
  });

  it('...or through a group object on the category itself', () => {
    const cats = CATS.map(c => ({ ...noGroup(c), _group: { id: c.cashflowGroup } }) as Category);
    render({ categories: cats });
    openPanel();
    click(inPanel('ผันแปร'));
    expect(chipNames()).toEqual(['ค่ากิน', 'เดินทาง']);
    expect(names()).toEqual(['BTS', 'ข้าวมันไก่', 'กาแฟ', 'ชาบู', 'บุฟเฟ่ต์']);
  });

  it('a group id that is a number on one side and text on the other still matches', () => {
    const groups = GROUPS.map(g => g.id === 'g-var' ? { ...g, id: 5 as unknown as string } : g);
    const cats = CATS.map(c => c.cashflowGroup === 'g-var' ? { ...c, cashflowGroup: '5' } : c);
    render({ cashflowGroups: groups, categories: cats });
    openPanel();
    click(inPanel('ผันแปร'));
    expect(chipNames()).toEqual(['ค่ากิน', 'เดินทาง']);
    expect(names()).toEqual(['BTS', 'ข้าวมันไก่', 'กาแฟ', 'ชาบู', 'บุฟเฟ่ต์']);
    expect(overlay()!.querySelector('strong')!.textContent).toBe('ผันแปร');
  });

  it('the count on a group chip also works through the category map', () => {
    const catMap = Object.fromEntries(CATS.map(c => [c.id, { ...c, cashflowGroup: undefined, _group: { id: c.cashflowGroup } }]));
    render({ categories: CATS.map(noGroup), catMap, suggCatFilter: ['c-food'], setSuggCatFilter: () => {} });
    openPanel();
    expect(inPanelStarting('ผันแปร').textContent).toBe('ผันแปร1');
  });

  it('a picked category with no group selected still offers "ล้างหมวด"', () => {
    render({ suggCatFilter: ['c-trip'], setSuggCatFilter: () => {} });
    openPanel();
    expect(inPanelStarting('ล้างหมวด')).toBeTruthy();
  });

  it('the open group chip is lit; the others are not; each chip shows its icon', () => {
    render();
    openPanel();
    click(inPanel('ผันแปร'));
    expect(inPanelStarting('ผันแปร').classList.contains('border-accent-ink')).toBe(true);
    expect(inPanel('ประจำ').classList.contains('border-accent-ink')).toBe(false);
    expect(inPanelStarting('ผันแปร').querySelector('svg.lucide-folder')).not.toBeNull();
  });

  it('a picked category chip is lit and checked; an unpicked one is neither', () => {
    render();
    openPanel();
    click(inPanel('ผันแปร'));
    const chips = () => [...overlay()!.querySelectorAll<HTMLButtonElement>('.max-h-24 button')];
    click(chips()[0]);
    expect(chips()[0].classList.contains('ring-1')).toBe(true);
    expect(chips()[0].querySelector('svg.lucide-check')).not.toBeNull();
    expect(chips()[1].classList.contains('ring-1')).toBe(false);
    expect(chips()[1].querySelector('svg.lucide-check')).toBeNull();
  });
});
