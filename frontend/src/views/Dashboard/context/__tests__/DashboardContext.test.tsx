// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { DashboardProvider, useDashboardContext, type DashboardContextValue } from '../DashboardContext';
import { renderHook } from '@/test-utils/renderHook';

describe('DashboardContext', () => {
  it('hands the provided value to every dashboard component', () => {
    const value = { filterPeriod: '2026-10' } as DashboardContextValue;
    const { result, unmount } = renderHook(useDashboardContext, ({ children }) => <DashboardProvider value={value}>{children}</DashboardProvider>);
    expect(result.current).toBe(value);
    unmount();
  });

  it('fails loudly when a dashboard component is mounted outside the provider', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(useDashboardContext)).toThrow('useDashboardContext must be used within a DashboardProvider');
    quiet.mockRestore();
  });
});
