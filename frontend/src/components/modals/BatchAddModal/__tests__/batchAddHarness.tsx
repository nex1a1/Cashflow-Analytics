// Setup shared by the BatchAddModal test files. The suite is split in three files only so they run in parallel.
// The real tree is rendered (form, category picker, date picker, suggestions, recurring panel, cart, footer).
// Only the contexts, the API layer and the clock-independent bits are replaced (see batchAddMocks.ts).
import type { Mock } from 'vitest';
import { vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import BatchAddModal, { BatchAddModalProps } from '../index';
import { flush, flushAll, click, type, q, byText } from '@/test-utils/dom';
import type { CashflowGroup, Category, DayType } from '@/types';
import { h } from './batchAddMocks';

export type AnyMock = Mock<(...args: any[]) => any>;

export const DAY = '2026-10-07'; // a Wednesday

export const groups: CashflowGroup[] = [
  { id: 'g-inc', name: 'รายรับ', type: 'income', allocation_type: null, order_index: 1 },
  { id: 'g-exp', name: 'รายจ่ายประจำวัน', type: 'expense', allocation_type: 'need', order_index: 2 },
  { id: 'g-sav', name: 'ลงทุน', type: 'savings', allocation_type: 'savings', order_index: 3 },
];
export const categories: Category[] = [
  { id: 'c-food', name: 'ค่ากิน', type: 'expense', order_index: 1, cashflow_group_id: 'g-exp', allocation_type: 'need' },
  { id: 'c-fun', name: 'บันเทิง', type: 'expense', order_index: 2, cashflow_group_id: 'g-exp', allocation_type: 'want' },
  { id: 'c-salary', name: 'เงินเดือน', type: 'income', order_index: 3, cashflow_group_id: 'g-inc' },
  { id: 'c-save', name: 'ออมทอง', type: 'savings', order_index: 4, cashflow_group_id: 'g-sav', allocation_type: 'savings' },
];
export const dayTypeConfig: DayType[] = [
  { id: 'dt-work', name: 'workday', label: 'วันทำงาน', color: '#10B981' },
  { id: 'dt-hol', name: 'holiday', label: 'วันหยุด', color: '#DA291C' },
];
export const asset = {
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

export async function mount(p: Partial<BatchAddModalProps> = {}) {
  props = { ...baseProps(), ...p };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  render();
  await flush();
}
export const unmount = () => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
};
export const getProps = () => props;
/** Real wait inside act (for the form's delayed focus). */
export const wait = (ms: number) => act(async () => { await new Promise(r => setTimeout(r, ms)); });
/** Re-renders with changed props (same root, so the modal keeps its state like it does in the app). */
export const update = async (p: Partial<BatchAddModalProps>) => { props = { ...props, ...p }; render(); await flush(); };

export const dialog = () => q('[role="dialog"]');
export const amountInput = () => q<HTMLInputElement>('#batch-amount')!;
export const descInput = () => q<HTMLInputElement>('#batch-description')!;
export const typeTab = (label: string) => byText('form button', label)!;
export const addBtn = () => byText('button', 'เพิ่มลงตะกร้า (Enter)') as HTMLButtonElement;
export const saveBtn = () => byText('button', 'บันทึกทั้งหมด') ?? byText('button', 'กำลังบันทึก...');
export const discardBtn = () => byText('button', 'ทิ้งข้อมูล')!;
export const closeX = () => q('button[title="ปิดหน้าต่าง"]')!;
export const categoryTrigger = () => q<HTMLButtonElement>('#batch-category')!;
export const cartRows = () => [...document.querySelectorAll<HTMLElement>('[title="ลบรายการนี้"]')].map(b => b.closest('.flex.items-center.justify-between') as HTMLElement);
export const cartTitles = () => cartRows().map(r => r.querySelector('.font-bold.text-xs')!.firstElementChild!.textContent);
export const cartText = () => cartRows().map(r => r.textContent!);
/** The kind badge of a cart row (รายรับ / รายจ่าย / ซื้อ · … / ขาย · …). Not the whole row: the group name can contain the same word. */
export const badge = (i: number) => cartRows()[i].querySelector('span[class*="h-[22px]"]')!.textContent;
export const guard = () => q('[role="alert"]');
export const footer = () => byText('span', 'ยอดรวมในตะกร้า:')!.parentElement!.textContent!;

/** Fills the form like a user and presses the add button. */
export async function add(amount: string, description = '') {
  type(amountInput(), amount);
  if (description) type(descInput(), description);
  click(addBtn());
  await flushAll();
}
/** Opens the category popover and picks `name`. */
export async function pickCategory(name: string) {
  click(categoryTrigger());
  await flush();
  click(byText('[class*="text-xs font-semibold"]', name)!.closest('button'));
  await flush();
}

/** Registers the per-file hooks; call once at the top level of each test file. */
export function setupBatchAddModalTests() {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn(); // not implemented by jsdom
    window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as any;
    globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any;
  });
  beforeEach(() => { h.history = []; h.hidden = []; h.period = '2026-10'; h.saved = []; });
  afterEach(() => {
    unmount();
    document.body.innerHTML = '';
    h.portfolio = null;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
}
