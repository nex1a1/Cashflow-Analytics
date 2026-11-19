// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { flush, flushAll, click, key, type, q, byText } from '@/test-utils/dom';
import { h } from './batchAddMocks';
import {
  setupBatchAddModalTests, DAY, asset, mount, wait, update, amountInput, descInput, typeTab, addBtn, saveBtn, discardBtn, categoryTrigger, cartRows, cartTitles, cartText, badge, footer, add, pickCategory,
} from './batchAddHarness';

vi.mock('@/context/PortfolioContext', () => import('./batchAddMocks').then(m => m.portfolioContext));
vi.mock('@/context/AppFilterContext', () => import('./batchAddMocks').then(m => m.appFilterContext));
vi.mock('@/services/api', () => import('./batchAddMocks').then(m => m.api));

setupBatchAddModalTests();

describe('BatchAddModal — editing a cart item', () => {
  const editBtn = (i: number) => cartRows()[i].querySelector('[title="แก้ไขรายการนี้"]');

  it('loads the item into the form and switches the buttons to cancel / save-edit', async () => {
    await mount();
    await add('85.5', 'ชานม');
    click(editBtn(0));
    await flush();
    expect(amountInput().value).toBe('85.5');
    expect(descInput().value).toBe('ชานม');
    expect(byText('button', 'ยกเลิก')).not.toBeNull();
    expect(byText('button', 'บันทึกแก้ไข (Enter)')).not.toBeNull();
    expect(addBtn()).toBeNull();
    expect(cartRows()[0].textContent).toContain('กำลังแก้ไข');
  });

  it('saving the edit updates the item in place (same position, same count) and goes back to add mode', async () => {
    await mount();
    await add('10', 'a'); await add('20', 'b'); await add('30', 'c');
    click(editBtn(1));
    await flush();
    type(amountInput(), '25');
    type(descInput(), 'b แก้แล้ว');
    click(byText('button', 'บันทึกแก้ไข (Enter)'));
    await flushAll();
    expect(cartTitles()).toEqual(['a', 'b แก้แล้ว', 'c']);
    expect(cartText()[1]).toContain('−฿25.00');
    expect(cartText()[0]).toContain('−฿10.00');
    expect(cartText()[1]).not.toContain('กำลังแก้ไข');
    expect(addBtn()).not.toBeNull();
    expect(amountInput().value).toBe('');
  });

  it('can turn an expense into an income, which updates the sign and the footer', async () => {
    await mount();
    await add('500', 'ผิดช่อง');
    click(editBtn(0));
    await flush();
    click(typeTab('รายรับ'));
    await flush();
    type(amountInput(), '500');
    click(byText('button', 'บันทึกแก้ไข (Enter)'));
    await flushAll();
    expect(cartText()[0]).toContain('รายรับ');
    expect(cartText()[0]).toContain('+฿500.00');
    expect(footer()).toContain('รายรับ:+500.00 ฿');
    expect(footer()).not.toContain('รายจ่าย:');
  });

  it('Cancel leaves the item untouched', async () => {
    await mount();
    await add('10', 'a');
    click(editBtn(0));
    await flush();
    type(amountInput(), '999');
    click(byText('button', 'ยกเลิก'));
    await flush();
    expect(cartText()[0]).toContain('−฿10.00');
    expect(addBtn()).not.toBeNull();
  });

});

