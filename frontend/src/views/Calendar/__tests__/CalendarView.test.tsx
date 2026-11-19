// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { click } from '@/test-utils/dom';
import { STORAGE_KEYS } from '@/constants';
import { cycleLabel, cycleRangeLabel } from '@/utils/payCycle';
import { readable } from '@/constants/theme';
import { hexToRgb } from '@/utils/formatters';
import { DAY_TYPES, cat, grp, tx } from './fixtures';
import type { CalendarViewProps } from '../index';

const h = vi.hoisted(() => ({ modal: null as null | Record<string, any> }));
vi.mock('@/components/modals/DayDetailModal/index', () => ({
  default: (p: Record<string, any>) => { h.modal = p; return <div data-testid="day-modal">{p.dateStr}</div>; },
}));

import CalendarView from '../index';

let root: Root | null = null;
let container: HTMLElement | null = null;

const GROUPS = [
  grp('g_inc', { name: 'รายรับหลัก', type: 'income', allocation_type: null, order_index: 0 }),
  grp('g_need', { name: 'บ้าน', allocation_type: 'need', order_index: 1, color: '#0000AA' }),
  grp('g_want', { name: 'บันเทิง', allocation_type: 'want', order_index: 2 }),
  grp('g_sav', { name: 'ลงทุน', type: 'savings', allocation_type: 'savings', order_index: 3 }),
];
const CATS = [
  cat('c_sal', { name: 'เงินเดือน', type: 'income', cashflowGroup: 'g_inc' }),
  cat('c_rent', { name: 'ค่าเช่า', cashflowGroup: 'g_need', order_index: 1 }),
  cat('c_elec', { name: 'ค่าไฟ', cashflowGroup: 'g_need', order_index: 2 }),
  cat('c_fun', { name: 'หนัง', cashflowGroup: 'g_want' }),
  cat('c_gold', { name: 'ทอง', type: 'savings', cashflowGroup: 'g_sav' }),
];
const TXS = [
  tx('t_sal', '2026-11-25', 30000, { category_id: 'c_sal', description: 'เงินเดือน' }),
  tx('t_rent', '2026-11-01', 6000, { category_id: 'c_rent', description: 'ค่าห้อง' }),
  tx('t_elec', '2026-11-03', 900, { category_id: 'c_elec', description: 'ไฟ' }),
  tx('t_fun', '2026-11-03', 300, { category_id: 'c_fun', description: 'ดูหนัง' }),
  tx('t_gold', '2026-11-05', 2000, { category_id: 'c_gold', description: 'ซื้อทอง' }),
  tx('t_old', '2026-10-30', 999, { category_id: 'c_fun', description: 'เดือนก่อน' }),
];

const props = (over: Partial<CalendarViewProps> = {}): CalendarViewProps => ({
  transactions: TXS,
  filterPeriod: '2026-11',
  setFilterPeriod: vi.fn(),
  categories: CATS,
  cashflowGroups: GROUPS,
  dayTypes: {},
  handleDayTypeChange: vi.fn(),
  dayTypeConfig: DAY_TYPES,
  getFilterLabel: (p?: string) => `L:${p}`,
  isLoading: false,
  ...over,
});

const mount = (p: CalendarViewProps) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<CalendarView {...p} />));
  return p;
};
const rerender = (p: CalendarViewProps) => act(() => root!.render(<CalendarView {...p} />));
const text = () => container!.textContent ?? '';
const pill = (prefix: string) => [...container!.querySelectorAll<HTMLElement>('h2 + div > span')].find(s => s.textContent!.startsWith(prefix))?.textContent;
const chip = (name: string) => [...container!.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')]
  .find(b => b.querySelector('span')?.textContent === name)!;
const chipNames = () => [...container!.querySelectorAll('button[aria-pressed] > span:first-of-type')].map(s => s.textContent);
const btnLabel = (l: string) => container!.querySelector<HTMLButtonElement>(`button[aria-label="${l}"]`)!;
const allocRow = (label: string) => [...container!.querySelectorAll('span.flex.items-center.gap-1\\.5')]
  .find(s => s.textContent?.trim() === label)!.parentElement!.lastElementChild!.textContent;
const breakdown = (label: string) => {
  const row = [...container!.querySelectorAll('span.flex.items-center.gap-1\\.5')].find(s => s.textContent?.trim() === label)!.parentElement!;
  const box = row.nextElementSibling;
  if (!box || !box.className.includes('pl-3.5')) return [];
  return [...box.children].map(c => c.textContent);
};
const groupNames = () => [...container!.querySelectorAll('.w-\\[280px\\] span.truncate > span.truncate')].map(s => s.textContent);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 12));
  localStorage.clear();
  h.modal = null;
});
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  document.body.innerHTML = '';
  root = null; container = null;
  vi.useRealTimers();
});

