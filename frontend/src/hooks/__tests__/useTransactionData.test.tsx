// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, flush, act } from '@/test-utils/renderHook';
import useTransactionData, { UseTransactionDataProps } from '../useTransactionData';
import { ToastProvider, useToast } from '../../context/ToastContext';
import type { Category, TransactionDisplay } from '@/types';

const api = vi.hoisted(() => ({
  transactionService: {
    getAll: vi.fn(), getCount: vi.fn(), getPeriods: vi.fn(), getFrequentItems: vi.fn(),
    save: vi.fn(), deleteById: vi.fn(), deleteMonth: vi.fn(), resetAll: vi.fn(),
  },
  analyticsService: { getDashboardData: vi.fn() },
  calendarService: { getAll: vi.fn() },
  dayTypeService: { getAll: vi.fn() },
  groupService: { getAll: vi.fn() },
  categoryService: { getAll: vi.fn() },
}));
vi.mock('../../services/api', () => api);

const row = (id: string, date: string, over: Partial<TransactionDisplay> = {}): TransactionDisplay =>
  ({ id, date, category: 'อาหาร', category_id: 'c_food', description: id, amount: 10, ...over });
const slow = <T,>(value: T, ms: number) => new Promise<T>(r => setTimeout(() => r(value), ms));
const fail = (ms: number) => new Promise<never>((_, j) => setTimeout(() => j(new Error('late')), ms));

const CATS: Category[] = [
  { id: 'c_food', name: 'อาหาร', icon: 'utensils', type: 'expense', allocation_type: 'want', cashflowGroup: 'g' },
  { id: 'c_rent', name: 'ค่าเช่า', icon: 'home', type: 'expense', allocation_type: 'need', cashflowGroup: 'g' },
  { id: 'c_misc', name: 'อื่น', icon: 'tag', type: 'expense', cashflowGroup: 'g' },
  { id: 'c_sal', name: 'เงินเดือน', icon: 'coins', type: 'income', allocation_type: 'want', cashflowGroup: 'gi' },
];

let setters: Omit<UseTransactionDataProps, 'categories'> & Record<string, ReturnType<typeof vi.fn>>;
const wrapper = ({ children }: { children: React.ReactNode }) => <ToastProvider>{children}</ToastProvider>;

function mount(categories: Category[] = CATS) {
  return renderHook(() => ({ d: useTransactionData({ categories, ...setters }), toast: useToast().toast }), wrapper);
}

