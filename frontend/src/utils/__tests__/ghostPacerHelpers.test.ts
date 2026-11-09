import { describe, it, expect } from 'vitest';
import { calculateGhostPacerData, paceTone } from '../ghostPacerHelpers';

describe('ghostPacerHelpers', () => {
  it('calculates ghost pacer comparisons when current spend is ahead (saving more)', () => {
    const dailyMap: Record<string, number> = {
      // Current month (Sept): Day 1: 50, Day 2: 50 -> total 100
      '2026-09-01': 50,
      '2026-09-02': 50,
      // Prev month (August): Day 1: 150, Day 2: 200 -> total 350
      '2026-08-01': 150,
      '2026-08-02': 200,
      '2026-08-03': 100,
    };

    const pacer = calculateGhostPacerData({
      globalDailySum: dailyMap,
      filterPeriod: '2026-09',
      isCurrentMonth: false, // will use lastDayOfMonth or we can pass
      projectedExpense: 1500,
    });

    expect(pacer.hasData).toBe(true);
    expect(pacer.currentPeriod).toBe('2026-09');
    expect(pacer.prevPeriod).toBe('2026-08');
    expect(pacer.lastDayOfMonth).toBe(30);
    // When isCurrentMonth is false, currentDay is 30
    expect(pacer.ghostTotalExpense).toBe(450);
  });

  it('correctly labels LEAD when spending is significantly lower than ghost', () => {
    const dailyMap: Record<string, number> = {
      '2026-09-01': 50,
      '2026-08-01': 500,
    };

    const pacer = calculateGhostPacerData({
      globalDailySum: dailyMap,
      filterPeriod: '2026-09',
      isCurrentMonth: false,
      projectedExpense: 1000,
    });

    // deltaVsGhost = 50 - 500 = -450 -> LEAD
    expect(pacer.paceStatus.code).toBe('LEAD');
    expect(pacer.deltaVsGhost).toBe(-450);
  });

  it('compares pay cycles (25 → 24) in cycle mode', () => {
    const pacer = calculateGhostPacerData({
      globalDailySum: { '2026-08-25': 300, '2026-09-24': 100, '2026-07-25': 200, '2026-08-24': 50 },
      filterPeriod: 'cycle:2026-08',
      isCurrentMonth: false,
      projectedExpense: 0,
    });

    expect(pacer.currentPeriod).toBe('2026-08');
    expect(pacer.prevPeriod).toBe('2026-07');
    expect(pacer.lastDayOfMonth).toBe(31); // 25 Aug – 24 Sep
    expect(pacer.currentSpendToDate).toBe(400);
    expect(pacer.ghostTotalExpense).toBe(250);
  });

  it('handles multi-month period gracefully by returning hasData: false', () => {
    const pacer = calculateGhostPacerData({
      globalDailySum: {},
      filterPeriod: 'ALL',
      isCurrentMonth: false,
      projectedExpense: 0,
    });

    expect(pacer.hasData).toBe(false);
  });
});