describe('CalendarView period', () => {

  it('a pay cycle draws 25 → 24 with the cycle name and span', () => {
    mount(props({ filterPeriod: 'cycle:2026-10' }));
    expect(container!.querySelector('h2')!.textContent).toBe(`${cycleLabel('2026-10')} · ${cycleRangeLabel('2026-10')}`);
    expect(btnLabel('ดูรายละเอียดวันที่ 25 ต.ค.')).not.toBeNull();
    expect(btnLabel('ดูรายละเอียดวันที่ 1 พ.ย.')).not.toBeNull();
    expect(text()).toContain('31 วัน');
    // 30 Oct is inside this cycle; 25 Nov is not
    expect(pill('▼')).toBe('▼ ฿8,199.00');
    expect(pill('▲')).toBeUndefined();
  });

});

describe('CalendarView totals', () => {
  it('header: income, expense without savings, balance and invested', () => {
    mount(props());
    expect(pill('▲')).toBe('▲ ฿30,000.00');
    expect(pill('▼')).toBe('▼ ฿7,200.00');
    expect(pill('คงเหลือ')).toBe('คงเหลือ ฿22,800.00');
    expect(pill('ในนี้')).toBe('ในนี้ลงทุน/ออม ฿2,000.00');
  });

  it('rows outside the month are ignored; rows without a date too', () => {
    mount(props({ transactions: [...TXS, tx('nodate', '', 50, { category_id: 'c_fun' })] }));
    expect(text()).not.toContain('เดือนก่อน');
    expect(pill('▼')).toBe('▼ ฿7,200.00');
  });

  it('string amounts are parsed; garbage counts as 0', () => {
    mount(props({ transactions: [
      tx('a', '2026-11-02', '150.5' as unknown as number, { category_id: 'c_fun' }),
      tx('b', '2026-11-02', 'x' as unknown as number, { category_id: 'c_fun' }),
    ] }));
    expect(pill('▼')).toBe('▼ ฿150.50');
    expect(chip('หนัง').textContent).toContain('฿150.50');
  });

  it('the busiest day (expenses only) feeds the footer; items sort by amount', () => {
    mount(props());
    expect(text()).toContain('(สูงสุด ฿6,000.00)');
    const cell3 = btnLabel('ดูรายละเอียดวันที่ 3').closest('.group')!;
    const rows = [...cell3.querySelectorAll('[title]')].filter(e => (e as HTMLElement).title.includes(' — ')).map(e => (e as HTMLElement).title);
    expect(rows).toEqual(['ไฟ — ฿900.00', 'ดูหนัง — ฿300.00']);
  });

  it('income rows on one day sort by amount too', () => {
    mount(props({ transactions: [
      tx('i1', '2026-11-25', 100, { category_id: 'c_sal', description: 'เล็ก' }),
      tx('i2', '2026-11-25', 900, { category_id: 'c_sal', description: 'ใหญ่' }),
    ] }));
    const cell = btnLabel('ดูรายละเอียดวันที่ 25').closest('.group')!;
    expect(cell.textContent).toContain('ใหญ่');
    expect(cell.textContent).not.toContain('เล็ก');
  });

  it('an income category whose group is gone still counts as income', () => {
    const cats = [cat('i', { name: 'โบนัส', type: 'income', cashflowGroup: null })];
    mount(props({ categories: cats, transactions: [tx('b', '2026-11-02', 500, { category_id: 'i' })] }));
    expect(pill('▲')).toBe('▲ ฿500.00');
    expect(pill('▼')).toBeUndefined();
  });

  it('hiding a row whose category was deleted removes it from the totals', () => {
    mount(props({ transactions: [TXS[1], tx('ghost', '2026-11-02', 70, { category: 'หมวดที่ลบแล้ว' })] }));
    expect(pill('▼')).toBe('▼ ฿6,070.00');
    click(chip('หมวดที่ลบแล้ว'));
    expect(pill('▼')).toBe('▼ ฿6,000.00');
  });

  it('a category found by name when the row has no id', () => {
    mount(props({ transactions: [tx('a', '2026-11-02', 40, { category: 'ค่าไฟ' })] }));
    expect(chip('ค่าไฟ').textContent).toContain('฿40.00');
    expect(allocRow('NEED')).toBe('฿40.00 (100%)');
  });
});

