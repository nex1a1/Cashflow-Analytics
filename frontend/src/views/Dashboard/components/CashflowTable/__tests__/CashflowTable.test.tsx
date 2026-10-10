// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import CashflowTable from '..';
import { click, q, byText } from '@/test-utils/dom';
import type { CashflowGroup, Category, TransactionDisplay } from '@/types';

// Real table, rows, cells, footer, toolbar and filter engine. Replaced: the dashboard context and "today" (so the
// pay-cycle tests do not depend on the date the suite runs on).
const h = vi.hoisted(() => ({ ctx: {} as Record<string, unknown> }));
vi.mock('@/views/Dashboard/context/DashboardContext', () => ({ useDashboardContext: () => h.ctx }));
vi.mock('@/utils/payCycle', async (orig) => ({ ...(await orig<typeof import('@/utils/payCycle')>()), localTodayIso: () => '2026-11-15' }));

const groups: CashflowGroup[] = [
  { id: 'g-inc', name: 'เงินเดือน', type: 'income', allocation_type: null, order_index: 1 },
  { id: 'g-home', name: 'ที่พัก', type: 'expense', allocation_type: 'need', order_index: 2 },
  { id: 'g-food', name: 'อาหาร', type: 'expense', allocation_type: 'need', order_index: 3 },
  { id: 'g-unused', name: 'ไม่เคยใช้', type: 'expense', allocation_type: 'want', order_index: 4 },
];
const categories: Category[] = [
  { id: 'c-salary', name: 'เงินเดือน', cashflow_group_id: 'g-inc' },
  { id: 'c-rent', name: 'ค่าเช่า', cashflow_group_id: 'g-home', allocation_type: 'need' },
  { id: 'c-power', name: 'ค่าไฟ', cashflow_group_id: 'g-home', allocation_type: 'want' },
  { id: 'c-food', name: 'ข้าว', cashflow_group_id: 'g-food', allocation_type: 'need' },
  { id: 'c-unused', name: 'ของที่ไม่ได้ซื้อ', cashflow_group_id: 'g-unused' },
];
const month = (monthStr: string, inc: number, home: number, food: number) => ({ monthStr, groups: { 'g-inc': inc, 'g-home': home, 'g-food': food, 'g-unused': 0 } });
const analytics = (rows = [month('2026-08', 30_000, 8_000, 4_000), month('2026-09', 30_000, 9_000, 5_000), month('2026-10', 32_000, 8_000, 0)]) => ({
  numMonths: rows.length, sortedCashflow: rows,
  monthlyCatMap: {
    'c-rent': { '2026-08': 7_000, '2026-09': 7_000, '2026-10': 7_000 },
    'c-power': { '2026-08': 1_000, '2026-09': 2_000, '2026-10': 1_000 },
    'c-food': { '2026-08': 4_000, '2026-09': 5_000, '2026-10': 0 },
    'c-salary': {}, 'c-unused': {},
  },
});
const tx = (id: string, date: string, category_id: string, amount: number): TransactionDisplay =>
  ({ id, date, category: category_id, category_id, description: id, amount });
const transactions = [
  tx('s1', '2026-08-25', 'c-salary', 30_000), tx('r1', '2026-08-01', 'c-rent', 7_000), tx('p1', '2026-08-02', 'c-power', 1_000), tx('f1', '2026-08-03', 'c-food', 4_000),
  tx('s2', '2026-09-25', 'c-salary', 30_000), tx('r2', '2026-09-01', 'c-rent', 7_000), tx('p2', '2026-09-02', 'c-power', 2_000), tx('f2', '2026-09-03', 'c-food', 5_000),
  tx('s3', '2026-10-25', 'c-salary', 32_000), tx('r3', '2026-10-01', 'c-rent', 7_000), tx('p3', '2026-10-02', 'c-power', 1_000),
];

const set = (over: Record<string, unknown> = {}) => {
  h.ctx = { analytics: analytics(), transactions, cashflowGroups: groups, categories, showSkeleton: false, filterPeriod: '2026-08_2026-10', ...over };
};

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<CashflowTable />));
};
const remount = () => { act(() => root!.unmount()); container!.remove(); mount(); };
const text = (el: Element | null | undefined) => el?.textContent ?? '';

