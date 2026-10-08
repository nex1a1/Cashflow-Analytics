// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import BatchAddModal, { BatchAddModalProps } from '../index';
import { flush, flushAll, click, key, type, q, byText } from '@/test-utils/dom';
import type { CashflowGroup, Category, DayType, FrequentItem } from '@/types';

// The real tree is rendered (form, category picker, date picker, suggestions, recurring panel, cart, footer).
// Only the contexts, the API layer and the clock-independent bits are replaced.
const h = vi.hoisted(() => ({
  portfolio: null as unknown,
  history: [] as any[],
  hidden: [] as string[],
  period: '2026-10',
  saved: [] as Array<[string, unknown]>,
}));
vi.mock('@/context/PortfolioContext', () => ({ usePortfolio: () => ({ portfolio: h.portfolio }) }));
vi.mock('@/context/AppFilterContext', () => ({ useAppFilter: () => ({ filterPeriod: h.period }) }));
vi.mock('@/services/api', () => ({
  transactionService: { getAll: () => Promise.resolve(h.history) },
  settingsService: {
    getAll: () => Promise.resolve({ recurring_hidden: h.hidden }),
    save: (k: string, v: unknown) => { h.saved.push([k, v]); return Promise.resolve({ success: true }); },
  },
}));

const DAY = '2026-10-07'; // a Wednesday

const groups: CashflowGroup[] = [
  { id: 'g-inc', name: 'รายรับ', type: 'income', allocation_type: null, order_index: 1 },
  { id: 'g-exp', name: 'รายจ่ายประจำวัน', type: 'expense', allocation_type: 'need', order_index: 2 },
  { id: 'g-sav', name: 'ลงทุน', type: 'savings', allocation_type: 'savings', order_index: 3 },
];
const categories: Category[] = [
  { id: 'c-food', name: 'ค่ากิน', type: 'expense', order_index: 1, cashflow_group_id: 'g-exp', allocation_type: 'need' },
  { id: 'c-fun', name: 'บันเทิง', type: 'expense', order_index: 2, cashflow_group_id: 'g-exp', allocation_type: 'want' },
  { id: 'c-salary', name: 'เงินเดือน', type: 'income', order_index: 3, cashflow_group_id: 'g-inc' },
  { id: 'c-save', name: 'ออมทอง', type: 'savings', order_index: 4, cashflow_group_id: 'g-sav', allocation_type: 'savings' },
];
const dayTypeConfig: DayType[] = [
  { id: 'dt-work', name: 'workday', label: 'วันทำงาน', color: '#10B981' },
  { id: 'dt-hol', name: 'holiday', label: 'วันหยุด', color: '#DA291C' },
];
const asset = {
  id: 'a1', name: 'กองทุนทดสอบ', kind: 'fund', symbol: null, unitLabel: 'หน่วย', autoPrice: false, units: 0.3, cost: 300,
  avgCostPerUnit: 1000, price: null, priceAt: null, priceSource: null, marketValue: null, unrealized: null, unrealizedPct: null,
  realized: 0, oversold: false, trades: [],
};

let root: Root | null = null;
let container: HTMLElement | null = null;
let props: BatchAddModalProps;
const baseProps = (): BatchAddModalProps => ({
  isOpen: true, onClose: vi.fn(), onSaveBatch: vi.fn().mockResolvedValue(undefined),
  categories, cashflowGroups: groups, dayTypeConfig, defaultDate: DAY,
});
const render = () => act(() => root!.render(<BatchAddModal {...props} />));

async function mount(p: Partial<BatchAddModalProps> = {}) {
  props = { ...baseProps(), ...p };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  render();
  await flush();
}
/** Re-renders with changed props (same root, so the modal keeps its state like it does in the app). */
/** Real wait inside act (for the form's delayed focus). */
const wait = (ms: number) => act(async () => { await new Promise(r => setTimeout(r, ms)); });
const update = async (p: Partial<BatchAddModalProps>) => { props = { ...props, ...p }; render(); await flush(); };