describe('CalendarView legend', () => {
  it('groups: income, savings, then expense groups by order', () => {
    mount(props());
    expect(chipNames()).toEqual(['เงินเดือน', 'ทอง', 'ค่าเช่า', 'ค่าไฟ', 'หนัง']);
  });

  it('amount sort reorders inside a group and is remembered', () => {
    mount(props({ transactions: [...TXS, tx('x', '2026-11-04', 9000, { category_id: 'c_elec' })] }));
    expect(chipNames()).toEqual(['เงินเดือน', 'ทอง', 'ค่าเช่า', 'ค่าไฟ', 'หนัง']);
    click(btnLabel('เรียงตามยอดเงิน'));
    expect(chipNames()).toEqual(['เงินเดือน', 'ทอง', 'ค่าไฟ', 'ค่าเช่า', 'หนัง']);
    expect(localStorage.getItem(STORAGE_KEYS.CALENDAR_LEGEND_SORT)).toBe('amount');
    click(btnLabel('เรียงตามโครงสร้าง'));
    expect(chipNames()[2]).toBe('ค่าเช่า');
    expect(localStorage.getItem(STORAGE_KEYS.CALENDAR_LEGEND_SORT)).toBe('structure');
  });

  it('equal amounts / equal order fall back to the Thai name', () => {
    const cats = [cat('a', { name: 'ข', cashflowGroup: 'g_want' }), cat('b', { name: 'ก', cashflowGroup: 'g_want' })];
    const txs = [tx('1', '2026-11-02', 10, { category_id: 'a' }), tx('2', '2026-11-02', 10, { category_id: 'b' })];
    mount(props({ categories: cats, transactions: txs }));
    expect(chipNames()).toEqual(['ก', 'ข']);
    click(btnLabel('เรียงตามยอดเงิน'));
    expect(chipNames()).toEqual(['ก', 'ข']);
  });

  it('layout is restored from storage and saved on change', () => {
    localStorage.setItem(STORAGE_KEYS.CALENDAR_LEGEND_LAYOUT, 'grouped');
    localStorage.setItem(STORAGE_KEYS.CALENDAR_LEGEND_SORT, 'amount');
    mount(props());
    expect(btnLabel('แยกกลุ่ม').getAttribute('aria-pressed')).toBe('true');
    expect(btnLabel('เรียงตามยอดเงิน').getAttribute('aria-pressed')).toBe('true');
    expect(groupNames()).toEqual(['รายรับหลัก', 'ลงทุน', 'บ้าน', 'บันเทิง']);
    click(btnLabel('แบบย่อ'));
    expect(localStorage.getItem(STORAGE_KEYS.CALENDAR_LEGEND_LAYOUT)).toBe('compact');
    click(btnLabel('แยกกลุ่ม'));
    expect(localStorage.getItem(STORAGE_KEYS.CALENDAR_LEGEND_LAYOUT)).toBe('grouped');
  });

  it('rows whose category is gone land in an "other" group of their type', () => {
    localStorage.setItem(STORAGE_KEYS.CALENDAR_LEGEND_LAYOUT, 'grouped');
    const cats = [
      cat('i', { name: 'โบนัส', type: 'income', cashflowGroup: null }),
      cat('s', { name: 'ออมเล่น', type: 'savings', cashflowGroup: 'uncategorized' }),
      cat('e', { name: 'จิปาถะ', cashflowGroup: null }),
    ];
    const txs = [
      ...cats.map(c => tx(c.id, '2026-11-02', 10, { category_id: c.id })),
      tx('ghost', '2026-11-02', 7, { category: 'หมวดที่ลบแล้ว' }),
      tx('nocat', '2026-11-02', 3, {}),
    ];
    mount(props({ categories: cats, transactions: txs }));
    expect(groupNames()).toEqual(['รายรับอื่นๆ', 'เงินออมอื่นๆ', 'หมวดหมู่อื่นๆ']);
    expect(chipNames()).toEqual(['โบนัส', 'ออมเล่น', 'จิปาถะ', 'หมวดที่ลบแล้ว', 'อื่นๆ']);
    const other = [...container!.querySelectorAll('.w-\\[280px\\]')].find(r => r.textContent!.includes('หมวดหมู่อื่นๆ'))!;
    expect(other.lastElementChild!.textContent).toBe('−฿20.00');
    expect(other.querySelector('.lucide-tag')).not.toBeNull();
    const inc = [...container!.querySelectorAll('.w-\\[280px\\]')].find(r => r.textContent!.includes('รายรับอื่นๆ'))!;
    expect(inc.querySelector('.lucide-coins')).not.toBeNull();
    const sav = [...container!.querySelectorAll('.w-\\[280px\\]')].find(r => r.textContent!.includes('เงินออมอื่นๆ'))!;
    expect(sav.querySelector('.lucide-piggy-bank')).not.toBeNull();
  });

  // หมวดที่ประเภทของตัวเองไม่ตรงกับกลุ่ม (กลุ่มชนะ) ต้องอยู่แถวเดียวกับกลุ่ม ไม่แตกเป็นสองแถวที่ key ซ้ำกัน
  it('a category typed differently from its group stays in that group\'s one row', () => {
    localStorage.setItem(STORAGE_KEYS.CALENDAR_LEGEND_LAYOUT, 'grouped');
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const cats = [CATS[4], cat('c_odd', { name: 'หมวดเพี้ยน', type: 'expense', cashflowGroup: 'g_sav' })];
    mount(props({ categories: cats, transactions: [TXS[4], tx('o', '2026-11-06', 100, { category_id: 'c_odd' })] }));
    const dupKey = err.mock.calls.some(c => String(c[0]).includes('same key'));
    err.mockRestore();
    expect(groupNames()).toEqual(['ลงทุน']);
    expect(dupKey).toBe(false);
    const row = [...container!.querySelectorAll('.w-\\[280px\\]')].find(r => r.textContent!.includes('ลงทุน'))!;
    expect(row.lastElementChild!.textContent).toBe('±฿2,100.00');
  });

  it('"no group" and the legacy "uncategorized" id share one fallback row', () => {
    localStorage.setItem(STORAGE_KEYS.CALENDAR_LEGEND_LAYOUT, 'grouped');
    const cats = [cat('a', { name: 'ก', cashflowGroup: null }), cat('b', { name: 'ข', cashflowGroup: 'uncategorized' })];
    mount(props({ categories: cats, transactions: cats.map(c => tx(c.id, '2026-11-02', 10, { category_id: c.id })) }));
    expect(groupNames()).toEqual(['หมวดหมู่อื่นๆ']);
  });

});