const monthBtn = (label: string) => q<HTMLButtonElement>(`button[aria-label="ยกเว้น ${label} จากการคำนวณ"]`)!;
const rowOf = (label: string) => monthBtn(label).closest('tr')!;
const cells = (label: string) => [...rowOf(label).querySelectorAll('td')].map(td => td.textContent);
/** The four summary cells always close the row: expense total, net, % left, % spent. */
const summary = (label: string) => cells(label).slice(-4);
const footer = () => [...container!.querySelectorAll('tfoot td')].map(td => td.textContent);
const headerButtons = () => [...container!.querySelectorAll('thead button[aria-expanded]')].map(b => b.getAttribute('aria-label'));
const expand = (label: string) => click(q(`thead button[aria-label^="${label}"]`));
const AUG = 'สิงหาคม 2026';
const SEP = 'กันยายน 2026';
const OCT = 'ตุลาคม 2026';

beforeEach(() => set());
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

describe('CashflowTable — when it shows', () => {
  it('renders nothing without data: no months, or no groups', () => {
    set({ analytics: { ...analytics([]), numMonths: 0 } });
    mount();
    expect(container!.innerHTML).toBe('');
    remount();
    act(() => root!.unmount()); container!.remove();
    set({ cashflowGroups: [] });
    mount();
    expect(container!.innerHTML).toBe('');
  });

  it('skeleton: the title and a placeholder, no table', () => {
    set({ showSkeleton: true });
    mount();
    expect(text(container)).toContain('ตารางสรุปกระแสเงินสด');
    expect(q('table')).toBeNull();
    expect(q('.animate-pulse')).not.toBeNull();
  });
});

describe('CashflowTable — columns and rows', () => {
  it('income groups first, then expense groups in order; groups that never had a figure are not shown', () => {
    mount();
    expect(headerButtons()).toEqual([
      'กลุ่มรายรับ เงินเดือน - คลิกเพื่อขยาย',
      'กลุ่มรายจ่าย ที่พัก - คลิกเพื่อขยาย',
      'กลุ่มรายจ่าย อาหาร - คลิกเพื่อขยาย',
    ]);
    expect(text(q('thead'))).toContain('รายรับ (+)');
    expect(text(q('thead'))).toContain('รายจ่าย (-)');
  });

  it('one row per month with its Thai label, group figures and the four summary cells', () => {
    mount();
    expect(cells(AUG)).toEqual([AUG, '30,000.00', '8,000.00', '4,000.00', '12,000.00', '18,000.00', '60.0%', '40.0%']);
    expect(cells(SEP)).toEqual([SEP, '30,000.00', '9,000.00', '5,000.00', '↑ 16.7%14,000.00', '16,000.00', '53.3%', '46.7%']);
  });

  it('a zero figure is a dash, not 0.00', () => {
    mount();
    expect(cells(OCT).slice(1, 4)).toEqual(['32,000.00', '8,000.00', '-']);
  });

  it('the first month has no comparison badge; later months compare with the month before', () => {
    mount();
    expect(text(rowOf(AUG)).includes('↑') || text(rowOf(AUG)).includes('↓')).toBe(false);
    expect(cells(OCT)[4]).toBe('↓ 42.9%8,000.00'); // (8,000 − 14,000) / 14,000
  });

  it('a month spending more than it earns shows the deficit and an over-100% share in the danger colour', () => {
    set({ analytics: analytics([month('2026-08', 10_000, 12_000, 0), month('2026-09', 10_000, 5_000, 0)]) });
    mount();
    const [, net, left, spent] = [...rowOf(AUG).querySelectorAll('td')].slice(-4);
    expect(net.textContent).toBe('−2,000.00');
    expect(net.className).toContain('text-danger');
    expect(left.textContent).toBe('-20.0%');
    expect(left.className).toContain('text-danger');
    expect(spent.textContent).toBe('120.0%');
    expect(spent.className).toContain('text-danger');
    const [, okNet, , okSpent] = [...rowOf(SEP).querySelectorAll('td')].slice(-4);
    expect(okNet.className).toContain('text-emerald-400');
    expect(okSpent.className).not.toContain('text-danger');
  });

  it('a month with no income shows "-" for the spend share and 0.0% left (no division by zero)', () => {
    set({ analytics: analytics([month('2026-08', 0, 500, 0), month('2026-09', 100, 100, 0)]) });
    mount();
    const [, , left, spent] = summary(AUG);
    expect(left).toBe('0.0%');
    expect(spent).toBe('-');
    expect(text(container)).not.toMatch(/NaN|Infinity/);
  });
});

