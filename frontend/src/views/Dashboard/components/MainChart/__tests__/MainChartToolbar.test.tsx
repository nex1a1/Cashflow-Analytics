// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MainChartToolbar } from '../MainChartToolbar';
import { ToolbarToggleSwitch, ToolbarViewModes, ToolbarAllocationSelector, ToolbarLineStyleSelector } from '../MainChartToolbarControls';
import { click, byText, q } from '@/test-utils/dom';

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
  it('bar / line: breakdown switch and the display-options menu', () => {
    toolbar();
    expect(text()).toContain('มุมมอง');
    expect(btn('แจกแจง')).toBeTruthy();
    expect(btn('ตัวเลือกแสดงผล')).toBeTruthy();
    expect(text()).not.toContain('แผนภาพกระแสเงิน');
  });

  it('Sankey: its own controls instead (no breakdown, no display options)', () => {
    toolbar({ chartViewType: 'sankey' });
    expect(text()).toContain('แผนภาพกระแสเงิน');
    expect(byText('button', 'เรียงตามยอดเงิน')).toBeTruthy();
    expect(byText('button', 'แจกแจง')).toBeNull();
    expect(byText('button', 'ตัวเลือกแสดงผล')).toBeNull();
  });

  it('Sparkline: only a one-line explanation of how to read it', () => {
    toolbar({ chartViewType: 'multiples' });
    expect(text()).toContain('CATEGORY TRENDS');
    expect(container!.querySelectorAll('button')).toHaveLength(0);
  });

  it('the Sparkline hint compares with the overall average for "everything", with the previous period otherwise', () => {
    h.ctx = { filterPeriod: 'ALL' };
    toolbar({ chartViewType: 'multiples' });
    expect(text()).toContain('เทียบค่าเฉลี่ยรวม');
    expect(text()).not.toContain('เทียบช่วงก่อนหน้า');
    act(() => root!.unmount()); container!.remove();

    h.ctx = { filterPeriod: 'cycle:ALL' }; // "everything" in pay-cycle mode is still everything
    toolbar({ chartViewType: 'multiples' });
    expect(text()).toContain('เทียบค่าเฉลี่ยรวม');
    act(() => root!.unmount()); container!.remove();

    h.ctx = { filterPeriod: '2026' };
    toolbar({ chartViewType: 'multiples' });
    expect(text()).toContain('เทียบช่วงก่อนหน้า');
    expect(text()).not.toContain('เทียบค่าเฉลี่ยรวม');
  });

  it('the straight/smooth line switch shows wherever a Cashflow line is drawn: line view or a combo period', () => {
    toolbar({ chartViewType: 'line', mainChartType: 'bar' });
    expect(btn('เส้นตรง')).toBeTruthy();
    act(() => root!.unmount()); container!.remove();
    toolbar({ chartViewType: 'bar', mainChartType: 'combo' });
    expect(btn('เส้นตรง')).toBeTruthy();
    act(() => root!.unmount()); container!.remove();
    toolbar({ chartViewType: 'bar', mainChartType: 'bar' });
    expect(byText('button', 'เส้นตรง')).toBeNull();
    act(() => root!.unmount()); container!.remove();
    toolbar({ chartViewType: 'bar', mainChartType: undefined });
    expect(byText('button', 'เส้นตรง')).toBeNull();
  });

  it('the Sankey controls are wired to the toolbar callbacks', () => {
    toolbar({ chartViewType: 'sankey' });
    click(btn('แสดง Need/Want/Save'));
    expect(f.setSankeyMode).toHaveBeenLastCalledWith('allocation');
    click(btn('เรียงตามลำดับในหน้าตั้งค่า'));
    expect(f.setSankeySortMode).toHaveBeenLastCalledWith('index');
  });

  it('the breakdown and line-style switches are wired to the toolbar callbacks', () => {
    toolbar({ chartViewType: 'line' });
    click(btn('แจกแจง'));
    expect(f.setIsBreakdown).toHaveBeenCalledTimes(1);
    click(btn('เส้นโค้ง'));
    expect(f.setIsSmoothLine).toHaveBeenLastCalledWith(true);
    click(btn('เส้นตรง'));
    expect(f.setIsSmoothLine).toHaveBeenLastCalledWith(false);
  });

  it('while loading, the switches are disabled', () => {
    toolbar({ chartViewType: 'line', showSkeleton: true });
    expect(btn('แจกแจง').disabled).toBe(true);
    expect(btn('เส้นตรง').disabled).toBe(true);
    expect(btn('เส้นโค้ง').disabled).toBe(true);
  });
});

