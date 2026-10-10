// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, flush, act } from '@/test-utils/renderHook';
import { AppDataProvider, useAppData } from '../AppDataContext';
import { ToastProvider, useToast } from '../ToastContext';
import { DEFAULT_DAY_TYPES } from '../../constants';

const api = vi.hoisted(() => ({
  transactionService: { getAll: vi.fn(), getCount: vi.fn(), getPeriods: vi.fn(), getFrequentItems: vi.fn(), save: vi.fn() },
  analyticsService: { getDashboardData: vi.fn() },
  calendarService: { getAll: vi.fn(), save: vi.fn() },
  dayTypeService: { getAll: vi.fn(), save: vi.fn(), deleteById: vi.fn() },
  groupService: { getAll: vi.fn(), save: vi.fn(), deleteById: vi.fn() },
  categoryService: { getAll: vi.fn(), save: vi.fn(), deleteById: vi.fn() },
}));
vi.mock('../../services/api', () => api);

const DT = [
  { id: 'dt_w', name: 'workday', label: 'ทำงาน', color: '#3B82F6', order_index: 1 },
  { id: 'dt_h', name: 'holiday', label: 'หยุด', color: '#F59E0B', order_index: 2 },
  { id: 'dt_o', name: 'ot', label: 'โอที', color: '#10B981', order_index: 3 },
];
const GROUPS = [
  { id: 'g1', name: 'บ้าน', type: 'expense', order_index: 2 },
  { id: 'g2', name: 'กิน', type: 'expense', order_index: 1 },
  { id: 'g3', name: 'ลงทุน', type: 'savings', order_index: 3 },
];
const deferred = <T,>() => {
  let resolve!: (v: T) => void, reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider><AppDataProvider>{children}</AppDataProvider></ToastProvider>
);
async function mount(calendar: unknown[] = [], dayTypes: unknown[] = DT) {
  api.calendarService.getAll.mockResolvedValue(calendar);
  api.dayTypeService.getAll.mockResolvedValue(dayTypes);
  const hook = renderHook(() => ({ app: useAppData(), toast: useToast().toast }), wrapper);
  await flush();
  return hook;
}

beforeEach(() => {
  Object.values(api).forEach(svc => Object.values(svc).forEach(fn => (fn as ReturnType<typeof vi.fn>).mockReset()));
  api.transactionService.getAll.mockResolvedValue([]);
  api.transactionService.getCount.mockResolvedValue({ count: 0 });
  api.transactionService.getPeriods.mockResolvedValue([]);
  api.transactionService.getFrequentItems.mockResolvedValue([]);
  api.transactionService.save.mockResolvedValue({ success: true, count: 1 });
  api.analyticsService.getDashboardData.mockResolvedValue(null);
  api.groupService.getAll.mockResolvedValue(GROUPS);
  api.groupService.save.mockResolvedValue({ success: true });
  api.groupService.deleteById.mockResolvedValue({ success: true });
  api.categoryService.getAll.mockResolvedValue([
    { id: 'c1', name: 'ข้าว', cashflow_group_id: 'g2', group_type: 'expense', order_index: 1 },
  ]);
  api.calendarService.save.mockResolvedValue({ success: true });
  api.dayTypeService.save.mockResolvedValue({ success: true });
  api.dayTypeService.deleteById.mockResolvedValue({ success: true });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('new-id' as `${string}-${string}-${string}-${string}-${string}`);
});
afterEach(() => { document.body.innerHTML = ''; });

