// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import SettingsView, { SettingsViewProps } from '../index';
import { click, flush, q, type } from '@/test-utils/dom';
import { cat, dayType, grp } from './fixtures';
import type { CashflowGroup } from '@/types';

const h = vi.hoisted(() => ({
  groups: null as null | Record<string, any>,
  budgets: null as null | Record<string, any>,
  dayTypes: null as null | Record<string, any>,
  danger: null as null | Record<string, any>,
}));
vi.mock('../components/CashflowGroupsCard', async () => {
  const React = await import('react');
  return { default: (p: Record<string, any>) => { h.groups = p; return React.createElement('div', { 'data-testid': 'groups-card' }); } };
});
vi.mock('../components/BudgetsCard', async () => {
  const React = await import('react');
  return { default: (p: Record<string, any>) => { h.budgets = p; return React.createElement('div', { 'data-testid': 'budgets-card' }); } };
});
vi.mock('../components/DayTypesCard', async () => {
  const React = await import('react');
  return { default: (p: Record<string, any>) => { h.dayTypes = p; return React.createElement('div', { 'data-testid': 'daytypes-card' }); } };
});
vi.mock('../components/DangerZone', async () => {
  const React = await import('react');
  return { default: (p: Record<string, any>) => { h.danger = p; return React.createElement('div', { 'data-testid': 'danger-zone' }); } };
});

const FOOD = grp('g-food', { name: 'ค่ากิน', type: 'expense', order_index: 2 });
const BILLS = grp('g-bills', { name: 'ค่าบิล', type: 'expense', order_index: 1 });
const PAY = grp('g-pay', { name: 'เงินเดือน', type: 'income', allocation_type: null, order_index: 3 });
const SAVE = grp('g-save', { name: 'ลงทุน', type: 'savings', allocation_type: 'savings', order_index: 4 });
const PAY2 = grp('g-pay2', { name: 'โบนัส', type: 'income', allocation_type: null, order_index: 0 });
const SAVE2 = grp('g-save2', { name: 'ออม', type: 'savings', allocation_type: 'savings', order_index: 0 });
const GROUPS = [FOOD, BILLS, PAY, SAVE, PAY2, SAVE2];

let root: Root | null = null;
let container: HTMLElement | null = null;
let props: SettingsViewProps;
const fn = () => vi.fn();
const baseProps = (over: Partial<SettingsViewProps> = {}): SettingsViewProps => ({
  categories: [], cashflowGroups: GROUPS, setCashflowGroups: fn() as never,
  handleAddCategory: fn() as never, handleCategoryChange: fn(), handleDeleteCategory: fn(), handleMoveCategory: fn(),
  handleAddCashflowGroup: fn(), handleUpdateCashflowGroup: vi.fn(async () => undefined), handleDeleteCashflowGroup: fn(), handleMoveCashflowGroup: fn(),
  dayTypeConfig: [dayType('work'), dayType('off')], handleDayTypeConfigChange: fn(), handleAddDayType: fn(), handleDeleteDayType: fn(), handleMoveDayType: fn(),
  handleDeleteAllData: fn(), transactions: [], ...over,
});
const render = () => act(() => root!.render(<SettingsView {...props} />));
const mount = (over: Partial<SettingsViewProps> = {}) => {
  props = baseProps(over);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  render();
};
/** The card whose <h2> starts with this title. */
const section = (title: string) => [...container!.querySelectorAll('h2')].find(h2 => h2.textContent!.startsWith(title))!.closest('div.overflow-hidden') as HTMLElement;
const names = (title: string) => [...section(title).querySelectorAll<HTMLInputElement>('input[type="text"]')].map(i => i.value);
const addBtn = (label: string) => [...container!.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent!.trim() === label)!;
const call = (fnRef: unknown) => (fnRef as ReturnType<typeof vi.fn>);

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  h.groups = h.budgets = h.dayTypes = h.danger = null;
});
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('SettingsView page', () => {
  it('title, the allocation hint and the cards on the right are all there', () => {
    mount();
    expect(container!.querySelector('h1')!.textContent).toBe('การตั้งค่าระบบ');
    expect(container!.textContent).toContain('NEED/WANT/SAVE');
    for (const id of ['groups-card', 'budgets-card', 'daytypes-card', 'danger-zone']) expect(container!.querySelector(`[data-testid="${id}"]`), id).not.toBeNull();
  });

  it('renders with nothing given at all (every list defaults to empty)', () => {
    props = { ...baseProps(), categories: undefined as never, cashflowGroups: undefined as never, dayTypeConfig: undefined as never, transactions: undefined as never };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    render();
    expect(container.querySelector('h1')).not.toBeNull();
    expect(container.textContent).toContain('ยังไม่มีหมวดหมู่รายจ่าย');
  });

  it('warns about categories whose group is gone', () => {
    mount({ categories: [cat('c1', { name: 'กำพร้า', cashflowGroup: 'deleted' })] });
    expect(container!.textContent).toContain('มีหมวดหมู่ที่กลุ่มถูกลบไปแล้ว');
  });

  it('no warning when all groups exist', () => {
    mount({ categories: [cat('c1', { cashflowGroup: 'g-food' })] });
    expect(container!.textContent).not.toContain('มีหมวดหมู่ที่กลุ่มถูกลบไปแล้ว');
  });
});

