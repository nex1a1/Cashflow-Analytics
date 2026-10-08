import { describe, it, expect } from 'vitest';
import { getComboChartOptions, getBarChartOptions, getLineChartOptions, getDoughnutChartOptions } from '../chartOptions';
import { tc } from '@/constants/theme';

const tick = (opts: any, axis: 'y' | 'y1' = 'y') => (v: unknown) => opts.scales[axis].ticks.callback(v);

describe('axis tick labels', () => {
  const f = tick(getLineChartOptions());

  it('shortens thousands and millions, and leaves small numbers alone', () => {
    expect(f(0)).toBe('0');
    expect(f(250)).toBe('250');
    expect(f(1000)).toBe('1.0k');
    expect(f(12_500)).toBe('12.5k');
    expect(f(1_000_000)).toBe('1.0M');
    expect(f(2_500_000)).toBe('2.5M');
  });

  it('shortens negative values the same way (a deficit month sits on the same axis)', () => {
    expect(f(-250)).toBe('−250');
    expect(f(-1000)).toBe('−1.0k');
    expect(f(-12_500)).toBe('−12.5k');
    expect(f(-2_500_000)).toBe('−2.5M');
  });

  it('passes a category label through untouched', () => {
    expect(f('ม.ค.')).toBe('ม.ค.');
  });

  it('the secondary (net cashflow) axis shortens the same way', () => {
    const g = tick(getComboChartOptions('linear', true, '#FFFFFF'), 'y1');
    expect(g(1500)).toBe('1.5k');
    expect(g(-1500)).toBe('−1.5k');
  });
});

describe('scales', () => {
  it('x ticks follow the autoSkip flag (a single month shows every day)', () => {
    expect((getComboChartOptions('linear', true) as any).scales.x.ticks.autoSkip).toBe(true);
    expect((getComboChartOptions('linear', false) as any).scales.x.ticks.autoSkip).toBe(false);
    expect((getLineChartOptions('linear', false) as any).scales.x.ticks.autoSkip).toBe(false);
  });

  it('linear y gets headroom, logarithmic does not', () => {
    expect((getComboChartOptions('linear') as any).scales.y).toMatchObject({ type: 'linear', grace: '15%' });
    const log = (getComboChartOptions('logarithmic') as any).scales.y;
    expect(log.type).toBe('logarithmic');
    expect(log.grace).toBeUndefined();
  });

  it('a line chart starts at zero; bars and combo do not force it', () => {
    expect((getLineChartOptions() as any).scales.y.beginAtZero).toBe(true);
    expect((getComboChartOptions() as any).scales.y.beginAtZero).toBeUndefined();
  });

  it('only a combo asked for a secondary colour gets the right-hand axis, drawn in that colour', () => {
    expect((getComboChartOptions() as any).scales.y1).toBeUndefined();
    const y1 = (getComboChartOptions('linear', true, '#ABCDEF') as any).scales.y1;
    expect(y1).toMatchObject({ type: 'linear', position: 'right', grace: '20%' });
    expect(y1.ticks.color).toBe('#ABCDEF');
    expect(y1.border.color).toBe('#ABCDEF66');
    expect(y1.grid.drawOnChartArea).toBe(false); // its grid must not double up with the main one
  });

  it('a bar chart is a combo without the secondary axis, even if one is asked for', () => {
    const bar = getBarChartOptions('linear', true) as any;
    expect(bar.scales.y1).toBeUndefined();
    expect(bar.scales.y.type).toBe('linear');
  });

  it('keeps text at the 11px floor and on the theme ink', () => {
    for (const o of [getComboChartOptions(), getLineChartOptions()] as any[]) {
      expect(o.scales.x.ticks.font.size).toBeGreaterThanOrEqual(11);
      expect(o.scales.y.ticks.font.size).toBeGreaterThanOrEqual(11);
      expect(o.scales.x.ticks.color).toBe(tc('ink-body'));
    }
    expect((getComboChartOptions('linear', true, '#FFFFFF') as any).scales.y1.ticks.font.size).toBeGreaterThanOrEqual(11);
  });
});

describe('tooltips', () => {
  const ctx = { dataset: { label: 'ค่ากิน' }, parsed: { y: 1234.5 }, label: 'อาหาร', raw: 1234.5 };

  it('combo / bar / line write "name: amount ฿"', () => {
    for (const o of [getComboChartOptions(), getBarChartOptions(), getLineChartOptions()] as any[]) {
      expect(o.plugins.tooltip.callbacks.label(ctx)).toBe(' ค่ากิน: 1,234.50 ฿');
    }
  });

  it('the doughnut uses the slice label and its raw value', () => {
    expect((getDoughnutChartOptions() as any).plugins.tooltip.callbacks.label(ctx)).toBe(' อาหาร: 1,234.50 ฿');
  });

  it('a flat tooltip with the theme colours and sharp corners', () => {
    const t = (getLineChartOptions() as any).plugins.tooltip;
    expect(t.backgroundColor).toBe(tc('surface'));
    expect(t.borderColor).toBe(tc('line'));
    expect(t.cornerRadius).toBe(0);
  });

  it('the legend is off (the page draws its own) and animation is off', () => {
    for (const o of [getComboChartOptions(), getLineChartOptions(), getDoughnutChartOptions()] as any[]) {
      expect(o.plugins.legend.display).toBe(false);
      expect(o.animation).toBe(false);
    }
  });

  it('the doughnut keeps a thin ring', () => {
    expect((getDoughnutChartOptions() as any).cutout).toBe('70%');
  });
});