beforeEach(() => {
  Object.values(api).forEach(svc => Object.values(svc).forEach(fn => (fn as ReturnType<typeof vi.fn>).mockReset()));
  api.transactionService.getAll.mockResolvedValue([]);
  api.transactionService.getCount.mockResolvedValue({ count: 0 });
  api.transactionService.getPeriods.mockResolvedValue([]);
  api.transactionService.getFrequentItems.mockResolvedValue([]);
  api.transactionService.save.mockResolvedValue({ success: true, count: 1 });
  api.transactionService.deleteById.mockResolvedValue({ success: true });
  api.transactionService.deleteMonth.mockResolvedValue({ success: true });
  api.transactionService.resetAll.mockResolvedValue({ success: true });
  api.analyticsService.getDashboardData.mockResolvedValue({ summary: { income: 1 } });
  api.calendarService.getAll.mockResolvedValue([]);
  api.dayTypeService.getAll.mockResolvedValue([]);
  api.groupService.getAll.mockResolvedValue([]);
  api.categoryService.getAll.mockResolvedValue([]);
  setters = {
    setCategories: vi.fn(), setDayTypes: vi.fn(), setDayNotes: vi.fn(),
    setDayTypeConfig: vi.fn(), setDbStatus: vi.fn(), setCashflowGroups: vi.fn(),
  } as typeof setters;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('loadData', () => {
  it('loads the window, sorts by date keeping same-day entry order, reports online', async () => {
    api.transactionService.getAll.mockResolvedValue([row('b', '2026-10-05'), row('a', '2026-10-01'), row('c', '2026-10-05')]);
    const { result } = mount();
    await act(async () => { await result.current.d.loadData('2026-10-01', '2026-10-31'); });
    expect(api.transactionService.getAll).toHaveBeenCalledWith('2026-10-01', '2026-10-31');
    expect(result.current.d.transactions.map(t => t.id)).toEqual(['a', 'b', 'c']);
    expect(setters.setDbStatus).toHaveBeenNthCalledWith(1, 'กำลังโหลด...');
    expect(setters.setDbStatus).toHaveBeenLastCalledWith('Online (SQLite3)');
  });

  it('null bounds mean the whole database (no params)', async () => {
    const { result } = mount();
    await act(async () => { await result.current.d.loadData(null, null); });
    expect(api.transactionService.getAll).toHaveBeenCalledWith(undefined, undefined);
  });

  it('a failure empties the list and reports offline', async () => {
    api.transactionService.getAll.mockResolvedValueOnce([row('a', '2026-10-01')]).mockRejectedValueOnce(new Error('down'));
    const { result } = mount();
    await act(async () => { await result.current.d.loadData('2026-10-01', '2026-10-31'); });
    await act(async () => { await result.current.d.loadData('2026-11-01', '2026-11-30'); });
    expect(result.current.d.transactions).toEqual([]);
    expect(setters.setDbStatus).toHaveBeenLastCalledWith('Offline (Database Error)');
  });

  it('a slow older answer (success or failure) never replaces the newer window', async () => {
    const { result } = mount();
    api.transactionService.getAll.mockImplementationOnce(() => slow([row('old', '2026-01-01')], 30));
    api.transactionService.getAll.mockImplementationOnce(() => Promise.resolve([row('new', '2026-10-01')]));
    let first!: Promise<void>;
    act(() => { first = result.current.d.loadData(null, null); });
    await act(async () => { await result.current.d.loadData('2026-10-01', '2026-10-31'); });
    await act(async () => { await first; });
    expect(result.current.d.transactions.map(t => t.id)).toEqual(['new']);

    api.transactionService.getAll.mockImplementationOnce(() => fail(30));
    api.transactionService.getAll.mockImplementationOnce(() => Promise.resolve([row('newer', '2026-11-01')]));
    act(() => { first = result.current.d.loadData(null, null); });
    await act(async () => { await result.current.d.loadData('2026-11-01', '2026-11-30'); });
    await act(async () => { await first; });
    expect(result.current.d.transactions.map(t => t.id)).toEqual(['newer']);
    expect(setters.setDbStatus).toHaveBeenLastCalledWith('Online (SQLite3)');
  });
});

describe('loadAnalytics', () => {
  it('stores the backend summary for the window', async () => {
    const { result } = mount();
    await act(async () => { await result.current.d.loadAnalytics('2026-01-01', '2026-12-31'); });
    expect(api.analyticsService.getDashboardData).toHaveBeenCalledWith('2026-01-01', '2026-12-31');
    expect(result.current.d.summaryData).toEqual({ summary: { income: 1 } });
  });

  it('null bounds are sent as undefined', async () => {
    const { result } = mount();
    await act(async () => { await result.current.d.loadAnalytics(null, null); });
    expect(api.analyticsService.getDashboardData).toHaveBeenCalledWith(undefined, undefined);
  });

  // ช่วงใหม่โหลดสรุปไม่สำเร็จ: ต้องไม่เอายอดของช่วงก่อนหน้ามาแสดงใต้ชื่อช่วงใหม่
  it('a failed load does not leave the previous window\'s summary in place', async () => {
    const { result } = mount();
    await act(async () => { await result.current.d.loadAnalytics('2026-01-01', '2026-03-31'); });
    api.analyticsService.getDashboardData.mockRejectedValueOnce(new Error('down'));
    await act(async () => { await result.current.d.loadAnalytics('2026-01-01', '2026-12-31'); });
    expect(result.current.d.summaryData).toBeNull();
  });

  it('a late failure of an older request does not clear the newer summary', async () => {
    const { result } = mount();
    api.analyticsService.getDashboardData.mockImplementationOnce(() => fail(30));
    api.analyticsService.getDashboardData.mockImplementationOnce(() => Promise.resolve({ summary: { income: 2 } }));
    let first!: Promise<void>;
    act(() => { first = result.current.d.loadAnalytics(null, null); });
    await act(async () => { await result.current.d.loadAnalytics('2026-10-01', '2026-10-31'); });
    await act(async () => { await first; });
    expect(result.current.d.summaryData).toEqual({ summary: { income: 2 } });
  });

  it('a slow older success is ignored too', async () => {
    const { result } = mount();
    api.analyticsService.getDashboardData.mockImplementationOnce(() => slow({ summary: { income: 1 } }, 30));
    api.analyticsService.getDashboardData.mockImplementationOnce(() => Promise.resolve({ summary: { income: 2 } }));
    let first!: Promise<void>;
    act(() => { first = result.current.d.loadAnalytics(null, null); });
    await act(async () => { await result.current.d.loadAnalytics('2026-10-01', '2026-10-31'); });
    await act(async () => { await first; });
    expect(result.current.d.summaryData).toEqual({ summary: { income: 2 } });
  });
});

describe('refreshData', () => {
  it('reloads the current windows and the master lists', async () => {
    api.transactionService.getPeriods.mockResolvedValue(['2026-10']);
    api.transactionService.getFrequentItems.mockResolvedValue([{ description: 'ข้าว' }]);
    api.transactionService.getCount.mockResolvedValue({ count: 42 });
    const { result } = mount();
    await act(async () => { await result.current.d.loadData('2026-07-01', '2026-10-31'); });
    await act(async () => { await result.current.d.loadAnalytics('2026-10-01', '2026-10-31'); });
    api.transactionService.getAll.mockClear();
    api.analyticsService.getDashboardData.mockClear();
    await act(async () => { await result.current.d.refreshData(); });
    expect(api.transactionService.getAll).toHaveBeenCalledWith('2026-07-01', '2026-10-31');
    expect(api.analyticsService.getDashboardData).toHaveBeenCalledWith('2026-10-01', '2026-10-31');
    expect(result.current.d.masterPeriods).toEqual(['2026-10']);
    expect(result.current.d.frequentItems).toEqual([{ description: 'ข้าว' }]);
    expect(result.current.d.totalCount).toBe(42);
  });

  it('a failing master list is logged, the rest still lands', async () => {
    api.transactionService.getPeriods.mockRejectedValue(new Error('x'));
    api.transactionService.getCount.mockResolvedValue({ count: 7 });
    const { result } = mount();
    await act(async () => { await result.current.d.refreshData(); });
    expect(result.current.d.totalCount).toBe(7);
    expect(console.error).toHaveBeenCalledWith('Refresh failed', expect.any(Error));
  });
});

describe('bootstrap', () => {
  it('loads master lists, groups, categories (mapped), day types and the calendar', async () => {
    api.transactionService.getPeriods.mockResolvedValue(['2026-09', '2026-10']);
    api.transactionService.getFrequentItems.mockResolvedValue([{ description: 'กาแฟ' }]);
    api.transactionService.getCount.mockResolvedValue({ count: 5 });
    api.groupService.getAll.mockResolvedValue([{ id: 'g1' }]);
    api.categoryService.getAll.mockResolvedValue([
      { id: 'c1', name: 'ข้าว', icon: 'utensils', color: '#111111', cashflow_group_id: 'g1', group_type: 'expense', allocation_type: 'need', order_index: 3 },
      { id: 'c2', name: 'ไม่มีลำดับ', icon: 'tag', color: null, cashflow_group_id: 'g1', group_type: 'income', allocation_type: 'want', order_index: null },
    ]);
    api.dayTypeService.getAll.mockResolvedValue([{ id: 'dt1', label: 'ทำงาน' }]);
    api.calendarService.getAll.mockResolvedValue([
      { date: '2026-10-01', type_id: 'dt1', note: 'วันเกิด', note_icon: 'cake' },
      { date: '2026-10-02', type_id: 'dt1', note: 'ไม่มีไอคอน', note_icon: null },
      { date: '2026-10-03', type_id: 'dt2', note: '' },
    ]);
    const { result } = mount();
    expect(result.current.d.isBootstrapping).toBe(true);
    await act(async () => { await result.current.d.bootstrap(); });
    expect(result.current.d.isBootstrapping).toBe(false);
    expect(result.current.d.masterPeriods).toEqual(['2026-09', '2026-10']);
    expect(result.current.d.frequentItems).toEqual([{ description: 'กาแฟ' }]);
    expect(result.current.d.totalCount).toBe(5);
    expect(setters.setCashflowGroups).toHaveBeenCalledWith([{ id: 'g1' }]);
    expect(setters.setCategories).toHaveBeenCalledWith([
      { id: 'c1', name: 'ข้าว', icon: 'utensils', color: '#111111', cashflowGroup: 'g1', type: 'expense', allocation_type: 'need', order_index: 3 },
      { id: 'c2', name: 'ไม่มีลำดับ', icon: 'tag', color: null, cashflowGroup: 'g1', type: 'income', allocation_type: 'want', order_index: 0 },
    ]);
    expect(setters.setDayTypeConfig).toHaveBeenCalledWith([{ id: 'dt1', label: 'ทำงาน' }]);
    expect(setters.setDayTypes).toHaveBeenCalledWith({ '2026-10-01': 'dt1', '2026-10-02': 'dt1', '2026-10-03': 'dt2' });
    expect(setters.setDayNotes).toHaveBeenCalledWith({
      '2026-10-01': { text: 'วันเกิด', icon: 'cake' },
      '2026-10-02': { text: 'ไม่มีไอคอน', icon: '' },
    });
  });

  it('empty lists keep the defaults (no setter call)', async () => {
    const { result } = mount();
    await act(async () => { await result.current.d.bootstrap(); });
    expect(setters.setCashflowGroups).not.toHaveBeenCalled();
    expect(setters.setCategories).not.toHaveBeenCalled();
    expect(setters.setDayTypeConfig).not.toHaveBeenCalled();
    expect(setters.setDayTypes).toHaveBeenCalledWith({});
  });

  it('each step fails on its own; the rest still loads and the spinner stops', async () => {
    api.transactionService.getPeriods.mockRejectedValue(new Error('a'));
    api.groupService.getAll.mockRejectedValue(new Error('b'));
    api.categoryService.getAll.mockRejectedValue(new Error('c'));
    api.dayTypeService.getAll.mockRejectedValue(new Error('d'));
    api.calendarService.getAll.mockResolvedValue([{ date: '2026-10-01', type_id: 'dt1' }]);
    const { result } = mount();
    await act(async () => { await result.current.d.bootstrap(); });
    expect(setters.setDayTypes).toHaveBeenCalledWith({ '2026-10-01': 'dt1' });
    expect(result.current.d.isBootstrapping).toBe(false);
    expect(console.error).toHaveBeenCalledWith('Master lists load failed:', expect.any(Error));
    expect(console.error).toHaveBeenCalledWith('Groups load failed:', expect.any(Error));
    expect(console.error).toHaveBeenCalledWith('Categories load failed:', expect.any(Error));
    expect(console.error).toHaveBeenCalledWith('DayTypes load failed:', expect.any(Error));
  });

  it('a calendar failure is logged and the rest stays', async () => {
    api.calendarService.getAll.mockRejectedValue(new Error('e'));
    api.dayTypeService.getAll.mockResolvedValue([{ id: 'dt1' }]);
    const { result } = mount();
    await act(async () => { await result.current.d.bootstrap(); });
    expect(setters.setDayTypes).not.toHaveBeenCalled();
    expect(setters.setDayTypeConfig).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('Calendar load failed:', expect.any(Error));
  });
});

describe('saving', () => {
  it('saveToDb returns the API answer', async () => {
    const { result } = mount();
    let res: unknown;
    await act(async () => { res = await result.current.d.saveToDb([{ id: 'x' }]); });
    expect(res).toEqual({ success: true, count: 1 });
  });

  it('saveToDb failure: error toast and rethrow', async () => {
    api.transactionService.save.mockRejectedValue(new Error('400 bad'));
    const { result } = mount();
    let caught: unknown;
    await act(async () => { await result.current.d.saveToDb([{ id: 'x' }]).catch(e => { caught = e; }); });
    expect((caught as Error).message).toBe('400 bad');
    expect(result.current.toast).toMatchObject({ visible: true, type: 'error', message: 'บันทึกไม่สำเร็จ: 400 bad' });
  });

  it('handleSaveTransaction saves one item as a list, then refreshes', async () => {
    const { result } = mount();
    await act(async () => { await result.current.d.handleSaveTransaction({ id: 'n' }); });
    expect(api.transactionService.save).toHaveBeenCalledWith([{ id: 'n' }]);
    expect(api.transactionService.getCount).toHaveBeenCalled();
  });
});

describe('handleUpdateTransaction', () => {
  async function withRows(rows = [row('a', '2026-10-01'), row('b', '2026-10-02', { allocation_type: 'want' })]) {
    api.transactionService.getAll.mockResolvedValue(rows);
    const hook = mount();
    await act(async () => { await hook.result.current.d.loadData('2026-10-01', '2026-10-31'); });
    return hook;
  }

  it('unknown id: nothing happens', async () => {
    const { result } = await withRows();
    let ok: unknown;
    await act(async () => { ok = await result.current.d.handleUpdateTransaction('zzz', 'amount', 5); });
    expect(ok).toBe(false);
    expect(api.transactionService.save).not.toHaveBeenCalled();
  });

  it('a field change is shown at once, re-sorted, saved, and refreshed', async () => {
    const { result } = await withRows();
    api.transactionService.getAll.mockImplementation(() => new Promise(() => {})); // refresh never answers
    let p!: Promise<boolean>;
    act(() => { p = result.current.d.handleUpdateTransaction('a', 'date', '2026-10-09'); });
    expect(result.current.d.transactions.map(t => t.id)).toEqual(['b', 'a']);
    await flush();
    expect(api.transactionService.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', date: '2026-10-09' }));
    void p;
  });

  it('a new category brings its name, icon and allocation', async () => {
    const { result } = await withRows();
    await act(async () => { await result.current.d.handleUpdateTransaction('b', 'category_id', 'c_rent'); });
    expect(api.transactionService.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'b', category_id: 'c_rent', category: 'ค่าเช่า', category_icon: 'home', allocation_type: 'need',
    }));
  });

  it('an income category clears the allocation; a category without one keeps the row\'s', async () => {
    const { result } = await withRows();
    await act(async () => { await result.current.d.handleUpdateTransaction('b', 'category_id', 'c_sal'); });
    expect(api.transactionService.save).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'เงินเดือน', allocation_type: null }));
    act(() => { void result.current.d.handleUpdateTransaction('b', 'category_id', 'c_misc'); });
    await flush();
    expect(api.transactionService.save).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'อื่น', allocation_type: 'want' }));
  });

  it('other fields never touch the category, even when the value looks like a category id', async () => {
    const { result } = await withRows();
    await act(async () => { await result.current.d.handleUpdateTransaction('b', 'description', 'c_rent'); });
    expect(api.transactionService.save).toHaveBeenLastCalledWith(expect.objectContaining({ description: 'c_rent', category: 'อาหาร', allocation_type: 'want' }));
  });

  it('an unknown category id only changes the id', async () => {
    const { result } = await withRows();
    await act(async () => { await result.current.d.handleUpdateTransaction('b', 'category_id', 'gone'); });
    expect(api.transactionService.save).toHaveBeenLastCalledWith(expect.objectContaining({ category_id: 'gone', category: 'อาหาร' }));
  });

  it('a failed save puts the list back and answers false', async () => {
    const { result } = await withRows();
    api.transactionService.save.mockRejectedValue(new Error('x'));
    let ok: unknown;
    await act(async () => { ok = await result.current.d.handleUpdateTransaction('a', 'amount', 999); });
    expect(ok).toBe(false);
    expect(result.current.d.transactions.find(t => t.id === 'a')!.amount).toBe(10);
  });

  it('success answers true', async () => {
    const { result } = await withRows();
    let ok: unknown;
    await act(async () => { ok = await result.current.d.handleUpdateTransaction('a', 'amount', 999); });
    expect(ok).toBe(true);
  });

  it('a failed save only undoes its own edit: a newer edit of another row, or of another field of the same row, stays', async () => {
    const { result } = await withRows();
    api.transactionService.getAll.mockImplementation(() => new Promise(() => {})); // refreshes never answer
    let rejectA!: (e: Error) => void;
    api.transactionService.save.mockImplementationOnce(() => new Promise((_, j) => { rejectA = j; }));
    let pA!: Promise<boolean>;
    act(() => { pA = result.current.d.handleUpdateTransaction('a', 'amount', 999); });
    act(() => { void result.current.d.handleUpdateTransaction('b', 'description', 'ใหม่'); });
    await flush();
    act(() => { void result.current.d.handleUpdateTransaction('a', 'description', 'แก้ด้วย'); });
    await flush();
    await act(async () => { rejectA(new Error('x')); await pA; });
    const byId = (id: string) => result.current.d.transactions.find(t => t.id === id)!;
    expect(byId('a')).toMatchObject({ amount: 10, description: 'แก้ด้วย' });
    expect(byId('b').description).toBe('ใหม่');
  });

  it('a failed category change puts back the name, icon and allocation it brought — unless the row was changed again', async () => {
    const { result } = await withRows();
    api.transactionService.save.mockRejectedValueOnce(new Error('x'));
    await act(async () => { await result.current.d.handleUpdateTransaction('b', 'category_id', 'c_rent'); });
    expect(result.current.d.transactions.find(t => t.id === 'b')).toMatchObject({ category_id: 'c_food', category: 'อาหาร', allocation_type: 'want' });

    api.transactionService.getAll.mockImplementation(() => new Promise(() => {}));
    let reject!: (e: Error) => void;
    api.transactionService.save.mockImplementationOnce(() => new Promise((_, j) => { reject = j; }));
    let p!: Promise<boolean>;
    act(() => { p = result.current.d.handleUpdateTransaction('b', 'category_id', 'c_rent'); });
    act(() => { void result.current.d.handleUpdateTransaction('b', 'category_id', 'c_misc'); });
    await flush();
    await act(async () => { reject(new Error('x')); await p; });
    expect(result.current.d.transactions.find(t => t.id === 'b')).toMatchObject({ category_id: 'c_misc', category: 'อื่น' });
  });

  it('a failed save never touches another row that happens to hold the same value', async () => {
    const { result } = await withRows([row('a', '2026-10-01'), row('b', '2026-10-02', { amount: 999 })]);
    api.transactionService.save.mockRejectedValueOnce(new Error('x'));
    await act(async () => { await result.current.d.handleUpdateTransaction('a', 'amount', 999); });
    expect(result.current.d.transactions.find(t => t.id === 'b')!.amount).toBe(999);
    expect(result.current.d.transactions.find(t => t.id === 'a')!.amount).toBe(10);
  });

  it('rolling back a date puts the row back in date order', async () => {
    const { result } = await withRows();
    api.transactionService.save.mockRejectedValueOnce(new Error('x'));
    await act(async () => { await result.current.d.handleUpdateTransaction('a', 'date', '2026-10-09'); });
    expect(result.current.d.transactions.map(t => t.id)).toEqual(['a', 'b']);
  });
});

