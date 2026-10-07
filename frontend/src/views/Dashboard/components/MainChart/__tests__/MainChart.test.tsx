// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import MainChart from '../index';
import { click, byText, key, q } from '@/test-utils/dom';
import type { Category } from '@/types';

const h = vi.hoisted(() => ({
  ctx: {} as Record<string, any>,
  data: { displayChartData: { labels: ['ม.ค.'], datasets: [] } as any, legendDatasets: [] as any[], categoriesWithData: new Set<string>() },
  sankeyCalls: [] as any[],
  engineCalls: [] as any[],
  optionCalls: [] as any[],
  chartProps: [] as any[],
  textAlt: [] as any[],
}));

vi.mock('@/views/Dashboard/context/DashboardContext', () => ({ useDashboardContext: () => h.ctx }));
vi.mock('@/views/Dashboard/hooks/useSankeyEngine', () => ({ useSankeyEngine: (a: any) => { h.sankeyCalls.push(a); return { sankey: true }; } }));
vi.mock('@/views/Dashboard/hooks/useChartDataEngine', () => ({ useChartDataEngine: (a: any) => { h.engineCalls.push(a); return h.data; } }));
vi.mock('@/views/Dashboard/hooks/useChartOptions', () => ({ useChartOptions: (a: any) => { h.optionCalls.push(a); return { fromHook: true }; } }));
// Chart.js draws on a canvas, which jsdom cannot — a stub that records what it was asked to draw.
vi.mock('react-chartjs-2', async () => {
  const React = await import('react');
  return { Chart: (p: any) => { h.chartProps.push(p); return React.createElement('div', { 'data-testid': 'chart', 'data-type': p.type, 'aria-label': p['aria-label'] }); } };
});
vi.mock('../SparklineGraph', async () => {
  const React = await import('react');
  return { SparklineGraph: () => React.createElement('div', { 'data-testid': 'sparkline' }) };
});
vi.mock('../MainChartTextAlternative', async () => {
  const React = await import('react');
  return { MainChartTextAlternative: (p: any) => { h.textAlt.push(p); return React.createElement('div', { 'data-testid': 'textalt' }); } };
});

const categories: Category[] = [
  { id: 'c-food', name: 'ค่ากิน', type: 'expense', color: '#F97316' },
  { id: 'c-fun', name: 'บันเทิง', type: 'expense', allocation_type: 'want', color: '#A855F7' },
];
// One array for every setCtx: a fresh `['ALL']` each time would look like a category change to the
// "reset hidden series" effect and mask whether the period alone resets it.
const ALL_CATEGORIES = ['ALL'];
const setCtx = (over: Record<string, unknown> = {}) => {
  h.ctx = {
    analytics: { mainChartType: 'combo' }, categories, filterPeriod: '2026', getFilterLabel: (p: string) => `[${p}]`,
    hideFixedExpenses: false, setHideFixedExpenses: vi.fn(), hideWantExpenses: false, setHideWantExpenses: vi.fn(),
    dashboardCategory: ALL_CATEGORIES, setDashboardCategory: vi.fn(), chartGroupBy: 'monthly', setChartGroupBy: vi.fn(),
    showSkeleton: false, ...over,
  };
};

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<MainChart />));
};
const rerender = () => act(() => root!.render(<MainChart />));
const btn = (text: string) => byText('button', text)!;
const chart = () => q('[data-testid="chart"]');
const lastEngine = () => h.engineCalls.at(-1);

beforeEach(() => {
  setCtx();
  h.data = {
    displayChartData: { labels: ['ม.ค.'], datasets: [] },
    legendDatasets: [{ label: 'รายรับ', type: 'bar', backgroundColor: '#10B981' }, { label: 'รายจ่ายรวม', type: 'bar', backgroundColor: '#DA291C' }],
    categoriesWithData: new Set(['ค่ากิน', 'บันเทิง']),
  };
  h.sankeyCalls.length = 0; h.engineCalls.length = 0; h.optionCalls.length = 0; h.chartProps.length = 0; h.textAlt.length = 0;
});
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('MainChart — what it draws', () => {
  it('starts as a bar chart named after the period, with the engines wired to its state', () => {
    mount();
    expect(chart()!.getAttribute('data-type')).toBe('bar');
    expect(chart()!.getAttribute('aria-label')).toBe('วิเคราะห์กระแสเงินสด [2026]');
    expect(h.chartProps.at(-1).data).toBe(h.data.displayChartData);
    expect(h.chartProps.at(-1).options).toEqual({ fromHook: true });
    expect(h.sankeyCalls.at(-1)).toEqual({ chartViewType: 'bar', sankeySortMode: 'value', sankeyMode: 'standard' });
    expect(lastEngine()).toMatchObject({ chartViewType: 'bar', isBreakdown: false, isSmoothLine: false, chartGroupMode: 'monthly', hiddenDatasets: [] });
    expect(h.optionCalls.at(-1)).toEqual({ chartViewType: 'bar', isBreakdown: false, isLogScale: false });
  });

  it('gives the text alternative the same caption as the chart label', () => {
    mount();
    expect(h.textAlt.at(-1)).toMatchObject({ caption: 'วิเคราะห์กระแสเงินสด [2026]', isSankey: false, data: h.data.displayChartData });
  });

  it('while loading it shows a placeholder, not a chart', () => {
    setCtx({ showSkeleton: true });
    mount();
    expect(chart()).toBeNull();
    expect(q('.animate-pulse')).not.toBeNull();
  });

  it('shows the series legend under the chart', () => {
    mount();
    expect(btn('รายรับ')).toBeTruthy();
    expect(btn('รายจ่ายรวม')).toBeTruthy();
  });
});

