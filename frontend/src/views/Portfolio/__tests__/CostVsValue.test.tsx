// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import CostVsValue from '../CostVsValue';
import { click } from '@/test-utils/dom';
import { tc } from '@/constants/theme';
import { formatThaiDateShort } from '@/utils/formatters';
import { mkAsset, mkPortfolio, trade } from './fixtures';
import type { Portfolio } from '@/types';

type ChartProps = { data: any; options: any };
const h = vi.hoisted(() => ({ bars: [] as ChartProps[], lines: [] as ChartProps[] }));
vi.mock('react-chartjs-2', async () => {
  const React = await import('react');
  return {
    Bar: (p: ChartProps) => { h.bars.push(p); return React.createElement('div', { 'data-testid': 'bar-chart' }); },
    Line: (p: ChartProps) => { h.lines.push(p); return React.createElement('div', { 'data-testid': 'line-chart' }); },
  };
});

const lastBar = () => h.bars[h.bars.length - 1];
const lastLine = () => h.lines[h.lines.length - 1];

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = (p: Portfolio) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<CostVsValue portfolio={p} />));
};
const rerender = (p: Portfolio) => act(() => root!.render(<CostVsValue portfolio={p} />));
const text = () => container!.textContent ?? '';
const tab = (label: string) => [...container!.querySelectorAll<HTMLElement>('[role="tab"]')].find(t => t.textContent === label)!;
const goto = (label: string) => click(tab(label));
const probe = (c: string) => { const i = document.createElement('i'); i.style.color = c; return i.style.color; };

// Bravo 180 > Alpha 150 > Charlie (unpriced, cost 50); Delta is sold out
const alpha = () => mkAsset('a', { name: 'Alpha', units: 1, cost: 100, marketValue: 150, trades: [trade('t1', '2026-03-10', 'buy', 1, 100)] });
const bravo = () => mkAsset('b', { name: 'Bravo', units: 1, cost: 200, marketValue: 180, trades: [trade('t2', '2026-03-10', 'buy', 1, 200), trade('t3', '2026-04-01', 'sell', 1, 30)] });
const charlie = () => mkAsset('c', { name: 'Charlie', units: 1, cost: 50, marketValue: null });
const delta = () => mkAsset('d', { name: 'Delta', units: 0, cost: 0, marketValue: null, trades: [trade('t4', '2026-02-01', 'buy', 1, 999)] });
const base = () => mkPortfolio([alpha(), bravo(), charlie(), delta()], { marketValue: 330, cost: 300 });

beforeEach(() => {
  h.bars.length = 0; h.lines.length = 0;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 8, 12, 0, 0));
});
afterEach(() => {
  vi.useRealTimers();
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
});

describe('CostVsValue shell', () => {
  it('nothing held: a single line and no tabs', () => {
    mount(mkPortfolio([delta()]));
    expect(text()).toBe('ยังไม่มีสินทรัพย์ที่ถืออยู่');
    expect(container!.querySelectorAll('[role="tab"]').length).toBe(0);
  });

  it('four tabs, the first one selected, with its own subtitle', () => {
    mount(base());
    expect([...container!.querySelectorAll('[role="tab"]')].map(t => t.textContent)).toEqual(['ต้นทุนเทียบมูลค่า', 'กำไร/ขาดทุน', 'เงินลงทุนสะสม', 'มูลค่าตามเวลา']);
    expect(tab('ต้นทุนเทียบมูลค่า').getAttribute('aria-selected')).toBe('true');
    expect(container!.querySelector('h2')!.textContent).toBe('ลงเงินไปเท่าไร ตอนนี้มีค่าเท่าไร');
    expect(text()).toContain('แท่งเทา = เงินที่ลงไป');
  });

  it('each tab swaps the subtitle and the body', () => {
    mount(base());
    goto('กำไร/ขาดทุน');
    expect(text()).toContain('กำไรหรือขาดทุนของแต่ละสินทรัพย์ที่ยังถืออยู่');
    expect(tab('กำไร/ขาดทุน').getAttribute('aria-selected')).toBe('true');
    expect(tab('ต้นทุนเทียบมูลค่า').getAttribute('aria-selected')).toBe('false');
    goto('เงินลงทุนสะสม');
    expect(text()).toContain('เงินลงทุนสุทธิ (ซื้อ − ขาย) สะสมตามวันที่ซื้อขาย');
    goto('มูลค่าตามเวลา');
    expect(text()).toContain('เส้นแดง = มูลค่าพอร์ต');
    goto('ต้นทุนเทียบมูลค่า');
    expect(text()).toContain('แท่งเทา = เงินที่ลงไป');
  });
});

