import { describe, it, expect } from 'vitest';
import { buildCategoryTrends } from '../categoryTrendHelpers';

describe('buildCategoryTrends', () => {
  const keys = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];

  it('compares last 3 complete periods with earlier average, excluding the in-progress and future ones', () => {
    const map = {
      family: { '2026-01': 100, '2026-02': 300, '2026-03': 400, '2026-04': 500, '2026-05': 600, '2026-06': 9999 },
      rent: { '2026-01': 4500, '2026-02': 4500, '2026-03': 4500, '2026-04': 4500, '2026-05': 4500 },
      future: { '2026-07': 999 },
    };
    const [top, second, ...rest] = buildCategoryTrends(keys, map, '2026-06');

    expect(top.catId).toBe('family');
    expect(top.keys).toEqual(keys.slice(0, 6));
    expect(top.hasPartial).toBe(true);
    expect(top.totalAmount).toBe(11899);
    expect(top.periodAvg).toBeCloseTo(11899 / 6, 2);
    expect(top.recentAvg).toBe(500);   // Mar–May
    expect(top.priorAvg).toBe(200);    // Jan–Feb
    expect(top.delta).toBe(300);
    expect(second.catId).toBe('rent');
    expect(second.totalAmount).toBe(22500);
    expect(second.periodAvg).toBe(22500 / 6);
    expect(second.delta).toBe(0);
    expect(rest).toEqual([]);          // future-only category dropped
  });

  it('has no prior average when there are 3 or fewer complete periods', () => {
    const [t] = buildCategoryTrends(['2026-01', '2026-02'], { a: { '2026-01': 50 } }, '2026-02');
    expect(t.priorAvg).toBeNull();
    expect(t.recentAvg).toBe(50);
    expect(t.totalAmount).toBe(50);
    expect(t.periodAvg).toBe(25);
  });

  it('yields recentAvg of 0 when expenses occurred only in prior periods and none in the last 3 complete periods', () => {
    // Jan & Feb had spending (avg 90), Mar-May had 0 spending
    const map = {
      gunpla: { '2026-01': 90, '2026-02': 90, '2026-03': 0, '2026-04': 0, '2026-05': 0 },
    };
    const [t] = buildCategoryTrends(keys, map, '2026-06');
    expect(t.catId).toBe('gunpla');
    expect(t.totalAmount).toBe(180);
    expect(t.periodAvg).toBe(30);     // 180 / 6 periods = 30
    expect(t.recentAvg).toBe(0);      // Mar–May avg = 0
    expect(t.priorAvg).toBe(90);     // Jan–Feb avg = 90
    expect(t.delta).toBe(-90);       // delta dropped by 90 (or -100%)
  });
});
