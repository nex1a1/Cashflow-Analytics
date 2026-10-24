// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import KakeiboView from '../index';
import { flush, q } from '@/test-utils/dom';

// Cold boot: the settings request (Fix Cost picks, budgets) is still in flight. The view must not draw the
// tables yet — otherwise picked rows sit in NEED first and jump into Fix Cost when the settings arrive.
// Own file because useJsonSetting / useBudgets remember the last value per module, which would skip the wait.
const h = vi.hoisted(() => ({ pending: [] as Array<(s: Record<string, unknown>) => void> }));
vi.mock('@/context/AppDataContext', () => ({
  useAppData: () => ({
    transactions: [{ id: 't1', date: '2026-10-05', category_id: 'c-inc', category: 'c-inc', description: '', amount: 1000, group_type: 'income', allocation_type: null }],
    categories: [{ id: 'c-inc', name: 'เงินเดือน', type: 'income', order_index: 1, cashflow_group_id: 'g-inc' }],
    cashflowGroups: [{ id: 'g-inc', name: 'เงินเดือน', type: 'income', allocation_type: null, order_index: 1 }],
  }),
}));
vi.mock('@/context/AppFilterContext', () => ({ useAppFilter: () => ({ filterPeriod: '2026-10', setFilterPeriod: () => {}, getFilterLabel: (p: string) => p }) }));
vi.mock('@/services/api', () => ({
  settingsService: { getAll: () => new Promise((res) => { h.pending.push(res as (s: Record<string, unknown>) => void); }), save: () => Promise.resolve() },
}));
vi.mock('react-chartjs-2', () => ({ Doughnut: () => null }));

let root: Root | null = null;
let container: HTMLElement | null = null;
afterEach(() => { act(() => root?.unmount()); container?.remove(); root = null; container = null; });

describe('KakeiboView cold boot', () => {
  it('shows the skeleton until the settings arrive, then the real page', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(<KakeiboView />));
    await flush();
    expect(q('[role="status"][aria-busy="true"]')).not.toBeNull();
    expect(q('section[aria-label="Kakeibo"]')).toBeNull();

    await act(async () => { h.pending.forEach((r) => r({})); });
    await flush(); await flush();
    expect(q('[aria-busy="true"]')).toBeNull();
    expect(q('section[aria-label="Kakeibo"]')).not.toBeNull();
  });
});
