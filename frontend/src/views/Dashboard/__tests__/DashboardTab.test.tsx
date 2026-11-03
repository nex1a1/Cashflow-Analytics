// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import '@/test-utils/dom';

// DashboardTab owns the dashboard aggregation (it used to run in AppFilterContext for every tab):
// it reads the three contexts, runs useAnalytics and hands everything to DashboardView.
const h = vi.hoisted(() => ({ props: null as Record<string, any> | null, data: {} as Record<string, unknown>, ui: {} as Record<string, unknown> }));
vi.mock('@/context/AppDataContext', () => ({ useAppData: () => h.data }));
vi.mock('@/context/AppFilterContext', () => ({ useAppFilter: () => ({ filterPeriod: '2026-10', getFilterLabel: () => 'ต.ค. 2026' }) }));
vi.mock('@/context/AppUIContext', () => ({ useAppUI: () => h.ui }));
vi.mock('../index', () => ({ default: (p: Record<string, any>) => { h.props = p; return null; } }));

import DashboardTab from '../DashboardTab';

let root: Root | null = null;
let container: HTMLElement | null = null;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 9, 12));
  h.props = null;
  h.data = {
    transactions: [
      { id: 'i', date: '2026-10-25', category: 'เงินเดือน', category_id: 'c_inc', description: '', amount: 1000 },
      { id: 'e', date: '2026-10-03', category: 'ข้าว', category_id: 'c_food', description: '', amount: 300 },
    ],
    categories: [
      { id: 'c_inc', name: 'เงินเดือน', type: 'income', cashflowGroup: 'g_inc' },
      { id: 'c_food', name: 'ข้าว', type: 'expense', cashflowGroup: 'g_food' },
    ],
    cashflowGroups: [
      { id: 'g_inc', name: 'รายรับ', type: 'income', order_index: 0 },
      { id: 'g_food', name: 'ค่ากิน', type: 'expense', allocation_type: 'need', order_index: 1 },
    ],
    summaryData: null, dayTypes: {}, dayTypeConfig: [],
  };
  h.ui = {
    hideFixedExpenses: false, setHideFixedExpenses: vi.fn(), hideWantExpenses: false, setHideWantExpenses: vi.fn(),
    dashboardCategory: ['ALL'], setDashboardCategory: vi.fn(), chartGroupBy: 'monthly', setChartGroupBy: vi.fn(),
    topXLimit: 7, setTopXLimit: vi.fn(),
  };
});
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  vi.useRealTimers();
});

describe('DashboardTab', () => {
  it('computes the analytics from every loaded row of the period and passes the contexts through', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(<DashboardTab showPortfolio={false} isLoading />));
    expect(h.props!.analytics.totalIncome).toBe(1000);
    expect(h.props!.analytics.totalExpense).toBe(300);
    expect(h.props).toMatchObject({
      transactions: h.data.transactions, categories: h.data.categories, cashflowGroups: h.data.cashflowGroups, filterPeriod: '2026-10',
      hideFixedExpenses: false, setHideFixedExpenses: h.ui.setHideFixedExpenses, dashboardCategory: ['ALL'], chartGroupBy: 'monthly', topXLimit: 7,
      setTopXLimit: h.ui.setTopXLimit, showPortfolio: false, isLoading: true,
    });
  });
});
