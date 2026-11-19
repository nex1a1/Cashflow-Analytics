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

});

describe('MainChart — the display-options menu closes itself', () => {
  const isOpen = () => document.body.textContent!.includes('ตัวเลือกกราฟ');
  const trigger = () => btn('ตัวเลือกแสดงผล');
  const mousedown = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });

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
