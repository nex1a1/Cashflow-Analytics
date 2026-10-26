// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@/test-utils/renderHook';
import useToday from '../useToday';

afterEach(() => { vi.useRealTimers(); });

describe('useToday', () => {
  it('is the local date, read again on every render', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 25, 10, 0));
    const { result, unmount } = renderHook(() => useToday());
    expect(result.current).toBe('2026-10-25');
    unmount();
    vi.setSystemTime(new Date(2026, 0, 3, 0, 5)); // 00:05 local: the local date, whatever the UTC date is
    const again = renderHook(() => useToday());
    expect(again.result.current).toBe('2026-01-03');
    again.unmount();
  });

  it('re-renders by itself at midnight, and again the midnight after', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(new Date(2026, 9, 25, 23, 59, 30));
    const { result, unmount } = renderHook(() => useToday());
    expect(result.current).toBe('2026-10-25');

    act(() => { vi.advanceTimersByTime(29_000); });
    expect(result.current).toBe('2026-10-25'); // not yet

    act(() => { vi.advanceTimersByTime(2_000); });
    expect(result.current).toBe('2026-10-26');

    act(() => { vi.advanceTimersByTime(24 * 60 * 60 * 1000); });
    expect(result.current).toBe('2026-10-27');
    unmount();
  });

  it('keeps one pending timer while mounted and none after unmount', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(new Date(2026, 9, 25, 12, 0));
    const { unmount } = renderHook(() => useToday());
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
