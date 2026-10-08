// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import DayDetailModal, { DayDetailModalProps } from '../index';
import { flush, flushAll, click, key, type, q, byText } from '@/test-utils/dom';
import type { CashflowGroup, Category, DayType, FrequentItem, TransactionDisplay } from '@/types';

// The real modal tree is rendered (form, list, note field, suggestions, delete button). Only the two contexts it
// reads and the API layer are replaced, so nothing here depends on a provider stack or a network.
const h = vi.hoisted(() => ({ portfolio: null as unknown }));
vi.mock('@/context/PortfolioContext', () => ({ usePortfolio: () => ({ portfolio: h.portfolio }) }));
vi.mock('@/context/AppFilterContext', () => ({ useAppFilter: () => ({ filterPeriod: '2026-10' }) }));
vi.mock('@/services/api', () => ({
  transactionService: { getAll: () => Promise.resolve([]) },
  settingsService: { getAll: () => Promise.resolve({}), save: () => Promise.resolve() },
}));

const DAY = '2026-10-07'; // a Wednesday
const SAT = '2026-10-10';

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

const tx = (id: string, category: string, category_id: string, amount: number, description: string, extra: Partial<TransactionDisplay> = {}): TransactionDisplay =>
  ({ id, date: DAY, category, category_id, description, amount, ...extra });
const dayRows: TransactionDisplay[] = [
  tx('t1', 'ค่ากิน', 'c-food', 120, 'ข้าวมันไก่', { allocation_type: 'need' }),
  tx('t2', 'ค่ากิน', 'c-food', 65, 'กาแฟ', { allocation_type: 'need' }),
  tx('t3', 'บันเทิง', 'c-fun', 300, 'ดูหนัง', { allocation_type: 'want' }),
  tx('t4', 'เงินเดือน', 'c-salary', 1000, 'โบนัส'),
  tx('t5', 'ออมทอง', 'c-save', 500, 'ซื้อ', { asset_id: 'a1', units: 0.5, allocation_type: 'savings' }),
  tx('t6', 'ออมทอง', 'c-save', -200, 'ขาย', { asset_id: 'a1', units: 0.2, allocation_type: 'savings' }),
  { ...tx('t7', 'ค่ากิน', 'c-food', 999, 'พรุ่งนี้'), date: '2026-10-08' }, // another day: must not show on DAY
];

let root: Root | null = null;
let container: HTMLElement | null = null;

async function mount(props: Partial<DayDetailModalProps> = {}) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  const full = (p: Partial<DayDetailModalProps>): DayDetailModalProps => ({
    dateStr: DAY,
    transactions: dayRows,
    categories,
    cashflowGroups: groups,
    dayTypeConfig,
    onClose: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn(),
    ...p,
  });
  const render = (p: Partial<DayDetailModalProps>) => act(() => root!.render(<DayDetailModal {...full(p)} />));
  render(props);
  await flush();
  return { rerender: async (p: Partial<DayDetailModalProps>) => { render({ ...props, ...p }); await flush(); } };
}

const rowTitles = () => [...document.querySelectorAll('p.truncate')].map(p => p.textContent);
const headings = () => [...document.querySelectorAll('p')].map(p => p.textContent?.trim() ?? '');
const chip = (label: string) => {
  const el = [...document.querySelectorAll('span')].find(s => s.firstElementChild?.tagName === 'SPAN' && s.firstElementChild.textContent === label);
  return el ? el.textContent!.replace(label, '').trim() : undefined;
};
const amountInput = () => q<HTMLInputElement>('input[aria-label="จำนวนเงิน"]')!;
const descInput = () => q<HTMLInputElement>('input[placeholder="รายละเอียด..."]')!;
const saveBtn = () => [...document.querySelectorAll<HTMLButtonElement>('button[type="submit"]')][0];
const formTab = (label: string) => [...document.querySelectorAll<HTMLElement>('form button')].find(b => b.textContent?.trim() === label)!;
const noteInput = () => q<HTMLInputElement>('input[aria-label="โน้ตประจำวัน"]');

beforeAll(() => {
  // not implemented by jsdom
  Element.prototype.scrollIntoView = vi.fn();
  window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as any;
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any;
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
  h.portfolio = null;
  vi.restoreAllMocks();
});

