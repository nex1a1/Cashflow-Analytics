// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import LegendAllocationBlock, { LegendAllocationBlockProps, LegendGroupItem, AllocationTotals } from '../LegendAllocationBlock';
import { click } from '@/test-utils/dom';
import { readable } from '@/constants/theme';

let root: Root | null = null;
let container: HTMLElement | null = null;

const group = (id: string, type: string, cats: { id: string; name: string; color?: string | null }[], total: number, over: Partial<LegendGroupItem['groupObj']> = {}): LegendGroupItem => ({
  groupObj: { id, name: `กลุ่ม-${id}`, type, icon: 'wallet', color: '#336699', ...over },
  categories: cats,
  groupTotal: total,
});

const ALLOC: AllocationTotals = {
  need: 3000, want: 1000, savings: 6000, totalExpense: 10000,
  needPct: 30, wantPct: 10, savingsPct: 60,
  needCats: [{ name: 'ค่าเช่า', groupName: 'บ้าน', amount: 3000, color: '#111111' }],
  wantCats: [{ id: 'w1', name: 'หนัง', groupName: 'บันเทิง', amount: 1000, color: '#222222' }],
  savingsCats: [],
};

const GROUPS: LegendGroupItem[] = [
  group('inc', 'income', [{ id: 'sal', name: 'เงินเดือน', color: '#10B981' }], 10000),
  group('sav', 'savings', [{ id: 'gold', name: 'ทอง', color: null }], 500),
  group('exp', 'expense', [{ id: 'rent', name: 'ค่าเช่า', color: '#0000AA' }, { id: 'fun', name: 'หนัง', color: '#AA0000' }], 4000, { icon: null, color: null }),
];
const AMOUNTS = { sal: 10000, gold: 500, rent: 3000, fun: 1000 };

const props = (over: Partial<LegendAllocationBlockProps> = {}): LegendAllocationBlockProps => ({
  sortedGroups: GROUPS,
  catAmounts: AMOUNTS,
  excludedCategoryIds: new Set(),
  toggleCategory: vi.fn(),
  legendLayoutMode: 'compact',
  legendSortMode: 'structure',
  handleSetLayoutMode: vi.fn(),
  handleSetSortMode: vi.fn(),
  allocationTotals: ALLOC,
  ...over,
});

const mount = (p: LegendAllocationBlockProps) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<LegendAllocationBlock {...p} />));
  return p;
};
const text = () => container!.textContent ?? '';
const btn = (label: string) => container!.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const chipOf = (name: string) => [...container!.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')]
  .find(b => b.querySelector('span')?.textContent === name)!;
const groupAmount = (id: string) => {
  const name = [...container!.querySelectorAll('span.truncate')].find(s => s.textContent === `กลุ่ม-${id}`)!;
  return name.closest('div')!.lastElementChild!;
};

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
});

describe('LegendAllocationBlock empty', () => {
  it('says the period has no rows and draws nothing else', () => {
    mount(props({ sortedGroups: [] }));
    expect(text()).toBe('ช่วงนี้ยังไม่มีรายการ');
    expect(container!.querySelector('button')).toBeNull();
  });
});

describe('LegendAllocationBlock switches', () => {
  it('layout and sort buttons report pressed state', () => {
    mount(props());
    expect(btn('แบบย่อ').getAttribute('aria-pressed')).toBe('true');
    expect(btn('แยกกลุ่ม').getAttribute('aria-pressed')).toBe('false');
    expect(btn('เรียงตามโครงสร้าง').getAttribute('aria-pressed')).toBe('true');
    expect(btn('เรียงตามยอดเงิน').getAttribute('aria-pressed')).toBe('false');
    expect(btn('แบบย่อ').classList.contains('bg-accent')).toBe(true);
    expect(btn('แยกกลุ่ม').classList.contains('bg-accent')).toBe(false);
  });

  it('the other state', () => {
    mount(props({ legendLayoutMode: 'grouped', legendSortMode: 'amount' }));
    expect(btn('แบบย่อ').getAttribute('aria-pressed')).toBe('false');
    expect(btn('แยกกลุ่ม').getAttribute('aria-pressed')).toBe('true');
    expect(btn('เรียงตามโครงสร้าง').getAttribute('aria-pressed')).toBe('false');
    expect(btn('เรียงตามยอดเงิน').getAttribute('aria-pressed')).toBe('true');
    expect(btn('เรียงตามยอดเงิน').classList.contains('bg-accent')).toBe(true);
  });

  it('each button calls its handler with its mode', () => {
    const p = mount(props());
    click(btn('แยกกลุ่ม'));
    click(btn('แบบย่อ'));
    click(btn('เรียงตามยอดเงิน'));
    click(btn('เรียงตามโครงสร้าง'));
    expect(p.handleSetLayoutMode).toHaveBeenNthCalledWith(1, 'grouped');
    expect(p.handleSetLayoutMode).toHaveBeenNthCalledWith(2, 'compact');
    expect(p.handleSetSortMode).toHaveBeenNthCalledWith(1, 'amount');
    expect(p.handleSetSortMode).toHaveBeenNthCalledWith(2, 'structure');
  });

  it('"แสดงทั้งหมด" only while something is hidden, and it clears all', () => {
    mount(props());
    const showAll = () => [...container!.querySelectorAll('button')].find(b => b.textContent === 'แสดงทั้งหมด');
    expect(showAll()).toBeUndefined();
    act(() => root!.unmount()); container!.remove();
    const p = mount(props({ excludedCategoryIds: new Set(['fun']) }));
    click(showAll());
    expect(p.toggleCategory).toHaveBeenCalledWith('CLEAR_ALL');
  });
});