const dialog = () => q('[role="dialog"]');
const amountInput = () => q<HTMLInputElement>('#batch-amount')!;
const descInput = () => q<HTMLInputElement>('#batch-description')!;
const typeTab = (label: string) => byText('form button', label)!;
const addBtn = () => byText('button', 'เพิ่มลงตะกร้า (Enter)') as HTMLButtonElement;
const saveBtn = () => byText('button', 'บันทึกทั้งหมด') ?? byText('button', 'กำลังบันทึก...');
const discardBtn = () => byText('button', 'ทิ้งข้อมูล')!;
const closeX = () => q('button[title="ปิดหน้าต่าง"]')!;
const categoryTrigger = () => q<HTMLButtonElement>('#batch-category')!;
const cartRows = () => [...document.querySelectorAll<HTMLElement>('[title="ลบรายการนี้"]')].map(b => b.closest('.flex.items-center.justify-between') as HTMLElement);
const cartTitles = () => cartRows().map(r => r.querySelector('.font-bold.text-xs')!.firstElementChild!.textContent);
const cartText = () => cartRows().map(r => r.textContent!);
/** The kind badge of a cart row (รายรับ / รายจ่าย / ซื้อ · … / ขาย · …). Not the whole row: the group name can contain the same word. */
const badge = (i: number) => cartRows()[i].querySelector('span[class*="h-[22px]"]')!.textContent;
const guard = () => q('[role="alert"]');
const footer = () => byText('span', 'ยอดรวมในตะกร้า:')!.parentElement!.textContent!;

