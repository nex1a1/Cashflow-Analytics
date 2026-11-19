// @vitest-environment jsdom
import type { Mock } from 'vitest';
type AnyMock = Mock<(...args: any[]) => any>;
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
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
const call = (fnRef: unknown) => (fnRef as AnyMock);

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

describe('SettingsView following new data', () => {

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

  it('a refused save puts the old value back and reports failure', async () => {
    mount({ handleUpdateCashflowGroup: vi.fn(async () => { throw new Error('400'); }) });
    let ok: boolean | undefined;
    await act(async () => { ok = await change('g-food', 'name', 'อาหาร'); });
    expect(ok).toBe(false);
    const calls = call(props.setCashflowGroups).mock.calls;
    expect(calls).toHaveLength(2);
    const optimistic = (calls[0][0] as (p: CashflowGroup[]) => CashflowGroup[])(GROUPS);
    const rollback = calls[1][0] as (p: CashflowGroup[]) => CashflowGroup[];
    expect(rollback(optimistic)).toEqual(GROUPS);
  });

  // แก้กลุ่มหนึ่ง (บันทึกไม่ผ่าน) ระหว่างนั้นแก้อีกช่อง/อีกกลุ่มไปแล้ว: ย้อนแค่ค่าที่บันทึกไม่ผ่าน ไม่ย้อนทั้งรายการ
  it('a refused save does not undo newer edits of other fields or groups', async () => {
    mount({ handleUpdateCashflowGroup: vi.fn(async () => { throw new Error('400'); }) });
    await act(async () => { await change('g-food', 'name', 'อาหาร'); });
    const rollback = call(props.setCashflowGroups).mock.calls[1][0] as (p: CashflowGroup[]) => CashflowGroup[];
    const meanwhile = GROUPS.map(g =>
      g.id === 'g-food' ? { ...g, name: 'อาหาร', color: '#000000' } : g.id === 'g-bills' ? { ...g, name: 'บิลใหม่' } : g);
    const after = rollback(meanwhile);
    expect(after.find(g => g.id === 'g-food')).toEqual({ ...FOOD, color: '#000000' });
    expect(after.find(g => g.id === 'g-bills')!.name).toBe('บิลใหม่');
  });

  it('a refused save does not undo a newer value of the same field', async () => {
    mount({ handleUpdateCashflowGroup: vi.fn(async () => { throw new Error('400'); }) });
    await act(async () => { await change('g-food', 'name', 'ร่าง'); });
    const rollback = call(props.setCashflowGroups).mock.calls[1][0] as (p: CashflowGroup[]) => CashflowGroup[];
    const meanwhile = GROUPS.map(g => (g.id === 'g-food' ? { ...g, name: 'สุดท้าย' } : g));
    expect(rollback(meanwhile).find(g => g.id === 'g-food')!.name).toBe('สุดท้าย');
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

});
