// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, flush } from '@/test-utils/renderHook';
import type { TransactionDisplay } from '@/types';

const h = vi.hoisted(() => ({
  data: {} as Record<string, unknown>,
  ui: {} as Record<string, unknown>,
}));
vi.mock('../AppDataContext', () => ({ useAppData: () => h.data }));
vi.mock('../AppUIContext', () => ({ useAppUI: () => h.ui }));
vi.mock('../../services/api', () => ({ transactionService: { search: vi.fn().mockResolvedValue([]) } }));

import { AppFilterProvider, useAppFilter } from '../AppFilterContext';

const wrapper = ({ children }: { children: React.ReactNode }) => <AppFilterProvider>{children}</AppFilterProvider>;
const TXS: TransactionDisplay[] = [
  { id: 'i', date: '2026-10-25', category: 'เงินเดือน', category_id: 'c_inc', description: '', amount: 1000 },
  { id: 'e', date: '2026-10-03', category: 'ข้าว', category_id: 'c_food', description: '', amount: 300 },
];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 9, 12));
  localStorage.clear();
  h.data = {
    transactions: TXS,
    categories: [
      { id: 'c_inc', name: 'เงินเดือน', type: 'income', cashflowGroup: 'g_inc' },
      { id: 'c_food', name: 'ข้าว', type: 'expense', cashflowGroup: 'g_food' },
    ],
    cashflowGroups: [
      { id: 'g_inc', name: 'รายรับ', type: 'income', order_index: 0 },
      { id: 'g_food', name: 'ค่ากิน', type: 'expense', allocation_type: 'need', order_index: 1 },
    ],
    masterPeriods: ['2026-10'],
    summaryData: null,
    dayTypes: {},
    dayTypeConfig: [],
    loadPeriodData: vi.fn(),
  };
  h.ui = {
    activeTab: 'insights', hideFixedExpenses: false, hideWantExpenses: false,
    dashboardCategory: ['ALL'], chartGroupBy: 'monthly', topXLimit: 7,
  };
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('AppFilterContext', () => {
  it('outside the provider throws', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAppFilter())).toThrow('useAppFilter must be used within an AppFilterProvider');
    err.mockRestore();
  });

  it('loads the current month on mount and every period the user picks', async () => {
    const { result } = renderHook(() => useAppFilter(), wrapper);
    expect(h.data.loadPeriodData).toHaveBeenCalledWith('2026-10');
    act(() => result.current.setFilterPeriod('2026-Q3'));
    expect(h.data.loadPeriodData).toHaveBeenLastCalledWith('2026-Q3');
    expect(h.data.loadPeriodData).toHaveBeenCalledTimes(2);
  });

  it('getFilterLabel defaults to the current period', () => {
    const { result } = renderHook(() => useAppFilter(), wrapper);
    expect(result.current.getFilterLabel()).toBe(result.current.getFilterLabel('2026-10'));
    expect(result.current.getFilterLabel('2026')).not.toBe(result.current.getFilterLabel());
  });

  it('analytics sees every loaded row of the period', () => {
    const { result } = renderHook(() => useAppFilter(), wrapper);
    expect(result.current.analytics.totalIncome).toBe(1000);
    expect(result.current.analytics.totalExpense).toBe(300);
    expect(result.current.masterPeriods).toEqual(['2026-10']);
  });

  // แท็บภาพรวมมี id "insights" — ชื่อแท็บของเบราว์เซอร์ต้องไม่ตกเป็น "Home"
  it.each([
    ['insights', 'Dashboard'],
    ['calendar', 'Calendar'],
    ['ledger', 'Ledger'],
    ['portfolio', 'Portfolio'],
    ['tax', 'Tax'],
    ['settings', 'Settings'],
  ])('the browser title names the %s tab', async (tab, label) => {
    h.ui.activeTab = tab;
    const { result } = renderHook(() => useAppFilter(), wrapper);
    await flush();
    expect(document.title).toBe(`SHARK | ${label} [${result.current.getFilterLabel()}]`);
  });

  it('an unknown tab falls back to Home', () => {
    h.ui.activeTab = 'mystery';
    renderHook(() => useAppFilter(), wrapper);
    expect(document.title.startsWith('SHARK | Home [')).toBe(true);
  });
});