describe('CashflowTable — totals row', () => {
  it('adds the months up, with the overall net and the shares', () => {
    mount();
    expect(footer()).toEqual(['รวมทั้งหมด', '92,000.00', '25,000.00', '9,000.00', '34,000.00', '58,000.00', '63.0%', '37.0%']);
  });

  it('with only one month it says the totals need more months', () => {
    set({ analytics: analytics([month('2026-08', 30_000, 8_000, 4_000)]) });
    mount();
    expect(text(q('tfoot'))).toContain('ยอดรวมจะแสดงเมื่อมีข้อมูลมากกว่า 1 เดือน');
    expect(footer()).toHaveLength(1);
  });
});

describe('CashflowTable — leaving things out of the calculation', () => {
  it('clicking a month leaves it out of the totals and the comparison, and clicking again brings it back', () => {
    mount();
    click(monthBtn(SEP));
    expect(monthBtn(SEP).getAttribute('aria-pressed')).toBe('true');
    expect(monthBtn(SEP).title).toBe('คลิกเพื่อนำกลับมารวมคำนวณ');
    expect(footer().slice(1)).toEqual(['62,000.00', '16,000.00', '4,000.00', '20,000.00', '42,000.00', '67.7%', '32.3%']);
    expect(cells(OCT)[4]).toBe('↓ 33.3%8,000.00'); // now against August (12,000)
    expect(rowOf(SEP).querySelector('td:nth-child(2)')!.className).toContain('line-through');

    click(monthBtn(SEP));
    expect(footer().slice(1, 5)).toEqual(['92,000.00', '25,000.00', '9,000.00', '34,000.00']);
    expect(cells(OCT)[4]).toBe('↓ 42.9%8,000.00');
  });

  it('an excluded month keeps its own row figures but is struck through', () => {
    mount();
    click(monthBtn(AUG));
    expect(cells(AUG)[2]).toBe('8,000.00');
    expect(rowOf(AUG).querySelector('[aria-hidden="true"]')).not.toBeNull(); // the eye-off mark
  });

  it('excluding a group takes it out of the row and the footer totals, and fades its column', () => {
    mount();
    click(q('thead button[title="ยกเว้นกลุ่ม อาหาร จากการคำนวณ"]'));
    expect(cells(AUG)[4]).toBe('8,000.00'); // 12,000 − food 4,000
    expect(cells(AUG)[5]).toBe('22,000.00');
    expect(footer()[4]).toBe('25,000.00');
    expect(rowOf(AUG).querySelectorAll('td')[3].className).toContain('opacity-40');
    expect(q('thead button[title="นำกลุ่ม อาหาร กลับมารวมคำนวณ"]')).not.toBeNull();
  });

  it('expanding a group shows its categories that have figures (never the empty ones) with their own totals', () => {
    mount();
    expand('กลุ่มรายจ่าย ที่พัก');
    expect(q('thead button[aria-label^="กลุ่มรายจ่าย ที่พัก"]')!.getAttribute('aria-expanded')).toBe('true');
    expect(cells(AUG).slice(2, 5)).toEqual(['8,000.00', '7,000.00', '1,000.00']);
    expect(footer().slice(2, 5)).toEqual(['25,000.00', '21,000.00', '4,000.00']);
    expect(q('thead th[title="ค่าเช่า"]')).not.toBeNull();
    expect(q('thead th[title="ค่าไฟ"]')).not.toBeNull();

    expand('กลุ่มรายจ่าย ที่พัก');
    expect(cells(AUG)).toHaveLength(8);
  });

  it('excluding a category subtracts it from its group, the row total and the footer', () => {
    mount();
    expand('กลุ่มรายจ่าย ที่พัก');
    click(q('thead button[title="ยกเว้นหมวด ค่าไฟ จากการคำนวณ"]'));
    expect(cells(AUG)[2]).toBe('7,000.00');   // group figure without the power bill
    expect(summary(AUG)[0]).toBe('11,000.00'); // row expense total
    expect(footer()[2]).toBe('21,000.00');
    click(q('thead button[title="นำหมวด ค่าไฟ กลับมารวมคำนวณ"]'));
    expect(cells(AUG)[2]).toBe('8,000.00');
  });
});