describe('CostVsValue bars tab', () => {
  const rowOf = (name: string) => [...container!.querySelectorAll('.gap-4 > div')].find(d => d.querySelector('span.truncate')?.textContent === name) as HTMLElement;
  const widths = (name: string) => [...rowOf(name).querySelectorAll<HTMLElement>('.h-3')].map(b => b.firstElementChild ? (b.firstElementChild as HTMLElement).style.width : null);
  const values = (name: string) => [...rowOf(name).querySelectorAll('.h-3 + span')].map(s => s.textContent);

  it('held assets only, biggest current value first (cost when unpriced)', () => {
    mount(base());
    const names = [...container!.querySelectorAll('.gap-4 > div span.truncate')].map(s => s.textContent);
    expect(names).toEqual(['Bravo', 'Alpha', 'Charlie']);
  });

  it('gain and its percentage of cost, in the income colour', () => {
    mount(base());
    const g = rowOf('Alpha').querySelector('.items-baseline span.font-mono')!;
    expect(g.textContent).toBe('+฿50.00 (+50.0%)');
    expect(g.classList.contains('text-income')).toBe(true);
  });

  it('loss: real minus, amber not red, negative percentage', () => {
    mount(base());
    const g = rowOf('Bravo').querySelector('.items-baseline span.font-mono')!;
    expect(g.textContent).toBe('−฿20.00 (-10.0%)');
    expect(g.classList.contains('text-warn')).toBe(true);
  });

  it('unpriced: no gain line, "no price" in place of the value bar', () => {
    mount(base());
    expect(rowOf('Charlie').querySelector('.items-baseline span.font-mono')).toBeNull();
    expect(values('Charlie')).toEqual(['฿50.00', 'ยังไม่มีราคา']);
    expect(widths('Charlie')[1]).toBeNull();
  });

  it('bars are scaled to the biggest figure on screen (here the 200 cost of Bravo)', () => {
    mount(base());
    expect(widths('Bravo')).toEqual(['100%', '90%']);
    expect(widths('Alpha')).toEqual(['50%', '75%']);
    expect(widths('Charlie')[0]).toBe('25%');
  });

  it('colours: grey for money put in, green for a gain, amber for a loss', () => {
    mount(base());
    const bars = (n: string) => [...rowOf(n).querySelectorAll('.h-3 > div')].map(b => b.className);
    expect(bars('Alpha')[0]).toContain('bg-ink-muted');
    expect(bars('Alpha')[1]).toContain('bg-income');
    expect(bars('Bravo')[1]).toContain('bg-warn');
    expect(bars('Bravo')[1]).not.toContain('bg-income');
  });

  it('a value of exactly the cost is neutral text but a green bar', () => {
    mount(mkPortfolio([mkAsset('e', { name: 'Even', units: 1, cost: 100, marketValue: 100 })]));
    const g = rowOf('Even').querySelector('.items-baseline span.font-mono')!;
    expect(g.textContent).toBe('฿0.00 (0.0%)');
    expect(g.classList.contains('text-ink-display')).toBe(true);
    expect(rowOf('Even').querySelectorAll('.h-3 > div')[1].className).toContain('bg-income');
  });

  it('zero cost: the gain without a percentage (no division by zero)', () => {
    mount(mkPortfolio([mkAsset('f', { name: 'Free', units: 1, cost: 0, marketValue: 10 })]));
    expect(rowOf('Free').querySelector('.items-baseline span.font-mono')!.textContent).toBe('+฿10.00');
  });

  it('a tiny bar is still visible (never under 1%)', () => {
    mount(mkPortfolio([mkAsset('g', { name: 'Big', units: 1, cost: 100_000, marketValue: 100_000 }), mkAsset('h', { name: 'Tiny', units: 1, cost: 1, marketValue: 1 })]));
    expect(widths('Tiny')).toEqual(['1%', '1%']);
  });

  it('the money-in figure is plain and the current-value figure is bold', () => {
    mount(base());
    const [cost, value] = [...rowOf('Alpha').querySelectorAll<HTMLElement>('.h-3 + span')];
    expect(cost.classList.contains('text-ink-body')).toBe(true);
    expect(cost.classList.contains('font-bold')).toBe(false);
    expect(value.classList.contains('text-ink-display')).toBe(true);
    expect(value.classList.contains('font-bold')).toBe(true);
  });

  it('when the value is the biggest figure the bars scale to it', () => {
    mount(mkPortfolio([mkAsset('w', { name: 'Winner', units: 1, cost: 100, marketValue: 200 })]));
    expect(widths('Winner')).toEqual(['50%', '100%']);
  });

  it('an unpriced asset is ranked by its cost, wherever it sits in the list', () => {
    const priced = (id: string, value: number) => mkAsset(id, { name: id, units: 1, cost: 10, marketValue: value });
    const unpriced = mkAsset('Big', { name: 'Big', units: 1, cost: 500, marketValue: null });
    const a = priced('A', 180); const b = priced('B', 150);
    for (const order of [[a, unpriced, b], [unpriced, a, b], [a, b, unpriced], [b, unpriced, a], [b, a, unpriced], [unpriced, b, a]]) {
      mount(mkPortfolio(order));
      expect([...container!.querySelectorAll('.gap-4 > div span.truncate')].map(s => s.textContent)).toEqual(['Big', 'A', 'B']);
      act(() => root!.unmount()); container!.remove(); root = null; container = null;
    }
  });

  it('labels the two bars', () => {
    mount(base());
    const labels = [...rowOf('Alpha').querySelectorAll('.w-\\[56px\\]')].map(s => s.textContent);
    expect(labels).toEqual(['ลงไป', 'ตอนนี้']);
  });

  it('recomputes when the assets change', () => {
    mount(base());
    rerender(mkPortfolio([mkAsset('z', { name: 'Zulu', units: 1, cost: 10, marketValue: 20 })]));
    expect([...container!.querySelectorAll('.gap-4 > div span.truncate')].map(s => s.textContent)).toEqual(['Zulu']);
  });
});

