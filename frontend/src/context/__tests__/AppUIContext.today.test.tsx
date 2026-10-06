// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { renderHook, act } from '@/test-utils/renderHook';
import { AppUIProvider, useAppUI } from '../AppUIContext';

// frontend tsconfig has no Node types; vitest runs in Node so process exists
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;
const TZ = env.TZ;
afterEach(() => {
  vi.useRealTimers();
  if (TZ === undefined) delete env.TZ; else env.TZ = TZ; // assigning undefined would store the string "undefined"
});

describe('AppUIContext default date', () => {
  it('uses the local day, not the UTC day (01:30 in Bangkok is still yesterday in UTC)', () => {
    env.TZ = 'Asia/Bangkok';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-06T18:30:00Z')); // = 2026-10-07 01:30 local

    const wrapper = ({ children }: { children: React.ReactNode }) => <AppUIProvider>{children}</AppUIProvider>;
    const { result, unmount } = renderHook(() => useAppUI(), wrapper);
    expect(result.current.addForm.date).toBe('2026-10-07');

    act(() => result.current.handleOpenTradeModal('a1', 'buy'));
    expect(result.current.addForm.date).toBe('2026-10-07');
    unmount();
  });
});