describe('MainChart — switching the view', () => {
  it('Sankey: a sankey chart fed by the sankey engine, and its own toolbar', () => {
    mount();
    click(btn('Sankey'));
    expect(chart()!.getAttribute('data-type')).toBe('sankey');
    expect(chart()!.getAttribute('aria-label')).toBe('โครงสร้างกระแสเงินสด [2026]');
    expect(lastEngine().sankeyData).toEqual({ sankey: true });
    expect(h.textAlt.at(-1).isSankey).toBe(true);
    expect(byText('button', 'เรียงตามยอดเงิน')).toBeTruthy();
  });

  it('Sankey options reach the sankey engine', () => {
    mount();
    click(btn('Sankey'));
    click(btn('แสดง Need/Want/Save'));
    expect(h.sankeyCalls.at(-1)).toMatchObject({ sankeyMode: 'allocation' });
    click(btn('เรียงตามลำดับในหน้าตั้งค่า'));
    expect(h.sankeyCalls.at(-1)).toMatchObject({ sankeySortMode: 'index' });
  });

  it('line view: still a Chart.js bar-type host with the line series (the series carry their own type)', () => {
    mount();
    click(btn('เส้น'));
    expect(chart()!.getAttribute('data-type')).toBe('bar');
    expect(lastEngine().chartViewType).toBe('line');
  });

  it('Sparkline (several months): its own view, without the chart and without the series legend', () => {
    mount();
    click(btn('Sparkline'));
    expect(q('[data-testid="sparkline"]')).not.toBeNull();
    expect(chart()).toBeNull();
    expect(byText('button', 'รายรับ')).toBeNull();
    expect(container!.textContent).toContain('CATEGORY TRENDS');
  });

  it('going back from Sparkline restores the chart', () => {
    mount();
    click(btn('Sparkline'));
    click(btn('แท่ง'));
    expect(q('[data-testid="sparkline"]')).toBeNull();
    expect(chart()).not.toBeNull();
  });

  it('a single month cannot show Sparkline: the option is disabled', () => {
    setCtx({ filterPeriod: '2026-01' });
    mount();
    click(btn('Sparkline'));
    expect(q('[data-testid="sparkline"]')).toBeNull();
    expect(chart()).not.toBeNull();
  });

  it('if the period shrinks to one month while Sparkline is open, it falls back to bars', () => {
    mount();
    click(btn('Sparkline'));
    expect(q('[data-testid="sparkline"]')).not.toBeNull();
    setCtx({ filterPeriod: '2026-01' });
    rerender();
    expect(q('[data-testid="sparkline"]')).toBeNull();
    expect(chart()!.getAttribute('data-type')).toBe('bar');
    expect(lastEngine().chartViewType).toBe('bar');
  });

  it('a single pay cycle falls back too', () => {
    mount();
    click(btn('Sparkline'));
    setCtx({ filterPeriod: 'cycle:2026-03' });
    rerender();
    expect(q('[data-testid="sparkline"]')).toBeNull();
  });
});

describe('MainChart — breakdown', () => {
  it('turns the legend into the categories and renames the chart', () => {
    mount();
    click(btn('แจกแจง'));
    expect(lastEngine().isBreakdown).toBe(true);
    expect(h.optionCalls.at(-1).isBreakdown).toBe(true);
    expect(chart()!.getAttribute('aria-label')).toBe('แจกแจงรายจ่ายตามหมวดหมู่ [2026]');
    expect(byText('button', 'ค่ากิน')).toBeTruthy();
    expect(byText('button', 'รายรับ')).toBeNull();
  });

  it('is switched off by Sankey', () => {
    mount();
    click(btn('แจกแจง'));
    click(btn('Sankey'));
    expect(lastEngine().isBreakdown).toBe(false);
  });

  it('can be switched back off', () => {
    mount();
    click(btn('แจกแจง'));
    click(btn('แจกแจง'));
    expect(lastEngine().isBreakdown).toBe(false);
  });
});

