// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, flush, act } from '@/test-utils/renderHook';
import useCategories from '../useCategories';

const api = vi.hoisted(() => ({
  categoryService: { getAll: vi.fn(), save: vi.fn(), deleteById: vi.fn() },
  groupService: { getAll: vi.fn() },
}));
vi.mock('../../services/api', () => api);
const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock('../../context/ToastContext', () => ({ useToast: () => toast }));

const cat = { id: 'c1', name: 'ประกอบคอม', type: 'expense', cashflowGroup: 'g1' } as any;

beforeEach(() => {
  api.categoryService.getAll.mockReset().mockResolvedValue([]);
  api.categoryService.deleteById.mockReset();
  toast.showToast.mockReset();
});

describe('useCategories.handleDeleteCategory', () => {
  it('shows the reason the server gave when it refuses (a category still holding history outside the loaded period)', async () => {
    api.categoryService.deleteById.mockRejectedValue(new Error('ลบไม่ได้: หมวดนี้ยังมี 11 รายการ ลบหรือย้ายรายการเหล่านั้นไปหมวดอื่นก่อน'));
    const { result } = renderHook(() => useCategories([cat]));
    await act(async () => { await result.current.handleDeleteCategory('c1', []); }); // [] = nothing loaded for the current period
    await flush();

    expect(api.categoryService.deleteById).toHaveBeenCalledWith('c1');
    const [message, type] = toast.showToast.mock.calls[0];
    expect(type).toBe('error');
    expect(message).toContain('ยังมี 11 รายการ');
    expect(api.categoryService.getAll).not.toHaveBeenCalled(); // list not reloaded: nothing was deleted
  });

  it('still refuses locally, without calling the server, when the loaded rows already use the category', async () => {
    const { result } = renderHook(() => useCategories([cat]));
    await act(async () => { await result.current.handleDeleteCategory('c1', [{ category_id: 'c1' }]); });
    expect(api.categoryService.deleteById).not.toHaveBeenCalled();
    expect(toast.showToast).toHaveBeenCalledWith(expect.stringContaining('ลบไม่ได้'), 'error');
  });
});