describe('CalendarView hiding categories', () => {
  it('a hidden category leaves the totals and cells but keeps its legend amount', () => {
    mount(props());
    click(chip('ค่าเช่า'));
    expect(pill('▼')).toBe('▼ ฿1,200.00');
    expect(pill('คงเหลือ')).toBe('คงเหลือ ฿28,800.00');
    expect(text()).toContain('ซ่อน 1 หมวดหมู่');
    expect(chip('ค่าเช่า').getAttribute('aria-pressed')).toBe('false');
    expect(chip('ค่าเช่า').textContent).toContain('฿6,000.00');
    expect(btnLabel('ดูรายละเอียดวันที่ 1').closest('.group')!.textContent).not.toContain('ค่าห้อง');
    expect(allocRow('NEED')).toBe('฿900.00 (3%)');
  });

  it('clicking again shows it; "แสดงทั้งหมด" clears every hidden one', () => {
    mount(props());
    click(chip('ค่าเช่า'));
    click(chip('ค่าเช่า'));
    expect(pill('▼')).toBe('▼ ฿7,200.00');
    click(chip('ค่าเช่า'));
    click(chip('หนัง'));
    expect(text()).toContain('ซ่อน 2 หมวดหมู่');
    click([...container!.querySelectorAll('button')].find(b => b.textContent === 'แสดงทั้งหมด'));
    expect(text()).not.toContain('ซ่อน');
    expect(pill('▼')).toBe('▼ ฿7,200.00');
  });

  it('hiding income or savings changes those totals too', () => {
    mount(props());
    click(chip('ทอง'));
    expect(pill('ในนี้')).toBeUndefined();
    click(chip('เงินเดือน'));
    expect(pill('▲')).toBeUndefined();
    expect(pill('คงเหลือ')).toBe('คงเหลือ −฿7,200.00');
  });
});

