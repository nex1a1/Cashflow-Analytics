// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import ExpenseProportion from '../ExpenseProportion';
import { click, q, byText } from '@/test-utils/dom';

// Real component tree (header, grid, cells, what-if maths). Replaced: the dashboard context and the two Chart.js canvases.
// The doughnut mock keeps its last props in `h.chart` so a test can read the chart data or fire its hover callback.
const h = vi.hoisted(() => ({ ctx: {} as Record<string, unknown>, chart: null as null | { data: any; options: any }, evolution: null as any }));
vi.mock('@/views/Dashboard/context/DashboardContext', () => ({ useDashboardContext: () => h.ctx }));
vi.mock('react-chartjs-2', async () => {
  const React = await import('react');
  return { Doughnut: (props: any) => { h.chart = props; return React.createElement('canvas', { 'data-testid': 'doughnut' }); } };
});
vi.mock('@/views/Dashboard/components/ExpenseProportion/AllocationEvolutionChart', async () => {
  const React = await import('react');
  return { AllocationEvolutionChart: (props: any) => { h.evolution = props; return React.createElement('div', { 'data-testid': 'evolution' }); } };
});

const cats = [
  { id: 'c-food', name: 'ค่ากิน', color: '#F97316', amount: 30_000, percentage: '37.5', order_index: 1 },
  { id: 'c-rent', name: 'ที่พัก', color: '#38BDF8', amount: 40_000, percentage: '50.0', order_index: 3 }, // biggest, but last in category order
  { id: 'c-fun', name: 'บันเทิง', color: '#A855F7', amount: 10_000, percentage: '12.5', order_index: 2 },
];
const allocation = [
  { id: 'needs', name: 'จำเป็น', amount: 45_000, color: '#38BDF8', icon: 'home', target: 50, percentage: '45.0',
    groups: [{ id: 'g-rent', name: 'ที่พัก', amount: 30_000, color: '#38BDF8' }, { id: 'g-food', name: 'อาหาร', amount: 15_000 }] },
  { id: 'wants', name: 'ตามใจ', amount: 35_000, color: '#F59E0B', icon: 'zap', target: 30, percentage: '35.0',
    groups: [{ id: 'g-fun', name: 'บันเทิง', amount: 20_000 }, { id: 'g-shop', name: 'ช้อปปิ้ง', amount: 15_000 }] },
  { id: 'savings', name: 'ออม/เหลือ', amount: 20_000, color: '#10B981', icon: 'piggy-bank', target: 20, percentage: '20.0', groups: [] },
];
const evolution = (over: Record<string, unknown> = {}) => ({
  eligible: true, hasData: true, label: 'แนวโน้ม 3 เดือน',
  months: [{ key: '2026-08', total: 70_000 }, { key: '2026-09', total: 80_000 }, { key: '2026-10', total: 0 }], ...over,
});

const set = (analytics: Record<string, unknown> = {}, over: Record<string, unknown> = {}) => {
  h.ctx = {
    filterPeriod: '2026-10', showSkeleton: false,
    analytics: {
      sortedCats: cats, chartTotal: 80_000, totalExpense: 80_000, sortedAllocation: allocation,
      totalIncome: 100_000, netCashflow: 20_000, ...analytics,
    },
    ...over,
  };
};

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<ExpenseProportion />));
};
const text = () => container!.textContent ?? '';
const mode = (label: string) => byText('button', label)!;
/** Category cells in the visible grid, in order. */
const catCells = () => [...container!.querySelectorAll<HTMLElement>('div.grid-cols-5 [aria-label]')];
const catNames = () => catCells().map(c => c.getAttribute('aria-label')!.split(':')[0]);
const allocCells = () => [...container!.querySelectorAll<HTMLElement>('[role="group"][aria-label]')].filter(g => !g.getAttribute('aria-label')!.startsWith('ซื้อ'));
const alloc = (name: string) => allocCells().find(c => c.getAttribute('aria-label')!.startsWith(name))!;
const centre = () => q('div.absolute.inset-0.flex')!.textContent;

beforeEach(() => { set(); h.chart = null; h.evolution = null; });
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