describe('CashflowTable — hiding WANT / NEED / SAVINGS', () => {
  const openFilter = () => click(q('button[title^="เปิด/ปิด ตัวกรอง"]')); // the title also carries the hidden count once something is hidden

  it('the filter bar is closed until asked for', () => {
    mount();
    expect(byText('button', 'ปิด WANT (ตามใจ)')).toBeNull();
    openFilter();
    expect(byText('button', 'ปิด WANT (ตามใจ)')).not.toBeNull();
    expect(byText('button', 'ปิด NEED (จำเป็น)')).not.toBeNull();
    expect(byText('button', 'ปิด SAVINGS (เงินออม)')).not.toBeNull();
  });

  it('hiding WANT recomputes the figures from the rows, counts the filter, and "ล้างตัวกรอง" puts everything back', () => {
    mount();
    openFilter();
    click(byText('button', 'ปิด WANT (ตามใจ)'));
    expect(cells(AUG)[2]).toBe('7,000.00'); // the power bill is a WANT category
    expect(cells(AUG)[4]).toBe('11,000.00');
    expect(cells(AUG)[1]).toBe('30,000.00'); // income untouched
    expect(footer()[4]).toBe('30,000.00');   // 34,000 minus the power bill of the three months (1,000 + 2,000 + 1,000)
    expect(q('button[title^="เปิด/ปิด ตัวกรอง (กำลังซ่อนอยู่ 1"]')!.textContent).toContain('1');
    expect(byText('button', 'ล้างตัวกรอง')).not.toBeNull();

    click(byText('button', 'ล้างตัวกรอง'));
    expect(cells(AUG)[2]).toBe('8,000.00');
    expect(footer()[4]).toBe('34,000.00');
    expect(byText('button', 'ล้างตัวกรอง')).toBeNull();
  });

  it('hiding NEED keeps only the WANT spending', () => {
    mount();
    openFilter();
    click(byText('button', 'ปิด NEED (จำเป็น)'));
    expect(cells(AUG)[2]).toBe('1,000.00');
    expect(cells(AUG)[3]).toBe('-');
    expect(cells(AUG)[4]).toBe('1,000.00');
  });

  it('the count adds the filters, excluded months, groups and categories together; reset clears them all', () => {
    mount();
    click(monthBtn(AUG));
    click(q('thead button[title="ยกเว้นกลุ่ม อาหาร จากการคำนวณ"]'));
    openFilter();
    click(byText('button', 'ปิด WANT (ตามใจ)'));
    expect(q('button[title^="เปิด/ปิด ตัวกรอง (กำลังซ่อนอยู่ 3"]')).not.toBeNull();
    click(byText('button', 'ล้างตัวกรอง'));
    expect(monthBtn(AUG).getAttribute('aria-pressed')).toBe('false');
    expect(q('thead button[title="ยกเว้นกลุ่ม อาหาร จากการคำนวณ"]')).not.toBeNull();
    expect(footer()[4]).toBe('34,000.00');
  });
});