describe('provider', () => {
  it('useAppData outside the provider throws', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAppData())).toThrow('useAppData must be used within an AppDataProvider');
    err.mockRestore();
  });

  it('bootstraps once: groups, categories, day types; then not processing', async () => {
    const { result } = await mount();
    expect(api.groupService.getAll).toHaveBeenCalledTimes(1);
    expect(result.current.app.cashflowGroups).toEqual(GROUPS);
    expect(result.current.app.categories.map(c => c.id)).toEqual(['c1']);
    expect(result.current.app.dayTypeConfig).toEqual(DT);
    expect(result.current.app.isProcessing).toBe(false);
  });

  it('no day types from the server keeps the defaults', async () => {
    const { result } = await mount([], []);
    expect(result.current.app.dayTypeConfig).toEqual(DEFAULT_DAY_TYPES);
  });

  it('loadPeriodData: busy while loading, analytics for the period, rows from 3 months back', async () => {
    const { result } = await mount();
    const rows = deferred<unknown[]>();
    api.transactionService.getAll.mockImplementationOnce(() => rows.promise);
    let p!: Promise<void>;
    act(() => { p = result.current.app.loadPeriodData('2026-10'); });
    expect(result.current.app.isProcessing).toBe(true);
    await act(async () => { rows.resolve([]); await p; });
    expect(result.current.app.isProcessing).toBe(false);
    expect(api.analyticsService.getDashboardData).toHaveBeenLastCalledWith('2026-10-01', '2026-10-31');
    expect(api.transactionService.getAll).toHaveBeenLastCalledWith('2026-07-01', '2026-10-31');
  });

  it('an older period finishing does not stop the spinner of the newer one', async () => {
    const { result } = await mount();
    const old = deferred<unknown[]>();
    const cur = deferred<unknown[]>();
    api.transactionService.getAll.mockImplementationOnce(() => old.promise).mockImplementationOnce(() => cur.promise);
    let p1!: Promise<void>, p2!: Promise<void>;
    act(() => { p1 = result.current.app.loadPeriodData('ALL'); });
    act(() => { p2 = result.current.app.loadPeriodData('2026-10'); });
    await act(async () => { old.resolve([]); await p1; });
    expect(result.current.app.isProcessing).toBe(true);
    await act(async () => { cur.resolve([]); await p2; });
    expect(result.current.app.isProcessing).toBe(false);
  });
});

describe('day type and note races', () => {
  // กดเปลี่ยนประเภทวันสองครั้งติด: ครั้งแรกบันทึกไม่ผ่าน ครั้งที่สองผ่าน ต้องเห็นค่าล่าสุด ไม่ใช่ค่าก่อนหน้าทั้งคู่
  it('a failed day-type save does not undo a newer change of the same day', async () => {
    const { result } = await mount([{ date: '2026-10-05', type_id: 'dt_w' }]);
    const first = deferred<unknown>();
    api.calendarService.save.mockImplementationOnce(() => first.promise).mockResolvedValue({ success: true });
    let p1!: Promise<void>;
    act(() => { p1 = result.current.app.handleDayTypeChange('2026-10-05', 'dt_h'); });
    await act(async () => { await result.current.app.handleDayTypeChange('2026-10-05', 'dt_o'); });
    await act(async () => { first.reject(new Error('x')); await p1; });
    expect(result.current.app.dayTypes['2026-10-05']).toBe('dt_o');
  });

  it('a failed note save does not undo a newer icon of the same text', async () => {
    const { result } = await mount();
    const first = deferred<unknown>();
    api.calendarService.save.mockImplementationOnce(() => first.promise).mockResolvedValue({ success: true });
    let p1!: Promise<boolean>;
    act(() => { p1 = result.current.app.handleDayNoteChange('2026-10-05', 'วันเกิด', 'cake'); });
    await act(async () => { await result.current.app.handleDayNoteChange('2026-10-05', 'วันเกิด', 'star'); });
    await act(async () => { first.reject(new Error('x')); await p1; });
    expect(result.current.app.dayNotes['2026-10-05']).toEqual({ text: 'วันเกิด', icon: 'star' });
  });

  it('a failed note save does not undo a newer note', async () => {
    const { result } = await mount();
    const first = deferred<unknown>();
    api.calendarService.save.mockImplementationOnce(() => first.promise).mockResolvedValue({ success: true });
    let p1!: Promise<boolean>;
    act(() => { p1 = result.current.app.handleDayNoteChange('2026-10-05', 'ร่าง', 'cake'); });
    await act(async () => { await result.current.app.handleDayNoteChange('2026-10-05', 'วันเกิด', 'cake'); });
    let ok: unknown;
    await act(async () => { first.reject(new Error('x')); ok = await p1; });
    expect(ok).toBe(false);
    expect(result.current.app.dayNotes['2026-10-05']).toEqual({ text: 'วันเกิด', icon: 'cake' });
  });
});

