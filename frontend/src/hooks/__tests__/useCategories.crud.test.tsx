// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, flush, act } from '@/test-utils/renderHook';
import useCategories from '../useCategories';
import type { Category } from '@/types';

const api = vi.hoisted(() => ({
  categoryService: { getAll: vi.fn(), save: vi.fn(), deleteById: vi.fn() },
  groupService: { getAll: vi.fn() },
}));
vi.mock('../../services/api', () => api);
const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock('../../context/ToastContext', () => ({ useToast: () => toast }));

const c = (id: string, over: Partial<Category> = {}): Category =>
  ({ id, name: id, icon: 'tag', color: '#111111', type: 'expense', cashflowGroup: 'g_exp', order_index: 1, ...over });

const GROUPS = [
  { id: 'g_inc', type: 'income' },
  { id: 'g_exp', type: 'expense' },
  { id: 'g_sav', type: 'savings' },
];
const deferred = <T,>() => {
  let resolve!: (v: T) => void, reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

beforeEach(() => {
  Object.values(api).forEach(svc => Object.values(svc).forEach(fn => (fn as ReturnType<typeof vi.fn>).mockReset()));
  api.categoryService.getAll.mockResolvedValue([]);
  api.categoryService.save.mockResolvedValue({ success: true });
  api.categoryService.deleteById.mockResolvedValue({ success: true });
  api.groupService.getAll.mockResolvedValue(GROUPS);
  toast.showToast.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('new-id' as `${string}-${string}-${string}-${string}-${string}`);
});

describe('loadCategories / loadGroups', () => {
  it('maps the API rows (group id, group type, order 0 when missing)', async () => {
    api.categoryService.getAll.mockResolvedValue([
      { id: 'a', name: 'ก', icon: 'x', color: '#1', cashflow_group_id: 'g1', group_type: 'savings', allocation_type: 'savings', order_index: 4 },
      { id: 'b', name: 'ข', icon: 'y', color: '#2', cashflow_group_id: 'g2', group_type: 'expense', allocation_type: 'want', order_index: null },
    ]);
    const { result } = renderHook(() => useCategories([]));
    await act(async () => { await result.current.loadCategories(); });
    expect(result.current.categories).toEqual([
      { id: 'a', name: 'ก', icon: 'x', color: '#1', cashflowGroup: 'g1', type: 'savings', allocation_type: 'savings', order_index: 4 },
      { id: 'b', name: 'ข', icon: 'y', color: '#2', cashflowGroup: 'g2', type: 'expense', allocation_type: 'want', order_index: 0 },
    ]);
  });

  it('a failed reload keeps the list', async () => {
    api.categoryService.getAll.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useCategories([c('a')]));
    await act(async () => { await result.current.loadCategories(); });
    expect(result.current.categories.map(x => x.id)).toEqual(['a']);
  });

  it('loadGroups hands the groups to the setter; failures are logged', async () => {
    const set = vi.fn();
    const { result } = renderHook(() => useCategories([], set));
    await act(async () => { await result.current.loadGroups(); });
    expect(set).toHaveBeenCalledWith(GROUPS);
    api.groupService.getAll.mockRejectedValue(new Error('x'));
    await act(async () => { await result.current.loadGroups(); });
    expect(set).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith('Failed to reload groups:', expect.any(Error));
  });

  it('loadGroups without a setter does nothing', async () => {
    const { result } = renderHook(() => useCategories([]));
    await act(async () => { await result.current.loadGroups(); });
    expect(api.groupService.getAll).toHaveBeenCalled();
  });
});

