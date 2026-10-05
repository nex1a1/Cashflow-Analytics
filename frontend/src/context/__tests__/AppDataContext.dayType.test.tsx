// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, flush, act } from '@/test-utils/renderHook';
import { AppDataProvider, useAppData } from '../AppDataContext';
import { ToastProvider, useToast } from '../ToastContext';

const api = vi.hoisted(() => ({
  transactionService: { getAll: vi.fn(), getCount: vi.fn(), getPeriods: vi.fn(), getFrequentItems: vi.fn(), save: vi.fn() },
  analyticsService: { getDashboardData: vi.fn() },
  calendarService: { getAll: vi.fn(), save: vi.fn() },
  dayTypeService: { getAll: vi.fn(), save: vi.fn(), deleteById: vi.fn() },
  groupService: { getAll: vi.fn(), save: vi.fn(), deleteById: vi.fn() },
  categoryService: { getAll: vi.fn(), save: vi.fn(), deleteById: vi.fn() },
}));
vi.mock('../../services/api', () => api);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider><AppDataProvider>{children}</AppDataProvider></ToastProvider>
);

async function mount(existing: Array<{ date: string; type_id: string }> = []) {
  api.calendarService.getAll.mockResolvedValue(existing);
  const hook = renderHook(() => ({ app: useAppData(), toast: useToast().toast }), wrapper);
  await flush();
  return hook;
}

beforeEach(() => {
  Object.values(api).forEach(svc => Object.values(svc).forEach(fn => (fn as any).mockReset()));
  api.transactionService.getAll.mockResolvedValue([]);
  api.transactionService.getCount.mockResolvedValue({ count: 0 });
  api.transactionService.getPeriods.mockResolvedValue([]);
  api.transactionService.getFrequentItems.mockResolvedValue([]);
  api.analyticsService.getDashboardData.mockResolvedValue(null);
  api.dayTypeService.getAll.mockResolvedValue([]);
  api.groupService.getAll.mockResolvedValue([]);
  api.categoryService.getAll.mockResolvedValue([]);
  api.calendarService.save.mockResolvedValue({ success: true });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

const row = (id: string, date: string) => ({ id, date, category: 'อาหาร', category_id: 'c', description: id, amount: 1, group_type: 'expense', allocation_type: 'need' });
const slow = <T,>(value: T, ms: number) => new Promise<T>(r => setTimeout(() => r(value), ms));

describe('loading a period', () => {
  it('the last period the user picked wins even when an earlier, slower request answers after it', async () => {
    const { result } = await mount();
    api.transactionService.getAll.mockImplementation((start?: string) =>
      start === undefined ? slow([row('ALL-data', '2026-01-01')], 40) : Promise.resolve([row('MONTH-data', '2026-10-05')]));

    let first!: Promise<void>;
    act(() => { first = result.current.app.loadPeriodData('ALL'); });
    await act(async () => { await result.current.app.loadPeriodData('2026-10'); });
    await act(async () => { await first; });

    expect(result.current.app.transactions.map(t => t.id)).toEqual(['MONTH-data']);
  });

  it('refreshData reloads the period that is showing now, even when called from a stale closure (the undo toast)', async () => {
    const { result } = await mount();
    const staleRefresh = result.current.app.refreshData; // captured before any period was loaded
    await act(async () => { await result.current.app.loadPeriodData('2026-09'); });
    api.transactionService.getAll.mockClear();

    await act(async () => { await staleRefresh(); });

    // September's window: 3 months back .. end of month
    expect(api.transactionService.getAll).toHaveBeenCalledWith('2026-06-01', '2026-09-30');
  });
});

describe('handleDayTypeChange', () => {
  it('keeps the new day type when the save succeeds', async () => {
    const { result } = await mount();
    await act(async () => { await result.current.app.handleDayTypeChange('2026-10-05', 'dt-b'); });
    expect(result.current.app.dayTypes['2026-10-05']).toBe('dt-b');
    expect(api.calendarService.save).toHaveBeenCalledWith('2026-10-05', 'dt-b');
  });

  it('puts the previous day type back and shows an error when the save fails', async () => {
    const { result } = await mount([{ date: '2026-10-05', type_id: 'dt-a' }]);
    api.calendarService.save.mockRejectedValue(new Error('offline'));
    await act(async () => { await result.current.app.handleDayTypeChange('2026-10-05', 'dt-b'); });

    expect(result.current.app.dayTypes['2026-10-05']).toBe('dt-a');
    expect(result.current.toast.visible).toBe(true);
    expect(result.current.toast.type).toBe('error');
  });

  it('removes the day again when it had no explicit type before and the save fails', async () => {
    const { result } = await mount();
    api.calendarService.save.mockRejectedValue(new Error('offline'));
    await act(async () => { await result.current.app.handleDayTypeChange('2026-10-05', 'dt-b'); });
    expect(result.current.app.dayTypes['2026-10-05']).toBeUndefined();
  });
});
