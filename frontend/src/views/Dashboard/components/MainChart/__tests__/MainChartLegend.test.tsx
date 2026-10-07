// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import React, { act, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MainChartLegend, BreakdownLegend, StandardLegend } from '../MainChartLegend';
import { click, byText } from '@/test-utils/dom';
import { tc } from '@/constants/theme';
import type { Category } from '@/types';
import type { LegendDataset } from '../types';

const categories: Category[] = [
  { id: 'c-rent', name: 'ค่าเช่า', type: 'expense', color: '#3B82F6' },
  { id: 'c-food', name: 'ค่ากิน', type: 'expense', color: '#F97316', icon: 'wallet' },
  { id: 'c-fun', name: 'บันเทิง', type: 'expense' }, // no colour
  { id: 'c-salary', name: 'เงินเดือน', type: 'income', color: '#10B981' },
  { id: 'c-empty', name: 'ไม่มีข้อมูล', type: 'expense', color: '#000000' },
];
const withData = new Set(['ค่าเช่า', 'ค่ากิน', 'บันเทิง', 'เงินเดือน']);

const datasets: LegendDataset[] = [
  { label: 'รายรับ', type: 'bar', backgroundColor: '#10B981', borderColor: '#10B981' },
  { label: 'รายจ่ายรวม', type: 'bar', backgroundColor: '#DA291C' },
  { label: 'Cashflow', type: 'line', borderColor: '#FFFFFF', yAxisID: 'y1' },
];

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = (el: React.ReactElement) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(el));
};
const items = () => [...document.querySelectorAll<HTMLButtonElement>('button')];
const item = (label: string) => items().find(b => b.textContent!.trim().startsWith(label))!;
const struck = (b: HTMLElement) => b.className.includes('line-through');
const probe: { category: string[]; hidden: string[] } = { category: [], hidden: [] };

function BreakdownHarness({ initial = ['ALL'] as string | string[] }) {
  const [cat, setCat] = useState<string | string[]>(initial);
  probe.category = Array.isArray(cat) ? cat : [cat];
  return <BreakdownLegend categories={categories} categoriesWithData={withData} dashboardCategory={cat} setDashboardCategory={setCat} />;
}
function StandardHarness({ initial = [] as string[], sets = datasets }) {
  const [hidden, setHidden] = useState<string[]>(initial);
  probe.hidden = hidden;
  return <StandardLegend legendDatasets={sets} hiddenDatasets={hidden} setHiddenDatasets={setHidden} />;
}

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

describe('BreakdownLegend', () => {
  it('lists the expense categories that have data, in order — not income, not empty ones', () => {
    mount(<BreakdownHarness />);
    expect(items().map(b => b.textContent!.trim())).toEqual(['ค่าเช่า', 'ค่ากิน', 'บันเทิง']);
  });

  it('draws nothing when no expense category has data', () => {
    mount(<BreakdownLegend categories={categories} categoriesWithData={new Set(['เงินเดือน'])} dashboardCategory={['ALL']} setDashboardCategory={() => {}} />);
    expect(container!.innerHTML).toBe('');
  });

  it('with "all" nothing is struck through', () => {
    mount(<BreakdownHarness />);
    expect(items().some(struck)).toBe(false);
  });

  it('clicking one while "all" is on hides just that one', () => {
    mount(<BreakdownHarness />);
    click(item('ค่ากิน'));
    expect(probe.category).toEqual(['ค่าเช่า', 'บันเทิง']);
    expect(items().map(struck)).toEqual([false, true, false]);
  });

  it('clicking a hidden one shows it again; showing the last one means "all"', () => {
    mount(<BreakdownHarness initial={['ค่าเช่า', 'บันเทิง']} />);
    click(item('ค่ากิน'));
    expect(probe.category).toEqual(['ALL']);
    expect(items().some(struck)).toBe(false);
  });

  it('hiding the last visible one also means "all" (the chart is never left empty)', () => {
    mount(<BreakdownHarness initial={['ค่ากิน']} />);
    click(item('ค่ากิน'));
    expect(probe.category).toEqual(['ALL']);
  });

  it('knows the selection by id as well as by name', () => {
    mount(<BreakdownHarness initial={['c-food']} />);
    expect(items().map(struck)).toEqual([true, false, true]);
  });

  it('accepts a single name as the selection', () => {
    mount(<BreakdownHarness initial="ค่าเช่า" />);
    expect(items().map(struck)).toEqual([false, true, true]);
  });

  it('each swatch is the category colour, or muted when it has none; an icon is drawn when set', () => {
    mount(<BreakdownHarness />);
    const swatch = (b: HTMLElement) => b.querySelector<HTMLElement>('span.w-2\\.5')!.style.backgroundColor;
    const norm = (c: string) => { const d = document.createElement('div'); d.style.backgroundColor = c; return d.style.backgroundColor; };
    expect(swatch(item('ค่าเช่า'))).toBe(norm('#3B82F6'));
    expect(swatch(item('บันเทิง'))).toBe(norm(tc('ink-muted')));
    expect(item('ค่ากิน').querySelector('svg')).not.toBeNull();
    expect(item('ค่าเช่า').querySelector('svg')).toBeNull();
  });
});