describe('CashflowTable — hover details', () => {
  it('hovering a group header shows its tooltip, and leaving removes it', () => {
    mount();
    const th = q('thead button[aria-label^="กลุ่มรายจ่าย ที่พัก"]')!.closest('th')!;
    act(() => { th.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body })); });
    expect(text(document.body)).toContain('ที่พัก');
    expect(document.querySelector('.fixed.pointer-events-none')).not.toBeNull();
    act(() => { th.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })); });
    expect(document.querySelector('.fixed.pointer-events-none')).toBeNull();
  });

  const over = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body })); });
  const out = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })); });
  const tooltip = () => document.querySelector<HTMLElement>('body > .fixed.pointer-events-none');
  const at = (el: Element, left: number) => { el.getBoundingClientRect = () => ({ left, top: 40, width: 100, height: 30, right: left + 100, bottom: 70, x: left, y: 40, toJSON() {} }) as DOMRect; };

  it('the group tooltip lists the categories with figures and stays inside the window at both edges', () => {
    mount();
    const th = q('thead button[aria-label^="กลุ่มรายจ่าย ที่พัก"]')!.closest('th')!;
    at(th, 0);
    over(th);
    expect(tooltip()!.textContent).toContain('หมวดหมู่ย่อย (2):');
    expect(tooltip()!.style.left).toBe('118px'); // half its 220px width + 8px in from the left edge
    expect(tooltip()!.style.top).toBe('34px');
    out(th);
    at(th, 1000);
    over(th);
    expect(tooltip()!.style.left).toBe(`${window.innerWidth - 118}px`);
    at(th, 400);
    over(th);
    expect(tooltip()!.style.left).toBe('450px');
  });

  it('hovering a category header shows the category tooltip, clamped the same way', () => {
    mount();
    expand('กลุ่มรายจ่าย ที่พัก');
    const th = q('thead th[title="ค่าไฟ"]')!;
    at(th, 0);
    over(th);
    expect(tooltip()!.textContent).toContain('กลุ่มหลัก:');
    expect(tooltip()!.textContent).toContain('ค่าไฟ');
    expect(tooltip()!.textContent).not.toContain('หมวดหมู่ย่อย');
    expect(tooltip()!.style.left).toBe('98px');
    out(th);
    expect(tooltip()).toBeNull();
    at(th, 1000);
    over(th);
    expect(tooltip()!.style.left).toBe(`${window.innerWidth - 98}px`);
  });

  it('hovering a row lights up its month and expense-total cells', () => {
    mount();
    over(rowOf(SEP));
    expect(monthBtn(SEP).closest('td')!.className).toContain('bg-surface-hover/80');
    expect(rowOf(SEP).querySelectorAll('td')[4].className).toContain('text-accent-ink');
    out(rowOf(SEP));
    expect(rowOf(SEP).querySelectorAll('td')[4].className).not.toContain('text-accent-ink');
  });
});

describe('CashflowTable — income categories', () => {
  const withBonus = () => {
    const a = analytics([month('2026-08', 30_000, 8_000, 4_000), month('2026-09', 35_000, 9_000, 5_000), month('2026-10', 32_000, 8_000, 0)]);
    a.monthlyCatMap['c-salary'] = { '2026-08': 30_000, '2026-09': 30_000, '2026-10': 32_000 };
    (a.monthlyCatMap as Record<string, Record<string, number>>)['c-bonus'] = { '2026-09': 5_000 };
    set({
      analytics: a,
      categories: [...categories, { id: 'c-bonus', name: 'โบนัส', cashflow_group_id: 'g-inc' }],
      transactions: [...transactions, tx('b2', '2026-09-26', 'c-bonus', 5_000)],
    });
  };

  it('expanding an income group shows its categories with their own figures and totals', () => {
    withBonus();
    mount();
    expand('กลุ่มรายรับ เงินเดือน');
    expect(q('thead th[title="เงินเดือน"]')).not.toBeNull();
    expect(q('thead th[title="โบนัส"]')).not.toBeNull();
    expect(cells(SEP).slice(1, 4)).toEqual(['35,000.00', '30,000.00', '5,000.00']);
    expect(footer().slice(1, 4)).toEqual(['97,000.00', '92,000.00', '5,000.00']);
  });

  it('excluding an income category takes it out of the income figure, the net and the footer', () => {
    withBonus();
    mount();
    expand('กลุ่มรายรับ เงินเดือน');
    click(q('thead button[title="ยกเว้นหมวด โบนัส จากการคำนวณ"]'));
    expect(cells(SEP)[1]).toBe('30,000.00');
    expect(summary(SEP)[1]).toBe('16,000.00');
    expect(footer()[1]).toBe('92,000.00');
    expect(q('thead th[title="โบนัส"]')!.className).toContain('opacity-30');
  });

  it('excluding the income group fades its category columns in the header and the footer', () => {
    withBonus();
    mount();
    expand('กลุ่มรายรับ เงินเดือน');
    click(q('thead button[title="ยกเว้นกลุ่ม เงินเดือน จากการคำนวณ"]'));
    expect(q('thead th[title="โบนัส"]')!.className).toContain('opacity-30');
    expect([...container!.querySelectorAll('tfoot td')][3].className).toContain('line-through');
  });
});

