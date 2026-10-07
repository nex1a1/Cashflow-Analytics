// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { renderHook, act } from '@/test-utils/renderHook';
import { useChartOptions } from '../useChartOptions';
import { tc } from '@/constants/theme';

const h = vi.hoisted(() => ({ ctx: {} as Record<string, any> }));
vi.mock('@/views/Dashboard/context/DashboardContext', () => ({ useDashboardContext: () => h.ctx }));

const set = (over: Record<string, unknown> = {}, analytics: Record<string, unknown> | null = { mainChartType: 'combo' }) => {
  h.ctx = { analytics, filterPeriod: '2026-01', ...over };
};

type Props = Parameters<typeof useChartOptions>[0];
const opts = (props: Partial<Props> = {}): any => {
  const { result, unmount } = renderHook(() => useChartOptions({ chartViewType: 'bar', isBreakdown: false, isLogScale: false, ...props }));
  unmount();
  return result.current;
};

beforeEach(() => set());
afterEach(() => { document.body.innerHTML = ''; });

describe('useChartOptions — nothing to draw', () => {
  it('returns an empty object before analytics exist', () => {
    set({}, null);
    expect(opts()).toEqual({});
  });
});

describe('useChartOptions — which base options', () => {
  it('a combo period on the bar view gets the secondary axis for net cashflow', () => {
    expect(opts().scales.y1).toMatchObject({ position: 'right' });
  });

  it('a bar-only or daily period has no secondary axis', () => {
    for (const mainChartType of ['bar', 'daily-expense', undefined]) {
      set({}, { mainChartType });
      expect(opts().scales.y1).toBeUndefined();
    }
  });

  it('the line view starts at zero and never has the secondary axis (even for a combo period)', () => {
    const o = opts({ chartViewType: 'line' });
    expect(o.scales.y.beginAtZero).toBe(true);
    expect(o.scales.y1).toBeUndefined();
  });

  it('a breakdown drops the secondary axis on bars too (there is no net line to scale)', () => {
    expect(opts({ isBreakdown: true, chartViewType: 'bar' }).scales.y1).toBeUndefined();
    const line = opts({ isBreakdown: true, chartViewType: 'line' });
    expect(line.scales.y1).toBeUndefined();
    expect(line.scales.y.beginAtZero).toBe(true);
  });
});

describe('useChartOptions — stacking and scale', () => {
  it('stacks only a breakdown drawn as bars', () => {
    const stacked = opts({ isBreakdown: true, chartViewType: 'bar' });
    expect(stacked.scales.x.stacked).toBe(true);
    expect(stacked.scales.y.stacked).toBe(true);
    for (const o of [opts({ isBreakdown: true, chartViewType: 'line' }), opts({ isBreakdown: false, chartViewType: 'bar' }), opts({ chartViewType: 'line' })]) {
      expect(o.scales.x.stacked).toBe(false);
      expect(o.scales.y.stacked).toBe(false);
    }
  });

  it('log scale: logarithmic axis starting at 1 (log of 0 is undefined), no headroom', () => {
    const y = opts({ isLogScale: true }).scales.y;
    expect(y.type).toBe('logarithmic');
    expect(y.min).toBe(1);
    expect(y.grace).toBeUndefined();
  });

  it('linear scale has no forced minimum', () => {
    const y = opts({ isLogScale: false }).scales.y;
    expect(y.type).toBe('linear');
    expect(y.min).toBeUndefined();
  });

  it('log scale applies to the line view too', () => {
    const y = opts({ chartViewType: 'line', isLogScale: true }).scales.y;
    expect(y).toMatchObject({ type: 'logarithmic', min: 1 });
  });

  it('keeps the base x axis settings when it adds stacking', () => {
    expect(opts({ isBreakdown: true }).scales.x.ticks.font.size).toBeGreaterThanOrEqual(11);
  });
});

describe('useChartOptions — x axis skipping follows the period', () => {
  it('a single month or single pay cycle shows every day', () => {
    for (const filterPeriod of ['2026-03', 'cycle:2026-03']) {
      set({ filterPeriod });
      expect(opts().scales.x.ticks.autoSkip).toBe(false);
    }
  });

  it('a year, a range, several months or everything may skip labels', () => {
    for (const filterPeriod of ['2026', '2026-01_2026-03', '2026-01,2026-03', 'ALL', 'cycle:2026-01_2026-12']) {
      set({ filterPeriod });
      expect(opts().scales.x.ticks.autoSkip).toBe(true);
    }
  });

});