describe('SettingsView category sections', () => {
  const categories = [
    cat('e2', { name: 'ค่าน้ำ', type: 'expense', order_index: 2, cashflowGroup: 'g-bills' }),
    cat('e1', { name: 'ข้าว', type: 'expense', order_index: 1, cashflowGroup: 'g-food' }),
    cat('i1', { name: 'เงินเดือนหลัก', type: 'income', order_index: 1, cashflowGroup: 'g-pay' }),
    cat('s1', { name: 'ทองคำ', type: 'savings', order_index: 1, cashflowGroup: 'g-save' }),
    cat('s2', { name: 'ออมเพิ่ม', type: 'savings', order_index: 2, cashflowGroup: 'g-save' }),
    cat('i2', { name: 'โบนัสรอง', type: 'income', order_index: 2, cashflowGroup: 'g-pay' }),
    cat('e0', { name: 'ไม่มีลำดับ', type: 'expense', order_index: undefined, cashflowGroup: 'g-food' }),
  ];

  it('each category sits in the section of its type, in order_index order (no index counts as first)', () => {
    mount({ categories });
    expect(names('หมวดหมู่รายจ่าย')).toEqual(['ไม่มีลำดับ', 'ข้าว', 'ค่าน้ำ']);
    expect(names('หมวดหมู่รายรับ')).toEqual(['เงินเดือนหลัก', 'โบนัสรอง']);
    expect(names('หมวดหมู่การลงทุนและการออมเงิน')).toEqual(['ทองคำ', 'ออมเพิ่ม']);
  });

  it('each section shows its own count', () => {
    mount({ categories });
    expect(section('หมวดหมู่รายจ่าย').querySelector('h2 span')!.textContent).toBe('3');
    expect(section('หมวดหมู่รายรับ').querySelector('h2 span')!.textContent).toBe('2');
    expect(section('หมวดหมู่การลงทุนและการออมเงิน').querySelector('h2 span')!.textContent).toBe('2');
  });

  it('does not reorder the array it was given', () => {
    const given = [...categories];
    mount({ categories: given });
    expect(given.map(c => c.id)).toEqual(categories.map(c => c.id));
  });

  it('the first row of a section cannot move up and the last cannot move down', () => {
    mount({ categories });
    const s = section('หมวดหมู่รายจ่าย');
    const up = (n: string) => s.querySelector<HTMLButtonElement>(`button[aria-label="เลื่อน ${n} ขึ้น"]`)!;
    const down = (n: string) => s.querySelector<HTMLButtonElement>(`button[aria-label="เลื่อน ${n} ลง"]`)!;
    expect(up('ไม่มีลำดับ').disabled).toBe(true);
    expect(down('ไม่มีลำดับ').disabled).toBe(false);
    expect(up('ค่าน้ำ').disabled).toBe(false);
    expect(down('ค่าน้ำ').disabled).toBe(true);
    expect(up('ข้าว').disabled).toBe(false);
    expect(down('ข้าว').disabled).toBe(false);
  });

  it('the same first/last rule holds in the income and savings sections', () => {
    mount({ categories });
    for (const [title, first, last] of [['หมวดหมู่รายรับ', 'เงินเดือนหลัก', 'โบนัสรอง'], ['หมวดหมู่การลงทุนและการออมเงิน', 'ทองคำ', 'ออมเพิ่ม']] as const) {
      const s = section(title);
      const up = (n: string) => s.querySelector<HTMLButtonElement>(`button[aria-label="เลื่อน ${n} ขึ้น"]`)!;
      const down = (n: string) => s.querySelector<HTMLButtonElement>(`button[aria-label="เลื่อน ${n} ลง"]`)!;
      expect([up(first).disabled, down(first).disabled], title).toEqual([true, false]);
      expect([up(last).disabled, down(last).disabled], title).toEqual([false, true]);
    }
  });

  it('the name hint follows the section', () => {
    mount({ categories });
    const ph = (t: string) => section(t).querySelector<HTMLInputElement>('input[type="text"]')!.placeholder;
    expect(ph('หมวดหมู่รายจ่าย')).toBe('ชื่อรายจ่าย');
    expect(ph('หมวดหมู่รายรับ')).toBe('ชื่อรายรับ');
    expect(ph('หมวดหมู่การลงทุนและการออมเงิน')).toBe('ชื่อสินทรัพย์/บัญชีออม');
  });

  it('each section offers only the groups of its kind in the group dropdown', () => {
    mount({ categories });
    const groupOptions = (t: string) => {
      const trigger = section(t).querySelector('button[aria-label="กลุ่มของหมวดหมู่"]');
      click(trigger);
      const o = [...document.querySelectorAll('[role="option"]')].map(e => e.textContent);
      click(trigger); // close it again before looking at the next section
      return o;
    };
    expect(groupOptions('หมวดหมู่รายจ่าย')).toEqual(['ค่าบิล', 'ค่ากิน']); // by group order_index
    expect(groupOptions('หมวดหมู่รายรับ')).toEqual(['โบนัส', 'เงินเดือน']);
    expect(groupOptions('หมวดหมู่การลงทุนและการออมเงิน')).toEqual(['ออม', 'ลงทุน']);
  });

  it('empty sections say so', () => {
    mount({ categories: [] });
    expect(container!.textContent).toContain('ยังไม่มีหมวดหมู่รายจ่าย');
    expect(container!.textContent).toContain('ยังไม่มีหมวดหมู่รายรับ');
    expect(container!.textContent).toContain('ยังไม่มีหมวดหมู่การลงทุนและการออมเงิน');
  });

  it('with no savings group the savings section explains how to get one', () => {
    mount({ categories: [], cashflowGroups: [FOOD, PAY] });
    expect(container!.textContent).toContain('ยังไม่มีกลุ่มชนิด "ลงทุน/ออม"');
    expect(container!.textContent).not.toContain('ยังไม่มีหมวดหมู่การลงทุนและการออมเงิน');
  });

  it('category edits go to the handlers with the id', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    mount({ categories });
    const s = section('หมวดหมู่รายจ่าย');
    click(s.querySelector('button[aria-label="เลื่อน ข้าว ลง"]'));
    expect(props.handleMoveCategory).toHaveBeenCalledWith('e1', 'DOWN');
    type(s.querySelectorAll('input[type="text"]')[1], 'ข้าวมันไก่');
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(props.handleCategoryChange).toHaveBeenCalledWith('e1', 'name', 'ข้าวมันไก่');
    click(s.querySelector('button[aria-label="ลบหมวดหมู่: ข้าว"]'));
    click(s.querySelector('button[aria-label="กดอีกครั้งเพื่อยืนยันลบ: ข้าว"]'));
    expect(props.handleDeleteCategory).toHaveBeenCalledWith('e1');
  });
});