describe('ToolbarToggleSwitch', () => {
  it('is a filled track with the knob moved over when on, an empty track when off', () => {
    const track = () => container!.firstElementChild!;
    const knob = () => track().firstElementChild!;
    mount(<ToolbarToggleSwitch isActive />);
    expect(track().className).toContain('bg-accent');
    expect(knob().className).toContain('translate-x-3.5');
    act(() => root!.unmount()); container!.remove();
    mount(<ToolbarToggleSwitch isActive={false} />);
    expect(track().className).not.toContain('bg-accent');
    expect(knob().className).not.toContain('translate-x-3.5');
  });

  it('takes its on-colour from the caller', () => {
    mount(<ToolbarToggleSwitch isActive activeColor="bg-emerald-500" />);
    expect(container!.firstElementChild!.className).toContain('bg-emerald-500');
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

  it('shows whether it is on', () => {
    mount(<ToolbarViewModes isBreakdown setIsBreakdown={vi.fn()} />);
    expect(btn('แจกแจง').className).toContain('text-accent-ink');
    act(() => root!.unmount()); container!.remove();
    mount(<ToolbarViewModes isBreakdown={false} setIsBreakdown={vi.fn()} />);
    expect(btn('แจกแจง').className).not.toContain('text-accent-ink');
  });
});

describe('ToolbarAllocationSelector (NEED / WANT)', () => {
  const sel = (hideFixed: boolean, hideWant: boolean) => mount(
    <ToolbarAllocationSelector hideFixedExpenses={hideFixed} hideWantExpenses={hideWant} setHideFixedExpenses={f.setHideFixedExpenses} setHideWantExpenses={f.setHideWantExpenses} />,
  );

  it('"ทั้งหมด" hides nothing, "เฉพาะ WANT" hides the fixed (NEED) rows, "เฉพาะ NEED" hides the WANT rows', () => {
    sel(false, false);
    click(btn('เฉพาะ WANT'));
    expect([f.setHideFixedExpenses.mock.lastCall![0], f.setHideWantExpenses.mock.lastCall![0]]).toEqual([true, false]);
    click(btn('เฉพาะ NEED'));
    expect([f.setHideFixedExpenses.mock.lastCall![0], f.setHideWantExpenses.mock.lastCall![0]]).toEqual([false, true]);
    click(btn('ทั้งหมด'));
    expect([f.setHideFixedExpenses.mock.lastCall![0], f.setHideWantExpenses.mock.lastCall![0]]).toEqual([false, false]);
  });

  it('highlights exactly the active choice', () => {
    const active = (b: HTMLElement) => !b.className.includes('bg-canvas'); // an idle choice sits on the canvas
    sel(false, false);
    expect([btn('ทั้งหมด'), btn('เฉพาะ WANT'), btn('เฉพาะ NEED')].map(active)).toEqual([true, false, false]);
    act(() => root!.unmount()); container!.remove();
    sel(true, false);
    expect([btn('ทั้งหมด'), btn('เฉพาะ WANT'), btn('เฉพาะ NEED')].map(active)).toEqual([false, true, false]);
    act(() => root!.unmount()); container!.remove();
    sel(false, true);
    expect([btn('ทั้งหมด'), btn('เฉพาะ WANT'), btn('เฉพาะ NEED')].map(active)).toEqual([false, false, true]);
  });

  it('with both sides hidden (not reachable from the buttons) none of the three is highlighted', () => {
    sel(true, true);
    expect([btn('ทั้งหมด'), btn('เฉพาะ WANT'), btn('เฉพาะ NEED')].every(b => b.className.includes('bg-canvas'))).toBe(true);
  });

  it('the coloured border ring is only set on the active filter', () => {
    sel(true, false);
    expect(btn('เฉพาะ WANT').style.getPropertyValue('--tint-border-color')).not.toBe('');
    expect(btn('เฉพาะ NEED').style.getPropertyValue('--tint-border-color')).toBe('');
  });

  it('is disabled while loading', () => {
    mount(<ToolbarAllocationSelector showSkeleton hideFixedExpenses={false} hideWantExpenses={false} setHideFixedExpenses={vi.fn()} setHideWantExpenses={vi.fn()} />);
    expect([...document.querySelectorAll('button')].every(b => b.disabled)).toBe(true);
  });
});

describe('ToolbarLineStyleSelector', () => {
  it('straight / smooth, marking the current one', () => {
    const set = vi.fn();
    mount(<ToolbarLineStyleSelector isSmoothLine={false} setIsSmoothLine={set} />);
    expect(btn('เส้นตรง').className).toContain('text-accent-ink');
    expect(btn('เส้นโค้ง').className).not.toContain('text-accent-ink');
    click(btn('เส้นโค้ง'));
    expect(set).toHaveBeenLastCalledWith(true);
    act(() => root!.unmount()); container!.remove();
    mount(<ToolbarLineStyleSelector isSmoothLine setIsSmoothLine={set} />);
    expect(btn('เส้นโค้ง').className).toContain('text-accent-ink');
  });
});
