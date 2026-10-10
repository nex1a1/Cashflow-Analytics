// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { flushAll, click } from '@/test-utils/dom';
import App from '../App';

// The whole provider stack and every view, for real. Only the network and the canvas charts are replaced, so a provider
// in the wrong order (a hook used outside its provider throws) or a view that crashes on an empty database fails here.
const { DATA, ok } = vi.hoisted(() => {
const DATA = {
  groups: [
    { id: 'g-inc', name: 'รายรับ', type: 'income', allocation_type: null, order_index: 1 },
    { id: 'g-exp', name: 'ค่ากิน', type: 'expense', allocation_type: 'need', order_index: 2 },
  ],
  categories: [
    { id: 'c-sal', name: 'เงินเดือน', group_type: 'income', allocation_type: null, cashflow_group_id: 'g-inc', order_index: 1 }, // the API's shape
    { id: 'c-food', name: 'อาหาร', group_type: 'expense', allocation_type: 'need', cashflow_group_id: 'g-exp', order_index: 2 },
  ],
  dayTypes: [
    { id: 'dt-w', name: 'workday', label: 'ทำงาน', color: '#10B981', order_index: 1 },
    { id: 'dt-h', name: 'holiday', label: 'วันหยุด', color: '#9CA3AF', order_index: 2 },
  ],
  tx: [
    { id: 't1', date: '2026-10-01', category: 'เงินเดือน', category_id: 'c-sal', description: 'เงินเดือน', amount: 30000, group_type: 'income' },
    { id: 't2', date: '2026-10-02', category: 'อาหาร', category_id: 'c-food', description: 'ข้าว', amount: 60, allocation_type: 'need', group_type: 'expense' },
  ],
};
const ok = <T,>(v: T) => () => Promise.resolve(v);
return { DATA, ok };
});
vi.mock('@/services/api', () => ({
  transactionService: {
    getAll: ok(DATA.tx), getCount: ok({ count: 2 }), getPeriods: ok(['2026-10']), getFrequentItems: ok([]),
    save: ok({ success: true, count: 1 }), deleteById: ok({ success: true }), deleteMonth: ok({ success: true }),
    resetAll: ok({ success: true }), search: ok([]),
  },
  analyticsService: { getDashboardData: () => Promise.reject(new Error('offline')) }, // the dashboard falls back to its own maths
  calendarService: { getAll: ok([]), save: ok({ success: true }) },
  dayTypeService: { getAll: ok(DATA.dayTypes), save: ok({ success: true }), deleteById: ok({ success: true }) },
  settingsService: { getAll: ok({ portfolio_enabled: true, tax_enabled: true }), save: ok({ success: true }) },
  categoryService: { getAll: ok(DATA.categories), save: ok({ success: true }), deleteById: ok({ success: true }) },
  groupService: { getAll: ok(DATA.groups), save: ok({ success: true }), deleteById: ok({ success: true }) },
  portfolioService: {
    get: ok({ assets: [], totals: { cost: 0, marketValue: 0, unrealized: 0, realized: 0, bought: 0, unpricedCount: 0, unpricedCost: 0, oldestPriceAt: null }, generalSavings: 0, history: [] }),
    refreshPrices: ok({ results: [] }), saveAsset: ok({ success: true, id: 'a' }), deleteAsset: ok({ success: true }),
    setManualPrice: ok({ success: true }), previewPrice: ok({}),
  },
}));
vi.mock('react-chartjs-2', async () => {
  const React = await import('react');
  const stub = (name: string) => () => React.createElement('canvas', { 'data-chart': name });
  return { Chart: stub('chart'), Line: stub('line'), Bar: stub('bar'), Doughnut: stub('doughnut') };
});

let root: Root | null = null;
let host: HTMLDivElement | null = null;

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as any;
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any;
  HTMLCanvasElement.prototype.getContext = (() => null) as any;
});
afterEach(() => { act(() => root?.unmount()); host?.remove(); localStorage.clear(); });

const tab = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(b => b.querySelector(':scope > span')?.textContent === label);

describe('App (smoke)', () => {
  it('boots with the real providers, shows the data and every tab opens without crashing', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root!.render(<App />));
    await flushAll();
    await flushAll();

    expect(document.body.textContent).toContain('ทั้งหมด');
    // what each tab must show from the mocked database
    const expected: Record<string, string> = {
      'ภาพรวม': '30,000.00', 'ปฏิทิน': 'ตุลาคม', 'ฐานข้อมูลบัญชี': '+฿30,000.00', 'พอร์ตลงทุน': 'พอร์ต', 'ตั้งค่าระบบ': 'ค่ากิน',
    };
    for (const [label, text] of Object.entries(expected)) {
      const t = tab(label);
      expect(t, label).toBeTruthy();
      click(t);
      await flushAll();
      expect(host.textContent, label).toContain(text);
    }
    // nothing threw inside React (an error boundary-less crash would blank the tree and log "The above error occurred")
    expect(errors.mock.calls.map(c => String(c[0])).filter(m => /above error|Uncaught|not wrapped|outside/i.test(m))).toEqual([]);
    errors.mockRestore();
  });
});