describe('SettingsView adding categories', () => {
  it.each([['เพิ่มรายจ่าย', 'expense'], ['เพิ่มรายรับ', 'income'], ['เพิ่มหมวดหมู่', 'savings']])('"%s" adds a %s category', async (label, kind) => {
    mount();
    click(addBtn(label));
    await flush();
    expect(props.handleAddCategory).toHaveBeenCalledTimes(1);
    expect(props.handleAddCategory).toHaveBeenCalledWith(kind);
  });

  it('the new category\'s name box takes focus, text selected', async () => {
    const added = cat('c-new', { name: 'หมวดใหม่', type: 'expense', cashflowGroup: 'g-food' });
    mount({ handleAddCategory: vi.fn(async () => 'c-new') as never, categories: [] });
    click(addBtn('เพิ่มรายจ่าย'));
    await flush();
    act(() => root!.render(<SettingsView {...props} categories={[added]} />));
    const box = section('หมวดหมู่รายจ่าย').querySelector<HTMLInputElement>('input[type="text"]')!;
    expect(document.activeElement).toBe(box);
    expect(box.selectionStart).toBe(0);
    expect(box.selectionEnd).toBe('หมวดใหม่'.length);
  });

  it.each([['เพิ่มรายรับ', 'income', 'หมวดหมู่รายรับ', 'g-pay'], ['เพิ่มหมวดหมู่', 'savings', 'หมวดหมู่การลงทุนและการออมเงิน', 'g-save']])('a new %s row takes focus as well', async (label, kind, title, group) => {
    const added = cat('c-new', { name: 'ใหม่', type: kind as never, cashflowGroup: group });
    mount({ handleAddCategory: vi.fn(async () => 'c-new') as never, categories: [cat('old', { name: 'เก่า', type: kind as never, cashflowGroup: group, order_index: 1 })] });
    click(addBtn(label));
    await flush();
    act(() => root!.render(<SettingsView {...props} categories={[cat('old', { name: 'เก่า', type: kind as never, cashflowGroup: group, order_index: 1 }), { ...added, order_index: 2 }]} />));
    const boxes = section(title).querySelectorAll<HTMLInputElement>('input[type="text"]');
    expect(document.activeElement).toBe(boxes[1]);
  });

  it('when nothing comes back no row is marked new', async () => {
    const existing = cat('c1', { name: 'เดิม', type: 'expense' });
    mount({ handleAddCategory: vi.fn(async () => undefined) as never, categories: [existing] });
    click(addBtn('เพิ่มรายจ่าย'));
    await flush();
    expect(document.activeElement).not.toBe(q('input[type="text"]'));
  });

  it('a failure while adding is logged and does not break the page', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    mount({ handleAddCategory: vi.fn(async () => { throw new Error('boom'); }) as never });
    click(addBtn('เพิ่มรายจ่าย'));
    await flush();
    expect(err).toHaveBeenCalledTimes(1);
    expect(container!.querySelector('h1')).not.toBeNull();
  });
});

