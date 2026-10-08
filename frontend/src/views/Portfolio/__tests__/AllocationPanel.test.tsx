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

describe('AllocationPanel empty', () => {
  it('nothing held: one line, no chart', () => {
    mount(mkPortfolio([gone()]));
    expect(text()).toBe('ยังไม่มีสินทรัพย์ที่ถืออยู่');
    expect(h.doughnuts.length).toBe(0);
  });

  it('no assets at all behaves the same', () => {
    mount(mkPortfolio([]));
    expect(text()).toBe('ยังไม่มีสินทรัพย์ที่ถืออยู่');
  });
});

describe('AllocationPanel per-asset view (default)', () => {
  it('title, two mode buttons with the asset view pressed', () => {
    mount(base());
    expect(container!.querySelector('h2')!.textContent).toBe('สัดส่วนพอร์ต');
    expect(container!.querySelector('[role="group"]')!.getAttribute('aria-label')).toBe('มุมมองสัดส่วน');
    expect(modeBtn('รายตัว').getAttribute('aria-pressed')).toBe('true');
    expect(modeBtn('ตามประเภท').getAttribute('aria-pressed')).toBe('false');
  });

  it('doughnut data: held assets only, biggest first, values in baht', () => {
    mount(base());
    expect(lastChart().data.labels).toEqual(['Alpha', 'Bravo', 'Charlie']);
    expect(lastChart().data.datasets[0].data).toEqual([300, 100, 100]); // Bravo has no price -> its cost
  });

  it('colours match the table: by position among ALL assets, so a sold-out asset still takes a slot', () => {
    mount(base());
    expect(lastChart().data.datasets[0].backgroundColor).toEqual([tc('gold'), tc('purple'), tc('warn')]);
    expect(lastChart().data.datasets[0].borderColor).toBe(tc('surface'));
    expect(lastChart().data.datasets[0].borderWidth).toBe(2);
  });

  it('legend lists name and rounded share for every held asset', () => {
    mount(base());
    expect(legendRows(legends()[0])).toEqual(['Alpha60%', 'Bravo20%', 'Charlie20%']);
    const swatches = [...legends()[0].querySelectorAll<HTMLElement>('li > span:first-child')].map(s => s.style.backgroundColor);
    expect(swatches).toEqual([tc('gold'), tc('purple'), tc('warn')].map(probe));
  });

  it('long names are kept in a tooltip', () => {
    mount(base());
    expect(legends()[0].querySelector('li .truncate')!.getAttribute('title')).toBe('Alpha');
  });

  it('centre of the ring counts the items', () => {
    mount(base());
    expect(container!.querySelector('.pointer-events-none')!.textContent).toBe('3 รายการ');
  });

  it('screen readers get the shares as text', () => {
    mount(base());
    expect(container!.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe('สัดส่วนพอร์ต Alpha 60% Bravo 20% Charlie 20%');
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

  it('chart options: thin ring, no legend, no animation, free sizing', () => {
    mount(base());
    const o = lastChart().options;
    expect(o.cutout).toBe('68%');
    expect(o.plugins.legend.display).toBe(false);
    expect(o.animation).toBe(false);
    expect(o.maintainAspectRatio).toBe(false);
    expect(o.responsive).toBe(true);
  });

  it('tooltip reads baht and share of the hovered slice', () => {
    mount(base());
    const label = lastChart().options.plugins.tooltip.callbacks.label;
    expect(label({ raw: 300, dataIndex: 0 })).toBe(' ฿300.00 (60.0%)');
    expect(label({ raw: 100, dataIndex: 2 })).toBe(' ฿100.00 (20.0%)');
  });
});

describe('AllocationPanel by-kind view', () => {
  it('switching shows the kinds, the pressed state moves', () => {
    mount(base());
    click(modeBtn('ตามประเภท'));
    expect(modeBtn('ตามประเภท').getAttribute('aria-pressed')).toBe('true');
    expect(modeBtn('รายตัว').getAttribute('aria-pressed')).toBe('false');
    expect(lastChart().data.labels).toEqual(['หุ้นสหรัฐ', 'ทองคำแท่ง']);
    expect(lastChart().data.datasets[0].data).toEqual([400, 100]);
  });

  it('kinds are coloured by their own order, not the assets order', () => {
    mount(base());
    click(modeBtn('ตามประเภท'));
    expect(lastChart().data.datasets[0].backgroundColor).toEqual([tc('info'), tc('gold')]);
  });

  it('centre counts kinds, description names them', () => {
    mount(base());
    click(modeBtn('ตามประเภท'));
    expect(container!.querySelector('.pointer-events-none')!.textContent).toBe('2 ประเภท');
    expect(container!.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe('สัดส่วนพอร์ต หุ้นสหรัฐ 80% ทองคำแท่ง 20%');
  });

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

  it('both legends stay mounted in one grid cell; only the active one is visible and exposed', () => {
    mount(base());
    const [byAsset, byKind] = legends();
    expect(byAsset.getAttribute('aria-hidden')).toBe('false');
    expect(byAsset.classList.contains('invisible')).toBe(false);
    expect(byKind.getAttribute('aria-hidden')).toBe('true');
    expect(byKind.classList.contains('invisible')).toBe(true);
    expect(legendRows(byKind)).toEqual(['หุ้นสหรัฐ80%', 'ทองคำแท่ง20%']);
    click(modeBtn('ตามประเภท'));
    expect(byAsset.getAttribute('aria-hidden')).toBe('true');
    expect(byAsset.classList.contains('invisible')).toBe(true);
    expect(byKind.getAttribute('aria-hidden')).toBe('false');
    expect(byKind.classList.contains('invisible')).toBe(false);
  });

  it('kind legend swatches use the kind colours', () => {
    mount(base());
    const sw = [...legends()[1].querySelectorAll<HTMLElement>('li > span:first-child')].map(s => s.style.backgroundColor);
    expect(sw).toEqual([tc('info'), tc('gold')].map(probe));
  });

  it('can go back to the per-asset view', () => {
    mount(base());
    click(modeBtn('ตามประเภท'));
    click(modeBtn('รายตัว'));
    expect(lastChart().data.labels).toEqual(['Alpha', 'Bravo', 'Charlie']);
    expect(container!.querySelector('.pointer-events-none')!.textContent).toBe('3 รายการ');
  });
});

describe('AllocationPanel recomputing', () => {
  it('a new portfolio replaces the data', () => {
    mount(base());
    act(() => root!.render(<AllocationPanel portfolio={mkPortfolio([mkAsset('z', { name: 'Zulu', units: 1, cost: 10, marketValue: 10 })])} />));
    expect(lastChart().data.labels).toEqual(['Zulu']);
    expect(text()).toContain('รวม ฿10.00');
  });

  it('the view mode survives a data refresh', () => {
    mount(base());
    click(modeBtn('ตามประเภท'));
    act(() => root!.render(<AllocationPanel portfolio={base()} />));
    expect(modeBtn('ตามประเภท').getAttribute('aria-pressed')).toBe('true');
  });
});
