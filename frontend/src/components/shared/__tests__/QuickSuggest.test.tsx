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
const chipIn = (label: string, text: string) => [...document.querySelectorAll<HTMLButtonElement>(`[aria-label="${label}"] button`)].find(b => b.textContent?.trim() === text) ?? null;
const groupChip = (text: string) => chipIn('กรองตามกลุ่ม', text);
const catChip = (text: string) => chipIn('หมวดในกลุ่ม', text);
const sortBtn = (text: string) => chipIn('เรียงตาม', text);
const showAllBtn = () => [...document.querySelectorAll('button')].find(b => b.textContent?.startsWith('ดูทั้งหมด')) ?? null;

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

  it('an other-price chip applies that price; the row itself applies its most-used one', () => {
    render({ frequentItems: [item('c-food', 'ค่ากิน', 'ข้าวเย็น', 40, 124, '2026-11-20'), item('c-food', 'ค่ากิน', 'ข้าวเย็น', 20, 60, '2026-05-01')] });
    click(q<HTMLButtonElement>('[aria-label="ราคาอื่น"] button')!);
    expect(onApply).toHaveBeenLastCalledWith(expect.objectContaining({ amount: 20 }));
    click(rows()[0]);
    expect(onApply).toHaveBeenLastCalledWith(expect.objectContaining({ amount: 40 }));
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

describe('QuickSuggest — filters', () => {
  it('a group chip narrows the list to that group; clicking it again clears it', () => {
    render();
    click(groupChip('ประจำ'));
    expect(names()).toEqual(['ค่าห้อง']);
    click(groupChip('ประจำ'));
    expect(names()).toEqual(EXPENSE_BY_FREQUENCY);
  });

  it('inside an open group several categories can be picked; another group drops them', () => {
    render();
    click(groupChip('ผันแปร'));
    expect(names()).toEqual(['BTS', 'ข้าวมันไก่', 'กาแฟ', 'ชาบู', 'บุฟเฟ่ต์']);
    click(catChip('เดินทาง'));
    expect(names()).toEqual(['BTS']);
    click(catChip('ค่ากิน'));
    expect(names()).toEqual(['BTS', 'ข้าวมันไก่', 'กาแฟ', 'ชาบู', 'บุฟเฟ่ต์']);
    click(catChip('เดินทาง'));
    expect(names()).toEqual(['ข้าวมันไก่', 'กาแฟ', 'ชาบู', 'บุฟเฟ่ต์']);
    click(groupChip('ประจำ'));
    expect(names()).toEqual(['ค่าห้อง']);
    expect(catChip('ค่ากิน')).toBeNull();
  });

  it('NEED / WANT filter expenses and toggle off; income and savings do not offer them', () => {
    render();
    click(groupChip('need'));
    expect(names()).toEqual(['BTS', 'ข้าวมันไก่', 'ค่าห้อง']);
    click(groupChip('want'));
    expect(names()).toEqual(['กาแฟ', 'ชาบู', 'บุฟเฟ่ต์']);
    click(groupChip('want'));
    expect(names()).toEqual(EXPENSE_BY_FREQUENCY);
    render({ formType: 'income' });
    expect(groupChip('need')).toBeNull();
  });

  it('"ล่าสุด" sorts by the last time used', () => {
    render();
    click(sortBtn('ล่าสุด'));
    expect(names()).toEqual(['กาแฟ', 'BTS', 'ข้าวมันไก่', 'ค่าห้อง', 'ชาบู', 'บุฟเฟ่ต์']);
  });

  it('shows defaultLimit rows, and "ดูทั้งหมด" the rest', () => {
    render({ defaultLimit: 2 });
    expect(names()).toEqual(['BTS', 'ข้าวมันไก่']);
    expect(showAllBtn()!.textContent).toContain('อีก 4');
    click(showAllBtn());
    expect(names()).toEqual(EXPENSE_BY_FREQUENCY);
    expect(showAllBtn()).toBeNull();
  });

  it('a new form type starts every filter, the search, the sort and "ดูทั้งหมด" over', () => {
    render({ defaultLimit: 2 });
    type(searchBox(), 'ก');
    click(groupChip('want'));
    click(sortBtn('ล่าสุด'));
    render({ defaultLimit: 2, formType: 'income' });
    render({ defaultLimit: 2, formType: 'expense' });
    expect(searchBox().value).toBe('');
    expect(names()).toEqual(['BTS', 'ข้าวมันไก่']);
  });
});

describe('QuickSuggest — category filter owned by the parent', () => {
  it('hands the parent an updater that copes with whatever form the stored filter has (string, ALL, nothing)', () => {
    const setter = vi.fn();
    render({ suggCatFilter: 'c-trip', setSuggCatFilter: setter });
    click(groupChip('ผันแปร'));
    setter.mockClear();
    click(catChip('ค่ากิน'));
    const updater = setter.mock.calls.at(-1)![0] as (prev: unknown) => unknown;
    expect(updater('c-trip')).toEqual(['c-trip', 'c-food']);
    expect(updater(['c-trip'])).toEqual(['c-trip', 'c-food']);
    expect(updater('ALL')).toEqual(['c-food']);
    expect(updater(undefined)).toEqual(['c-food']);
    expect(updater('')).toEqual(['c-food']);
  });

  it('a category id that is a number on one side and text on the other is the same category', () => {
    const setter = vi.fn();
    render({ suggCatFilter: [7 as unknown as string], setSuggCatFilter: setter, categories: [{ ...CATS[0], id: '7' }, CATS[1]], frequentItems: [] });
    click(groupChip('ผันแปร'));
    click(catChip('ค่ากิน'));
    const toggle = setter.mock.calls.at(-1)![0] as (prev: unknown[]) => unknown[];
    expect(toggle([7])).toEqual([]);
    expect(toggle(['c-trip'])).toEqual(['c-trip', '7']);
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
import { groupSuggestions } from '../QuickSuggest';
describe('groupSuggestions', () => {
  it('folds the same item at other prices into one row, counting every time it was bought', () => {
    const g = groupSuggestions([
      item('c-food', 'ค่ากิน', 'ข้าวเย็น', 40, 124, '2026-11-20'),
      item('c-food', 'ค่ากิน', 'ข้าวเที่ยง', 23, 285, '2026-11-20'),
      item('c-food', 'ค่ากิน', 'ข้าวเย็น', 20, 60, '2026-05-01'),
      item('c-food', 'ค่ากิน', 'ข้าวเย็น ', 50, 52, '2026-10-01'),
    ]);
    expect(g.map(x => [x.description, x.amount, x.totalCount])).toEqual([['ข้าวเย็น', 40, 236], ['ข้าวเที่ยง', 23, 285]]);
    expect(g[0].variants.map(v => v.amount)).toEqual([20, 50]);
  });
});