describe('BatchAddModal — editing keeps every field of the item', () => {
  const editBtn = (i: number) => cartRows()[i].querySelector('[title="แก้ไขรายการนี้"]');
  const sideBtn = (label: string) => byText('[role="group"][aria-label="ซื้อหรือขาย"] button', label)!;
  const pickAsset = () => { click(q('button[aria-label="สินทรัพย์"]')); click(byText('[role="option"]', 'กองทุนทดสอบ')); };

  it('a savings sell comes back with its type, asset, side and units, and the edit is saved with them', async () => {
    h.portfolio = { assets: [asset] };
    const onSaveBatch = vi.fn().mockResolvedValue(undefined);
    await mount({ onSaveBatch });
    click(typeTab('ลงทุน/ออม'));
    pickAsset();
    click(sideBtn('ขาย'));
    type(q('#batch-units'), '0.2');
    await add('200', 'ขายบางส่วน');

    click(typeTab('รายจ่าย')); // the form is somewhere else entirely when the edit starts
    click(editBtn(0));
    await flush();
    expect(typeTab('ลงทุน/ออม').className).toContain('text-savings');
    expect(q('button[aria-label="สินทรัพย์"]')!.textContent).toContain('กองทุนทดสอบ');
    expect(sideBtn('ขาย').getAttribute('aria-pressed')).toBe('true');
    expect(q<HTMLInputElement>('#batch-units')!.value).toBe('0.2');
    expect(descInput().value).toBe('ขายบางส่วน');

    type(q('#batch-units'), '0.1');
    type(amountInput(), '100');
    click(byText('button', 'บันทึกแก้ไข (Enter)'));
    await flushAll();
    expect(cartText()[0]).toContain('ขาย · กองทุนทดสอบ · 0.1');
    click(saveBtn());
    await flushAll();
    expect(onSaveBatch.mock.calls[0][0][0]).toMatchObject({ amount: -100, asset_id: 'a1', units: 0.1, allocation_type: 'savings' });
  });

  it('the category can be changed while editing, and the change reaches the cart and the payload', async () => {
    const onSaveBatch = vi.fn().mockResolvedValue(undefined);
    await mount({ onSaveBatch });
    await add('10', 'a');
    click(editBtn(0));
    await flush();
    await pickCategory('บันเทิง');
    click(byText('button', 'บันทึกแก้ไข (Enter)'));
    await flushAll();
    expect(cartText()[0]).toContain('บันเทิง');
    click(saveBtn());
    await flushAll();
    expect(onSaveBatch.mock.calls[0][0][0]).toMatchObject({ category: 'บันเทิง', category_id: 'c-fun' });
  });

  it('editing loads the item\'s own allocation (not the form\'s, not its category\'s) and can change it', async () => {
    const onSaveBatch = vi.fn().mockResolvedValue(undefined);
    await mount({ onSaveBatch });
    click(byText('button', 'WANT'));
    await add('70', 'ของกิน'); // WANT on a NEED category
    click(byText('button', 'NEED')); // the form moves on to NEED …
    await add('10', 'ข้าว');
    click(editBtn(0)); // … but the item being edited stays WANT
    await flush();
    type(amountInput(), '75');
    click(byText('button', 'บันทึกแก้ไข (Enter)'));
    await flushAll();
    click(editBtn(1));
    await flush();
    click(byText('button', 'WANT'));
    click(byText('button', 'บันทึกแก้ไข (Enter)'));
    await flushAll();
    click(saveBtn());
    await flushAll();
    expect(onSaveBatch.mock.calls[0][0]).toMatchObject([{ amount: 75, allocation_type: 'want' }, { amount: 10, allocation_type: 'want' }]);
  });

  it('puts the cursor in the amount field when an edit starts', async () => {
    await mount();
    await wait(150); // the modal's own delayed focus (100 ms after opening) has fired
    await add('10', 'a');
    await wait(40); // and so has the add's
    act(() => descInput().focus()); // the user is somewhere else
    expect(document.activeElement).toBe(descInput());
    click(editBtn(0));
    await wait(80);
    expect(document.activeElement).toBe(amountInput());
  });

  it('an income comes back as an income', async () => {
    await mount();
    click(typeTab('รายรับ'));
    await add('900', 'โบนัส');
    click(typeTab('รายจ่าย'));
    click(editBtn(0));
    await flush();
    expect(categoryTrigger().textContent).toContain('เงินเดือน');
    expect(badge(0)).toBe('รายรับ');
    click(byText('button', 'บันทึกแก้ไข (Enter)'));
    await flushAll();
    expect(cartText()[0]).toContain('+฿900.00');
  });

  it('Enter in the units field adds the row, like Enter in the amount field', async () => {
    h.portfolio = { assets: [asset] };
    await mount();
    click(typeTab('ลงทุน/ออม'));
    pickAsset();
    type(amountInput(), '100');
    type(q('#batch-units'), '0.5');
    key(q('#batch-units')!, 'Enter');
    await flushAll();
    expect(cartText()[0]).toContain('ซื้อ · กองทุนทดสอบ · 0.5');
  });

  it('clearing the asset also clears the units that belonged to it', async () => {
    h.portfolio = { assets: [asset] };
    await mount();
    click(typeTab('ลงทุน/ออม'));
    pickAsset();
    type(q('#batch-units'), '0.5');
    click(q('button[aria-label="สินทรัพย์"]'));
    click(byText('[role="option"]', 'ออมทั่วไป (ไม่ผูกสินทรัพย์)'));
    await flush();
    expect(q('#batch-units')).toBeNull(); // no asset, no units field
    pickAsset(); // choosing it again must not bring the old 0.5 back
    expect(q<HTMLInputElement>('#batch-units')!.value).toBe('');
  });
});