describe('SettingsView right-hand cards', () => {
  it('hands each card its data and handlers', () => {
    mount({ categories: [cat('c1')] });
    expect(h.budgets!.cashflowGroups).toBe(props.cashflowGroups);
    expect(h.dayTypes!.dayTypeConfig).toBe(props.dayTypeConfig);
    expect(h.dayTypes!.handleAddDayType).toBe(props.handleAddDayType);
    expect(h.dayTypes!.handleMoveDayType).toBe(props.handleMoveDayType);
    expect(h.dayTypes!.handleDayTypeConfigChange).toBe(props.handleDayTypeConfigChange);
    expect(h.dayTypes!.handleDeleteDayType).toBe(props.handleDeleteDayType);
    expect(h.danger!.handleDeleteAllData).toBe(props.handleDeleteAllData);
    expect(h.groups!.cashflowGroups).toBe(props.cashflowGroups);
    expect(h.groups!.handleAddCashflowGroup).toBe(props.handleAddCashflowGroup);
    expect(h.groups!.handleMoveCashflowGroup).toBe(props.handleMoveCashflowGroup);
    expect(h.groups!.categories).toBe(props.categories);
  });

  it('counts the transactions in each group (by category id, then by name)', () => {
    mount({
      categories: [cat('c1', { name: 'ข้าว', cashflowGroup: 'g-food' }), cat('c2', { name: 'น้ำ', cashflowGroup: 'g-bills' })],
      transactions: [
        { category_id: 'c1', category: 'ข้าว' }, { category_id: 'c1', category: 'ข้าว' }, { category_id: undefined, category: 'น้ำ' },
      ] as never,
    });
    expect(h.groups!.txCountByGroup).toEqual({ 'g-food': 2, 'g-bills': 1 });
  });
});