describe('CostVsValue gain tab', () => {
  it('priced assets only, in the same order, with the gain in baht', () => {
    mount(base());
    goto('กำไร/ขาดทุน');
    expect(lastBar().data.labels).toEqual(['Bravo', 'Alpha']);
    expect(lastBar().data.datasets[0].data).toEqual([-20, 50]);
  });

  it('green for a gain, amber for a loss (never red)', () => {
    mount(base());
    goto('กำไร/ขาดทุน');
    expect(lastBar().data.datasets[0].backgroundColor).toEqual([tc('warn'), tc('income')]);
  });

  it('breaking even counts as green', () => {
    mount(mkPortfolio([mkAsset('e', { units: 1, cost: 100, marketValue: 100 })]));
    goto('กำไร/ขาดทุน');
    expect(lastBar().data.datasets[0].backgroundColor).toEqual([tc('income')]);
  });

  it('horizontal bars without a legend, no animation', () => {
    mount(base());
    goto('กำไร/ขาดทุน');
    const o = lastBar().options;
    expect(o.indexAxis).toBe('y');
    expect(o.plugins.legend.display).toBe(false);
    expect(o.animation).toBe(false);
    expect(o.maintainAspectRatio).toBe(false);
    expect(o.scales.y.grid.display).toBe(false);
  });

  it('tooltip and axis use signed baht', () => {
    mount(base());
    goto('กำไร/ขาดทุน');
    const o = lastBar().options;
    expect(o.plugins.tooltip.callbacks.label({ raw: 50 })).toBe('+฿50.00');
    expect(o.plugins.tooltip.callbacks.label({ raw: -20 })).toBe('−฿20.00');
    expect(o.plugins.tooltip.callbacks.label({ raw: 0 })).toBe('฿0.00');
    expect(o.scales.x.ticks.callback(1234)).toBe('฿1,234.00');
    expect(o.scales.x.ticks.callback('500')).toBe('฿500.00');
  });

  it('is described for screen readers with every asset and its gain', () => {
    mount(base());
    goto('กำไร/ขาดทุน');
    const img = container!.querySelector('[role="img"]')!;
    expect(img.getAttribute('aria-label')).toBe('กำไรขาดทุนรายสินทรัพย์ Bravo −฿20.00 Alpha +฿50.00');
  });

  it('height grows with the number of assets but never below 160', () => {
    mount(base());
    goto('กำไร/ขาดทุน');
    expect((container!.querySelector('[role="img"]') as HTMLElement).style.minHeight).toBe('160px');
    act(() => root!.unmount()); container!.remove();
    h.bars.length = 0;
    const many = Array.from({ length: 6 }, (_, i) => mkAsset(`m${i}`, { name: `M${i}`, units: 1, cost: 10, marketValue: 20 }));
    mount(mkPortfolio(many));
    goto('กำไร/ขาดทุน');
    expect((container!.querySelector('[role="img"]') as HTMLElement).style.minHeight).toBe('264px');
  });

  it('nothing priced: a message instead of an empty chart', () => {
    mount(mkPortfolio([charlie()]));
    goto('กำไร/ขาดทุน');
    expect(text()).toContain('ยังไม่มีสินทรัพย์ที่มีราคา');
    expect(h.bars.length).toBe(0);
  });
});