describe('BatchAddModal — the totals in the footer', () => {
  it('breaks expense, savings, income and the net out', async () => {
    await mount();
    await add('100', 'e1'); await add('50', 'e2');
    click(typeTab('ลงทุน/ออม')); await add('200', 's1');
    click(typeTab('รายรับ')); await add('1000', 'i1');
    const f = footer();
    expect(f).toContain('รายจ่าย:150.00 ฿');
    expect(f).toContain('ลงทุน/ออม:200.00 ฿');
    expect(f).toContain('รายรับ:+1,000.00 ฿');
    expect(f).toContain('สุทธิ:+650.00 ฿'); // 1000 − 150 − 200
  });

  it('shows a negative net with the danger colour and no plus sign', async () => {
    await mount();
    await add('300', 'e');
    click(typeTab('รายรับ')); await add('100', 'i');
    expect(footer()).toContain('สุทธิ:');
    expect(footer()).toContain('−200.00 ฿');
    expect(footer()).not.toContain('+-');
    const net = byText('span', 'สุทธิ:')!.nextElementSibling as HTMLElement;
    expect(net.classList.contains('text-danger')).toBe(true);
  });

  it('shows no net without both income and spending, and hides the parts that are zero', async () => {
    await mount();
    await add('100', 'e');
    expect(footer()).toContain('รายจ่าย:100.00 ฿');
    expect(footer()).not.toContain('สุทธิ');
    expect(footer()).not.toContain('รายรับ');
    expect(footer()).not.toContain('ลงทุน/ออม');
    await update({ isOpen: false }); // reopening starts with an empty cart
    await update({ isOpen: true });
    click(typeTab('รายรับ')); await add('100', 'i');
    expect(footer()).toContain('รายรับ:+100.00 ฿');
    expect(footer()).not.toContain('สุทธิ');
  });

  // [expense lines, savings lines, income lines]
  it.each<[string[], string[], string[]]>([
    [['0.1', '0.2'], [], ['0.3']],
    [['0.1'], ['0.2'], ['0.3']],
  ])('adds in satang: expense %j, savings %j against income %j nets to exactly +0.00, not −0.00 in red', async (exp, sav, inc) => {
    await mount();
    for (const a of exp) await add(a, `e${a}`);
    click(typeTab('ลงทุน/ออม')); for (const a of sav) await add(a, `s${a}`);
    click(typeTab('รายรับ')); for (const a of inc) await add(a, `i${a}`);
    const net = byText('span', 'สุทธิ:')!.nextElementSibling as HTMLElement;
    expect(net.textContent).toBe('+0.00 ฿');
    expect(net.classList.contains('text-danger')).toBe(false);
  });
});