describe('CashflowTable — pay-cycle mode', () => {
  const cycleAnalytics = () => analytics([month('2026-08', 30_000, 8_000, 4_000), month('2026-09', 30_000, 9_000, 5_000), month('2026-10', 32_000, 8_000, 3_000)]);

  it('rows are cycles, labelled with their real 25th–24th span', () => {
    set({ filterPeriod: 'cycle:2026-08_2026-10', analytics: cycleAnalytics(), transactions: [tx('s1', '2026-08-25', 'c-salary', 30_000), tx('t', '2026-09-30', 'c-food', 100), tx('u', '2026-10-30', 'c-food', 100)] });
    mount();
    const btn = q<HTMLButtonElement>('button[aria-label="ยกเว้น รอบ ส.ค. 2026 จากการคำนวณ"]')!;
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain('25 ส.ค. – 24 ก.ย.');
  });

  it('a cycle that started before the first record is partial: dimmed, explained, and left out of the totals and the comparison', () => {
    set({ filterPeriod: 'cycle:2026-08_2026-10', analytics: cycleAnalytics(), transactions: [tx('first', '2026-08-27', 'c-salary', 30_000), tx('b', '2026-09-30', 'c-food', 100), tx('c', '2026-10-30', 'c-food', 100)] });
    mount();
    const partial = q<HTMLElement>('button[aria-label="ยกเว้น รอบ ส.ค. 2026 จากการคำนวณ"]')!.closest('tr')!;
    expect(partial.className).toContain('opacity-40');
    expect(partial.title).toContain('รอบไม่เต็ม');
    // totals: September + October only
    expect(footer().slice(1, 2)).toEqual(['62,000.00']);
    // September has no earlier counted cycle to be compared with
    const sepRow = q('button[aria-label="ยกเว้น รอบ ก.ย. 2026 จากการคำนวณ"]')!.closest('tr')!;
    expect(text(sepRow.querySelectorAll('td')[4])).toBe('14,000.00');
    // …but the partial cycle is not struck through as if the user had excluded it
    expect(q('button[aria-label="ยกเว้น รอบ ส.ค. 2026 จากการคำนวณ"]')!.getAttribute('aria-pressed')).toBe('false');
  });

  it('a cycle with the first record on its first day is whole', () => {
    set({ filterPeriod: 'cycle:2026-08_2026-10', analytics: cycleAnalytics(), transactions: [tx('first', '2026-08-25', 'c-salary', 30_000)] });
    mount();
    const row = q('button[aria-label="ยกเว้น รอบ ส.ค. 2026 จากการคำนวณ"]')!.closest('tr')!;
    expect(row.className).not.toContain('opacity-40');
  });

  it('a cycle that has not started yet (only planned rows) is partial too', () => {
    set({ filterPeriod: 'cycle:2026-08_2026-12', analytics: analytics([month('2026-08', 30_000, 8_000, 4_000), month('2026-12', 0, 500, 0)]), transactions: [tx('a', '2026-08-25', 'c-salary', 30_000), tx('later', '2026-12-30', 'c-food', 500)] });
    mount();
    const future = q('button[aria-label="ยกเว้น รอบ ธ.ค. 2026 จากการคำนวณ"]')!.closest('tr')!; // starts 25 Dec, "today" is 15 Nov
    expect(future.className).toContain('opacity-40');
  });

  it('switching to calendar months clears the months the user had clicked out', () => {
    set({ filterPeriod: 'cycle:2026-08_2026-10', analytics: cycleAnalytics(), transactions: [tx('a', '2026-08-25', 'c-salary', 30_000)] });
    mount();
    click(q('button[aria-label="ยกเว้น รอบ ก.ย. 2026 จากการคำนวณ"]'));
    expect(q('button[aria-label="ยกเว้น รอบ ก.ย. 2026 จากการคำนวณ"]')!.getAttribute('aria-pressed')).toBe('true');
    set({ filterPeriod: '2026-08_2026-10', analytics: analytics() });
    act(() => root!.render(<CashflowTable />));
    expect(monthBtn(SEP).getAttribute('aria-pressed')).toBe('false');
  });
});