describe('MainChart — chart settings flow to the engines', () => {
  it('smooth line', () => {
    mount();
    click(btn('เส้นโค้ง'));
    expect(lastEngine().isSmoothLine).toBe(true);
    click(btn('เส้นตรง'));
    expect(lastEngine().isSmoothLine).toBe(false);
  });

  it('log scale, from the display-options menu', () => {
    mount();
    click(btn('ตัวเลือกแสดงผล'));
    click(byText('button', 'ปิด'));
    expect(h.optionCalls.at(-1).isLogScale).toBe(true);
  });

  it('the monthly / daily choice comes from the dashboard and goes back to it', () => {
    setCtx({ chartGroupBy: 'daily' });
    mount();
    expect(lastEngine().chartGroupMode).toBe('daily');
    click(btn('รายเดือน'));
    expect(h.ctx.setChartGroupBy).toHaveBeenLastCalledWith('monthly');
  });

  it('the NEED / WANT choice goes back to the dashboard', () => {
    mount();
    click(btn('ตัวเลือกแสดงผล'));
    click(btn('เฉพาะ WANT'));
    expect(h.ctx.setHideFixedExpenses).toHaveBeenLastCalledWith(true);
    expect(h.ctx.setHideWantExpenses).toHaveBeenLastCalledWith(false);
  });

  it('the category choice goes back to the dashboard', () => {
    mount();
    click(btn('ตัวเลือกแสดงผล'));
    click([...document.querySelectorAll('div.grid.grid-cols-2 button')].find(b => b.textContent!.trim() === 'ค่ากิน'));
    expect(h.ctx.setDashboardCategory).toHaveBeenLastCalledWith(['บันเทิง']);
  });
});

describe('MainChart — hidden series (legend clicks)', () => {
  it('hiding a series is passed to the data engine', () => {
    mount();
    click(btn('รายรับ'));
    expect(lastEngine().hiddenDatasets).toEqual(['รายรับ']);
    click(btn('รายจ่ายรวม'));
    expect(lastEngine().hiddenDatasets).toEqual(['รายรับ', 'รายจ่ายรวม']);
  });

  it('is forgotten when the period changes (a hidden series from the old data must not linger)', () => {
    mount();
    click(btn('รายรับ'));
    setCtx({ filterPeriod: '2025' });
    rerender();
    expect(lastEngine().hiddenDatasets).toEqual([]);
  });

  it('is forgotten when the view type changes', () => {
    mount();
    click(btn('รายรับ'));
    click(btn('เส้น'));
    expect(lastEngine().hiddenDatasets).toEqual([]);
  });

  it('is forgotten when the breakdown is toggled', () => {
    mount();
    click(btn('รายรับ'));
    click(btn('แจกแจง'));
    expect(lastEngine().hiddenDatasets).toEqual([]);
  });

  it('is forgotten when the category selection changes', () => {
    mount();
    click(btn('รายรับ'));
    setCtx({ dashboardCategory: ['ค่ากิน'] });
    rerender();
    expect(lastEngine().hiddenDatasets).toEqual([]);
  });

  it('survives an unrelated re-render', () => {
    mount();
    click(btn('รายรับ'));
    rerender();
    expect(lastEngine().hiddenDatasets).toEqual(['รายรับ']);
  });
});

describe('MainChart — the display-options menu closes itself', () => {
  const isOpen = () => document.body.textContent!.includes('ตัวเลือกกราฟ');
  const trigger = () => btn('ตัวเลือกแสดงผล');
  const mousedown = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });

  it('a click outside closes it', () => {
    mount();
    click(trigger());
    expect(isOpen()).toBe(true);
    mousedown(document.body);
    expect(isOpen()).toBe(false);
  });

  it('a click inside it does not', () => {
    mount();
    click(trigger());
    mousedown(q('input[placeholder="ค้นหาหมวดหมู่..."]')!);
    expect(isOpen()).toBe(true);
    mousedown(trigger());
    expect(isOpen()).toBe(true);
  });

  it('Escape closes it', () => {
    mount();
    click(trigger());
    key(document.body, 'Escape');
    expect(isOpen()).toBe(false);
  });

  it('other keys do not', () => {
    mount();
    click(trigger());
    key(document.body, 'Enter');
    expect(isOpen()).toBe(true);
  });

  it('stops listening once closed, and on unmount', () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    mount();
    click(trigger());
    mousedown(document.body);
    const removed = remove.mock.calls.map(c => c[0]);
    expect(removed).toContain('mousedown');
    expect(removed).toContain('keydown');
    // A later Escape / click must not do anything (and must not throw).
    expect(() => { key(document.body, 'Escape'); mousedown(document.body); }).not.toThrow();
    expect(isOpen()).toBe(false);
  });

  it('adds no document listeners while it is closed', () => {
    const add = vi.spyOn(document, 'addEventListener');
    mount();
    expect(add.mock.calls.filter(c => c[0] === 'mousedown' || c[0] === 'keydown')).toHaveLength(0);
    click(trigger());
    expect(add.mock.calls.filter(c => c[0] === 'mousedown' || c[0] === 'keydown').length).toBeGreaterThanOrEqual(2);
  });
});
