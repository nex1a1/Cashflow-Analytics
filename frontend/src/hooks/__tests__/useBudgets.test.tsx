// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, flush, act } from '@/test-utils/renderHook';

const api = vi.hoisted(() => ({ getAll: vi.fn(), save: vi.fn() }));
vi.mock('@/services/api', () => ({ settingsService: api }));

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
};

beforeEach(() => {
  api.getAll.mockReset();
  api.save.mockReset().mockResolvedValue({ success: true });
  vi.resetModules(); // useBudgets keeps `lastKnown` at module level
});

describe('useBudgets', () => {
  it('saving before the first load finishes keeps the other groups budgets (all budgets are one setting)', async () => {
    const load = deferred<Record<string, unknown>>();
    api.getAll.mockReturnValue(load.promise);
    const { default: useBudgets } = await import('../useBudgets');
    const { result } = renderHook(() => useBudgets());

    let saved!: Promise<boolean>;
    act(() => { saved = result.current.setBudget('g3', 300); }); // the user is quicker than the request
    load.resolve({ group_budgets: { g1: 10000, g2: 20000 } });
    await act(async () => { await saved; });
    await flush();

    expect(api.save).toHaveBeenCalledTimes(1);
    expect(api.save).toHaveBeenCalledWith('group_budgets', { g1: 10000, g2: 20000, g3: 30000 });
    expect(result.current.budgets).toEqual({ g1: 10000, g2: 20000, g3: 30000 });
  });

  it('rolls back and reports false when saving fails', async () => {
    api.getAll.mockResolvedValue({ group_budgets: { g1: 10000 } });
    api.save.mockRejectedValue(new Error('offline'));
    const { default: useBudgets } = await import('../useBudgets');
    const { result } = renderHook(() => useBudgets());
    await flush();

    let ok = true;
    await act(async () => { ok = await result.current.setBudget('g1', 500); });
    expect(ok).toBe(false);
    expect(result.current.budgets).toEqual({ g1: 10000 });
  });

  it('a blank amount removes that group only', async () => {
    api.getAll.mockResolvedValue({ group_budgets: { g1: 10000, g2: 20000 } });
    const { default: useBudgets } = await import('../useBudgets');
    const { result } = renderHook(() => useBudgets());
    await flush();

    await act(async () => { await result.current.setBudget('g1', null); });
    expect(api.save).toHaveBeenCalledWith('group_budgets', { g2: 20000 });
  });
});
