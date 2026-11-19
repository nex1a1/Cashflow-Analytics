// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MainChartHeader, ChartGroupBySwitcher, ViewTypeSwitcher, SankeyControls } from '../MainChartHeader';
import { click, byText, q } from '@/test-utils/dom';

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = (el: React.ReactElement) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(el));
};
const btn = (text: string) => byText('button', text)!;

const f = { setChartViewType: vi.fn(), setChartGroupBy: vi.fn(), setIsBreakdown: vi.fn() };
const header = (over: Record<string, unknown> = {}) => mount(
  <MainChartHeader
    chartViewType="bar" setChartViewType={f.setChartViewType}
    chartGroupBy="monthly" setChartGroupBy={f.setChartGroupBy}
    setIsBreakdown={f.setIsBreakdown} filterPeriod="2026" mainChartType="combo" isBreakdown={false}
    {...over}
  />,
);

beforeEach(() => Object.values(f).forEach(fn => fn.mockClear()));
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

describe('SankeyControls', () => {
  const controls = (over: Record<string, unknown> = {}) => {
    const p = { setSankeyMode: vi.fn(), setSankeySortMode: vi.fn() };
    mount(<SankeyControls sankeyMode="standard" sankeySortMode="value" {...p} {...over} />);
    return p;
  };

  it('sorts by amount or by the order in Settings, marking the current one', () => {
    const p = controls();
    expect(btn('เรียงตามยอดเงิน').className).toContain('text-accent-ink');
    expect(btn('เรียงตามลำดับในหน้าตั้งค่า').className).not.toContain('text-accent-ink');
    click(btn('เรียงตามลำดับในหน้าตั้งค่า'));
    expect(p.setSankeySortMode).toHaveBeenLastCalledWith('index');
    click(btn('เรียงตามยอดเงิน'));
    expect(p.setSankeySortMode).toHaveBeenLastCalledWith('value');
  });

});
