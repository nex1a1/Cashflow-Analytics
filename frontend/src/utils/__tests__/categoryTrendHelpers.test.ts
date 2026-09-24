import { describe, it, expect } from 'vitest';
import { buildCategoryTrends } from '../categoryTrendHelpers';

describe('buildCategoryTrends', () => {
  const keys = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];

  it('compares latest complete period with prior complete period (MoM) in standard mode', () => {
    const map = {
      family: { '2026-01': 100, '2026-02': 300, '2026-03': 400, '2026-04': 500, '2026-05': 600, '2026-06': 9999 },
      rent: { '2026-01': 4500, '2026-02': 4500, '2026-03': 4500, '2026-04': 4500, '2026-05': 4500 },
      future: { '2026-07': 999 },
    };
    // current is 2026-06 (in progress) -> latest complete is 2026-05, prior complete is 2026-04
    const [top, second, ...rest] = buildCategoryTrends(keys, map, '2026-06', false);

    expect(top.catId).toBe('family');
    expect(top.keys).toEqual(keys.slice(0, 6));
    expect(top.hasPartial).toBe(true);
    expect(top.latestKey).toBe('2026-05');
    expect(top.latestAmount).toBe(600);
    expect(top.priorKey).toBe('2026-04');
    expect(top.priorAmount).toBe(500);
    expect(top.comparisonType).toBe('mom');
    expect(top.pctChange).toBe(20); // (600 - 500) / 500 * 100 = 20%
    expect(top.delta).toBe(100);    // grew by 100 Baht MoM

    expect(second.catId).toBe('rent');
    expect(second.latestAmount).toBe(4500);
    expect(second.priorAmount).toBe(4500);
    expect(second.pctChange).toBe(0);
    expect(second.delta).toBe(0);

    expect(rest).toEqual([]); // future-only category dropped
  });

  it('compares latest complete period with overall period average in ALL mode', () => {
    const map = {
      family: { '2026-01': 100, '2026-02': 300, '2026-03': 400, '2026-04': 500, '2026-05': 600, '2026-06': 9999 },
    };
    const [t] = buildCategoryTrends(keys, map, '2026-06', true);

    expect(t.catId).toBe('family');
    expect(t.comparisonType).toBe('avg');
    expect(t.latestKey).toBe('2026-05');
    expect(t.latestAmount).toBe(600);
    expect(t.periodAvg).toBeCloseTo(11899 / 6, 2);
    // delta = 600 - (11899 / 6) = 600 - 1983.17 = -1383.17
    expect(t.delta).toBeCloseTo(600 - (11899 / 6), 2);
    expect(t.pctChange).toBeCloseTo(((600 - t.periodAvg) / t.periodAvg) * 100, 2);
  });

  it('returns null pctChange for newly introduced category with 0 prior spending', () => {
    const map = {
      gadgets: { '2026-01': 0, '2026-02': 0, '2026-03': 0, '2026-04': 0, '2026-05': 800 },
    };
    const [t] = buildCategoryTrends(keys, map, '2026-06', false);

    expect(t.catId).toBe('gadgets');
    expect(t.latestAmount).toBe(800);
    expect(t.priorAmount).toBe(0);
    expect(t.pctChange).toBeNull(); // displays "ใหม่" instead of infinite percentage
    expect(t.delta).toBe(800);
  });

  it('returns 0 pctChange when both latest and prior periods are 0', () => {
    const map = {
      seasonal: { '2026-01': 500, '2026-02': 0, '2026-03': 0, '2026-04': 0, '2026-05': 0 },
    };
    const [t] = buildCategoryTrends(keys, map, '2026-06', false);

    expect(t.catId).toBe('seasonal');
    expect(t.latestAmount).toBe(0);
    expect(t.priorAmount).toBe(0);
    expect(t.pctChange).toBe(0);
    expect(t.delta).toBe(0);
  });

  it('handles series with only 1 complete period gracefully', () => {
    const [t] = buildCategoryTrends(['2026-01', '2026-02'], { test: { '2026-01': 250 } }, '2026-02', false);

    expect(t.latestKey).toBe('2026-01');
    expect(t.latestAmount).toBe(250);
    expect(t.priorKey).toBeNull();
    expect(t.priorAmount).toBeNull();
    expect(t.pctChange).toBeNull();
    expect(t.delta).toBe(250);
  });
});
