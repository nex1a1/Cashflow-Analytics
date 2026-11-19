// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MainChartToolbar } from '../MainChartToolbar';
import { ToolbarToggleSwitch, ToolbarViewModes, ToolbarAllocationSelector, ToolbarLineStyleSelector } from '../MainChartToolbarControls';
import { click, byText } from '@/test-utils/dom';

const h = vi.hoisted(() => ({ ctx: {} as Record<string, unknown> }));
vi.mock('@/views/Dashboard/context/DashboardContext', () => ({ useDashboardContext: () => h.ctx }));

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = (el: React.ReactElement) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(el));
};
const btn = (text: string) => byText('button', text) as HTMLButtonElement;
const text = () => container!.textContent!;

const f = {
  setIsBreakdown: vi.fn(), setIsLogScale: vi.fn(), setHideFixedExpenses: vi.fn(), setHideWantExpenses: vi.fn(),
  setIsSmoothLine: vi.fn(), setSankeyMode: vi.fn(), setSankeySortMode: vi.fn(), setShowCatMenu: vi.fn(), setDashboardCategory: vi.fn(),
};
const toolbar = (over: Record<string, unknown> = {}) => mount(
  <MainChartToolbar
    chartViewType="bar" mainChartType="bar" showSkeleton={false} isBreakdown={false}
    isLogScale={false} hideFixedExpenses={false} hideWantExpenses={false} isSmoothLine={false}
    sankeyMode="standard" sankeySortMode="value" showCatMenu={false}
    filterMenuRef={React.createRef<HTMLDivElement>()} dashboardCategory={['ALL']}
    categories={[]} categoriesWithData={new Set()}
    {...f} {...over}
  />,
);

beforeEach(() => { h.ctx = { filterPeriod: '2026-01' }; Object.values(f).forEach(fn => fn.mockClear()); });
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

describe('MainChartToolbar — which controls the view gets', () => {

  it('Sankey: its own controls instead (no breakdown, no display options)', () => {
    toolbar({ chartViewType: 'sankey' });
    expect(text()).toContain('แผนภาพกระแสเงิน');
    expect(byText('button', 'เรียงตามยอดเงิน')).toBeTruthy();
    expect(byText('button', 'แจกแจง')).toBeNull();
    expect(byText('button', 'ตัวเลือกแสดงผล')).toBeNull();
  });

});

describe('ToolbarViewModes (breakdown switch)', () => {
  it('flips the breakdown from whatever it currently is', () => {
    const set = vi.fn();
    mount(<ToolbarViewModes isBreakdown={false} setIsBreakdown={set} />);
    click(btn('แจกแจง'));
    const updater = set.mock.calls[0][0] as (prev: boolean) => boolean;
    expect(updater(false)).toBe(true);
    expect(updater(true)).toBe(false);
  });

});