describe('BatchAddModal — saving', () => {
  it('sends every item as a payload with fresh ids, signed savings amounts and a default dayNote', async () => {
    h.portfolio = { assets: [asset] };
    const onSaveBatch = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    await mount({ onSaveBatch, onClose });
    await add('85.5', 'ชานม');
    click(typeTab('ลงทุน/ออม'));
    click(q('button[aria-label="สินทรัพย์"]'));
    click(byText('[role="option"]', 'กองทุนทดสอบ'));
    click(byText('[role="group"][aria-label="ซื้อหรือขาย"] button', 'ขาย'));
    type(q('#batch-units'), '0.2');
    await add('200', 'ขาย');
    click(typeTab('รายรับ')); await add('1000', 'โบนัส');
    click(saveBtn());
    await flushAll();

    const items = onSaveBatch.mock.calls[0][0];
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ date: DAY, category: 'ค่ากิน', category_id: 'c-food', description: 'ชานม', amount: 85.5, asset_id: null, units: null, allocation_type: 'need', dayNote: '' });
    expect(items[1]).toMatchObject({ category_id: 'c-save', description: 'ขาย', amount: -200, asset_id: 'a1', units: 0.2, allocation_type: 'savings' });
    expect(items[2]).toMatchObject({ category_id: 'c-salary', amount: 1000, asset_id: null, units: null });
    expect(new Set(items.map((i: any) => i.id)).size).toBe(3);
    expect(items.every((i: any) => typeof i.id === 'string' && !i.id.startsWith('temp_'))).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(cartTitles()).toEqual([]); // saved items must not be left in the cart for a second save
  });

  it('a buy stays positive; a savings row with no asset carries no asset or units', async () => {
    const onSaveBatch = vi.fn().mockResolvedValue(undefined);
    await mount({ onSaveBatch });
    click(typeTab('ลงทุน/ออม'));
    await add('500', 'ออม');
    click(saveBtn());
    await flushAll();
    expect(onSaveBatch.mock.calls[0][0][0]).toMatchObject({ amount: 500, asset_id: null, units: null });
  });

  it('an item without an allocation is saved as WANT, never as null', async () => {
    const onSaveBatch = vi.fn().mockResolvedValue(undefined);
    await mount({ onSaveBatch });
    click(typeTab('รายรับ')); await add('1', 'i');
    click(saveBtn());
    await flushAll();
    expect(onSaveBatch.mock.calls[0][0][0].allocation_type).toBe('want');
  });

  it('shows "กำลังบันทึก..." and locks the buttons while the save is running, then closes', async () => {
    let finish!: () => void;
    const onSaveBatch = vi.fn(() => new Promise<void>(r => { finish = r; }));
    const onClose = vi.fn();
    await mount({ onSaveBatch, onClose });
    await add('10', 'a');
    click(saveBtn());
    await flush();
    expect(byText('button', 'กำลังบันทึก...')).not.toBeNull();
    expect((saveBtn() as HTMLButtonElement).disabled).toBe(true);
    expect((discardBtn() as HTMLButtonElement).disabled).toBe(true);
    expect(addBtn().disabled).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => { finish(); await Promise.resolve(); });
    await flush();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('the cart\'s edit and remove buttons are locked while the save is running', async () => {
    let finish!: () => void;
    await mount({ onSaveBatch: vi.fn(() => new Promise<void>(r => { finish = r; })) });
    await add('10', 'a');
    click(saveBtn());
    await flush();
    expect((cartRows()[0].querySelector('[title="แก้ไขรายการนี้"]') as HTMLButtonElement).disabled).toBe(true);
    expect((cartRows()[0].querySelector('[title="ลบรายการนี้"]') as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { finish(); await Promise.resolve(); });
  });

  it('a failed save keeps the whole cart, says why inline and lets the user press save again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onSaveBatch = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(undefined);
    const onClose = vi.fn();
    await mount({ onSaveBatch, onClose });
    await add('10', 'a'); await add('20', 'b');
    click(saveBtn());
    await flushAll();

    expect(onClose).not.toHaveBeenCalled();
    expect(cartTitles()).toEqual(['a', 'b']);
    expect(document.body.textContent).toContain('บันทึกไม่สำเร็จ (network) รายการยังอยู่ในตะกร้า');
    expect((saveBtn() as HTMLButtonElement).disabled).toBe(false);

    click(saveBtn());
    await flushAll();
    expect(onSaveBatch).toHaveBeenCalledTimes(2);
    expect(onSaveBatch.mock.calls[1][0]).toHaveLength(2);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).not.toContain('บันทึกไม่สำเร็จ');
  });

  it('a failure without a message still reports it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await mount({ onSaveBatch: vi.fn().mockRejectedValue({}) });
    await add('10', 'a');
    click(saveBtn());
    await flushAll();
    expect(document.body.textContent).toContain('บันทึกไม่สำเร็จ รายการยังอยู่ในตะกร้า');
    expect(document.body.textContent).not.toContain('()');
  });

  it('the error from an earlier attempt is cleared when saving again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let finish!: () => void;
    const onSaveBatch = vi.fn().mockRejectedValueOnce(new Error('x')).mockImplementationOnce(() => new Promise<void>(r => { finish = r; }));
    await mount({ onSaveBatch });
    await add('10', 'a');
    click(saveBtn());
    await flushAll();
    expect(document.body.textContent).toContain('บันทึกไม่สำเร็จ');
    click(saveBtn());
    await flush();
    expect(document.body.textContent).not.toContain('บันทึกไม่สำเร็จ');
    await act(async () => { finish(); await Promise.resolve(); });
  });

  it('ignores Enter while the save is running, so nothing typed in that moment is wiped when it finishes', async () => {
    let finish!: () => void;
    const onSaveBatch = vi.fn(() => new Promise<void>(r => { finish = r; }));
    await mount({ onSaveBatch });
    await add('10', 'a');
    click(saveBtn());
    await flush();
    type(amountInput(), '99');
    type(descInput(), 'พิมพ์ระหว่างบันทึก');
    key(amountInput(), 'Enter');
    await flushAll();
    expect(cartTitles()).toEqual(['a']); // not added behind the save's back
    expect(amountInput().value).toBe('99'); // and still there for the user
    await act(async () => { finish(); await Promise.resolve(); });
  });

  it('does nothing when the cart is empty', async () => {
    const onSaveBatch = vi.fn();
    await mount({ onSaveBatch });
    click(saveBtn());
    await flush();
    expect(onSaveBatch).not.toHaveBeenCalled();
  });
});
