// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import CashflowGroupsCard, { CashflowGroupsCardProps } from '../components/CashflowGroupsCard';
import { click, q, type } from '@/test-utils/dom';
import { cat, grp } from './fixtures';

let root: Root | null = null;
let container: HTMLElement | null = null;
let props: CashflowGroupsCardProps;
const render = () => act(() => root!.render(<CashflowGroupsCard {...props} />));
const mount = (p: Partial<CashflowGroupsCardProps> = {}) => {
  props = {
    cashflowGroups: [], handleAddCashflowGroup: vi.fn(), handleMoveCashflowGroup: vi.fn(),
    handleChangeCashflowGroup: vi.fn(async () => true), handleDeleteGroup: vi.fn(),
    cashflowDeleteError: null, txCountByGroup: {}, categories: [], ...p,
  };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  render();
};
const rows = () => [...container!.querySelectorAll<HTMLElement>('.group\\/cg')];
const nameInputs = () => [...container!.querySelectorAll<HTMLInputElement>('input[type="text"]')];
const btn = (label: string) => container!.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const typeBtns = () => [...container!.querySelectorAll<HTMLButtonElement>('button[aria-label="ประเภทกลุ่ม"]')];
const options = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')];
const calls = (fn: unknown) => (fn as ReturnType<typeof vi.fn>).mock.calls;

const INCOME = grp('g-pay', { name: 'เงินเดือน', type: 'income', allocation_type: null, order_index: 1 });
const FOOD = grp('g-food', { name: 'ค่ากิน', type: 'expense', allocation_type: 'need', order_index: 2 });
const SAVE = grp('g-save', { name: 'ลงทุน', type: 'savings', allocation_type: 'savings', order_index: 3 });

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('CashflowGroupsCard list', () => {
  it('title, a count badge and an add button', () => {
    mount({ cashflowGroups: [INCOME, FOOD] });
    expect(container!.querySelector('h2')!.textContent).toContain('กลุ่มรายรับ-รายจ่าย');
    expect(container!.querySelector('h2 span')!.textContent).toBe('2');
    click([...container!.querySelectorAll('button')].find(b => b.textContent!.includes('เพิ่ม')));
    expect(props.handleAddCashflowGroup).toHaveBeenCalledTimes(1);
  });

  it('no groups: says so', () => {
    mount();
    expect(container!.textContent).toContain('ยังไม่มีกลุ่ม');
    expect(rows()).toHaveLength(0);
  });

  it('rows follow order_index, not the order they arrive in', () => {
    mount({ cashflowGroups: [SAVE, INCOME, FOOD] });
    expect(nameInputs().map(i => i.value)).toEqual(['เงินเดือน', 'ค่ากิน', 'ลงทุน']);
  });

  it('does not reorder the array it was given', () => {
    const given = [SAVE, INCOME, FOOD];
    mount({ cashflowGroups: given });
    expect(given.map(g => g.id)).toEqual(['g-save', 'g-pay', 'g-food']);
  });
});

describe('CashflowGroupsCard ordering', () => {
  it('up/down send the id and direction', () => {
    mount({ cashflowGroups: [INCOME, FOOD, SAVE] });
    click(btn('เลื่อน ค่ากิน ขึ้น'));
    click(btn('เลื่อน ค่ากิน ลง'));
    expect(calls(props.handleMoveCashflowGroup)).toEqual([['g-food', 'UP'], ['g-food', 'DOWN']]);
  });

  it('the first cannot go up and the last cannot go down; the ones in between can do both', () => {
    mount({ cashflowGroups: [INCOME, FOOD, SAVE] });
    expect(btn('เลื่อน เงินเดือน ขึ้น').disabled).toBe(true);
    expect(btn('เลื่อน เงินเดือน ลง').disabled).toBe(false);
    expect(btn('เลื่อน ค่ากิน ขึ้น').disabled).toBe(false);
    expect(btn('เลื่อน ค่ากิน ลง').disabled).toBe(false);
    expect(btn('เลื่อน ลงทุน ขึ้น').disabled).toBe(false);
    expect(btn('เลื่อน ลงทุน ลง').disabled).toBe(true);
  });

  it('disabled is judged by the sorted position, not the position in the given array', () => {
    mount({ cashflowGroups: [SAVE, FOOD, INCOME] });
    expect(btn('เลื่อน เงินเดือน ขึ้น').disabled).toBe(true);
    expect(btn('เลื่อน ลงทุน ลง').disabled).toBe(true);
  });
});

