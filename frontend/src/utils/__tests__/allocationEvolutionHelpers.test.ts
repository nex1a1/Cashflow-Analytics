import { describe, it, expect } from 'vitest';
import { calculateAllocationEvolution } from '../allocationEvolutionHelpers';

const emptyMap = { need: {}, want: {}, savings: {} };

describe('allocationEvolutionHelpers', () => {
  it('is not eligible for a single-month filter', () => {
    const result = calculateAllocationEvolution(emptyMap, '2026-09', ['2026-09']);
    expect(result.eligible).toBe(false);
    expect(result.months).toEqual([]);
  });

  it('is eligible for a quarter filter and uses exactly its months', () => {
    const map = { need: { '2026-07': 100, '2026-08': 100, '2026-09': 100 }, want: {}, savings: {} };
    const result = calculateAllocationEvolution(map, '2026-Q3', ['2026-07', '2026-08', '2026-09']);

    expect(result.eligible).toBe(true);
    expect(result.months.map(m => m.ym)).toEqual(['2026-07', '2026-08', '2026-09']);
  });

  it('is eligible for a half-year, full-year, and ALL filter', () => {
    expect(calculateAllocationEvolution(emptyMap, '2026-H1', []).eligible).toBe(true);
    expect(calculateAllocationEvolution(emptyMap, '2026', []).eligible).toBe(true);
    expect(calculateAllocationEvolution(emptyMap, 'ALL', []).eligible).toBe(true);
  });

  it('requires at least 3 months for a custom range or multi-select filter', () => {
    const twoMonths = calculateAllocationEvolution(emptyMap, '2026-06_2026-07', ['2026-06', '2026-07']);
    expect(twoMonths.eligible).toBe(false);

    const threeMonths = calculateAllocationEvolution(emptyMap, '2026-06_2026-08', ['2026-06', '2026-07', '2026-08']);
    expect(threeMonths.eligible).toBe(true);

    const multi = calculateAllocationEvolution(emptyMap, '2026-01,2026-05,2026-09', ['2026-01', '2026-05', '2026-09']);
    expect(multi.eligible).toBe(true);
  });

  it('computes need/want/savings percentages that sum to 100 for a populated month', () => {
    const map = {
      need: { '2026-09': 500 },
      want: { '2026-09': 300 },
      savings: { '2026-09': 200 },
    };

    const result = calculateAllocationEvolution(map, '2026-Q3', ['2026-09']);
    const sept = result.months[0];

    expect(sept.total).toBe(1000);
    expect(sept.needPct).toBeCloseTo(50);
    expect(sept.wantPct).toBeCloseTo(30);
    expect(sept.savingsPct).toBeCloseTo(20);
  });

  it('trims the leading run of empty months so a new account is not shown as a wall of fake history', () => {
    const map = { need: { '2026-09': 100 }, want: {}, savings: {} };
    const result = calculateAllocationEvolution(map, '2026', ['2026-07', '2026-08', '2026-09']);

    expect(result.months.map(m => m.ym)).toEqual(['2026-09']);
  });

  it('reports zero percentages instead of NaN for an interior gap month after tracking started', () => {
    // Jul has data (anchors the trim), Aug is a logging gap, Sept has data again.
    const map = { need: { '2026-07': 100, '2026-09': 100 }, want: {}, savings: {} };
    const result = calculateAllocationEvolution(map, '2026-Q3', ['2026-07', '2026-08', '2026-09']);
    const aug = result.months.find(m => m.ym === '2026-08')!;

    expect(aug.total).toBe(0);
    expect(aug.needPct).toBe(0);
    expect(aug.wantPct).toBe(0);
    expect(aug.savingsPct).toBe(0);
  });

  it('flags hasData false when fewer than 2 months have any spend', () => {
    const map = { need: { '2026-09': 100 }, want: {}, savings: {} };
    const result = calculateAllocationEvolution(map, '2026', ['2026-01', '2026-09']);

    expect(result.hasData).toBe(false);
  });

  it('flags hasData true once at least 2 months have spend, and labels with the real month count', () => {
    const map = { need: { '2026-08': 100, '2026-09': 100 }, want: {}, savings: {} };
    const result = calculateAllocationEvolution(map, '2026', ['2026-08', '2026-09']);

    expect(result.hasData).toBe(true);
    expect(result.label).toBe('แนวโน้ม 2 เดือน');
  });

  it('uses a generic label when there is no data yet', () => {
    const result = calculateAllocationEvolution(emptyMap, '2026', ['2026-08', '2026-09']);
    expect(result.label).toBe('แนวโน้ม 50/30/20');
  });

  it('incorporates monthly income and computes surplus cashflow as savings', () => {
    const map = {
      need: { '2026-07': 10000 },
      want: { '2026-07': 7500 },
      savings: { '2026-07': 0 },
    };
    const incomeMap = { '2026-07': 25000 };
    const result = calculateAllocationEvolution(map, '2026-Q3', ['2026-07', '2026-08'], incomeMap);
    const jul = result.months.find(m => m.ym === '2026-07')!;

    expect(jul.total).toBe(25000);
    expect(jul.needAmt).toBe(10000);
    expect(jul.wantAmt).toBe(7500);
    expect(jul.savingsAmt).toBe(7500); // 25,000 - 17,500 surplus
    expect(jul.needPct).toBeCloseTo(40);
    expect(jul.wantPct).toBeCloseTo(30);
    expect(jul.savingsPct).toBeCloseTo(30);
  });

  it('properly pulls explicit investment transactions (like October 2025 scenario)', () => {
    const map = {
      need: { '2025-10': 9578 },
      want: { '2025-10': 12886 },
      savings: { '2025-10': 2200 }, // User invested 2,200 into stocks & gold
    };
    const incomeMap = { '2025-10': 23340 };
    const result = calculateAllocationEvolution(map, 'ALL', ['2025-09', '2025-10'], incomeMap);
    const oct = result.months.find(m => m.ym === '2025-10')!;

    // Total outflow + investment = 9578 + 12886 + 2200 = 24664
    expect(oct.total).toBe(24664);
    expect(oct.needAmt).toBe(9578);
    expect(oct.wantAmt).toBe(12886);
    expect(oct.savingsAmt).toBe(2200);
    expect(oct.needPct).toBeCloseTo(38.83, 1);
    expect(oct.wantPct).toBeCloseTo(52.25, 1);
    expect(oct.savingsPct).toBeCloseTo(8.92, 1);
    expect(oct.needPct + oct.wantPct + oct.savingsPct).toBeCloseTo(100, 1);
  });

  it('combines explicit investment with surplus when income exceeds total outflow', () => {
    const map = {
      need: { '2026-03': 12000 },
      want: { '2026-03': 6000 },
      savings: { '2026-03': 2000 },
    };
    const incomeMap = { '2026-03': 30000 };
    const result = calculateAllocationEvolution(map, '2026', ['2026-02', '2026-03'], incomeMap);
    const mar = result.months.find(m => m.ym === '2026-03')!;

    expect(mar.total).toBe(30000);
    expect(mar.savingsAmt).toBe(12000); // 2,000 explicit + 10,000 unspent surplus
    expect(mar.needPct).toBeCloseTo(40);
    expect(mar.wantPct).toBeCloseTo(20);
    expect(mar.savingsPct).toBeCloseTo(40);
  });

  it('excludes future months when excludeFuture is enabled', () => {
    const map = {
      need: { '2026-08': 500, '2026-09': 500, '2026-10': 500, '2026-11': 500 },
      want: {},
      savings: {},
    };
    const periodMonths = ['2026-08', '2026-09', '2026-10', '2026-11'];
    const result = calculateAllocationEvolution(map, 'ALL', periodMonths, undefined, true, '2026-09');

    expect(result.months.map(m => m.ym)).toEqual(['2026-08', '2026-09']);
  });

  it('handles more than 12 months (e.g. 19-month window) correctly', () => {
    const months19: string[] = [];
    const needMap: Record<string, number> = {};
    const incMap: Record<string, number> = {};

    // 2025-06 to 2026-12 (19 months)
    for (let m = 6; m <= 12; m++) {
      const ym = `2025-${String(m).padStart(2, '0')}`;
      months19.push(ym);
      needMap[ym] = 10000;
      incMap[ym] = 20000;
    }
    for (let m = 1; m <= 12; m++) {
      const ym = `2026-${String(m).padStart(2, '0')}`;
      months19.push(ym);
      needMap[ym] = 10000;
      incMap[ym] = 20000;
    }

    const map = { need: needMap, want: {}, savings: {} };
    const result = calculateAllocationEvolution(map, 'ALL', months19, incMap);

    expect(result.eligible).toBe(true);
    expect(result.hasData).toBe(true);
    expect(result.months.length).toBe(19);
    expect(result.label).toBe('แนวโน้ม 19 เดือน');
    result.months.forEach(m => {
      expect(m.total).toBe(20000);
      expect(m.needPct).toBeCloseTo(50);
      expect(m.savingsPct).toBeCloseTo(50);
    });
  });
});