describe('CalendarView allocation (จำเป็น + ตามใจ + เงินเหลือ)', () => {
  it('need/want from the group, leftover = income − expense, % of income', () => {
    mount(props());
    expect(allocRow('NEED')).toBe('฿6,900.00 (23%)');
    expect(allocRow('WANT')).toBe('฿300.00 (1%)');
    expect(allocRow('SAVE')).toBe('฿22,800.00 (76%)');
    expect(text()).toContain('สัดส่วนของรายรับ');
  });

  it('a row-level allocation overrides the group', () => {
    mount(props({ transactions: [TXS[0], tx('x', '2026-11-02', 300, { category_id: 'c_rent', allocation_type: 'want' })] }));
    expect(allocRow('WANT')).toBe('฿300.00 (1%)');
    expect(allocRow('NEED')).toBe('฿0.00 (0%)');
  });

  it('no group, or a group without an allocation, counts as ตามใจ', () => {
    const groups = [...GROUPS, grp('g_plain', { allocation_type: null })];
    const cats = [cat('a', { cashflowGroup: null }), cat('b', { cashflowGroup: 'g_plain' })];
    mount(props({ categories: cats, cashflowGroups: groups, transactions: [tx('1', '2026-11-02', 10, { category_id: 'a' }), tx('2', '2026-11-02', 30, { category_id: 'b' })] }));
    expect(allocRow('WANT')).toBe('฿40.00 (100%)');
    expect(allocRow('NEED')).toBe('฿0.00 (0%)');
  });

  it('percentages round half up', () => {
    mount(props({ transactions: [tx('i', '2026-11-25', 1000, { category_id: 'c_sal' }), tx('r', '2026-11-01', 125, { category_id: 'c_rent' })] }));
    expect(allocRow('NEED')).toBe('฿125.00 (13%)');
  });

  it('breakdown: invested rows plus what is still unused, under SAVE', () => {
    localStorage.setItem(STORAGE_KEYS.CALENDAR_LEGEND_LAYOUT, 'grouped');
    mount(props());
    expect(breakdown('SAVE')).toEqual(['ยังไม่ได้ใช้ (กระแสเงินสด)฿20,800.00', 'ทอง (ลงทุน)฿2,000.00']);
    expect(breakdown('NEED')).toEqual(['ค่าเช่า (บ้าน)฿6,000.00', 'ค่าไฟ (บ้าน)฿900.00']);
    expect(breakdown('WANT')).toEqual(['หนัง (บันเทิง)฿300.00']);
  });

  it('amount sort orders the breakdown by amount', () => {
    localStorage.setItem(STORAGE_KEYS.CALENDAR_LEGEND_LAYOUT, 'grouped');
    localStorage.setItem(STORAGE_KEYS.CALENDAR_LEGEND_SORT, 'amount');
    mount(props({ transactions: [...TXS, tx('x', '2026-11-04', 9000, { category_id: 'c_elec' })] }));
    expect(breakdown('NEED')).toEqual(['ค่าไฟ (บ้าน)฿9,900.00', 'ค่าเช่า (บ้าน)฿6,000.00']);
    expect(breakdown('SAVE')[0]).toBe('ยังไม่ได้ใช้ (กระแสเงินสด)฿11,800.00');
  });

  it('breakdown structure order: group, then category order, then name', () => {
    localStorage.setItem(STORAGE_KEYS.CALENDAR_LEGEND_LAYOUT, 'grouped');
    const cats = [
      cat('a', { name: 'ข', cashflowGroup: 'g_need', order_index: 1 }),
      cat('b', { name: 'ก', cashflowGroup: 'g_need', order_index: 1 }),
      cat('c', { name: 'ค', cashflowGroup: 'g_need', order_index: 0 }),
      cat('d', { name: 'ง', cashflowGroup: 'g_x', order_index: 0, allocation_type: 'need' }),
      cat('e', { name: 'จ', cashflowGroup: 'g_need', order_index: undefined }),
    ];
    const txs = cats.map(c => tx(c.id, '2026-11-02', 10, { category_id: c.id, allocation_type: 'need' }));
    mount(props({ categories: cats, transactions: txs }));
    expect(breakdown('NEED')).toEqual(['ค (บ้าน)฿10.00', 'ก (บ้าน)฿10.00', 'ข (บ้าน)฿10.00', 'จ (บ้าน)฿10.00', 'ง (หมวดหมู่อื่นๆ)฿10.00']);
  });

  it('investing more than what is left (old money) drops the breakdown', () => {
    localStorage.setItem(STORAGE_KEYS.CALENDAR_LEGEND_LAYOUT, 'grouped');
    mount(props({ transactions: [tx('i', '2026-11-25', 1000, { category_id: 'c_sal' }), tx('g', '2026-11-05', 5000, { category_id: 'c_gold' })] }));
    expect(allocRow('SAVE')).toBe('฿1,000.00 (100%)');
    expect(breakdown('SAVE')).toEqual([]);
  });

  it('investing exactly what is left lists it without an "unused" row', () => {
    localStorage.setItem(STORAGE_KEYS.CALENDAR_LEGEND_LAYOUT, 'grouped');
    mount(props({ transactions: [tx('i', '2026-11-25', 1000, { category_id: 'c_sal' }), tx('g', '2026-11-05', 1000, { category_id: 'c_gold' })] }));
    expect(breakdown('SAVE')).toEqual(['ทอง (ลงทุน)฿1,000.00']);
  });

  it('a deficit: no leftover, % of expenses', () => {
    mount(props({ transactions: [tx('i', '2026-11-25', 100, { category_id: 'c_sal' }), tx('r', '2026-11-01', 300, { category_id: 'c_rent' }), tx('f', '2026-11-01', 100, { category_id: 'c_fun' })] }));
    expect(allocRow('SAVE')).toBe('฿0.00 (0%)');
    expect(allocRow('NEED')).toBe('฿300.00 (75%)');
    expect(allocRow('WANT')).toBe('฿100.00 (25%)');
    expect(text()).toContain('สัดส่วนของรายจ่าย');
  });

  it('income only: everything is leftover', () => {
    mount(props({ transactions: [TXS[0]] }));
    expect(allocRow('SAVE')).toBe('฿30,000.00 (100%)');
    expect(allocRow('NEED')).toBe('฿0.00 (0%)');
  });

  it('only savings rows: nothing to split, all 0%', () => {
    mount(props({ transactions: [TXS[4]] }));
    expect(allocRow('NEED')).toBe('฿0.00 (0%)');
    expect(allocRow('SAVE')).toBe('฿0.00 (0%)');
    expect(container!.querySelector('[title^="จำเป็น:"]')).toBeNull();
  });

});