describe('handleCategoryChange', () => {
  it('shows the change at once and saves the backend shape', async () => {
    const { result } = renderHook(() => useCategories([c('a', { cashflowGroup: undefined, cashflow_group_id: 'g_raw' })]));
    let ok: unknown;
    await act(async () => { ok = await result.current.handleCategoryChange('a', 'name', 'ใหม่'); });
    expect(ok).toBe(true);
    expect(result.current.categories[0].name).toBe('ใหม่');
    expect(api.categoryService.save).toHaveBeenCalledWith({
      id: 'a', name: 'ใหม่', icon: 'tag', color: '#111111', cashflow_group_id: 'g_raw', order_index: 1,
    });
  });

  it('a blank name is shown but not saved', async () => {
    const { result } = renderHook(() => useCategories([c('a')]));
    let ok: unknown;
    await act(async () => { ok = await result.current.handleCategoryChange('a', 'name', '   '); });
    expect(ok).toBe(true);
    expect(api.categoryService.save).not.toHaveBeenCalled();
  });

  it('an unknown id changes nothing', async () => {
    const { result } = renderHook(() => useCategories([c('a')]));
    let ok: unknown;
    await act(async () => { ok = await result.current.handleCategoryChange('zzz', 'name', 'x'); });
    expect(ok).toBeUndefined();
    expect(api.categoryService.save).not.toHaveBeenCalled();
    expect(result.current.categories[0].name).toBe('a');
  });

  it('a failed save puts the value back, shows an error and answers false', async () => {
    api.categoryService.save.mockRejectedValue(new Error('409 ซ้ำ'));
    const { result } = renderHook(() => useCategories([c('a', { name: 'เดิม' })]));
    let ok: unknown;
    await act(async () => { ok = await result.current.handleCategoryChange('a', 'name', 'ใหม่'); });
    expect(ok).toBe(false);
    expect(result.current.categories[0].name).toBe('เดิม');
    expect(toast.showToast).toHaveBeenCalledWith('ไม่สามารถบันทึกหมวดหมู่ได้: 409 ซ้ำ', 'error');
  });

  it('an error without a message still says why', async () => {
    api.categoryService.save.mockRejectedValue(undefined);
    const { result } = renderHook(() => useCategories([c('a')]));
    await act(async () => { await result.current.handleCategoryChange('a', 'icon', 'x'); });
    expect(toast.showToast).toHaveBeenCalledWith('ไม่สามารถบันทึกหมวดหมู่ได้: ข้อผิดพลาด', 'error');
  });

  // แก้ชื่อ (ยังรอผล) แล้วเปลี่ยนไอคอนต่อทันที: ชื่อบันทึกไม่ผ่าน ต้องย้อนแค่ชื่อ ไอคอนใหม่ที่บันทึกแล้วต้องอยู่
  it('a failed save rolls back only its own field, not a newer edit of another field', async () => {
    const first = deferred<unknown>();
    api.categoryService.save.mockImplementationOnce(() => first.promise).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useCategories([c('a', { name: 'เดิม', icon: 'tag' })]));
    let p1!: Promise<unknown>;
    act(() => { p1 = result.current.handleCategoryChange('a', 'name', 'ใหม่'); });
    await act(async () => { await result.current.handleCategoryChange('a', 'icon', 'star'); });
    await act(async () => { first.reject(new Error('x')); await p1; });
    expect(result.current.categories[0]).toMatchObject({ name: 'เดิม', icon: 'star' });
  });

  it('a failed save does not undo a newer value of the same field', async () => {
    const first = deferred<unknown>();
    api.categoryService.save.mockImplementationOnce(() => first.promise).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useCategories([c('a', { name: 'เดิม' })]));
    let p1!: Promise<unknown>;
    act(() => { p1 = result.current.handleCategoryChange('a', 'name', 'ร่าง'); });
    await act(async () => { await result.current.handleCategoryChange('a', 'name', 'สุดท้าย'); });
    await act(async () => { first.reject(new Error('x')); await p1; });
    expect(result.current.categories[0].name).toBe('สุดท้าย');
  });
});

describe('handleAddCategory', () => {
  it.each([
    ['income', 'g_inc', 'รายรับใหม่', 'coins', '#10B981'],
    ['expense', 'g_exp', 'หมวดหมู่ใหม่', 'tag', '#64748B'],
    ['savings', 'g_sav', 'สินทรัพย์ลงทุนใหม่', 'piggy-bank', '#10B981'],
  ])('%s goes into a group of its own type with its defaults', async (type, group, name, icon, color) => {
    const { result } = renderHook(() => useCategories([
      c('x1', { type: type as Category['type'], order_index: 4 }), c('x2', { type: type as Category['type'], order_index: undefined }),
      c('other', { type: type === 'income' ? 'expense' : 'income', order_index: 50 }),
    ]));
    let id: unknown;
    await act(async () => { id = await result.current.handleAddCategory(type); });
    expect(id).toBe('new-id');
    expect(api.categoryService.save).toHaveBeenCalledWith({ id: 'new-id', name, icon, color, cashflow_group_id: group, order_index: 5 });
    expect(api.categoryService.getAll).toHaveBeenCalled();
    expect(toast.showToast).toHaveBeenCalledWith('เพิ่มหมวดหมู่สำเร็จ', 'success');
  });

  it('the first category of a type gets order 1', async () => {
    const { result } = renderHook(() => useCategories([]));
    await act(async () => { await result.current.handleAddCategory('expense'); });
    expect(api.categoryService.save).toHaveBeenCalledWith(expect.objectContaining({ order_index: 1 }));
  });

  // ไม่มีกลุ่มรายรับ: ต้องไม่สร้าง "รายรับใหม่" ลงกลุ่มรายจ่าย (หมวดจะกลายเป็นรายจ่ายไปเงียบๆ)
  it.each([
    ['income', [{ id: 'g_exp', type: 'expense' }], 'กรุณาสร้างกลุ่มชนิด "รายรับ" ก่อนเพิ่มหมวดหมู่'],
    ['expense', [{ id: 'g_inc', type: 'income' }], 'กรุณาสร้างกลุ่มชนิด "รายจ่าย" ก่อนเพิ่มหมวดหมู่'],
    ['savings', [{ id: 'g_exp', type: 'expense' }], 'กรุณาสร้างกลุ่มชนิด "ลงทุน/ออม" ก่อนเพิ่มหมวดหมู่'],
  ])('no %s group: refuses instead of using a group of another type', async (type, groups, msg) => {
    api.groupService.getAll.mockResolvedValue(groups);
    const { result } = renderHook(() => useCategories([]));
    let id: unknown = 'unset';
    await act(async () => { id = await result.current.handleAddCategory(type); });
    expect(id).toBeUndefined();
    expect(api.categoryService.save).not.toHaveBeenCalled();
    expect(toast.showToast).toHaveBeenCalledWith(msg, 'error');
  });

  it('no groups at all', async () => {
    api.groupService.getAll.mockResolvedValue([]);
    const { result } = renderHook(() => useCategories([]));
    await act(async () => { await result.current.handleAddCategory('expense'); });
    expect(api.categoryService.save).not.toHaveBeenCalled();
  });

  it('a failed save shows the error', async () => {
    api.categoryService.save.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useCategories([]));
    let id: unknown = 'unset';
    await act(async () => { id = await result.current.handleAddCategory('expense'); });
    expect(id).toBeUndefined();
    expect(toast.showToast).toHaveBeenCalledWith('ไม่สามารถเพิ่มหมวดหมู่ได้: x', 'error');
  });
});