describe('DayDetailModal — header and summary', () => {
  it('shows the Thai date and weekday for the active day', async () => {
    await mount();
    expect(q('[role="dialog"]')!.getAttribute('aria-label')).toBe('รายละเอียดรายวัน');
    expect(q('h2')!.textContent).toBe('7 ตุลาคม 2026');
    expect(document.body.textContent).toContain('วันพุธ');
  });

  it('adds up only that day: income, expense, net savings (a sell subtracts) and what is left', async () => {
    await mount();
    expect(chip('รับ')).toBe('+฿1,000.00');
    expect(chip('จ่าย')).toBe('−฿485.00'); // 120 + 65 + 300, not the 999 from tomorrow
    expect(chip('ลงทุน/ออม')).toBe('฿300.00'); // 500 buy − 200 sell
    expect(chip('สุทธิ')).toBe('+฿215.00'); // 1000 − 485 − 300
  });

  it('flags a negative net in the danger colour and prefixes it with a minus', async () => {
    await mount({ transactions: [tx('x1', 'ค่ากิน', 'c-food', 50, 'ข้าว')] });
    expect(chip('สุทธิ')).toBe('−฿50.00');
    const net = [...document.querySelectorAll('span')].find(s => s.firstElementChild?.textContent === 'สุทธิ')!;
    expect(net.className).toContain('text-danger');
  });

  it('lists only that day, grouped and counted, with the asset and units on trade rows', async () => {
    h.portfolio = { assets: [asset] };
    await mount();
    expect(headings()).toEqual(expect.arrayContaining(['รายรับ (1)', 'รายจ่าย (3)', 'ลงทุน/ออม (2)']));
    expect(rowTitles()).not.toContain('พรุ่งนี้');
    const badges = [...document.querySelectorAll('span')].map(s => s.textContent);
    expect(badges).toContain('ซื้อ · กองทุนทดสอบ · 0.5');
    expect(badges).toContain('ขาย · กองทุนทดสอบ · 0.2');
  });

  it('shows the empty state and hides the HUD and sort controls on an empty day', async () => {
    await mount({ transactions: [] });
    expect(document.body.textContent).toContain('ยังไม่มีรายการ');
    expect(chip('สุทธิ')).toBeUndefined();
    expect(byText('span', 'เรียงตาม')).toBeNull();
  });
});

