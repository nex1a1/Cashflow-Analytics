// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import DashboardView, { DashboardViewProps } from '../index';
import '@/test-utils/dom'; // switches React's act environment on

// The page's job is to pick a state (skeleton / empty / content), put the sections in order and hand them one context.
// Each section is replaced by a marker that reports what it read from that context.
const make = vi.hoisted(() => async (name: string) => {
  const React = await import('react');
  const { useDashboardContext } = await import('@/views/Dashboard/context/DashboardContext');
  return {
    default: () => {
      const c = useDashboardContext();
      return React.createElement('div', { 'data-section': name, 'data-skeleton': String(!!c.showSkeleton), 'data-period': c.filterPeriod, 'data-count': c.transactions.length });
    },
  };
});
vi.mock('@/views/Dashboard/components/SummaryCards', () => make('summary'));
vi.mock('@/views/Dashboard/components/BudgetEnvelopes', () => make('budgets'));
vi.mock('@/views/Dashboard/components/PortfolioSnapshot', () => make('portfolio'));
vi.mock('@/views/Dashboard/components/ExpenseProportion', () => make('proportion'));
vi.mock('@/views/Dashboard/components/MainChart', () => make('chart'));
vi.mock('@/views/Dashboard/components/TopTransactions', () => make('top'));
vi.mock('@/views/Dashboard/components/ActivityTimeline', () => make('timeline'));
vi.mock('@/views/Dashboard/components/CashflowTable', () => make('table'));

const tx = { id: 't1', date: '2026-10-05', category: 'ข้าว', description: 'x', amount: 50 };
const props = (over: Partial<DashboardViewProps> = {}): DashboardViewProps => ({
  transactions: [tx], categories: [], cashflowGroups: [], filterPeriod: '2026-10', getFilterLabel: () => '',
  hideFixedExpenses: false, setHideFixedExpenses: () => {}, hideWantExpenses: false, setHideWantExpenses: () => {},
  dashboardCategory: 'ALL', setDashboardCategory: () => {}, chartGroupBy: 'category', setChartGroupBy: () => {},
  topXLimit: 7, setTopXLimit: () => {}, analytics: {}, isLoading: false, dayTypeConfig: [], dayTypes: {}, ...over,
});

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = (p: DashboardViewProps) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<DashboardView {...p} />));
  return (next: DashboardViewProps) => act(() => root!.render(<DashboardView {...next} />));
};
const sections = () => [...container!.querySelectorAll<HTMLElement>('[data-section]')];

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

describe('DashboardView', () => {
  it('cold boot (loading, nothing loaded yet) shows the full-page skeleton and no section', () => {
    mount(props({ transactions: [], isLoading: true }));
    // the real skeleton: placeholders in the page's shape, announced as loading
    const skeleton = container!.querySelector('[role="status"]')!;
    expect(skeleton.getAttribute('aria-label')).toBe('กำลังโหลดข้อมูล');
    expect(skeleton.getAttribute('aria-busy')).toBe('true');
    expect(skeleton.querySelectorAll('.animate-pulse').length).toBeGreaterThan(4);
    expect(sections()).toHaveLength(0);
  });

  it('not loading and no data: tells the user how to add the first record, no sections', () => {
    mount(props({ transactions: [] }));
    expect(container!.textContent).toContain('ยังไม่มีข้อมูลสำหรับการวิเคราะห์');
    expect(container!.textContent).toContain('เพิ่มรายการแรก');
    expect(sections()).toHaveLength(0);
    expect(container!.querySelector('[role="status"]')).toBeNull();
  });

  it('reads top to bottom: summary → budgets → portfolio → proportion → chart + top → timeline → table', () => {
    mount(props());
    expect(sections().map(s => s.dataset.section)).toEqual(['summary', 'budgets', 'portfolio', 'proportion', 'chart', 'top', 'timeline', 'table']);
  });

  it('every section reads the same context (period, rows)', () => {
    mount(props({ filterPeriod: '2026-09', transactions: [tx, { ...tx, id: 't2' }] }));
    for (const s of sections()) {
      expect(s.dataset.period).toBe('2026-09');
      expect(s.dataset.count).toBe('2');
    }
  });

  it('a filter change while data is loading keeps the sections up and flags them as loading (no full skeleton flash)', () => {
    const rerender = mount(props());
    expect(sections().every(s => s.dataset.skeleton === 'false')).toBe(true);
    vi.useFakeTimers();
    try {
      rerender(props({ isLoading: true, filterPeriod: '2026-11' }));
      expect(container!.querySelector('[role="status"]')).toBeNull();
      expect(sections()).toHaveLength(8);
      // a fast load keeps the old numbers up: no skeleton flicker
      expect(sections().every(s => s.dataset.skeleton === 'false')).toBe(true);
      act(() => { vi.advanceTimersByTime(400); });
      expect(sections().every(s => s.dataset.skeleton === 'true' && s.dataset.period === '2026-11')).toBe(true);
    } finally { vi.useRealTimers(); }
  });

  it('the skeleton gives way to the sections once rows arrive', () => {
    const rerender = mount(props({ transactions: [], isLoading: true }));
    rerender(props({ isLoading: false }));
    expect(container!.querySelector('[role="status"]')).toBeNull();
    expect(sections()).toHaveLength(8);
  });
});