describe('handleDeleteCategory', () => {
  it('unknown id: nothing', async () => {
    const { result } = renderHook(() => useCategories([c('a')]));
    await act(async () => { await result.current.handleDeleteCategory('zzz', []); });
    expect(api.categoryService.deleteById).not.toHaveBeenCalled();
  });

  it('a loaded row using it by name also blocks the delete', async () => {
    const { result } = renderHook(() => useCategories([c('a', { name: 'อาหาร' })]));
    await act(async () => { await result.current.handleDeleteCategory('a', [{ category: 'อาหาร' }]); });
    expect(api.categoryService.deleteById).not.toHaveBeenCalled();
  });

  it('unused: deleted, list reloaded, success toast', async () => {
    const { result } = renderHook(() => useCategories([c('a')]));
    await act(async () => { await result.current.handleDeleteCategory('a', [{ category_id: 'b', category: 'b' }]); });
    expect(api.categoryService.deleteById).toHaveBeenCalledWith('a');
    expect(api.categoryService.getAll).toHaveBeenCalled();
    expect(toast.showToast).toHaveBeenCalledWith('ลบหมวดหมู่สำเร็จ', 'success');
  });
});

describe('handleMoveCategory', () => {
  const list = () => [
    c('e1', { order_index: 1 }), c('e2', { order_index: 2 }), c('e3', { order_index: 2 }),
    c('i1', { type: 'income', order_index: 1 }),
  ];
  const saved = () => api.categoryService.save.mock.calls.map(([x]) => [x.id, x.order_index]);

  it('swaps within its own type and renumbers 1..n, saving only rows that changed', async () => {
    const { result } = renderHook(() => useCategories(list()));
    await act(async () => { await result.current.handleMoveCategory('e3', 'UP'); });
    expect(saved()).toEqual([['e2', 3]]); // e3 already had 2 (a duplicate), so it is not re-saved
    expect(api.categoryService.getAll).toHaveBeenCalled();
  });

  it('down works, lower-case direction too', async () => {
    const { result } = renderHook(() => useCategories(list()));
    await act(async () => { await result.current.handleMoveCategory('e1', 'down'); });
    expect(saved()).toEqual([['e2', 1], ['e1', 2], ['e3', 3]]);
  });

  it('cannot move past either end, or an unknown id', async () => {
    const { result } = renderHook(() => useCategories(list()));
    await act(async () => { await result.current.handleMoveCategory('e1', 'UP'); });
    await act(async () => { await result.current.handleMoveCategory('e3', 'DOWN'); });
    await act(async () => { await result.current.handleMoveCategory('i1', 'DOWN'); });
    await act(async () => { await result.current.handleMoveCategory('zzz', 'UP'); });
    await act(async () => { await result.current.handleMoveCategory('e2', 'SIDEWAYS'); });
    expect(api.categoryService.save).not.toHaveBeenCalled();
  });

  it('missing order counts as 0', async () => {
    const { result } = renderHook(() => useCategories([c('a', { order_index: 5 }), c('b', { order_index: undefined })]));
    await act(async () => { await result.current.handleMoveCategory('a', 'UP'); });
    expect(saved()).toEqual([['a', 1], ['b', 2]]);
  });

  it('a failed save shows an error and does not reload', async () => {
    api.categoryService.save.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useCategories(list()));
    await act(async () => { await result.current.handleMoveCategory('e2', 'DOWN'); });
    expect(toast.showToast).toHaveBeenCalledWith('ไม่สามารถเปลี่ยนลำดับหมวดหมู่ได้: x', 'error');
    expect(api.categoryService.getAll).not.toHaveBeenCalled();
    await flush();
  });
});
