// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { flush, flushAll, click, key, type, q, byText } from '@/test-utils/dom';
import type { Category, FrequentItem } from '@/types';
import { h } from './batchAddMocks';
import {
  setupBatchAddModalTests, categories, asset, mount, getProps, wait, update, amountInput, descInput, typeTab, addBtn, saveBtn, discardBtn, closeX, categoryTrigger, cartTitles, cartText, guard, footer, add, pickCategory,
} from './batchAddHarness';
import type { AnyMock } from './batchAddHarness';

vi.mock('@/context/PortfolioContext', () => import('./batchAddMocks').then(m => m.portfolioContext));
vi.mock('@/context/AppFilterContext', () => import('./batchAddMocks').then(m => m.appFilterContext));
vi.mock('@/services/api', () => import('./batchAddMocks').then(m => m.api));

setupBatchAddModalTests();

describe('BatchAddModal — closing without losing the cart by accident', () => {
  it('an empty cart closes at once: X, "ทิ้งข้อมูล" and Esc', async () => {
    const onClose = vi.fn();
    await mount({ onClose });
    click(closeX());
    click(discardBtn());
    key(window.document.body, 'Escape');
    expect(onClose).toHaveBeenCalledTimes(3);
    expect(guard()).toBeNull();
  });

  it('a second close within the window discards and closes', async () => {
    const onClose = vi.fn();
    await mount({ onClose });
    await add('1', 'a');
    click(closeX());
    click(closeX());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(cartTitles()).toEqual([]); // discarded, not just hidden
  });

  it('Esc twice does the same, and the second Esc is not swallowed by the warning', async () => {
    const onClose = vi.fn();
    await mount({ onClose });
    await add('1', 'a');
    key(document.body, 'Escape');
    expect(guard()).not.toBeNull();
    key(document.body, 'Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('"ทิ้งและปิด" in the warning discards at once; "กลับไปแก้ต่อ" disarms it', async () => {
    const onClose = vi.fn();
    await mount({ onClose });
    await add('1', 'a');
    click(discardBtn());
    expect(guard()).not.toBeNull();
    click(byText('button', 'กลับไปแก้ต่อ'));
    expect(guard()).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(cartTitles()).toEqual(['a']);

    click(discardBtn());
    click(byText('button', 'ทิ้งและปิด'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('the warning goes away by itself after 6 seconds, so a later single close does not discard', async () => {
    const onClose = vi.fn();
    await mount({ onClose });
    await add('1', 'a');
    vi.useFakeTimers(); // from here on only the guard's own timer is under test
    click(closeX());
    expect(guard()).not.toBeNull();
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(guard()).not.toBeNull(); // still armed well into the window
    await act(async () => { vi.advanceTimersByTime(1100); });
    expect(guard()).toBeNull();
    click(closeX());
    expect(onClose).not.toHaveBeenCalled();
    expect(guard()).not.toBeNull();
  });

});

describe('BatchAddModal — quick suggestions', () => {
  const frequent: FrequentItem[] = [
    { categoryId: 'c-food', categoryName: 'ค่ากิน', description: 'ข้าวมันไก่', amount: 60, allocation_type: 'need', count: 5, lastDate: '2026-10-01' },
    { categoryId: 'c-salary', categoryName: 'เงินเดือน', description: 'เงินเดือน', amount: 30000, allocation_type: null, count: 9, lastDate: '2026-09-25' },
  ];
  const items = () => [...document.querySelectorAll<HTMLElement>('.sugg-item')];

  it('clicking one fills category, description and amount, then focuses the amount', async () => {
    await mount({ frequentItems: frequent });
    await pickCategory('บันเทิง');
    click(items()[0]);
    await wait(50);
    expect(categoryTrigger().textContent).toContain('ค่ากิน');
    expect(descInput().value).toBe('ข้าวมันไก่');
    expect(amountInput().value).toBe('60');
    expect(document.activeElement).toBe(amountInput());
  });

  it('a suggestion in the category already picked does not swallow the default of the next category picked by hand', async () => {
    const cats = [...categories, { id: 'c-rent', name: 'ค่าเช่า', type: 'expense', order_index: 5, cashflow_group_id: 'g-exp', allocation_type: 'need' } as Category];
    const onSaveBatch = vi.fn().mockResolvedValue(undefined);
    await mount({ categories: cats, onSaveBatch, frequentItems: [
      { categoryId: 'c-food', categoryName: 'ค่ากิน', description: 'บุฟเฟต์', amount: 900, allocation_type: 'want', count: 3, lastDate: '2026-10-01' },
    ] });
    expect(categoryTrigger().textContent).toContain('ค่ากิน');
    click(items()[0]); // same category, WANT
    await wait(50);
    await pickCategory('ค่าเช่า'); // NEED
    await add('100', 'ห้อง');
    click(saveBtn());
    await flushAll();
    expect(onSaveBatch.mock.calls[0][0][0]).toMatchObject({ category_id: 'c-rent', allocation_type: 'need' });
  });

  it('the suggestions are locked while the cart is being saved', async () => {
    let finish!: () => void;
    await mount({ frequentItems: frequent, onSaveBatch: vi.fn(() => new Promise<void>(r => { finish = r; })) });
    await add('10', 'a');
    expect((items()[0] as HTMLButtonElement).disabled).toBe(false);
    click(saveBtn());
    await flush();
    expect((items()[0] as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { finish(); await Promise.resolve(); });
  });

  it('keeps the suggestion\'s own allocation instead of replacing it with the category\'s', async () => {
    const wantFood: FrequentItem[] = [{ ...frequent[0], allocation_type: 'want' }];
    await mount({ frequentItems: wantFood });
    await pickCategory('บันเทิง'); // so the suggestion really changes the category (ค่ากิน is a NEED category)
    click(items()[0]);
    await flushAll();
    expect(categoryTrigger().textContent).toContain('ค่ากิน');
    const onSaveBatch = getProps().onSaveBatch as AnyMock;
    click(addBtn());
    await flushAll();
    click(saveBtn());
    await flushAll();
    expect(onSaveBatch.mock.calls[0][0][0]).toMatchObject({ category_id: 'c-food', description: 'ข้าวมันไก่', amount: 60, allocation_type: 'want' });
  });
});

describe('BatchAddModal — recurring items', () => {
  // rent: 3 000 on the 5th of each of the last 3 months; electricity: varies, the 20th; both missing in Oct
  const hist = (id: string, date: string, category_id: string, description: string, amount: number) => ({ id, date, category_id, description, amount, allocation_type: 'need' });
  const rent = ['2026-07-05', '2026-08-05', '2026-09-05'].map((d, i) => hist(`r${i}`, d, 'c-food', 'ค่าห้อง', 3000));
  const power = [['2026-07-20', 800], ['2026-08-20', 900], ['2026-09-20', 1000]].map(([d, a], i) => hist(`p${i}`, d as string, 'c-fun', 'ค่าไฟ', a as number));
  const recurringTrigger = () => [...document.querySelectorAll<HTMLElement>('button[aria-expanded]')].find(b => b.textContent!.includes('รายการประจำ'))!;
  const panel = () => q('section[aria-label^="รายการประจำ"]');
  /** Opens the panel. jsdom has no stylesheet, so the host's computed padding is '' and the panel height would be NaN — give it one. */
  const openRecurring = async () => {
    recurringTrigger().parentElement!.parentElement!.style.paddingBottom = '0px';
    click(recurringTrigger());
    await flush();
  };

  it('lists them with their usual day, marks the variable one and fills the form on click (including the date)', async () => {
    h.history = [...rent, ...power];
    await mount();
    await flushAll();
    await openRecurring();
    const rows = [...panel()!.querySelectorAll('li')];
    expect(rows.map(r => r.textContent)).toEqual([
      expect.stringContaining('ค่าห้อง'),
      expect.stringContaining('ค่าไฟ'),
    ]);
    expect(rows[0].textContent).toContain('5 ต.ค.');
    expect(rows[1].textContent).toContain('~1,000.00');
    expect(rows[1].textContent).toContain('ยอดไม่คงที่');

    click(rows[0].querySelector('button'));
    await flushAll();
    expect(descInput().value).toBe('ค่าห้อง');
    expect(amountInput().value).toBe('3000');
    click(addBtn());
    await flushAll();
    expect(cartText()[0]).toContain('2026-10-05');
  });

  it('"เติม N รายการที่ยังขาด" drops them all into the cart with the suggested dates and the latest amounts', async () => {
    h.history = [...rent, ...power];
    const onSaveBatch = vi.fn().mockResolvedValue(undefined);
    await mount({ onSaveBatch });
    await flushAll();
    await openRecurring();
    click(byText('button', 'เติม 2 รายการที่ยังขาด'));
    await flushAll();

    expect(cartTitles()).toEqual(['ค่าห้อง', 'ค่าไฟ']);
    expect(cartText()[0]).toContain('2026-10-05');
    expect(cartText()[1]).toContain('2026-10-20');
    expect(cartText()[1]).toContain('−฿1,000.00');
    click(saveBtn());
    await flushAll();
    expect(onSaveBatch.mock.calls[0][0]).toMatchObject([
      { date: '2026-10-05', category_id: 'c-food', description: 'ค่าห้อง', amount: 3000, allocation_type: 'need' },
      { date: '2026-10-20', category_id: 'c-fun', description: 'ค่าไฟ', amount: 1000 },
    ]);
  });

  it('× hides a false positive (saved), and "ซ่อนไว้ N · แสดงทั้งหมด" brings it back', async () => {
    h.history = [...rent, ...power];
    await mount();
    await flushAll();
    await openRecurring();
    const names = () => [...panel()!.querySelectorAll('li')].map(r => r.textContent!.includes('ค่าห้อง') ? 'ค่าห้อง' : 'ค่าไฟ');
    click(q('button[aria-label="ซ่อน \\"ค่าไฟ\\" จากรายการประจำ"]'));
    await flushAll();
    expect(names()).toEqual(['ค่าห้อง']);
    expect(h.saved.at(-1)![0]).toBe('recurring_hidden');
    expect(h.saved.at(-1)![1]).toHaveLength(1);
    const showAll = byText('button', 'ซ่อนไว้ 1 · แสดงทั้งหมด');
    expect(showAll).not.toBeNull();
    click(showAll);
    await flushAll();
    expect(names()).toEqual(['ค่าห้อง', 'ค่าไฟ']);
    expect(h.saved.at(-1)).toEqual(['recurring_hidden', []]);
    expect(byText('button', 'ซ่อนไว้ 1 · แสดงทั้งหมด')).toBeNull();
  });

  it('what is already in the cart counts as recorded, so a second fill adds nothing twice', async () => {
    h.history = [...rent];
    await mount();
    await flushAll();
    await openRecurring();
    click(byText('button', 'เติม 1 รายการที่ยังขาด'));
    await flushAll();
    expect(cartTitles()).toEqual(['ค่าห้อง']);
    expect(recurringTrigger().textContent).toContain('ครบ 1');
    expect(panel()).not.toBeNull(); // still open: the button to fill is gone because nothing is missing any more
    expect(panel()!.textContent).toContain('ลงแล้ว 1/1');
    expect(byText('button', 'เติม 1 รายการที่ยังขาด')).toBeNull();
    expect(cartTitles()).toEqual(['ค่าห้อง']);
  });

  it('a recurring savings item goes into the cart as a buy with no asset', async () => {
    h.history = ['2026-07-25', '2026-08-25', '2026-09-25'].map((d, i) => hist(`s${i}`, d, 'c-save', 'ออมทุกเดือน', 1000));
    const onSaveBatch = vi.fn().mockResolvedValue(undefined);
    await mount({ onSaveBatch });
    await flushAll();
    await openRecurring();
    click(byText('button', 'เติม 1 รายการที่ยังขาด'));
    await flushAll();
    expect(cartText()[0]).toContain('ซื้อ · ออมทั่วไป');
    click(saveBtn());
    await flushAll();
    expect(onSaveBatch.mock.calls[0][0][0]).toMatchObject({ category_id: 'c-save', amount: 1000, asset_id: null, units: null });
  });

  it('a recurring income item is filed as income', async () => {
    h.history = ['2026-07-25', '2026-08-25', '2026-09-25'].map((d, i) => ({ id: `i${i}`, date: d, category_id: 'c-salary', description: 'เงินเดือน', amount: 30000, allocation_type: null }));
    await mount();
    await flushAll();
    await openRecurring();
    click(byText('button', 'เติม 1 รายการที่ยังขาด'));
    await flushAll();
    expect(cartText()[0]).toContain('รายรับ');
    expect(cartText()[0]).toContain('+฿30,000.00');
    expect(footer()).toContain('รายรับ:+30,000.00 ฿');
  });
});