describe('SettingsView tab switches', () => {
  const row = (title: string) => container!.querySelector<HTMLElement>(`[role="group"][aria-label="${title}"]`);
  const sw = (label: string) => container!.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

  it('no switch rows unless the page is given something to call', () => {
    mount();
    expect(row('โหมดภาษี')).toBeNull();
    expect(row('พอร์ตลงทุน')).toBeNull();
  });

  it('the tax row appears with its handler, and defaults to on', () => {
    mount({ onTaxEnabledChange: vi.fn() });
    expect(row('โหมดภาษี')).not.toBeNull();
    expect(row('พอร์ตลงทุน')).toBeNull();
    expect(sw('เปิดโหมดภาษี').getAttribute('aria-checked')).toBe('true');
    expect(container!.textContent).toContain('แสดงแท็บ "ภาษี" อยู่');
  });

  it('the portfolio row appears with its handler, and defaults to on', () => {
    mount({ onPortfolioEnabledChange: vi.fn() });
    expect(row('พอร์ตลงทุน')).not.toBeNull();
    expect(row('โหมดภาษี')).toBeNull();
    expect(sw('เปิดพอร์ตลงทุน').getAttribute('aria-checked')).toBe('true');
    expect(container!.textContent).toContain('แสดงแท็บ "พอร์ตลงทุน" และสรุปพอร์ตในหน้าภาพรวม');
  });

  it('switching off reports false for the right tab, switching on reports true', () => {
    const tax = vi.fn(); const pf = vi.fn();
    mount({ onTaxEnabledChange: tax, onPortfolioEnabledChange: pf });
    click(sw('ปิดโหมดภาษี'));
    expect(tax).toHaveBeenCalledWith(false);
    expect(pf).not.toHaveBeenCalled();
    click(sw('ปิดพอร์ตลงทุน'));
    expect(pf).toHaveBeenCalledWith(false);
    click(sw('เปิดพอร์ตลงทุน'));
    expect(pf).toHaveBeenLastCalledWith(true);
  });

  it('shows each row as off when told so, and says the data is kept', () => {
    mount({ taxEnabled: false, portfolioEnabled: false, onTaxEnabledChange: vi.fn(), onPortfolioEnabledChange: vi.fn() });
    expect(sw('ปิดโหมดภาษี').getAttribute('aria-checked')).toBe('true');
    expect(sw('ปิดพอร์ตลงทุน').getAttribute('aria-checked')).toBe('true');
    expect(container!.textContent).toContain('ข้อมูลที่กรอกไว้ยังอยู่ครบ');
    expect(container!.textContent).toContain('ข้อมูลสินทรัพย์และรายการซื้อขายยังอยู่ครบ');
  });

  it('the two rows are independent of each other', () => {
    mount({ taxEnabled: false, portfolioEnabled: true, onTaxEnabledChange: vi.fn(), onPortfolioEnabledChange: vi.fn() });
    expect(sw('ปิดโหมดภาษี').getAttribute('aria-checked')).toBe('true');
    expect(sw('เปิดพอร์ตลงทุน').getAttribute('aria-checked')).toBe('true');
  });
});

describe('SettingsView following new data', () => {
  it('transaction counts are recomputed when the transactions change', () => {
    const categories = [cat('c1', { name: 'ข้าว', cashflowGroup: 'g-food' })];
    mount({ categories, transactions: [{ category_id: 'c1' }] as never });
    expect(h.groups!.txCountByGroup).toEqual({ 'g-food': 1 });
    act(() => root!.render(<SettingsView {...props} categories={categories} transactions={[{ category_id: 'c1' }, { category_id: 'c1' }] as never} />));
    expect(h.groups!.txCountByGroup).toEqual({ 'g-food': 2 });
  });

  it('transaction counts are recomputed when the categories change', () => {
    const transactions = [{ category_id: 'c1' }] as never;
    mount({ categories: [cat('c1', { cashflowGroup: 'g-food' })], transactions });
    expect(h.groups!.txCountByGroup).toEqual({ 'g-food': 1 });
    act(() => root!.render(<SettingsView {...props} categories={[cat('c1', { cashflowGroup: 'g-bills' })]} transactions={transactions} />));
    expect(h.groups!.txCountByGroup).toEqual({ 'g-bills': 1 });
  });

  it('deleting a group uses the categories as they are now, not as they were on first render', () => {
    mount({ categories: [] });
    act(() => root!.render(<SettingsView {...props} categories={[cat('c1', { cashflowGroup: 'g-food' })]} />));
    act(() => { h.groups!.handleDeleteGroup('g-food'); });
    expect(props.handleDeleteCashflowGroup).not.toHaveBeenCalled();
    expect(h.groups!.cashflowDeleteError).toEqual(expect.objectContaining({ id: 'g-food' }));
  });

  it('saving a group change uses the groups as they are now', async () => {
    mount();
    const renamed = { ...FOOD, name: 'อาหารใหม่' };
    act(() => root!.render(<SettingsView {...props} cashflowGroups={[renamed, BILLS, PAY, SAVE]} />));
    await act(async () => { await h.groups!.handleChangeCashflowGroup('g-food', 'color', '#ABCDEF'); });
    expect(props.handleUpdateCashflowGroup).toHaveBeenCalledWith({ ...renamed, color: '#ABCDEF' }, { silent: true });
  });
});

