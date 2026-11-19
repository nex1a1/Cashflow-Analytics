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

});