describe('useChartOptions — follows its inputs on the same mounted chart', () => {
  let props: Props;
  let result: { current: any };
  let rerender: () => void;
  let teardown: () => void;
  beforeEach(() => {
    props = { chartViewType: 'bar', isBreakdown: false, isLogScale: false };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    result = { current: undefined };
    const Probe = () => { result.current = useChartOptions(props); return null; };
    rerender = () => act(() => root.render(<Probe />));
    teardown = () => act(() => root.unmount());
    rerender();
  });
  afterEach(() => teardown());

  it('period (same analytics object — only the period changed)', () => {
    const analytics = { mainChartType: 'combo' };
    set({ filterPeriod: '2026-01' }, analytics);
    rerender();
    expect(result.current.scales.x.ticks.autoSkip).toBe(false);
    set({ filterPeriod: '2026' }, analytics);
    rerender();
    expect(result.current.scales.x.ticks.autoSkip).toBe(true);
  });

  it('the kind of period (combo ↔ plain bars)', () => {
    expect(result.current.scales.y1).toBeDefined();
    set({}, { mainChartType: 'bar' });
    rerender();
    expect(result.current.scales.y1).toBeUndefined();
  });

  it('log scale, breakdown and view type', () => {
    props = { ...props, isLogScale: true };
    rerender();
    expect(result.current.scales.y.type).toBe('logarithmic');
    props = { ...props, isBreakdown: true };
    rerender();
    expect(result.current.scales.x.stacked).toBe(true);
    props = { ...props, chartViewType: 'sankey' };
    rerender();
    expect(result.current.scales).toBeUndefined();
  });

  it('analytics going away', () => {
    set({}, null);
    rerender();
    expect(result.current).toEqual({});
  });
});

describe('useChartOptions — tooltip (bar / line)', () => {
  it('lists every dataset at the hovered position, without needing to hit a bar', () => {
    const t = opts().plugins.tooltip;
    expect(t.mode).toBe('index');
    expect(t.intersect).toBe(false);
  });

  it('hides series with nothing on that day, but keeps a negative value (a deficit month)', () => {
    const { filter } = opts().plugins.tooltip;
    expect(filter({ raw: 500 })).toBe(true);
    expect(filter({ raw: 0.5 })).toBe(true);
    expect(filter({ raw: 0 })).toBe(false);
    expect(filter({ raw: null })).toBe(false);
    expect(filter({ raw: undefined })).toBe(false);
    expect(filter({ raw: -1200 })).toBe(true);
  });

  it('keeps the money label from the base options', () => {
    const label = opts().plugins.tooltip.callbacks.label;
    expect(label({ dataset: { label: 'รายรับ' }, parsed: { y: 30000 } })).toBe(' รายรับ: 30,000.00 ฿');
  });

  it('a breakdown adds a total line under the series; a plain chart does not', () => {
    const items = [{ parsed: { y: 100 } }, { parsed: { y: 250.5 } }, { parsed: { y: null } }, { parsed: {} }];
    expect(opts({ isBreakdown: true, chartViewType: 'bar' }).plugins.tooltip.callbacks.footer(items)).toBe('รวม: 350.50 ฿');
    expect(opts({ isBreakdown: false }).plugins.tooltip.callbacks.footer(items)).toBe('');
  });

  it('no total for a single series (it would repeat the line above it)', () => {
    const footer = opts({ isBreakdown: true }).plugins.tooltip.callbacks.footer;
    expect(footer([{ parsed: { y: 100 } }])).toBe('');
    expect(footer([])).toBe('');
  });
});

