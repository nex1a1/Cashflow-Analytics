// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import BudgetsCard from '../components/BudgetsCard';
import { click, flush, key, q, type } from '@/test-utils/dom';
import { grp } from './fixtures';
import type { CashflowGroup } from '@/types';

const h = vi.hoisted(() => ({
  budgets: {} as Record<string, number>,
  setBudget: vi.fn(),
}));
vi.mock('@/hooks/useBudgets', () => ({ default: () => ({ budgets: h.budgets, setBudget: h.setBudget }) }));

const FOOD = grp('food', { name: 'ค่ากิน', order_index: 1 });
const MISC = grp('misc', { name: 'จิปาถะ', order_index: 2 });
const PAY = grp('pay', { name: 'เงินเดือน', type: 'income', order_index: 0 });
const INV = grp('inv', { name: 'ลงทุน', type: 'savings', order_index: 3 });

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = (groups: CashflowGroup[] = [FOOD, MISC, PAY, INV]) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<BudgetsCard cashflowGroups={groups} />));
};
const text = () => container!.textContent ?? '';
const editBtn = (id: string) => container!.querySelector<HTMLButtonElement>(`button[id$="-edit-${id}"]`);
const field = () => q<HTMLInputElement>('input[type="text"]')!;
const saveBtn = () => [...container!.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent!.includes('บันทึก'))!;
const cancelBtn = () => [...container!.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === 'ยกเลิก')!;
const error = () => container!.querySelector('[id*="-err-"]')?.textContent ?? '';

beforeEach(() => {
  h.budgets = {};
  h.setBudget.mockReset().mockImplementation(async (id: string, baht: number | null) => {
    h.budgets = { ...h.budgets };
    if (baht && baht > 0) h.budgets[id] = Math.round(baht * 100); else delete h.budgets[id];
    return true;
  });
});
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
});

describe('BudgetsCard list', () => {
  it('title, explanation, and only expense groups (no income, no savings)', () => {
    mount();
    expect(container!.querySelector('h2')!.textContent).toContain('งบประมาณ');
    expect(text()).toContain('ตั้งเฉพาะกลุ่มที่ใช้รายวัน');
    expect(text()).toContain('ค่ากิน');
    expect(text()).toContain('จิปาถะ');
    expect(text()).not.toContain('เงินเดือน');
    expect(text()).not.toContain('ลงทุน');
  });

  it('groups without a budget are small "set budget" chips, in group order', () => {
    mount([MISC, FOOD]);
    const chips = [...container!.querySelectorAll<HTMLButtonElement>('button[aria-label^="ตั้งงบของ"]')];
    expect(chips.map(c => c.getAttribute('aria-label'))).toEqual(['ตั้งงบของ ค่ากิน', 'ตั้งงบของ จิปาถะ']);
    expect(chips[0].title).toBe('ตั้งงบ ค่ากิน');
    expect(text()).not.toContain('ยังไม่ตั้ง');
  });

  it('a group with a budget is a row with the amount and an edit button; the badge counts them', () => {
    h.budgets = { food: 150_000 };
    mount();
    expect(text()).toContain('฿1,500');
    expect(editBtn('food')!.getAttribute('aria-label')).toBe('แก้ไขงบของ ค่ากิน');
    expect(editBtn('food')!.textContent).toContain('แก้ไข');
    expect(editBtn('misc')!.getAttribute('aria-label')).toBe('ตั้งงบของ จิปาถะ');
    expect(container!.querySelector('h2 span')!.textContent).toBe('1');
  });

  it('amounts keep up to two decimals and drop trailing zeros', () => {
    h.budgets = { food: 123_456, misc: 123_450 };
    mount();
    expect(text()).toContain('฿1,234.56');
    expect(text()).toContain('฿1,234.5');
  });

  it('badge is 0 when nothing is set', () => {
    mount();
    expect(container!.querySelector('h2 span')!.textContent).toBe('0');
  });

  it('a budget on a group that is not an expense group is not counted', () => {
    h.budgets = { pay: 100_000, food: 50_000 };
    mount();
    expect(container!.querySelector('h2 span')!.textContent).toBe('1');
  });

  it('no expense groups at all: says so', () => {
    mount([PAY, INV]);
    expect(text()).toContain('ยังไม่มีกลุ่มรายจ่าย');
  });
});

