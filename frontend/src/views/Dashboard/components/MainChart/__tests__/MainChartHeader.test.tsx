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

describe('MainChartHeader — title', () => {
  it('names what the chart shows', () => {
    header();
    expect(q('h2')!.textContent).toBe('วิเคราะห์กระแสเงินสด');
  });

  it('follows the view and breakdown', () => {
    header({ chartViewType: 'sankey' });
    expect(q('h2')!.textContent).toBe('โครงสร้างกระแสเงินสด');
    act(() => root!.unmount()); container!.remove();
    header({ isBreakdown: true });
    expect(q('h2')!.textContent).toBe('แจกแจงรายจ่ายตามหมวดหมู่');
    act(() => root!.unmount()); container!.remove();
    header({ chartViewType: 'multiples' });
    expect(q('h2')!.textContent).toBe('เทรนด์รายหมวด');
  });
});

describe('MainChartHeader — monthly / daily switch', () => {
  it('is offered for a bar or line chart over several months', () => {
    header();
    expect(btn('รายเดือน')).toBeTruthy();
    expect(btn('รายวัน')).toBeTruthy();
    act(() => root!.unmount()); container!.remove();
    header({ chartViewType: 'line', filterPeriod: '2026-01_2026-03' });
    expect(btn('รายวัน')).toBeTruthy();
  });

  it('is hidden for a single month or pay cycle (it is daily by nature)', () => {
    for (const filterPeriod of ['2026-01', 'cycle:2026-03']) {
      header({ filterPeriod });
      expect(byText('button', 'รายวัน')).toBeNull();
      act(() => root!.unmount()); container!.remove();
    }
  });

  it('is hidden for Sankey and Sparkline, which have no time axis to group', () => {
    for (const chartViewType of ['sankey', 'multiples']) {
      header({ chartViewType });
      expect(byText('button', 'รายเดือน')).toBeNull();
      act(() => root!.unmount()); container!.remove();
    }
  });
});

describe('ChartGroupBySwitcher', () => {
  it('each button sets its own grouping', () => {
    mount(<ChartGroupBySwitcher chartGroupBy="monthly" setChartGroupBy={f.setChartGroupBy} />);
    click(btn('รายวัน'));
    expect(f.setChartGroupBy).toHaveBeenLastCalledWith('daily');
    click(btn('รายเดือน'));
    expect(f.setChartGroupBy).toHaveBeenLastCalledWith('monthly');
  });

  it('marks the current grouping', () => {
    mount(<ChartGroupBySwitcher chartGroupBy="daily" setChartGroupBy={f.setChartGroupBy} />);
    expect(btn('รายวัน').className).toContain('text-accent-ink');
    expect(btn('รายเดือน').className).not.toContain('text-accent-ink');
  });
});

describe('ViewTypeSwitcher', () => {
  const switcher = (over: Record<string, unknown> = {}) => mount(
    <ViewTypeSwitcher chartViewType="bar" setChartViewType={f.setChartViewType} setIsBreakdown={f.setIsBreakdown} isSingleMonth={false} {...over} />,
  );

  it('is a labelled group of four views, the current one pressed', () => {
    switcher();
    expect(q('[role="group"]')!.getAttribute('aria-label')).toBe('ชนิดกราฟ');
    const buttons = [...document.querySelectorAll('button')];
    expect(buttons.map(b => b.textContent!.trim())).toEqual(['เส้น', 'แท่ง', 'Sankey', 'Sparkline']);
    expect(buttons.map(b => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false', 'false']);
  });

  it('line and bar just change the view', () => {
    switcher();
    click(btn('เส้น'));
    expect(f.setChartViewType).toHaveBeenLastCalledWith('line');
    click(btn('แท่ง'));
    expect(f.setChartViewType).toHaveBeenLastCalledWith('bar');
    expect(f.setIsBreakdown).not.toHaveBeenCalled();
  });

  it('Sankey and Sparkline also switch the breakdown off (they have no categories-as-series mode)', () => {
    switcher();
    click(btn('Sankey'));
    expect(f.setChartViewType).toHaveBeenLastCalledWith('sankey');
    expect(f.setIsBreakdown).toHaveBeenLastCalledWith(false);
    f.setIsBreakdown.mockClear();
    click(btn('Sparkline'));
    expect(f.setChartViewType).toHaveBeenLastCalledWith('multiples');
    expect(f.setIsBreakdown).toHaveBeenLastCalledWith(false);
  });

  it('over a single month Sparkline is disabled, explains why, and does nothing when clicked', () => {
    switcher({ isSingleMonth: true });
    const sparkline = btn('Sparkline');
    expect(sparkline.getAttribute('aria-disabled')).toBe('true');
    const tip = q('[role="tooltip"]')!;
    expect(tip.textContent).toContain('ต้องเลือกช่วงเวลามากกว่า 1 เดือน');
    expect(sparkline.getAttribute('aria-describedby')).toBe(tip.id);
    click(sparkline);
    expect(f.setChartViewType).not.toHaveBeenCalled();
    expect(f.setIsBreakdown).not.toHaveBeenCalled();
  });

  it('a disabled view is never shown as selected, even if it is still the current one', () => {
    switcher({ isSingleMonth: true, chartViewType: 'multiples' });
    expect(btn('Sparkline').getAttribute('aria-pressed')).toBe('false');
  });

  it('with several months nothing is disabled and no explanation is attached', () => {
    switcher({ isSingleMonth: false });
    expect(q('[role="tooltip"]')).toBeNull();
    expect([...document.querySelectorAll('button')].every(b => b.getAttribute('aria-disabled') === 'false' && !b.getAttribute('aria-describedby'))).toBe(true);
  });
});

describe('SankeyControls', () => {
  const controls = (over: Record<string, unknown> = {}) => {
    const p = { setSankeyMode: vi.fn(), setSankeySortMode: vi.fn() };
    mount(<SankeyControls sankeyMode="standard" sankeySortMode="value" {...p} {...over} />);
    return p;
  };

  it('the allocation toggle names the mode you would switch to / are in, and flips it', () => {
    const p = controls();
    expect(byText('button', 'แสดง Need/Want/Save')).toBeTruthy();
    click(byText('button', 'แสดง Need/Want/Save'));
    expect(p.setSankeyMode).toHaveBeenLastCalledWith('allocation');
    act(() => root!.unmount()); container!.remove();

    const q2 = controls({ sankeyMode: 'allocation' });
    click(byText('button', 'ตามการจัดสรร'));
    expect(q2.setSankeyMode).toHaveBeenLastCalledWith('standard');
    expect(byText('button', 'ตามการจัดสรร')!.className).toContain('bg-accent');
  });

  it('sorts by amount or by the order in Settings, marking the current one', () => {
    const p = controls();
    expect(btn('เรียงตามยอดเงิน').className).toContain('text-accent-ink');
    expect(btn('เรียงตามลำดับในหน้าตั้งค่า').className).not.toContain('text-accent-ink');
    click(btn('เรียงตามลำดับในหน้าตั้งค่า'));
    expect(p.setSankeySortMode).toHaveBeenLastCalledWith('index');
    click(btn('เรียงตามยอดเงิน'));
    expect(p.setSankeySortMode).toHaveBeenLastCalledWith('value');
  });

  it('everything is disabled while loading', () => {
    controls({ showSkeleton: true });
    expect([...document.querySelectorAll('button')].every(b => b.disabled)).toBe(true);
  });
});