describe('DayDetailModal — sorting', () => {
  it('orders by category order first, then switches to amount when asked', async () => {
    await mount();
    const order = (title: string[]) => title.filter(t => ['ข้าวมันไก่', 'กาแฟ', 'ดูหนัง'].includes(t!));
    expect(order(rowTitles() as string[])).toEqual(['ข้าวมันไก่', 'กาแฟ', 'ดูหนัง']);

    click(q('button[aria-label="เรียงตามจำนวนเงิน"]'));
    expect(q('button[aria-label="เรียงตามจำนวนเงิน"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(q('button[aria-label="เรียงตามหมวดหมู่"]')!.getAttribute('aria-pressed')).toBe('false');
    expect(order(rowTitles() as string[])).toEqual(['ดูหนัง', 'ข้าวมันไก่', 'กาแฟ']);

    click(q('button[aria-label="เรียงตามหมวดหมู่"]'));
    expect(order(rowTitles() as string[])).toEqual(['ข้าวมันไก่', 'กาแฟ', 'ดูหนัง']);
  });
});

describe('DayDetailModal — day type fallback', () => {
  it('falls back to the workday type on a weekday and to holiday on a weekend when nothing is stored', async () => {
    await mount({ transactions: [] });
    expect(byText('span', 'วันทำงาน')).not.toBeNull();
    expect(byText('span', 'วันหยุด')).toBeNull();
    act(() => root!.unmount()); container!.remove();

    await mount({ dateStr: SAT, transactions: [] });
    expect(byText('span', 'วันหยุด')).not.toBeNull();
  });

  it('prefers the stored day type over the fallback', async () => {
    await mount({ transactions: [], dayTypes: { [DAY]: 'dt-hol' } });
    expect(byText('span', 'วันหยุด')).not.toBeNull();
    expect(byText('span', 'วันทำงาน')).toBeNull();
  });
});

describe('DayDetailModal — closing and navigating', () => {
  it('closes with the X button and with Esc', async () => {
    const onClose = vi.fn();
    await mount({ onClose });
    click(q('button[title="ปิด"]'));
    expect(onClose).toHaveBeenCalledTimes(1);
    key(document.body, 'Escape');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('steps to the next / previous day, reports it and shows that day\'s rows', async () => {
    const onDateChange = vi.fn();
    await mount({ onDateChange });
    click(q('button[title^="วันถัดไป"]'));
    expect(onDateChange).toHaveBeenLastCalledWith('2026-10-08');
    expect(q('h2')!.textContent).toBe('8 ตุลาคม 2026');
    expect(rowTitles()).toEqual(['พรุ่งนี้']);

    click(q('button[title^="วันก่อนหน้า"]'));
    expect(onDateChange).toHaveBeenLastCalledWith('2026-10-07');
    expect(q('h2')!.textContent).toBe('7 ตุลาคม 2026');
  });

  it('follows a dateStr that changes from outside', async () => {
    const { rerender } = await mount({ transactions: [] });
    await rerender({ dateStr: '2027-01-02' });
    expect(q('h2')!.textContent).toBe('2 มกราคม 2027');
  });
});

describe('DayDetailModal — adding an item', () => {
  it('saves an expense with the form\'s category, allocation and a baht amount, then clears the form', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    await mount({ transactions: [], onSave });
    type(amountInput(), '85.5');
    type(descInput(), 'ชานม');
    click(saveBtn());
    await flushAll();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({
      date: DAY, category: 'ค่ากิน', category_id: 'c-food', description: 'ชานม', amount: 85.5,
      allocation_type: 'need', asset_id: null, units: null,
    });
    expect(typeof onSave.mock.calls[0][0].id).toBe('string');
    expect(amountInput().value).toBe('');
    expect(descInput().value).toBe('');
  });

  it('uses the category name when the description is left empty', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    await mount({ transactions: [], onSave });
    type(amountInput(), '10');
    click(saveBtn());
    await flushAll();
    expect(onSave.mock.calls[0][0].description).toBe('ค่ากิน');
  });

  it('submits with Enter in the amount field', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    await mount({ transactions: [], onSave });
    type(amountInput(), '40');
    key(amountInput(), 'Enter');
    await flushAll();
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('shows an inline error and saves nothing for an empty or zero amount', async () => {
    const onSave = vi.fn();
    await mount({ transactions: [], onSave });
    click(saveBtn());
    await flushAll();
    expect(document.body.textContent).toContain('ระบุจำนวนเงิน');
    expect(amountInput().getAttribute('aria-invalid')).toBe('true');

    type(amountInput(), '0');
    click(saveBtn());
    await flushAll();
    expect(document.body.textContent).toContain('ต้องมากกว่า 0');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows the pending row at once and removes it when the parent has finished saving', async () => {
    let resolve!: () => void;
    const onSave = vi.fn(() => new Promise<void>(r => { resolve = r; }));
    await mount({ transactions: [], onSave });
    type(amountInput(), '85.5');
    type(descInput(), 'ชานม');
    click(saveBtn());
    await flushAll();

    expect(rowTitles()).toContain('ชานม'); // optimistic row, parent has not stored it yet
    expect(saveBtn().disabled).toBe(true);
    expect(saveBtn().textContent).toContain('กำลังบันทึก');

    resolve();
    await flushAll();
    expect(rowTitles()).not.toContain('ชานม'); // from here on it would come back through `transactions`
    expect(saveBtn().disabled).toBe(false);
  });

  it('keeps what was typed and says so inline when the save fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onSave = vi.fn().mockRejectedValue(new Error('network'));
    await mount({ transactions: [], onSave });
    type(amountInput(), '85.5');
    type(descInput(), 'ชานม');
    click(saveBtn());
    await flushAll();

    expect(document.body.textContent).toContain('บันทึกไม่สำเร็จ ข้อมูลที่กรอกยังอยู่');
    expect(amountInput().value).toBe('85.5');
    expect(descInput().value).toBe('ชานม');
    expect(rowTitles()).not.toContain('ชานม'); // the optimistic row is rolled back
  });

  it('saves a plain savings row as a positive amount without an asset', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    await mount({ transactions: [], onSave });
    click(formTab('ลงทุน/ออม'));
    type(amountInput(), '500');
    click(saveBtn());
    await flushAll();
    expect(onSave.mock.calls[0][0]).toMatchObject({ category_id: 'c-save', amount: 500, asset_id: null, units: null, allocation_type: 'savings' });
  });

  it('saves a sell as a negative amount tied to the chosen asset and units', async () => {
    h.portfolio = { assets: [asset] };
    const onSave = vi.fn().mockResolvedValue(undefined);
    await mount({ transactions: [], onSave });
    click(formTab('ลงทุน/ออม'));

    click(q('button[aria-label="สินทรัพย์"]'));
    click(byText('[role="option"]', 'กองทุนทดสอบ'));
    click(byText('[role="group"][aria-label="ซื้อหรือขาย"] button', 'ขาย'));
    type(q('#daily-units'), '0.2');
    type(amountInput(), '200');
    click(saveBtn());
    await flushAll();

    expect(onSave.mock.calls[0][0]).toMatchObject({ category_id: 'c-save', amount: -200, asset_id: 'a1', units: 0.2, allocation_type: 'savings' });
  });

  it('refuses an asset trade without units and says why', async () => {
    h.portfolio = { assets: [asset] };
    const onSave = vi.fn();
    await mount({ transactions: [], onSave });
    click(formTab('ลงทุน/ออม'));
    click(q('button[aria-label="สินทรัพย์"]'));
    click(byText('[role="option"]', 'กองทุนทดสอบ'));
    type(amountInput(), '200');
    click(saveBtn());
    await flushAll();

    expect(document.body.textContent).toContain('ระบุจำนวนหน่วยที่มากกว่า 0');
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('DayDetailModal — quick suggestions', () => {
  const frequent: FrequentItem[] = [
    { categoryId: 'c-food', categoryName: 'ค่ากิน', description: 'ข้าวมันไก่', amount: 60, allocation_type: 'need', count: 5, lastDate: '2026-10-01' },
    { categoryId: 'c-salary', categoryName: 'เงินเดือน', description: 'เงินเดือน', amount: 30000, allocation_type: null, count: 9, lastDate: '2026-09-25' },
  ];

  it('offers only the suggestions that fit the form type, and fills the form when one is clicked', async () => {
    await mount({ transactions: [], frequentItems: frequent });
    const items = () => [...document.querySelectorAll('.sugg-item')];
    expect(items()).toHaveLength(1); // the salary suggestion is an income item, the form is on expense
    expect(items()[0].textContent).toContain('ข้าวมันไก่');

    click(items()[0]);
    await act(async () => { await new Promise(r => setTimeout(r, 30)); });
    expect(descInput().value).toBe('ข้าวมันไก่');
    expect(amountInput().value).toBe('60');
  });

  it('switches to the income suggestions when the form switches to income', async () => {
    await mount({ transactions: [], frequentItems: frequent });
    click(formTab('รายรับ'));
    const items = [...document.querySelectorAll('.sugg-item')];
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('เงินเดือน');
  });
});

describe('DayDetailModal — deleting a row', () => {
  const deleteBtn = (title: string) => q(`button[aria-label^="ลบรายการ: ${title}"]`) ?? q(`button[aria-label^="กดอีกครั้งเพื่อยืนยันลบ: ${title}"]`);

  it('needs two clicks: the first only arms the button', async () => {
    const onDelete = vi.fn();
    await mount({ onDelete });
    click(deleteBtn('ข้าวมันไก่'));
    expect(onDelete).not.toHaveBeenCalled();
    expect(deleteBtn('ข้าวมันไก่')!.getAttribute('aria-label')).toContain('กดอีกครั้งเพื่อยืนยันลบ');

    click(deleteBtn('ข้าวมันไก่'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith('t1');
  });

  it('Esc disarms the button without closing the modal; a second Esc closes it', async () => {
    const onClose = vi.fn();
    const onDelete = vi.fn();
    await mount({ onClose, onDelete });
    click(deleteBtn('กาแฟ'));
    key(document.body, 'Escape');
    expect(onClose).not.toHaveBeenCalled();
    expect(deleteBtn('กาแฟ')!.getAttribute('aria-label')).toContain('ลบรายการ: กาแฟ');
    click(deleteBtn('กาแฟ')); // arms again instead of deleting
    expect(onDelete).not.toHaveBeenCalled();
    key(document.body, 'Escape');
    key(document.body, 'Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('DayDetailModal — day note', () => {
  it('is view-only without a change handler: shows an existing note, nothing to add or edit', async () => {
    await mount({ transactions: [], dayNotes: { [DAY]: { text: 'วันเกิดแม่', icon: 'cake' } } });
    expect(document.body.textContent).toContain('วันเกิดแม่');
    expect(byText('button', '+ โน้ต')).toBeNull();
    expect(q('button[aria-label^="แก้ไขโน้ต"]')).toBeNull();
  });

  it('renders nothing for a day without a note in view-only mode', async () => {
    await mount({ transactions: [] });
    expect(byText('button', '+ โน้ต')).toBeNull();
    expect(noteInput()).toBeNull();
  });

  it('adds a note: ghost button → input → Enter saves (date, text, icon) and collapses', async () => {
    const onNote = vi.fn().mockResolvedValue(true);
    await mount({ transactions: [], handleDayNoteChange: onNote });
    click(byText('button', '+ โน้ต'));
    expect(document.activeElement).toBe(noteInput());

    type(noteInput(), '  วันเกิด  ');
    key(noteInput()!, 'Enter');
    await flushAll();

    expect(onNote).toHaveBeenCalledWith(DAY, 'วันเกิด', ''); // trimmed
    expect(noteInput()).toBeNull();
  });

  it('does not call the handler when nothing was typed', async () => {
    const onNote = vi.fn().mockResolvedValue(true);
    await mount({ transactions: [], handleDayNoteChange: onNote });
    click(byText('button', '+ โน้ต'));
    key(noteInput()!, 'Enter');
    await flushAll();
    expect(onNote).not.toHaveBeenCalled();
    expect(noteInput()).toBeNull();
  });

  it('keeps the editor open with the typed text and an error when saving fails', async () => {
    const onNote = vi.fn().mockResolvedValue(false);
    await mount({ transactions: [], handleDayNoteChange: onNote });
    click(byText('button', '+ โน้ต'));
    type(noteInput(), 'วันเกิด');
    key(noteInput()!, 'Enter');
    await flushAll();

    expect(noteInput()).not.toBeNull();
    expect(noteInput()!.value).toBe('วันเกิด');
    expect(noteInput()!.getAttribute('aria-invalid')).toBe('true');
    expect(document.body.textContent).toContain('บันทึกโน้ตไม่สำเร็จ');
  });

  it('clears an existing note by saving empty text (the icon is passed along for the server to drop)', async () => {
    const onNote = vi.fn().mockResolvedValue(true);
    await mount({ transactions: [], dayNotes: { [DAY]: { text: 'วันเกิดแม่', icon: 'cake' } }, handleDayNoteChange: onNote });
    click(q('button[aria-label="แก้ไขโน้ต: วันเกิดแม่"]'));
    expect(noteInput()!.value).toBe('วันเกิดแม่');

    type(noteInput(), '');
    key(noteInput()!, 'Enter');
    await flushAll();
    expect(onNote).toHaveBeenCalledWith(DAY, '', 'cake');
  });

  it('Esc closes only the editor (and drops the edit); the next Esc closes the modal', async () => {
    const onClose = vi.fn();
    const onNote = vi.fn().mockResolvedValue(true);
    await mount({ transactions: [], onClose, handleDayNoteChange: onNote });
    click(byText('button', '+ โน้ต'));
    type(noteInput(), 'ยังไม่เสร็จ');
    key(noteInput()!, 'Escape');
    await flushAll();

    expect(noteInput()).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(onNote).not.toHaveBeenCalled();

    key(document.body, 'Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('starts every day with its own note state (editor does not carry over when stepping days)', async () => {
    await mount({ handleDayNoteChange: vi.fn().mockResolvedValue(true), dayNotes: { '2026-10-08': { text: 'พรุ่งนี้มีนัด', icon: '' } } });
    click(byText('button', '+ โน้ต'));
    expect(noteInput()).not.toBeNull();
    click(q('button[title^="วันถัดไป"]'));
    expect(noteInput()).toBeNull();
    expect(q('button[aria-label="แก้ไขโน้ต: พรุ่งนี้มีนัด"]')).not.toBeNull();
  });
});