describe('CashflowGroupsCard type and allocation', () => {
  it('shows each group\'s type in Thai', () => {
    mount({ cashflowGroups: [INCOME, FOOD, SAVE] });
    expect(typeBtns().map(b => b.textContent)).toEqual(['รายรับ', 'รายจ่าย', 'ลงทุน/ออม']);
  });

  it('the type list offers income, expense and savings; choosing one reports it', () => {
    mount({ cashflowGroups: [FOOD] });
    click(typeBtns()[0]);
    expect(options().map(o => o.textContent)).toEqual(['รายรับ', 'รายจ่าย', 'ลงทุน/ออม']);
    click(options().find(o => o.textContent === 'ลงทุน/ออม'));
    expect(props.handleChangeCashflowGroup).toHaveBeenCalledWith('g-food', 'type', 'savings');
  });

  it('a default group\'s type is fixed', () => {
    mount({ cashflowGroups: [{ ...FOOD, isDefault: true }] });
    expect(typeBtns()[0].disabled).toBe(true);
  });

  it('so is the type of a group that categories use, with the reason as tooltip', () => {
    mount({ cashflowGroups: [FOOD], categories: [cat('c1', { cashflowGroup: 'g-food' })] });
    expect(typeBtns()[0].disabled).toBe(true);
    expect(typeBtns()[0].title).toBe('มีหมวดหมู่ใช้งานอยู่ ไม่สามารถเปลี่ยนประเภทได้');
  });

  it('an empty, non-default group can change type, with no tooltip', () => {
    mount({ cashflowGroups: [FOOD], categories: [cat('c1', { cashflowGroup: 'other' })] });
    expect(typeBtns()[0].disabled).toBe(false);
    expect(typeBtns()[0].title).toBe('');
  });

  it('an expense group has an allocation picker showing its allocation; changing it reports the value', () => {
    mount({ cashflowGroups: [FOOD] });
    expect(q('[role="radio"][aria-checked="true"]')!.textContent).toBe('NEED');
    click([...document.querySelectorAll<HTMLElement>('[role="radio"]')].find(o => o.textContent === 'WANT'));
    expect(props.handleChangeCashflowGroup).toHaveBeenCalledWith('g-food', 'allocation_type', 'want');
  });

  it('an expense group with no allocation reads WANT', () => {
    mount({ cashflowGroups: [{ ...FOOD, allocation_type: null }] });
    expect(q('[role="radio"][aria-checked="true"]')!.textContent).toBe('WANT');
  });

  it('a savings group is always SAVE, with no picker', () => {
    mount({ cashflowGroups: [SAVE] });
    expect(q('.allocation-trigger')).toBeNull();
    const label = [...container!.querySelectorAll<HTMLElement>('div[title]')].find(d => d.textContent === 'SAVE')!;
    expect(label.title).toBe('กลุ่มลงทุน/ออมเป็น SAVE เสมอ');
  });

  it('an income group has neither', () => {
    mount({ cashflowGroups: [INCOME] });
    expect(q('.allocation-trigger')).toBeNull();
    expect(container!.textContent).not.toContain('SAVE');
  });
});