describe('ExpenseProportion — by category', () => {
  it('shows every category with its amount and share, biggest first, and the total in the middle of the ring', () => {
    mount();
    expect(catNames()).toEqual(['ที่พัก', 'ค่ากิน', 'บันเทิง']);
    expect(catCells()[0].getAttribute('aria-label')).toBe('ที่พัก: ฿40,000.00 (50.0%)');
    expect(text()).toContain('3 หมวดหมู่');
    expect(centre()).toContain('รวม');
    expect(centre()).toContain('80,000.00');
  });

  it('the ring data follows the same order as the cells', () => {
    mount();
    expect(h.chart!.data.labels).toEqual(['ที่พัก', 'ค่ากิน', 'บันเทิง']);
    expect(h.chart!.data.datasets[0].data).toEqual([40_000, 30_000, 10_000]);
  });

  it('exposes the same numbers to screen readers as a table (the canvas has none)', () => {
    mount();
    const rows = [...container!.querySelectorAll('.sr-only tbody tr')].map(r => r.textContent);
    expect(rows).toEqual(['ที่พัก฿40,000.00' + '50.0%', 'ค่ากิน฿30,000.00' + '37.5%', 'บันเทิง฿10,000.00' + '12.5%']);
    expect(container!.querySelector('.sr-only caption')!.textContent).toContain('ตามหมวดหมู่ รวม ฿80,000.00');
  });

  it('sort buttons flip between amount ↓/↑ and category order ↑/↓', () => {
    mount();
    const sortAmount = () => q('button[aria-label^="เรียงตามยอดเงิน"]')!;
    const sortOrder = () => q('button[aria-label^="เรียงตามลำดับหมวดหมู่"]')!;
    expect(sortAmount().getAttribute('aria-label')).toContain('มากไปน้อย');

    click(sortAmount());
    expect(catNames()).toEqual(['บันเทิง', 'ค่ากิน', 'ที่พัก']);
    expect(sortAmount().getAttribute('aria-label')).toContain('น้อยไปมาก');

    click(sortOrder());
    expect(catNames()).toEqual(['ค่ากิน', 'บันเทิง', 'ที่พัก']); // order_index 1, 2, 3 — not the amount order
    expect(sortOrder().getAttribute('aria-label')).toContain('น้อยไปมาก');
    click(sortOrder());
    expect(catNames()).toEqual(['ที่พัก', 'บันเทิง', 'ค่ากิน']);

    click(sortAmount()); // back to amount from an order sort starts at ↓
    expect(catNames()).toEqual(['ที่พัก', 'ค่ากิน', 'บันเทิง']);
  });

  it('hovering (or focusing) a cell puts it in the middle of the ring and dims the other slices', () => {
    mount();
    act(() => catCells()[1].focus()); // ค่ากิน
    expect(centre()).toContain('ค่ากิน');
    expect(centre()).toContain('30,000.00');
    expect(centre()).toContain('37.5%');
    const colours = h.chart!.data.datasets[0].backgroundColor as string[];
    expect(colours[1]).toBe('#F97316');
    expect(colours[0]).toBe('#38BDF840');
    expect(colours[2]).toBe('#A855F740');

    act(() => catCells()[1].blur());
    expect(centre()).toContain('รวม');
    expect(h.chart!.data.datasets[0].backgroundColor).toEqual(['#38BDF8', '#F97316', '#A855F7']);
  });

  it('hovering a slice of the ring hides the middle text so the tooltip does not collide with it', () => {
    mount();
    act(() => h.chart!.options.onHover({}, [{ datasetIndex: 0, index: 2 }]));
    expect(q('div.absolute.inset-0.flex')!.className).toContain('opacity-0');
    act(() => h.chart!.options.onHover({}, []));
    expect(q('div.absolute.inset-0.flex')!.className).toContain('opacity-100');
  });

  it('the ring tooltip reads amount and share', () => {
    mount();
    const label = h.chart!.options.plugins.tooltip.callbacks.label;
    expect(label({ parsed: 40_000, dataIndex: 0 })).toBe(' ฿40,000.00 (50.0%)');
  });

  it('no expenses: says so, offers no cells, counts 0', () => {
    set({ sortedCats: [], chartTotal: 0, totalExpense: 0 });
    mount();
    expect(text()).toContain('ไม่มีข้อมูลรายจ่าย');
    expect(text()).toContain('0 หมวดหมู่');
    expect(catCells()).toHaveLength(0);
  });

  it('skeleton: a spinner and "..." instead of the count, no cells', () => {
    set({}, { showSkeleton: true });
    mount();
    expect(q('.animate-spin')).not.toBeNull();
    expect(text()).toContain('...');
    expect(catCells()).toHaveLength(0);
  });
});