describe('BudgetsCard editing', () => {
  it('a chip turns into an empty input row; its text is selected on focus and it has a label', () => {
    mount();
    click(editBtn('food'));
    expect(field().value).toBe('');
    expect(field().getAttribute('aria-label')).toBe('งบของ ค่ากิน (บาท)');
    expect(field().placeholder).toBe('เว้นว่าง = ไม่ตั้งงบ');
    expect(document.activeElement).toBe(field());
    expect(editBtn('food')).toBeNull(); // the chip is gone while editing
  });

  it('editing an existing budget starts from its current amount in baht', () => {
    h.budgets = { food: 123_456 };
    mount();
    click(editBtn('food'));
    expect(field().value).toBe('1234.56');
  });

  it('Enter saves the number in baht and closes the editor', async () => {
    mount();
    click(editBtn('food'));
    type(field(), '1500');
    key(field(), 'Enter');
    await flush();
    expect(h.setBudget).toHaveBeenCalledWith('food', 1500);
    expect(q('input[type="text"]')).toBeNull();
    expect(text()).toContain('฿1,500');
  });

  it('the Save button saves too', async () => {
    mount();
    click(editBtn('food'));
    type(field(), '800');
    click(saveBtn());
    await flush();
    expect(h.setBudget).toHaveBeenCalledWith('food', 800);
  });

  it('commas, spaces and the baht sign are ignored', async () => {
    mount();
    click(editBtn('food'));
    type(field(), '฿ 2,000.50');
    key(field(), 'Enter');
    await flush();
    expect(h.setBudget).toHaveBeenCalledWith('food', 2000.5);
  });

  it('focus goes back to the row\'s edit button after saving', async () => {
    mount();
    click(editBtn('food'));
    type(field(), '1500');
    key(field(), 'Enter');
    await flush();
    expect(document.activeElement).toBe(editBtn('food'));
  });

  it('focus is handed back once only: later re-renders do not pull it from wherever the user went', async () => {
    mount();
    click(editBtn('food'));
    type(field(), '1500');
    key(field(), 'Enter');
    await flush();
    expect(document.activeElement).toBe(editBtn('food'));
    const other = document.createElement('input');
    document.body.appendChild(other);
    other.focus();
    click(editBtn('misc')); // another edit opens and closes, re-rendering the card
    click(cancelBtn());
    other.focus();
    await flush();
    expect(document.activeElement).not.toBe(editBtn('food'));
    other.remove();
  });

  it('the error belongs to the row being edited only, not to the others', () => {
    h.budgets = { misc: 50_000 };
    mount();
    click(editBtn('food'));
    type(field(), 'abc');
    key(field(), 'Enter');
    expect(container!.querySelectorAll('[id*="-err-"]')).toHaveLength(1);
    expect(container!.querySelector('[id*="-err-food"]')).not.toBeNull();
  });

  it('while the only unset group is being edited there is no leftover chip bar', () => {
    mount([FOOD]);
    expect(container!.querySelector('svg.lucide-plus')).not.toBeNull();
    click(editBtn('food'));
    expect(container!.querySelector('svg.lucide-plus')).toBeNull();
  });

  it('opening an existing budget selects its text, ready to overtype', () => {
    h.budgets = { food: 150_000 };
    mount();
    click(editBtn('food'));
    expect(field().selectionStart).toBe(0);
    expect(field().selectionEnd).toBe('1500'.length);
  });

  it('an amount that rounds to the saved one is unchanged: 12.345 baht = 12.35 baht = 1,235 satang', async () => {
    h.budgets = { food: 1235 };
    mount();
    click(editBtn('food'));
    type(field(), '12.345');
    key(field(), 'Enter');
    await flush();
    expect(h.setBudget).not.toHaveBeenCalled();
  });

  it('blank removes the budget', async () => {
    h.budgets = { food: 150_000 };
    mount();
    click(editBtn('food'));
    type(field(), '');
    key(field(), 'Enter');
    await flush();
    expect(h.setBudget).toHaveBeenCalledWith('food', null);
    expect(text()).not.toContain('฿1,500');
  });

  it.each([['abc'], ['0'], ['-5'], ['1.2.3']])('"%s" is refused next to the field and nothing is sent', async (typed) => {
    mount();
    click(editBtn('food'));
    type(field(), typed);
    key(field(), 'Enter');
    await flush();
    expect(h.setBudget).not.toHaveBeenCalled();
    expect(error()).toBe('กรอกเป็นตัวเลขมากกว่า 0 หรือเว้นว่างถ้าไม่อยากตั้งงบ');
    expect(field().getAttribute('aria-invalid')).toBe('true');
    expect(field().getAttribute('aria-describedby')).toBe(container!.querySelector('[id*="-err-"]')!.id);
    expect(field().className).toContain('tint-danger');
    expect(field().value).toBe(typed);
  });

  it('typing again clears the message', () => {
    mount();
    click(editBtn('food'));
    type(field(), 'abc');
    key(field(), 'Enter');
    type(field(), '12');
    expect(error()).toBe('');
    expect(field().hasAttribute('aria-invalid')).toBe(false);
  });

  it('an unchanged amount just closes, with no request', async () => {
    h.budgets = { food: 150_000 };
    mount();
    click(editBtn('food'));
    key(field(), 'Enter');
    await flush();
    expect(h.setBudget).not.toHaveBeenCalled();
    expect(q('input[type="text"]')).toBeNull();
  });

  it('blank on a group with no budget also just closes', async () => {
    mount();
    click(editBtn('food'));
    key(field(), 'Enter');
    await flush();
    expect(h.setBudget).not.toHaveBeenCalled();
    expect(q('input[type="text"]')).toBeNull();
  });

  it('the same number written differently is still unchanged', async () => {
    h.budgets = { food: 150_000 };
    mount();
    click(editBtn('food'));
    type(field(), '1,500.00');
    key(field(), 'Enter');
    await flush();
    expect(h.setBudget).not.toHaveBeenCalled();
  });

  it('satang are rounded: 12.345 baht is 1,235 satang', async () => {
    mount();
    click(editBtn('food'));
    type(field(), '12.345');
    key(field(), 'Enter');
    await flush();
    expect(h.budgets.food).toBe(1235);
  });

  it('Esc and the Cancel button give up without saving and return focus to the button', async () => {
    h.budgets = { food: 150_000 };
    mount();
    click(editBtn('food'));
    type(field(), '999');
    key(field(), 'Escape');
    await flush();
    expect(h.setBudget).not.toHaveBeenCalled();
    expect(text()).toContain('฿1,500');
    expect(document.activeElement).toBe(editBtn('food'));
    click(editBtn('food'));
    click(cancelBtn());
    await flush();
    expect(h.setBudget).not.toHaveBeenCalled();
    expect(q('input[type="text"]')).toBeNull();
  });

  it('a refused save keeps the editor open with what was typed and says so', async () => {
    h.setBudget.mockResolvedValue(false);
    mount();
    click(editBtn('food'));
    type(field(), '700');
    key(field(), 'Enter');
    await flush();
    expect(field().value).toBe('700');
    expect(error()).toBe('บันทึกไม่สำเร็จ ลองอีกครั้ง');
    expect(field().disabled).toBe(false);
  });

  it('while saving the field and both buttons are locked', async () => {
    let finish!: (ok: boolean) => void;
    h.setBudget.mockReturnValue(new Promise<boolean>(r => { finish = r; }));
    mount();
    click(editBtn('food'));
    type(field(), '700');
    key(field(), 'Enter');
    await flush();
    expect(field().disabled).toBe(true);
    expect(saveBtn().disabled).toBe(true);
    expect(cancelBtn().disabled).toBe(true);
    await act(async () => { finish(true); });
    expect(q('input[type="text"]')).toBeNull();
  });

  it('opening another group clears an old message', () => {
    mount();
    click(editBtn('food'));
    type(field(), 'abc');
    key(field(), 'Enter');
    expect(error()).not.toBe('');
    click(cancelBtn());
    click(editBtn('misc'));
    expect(error()).toBe('');
  });

  it('the group name sits next to the field being edited', () => {
    mount();
    click(editBtn('misc'));
    expect(container!.textContent).toContain('จิปาถะ');
    expect(field().getAttribute('aria-label')).toBe('งบของ จิปาถะ (บาท)');
  });
});