describe('useChartOptions — Sankey', () => {
  const sankey = () => opts({ chartViewType: 'sankey' });
  const cb = () => sankey().plugins.tooltip.callbacks;

  it('is a flat, legend-less chart that fills its box', () => {
    const o = sankey();
    expect(o.responsive).toBe(true);
    expect(o.maintainAspectRatio).toBe(false);
    expect(o.plugins.legend.display).toBe(false);
    expect(o.scales).toBeUndefined();
    expect(o.plugins.tooltip.cornerRadius).toBe(0);
  });

  it('tooltip title: "from → to" without the amount in parentheses', () => {
    expect(cb().title([{ raw: { from: 'ค่ากิน (฿1,000)', to: 'ข้าว (฿400)' } }])).toBe('ค่ากิน → ข้าว');
  });

  it('keeps a name with no trailing parenthesis, and a parenthesis in the middle of one', () => {
    expect(cb().title([{ raw: { from: 'รายรับ', to: 'ค่ากิน (ข้าว) พิเศษ' } }])).toBe('รายรับ → ค่ากิน (ข้าว) พิเศษ');
  });

  it('title is empty with no item', () => {
    expect(cb().title([])).toBe('');
    expect(cb().title([{}])).toBe('');
  });

  it('label: the flow with its percentage, or a dash when there is none', () => {
    const c = (item: unknown) => ({ dataset: { data: [item] }, dataIndex: 0 });
    expect(cb().label(c({ flow: 1500, percent: '25.0%' }))).toEqual(['฿1,500.00 (25.0%)']);
    expect(cb().label(c({ flow: 1500 }))).toEqual(['฿1,500.00 (-)']);
    expect(cb().label({ dataset: { data: [] }, dataIndex: 3 })).toEqual([]);
    expect(cb().label({ dataIndex: 0 })).toEqual([]);
  });

  describe('label: split of a category by NEED / WANT / SAVE', () => {
    const c = (item: unknown) => ({ dataset: { data: [item] }, dataIndex: 0 });

    it('lists the parts with their share when a category is mixed, and marks the path being hovered', () => {
      const lines = cb().label(c({
        flow: 600, percent: '60%', from: 'ค่ากิน (Need)', to: 'ข้าว',
        allocBreakdown: { need: 600, want: 300, savings: 100, total: 1000 },
      }));
      expect(lines[0]).toBe('฿600.00 (60%)');
      expect(lines).toContain('รวมทั้งหมวด: ฿1,000.00');
      expect(lines).toContain('  Need: ฿600.00 (60.0%) ◄ (เส้นทางนี้)');
      expect(lines).toContain('  Want: ฿300.00 (30.0%)');
      expect(lines).toContain('  Savings: ฿100.00 (10.0%)');
    });

    it('marks whichever part the hovered flow comes from', () => {
      const lines = cb().label(c({
        flow: 300, from: 'ค่ากิน (Want)', allocBreakdown: { need: 600, want: 300, total: 900 },
      }));
      expect(lines).toContain('  Want: ฿300.00 (33.3%) ◄ (เส้นทางนี้)');
      expect(lines).toContain('  Need: ฿600.00 (66.7%)');
    });

    it('two parts are enough for a split — savings counts as a part', () => {
      const lines = cb().label(c({ flow: 600, allocBreakdown: { need: 600, want: 0, savings: 400, total: 1000 } }));
      expect(lines).toContain('  Savings: ฿400.00 (40.0%)');
      expect(lines).toContain('  Need: ฿600.00 (60.0%)');
    });

    it('leaves out a part that is zero', () => {
      const lines = cb().label(c({ flow: 1, allocBreakdown: { need: 600, want: 400, savings: 0, total: 1000 } }));
      expect(lines.some((l: string) => l.includes('Savings'))).toBe(false);
    });

    it('a single-part category needs no split', () => {
      expect(cb().label(c({ flow: 500, allocBreakdown: { need: 500, want: 0, savings: 0, total: 500 } }))).toEqual(['฿500.00 (-)']);
      expect(cb().label(c({ flow: 0, allocBreakdown: {} }))).toEqual(['฿0.00 (-)']);
    });

    it('with no total given, the split is of the flow itself', () => {
      const lines = cb().label(c({ flow: 800, allocBreakdown: { need: 600, want: 200 } }));
      expect(lines).toContain('รวมทั้งหมวด: ฿800.00');
      expect(lines).toContain('  Need: ฿600.00 (75.0%)');
    });

    it('a zero total does not divide by zero', () => {
      const lines = cb().label(c({ flow: 0, allocBreakdown: { need: 600, want: 200, total: 0 } }));
      expect(lines).toContain('  Need: ฿600.00 (0.0%)');
    });
  });

  describe('tooltip colours follow the hovered flow', () => {
    const t = () => sankey().plugins.tooltip;

    it('background and border take the flow colour, else the surface / line', () => {
      const withColour = { tooltipItems: [{ element: { options: { backgroundColor: '#123456' } } }] };
      expect(t().backgroundColor(withColour)).toBe('#123456');
      expect(t().borderColor(withColour)).toBe('#123456');
      expect(t().backgroundColor({ tooltipItems: [{}] })).toBe(tc('surface'));
      expect(t().borderColor({ tooltipItems: [{}] })).toBe(tc('line'));
    });

    it('text is on the display / secondary ink', () => {
      expect(t().titleColor()).toBe(tc('ink-display'));
      expect(t().bodyColor()).toBe(tc('gray-300'));
    });

    it('the swatch beside a line is the flow colour (muted when it has none), square', () => {
      expect(cb().labelColor({ raw: { color: '#ABCDEF' } })).toEqual({ borderColor: '#ABCDEF', backgroundColor: '#ABCDEF', borderRadius: 0 });
      expect(cb().labelColor({ raw: {} }).backgroundColor).toBe(tc('ink-muted'));
      expect(cb().labelColor({}).backgroundColor).toBe(tc('ink-muted'));
    });
  });
});