describe('ExpenseProportion — 50/30/20', () => {
  const toAllocation = () => click(mode('สัดส่วน 50/30/20'));

  it('shows each part against its target: in quota, over quota, and savings reaching the goal', () => {
    mount();
    toAllocation();
    expect(text()).toContain('3 ส่วน');
    expect(centre()).toContain('รายรับ');
    expect(centre()).toContain('100,000.00');

    expect(alloc('จำเป็น').textContent).toContain('เป้า 50% (฿50,000.00)');
    expect(alloc('จำเป็น').textContent).toContain('+฿5,000.00 ในโควตา');
    expect(alloc('ตามใจ').textContent).toContain('-฿5,000.00 เกินโควตา');
    expect(alloc('ออม/เหลือ').textContent).toContain('+฿0.00 เกินเป้าออม');
  });

  it('over quota is danger-styled, in quota is green; short savings say how much is missing', () => {
    set({ sortedAllocation: allocation.map(a => (a.id === 'savings' ? { ...a, amount: 15_000, percentage: '15.0' } : a)) });
    mount();
    toAllocation();
    expect(alloc('ตามใจ').querySelector('.bg-danger\\/20')).not.toBeNull();
    expect(alloc('จำเป็น').querySelector('.bg-emerald-500\\/15')).not.toBeNull();
    expect(alloc('ออม/เหลือ').textContent).toContain('ขาดอีก ฿5,000.00');
    expect(alloc('ออม/เหลือ').querySelector('.bg-amber-500\\/20')).not.toBeNull();
  });

  it('the cell label spells the whole verdict for assistive tech', () => {
    mount();
    toAllocation();
    expect(alloc('ตามใจ').getAttribute('aria-label')).toBe('ตามใจ: 35.0% (เป้า 30%) — -฿5,000.00 เกินโควตา');
  });

  it('lists the groups of each part with their share of it, and the unassigned remainder of savings', () => {
    mount();
    toAllocation();
    expect(alloc('จำเป็น').textContent).toContain('ที่พัก');
    expect(alloc('จำเป็น').textContent).toContain('67%'); // 30,000 of 45,000
    expect(alloc('ออม/เหลือ').textContent).toContain('Net Surplus (เหลือสุทธิ)');
    expect(alloc('ออม/เหลือ').textContent).toContain('100%');
  });

  it('what-if: clicking a group takes it out, the savings grow by exactly that amount, and the badge says how much was cut', () => {
    mount();
    toAllocation();
    click([...alloc('ตามใจ').querySelectorAll('button')].find(b => b.textContent!.includes('บันเทิง')));
    expect(text()).toContain('จำลองลด 1 หมวด (-฿20,000.00)');
    expect(alloc('ตามใจ').textContent).toContain('฿ 15,000.00'); // 35,000 − 20,000
    expect(alloc('ตามใจ').textContent).toContain('+฿15,000.00 ในโควตา');
    expect(alloc('ออม/เหลือ').textContent).toContain('฿ 40,000.00'); // income 100,000 − (45,000 + 15,000)
    expect(alloc('ออม/เหลือ').textContent).toContain('40.0');
  });

  it('what-if: the excluded group is struck through and can be put back, one by one or all at once', () => {
    mount();
    toAllocation();
    const groupBtn = (name: string) => [...container!.querySelectorAll<HTMLButtonElement>('[role="group"] button')].find(b => b.textContent!.includes(name))!;
    click(groupBtn('บันเทิง'));
    click(groupBtn('ช้อปปิ้ง'));
    expect(text()).toContain('จำลองลด 2 หมวด (-฿35,000.00)');
    expect(groupBtn('บันเทิง').title).toContain('เปิดหมวดหมู่นี้กลับมา');
    expect(groupBtn('บันเทิง').querySelector('[aria-label="ยกเว้นจากการคำนวณ"]')).not.toBeNull();

    click(groupBtn('ช้อปปิ้ง'));
    expect(text()).toContain('จำลองลด 1 หมวด (-฿20,000.00)');

    click(byText('button', 'คืนค่า'));
    expect(text()).not.toContain('จำลองลด');
    expect(alloc('ตามใจ').textContent).toContain('฿ 35,000.00');
  });

  it('leaving 50/30/20 forgets the simulation', () => {
    mount();
    toAllocation();
    click([...alloc('ตามใจ').querySelectorAll('button')].find(b => b.textContent!.includes('บันเทิง'))!);
    expect(text()).toContain('จำลองลด');
    click(mode('รายหมวดหมู่'));
    toAllocation();
    expect(text()).not.toContain('จำลองลด');
    expect(alloc('ตามใจ').textContent).toContain('฿ 35,000.00');
  });

  it('with no income: warns, and measures the parts against income + surplus instead (no division by zero)', () => {
    set({ totalIncome: 0, totalExpense: 80_000, netCashflow: 0 });
    mount();
    toAllocation();
    expect(text()).toContain('ไม่มีรายรับ');
    expect(centre()).toContain('80,000.00');
    expect(text()).not.toMatch(/NaN|Infinity/);
  });

  it('the warning only appears in this mode, and not while loading', () => {
    set({ totalIncome: 0, totalExpense: 80_000, netCashflow: 0 });
    mount();
    expect(text()).not.toContain('ไม่มีรายรับ');
    act(() => root!.unmount()); container!.remove();
    set({ totalIncome: 0 }, { showSkeleton: true });
    mount();
    toAllocation();
    expect(text()).not.toContain('ไม่มีรายรับ');
  });
});

