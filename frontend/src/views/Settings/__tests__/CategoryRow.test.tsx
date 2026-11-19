// @vitest-environment jsdom
import type { Mock } from 'vitest';
type AnyMock = Mock<(...args: any[]) => any>;
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import CategoryRow, { CategoryRowProps } from '../components/CategoryRow';
import { CATEGORY_ICONS } from '@/constants/categoryIcons';
import { click, q, type } from '@/test-utils/dom';
import { cat, grp } from './fixtures';

let root: Root | null = null;
let container: HTMLElement | null = null;
let props: CategoryRowProps;
const FOOD = grp('g-food', { name: 'ค่ากิน', color: '#F97316' });
const BILLS = grp('g-bills', { name: 'ค่าบิล', color: '#38BDF8' });
const SALARY = grp('g-pay', { name: 'เงินเดือน', type: 'income', color: '#10B981' });
// stable references, like the real caller (memoised in the parent)
const EXPENSE_GROUPS = [FOOD, BILLS];
const ALL_GROUPS = [FOOD, BILLS, SALARY];

const render = () => act(() => root!.render(<CategoryRow {...props} />));
const mount = (p: Partial<CategoryRowProps> = {}) => {
  props = {
    cat: cat('c1', { name: 'กาแฟ', cashflowGroup: 'g-food', color: '#445566', icon: 'coffee' }),
    onMove: vi.fn(), onChange: vi.fn(), onDelete: vi.fn(),
    filteredGroups: EXPENSE_GROUPS, cashflowGroups: ALL_GROUPS,
    isFirst: false, isLast: false, ...p,
  };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  render();
};
const row = () => container!.firstElementChild as HTMLElement;
const name = () => q<HTMLInputElement>('input[type="text"]')!;
const btn = (label: string) => container!.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const groupBtn = () => btn('กลุ่มของหมวดหมู่');
const options = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')];

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

describe('CategoryRow ordering', () => {
  it('up and down send the id and direction', () => {
    mount();
    click(btn('เลื่อน กาแฟ ขึ้น'));
    click(btn('เลื่อน กาแฟ ลง'));
    expect((props.onMove as AnyMock).mock.calls).toEqual([['c1', 'UP'], ['c1', 'DOWN']]);
  });

  it('the first row cannot go up, the last cannot go down', () => {
    mount({ isFirst: true, isLast: false });
    expect(btn('เลื่อน กาแฟ ขึ้น').disabled).toBe(true);
    expect(btn('เลื่อน กาแฟ ลง').disabled).toBe(false);
    act(() => root!.unmount()); container!.remove();
    mount({ isFirst: false, isLast: true });
    expect(btn('เลื่อน กาแฟ ขึ้น').disabled).toBe(false);
    expect(btn('เลื่อน กาแฟ ลง').disabled).toBe(true);
    click(btn('เลื่อน กาแฟ ลง'));
    expect(props.onMove).not.toHaveBeenCalled();
  });

});

describe('CategoryRow editing', () => {
  it('a typed name is saved after the pause, with the id and field', async () => {
    mount();
    type(name(), 'ชานม');
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(props.onChange).toHaveBeenCalledWith('c1', 'name', 'ชานม');
  });

  it('a blank name is refused with a message and never sent', async () => {
    mount();
    type(name(), '');
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(container!.textContent).toContain('ต้องมีชื่อหมวดหมู่');
    expect(props.onChange).not.toHaveBeenCalled();
  });

});

describe('CategoryRow group', () => {

  it('a group of the wrong kind (e.g. an income group on an expense category) is flagged', () => {
    mount({ cat: cat('c1', { cashflowGroup: 'g-pay' }) });
    expect(row().querySelector('svg.lucide-alert-triangle')).not.toBeNull();
    expect(groupBtn().className).toContain('text-warn');
    expect(groupBtn().title).toBe('กลุ่มนี้ไม่ตรงกับประเภทของหมวดหมู่');
  });

  it('the border colour on focus is green for income and accent for the rest', () => {
    mount({ isIncome: true });
    expect(name().className).toContain('focus:border-emerald-500/70');
    act(() => root!.unmount()); container!.remove();
    mount({ isIncome: false });
    expect(name().className).toContain('focus:border-accent/70');
  });
});

describe('CategoryRow delete', () => {
  it('takes two clicks and reports the id', () => {
    mount();
    const del = () => btn('ลบหมวดหมู่: กาแฟ') ?? container!.querySelector<HTMLButtonElement>('button[aria-label^="กดอีกครั้ง"]')!;
    click(del());
    expect(props.onDelete).not.toHaveBeenCalled();
    click(container!.querySelector<HTMLButtonElement>('button[aria-label="กดอีกครั้งเพื่อยืนยันลบ: กาแฟ"]'));
    expect(props.onDelete).toHaveBeenCalledWith('c1');
  });
});