describe('handleDayNoteChange', () => {
  it('saves trimmed text with the type the day shows (weekday default)', async () => {
    const { result } = await mount();
    let ok: unknown;
    await act(async () => { ok = await result.current.app.handleDayNoteChange('2026-10-05', '  วันเกิด  ', 'cake'); }); // Monday
    expect(ok).toBe(true);
    expect(api.calendarService.save).toHaveBeenCalledWith('2026-10-05', 'dt_w', 'วันเกิด', 'cake');
    expect(result.current.app.dayNotes['2026-10-05']).toEqual({ text: 'วันเกิด', icon: 'cake' });
  });

  it('a weekend uses the holiday type; an explicit type wins', async () => {
    const { result } = await mount([{ date: '2026-10-06', type_id: 'dt_o' }]);
    await act(async () => { await result.current.app.handleDayNoteChange('2026-10-04', 'อา', ''); }); // Sunday
    expect(api.calendarService.save).toHaveBeenLastCalledWith('2026-10-04', 'dt_h', 'อา', '');
    await act(async () => { await result.current.app.handleDayNoteChange('2026-10-03', 'ส', ''); }); // Saturday
    expect(api.calendarService.save).toHaveBeenLastCalledWith('2026-10-03', 'dt_h', 'ส', '');
    await act(async () => { await result.current.app.handleDayNoteChange('2026-10-06', 'โอ', ''); });
    expect(api.calendarService.save).toHaveBeenLastCalledWith('2026-10-06', 'dt_o', 'โอ', '');
  });

  it('clearing the text clears the icon and removes the note', async () => {
    const { result } = await mount([{ date: '2026-10-05', type_id: 'dt_w', note: 'เดิม', note_icon: 'cake' }]);
    await act(async () => { await result.current.app.handleDayNoteChange('2026-10-05', '   ', 'cake'); });
    expect(api.calendarService.save).toHaveBeenCalledWith('2026-10-05', 'dt_w', '', '');
    expect(result.current.app.dayNotes['2026-10-05']).toBeUndefined();
  });

  it('no change: no save, answers true', async () => {
    const { result } = await mount([{ date: '2026-10-05', type_id: 'dt_w', note: 'เดิม', note_icon: 'cake' }]);
    let ok: unknown;
    await act(async () => { ok = await result.current.app.handleDayNoteChange('2026-10-05', 'เดิม', 'cake'); });
    expect(ok).toBe(true);
    await act(async () => { ok = await result.current.app.handleDayNoteChange('2026-10-07', '', 'cake'); });
    expect(ok).toBe(true);
    expect(api.calendarService.save).not.toHaveBeenCalled();
  });

  it('an icon change alone is saved', async () => {
    const { result } = await mount([{ date: '2026-10-05', type_id: 'dt_w', note: 'เดิม', note_icon: 'cake' }]);
    await act(async () => { await result.current.app.handleDayNoteChange('2026-10-05', 'เดิม', 'star'); });
    expect(api.calendarService.save).toHaveBeenCalledWith('2026-10-05', 'dt_w', 'เดิม', 'star');
  });

  it('a failure puts the old note back and answers false', async () => {
    const { result } = await mount([{ date: '2026-10-05', type_id: 'dt_w', note: 'เดิม', note_icon: 'cake' }]);
    api.calendarService.save.mockRejectedValue(new Error('x'));
    let ok: unknown;
    await act(async () => { ok = await result.current.app.handleDayNoteChange('2026-10-05', 'ใหม่', 'star'); });
    expect(ok).toBe(false);
    expect(result.current.app.dayNotes['2026-10-05']).toEqual({ text: 'เดิม', icon: 'cake' });
  });

  it('a failed first note removes it again', async () => {
    const { result } = await mount();
    api.calendarService.save.mockRejectedValue(new Error('x'));
    await act(async () => { await result.current.app.handleDayNoteChange('2026-10-05', 'ใหม่', ''); });
    expect(result.current.app.dayNotes['2026-10-05']).toBeUndefined();
  });

  it('no day type at all: refuses', async () => {
    const { result } = await mount();
    act(() => result.current.app.setDayTypeConfig([]));
    let ok: unknown;
    await act(async () => { ok = await result.current.app.handleDayNoteChange('2026-10-05', 'x', ''); });
    expect(ok).toBe(false);
    expect(api.calendarService.save).not.toHaveBeenCalled();
  });
});