describe('ExpenseProportion — trend', () => {
  it('is disabled with the reason when the period is too short for a trend', () => {
    set({ allocationEvolution: evolution({ eligible: false, hasData: false }) });
    mount();
    expect(mode('แนวโน้ม 3 เดือน').getAttribute('aria-disabled')).toBe('true');
    expect((mode('แนวโน้ม 3 เดือน') as HTMLButtonElement).disabled).toBe(true);
    expect(text()).toContain('ต้องเลือกช่วงเวลามากกว่า 1 เดือน');
    click(mode('แนวโน้ม 3 เดือน'));
    expect(mode('รายหมวดหมู่').getAttribute('aria-pressed')).toBe('true');
  });

  it('with no analytics for it the third mode is disabled too', () => {
    mount();
    expect((mode('แนวโน้ม 3 เดือน') as HTMLButtonElement).disabled).toBe(true);
  });

  it('switching shows the chart, counts the months that have spending, and keeps the other view mounted but hidden', () => {
    set({ allocationEvolution: evolution() });
    mount();
    click(mode('แนวโน้ม 3 เดือน'));
    expect(q('[data-testid="evolution"]')).not.toBeNull();
    expect(text()).toContain('2 เดือน'); // the third month has total 0
    expect(h.evolution.months).toHaveLength(3);
    expect(h.evolution.currentKey).toMatch(/^\d{4}-\d{2}$/);
    const hidden = [...container!.querySelectorAll('[aria-hidden="true"]')].find(el => el.querySelector('div.grid-cols-5'));
    expect(hidden).toBeTruthy();
  });

  it('says there is not enough history when the period is long enough but has no data', () => {
    set({ allocationEvolution: evolution({ hasData: false, months: [] }) });
    mount();
    click(mode('แนวโน้ม 3 เดือน'));
    expect(text()).toContain('ยังไม่มีข้อมูลย้อนหลังพอ');
    expect(q('[data-testid="evolution"]')).toBeNull();
  });

  it('falls back to the category view when the period changes to one that has no trend', () => {
    set({ allocationEvolution: evolution() });
    mount();
    click(mode('แนวโน้ม 3 เดือน'));
    expect(mode('แนวโน้ม 3 เดือน').getAttribute('aria-pressed')).toBe('true');
    set({ allocationEvolution: evolution({ eligible: false, hasData: false }) });
    act(() => root!.render(<ExpenseProportion />));
    expect(mode('รายหมวดหมู่').getAttribute('aria-pressed')).toBe('true');
    expect(catNames()).toHaveLength(3);
  });

  it('uses the label the analytics give it (e.g. the year view says so)', () => {
    set({ allocationEvolution: evolution({ label: 'แนวโน้มรายเดือน' }) });
    mount();
    expect(mode('แนวโน้มรายเดือน')).not.toBeNull();
  });
});
