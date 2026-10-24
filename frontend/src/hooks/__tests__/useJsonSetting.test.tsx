// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, flush, act } from '@/test-utils/renderHook';

const api = vi.hoisted(() => ({ getAll: vi.fn(), save: vi.fn() }));
vi.mock('@/services/api', () => ({ settingsService: api }));

const parse = (raw: unknown) => (Array.isArray(raw) ? (raw as string[]) : []);

beforeEach(() => {
  api.getAll.mockReset();
  api.save.mockReset().mockResolvedValue({ success: true });
  vi.resetModules(); // useJsonSetting keeps `lastKnown` at module level
});

describe('useJsonSetting', () => {
  it('a failed first load never lets a save overwrite the stored value with the empty default', async () => {
    api.getAll.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ k: ['a', 'b'] });
    const { default: useJsonSetting } = await import('../useJsonSetting');
    const { result } = renderHook(() => useJsonSetting('k', parse));
    await flush();
    expect(result.current[2]).toBe(true); // the page may draw (read-only defaults)

    let ok = false;
    await act(async () => { ok = await result.current[1]((cur) => [...cur, 'c']); });
    expect(ok).toBe(true);
    expect(api.save).toHaveBeenCalledWith('k', ['a', 'b', 'c']); // built on the reloaded value
  });

  it('reports false and saves nothing while the server is still unreachable', async () => {
    api.getAll.mockRejectedValue(new Error('offline'));
    const { default: useJsonSetting } = await import('../useJsonSetting');
    const { result } = renderHook(() => useJsonSetting('k', parse));
    await flush();

    let ok = true;
    await act(async () => { ok = await result.current[1](() => ['x']); });
    expect(ok).toBe(false);
    expect(api.save).not.toHaveBeenCalled();
    expect(result.current[0]).toEqual([]);
  });

  it('hooks mounted together share one settings request', async () => {
    api.getAll.mockResolvedValue({ a: ['1'], b: ['2'] });
    const { default: useJsonSetting } = await import('../useJsonSetting');
    const { default: useBudgets } = await import('../useBudgets');
    const { result } = renderHook(() => ({ a: useJsonSetting('a', parse), b: useJsonSetting('b', parse), budgets: useBudgets() }));
    await flush();
    expect(api.getAll).toHaveBeenCalledTimes(1);
    expect(result.current.a[0]).toEqual(['1']);
    expect(result.current.b[0]).toEqual(['2']);
    expect(result.current.budgets.ready).toBe(true);
  });
});