describe('day type settings', () => {
  it('config change: optimistic, saved, true', async () => {
    const { result } = await mount();
    let ok: unknown;
    await act(async () => { ok = await result.current.app.handleDayTypeConfigChange('dt_w', 'label', 'งาน'); });
    expect(ok).toBe(true);
    expect(api.dayTypeService.save).toHaveBeenCalledWith({ ...DT[0], label: 'งาน' });
    expect(result.current.app.dayTypeConfig[0].label).toBe('งาน');
  });

  it('config change of an unknown id does nothing and answers false', async () => {
    const { result } = await mount();
    let ok: unknown;
    await act(async () => { ok = await result.current.app.handleDayTypeConfigChange('zzz', 'label', 'x'); });
    expect(ok).toBe(false);
    expect(api.dayTypeService.save).not.toHaveBeenCalled();
  });

  it('config change failure: rolled back, error, false', async () => {
    const { result } = await mount();
    api.dayTypeService.save.mockRejectedValue(new Error('x'));
    let ok: unknown;
    await act(async () => { ok = await result.current.app.handleDayTypeConfigChange('dt_w', 'label', 'งาน'); });
    expect(ok).toBe(false);
    expect(result.current.app.dayTypeConfig[0].label).toBe('ทำงาน');
    expect(result.current.toast).toMatchObject({ type: 'error', message: 'อัปเดตประเภทวันไม่สำเร็จ: x' });
  });

  it('a failed config save rolls back only its own field', async () => {
    const { result } = await mount();
    const first = deferred<unknown>();
    api.dayTypeService.save.mockImplementationOnce(() => first.promise).mockResolvedValue({ success: true });
    let p1!: Promise<unknown>;
    act(() => { p1 = result.current.app.handleDayTypeConfigChange('dt_w', 'label', 'งาน'); });
    await act(async () => { await result.current.app.handleDayTypeConfigChange('dt_w', 'color', '#000000'); });
    await act(async () => { first.reject(new Error('x')); await p1; });
    expect(result.current.app.dayTypeConfig[0]).toMatchObject({ label: 'ทำงาน', color: '#000000' });
  });

  it('add: saved first, then appended with the next order', async () => {
    const { result } = await mount();
    await act(async () => { await result.current.app.handleAddDayType(); });
    const added = { id: 'new-id', label: 'ประเภทวันใหม่', color: '#64748B', name: '', order_index: 4 };
    expect(api.dayTypeService.save).toHaveBeenCalledWith(added);
    expect(result.current.app.dayTypeConfig.at(-1)).toEqual(added);
    expect(result.current.toast).toMatchObject({ type: 'success', message: 'เพิ่มประเภทวันสำเร็จ' });
  });

  it('add failure: nothing appended', async () => {
    const { result } = await mount();
    api.dayTypeService.save.mockRejectedValue(new Error('x'));
    await act(async () => { await result.current.app.handleAddDayType(); });
    expect(result.current.app.dayTypeConfig).toHaveLength(3);
    expect(result.current.toast.message).toBe('ไม่สามารถเพิ่มประเภทวันได้: x');
  });

  it('delete: removed after the server agrees; refusal keeps it', async () => {
    const { result } = await mount();
    await act(async () => { await result.current.app.handleDeleteDayType('dt_o'); });
    expect(result.current.app.dayTypeConfig.map(d => d.id)).toEqual(['dt_w', 'dt_h']);
    expect(result.current.toast.message).toBe('ลบประเภทวันสำเร็จ');
    api.dayTypeService.deleteById.mockRejectedValue(new Error('ใช้อยู่'));
    await act(async () => { await result.current.app.handleDeleteDayType('dt_h'); });
    expect(result.current.app.dayTypeConfig.map(d => d.id)).toEqual(['dt_w', 'dt_h']);
    expect(result.current.toast.message).toBe('ไม่สามารถลบประเภทวันได้: ใช้อยู่');
  });

  it('move: swaps, renumbers 1..n and saves each', async () => {
    const { result } = await mount();
    await act(async () => { await result.current.app.handleMoveDayType('dt_o', 'UP'); });
    expect(result.current.app.dayTypeConfig.map(d => [d.id, d.order_index])).toEqual([['dt_w', 1], ['dt_o', 2], ['dt_h', 3]]);
    expect(api.dayTypeService.save.mock.calls.map(([d]) => d.id)).toEqual(['dt_w', 'dt_o', 'dt_h']);
    await act(async () => { await result.current.app.handleMoveDayType('dt_w', 'DOWN'); });
    expect(result.current.app.dayTypeConfig.map(d => d.id)).toEqual(['dt_o', 'dt_w', 'dt_h']);
  });

  it('move past an end or unknown id: nothing', async () => {
    const { result } = await mount();
    await act(async () => { await result.current.app.handleMoveDayType('dt_w', 'UP'); });
    await act(async () => { await result.current.app.handleMoveDayType('dt_o', 'DOWN'); });
    await act(async () => { await result.current.app.handleMoveDayType('zzz', 'UP'); });
    expect(api.dayTypeService.save).not.toHaveBeenCalled();
  });

  // บันทึกลำดับทีละแถว พังกลางทาง: แถวแรกบันทึกไปแล้ว หน้าจอต้องตรงกับที่อยู่ในฐานข้อมูลจริง
  it('a move that fails half-way shows what the server actually has', async () => {
    const { result } = await mount();
    api.dayTypeService.save.mockResolvedValueOnce({ success: true }).mockRejectedValueOnce(new Error('x'));
    const serverNow = [{ ...DT[0] }, { ...DT[2], order_index: 2 }, { ...DT[1] }];
    api.dayTypeService.getAll.mockResolvedValue(serverNow);
    await act(async () => { await result.current.app.handleMoveDayType('dt_o', 'UP'); });
    expect(result.current.app.dayTypeConfig).toEqual(serverNow);
    expect(result.current.toast.message).toBe('ไม่สามารถบันทึกลำดับได้: x');
  });

  it('a failed move with the server unreachable falls back to the old order', async () => {
    const { result } = await mount();
    api.dayTypeService.save.mockRejectedValue(new Error('x'));
    api.dayTypeService.getAll.mockRejectedValue(new Error('down'));
    await act(async () => { await result.current.app.handleMoveDayType('dt_o', 'UP'); });
    expect(result.current.app.dayTypeConfig.map(d => d.id)).toEqual(['dt_w', 'dt_h', 'dt_o']);
  });
});