describe('SettingsView changing a group', () => {
  const change = (id: string, field: string, value: unknown) => h.groups!.handleChangeCashflowGroup(id, field, value) as Promise<boolean>;

  it('shows the change at once, then saves it quietly, and reports success', async () => {
    mount();
    let ok: boolean | undefined;
    await act(async () => { ok = await change('g-food', 'name', 'อาหาร'); });
    expect(ok).toBe(true);
    const updater = call(props.setCashflowGroups).mock.calls[0][0] as (prev: CashflowGroup[]) => CashflowGroup[];
    const next = updater(GROUPS);
    expect(next.find(g => g.id === 'g-food')!.name).toBe('อาหาร');
    expect(next.filter(g => g.id !== 'g-food')).toEqual(GROUPS.filter(g => g.id !== 'g-food')); // nothing else touched
    expect(props.handleUpdateCashflowGroup).toHaveBeenCalledWith({ ...FOOD, name: 'อาหาร' }, { silent: true });
  });

  it('a refused save puts the old groups back and reports failure', async () => {
    mount({ handleUpdateCashflowGroup: vi.fn(async () => { throw new Error('400'); }) });
    let ok: boolean | undefined;
    await act(async () => { ok = await change('g-food', 'name', 'อาหาร'); });
    expect(ok).toBe(false);
    const calls = call(props.setCashflowGroups).mock.calls;
    expect(calls).toHaveLength(2);
    expect(typeof calls[0][0]).toBe('function');
    expect(calls[1][0]).toEqual(GROUPS);
    expect(calls[1][0]).not.toBe(GROUPS); // a snapshot copy, taken before the change
  });

  it('a group that is not in the list is shown as changed but nothing is saved', async () => {
    mount();
    let ok: boolean | undefined;
    await act(async () => { ok = await change('ghost', 'name', 'x'); });
    expect(ok).toBe(true);
    expect(props.handleUpdateCashflowGroup).not.toHaveBeenCalled();
  });
});

describe('SettingsView deleting a group', () => {
  const del = (id: string) => act(() => { h.groups!.handleDeleteGroup(id); });

  it('an unused group goes straight to the delete handler, no error', () => {
    mount({ categories: [cat('c1', { cashflowGroup: 'g-food' })] });
    del('g-bills');
    expect(props.handleDeleteCashflowGroup).toHaveBeenCalledWith('g-bills');
    expect(h.groups!.cashflowDeleteError).toBeNull();
  });

  it('a group that categories still use is refused with a message', () => {
    mount({ categories: [cat('c1', { cashflowGroup: 'g-food' })] });
    del('g-food');
    expect(props.handleDeleteCashflowGroup).not.toHaveBeenCalled();
    expect(h.groups!.cashflowDeleteError).toEqual({ id: 'g-food', msg: 'ไม่สามารถลบได้ มีหมวดหมู่กำลังใช้งานกลุ่มนี้อยู่' });
  });

  it('the message goes away after 4 seconds, not before', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    mount({ categories: [cat('c1', { cashflowGroup: 'g-food' })] });
    del('g-food');
    act(() => { vi.advanceTimersByTime(3999); });
    expect(h.groups!.cashflowDeleteError).not.toBeNull();
    act(() => { vi.advanceTimersByTime(1); });
    expect(h.groups!.cashflowDeleteError).toBeNull();
  });

  it('refusing again restarts the 4 seconds', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    mount({ categories: [cat('c1', { cashflowGroup: 'g-food' }), cat('c2', { cashflowGroup: 'g-bills' })] });
    del('g-food');
    act(() => { vi.advanceTimersByTime(3000); });
    del('g-bills');
    act(() => { vi.advanceTimersByTime(3000); });
    expect(h.groups!.cashflowDeleteError).toEqual(expect.objectContaining({ id: 'g-bills' }));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(h.groups!.cashflowDeleteError).toBeNull();
  });

  it('leaving the page with the message up does not leave a timer behind', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    mount({ categories: [cat('c1', { cashflowGroup: 'g-food' })] });
    del('g-food');
    expect(vi.getTimerCount()).toBe(1); // the 4 second message timer
    act(() => root!.unmount());
    root = null;
    expect(vi.getTimerCount()).toBe(0); // cleared on the way out, not left to fire on a page that is gone
    act(() => { vi.advanceTimersByTime(5000); });
    expect(err).not.toHaveBeenCalled();
  });
});
