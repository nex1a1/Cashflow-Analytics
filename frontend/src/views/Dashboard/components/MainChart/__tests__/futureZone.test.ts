import { describe, it, expect } from 'vitest';
import { resolveFutureZone, applyPlanStyle, withAlpha, planTickStyle } from '../futureZone';

const months = ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];

describe('resolveFutureZone', () => {
  it('marks the current month and starts the plan after it', () => {
    expect(resolveFutureZone(months, 'month', '2026', '2026-10-18')).toEqual({ currentIdx: 2, futureFrom: 3, unit: 'month' });
  });

  it('follows pay cycles: 25 Oct belongs to cycle 2026-10, 24 Oct to 2026-09', () => {
    expect(resolveFutureZone(months, 'month', 'cycle:2026', '2026-10-25')?.currentIdx).toBe(2);
    expect(resolveFutureZone(months, 'month', 'cycle:2026', '2026-10-24')?.currentIdx).toBe(1);
  });

  it('daily axis uses exact dates', () => {
    const days = ['2026-10-17', '2026-10-18', '2026-10-19'];
    expect(resolveFutureZone(days, 'day', '2026-10', '2026-10-18')).toEqual({ currentIdx: 1, futureFrom: 2, unit: 'day' });
  });

  it('returns null when the whole range is in the past, all-plan when it is in the future', () => {
    expect(resolveFutureZone(months, 'month', '2026', '2027-02-01')).toBeNull();
    expect(resolveFutureZone(months, 'month', '2026', '2026-01-01')).toEqual({ currentIdx: -1, futureFrom: 0, unit: 'month' });
    expect(resolveFutureZone([], 'month', '2026', '2026-10-18')).toBeNull();
  });
});

describe('applyPlanStyle', () => {
  const zone = { currentIdx: 1, futureFrom: 2, unit: 'month' as const };

  it('leaves a dataset alone when nothing is planned', () => {
    const ds = { type: 'bar', data: [1, 2], backgroundColor: '#10B981' };
    expect(applyPlanStyle(ds, { ...zone, futureFrom: 2 })).toBe(ds);
    expect(applyPlanStyle(ds, null)).toBe(ds);
  });

  it('bars: solid before the boundary, plan fill after', () => {
    const ds = applyPlanStyle({ type: 'bar', data: [1, 2, 3], backgroundColor: '#10B981', borderColor: '#10B981' }, zone);
    expect(ds.backgroundColor({ dataIndex: 1 })).toBe('#10B981');
    expect(ds.backgroundColor({ dataIndex: 2 })).not.toBe('#10B981'); // pattern or translucent fallback
  });

  it('lines: dashed only into the plan, hollow points after', () => {
    const ds = applyPlanStyle({ type: 'line', data: [1, 2, 3], borderColor: '#fff', backgroundColor: '#fff' }, zone);
    expect(ds.segment.borderDash({ p1DataIndex: 1 })).toBeUndefined();
    expect(ds.segment.borderDash({ p1DataIndex: 2 })).toEqual([6, 6]);
    expect(ds.pointBackgroundColor({ dataIndex: 1 })).toBe('#fff');
    expect(ds.pointBackgroundColor({ dataIndex: 2 })).not.toBe('#fff');
  });
});

describe('helpers', () => {
  it('withAlpha converts hex and rgb', () => {
    expect(withAlpha('#10B981', 0.5)).toBe('rgba(16, 185, 129, 0.5)');
    expect(withAlpha('rgb(1, 2, 3)', 0.2)).toBe('rgba(1, 2, 3, 0.2)');
  });

  it('planTickStyle: current accent+bold, plan muted', () => {
    const t = planTickStyle({ currentIdx: 1, futureFrom: 2, unit: 'month' });
    expect(t.font.size).toBe(11);
    expect(t.font.weight({ index: 1 })).toBe('700');
    expect(t.font.weight({ index: 0 })).toBe('400');
    expect(t.color({ index: 3 })).not.toBe(t.color({ index: 0 }));
    expect(t.color({ index: 1 })).not.toBe(t.color({ index: 0 }));
  });
});