describe('StandardLegend', () => {
  it('one button per series, named as the series', () => {
    mount(<StandardHarness />);
    expect(items().map(b => b.textContent!.trim())).toEqual(['รายรับ', 'รายจ่ายรวม', 'Cashflow (แกนขวา)']);
  });

  it('draws nothing without series', () => {
    mount(<StandardHarness sets={[]} />);
    expect(container!.innerHTML).toBe('');
  });

  it('a series on the right-hand axis says so', () => {
    mount(<StandardHarness />);
    expect(item('Cashflow').textContent).toContain('(แกนขวา)');
    expect(item('รายรับ').textContent).not.toContain('แกนขวา');
  });

  it('clicking hides a series (struck through), clicking again shows it', () => {
    mount(<StandardHarness />);
    click(item('รายรับ'));
    expect(probe.hidden).toEqual(['รายรับ']);
    expect(struck(item('รายรับ'))).toBe(true);
    expect(struck(item('รายจ่ายรวม'))).toBe(false);
    click(item('รายรับ'));
    expect(probe.hidden).toEqual([]);
    expect(struck(item('รายรับ'))).toBe(false);
  });

  it('hiding several keeps them all, and showing one leaves the others hidden', () => {
    mount(<StandardHarness />);
    click(item('รายรับ'));
    click(item('Cashflow'));
    expect(probe.hidden).toEqual(['รายรับ', 'Cashflow']);
    click(item('รายรับ'));
    expect(probe.hidden).toEqual(['Cashflow']);
  });

  it('starts struck through for series that are already hidden', () => {
    mount(<StandardHarness initial={['รายจ่ายรวม']} />);
    expect(items().map(struck)).toEqual([false, true, false]);
  });

  it('a line is a thin bar and a bar is a square, in the series colours', () => {
    mount(<StandardHarness />);
    const mark = (b: HTMLElement) => b.querySelector<HTMLElement>('span.inline-block')!.style;
    expect([mark(item('รายรับ')).width, mark(item('รายรับ')).height]).toEqual(['10px', '10px']);
    expect([mark(item('Cashflow')).width, mark(item('Cashflow')).height]).toEqual(['16px', '3px']);
  });

  it('a series with no label still gets a button (and cannot be hidden by label)', () => {
    mount(<StandardHarness sets={[{ type: 'bar', backgroundColor: '#123456' }]} />);
    expect(items()).toHaveLength(1);
    expect(struck(items()[0])).toBe(false);
  });
});

describe('MainChartLegend', () => {
  const legend = (isBreakdown: boolean) => mount(
    <MainChartLegend
      legendDatasets={datasets} hiddenDatasets={[]} setHiddenDatasets={() => {}} isBreakdown={isBreakdown}
      dashboardCategory={['ALL']} setDashboardCategory={() => {}} categories={categories} categoriesWithData={withData}
    />,
  );

  it('shows the series legend normally', () => {
    legend(false);
    expect(byText('button', 'รายรับ')).toBeTruthy();
    expect(byText('button', 'ค่าเช่า')).toBeNull();
  });

  it('shows the categories while breaking down', () => {
    legend(true);
    expect(byText('button', 'ค่าเช่า')).toBeTruthy();
    expect(byText('button', 'รายรับ')).toBeNull();
  });
});
