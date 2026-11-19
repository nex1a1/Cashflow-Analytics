// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import AllocationPanel from '../AllocationPanel';
import { click } from '@/test-utils/dom';
import { tc } from '@/constants/theme';
import { mkAsset, mkPortfolio } from './fixtures';
import type { Portfolio } from '@/types';

type ChartProps = { data: any; options: any };
const h = vi.hoisted(() => ({ doughnuts: [] as ChartProps[] }));
vi.mock('react-chartjs-2', async () => {
  const React = await import('react');
  return { Doughnut: (p: ChartProps) => { h.doughnuts.push(p); return React.createElement('canvas', { 'data-testid': 'doughnut' }); } };
});
const lastChart = () => h.doughnuts[h.doughnuts.length - 1];

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = (p: Portfolio) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<AllocationPanel portfolio={p} />));
};
const text = () => container!.textContent ?? '';
const modeBtn = (label: string) => [...container!.querySelectorAll<HTMLButtonElement>('[role="group"] button')].find(b => b.textContent === label)!;
const legends = () => [...container!.querySelectorAll('ul')] as HTMLElement[];
const legendRows = (ul: HTMLElement) => [...ul.querySelectorAll('li')].map(li => li.textContent);
const probe = (c: string) => { const i = document.createElement('i'); i.style.backgroundColor = c; return i.style.backgroundColor; };

// Gone is sold out but still takes a colour slot (the table colours every asset by its position)
const gone = () => mkAsset('g', { name: 'Gone', kind: 'crypto', units: 0, cost: 0, marketValue: null });
const alpha = () => mkAsset('a', { name: 'Alpha', kind: 'us_stock', units: 1, cost: 200, marketValue: 300 });
const bravo = () => mkAsset('b', { name: 'Bravo', kind: 'gold_bar', units: 1, cost: 100, marketValue: null });
const charlie = () => mkAsset('c', { name: 'Charlie', kind: 'us_stock', units: 1, cost: 90, marketValue: 100 });
const base = () => mkPortfolio([gone(), alpha(), bravo(), charlie()]);

beforeEach(() => { h.doughnuts.length = 0; });
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
});

describe('AllocationPanel per-asset view (default)', () => {

  it('legend lists name and rounded share for every held asset', () => {
    mount(base());
    expect(legendRows(legends()[0])).toEqual(['Alpha60%', 'Bravo20%', 'Charlie20%']);
    const swatches = [...legends()[0].querySelectorAll<HTMLElement>('li > span:first-child')].map(s => s.style.backgroundColor);
    expect(swatches).toEqual([tc('gold'), tc('purple'), tc('warn')].map(probe));
  });

  it('footer: total and a note that unpriced assets are counted at cost', () => {
    mount(base());
    expect(text()).toContain('รวม ฿500.00 · บางรายการยังไม่มีราคา ใช้ต้นทุนแทน');
  });

  it('no note when everything has a price', () => {
    mount(mkPortfolio([alpha(), charlie()]));
    expect(text()).toContain('รวม ฿400.00');
    expect(text()).not.toContain('ยังไม่มีราคา');
  });

  it('tooltip reads baht and share of the hovered slice', () => {
    mount(base());
    const label = lastChart().options.plugins.tooltip.callbacks.label;
    expect(label({ raw: 300, dataIndex: 0 })).toBe(' ฿300.00 (60.0%)');
    expect(label({ raw: 100, dataIndex: 2 })).toBe(' ฿100.00 (20.0%)');
  });
});

describe('AllocationPanel by-kind view', () => {

  it('the tooltip uses the kind shares in this view', () => {
    mount(base());
    click(modeBtn('ตามประเภท'));
    const label = lastChart().options.plugins.tooltip.callbacks.label;
    expect(label({ raw: 400, dataIndex: 0 })).toBe(' ฿400.00 (80.0%)');
    expect(label({ raw: 100, dataIndex: 1 })).toBe(' ฿100.00 (20.0%)');
  });

  it('the total underneath does not change with the view', () => {
    mount(base());
    click(modeBtn('ตามประเภท'));
    expect(text()).toContain('รวม ฿500.00');
  });

});

describe('AllocationPanel recomputing', () => {
  it('a new portfolio replaces the data', () => {
    mount(base());
    act(() => root!.render(<AllocationPanel portfolio={mkPortfolio([mkAsset('z', { name: 'Zulu', units: 1, cost: 10, marketValue: 10 })])} />));
    expect(lastChart().data.labels).toEqual(['Zulu']);
    expect(text()).toContain('รวม ฿10.00');
  });

});