describe('CashflowGroupsCard name, colour and icon', () => {
  it('the name is saved after the pause', async () => {
    mount({ cashflowGroups: [FOOD] });
    type(nameInputs()[0], 'ค่าอาหาร');
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(props.handleChangeCashflowGroup).toHaveBeenCalledWith('g-food', 'name', 'ค่าอาหาร');
  });

  it('a blank name is refused with a message', async () => {
    mount({ cashflowGroups: [FOOD] });
    type(nameInputs()[0], '');
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(container!.textContent).toContain('ต้องมีชื่อกลุ่ม');
    expect(props.handleChangeCashflowGroup).not.toHaveBeenCalled();
  });

  it('a name the server refuses stays on screen with a retry message', async () => {
    mount({ cashflowGroups: [FOOD], handleChangeCashflowGroup: vi.fn(async () => false) });
    type(nameInputs()[0], 'ค่าอาหาร');
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(nameInputs()[0].value).toBe('ค่าอาหาร');
    expect(container!.textContent).toContain('บันทึกไม่สำเร็จ ลองอีกครั้ง');
  });

  it('colour and icon picks are reported with their field', () => {
    mount({ cashflowGroups: [FOOD] });
    click(btn('เลือกสี'));
    click(document.querySelector('button[aria-label="สี #F90606"]'));
    expect(props.handleChangeCashflowGroup).toHaveBeenCalledWith('g-food', 'color', '#F90606');
    click(btn('เลือกไอคอน'));
    click(document.querySelector('.grid-cols-12 > button'));
    expect(calls(props.handleChangeCashflowGroup).some(c => c[1] === 'icon')).toBe(true);
  });

  it('a group without a colour shows the neutral swatch', () => {
    mount({ cashflowGroups: [{ ...FOOD, color: null }] });
    expect(btn('เลือกสี').style.backgroundColor).toBe('rgb(100, 116, 139)');
  });
});

describe('CashflowGroupsCard usage count and delete', () => {
  it('shows how many transactions use a group, with a tooltip; nothing at zero', () => {
    mount({ cashflowGroups: [INCOME, FOOD], txCountByGroup: { 'g-food': 12 } });
    const badge = container!.querySelector<HTMLElement>('span[title^="มี "]')!;
    expect(badge.textContent).toBe('12');
    expect(badge.title).toBe('มี 12 รายการในกลุ่มนี้ (ในมุมมองปัจจุบัน)');
    expect(container!.querySelectorAll('span[title^="มี "]')).toHaveLength(1);
  });

  it('a default group shows a lock and cannot be deleted', () => {
    mount({ cashflowGroups: [{ ...FOOD, isDefault: true }] });
    expect(container!.querySelector('span[title="กลุ่มเริ่มต้นลบไม่ได้"]')).not.toBeNull();
    expect(container!.querySelector('button[aria-label^="ลบ"]')).toBeNull();
  });

  it('a group in use has a disabled delete button that says why', () => {
    mount({ cashflowGroups: [FOOD], categories: [cat('c1', { cashflowGroup: 'g-food' })] });
    const del = container!.querySelector<HTMLButtonElement>('button[aria-label^="ลบ"]')!;
    expect(del.disabled).toBe(true);
    expect(del.getAttribute('aria-label')).toBe('ลบไม่ได้ มีหมวดหมู่ใช้งานอยู่');
    click(del);
    expect(props.handleDeleteGroup).not.toHaveBeenCalled();
  });

  it('an unused group takes two clicks to delete', () => {
    mount({ cashflowGroups: [FOOD] });
    click(container!.querySelector('button[aria-label="ลบกลุ่มนี้"]'));
    expect(props.handleDeleteGroup).not.toHaveBeenCalled();
    click(container!.querySelector('button[aria-label="กดอีกครั้งเพื่อยืนยันลบ"]'));
    expect(props.handleDeleteGroup).toHaveBeenCalledWith('g-food');
  });

  it('the delete error is shown under that group only, and the row turns danger', () => {
    mount({ cashflowGroups: [INCOME, FOOD], cashflowDeleteError: { id: 'g-food', msg: 'ไม่สามารถลบได้' } });
    expect(container!.textContent).toContain('ไม่สามารถลบได้');
    expect(container!.querySelectorAll('p.border').length).toBe(1);
    const [payRow, foodRow] = rows();
    expect(foodRow.className).toContain('tint-danger');
    expect(payRow.className).not.toContain('tint-danger');
  });

  it('no error, no message', () => {
    mount({ cashflowGroups: [FOOD], cashflowDeleteError: null });
    expect(container!.querySelector('p.border')).toBeNull();
  });
});