describe('CostVsValue invested tab', () => {
  it('step line of net money invested per trade date', () => {
    mount(base());
    goto('เงินลงทุนสะสม');
    const d = lastLine().data;
    // 2026-02-01: +999 (sold-out asset still counts) ; 03-10: +100 +200 ; 04-01: -30
    expect(d.labels).toEqual(['2026-02-01', '2026-03-10', '2026-04-01'].map(formatThaiDateShort));
    expect(d.datasets[0].data).toEqual([999, 1299, 1269]);
    expect(d.datasets[0].stepped).toBe(true);
    expect(d.datasets[0].fill).toBe(true);
    expect(d.datasets[0].borderColor).toBe(tc('accent-ink'));
  });

  it('few points get dots, many points do not', () => {
    mount(base());
    goto('เงินลงทุนสะสม');
    expect(lastLine().data.datasets[0].pointRadius).toBe(3);
    act(() => root!.unmount()); container!.remove();
    const many = mkAsset('m', { trades: Array.from({ length: 25 }, (_, i) => trade(`t${i}`, `2026-01-${String(i + 1).padStart(2, '0')}`, 'buy', 1, 10)) });
    mount(mkPortfolio([many]));
    goto('เงินลงทุนสะสม');
    expect(lastLine().data.datasets[0].pointRadius).toBe(0);
  });

  it('exactly 24 points still get dots', () => {
    const a = mkAsset('m', { trades: Array.from({ length: 24 }, (_, i) => trade(`t${i}`, `2026-01-${String(i + 1).padStart(2, '0')}`, 'buy', 1, 10)) });
    mount(mkPortfolio([a]));
    goto('เงินลงทุนสะสม');
    expect(lastLine().data.datasets[0].pointRadius).toBe(3);
  });

  it('tooltip and axis in baht; description names the latest total', () => {
    mount(base());
    goto('เงินลงทุนสะสม');
    const o = lastLine().options;
    expect(o.plugins.tooltip.callbacks.label({ raw: 1269 })).toBe('฿1,269.00');
    expect(o.scales.y.ticks.callback(2000)).toBe('฿2,000.00');
    expect(o.scales.x.ticks.maxTicksLimit).toBe(8);
    expect(container!.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe('เงินลงทุนสะสม ล่าสุด ฿1,269.00');
  });

  it('no trades at all: a message', () => {
    mount(mkPortfolio([mkAsset('a', { units: 1, trades: [] })]));
    goto('เงินลงทุนสะสม');
    expect(text()).toContain('ยังไม่มีรายการซื้อขาย');
    expect(h.lines.length).toBe(0);
  });

  it('updates when the assets change', () => {
    mount(base());
    goto('เงินลงทุนสะสม');
    rerender(mkPortfolio([mkAsset('n', { units: 1, trades: [trade('x', '2026-05-05', 'buy', 1, 42)] })]));
    expect(lastLine().data.datasets[0].data).toEqual([42]);
  });
});

describe('CostVsValue history tab', () => {
  const dayNum = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86_400_000;
  const withHistory = (history: Portfolio['history'], totals: Partial<Portfolio['totals']> = { marketValue: 330, cost: 300 }) =>
    mkPortfolio([alpha()], totals, { history });

  it('with fewer than two days it explains and counts the days it has', () => {
    mount(withHistory([]));
    goto('มูลค่าตามเวลา');
    expect(text()).toContain('กราฟจะขึ้นเมื่อมีข้อมูลอย่างน้อย 2 วัน (ตอนนี้มี 1 วัน)');
    expect(h.lines.length).toBe(0);
  });

  it('an empty portfolio with no history says 0 days', () => {
    mount(mkPortfolio([alpha()], { marketValue: 0, cost: 0 }, { history: [] }));
    goto('มูลค่าตามเวลา');
    expect(text()).toContain('(ตอนนี้มี 0 วัน)');
  });

  it('a snapshot from today is replaced by the live figures, so one day is still not enough', () => {
    mount(withHistory([{ date: '2026-10-08', marketValue: 1, cost: 1 }]));
    goto('มูลค่าตามเวลา');
    expect(text()).toContain('(ตอนนี้มี 1 วัน)');
  });

  it('draws value and cost lines on a real-day x axis, ending with today from live totals', () => {
    mount(withHistory([{ date: '2026-10-01', marketValue: 300, cost: 280 }, { date: '2026-10-05', marketValue: 320, cost: 290 }]));
    goto('มูลค่าตามเวลา');
    const [value, cost] = lastLine().data.datasets;
    expect(value.label).toBe('มูลค่า');
    expect(cost.label).toBe('ต้นทุน');
    expect(value.data).toEqual([
      { x: dayNum('2026-10-01'), y: 300 }, { x: dayNum('2026-10-05'), y: 320 }, { x: dayNum('2026-10-08'), y: 330 },
    ]);
    expect(cost.data.map((p: { y: number }) => p.y)).toEqual([280, 290, 300]);
    expect(cost.stepped).toBe(true);
    expect(cost.borderDash).toEqual([4, 4]);
    expect(value.fill).toBe(true);
  });

  it('dots only for short series', () => {
    mount(withHistory([{ date: '2026-10-01', marketValue: 300, cost: 280 }]));
    goto('มูลค่าตามเวลา');
    expect(lastLine().data.datasets[0].pointRadius).toBe(3);
    expect(lastLine().data.datasets[1].pointRadius).toBe(0);
    act(() => root!.unmount()); container!.remove();
    const long = Array.from({ length: 24 }, (_, i) => ({ date: `2026-09-${String(i + 1).padStart(2, '0')}`, marketValue: 1, cost: 1 }));
    mount(withHistory(long)); // 24 + today = 25
    goto('มูลค่าตามเวลา');
    expect(lastLine().data.datasets[0].pointRadius).toBe(0);
  });

  it('exactly 24 points keep their dots', () => {
    const long = Array.from({ length: 23 }, (_, i) => ({ date: `2026-09-${String(i + 1).padStart(2, '0')}`, marketValue: 1, cost: 1 }));
    mount(withHistory(long)); // 23 + today = 24
    goto('มูลค่าตามเวลา');
    expect(lastLine().data.datasets[0].pointRadius).toBe(3);
  });

  it('tooltip title is the day, its lines carry the series name and baht; x axis ticks are dates', () => {
    mount(withHistory([{ date: '2026-10-01', marketValue: 300, cost: 280 }]));
    goto('มูลค่าตามเวลา');
    const o = lastLine().options;
    expect(o.scales.x.type).toBe('linear');
    expect(o.plugins.tooltip.callbacks.title([{ parsed: { x: dayNum('2026-10-01') } }])).toBe(formatThaiDateShort('2026-10-01'));
    expect(o.plugins.tooltip.callbacks.label({ dataset: { label: 'มูลค่า' }, parsed: { y: 1234.5 } })).toBe(' มูลค่า: ฿1,234.50');
    expect(o.scales.x.ticks.callback(dayNum('2026-10-05'))).toBe(formatThaiDateShort('2026-10-05'));
    expect(o.scales.x.ticks.callback(String(dayNum('2026-10-05')))).toBe(formatThaiDateShort('2026-10-05'));
    expect(o.scales.x.ticks.callback(dayNum('2026-10-05') + 0.6)).toBe(formatThaiDateShort('2026-10-06')); // a half-way tick lands on the nearest day
    expect(o.scales.x.ticks.maxTicksLimit).toBe(8);
    expect(o.scales.x.ticks.precision).toBe(0);
    expect(o.scales.y.ticks.callback(10)).toBe('฿10.00');
    expect(o.interaction).toEqual({ mode: 'index', intersect: false });
    expect(o.plugins.legend.display).toBe(false);
  });

  it('describes the latest value and cost for screen readers', () => {
    mount(withHistory([{ date: '2026-10-01', marketValue: 300, cost: 280 }]));
    goto('มูลค่าตามเวลา');
    expect(container!.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe('มูลค่าพอร์ตตามเวลา ล่าสุด ฿330.00 ต้นทุน ฿300.00');
  });

  it('follows new totals even when the history array is the same object', () => {
    const history = [{ date: '2026-10-01', marketValue: 300, cost: 280 }];
    mount(withHistory(history, { marketValue: 330, cost: 300 }));
    goto('มูลค่าตามเวลา');
    rerender(withHistory(history, { marketValue: 400, cost: 310 }));
    expect(lastLine().data.datasets[0].data.at(-1).y).toBe(400);
    expect(lastLine().data.datasets[1].data.at(-1).y).toBe(310);
  });

  it('follows new history even when the totals object is the same', () => {
    const totals = { marketValue: 330, cost: 300 };
    const p1 = withHistory([{ date: '2026-10-01', marketValue: 300, cost: 280 }], totals);
    mount(p1);
    goto('มูลค่าตามเวลา');
    const p2 = { ...p1, history: [{ date: '2026-09-01', marketValue: 100, cost: 90 }, { date: '2026-10-01', marketValue: 300, cost: 280 }] };
    rerender(p2);
    expect(lastLine().data.datasets[0].data).toHaveLength(3);
  });
});