describe('gap drivers', () => {
  const info = (id: string) => ({ name: id.toUpperCase() });
  const pacer = (categoryDailySum: Record<string, Record<string, number>>, filterPeriod = '2026-09', globalDailySum: Record<string, number> = {}) =>
    calculateGhostPacerData({ globalDailySum, filterPeriod, isCurrentMonth: false, projectedExpense: 0, categoryDailySum, categoryInfo: info });

  it('nothing to compare with: no causes to claim', () => {
    const g = pacer({ a: { '2026-09-02': 100 } }, '2026-09', { '2026-09-02': 100 });
    expect(g.gapDrivers).toEqual([]);
    expect(g.gapOthers).toBe(0);
  });

  it('a category that did not change is not a cause', () => {
    const g = pacer(
      { a: { '2026-09-02': 100, '2026-08-02': 100 }, b: { '2026-09-02': 50 } },
      '2026-09', { '2026-09-02': 150, '2026-08-02': 100 },
    );
    expect(g.gapDrivers.map(d => d.id)).toEqual(['b']);
  });

  it('a shorter last month counts all of its days', () => {
    const g = pacer(
      { a: { '2026-03-31': 100, '2026-02-28': 40 } },
      '2026-03', { '2026-03-31': 100, '2026-02-28': 40 },
    );
    expect(g.gapDrivers[0]).toMatchObject({ current: 100, previous: 40, delta: 60 });
  });

  it('pay cycles compare cycle against cycle', () => {
    const g = pacer(
      { a: { '2026-08-25': 300, '2026-07-25': 200, '2026-07-24': 999 } },
      'cycle:2026-08', { '2026-08-25': 300, '2026-07-25': 200, '2026-07-24': 999 },
    );
    expect(g.gapDrivers[0]).toMatchObject({ current: 300, previous: 200 });
  });

  it('equal swings keep a stable order', () => {
    const g = pacer(
      { b: { '2026-09-02': 100 }, a: { '2026-08-02': 100 }, c: { '2026-09-03': 10 } },
      '2026-09', { '2026-09-02': 100, '2026-09-03': 10, '2026-08-02': 100 },
    );
    expect(g.gapDrivers.map(d => d.id)).toEqual(['a', 'b', 'c']);
  });

  it('floating-point dust is neither a cause nor a remainder', () => {
    const g = pacer(
      { a: { '2026-09-02': 0.1 + 0.2, '2026-08-02': 0.3 } },
      '2026-09', { '2026-09-02': 0.1 + 0.2, '2026-08-02': 0.3 },
    );
    expect(g.gapDrivers).toEqual([]);
    expect(g.gapOthers).toBe(0);
  });

  it('without category data the comparison still works', () => {
    const g = calculateGhostPacerData({ globalDailySum: { '2026-08-02': 100 }, filterPeriod: '2026-09', isCurrentMonth: false, projectedExpense: 0 });
    expect(g.gapDrivers).toEqual([]);
  });
});

describe('finished months', () => {
  it('use the real total instead of a forecast', () => {
    const pacer = calculateGhostPacerData({
      globalDailySum: { '2026-09-05': 3000, '2026-08-05': 2000 },
      filterPeriod: '2026-09', isCurrentMonth: false, projectedExpense: 0,
    });
    expect(pacer.isCurrentMonth).toBe(false);
    expect(pacer.projectedExpense).toBe(3000);
    expect(pacer.deltaEom).toBe(1000);
  });

  it('the current month passes its forecast through', () => {
    const pacer = calculateGhostPacerData({
      globalDailySum: { '2026-09-05': 3000, '2026-08-05': 2000 },
      filterPeriod: '2026-09', isCurrentMonth: true, projectedExpense: 9000,
    });
    expect(pacer.isCurrentMonth).toBe(true);
    expect(pacer.projectedExpense).toBe(9000);
    expect(pacer.deltaEom).toBe(7000);
  });
});

describe('paceTone', () => {
  it('green when clearly lower, yellow within ±5%, red when clearly higher', () => {
    expect(paceTone(-100, 1000)).toBe('LEAD');
    expect(paceTone(-50, 1000)).toBe('TIED');
    expect(paceTone(50, 1000)).toBe('TIED');
    expect(paceTone(51, 1000)).toBe('TRAIL');
    expect(paceTone(0, 0)).toBe('TIED');
    expect(paceTone(10, 0)).toBe('TRAIL');
  });

  it('the 3-month benchmark averages only the months that had spending; a shorter month holds its last value', () => {
    // March 2026 (31 days). Feb (28 days): 280 on day 1. Jan: 100 on day 1, 50 on day 31. Dec: nothing → left out.
    const pacer = calculateGhostPacerData({
      globalDailySum: { '2026-02-01': 280, '2026-01-01': 100, '2026-01-31': 50 },
      filterPeriod: '2026-03', isCurrentMonth: false, projectedExpense: 0,
    });
    expect(pacer.benchmarkDailySeries).toHaveLength(31);
    expect(pacer.benchmarkDailySeries[0]).toBe(190); // (280 + 100) / 2
    expect(pacer.benchmarkDailySeries[29]).toBe(190);
    expect(pacer.benchmarkDailySeries[30]).toBe(215); // Feb stays at 280 on "day 31", Jan reaches 150
    expect(pacer.benchmarkSpendToDate).toBe(215);
  });

  it('no history at all: the benchmark is zero, not NaN', () => {
    const pacer = calculateGhostPacerData({ globalDailySum: { '2026-03-02': 50 }, filterPeriod: '2026-03', isCurrentMonth: false, projectedExpense: 0 });
    expect(pacer.benchmarkDailySeries.every(v => v === 0)).toBe(true);
    expect(pacer.benchmarkSpendToDate).toBe(0);
  });
});
