import { describe, it, expect } from 'vitest';
import { periodSpanDays, isDailyChartAllowed, effectiveChartGroupBy } from '../chartGrouping';

describe('chartGrouping', () => {
  it('allows daily for a month, a cycle, a quarter and short ranges', () => {
    for (const p of ['2026-10', 'cycle:2026-10', '2026-Q3', '2026-07_2026-09', 'cycle:2026-07_2026-09']) {
      expect(isDailyChartAllowed(p), p).toBe(true);
    }
  });

  it('refuses daily for halves, years, long ranges, multi-month picks and all', () => {
    for (const p of ['2026', '2026-H1', '2026-01_2026-12', 'cycle:2026-01_2026-12', '2026-01,2026-05,2026-09,2026-12', 'ALL', 'cycle:ALL']) {
      expect(isDailyChartAllowed(p), p).toBe(false);
    }
  });

  it('measures the span in days', () => {
    expect(periodSpanDays('2026-10')).toBe(31);
    expect(periodSpanDays('2026')).toBe(365);
    expect(periodSpanDays('ALL')).toBe(Infinity);
  });

  it('only overrides a daily preference', () => {
    expect(effectiveChartGroupBy('daily', '2026')).toBe('monthly');
    expect(effectiveChartGroupBy('daily', '2026-10')).toBe('daily');
    expect(effectiveChartGroupBy('monthly', '2026')).toBe('monthly');
  });
});