/** Fills the form like a user and presses the add button. */
async function add(amount: string, description = '') {
  type(amountInput(), amount);
  if (description) type(descInput(), description);
  click(addBtn());
  await flushAll();
}
/** Opens the category popover and picks `name`. */
async function pickCategory(name: string) {
  click(categoryTrigger());
  await flush();
  click(byText('[class*="text-xs font-semibold"]', name)!.closest('button'));
  await flush();
}

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn(); // not implemented by jsdom
  window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as any;
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any;
});
beforeEach(() => { h.history = []; h.hidden = []; h.period = '2026-10'; h.saved = []; });
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
  h.portfolio = null;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('BatchAddModal — opening', () => {
  it('renders nothing while closed', async () => {
    await mount({ isOpen: false });
    expect(dialog()).toBeNull();
    expect(document.body.textContent).toBe('');
  });

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
    props = { ...props, isOpen: true, defaultType: 'savings', defaultCategory: 'c-save', defaultAssetId: 'a1', defaultSide: 'sell' };
    render();
    await wait(150);
    expect(typeTab('ลงทุน/ออม').className).toContain('text-savings');
    expect(categoryTrigger().textContent).toContain('ออมทอง');
    expect(q('button[aria-label="สินทรัพย์"]')!.textContent).toContain('กองทุนทดสอบ');
    expect(byText('[role="group"][aria-label="ซื้อหรือขาย"] button', 'ขาย')!.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(amountInput());
  });

  it('accepts the default category by name too, and falls back to the first category of the type when it is unknown', async () => {
    await mount({ isOpen: false });
    props = { ...props, isOpen: true, defaultCategory: 'บันเทิง' };
    render();
    await wait(150);
    expect(categoryTrigger().textContent).toContain('บันเทิง');

    act(() => root!.unmount()); container!.remove();
    await mount({ isOpen: false });
    props = { ...props, isOpen: true, defaultType: 'income', defaultCategory: 'ไม่มีหมวดนี้' };
    render();
    await wait(150);
    expect(categoryTrigger().textContent).toContain('เงินเดือน');
  });

  it('reopening starts clean: an empty cart and the new defaults', async () => {
    await mount();
    await add('50', 'ข้าว');
    expect(cartTitles()).toEqual(['ข้าว']);
    await update({ isOpen: false });
    expect(dialog()).toBeNull();
    await update({ isOpen: true, defaultType: 'income' });
    expect(cartTitles()).toEqual([]);
    expect(typeTab('รายรับ').className).toContain('text-emerald-400');
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

  it('without a given date the form starts on today (local, zero-padded)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 4, 23, 30)); // 4 March, late evening
    await mount({ defaultDate: undefined });
    await add('1');
    expect(cartText()[0]).toContain('2026-03-04');
  });

  it('puts the cursor back in the amount field after an add, ready for the next line', async () => {
    await mount();
    await add('1');
    await wait(40);
    expect(document.activeElement).toBe(amountInput());
  });

  it('uses the category name when the description is left empty', async () => {
    await mount();
    await add('10');
    expect(cartTitles()).toEqual(['ค่ากิน']);
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

  it('keeps the date, category and type after an add so the next line can follow straight away', async () => {
    await mount();
    await pickCategory('บันเทิง');
    await add('100');
    expect(categoryTrigger().textContent).toContain('บันเทิง');
    await add('200');
    expect(cartText().map(t => t.includes('บันเทิง'))).toEqual([true, true]);
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

  it('refuses a row with no category (a type that has none yet) and says so', async () => {
    await mount({ categories: categories.filter(c => c.type !== 'savings') });
    click(typeTab('ลงทุน/ออม'));
    await add('100');
    expect(document.body.textContent).toContain('กรุณาเลือกหมวดหมู่');
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

  it('the category picker offers only the categories of the form type', async () => {
    await mount();
    click(categoryTrigger());
    await flush();
    const names = [...document.querySelectorAll('[class*="text-xs font-semibold"]')].map(e => e.textContent);
    expect(names).toEqual(['ค่ากิน', 'บันเทิง']);
  });

  it('…and after switching type it offers the categories of the new type', async () => {
    await mount();
    click(typeTab('รายรับ'));
    await flush();
    click(categoryTrigger());
    await flush();
    expect([...document.querySelectorAll('[class*="text-xs font-semibold"]')].map(e => e.textContent)).toEqual(['เงินเดือน']);
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

  it('switching to savings picks the first savings category and shows the asset fields', async () => {
    h.portfolio = { assets: [asset] };
    await mount();
    expect(q('button[aria-label="สินทรัพย์"]')).toBeNull();
    click(typeTab('ลงทุน/ออม'));
    await flush();
    expect(categoryTrigger().textContent).toContain('ออมทอง');
    expect(q('button[aria-label="สินทรัพย์"]')).not.toBeNull();
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

  it('a category\'s own allocation is applied when it is picked, and the NEED/WANT/SAVE buttons override it', async () => {
    await mount();
    const selected = () => ['NEED', 'WANT', 'SAVE'].filter(l => byText('button', l)!.className.includes('bg-surface-elevated ') || byText('button', l)!.classList.contains('bg-surface-elevated'));
    await pickCategory('ค่ากิน');
    expect(selected()).toEqual(['NEED']);
    await pickCategory('บันเทิง');
    expect(selected()).toEqual(['WANT']);
    click(byText('button', 'SAVE'));
    await flush();
    expect(selected()).toEqual(['SAVE']);
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

describe('BatchAddModal — dates', () => {
  it('the arrows step the form date by one day, and "วันนี้" jumps to today', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 20, 12, 0, 0));
    await mount();
    click(q('button[title^="วันก่อนหน้า"]'));
    await add('1', 'ก่อน');
    click(q('button[title^="วันถัดไป"]'));
    click(q('button[title^="วันถัดไป"]'));
    await add('2', 'ถัดไป');
    click(q('button[title="เลือกวันนี้"]'));
    await add('3', 'วันนี้');
    expect(cartText().map(t => t.match(/\d{4}-\d{2}-\d{2}/)![0])).toEqual(['2026-10-06', '2026-10-08', '2026-10-20']);
  });

  it('a day picked in the calendar popup becomes the form date', async () => {
    await mount();
    click(byText('span', 'วันที่')!.closest('.flex-1')!.querySelector('div.relative > button'));
    await flush();
    click([...document.querySelectorAll('button')].find(b => b.textContent === '15'));
    await add('1', 'กลางเดือน');
    expect(cartText()[0]).toContain('2026-10-15');
  });

  it('the arrows also cross a month end', async () => {
    await mount({ defaultDate: '2026-10-31' });
    click(q('button[title^="วันถัดไป"]'));
    await add('1');
    expect(cartText()[0]).toContain('2026-11-01');
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

describe('BatchAddModal — the cart', () => {
  it('numbers the items in the order they were added', async () => {
    await mount();
    await add('1', 'a'); await add('2', 'b'); await add('3', 'c');
    expect(cartRows().map(r => r.textContent!.slice(0, 2))).toEqual(['1.', '2.', '3.']);
    expect(document.body.textContent).toContain('3 รายการ');
  });

  it('removes one item and keeps the rest', async () => {
    await mount();
    await add('1', 'a'); await add('2', 'b'); await add('3', 'c');
    click(cartRows()[1].querySelector('[title="ลบรายการนี้"]'));
    expect(cartTitles()).toEqual(['a', 'c']);
    expect(document.body.textContent).toContain('2 รายการ');
  });

  it('scrolls the newest item into view only when something was added', async () => {
    const scroll = vi.mocked(Element.prototype.scrollIntoView);
    scroll.mockClear();
    await mount();
    await add('1', 'a');
    expect(scroll).toHaveBeenCalledTimes(1);
    await add('2', 'b');
    expect(scroll).toHaveBeenCalledTimes(2);
    click(cartRows()[0].querySelector('[title="ลบรายการนี้"]')); // one of two left: the list is still there, but nothing new to scroll to
    expect(scroll).toHaveBeenCalledTimes(2);
  });

  it('colours amounts: expense red, income green, savings its own tone', async () => {
    h.portfolio = { assets: [asset] };
    await mount();
    await add('1', 'จ่าย');
    click(typeTab('รายรับ')); await add('2', 'รับ');
    click(typeTab('ลงทุน/ออม')); await add('3', 'ออม');
    click(byText('[role="group"][aria-label="ซื้อหรือขาย"] button', 'ขาย')); await add('4', 'ขาย');
    const amountSpan = (i: number) => cartRows()[i].querySelector<HTMLElement>('.tabular-nums')!;
    expect(amountSpan(0).classList.contains('text-expense')).toBe(true);
    expect(amountSpan(1).classList.contains('text-emerald-400')).toBe(true);
    expect(amountSpan(2).classList.contains('text-savings')).toBe(true);
    expect(amountSpan(3).classList.contains('text-info')).toBe(true); // a sell reads differently from a buy
  });
});

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

  it('editing keeps the allocation the item had instead of re-deriving it from the category', async () => {
    const onSaveBatch = vi.fn().mockResolvedValue(undefined);
    await mount({ onSaveBatch });
    click(byText('button', 'WANT')); // ค่ากิน is a NEED category; the user overrides it
    await add('70', 'ของกิน');
    click(editBtn(0));
    await flush();
    type(amountInput(), '75');
    click(byText('button', 'บันทึกแก้ไข (Enter)'));
    await flushAll();
    click(saveBtn());
    await flushAll();
    expect(onSaveBatch.mock.calls[0][0][0]).toMatchObject({ amount: 75, allocation_type: 'want' });
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

  it('removing the item being edited leaves edit mode', async () => {
    await mount();
    await add('10', 'a');
    click(editBtn(0));
    await flush();
    click(cartRows()[0].querySelector('[title="ลบรายการนี้"]'));
    await flush();
    expect(addBtn()).not.toBeNull();
    expect(cartTitles()).toEqual([]);
  });

  it('removing a different item keeps the edit going', async () => {
    await mount();
    await add('10', 'a'); await add('20', 'b');
    click(editBtn(0));
    await flush();
    click(cartRows()[1].querySelector('[title="ลบรายการนี้"]'));
    await flush();
    expect(byText('button', 'บันทึกแก้ไข (Enter)')).not.toBeNull();
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

  it('the allocation can be changed while editing', async () => {
    const onSaveBatch = vi.fn().mockResolvedValue(undefined);
    await mount({ onSaveBatch });
    await add('10', 'a'); // ค่ากิน → NEED
    click(editBtn(0));
    await flush();
    click(byText('button', 'WANT'));
    click(byText('button', 'บันทึกแก้ไข (Enter)'));
    await flushAll();
    click(saveBtn());
    await flushAll();
    expect(onSaveBatch.mock.calls[0][0][0].allocation_type).toBe('want');
  });

  it('editing loads the item\'s own allocation, not whatever the form was last set to', async () => {
    const onSaveBatch = vi.fn().mockResolvedValue(undefined);
    await mount({ onSaveBatch });
    click(byText('button', 'WANT'));
    await add('70', 'ของกิน'); // WANT on a NEED category
    click(byText('button', 'NEED')); // the form moves on to NEED …
    click(editBtn(0));
    await flush();
    expect(byText('button', 'WANT')!.classList.contains('text-amber-400')).toBe(true); // … but the item being edited is WANT
    expect(byText('button', 'NEED')!.classList.contains('text-rose-400')).toBe(false);
    click(byText('button', 'บันทึกแก้ไข (Enter)'));
    await flushAll();
    click(saveBtn());
    await flushAll();
    expect(onSaveBatch.mock.calls[0][0][0].allocation_type).toBe('want');
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

  it('a modal closed from outside while an item is being edited reopens in add mode with an empty cart', async () => {
    await mount();
    await add('10', 'a');
    click(editBtn(0));
    await flush();
    await update({ isOpen: false });
    await update({ isOpen: true });
    expect(addBtn()).not.toBeNull();
    expect(byText('button', 'บันทึกแก้ไข (Enter)')).toBeNull();
    expect(cartTitles()).toEqual([]);
  });

  it('an income comes back as an income', async () => {
    await mount();
    click(typeTab('รายรับ'));
    await add('900', 'โบนัส');
    click(typeTab('รายจ่าย'));
    click(editBtn(0));
    await flush();
    expect(typeTab('รายรับ').className).toContain('text-emerald-400');
    expect(categoryTrigger().textContent).toContain('เงินเดือน');
    expect(badge(0)).toBe('รายรับ');
  });

  it('an item keeps its own date even when the form date has moved on since', async () => {
    await mount();
    await add('10', 'a');
    click(q('button[title^="วันถัดไป"]'));
    click(q('button[title^="วันถัดไป"]'));
    click(editBtn(0));
    await flush();
    click(byText('button', 'บันทึกแก้ไข (Enter)'));
    await flushAll();
    expect(cartText()[0]).toContain(DAY);
  });

  it('an item can be moved to another day by editing its date', async () => {
    await mount();
    await add('10', 'a');
    click(editBtn(0));
    await flush();
    click(q('button[title^="วันถัดไป"]'));
    click(byText('button', 'บันทึกแก้ไข (Enter)'));
    await flushAll();
    expect(cartText()[0]).toContain('2026-10-08');
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

  it('shows no net when there is no income, and hides the parts that are zero', async () => {
    await mount();
    await add('100', 'e');
    expect(footer()).toContain('รายจ่าย:100.00 ฿');
    expect(footer()).not.toContain('สุทธิ');
    expect(footer()).not.toContain('รายรับ');
    expect(footer()).not.toContain('ลงทุน/ออม');
  });

  it('adds in satang: 0.10 + 0.20 of expense against 0.30 of income nets to exactly 0.00, not −0.00 in red', async () => {
    await mount();
    await add('0.1', 'a'); await add('0.2', 'b');
    click(typeTab('รายรับ')); await add('0.3', 'i');
    const net = byText('span', 'สุทธิ:')!.nextElementSibling as HTMLElement;
    expect(net.textContent).toBe('+0.00 ฿');
    expect(net.classList.contains('text-danger')).toBe(false);
  });

  it('also when the parts are separate lines: income 0.30, expense 0.10, savings 0.20 net to +0.00', async () => {
    await mount();
    await add('0.1', 'e');
    click(typeTab('ลงทุน/ออม')); await add('0.2', 's');
    click(typeTab('รายรับ')); await add('0.3', 'i');
    const net = byText('span', 'สุทธิ:')!.nextElementSibling as HTMLElement;
    expect(net.textContent).toBe('+0.00 ฿');
    expect(net.classList.contains('text-danger')).toBe(false);
  });

  it('income alone has no net either', async () => {
    await mount();
    click(typeTab('รายรับ')); await add('100', 'i');
    expect(footer()).toContain('รายรับ:+100.00 ฿');
    expect(footer()).not.toContain('สุทธิ');
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

  it('with items, the first close only arms a warning that counts the items', async () => {
    const onClose = vi.fn();
    await mount({ onClose });
    await add('1', 'a'); await add('2', 'b');
    click(closeX());
    expect(onClose).not.toHaveBeenCalled();
    expect(guard()).not.toBeNull();
    expect(guard()!.textContent).toContain('ยังมี 2 รายการในตะกร้าที่ยังไม่บันทึก');
    expect(cartTitles()).toEqual(['a', 'b']);
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

  it('Esc does nothing once the modal is closed', async () => {
    const onClose = vi.fn();
    await mount({ onClose });
    await update({ isOpen: false });
    key(document.body, 'Escape');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Esc inside the category picker closes only the picker', async () => {
    const onClose = vi.fn();
    await mount({ onClose });
    click(categoryTrigger());
    await flush();
    const search = q<HTMLInputElement>('input[placeholder^="พิมพ์ค้นหาหมวดหมู่"]')!;
    key(search, 'Escape');
    expect(q('input[placeholder^="พิมพ์ค้นหาหมวดหมู่"]')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('BatchAddModal — quick suggestions', () => {
  const frequent: FrequentItem[] = [
    { categoryId: 'c-food', categoryName: 'ค่ากิน', description: 'ข้าวมันไก่', amount: 60, allocation_type: 'need', count: 5, lastDate: '2026-10-01' },
    { categoryId: 'c-salary', categoryName: 'เงินเดือน', description: 'เงินเดือน', amount: 30000, allocation_type: null, count: 9, lastDate: '2026-09-25' },
  ];
  const items = () => [...document.querySelectorAll<HTMLElement>('.sugg-item')];

  it('lists only the suggestions that fit the form type and follows the type toggle', async () => {
    await mount({ frequentItems: frequent });
    expect(items().map(i => i.textContent)).toEqual([expect.stringContaining('ข้าวมันไก่')]);
    click(typeTab('รายรับ'));
    await flush();
    expect(items().map(i => i.textContent)).toEqual([expect.stringContaining('เงินเดือน')]);
  });

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

  it('a filter chosen in the suggestion panel is cleared when the modal is opened again', async () => {
    await mount({ frequentItems: frequent });
    const clearAll = () => [...document.querySelectorAll('button')].some(b => b.textContent?.trim() === 'ล้างทั้งหมด');
    expect(clearAll()).toBe(false);
    click(q('button[title="ตัวกรองเพิ่มเติม"]'));
    click(byText('button', 'รายจ่ายประจำวัน'));
    click(byText('button', 'ค่ากิน'));
    click(q('button[title="ปิดหน้าต่างตัวกรอง"]'));
    expect(clearAll()).toBe(true);

    await update({ isOpen: false });
    await update({ isOpen: true });
    expect(clearAll()).toBe(false);
  });

  it('keeps the suggestion\'s own allocation instead of replacing it with the category\'s', async () => {
    const wantFood: FrequentItem[] = [{ ...frequent[0], allocation_type: 'want' }];
    await mount({ frequentItems: wantFood });
    await pickCategory('บันเทิง'); // so the suggestion really changes the category (ค่ากิน is a NEED category)
    click(items()[0]);
    await flushAll();
    expect(categoryTrigger().textContent).toContain('ค่ากิน');
    const onSaveBatch = props.onSaveBatch as ReturnType<typeof vi.fn>;
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
  const panelButton = () => byText('button', 'รายการประจำ') ?? [...document.querySelectorAll<HTMLElement>('button[aria-expanded]')][0];
  const recurringTrigger = () => [...document.querySelectorAll<HTMLElement>('button[aria-expanded]')].find(b => b.textContent!.includes('รายการประจำ'))!;
  const panel = () => q('section[aria-label^="รายการประจำ"]');
  /** Opens the panel. jsdom has no stylesheet, so the host's computed padding is '' and the panel height would be NaN — give it one. */
  const openRecurring = async () => {
    recurringTrigger().parentElement!.parentElement!.style.paddingBottom = '0px';
    click(recurringTrigger());
    await flush();
  };

  it('shows nothing when there is no recurring history', async () => {
    await mount();
    await flush();
    expect(recurringTrigger()).toBeUndefined();
  });

  it('counts what is missing for the month of the form date', async () => {
    h.history = [...rent, ...power];
    await mount();
    await flushAll();
    expect(recurringTrigger().textContent).toContain('ขาด 2');
  });

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

  it('follows the form date: stepping into November asks about November\'s rent', async () => {
    h.history = [...rent];
    await mount({ defaultDate: '2026-10-31' });
    await flushAll();
    await openRecurring();
    click(byText('button', 'เติม 1 รายการที่ยังขาด'));
    await flushAll();
    expect(recurringTrigger().textContent).toContain('ครบ 1');
    click(q('button[title^="วันถัดไป"]')); // 31 Oct → 1 Nov
    await flushAll();
    expect(recurringTrigger().textContent).toContain('ขาด 1');
  });

  it('a sell of the same savings line in the cart does not count as the monthly buy being recorded', async () => {
    h.history = ['2026-07-25', '2026-08-25', '2026-09-25'].map((d, i) => hist(`s${i}`, d, 'c-save', 'ออมทุกเดือน', 1000));
    await mount();
    await flushAll();
    click(typeTab('ลงทุน/ออม'));
    click(byText('[role="group"][aria-label="ซื้อหรือขาย"] button', 'ขาย'));
    await add('1000', 'ออมทุกเดือน');
    expect(cartText()[0]).toContain('ขาย');
    expect(recurringTrigger().textContent).toContain('ขาด 1');
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