describe('LegendAllocationBlock compact chips', () => {
  it('one chip per category in group order, with its amount', () => {
    mount(props());
    const names = [...container!.querySelectorAll('button[aria-pressed] > span:first-of-type')].map(s => s.textContent);
    expect(names).toEqual(['เงินเดือน', 'ทอง', 'ค่าเช่า', 'หนัง']);
    expect(chipOf('ค่าเช่า').textContent).toContain('฿3,000.00');
    expect(chipOf('ค่าเช่า').classList.contains('rounded-none')).toBe(true);
  });

  it('a category without an amount shows ฿0.00', () => {
    mount(props({ catAmounts: {} }));
    expect(chipOf('ทอง').textContent).toContain('฿0.00');
  });

  it('clicking a chip toggles that category', () => {
    const p = mount(props());
    click(chipOf('หนัง'));
    expect(p.toggleCategory).toHaveBeenCalledWith('fun');
  });

  it('a shown chip is pressed, tinted and readable; a hidden one is dimmed', () => {
    mount(props({ excludedCategoryIds: new Set(['fun']) }));
    const on = chipOf('ค่าเช่า');
    const off = chipOf('หนัง');
    expect(on.getAttribute('aria-pressed')).toBe('true');
    expect(off.getAttribute('aria-pressed')).toBe('false');
    expect(on.style.backgroundColor).toBe('rgba(0, 0, 170, 0.08)');
    expect(on.style.borderColor).toBe('rgba(0, 0, 170, 0.25)');
    expect(readable('#0000AA')).not.toBe('#0000AA');
    expect(on.style.color).not.toBe('rgb(0, 0, 170)');
    expect(off.style.backgroundColor).toBe('transparent');
    expect(off.style.borderColor).toBe('rgba(170, 0, 0, 0.1)');
    expect(off.className).toContain('opacity-30');
    expect(on.className).not.toContain('opacity-30');
    expect((off.firstElementChild as HTMLElement).style.opacity).toBe('0.3');
    expect((on.firstElementChild as HTMLElement).style.opacity).toBe('1');
  });

  it('a category without a colour falls back to body ink', () => {
    mount(props());
    expect((chipOf('ทอง').firstElementChild as HTMLElement).style.backgroundColor).not.toBe('');
  });
});