describe('CalendarView day modal', () => {
  it('opens on a day click and wires its callbacks', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const del = vi.fn();
    const noteFn = vi.fn();
    const p = mount(props({ onSaveTransaction: save, handleDeleteTransaction: del, handleDayNoteChange: noteFn, dayNotes: {} }));
    expect(h.modal).toBeNull();
    click(btnLabel('ดูรายละเอียดวันที่ 12'));
    expect(container!.querySelector('[data-testid="day-modal"]')!.textContent).toBe('2026-11-12');
    expect(h.modal!.transactions).toBe(p.transactions);
    expect(h.modal!.dayTypeConfig).toBe(DAY_TYPES);
    expect(h.modal!.handleDayNoteChange).toBe(noteFn);
    expect(h.modal!.frequentItems).toEqual([]);
    await act(async () => { await h.modal!.onSave({ date: '2026-11-12', amount: 1 }); });
    expect(save).toHaveBeenCalledWith({ date: '2026-11-12', amount: 1 });
    h.modal!.onDelete('t1');
    expect(del).toHaveBeenCalledWith('t1');
    act(() => h.modal!.onDateChange('2026-11-13'));
    expect(container!.querySelector('[data-testid="day-modal"]')!.textContent).toBe('2026-11-13');
    act(() => h.modal!.onClose());
    expect(container!.querySelector('[data-testid="day-modal"]')).toBeNull();
  });

  it('read-only callers: save and delete are no-ops', async () => {
    mount(props());
    click(btnLabel('ดูรายละเอียดวันที่ 12'));
    await act(async () => { await h.modal!.onSave({ date: '2026-11-12', amount: 1 }); });
    expect(() => h.modal!.onDelete('x')).not.toThrow();
  });
});