describe('cashflow groups', () => {
  it('update: saved, reloaded, toast unless silent', async () => {
    const { result } = await mount();
    api.groupService.getAll.mockClear();
    await act(async () => { await result.current.app.handleUpdateCashflowGroup({ id: 'g1', name: 'x' }); });
    expect(api.groupService.save).toHaveBeenCalledWith({ id: 'g1', name: 'x' });
    expect(api.groupService.getAll).toHaveBeenCalled();
    expect(result.current.toast.message).toBe('อัปเดตกลุ่มสำเร็จ');
    act(() => { /* reset */ });
    await act(async () => { await result.current.app.handleUpdateCashflowGroup({ id: 'g1', name: 'y' }, { silent: true }); });
    expect(api.groupService.save).toHaveBeenLastCalledWith({ id: 'g1', name: 'y' });
  });

  it('a silent update shows no toast', async () => {
    const { result } = await mount();
    await act(async () => { await result.current.app.handleUpdateCashflowGroup({ id: 'g1' }, { silent: true }); });
    expect(result.current.toast.visible).toBe(false);
  });

  it('update failure: error toast and rethrow', async () => {
    const { result } = await mount();
    api.groupService.save.mockRejectedValue(new Error('409'));
    let caught: unknown;
    await act(async () => { await result.current.app.handleUpdateCashflowGroup({ id: 'g1' }).catch(e => { caught = e; }); });
    expect((caught as Error).message).toBe('409');
    expect(result.current.toast.message).toBe('ไม่สามารถอัปเดตกลุ่มได้: 409');
  });

  it('add: a new expense group with the next order', async () => {
    const { result } = await mount();
    await act(async () => { await result.current.app.handleAddCashflowGroup(); });
    expect(api.groupService.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'new-id', name: 'กลุ่มใหม่', type: 'expense', order_index: 4, allocation_type: 'want', icon: 'sparkles',
    }));
    expect(result.current.toast.message).toBe('เพิ่มกลุ่มสำเร็จ');
    api.groupService.save.mockRejectedValue(new Error('x'));
    await act(async () => { await result.current.app.handleAddCashflowGroup(); });
    expect(result.current.toast.message).toBe('ไม่สามารถเพิ่มกลุ่มได้: x');
  });

  it('delete: refused while a category uses it; otherwise deleted', async () => {
    const { result } = await mount();
    await act(async () => { await result.current.app.handleDeleteCashflowGroup('g2'); });
    expect(api.groupService.deleteById).not.toHaveBeenCalled();
    expect(result.current.toast.message).toBe('ไม่สามารถลบได้ มีหมวดหมู่กำลังใช้งานกลุ่มนี้อยู่');
    await act(async () => { await result.current.app.handleDeleteCashflowGroup('g1'); });
    expect(api.groupService.deleteById).toHaveBeenCalledWith('g1');
    expect(result.current.toast.message).toBe('ลบกลุ่มสำเร็จ');
    api.groupService.deleteById.mockRejectedValue(new Error('x'));
    await act(async () => { await result.current.app.handleDeleteCashflowGroup('g3'); });
    expect(result.current.toast.message).toBe('ไม่สามารถลบกลุ่มได้: x');
  });

  it('move: by order, renumbered, saved, reloaded', async () => {
    const { result } = await mount();
    api.groupService.getAll.mockClear();
    await act(async () => { await result.current.app.handleMoveCashflowGroup('g1', 'UP'); }); // order: g2, g1, g3
    expect(api.groupService.save.mock.calls.map(([g]) => [g.id, g.order_index])).toEqual([['g1', 1], ['g2', 2], ['g3', 3]]);
    expect(api.groupService.getAll).toHaveBeenCalled();
    expect(result.current.toast.message).toBe('จัดเรียงลำดับกลุ่มสำเร็จ');
  });

  it('move down, ends and unknown ids', async () => {
    const { result } = await mount();
    await act(async () => { await result.current.app.handleMoveCashflowGroup('g2', 'DOWN'); });
    expect(api.groupService.save.mock.calls.map(([g]) => g.id)).toEqual(['g1', 'g2', 'g3']);
    api.groupService.save.mockClear();
    await act(async () => { await result.current.app.handleMoveCashflowGroup('g2', 'UP'); });
    await act(async () => { await result.current.app.handleMoveCashflowGroup('g3', 'DOWN'); });
    await act(async () => { await result.current.app.handleMoveCashflowGroup('zzz', 'UP'); });
    expect(api.groupService.save).not.toHaveBeenCalled();
  });

  it('move failure: error toast and reload from the server', async () => {
    const { result } = await mount();
    api.groupService.save.mockRejectedValue(new Error('x'));
    api.groupService.getAll.mockClear();
    await act(async () => { await result.current.app.handleMoveCashflowGroup('g1', 'UP'); });
    expect(result.current.toast.message).toBe('ไม่สามารถจัดเรียงลำดับกลุ่มได้: x');
    expect(api.groupService.getAll).toHaveBeenCalled();
    expect(result.current.app.cashflowGroups).toEqual(GROUPS);
  });
});