describe('LegendAllocationBlock grouped rows', () => {
  it('one row per group with name, icon and its categories', () => {
    mount(props({ legendLayoutMode: 'grouped' }));
    expect(text()).toContain('กลุ่ม-inc');
    expect(text()).toContain('กลุ่ม-exp');
    const expRow = groupAmount('exp').closest('.flex-1')!;
    expect(expRow.querySelectorAll('button[aria-pressed]')).toHaveLength(2);
    expect(expRow.querySelector('button[aria-pressed]')!.classList.contains('rounded-pill')).toBe(true);
    expect(groupAmount('inc').closest('div')!.querySelector('svg')).not.toBeNull();
    expect(groupAmount('exp').closest('div')!.querySelector('svg')).toBeNull();
  });

  it('income +, expense −, savings ± with their colours', () => {
    mount(props({ legendLayoutMode: 'grouped' }));
    expect(groupAmount('inc').textContent).toBe('+฿10,000.00');
    expect(groupAmount('inc').classList.contains('text-income')).toBe(true);
    expect(groupAmount('exp').textContent).toBe('−฿4,000.00');
    expect(groupAmount('exp').classList.contains('text-expense')).toBe(true);
    expect(groupAmount('sav').textContent).toBe('±฿500.00');
    expect(groupAmount('sav').classList.contains('text-savings')).toBe(true);
  });

  // ขายมากกว่าซื้อ: ยอดสุทธิติดลบต้องเขียน −฿500.00 ไม่ใช่ ±−฿500.00
  it('a savings group with net sells reads −฿500.00, not ±−฿500.00', () => {
    mount(props({ legendLayoutMode: 'grouped', sortedGroups: [group('sav', 'savings', [{ id: 'gold', name: 'ทอง' }], -500)] }));
    expect(groupAmount('sav').textContent).toBe('−฿500.00');
  });

  it('a zero total carries no sign', () => {
    mount(props({ legendLayoutMode: 'grouped', sortedGroups: [group('exp', 'expense', [{ id: 'x', name: 'x' }], 0), group('inc', 'income', [{ id: 'y', name: 'y' }], 0), group('sav', 'savings', [{ id: 'z', name: 'z' }], 0)] }));
    expect(groupAmount('exp').textContent).toBe('฿0.00');
    expect(groupAmount('inc').textContent).toBe('฿0.00');
    expect(groupAmount('sav').textContent).toBe('฿0.00');
  });

  it('grouped chips toggle and dim the same way', () => {
    const p = mount(props({ legendLayoutMode: 'grouped', excludedCategoryIds: new Set(['rent']) }));
    expect(chipOf('ค่าเช่า').getAttribute('aria-pressed')).toBe('false');
    expect(chipOf('ค่าเช่า').style.backgroundColor).toBe('transparent');
    expect(chipOf('ค่าเช่า').style.borderColor).toBe('rgba(0, 0, 170, 0.1)');
    expect(chipOf('หนัง').style.backgroundColor).toBe('rgba(170, 0, 0, 0.08)');
    expect(chipOf('หนัง').style.borderColor).toBe('rgba(170, 0, 0, 0.25)');
    expect((chipOf('ค่าเช่า').firstElementChild as HTMLElement).style.opacity).toBe('0.3');
    expect((chipOf('หนัง').firstElementChild as HTMLElement).style.opacity).toBe('1');
    expect(chipOf('ค่าเช่า').className).toContain('opacity-30');
    expect(chipOf('หนัง').textContent).toContain('฿1,000.00');
    click(chipOf('หนัง'));
    expect(p.toggleCategory).toHaveBeenCalledWith('fun');
  });

  it('a chip with no amount shows ฿0.00', () => {
    mount(props({ legendLayoutMode: 'grouped', catAmounts: {} }));
    expect(chipOf('หนัง').textContent).toContain('฿0.00');
  });
});

describe('LegendAllocationBlock allocation overview', () => {
  const row = (label: string) => [...container!.querySelectorAll('span.flex.items-center.gap-1\\.5')]
    .find(s => s.textContent?.trim() === label)!.parentElement!;

  it('three rows with amount and %', () => {
    mount(props());
    expect(row('NEED').lastElementChild!.textContent).toBe('฿3,000.00 (30%)');
    expect(row('WANT').lastElementChild!.textContent).toBe('฿1,000.00 (10%)');
    expect(row('SAVE').lastElementChild!.textContent).toBe('฿6,000.00 (60%)');
  });

  it('with money left the basis is income, otherwise expenses', () => {
    mount(props());
    expect(text()).toContain('สัดส่วนของรายรับ');
    act(() => root!.render(<LegendAllocationBlock {...props({ allocationTotals: { ...ALLOC, savings: 0 } })} />));
    expect(text()).toContain('สัดส่วนของรายจ่าย');
    expect(text()).not.toContain('สัดส่วนของรายรับ');
  });

  it('the stacked bar follows the percentages', () => {
    mount(props());
    const bar = [...container!.querySelectorAll<HTMLElement>('[title^="NEED:"]')][0].parentElement!;
    const parts = [...bar.children] as HTMLElement[];
    expect(parts.map(p => p.style.width)).toEqual(['30%', '10%', '60%']);
    expect(parts.map(p => p.title)).toEqual(['NEED: 30%', 'WANT: 10%', 'SAVE: 60%']);
  });

  it('no bar when there is nothing to split', () => {
    mount(props({ allocationTotals: { ...ALLOC, totalExpense: 0 } }));
    expect(container!.querySelector('[title^="จำเป็น:"]')).toBeNull();
  });

  it('category breakdown shows only in grouped mode', () => {
    mount(props());
    expect(text()).not.toContain('(บ้าน)');
    act(() => root!.render(<LegendAllocationBlock {...props({ legendLayoutMode: 'grouped' })} />));
    expect(text()).toContain('(บ้าน)');
    expect(text()).toContain('(บันเทิง)');
    const sub = [...container!.querySelectorAll('span.truncate')].find(s => s.textContent?.includes('(บ้าน)'))!;
    expect(sub.closest('.justify-between')!.lastElementChild!.textContent).toBe('฿3,000.00');
  });

  it('an allocation row without categories draws no breakdown box', () => {
    mount(props({ legendLayoutMode: 'grouped' }));
    expect(container!.querySelectorAll('.pl-3\\.5')).toHaveLength(2);
  });
});