describe('deleting', () => {
  it('deletes one row, refreshes, and offers undo with its description', async () => {
    api.transactionService.getAll.mockResolvedValue([row('a', '2026-10-01', { description: 'ข้าวมันไก่' })]);
    const { result } = mount();
    await act(async () => { await result.current.d.loadData('2026-10-01', '2026-10-31'); });
    api.transactionService.getCount.mockClear();
    await act(async () => { await result.current.d.handleDeleteTransaction('a'); });
    expect(api.transactionService.deleteById).toHaveBeenCalledWith('a');
    expect(api.transactionService.getCount).toHaveBeenCalled();
    expect(result.current.toast).toMatchObject({ type: 'info', message: 'ลบ "ข้าวมันไก่" แล้ว' });
    expect(result.current.toast.action!.label).toBe('เลิกทำ');

    api.transactionService.save.mockClear();
    await act(async () => { await result.current.toast.action!.onClick(); });
    expect(api.transactionService.save).toHaveBeenCalledWith([expect.objectContaining({ id: 'a' })]);
    expect(result.current.toast).toMatchObject({ type: 'success', message: 'กู้คืน 1 รายการแล้ว' });
  });

  it('label falls back to the category, then "รายการ"', async () => {
    api.transactionService.getAll.mockResolvedValue([row('a', '2026-10-01', { description: '' }), row('b', '2026-10-01', { description: '', category: '' })]);
    const { result } = mount();
    await act(async () => { await result.current.d.loadData('2026-10-01', '2026-10-31'); });
    await act(async () => { await result.current.d.handleDeleteTransaction('a'); });
    expect(result.current.toast.message).toBe('ลบ "อาหาร" แล้ว');
    await act(async () => { await result.current.d.handleDeleteTransaction('b'); });
    expect(result.current.toast.message).toBe('ลบ "รายการ" แล้ว');
  });

  it('a row not in the loaded window: deleted, no undo offered', async () => {
    const { result } = mount();
    await act(async () => { await result.current.d.handleDeleteTransaction('elsewhere'); });
    expect(api.transactionService.deleteById).toHaveBeenCalledWith('elsewhere');
    expect(result.current.toast.visible).toBe(false);
  });

  it('a failed undo says so', async () => {
    api.transactionService.getAll.mockResolvedValue([row('a', '2026-10-01')]);
    const { result } = mount();
    await act(async () => { await result.current.d.loadData('2026-10-01', '2026-10-31'); });
    await act(async () => { await result.current.d.handleDeleteTransaction('a'); });
    api.transactionService.save.mockRejectedValue(new Error('gone'));
    await act(async () => { await result.current.toast.action!.onClick(); });
    expect(result.current.toast).toMatchObject({ type: 'error', message: 'กู้คืนไม่สำเร็จ: gone' });
  });

  it('a failed delete shows an error and offers no undo', async () => {
    api.transactionService.deleteById.mockRejectedValue(new Error('409'));
    const { result } = mount();
    await act(async () => { await result.current.d.handleDeleteTransaction('a'); });
    expect(result.current.toast).toMatchObject({ type: 'error', message: 'เกิดข้อผิดพลาดในการลบข้อมูล: 409' });
    expect(result.current.toast.action).toBeUndefined();
  });
});

