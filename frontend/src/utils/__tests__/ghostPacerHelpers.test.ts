import { describe, it, expect } from 'vitest';
import { buildCumulativeDailySeries, calculateGhostPacerData } from '../ghostPacerHelpers';

describe('ghostPacerHelpers', () => {
  it('builds cumulative daily series properly', () => {
    const dailyMap: Record<string, number> = {
      '2026-09-01': 100,
      '2026-09-02': 250,
      '2026-09-03': 50,
    };

    const result = buildCumulativeDailySeries(2026, 8, dailyMap, 3);
    expect(result.series).toEqual([100, 350, 400]);
    expect(result.total).toBe(400);
    expect(result.daysCount).toBe(30);
  });

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