describe('batch save and category delete', () => {
  it('handleSaveBatch is busy while it saves', async () => {
    const { result } = await mount();
    const save = deferred<unknown>();
    api.transactionService.save.mockImplementationOnce(() => save.promise);
    let p!: Promise<void>;
    act(() => { p = result.current.app.handleSaveBatch([{ id: 'a' }]); });
    expect(result.current.app.isProcessing).toBe(true);
    await act(async () => { save.resolve({ success: true }); await p; });
    expect(result.current.app.isProcessing).toBe(false);
  });

  it('handleSaveBatch: saves, refreshes, toasts, clears busy', async () => {
    const { result } = await mount();
    await act(async () => { await result.current.app.handleSaveBatch([{ id: 'a' }, { id: 'b' }]); });
    expect(api.transactionService.save).toHaveBeenCalledWith([{ id: 'a' }, { id: 'b' }]);
    expect(result.current.toast.message).toBe('ทำรายการสำเร็จ!');
    expect(result.current.app.isProcessing).toBe(false);
  });

  it('handleSaveBatch failure rethrows (the modal keeps the cart)', async () => {
    const { result } = await mount();
    api.transactionService.save.mockRejectedValue(new Error('bad'));
    let caught: unknown;
    await act(async () => { await result.current.app.handleSaveBatch([{ id: 'a' }]).catch(e => { caught = e; }); });
    expect((caught as Error).message).toBe('bad');
    expect(result.current.app.isProcessing).toBe(false);
  });

  it('handleDeleteCategory checks the loaded rows', async () => {
    api.transactionService.getAll.mockResolvedValue([{ id: 't', date: '2026-10-01', category_id: 'c1', category: 'ข้าว', amount: 1 }]);
    const { result } = await mount();
    await act(async () => { await result.current.app.loadPeriodData('2026-10'); });
    await act(async () => { await result.current.app.handleDeleteCategory('c1'); });
    expect(api.categoryService.deleteById).not.toHaveBeenCalled();
  });

  it('handleCategoryChange passes through', async () => {
    api.categoryService.save.mockResolvedValue({ success: true });
    const { result } = await mount();
    await act(async () => { await result.current.app.handleCategoryChange('c1', 'name', 'ข้าวผัด'); });
    expect(api.categoryService.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1', name: 'ข้าวผัด' }));
  });
});