describe('handleDeleteMonth', () => {
  it('rejects anything that is not YYYY-MM', async () => {
    const { result } = mount();
    for (const bad of ['2026', 'cycle:2026-10', '2026-10-01', '2026-1']) {
      let ok: unknown;
      await act(async () => { ok = await result.current.d.handleDeleteMonth(bad); });
      expect(ok).toBe(false);
    }
    expect(api.transactionService.deleteMonth).not.toHaveBeenCalled();
  });

  it.each([
    ['2026-02', '2026-02-28'],
    ['2024-02', '2024-02-29'],
    ['2026-12', '2026-12-31'],
    ['2026-04', '2026-04-30'],
  ])('%s: snapshots the whole month from the DB first, then deletes', async (m, last) => {
    api.transactionService.getAll.mockResolvedValue([row('a', `${m}-01`), row('b', `${m}-02`)]);
    const { result } = mount();
    let ok: unknown;
    await act(async () => { ok = await result.current.d.handleDeleteMonth(m); });
    expect(ok).toBe(true);
    expect(api.transactionService.getAll).toHaveBeenNthCalledWith(1, `${m}-01`, last);
    expect(api.transactionService.deleteMonth).toHaveBeenCalledWith(m);
    expect(result.current.toast.message).toMatch(/^ลบข้อมูลเดือน .+ แล้ว \(2 รายการ\)$/);
    expect(result.current.toast.action!.label).toBe('เลิกทำ');
    expect(result.current.d.isProcessing).toBe(false);
  });

  it('shows the processing flag while it runs', async () => {
    let release!: () => void;
    api.transactionService.deleteMonth.mockImplementation(() => new Promise(r => { release = () => r({}); }));
    const { result } = mount();
    let p!: Promise<boolean>;
    act(() => { p = result.current.d.handleDeleteMonth('2026-10'); });
    await flush();
    expect(result.current.d.isProcessing).toBe(true);
    await act(async () => { release(); await p; });
    expect(result.current.d.isProcessing).toBe(false);
  });

  it('a failure shows an error, answers false and clears the flag', async () => {
    api.transactionService.deleteMonth.mockRejectedValue(new Error('x'));
    const { result } = mount();
    let ok: unknown;
    await act(async () => { ok = await result.current.d.handleDeleteMonth('2026-10'); });
    expect(ok).toBe(false);
    expect(result.current.toast).toMatchObject({ type: 'error', message: 'เกิดข้อผิดพลาดในการลบข้อมูล: x' });
    expect(result.current.d.isProcessing).toBe(false);
  });

  it('an empty month offers no undo', async () => {
    const { result } = mount();
    await act(async () => { await result.current.d.handleDeleteMonth('2026-10'); });
    expect(result.current.toast.visible).toBe(false);
  });
});

describe('handleDeleteAllData', () => {
  it('resets, says so, and reloads the page after a second', async () => {
    const timer = vi.spyOn(globalThis, 'setTimeout');
    const { result } = mount();
    await act(async () => { await result.current.d.handleDeleteAllData(); });
    expect(api.transactionService.resetAll).toHaveBeenCalled();
    expect(result.current.toast).toMatchObject({ type: 'success', message: 'ล้างข้อมูลทั้งหมดเรียบร้อยแล้ว' });
    expect(timer.mock.calls.some(c => c[1] === 1000)).toBe(true);
    expect(result.current.d.isProcessing).toBe(false);
    timer.mockRestore();
  });

  it('a failure shows the error and does not reload', async () => {
    api.transactionService.resetAll.mockRejectedValue(new Error('locked'));
    const timer = vi.spyOn(globalThis, 'setTimeout');
    const { result } = mount();
    await act(async () => { await result.current.d.handleDeleteAllData(); });
    expect(result.current.toast).toMatchObject({ type: 'error', message: 'ล้างข้อมูลไม่สำเร็จ: locked' });
    expect(timer.mock.calls.some(c => c[1] === 1000)).toBe(false);
    timer.mockRestore();
  });
});
