// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { flush, flushAll, click, key, type, q, byText } from '@/test-utils/dom';
import { h } from './batchAddMocks';
import {
  setupBatchAddModalTests, DAY, categories, asset, mount, unmount, wait, update, dialog, amountInput, descInput, typeTab, addBtn, saveBtn, categoryTrigger, cartRows, cartTitles, cartText, badge, footer, add, pickCategory,
} from './batchAddHarness';

vi.mock('@/context/PortfolioContext', () => import('./batchAddMocks').then(m => m.portfolioContext));
vi.mock('@/context/AppFilterContext', () => import('./batchAddMocks').then(m => m.appFilterContext));
vi.mock('@/services/api', () => import('./batchAddMocks').then(m => m.api));

setupBatchAddModalTests();

describe('BatchAddModal — opening', () => {

  it('is a labelled modal dialog with an empty cart and a disabled save button', async () => {
    await mount();
    expect(dialog()!.getAttribute('aria-modal')).toBe('true');
    expect(dialog()!.getAttribute('aria-label')).toBe('สรุปค่าใช้จ่ายประจำวัน');
    expect(document.body.textContent).toContain('ยังไม่มีรายการในตะกร้า');
    expect(document.body.textContent).toContain('0 รายการ');
    expect(footer()).toContain('0.00 ฿');
    expect((saveBtn() as HTMLButtonElement).disabled).toBe(true);
  });

  it('starts on an expense with the first expense category and the given date', async () => {
    await mount();
    expect(typeTab('รายจ่าย').className).toContain('text-expense');
    expect(categoryTrigger().textContent).toContain('ค่ากิน');
    expect(document.querySelectorAll('button[type="submit"]')).toHaveLength(1);
  });

  it('opens on the type, category (by id), asset and side it was asked for — and focuses the amount', async () => {
    h.portfolio = { assets: [asset] };
    await mount({ isOpen: false });
    await update({ isOpen: true, defaultType: 'savings', defaultCategory: 'c-save', defaultAssetId: 'a1', defaultSide: 'sell' });
    await wait(150);
    expect(typeTab('ลงทุน/ออม').className).toContain('text-savings');
    expect(categoryTrigger().textContent).toContain('ออมทอง');
    expect(q('button[aria-label="สินทรัพย์"]')!.textContent).toContain('กองทุนทดสอบ');
    expect(byText('[role="group"][aria-label="ซื้อหรือขาย"] button', 'ขาย')!.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(amountInput());
  });

});

describe('BatchAddModal — adding to the cart', () => {
  it('adds an expense with the form\'s category, allocation, date and amount, then clears amount and description', async () => {
    await mount();
    await add('85.5', 'ชานม');
    expect(cartTitles()).toEqual(['ชานม']);
    expect(cartText()[0]).toContain('รายจ่ายประจำวัน'); // the group the category belongs to
    expect(cartText()[0]).toContain('ค่ากิน');
    expect(cartText()[0]).toContain(DAY);
    expect(cartText()[0]).toContain('−฿85.50');
    expect(badge(0)).toBe('รายจ่าย');
    expect(amountInput().value).toBe('');
    expect(descInput().value).toBe('');
    expect(document.body.textContent).toContain('1 รายการ');
  });

  it('puts the cursor back in the amount field after an add, ready for the next line', async () => {
    await mount();
    await add('1');
    await wait(40);
    expect(document.activeElement).toBe(amountInput());
  });

  it('Enter in the amount or description field adds the item', async () => {
    await mount();
    type(amountInput(), '40');
    key(amountInput(), 'Enter');
    await flushAll();
    expect(cartTitles()).toEqual(['ค่ากิน']);
    type(amountInput(), '41');
    type(descInput(), 'ขนม');
    key(descInput(), 'Enter');
    await flushAll();
    expect(cartTitles()).toEqual(['ค่ากิน', 'ขนม']);
  });

  it('shows inline errors and adds nothing for an empty or zero amount', async () => {
    await mount();
    click(addBtn());
    await flushAll();
    expect(document.body.textContent).toContain('กรุณาระบุจำนวนเงิน');
    expect(amountInput().getAttribute('aria-invalid')).toBe('true');
    expect(cartTitles()).toEqual([]);

    type(amountInput(), '0');
    click(addBtn());
    await flushAll();
    expect(document.body.textContent).toContain('จำนวนเงินต้องมากกว่า 0');
    expect(cartTitles()).toEqual([]);
  });

  it('refuses a negative amount', async () => {
    await mount();
    await add('-5');
    expect(document.body.textContent).toContain('จำนวนเงินต้องมากกว่า 0');
    expect(cartTitles()).toEqual([]);
  });

  it('"ล้าง" empties what is being typed (amount, description, units) without touching the cart', async () => {
    h.portfolio = { assets: [asset] };
    await mount();
    await add('10', 'หนึ่ง');
    click(typeTab('ลงทุน/ออม'));
    click(q('button[aria-label="สินทรัพย์"]'));
    click(byText('[role="option"]', 'กองทุนทดสอบ'));
    type(amountInput(), '99');
    type(descInput(), 'ยังไม่เพิ่ม');
    type(q('#batch-units'), '0.5');
    click(byText('button', 'ล้าง'));
    await wait(30);
    expect(amountInput().value).toBe('');
    expect(descInput().value).toBe('');
    expect(q<HTMLInputElement>('#batch-units')!.value).toBe('');
    expect(document.activeElement).toBe(amountInput());
    expect(cartTitles()).toEqual(['หนึ่ง']);
  });

});

describe('BatchAddModal — the form types', () => {
  it('switching to income picks the first income category, hides the NEED/WANT buttons and adds with a + sign', async () => {
    await mount();
    expect(byText('button', 'NEED')).not.toBeNull();
    click(typeTab('รายรับ'));
    await flush();
    expect(categoryTrigger().textContent).toContain('เงินเดือน');
    expect(byText('button', 'NEED')).toBeNull();
    await add('30000', 'เงินเดือนต.ค.');
    expect(badge(0)).toBe('รายรับ');
    expect(cartText()[0]).toContain('+฿30,000.00');
  });

  it('switching type clears a chosen asset and its units', async () => {
    h.portfolio = { assets: [asset] };
    await mount();
    click(typeTab('ลงทุน/ออม'));
    click(q('button[aria-label="สินทรัพย์"]'));
    click(byText('[role="option"]', 'กองทุนทดสอบ'));
    type(q('#batch-units'), '0.5');
    click(typeTab('รายจ่าย'));
    click(typeTab('ลงทุน/ออม'));
    expect(q('button[aria-label="สินทรัพย์"]')!.textContent).not.toContain('กองทุนทดสอบ');
    expect(q('#batch-units')).toBeNull(); // no asset, no units field …
    click(q('button[aria-label="สินทรัพย์"]'));
    click(byText('[role="option"]', 'กองทุนทดสอบ'));
    expect(q<HTMLInputElement>('#batch-units')!.value).toBe(''); // … and choosing the asset again does not bring the old 0.5 back
  });

  it('a category\'s own allocation is applied when it is picked, and the NEED/WANT buttons override it (an expense has no SAVE: that is investing)', async () => {
    await mount();
    expect(byText('button', 'SAVE')).toBeNull();
    const selected = () => ['NEED', 'WANT'].filter(l => byText('button', l)!.getAttribute('aria-pressed') === 'true');
    await pickCategory('ค่ากิน');
    expect(selected()).toEqual(['NEED']);
    await pickCategory('บันเทิง');
    expect(selected()).toEqual(['WANT']);
    click(byText('button', 'NEED'));
    await flush();
    expect(selected()).toEqual(['NEED']);
  });

  it('an added expense carries the allocation the user chose', async () => {
    const onSaveBatch = vi.fn().mockResolvedValue(undefined);
    await mount({ onSaveBatch });
    click(byText('button', 'WANT'));
    await add('70', 'ของกิน');
    click(saveBtn());
    await flushAll();
    expect(onSaveBatch.mock.calls[0][0][0]).toMatchObject({ allocation_type: 'want', category_id: 'c-food' });
  });
});

describe('BatchAddModal — savings and investment rows', () => {
  it('a plain savings row (no asset) goes in the cart as a buy with no sign', async () => {
    await mount();
    click(typeTab('ลงทุน/ออม'));
    await add('500', 'ออมเดือนนี้');
    expect(cartText()[0]).toContain('ซื้อ · ออมทั่วไป');
    expect(cartText()[0]).toContain('฿500.00');
    expect(cartText()[0]).not.toContain('−฿500');
  });

  it('an asset trade needs units: refused with the reason, nothing added — and the reason goes once units are typed', async () => {
    h.portfolio = { assets: [asset] };
    await mount();
    click(typeTab('ลงทุน/ออม'));
    click(q('button[aria-label="สินทรัพย์"]'));
    click(byText('[role="option"]', 'กองทุนทดสอบ'));
    await add('200');
    expect(document.body.textContent).toContain('ระบุจำนวนหน่วยที่มากกว่า 0');
    expect(cartTitles()).toEqual([]);

    type(q('#batch-units'), '0');
    await flushAll();
    expect(document.body.textContent).toContain('ระบุจำนวนหน่วยที่มากกว่า 0'); // 0 is still not a quantity
    type(q('#batch-units'), '0.5');
    await flushAll();
    expect(document.body.textContent).not.toContain('ระบุจำนวนหน่วยที่มากกว่า 0'); // cleared without pressing add again
  });

  it('a sell with units is shown with the asset name and units, and the footer nets it off', async () => {
    h.portfolio = { assets: [asset] };
    await mount();
    click(typeTab('ลงทุน/ออม'));
    click(q('button[aria-label="สินทรัพย์"]'));
    click(byText('[role="option"]', 'กองทุนทดสอบ'));
    click(byText('[role="group"][aria-label="ซื้อหรือขาย"] button', 'ขาย'));
    type(q('#batch-units'), '0.2');
    await add('200', 'ขายบางส่วน');
    expect(cartText()[0]).toContain('ขาย · กองทุนทดสอบ · 0.2');
    expect(footer()).toContain('ลงทุน/ออม:−200.00 ฿');
  });

  it('units are cleared after an add so the next trade starts fresh', async () => {
    h.portfolio = { assets: [asset] };
    await mount();
    click(typeTab('ลงทุน/ออม'));
    click(q('button[aria-label="สินทรัพย์"]'));
    click(byText('[role="option"]', 'กองทุนทดสอบ'));
    type(q('#batch-units'), '0.2');
    await add('200');
    expect(q<HTMLInputElement>('#batch-units')!.value).toBe('');
  });
});

