// src/utils/ghostPacerHelpers.ts
import { GhostPacerDetails, GhostPacerStatus } from '../views/Dashboard/components/SummaryCards/types';
import { periodUnitDates } from './dateHelpers';
import { isCyclePeriod, stripCycle, shiftMonth, localTodayIso } from './payCycle';

import { tc } from '@/constants/theme';
interface CalculateGhostPacerParams {
  globalDailySum: Record<string, number>;
  filterPeriod: string;
  isCurrentMonth: boolean;
  projectedExpense: number;
}

/**
 * Builds cumulative daily series for a specific year and month (0-indexed month)
 */
export function buildCumulativeDailySeries(
  year: number,
  month: number,
  globalDailySum: Record<string, number>,
  cutoffDay?: number
): { series: number[]; total: number; daysCount: number } {
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  return cumulativeSeries(periodUnitDates(key, false), globalDailySum, cutoffDay);
}

/** Running total over an ordered date list, optionally cut off after `cutoffDay` days */
function cumulativeSeries(
  dates: string[],
  globalDailySum: Record<string, number>,
  cutoffDay?: number
): { series: number[]; total: number; daysCount: number } {
  const series: number[] = [];
  let runningTotal = 0;
  for (const iso of cutoffDay ? dates.slice(0, cutoffDay) : dates) {
    runningTotal += globalDailySum[iso] || 0;
    series.push(runningTotal);
  }
  return { series, total: runningTotal, daysCount: dates.length };
}

/**
 * Calculates Ghost Pacer comparison data between current month,
 * previous month (the Ghost), and the 3-month historical benchmark.
 */
export function calculateGhostPacerData({
  globalDailySum,
  filterPeriod,
  isCurrentMonth,
  projectedExpense,
}: CalculateGhostPacerParams): GhostPacerDetails {
  // Works on a calendar month or a pay cycle ("cycle:YYYY-MM") — day N = N-th day of that unit
  const cycle = isCyclePeriod(filterPeriod);
  const key = stripCycle(filterPeriod);
  const isSingleMonth = /^\d{4}-\d{2}$/.test(key);
  
  // Default empty state when not in single month view or missing data
  const emptyStatus: GhostPacerStatus = {
    code: 'TIED',
    label: 'ไม่มีข้อมูลเปรียบเทียบ',
    color: tc('ink-muted'),
    bg: 'bg-neutral-900',
    border: 'border-neutral-700',
  };

  if (!isSingleMonth) {
    return {
      hasData: false,
      currentPeriod: filterPeriod || '',
      prevPeriod: '',
      currentDay: 1,
      lastDayOfMonth: 30,
      currentDailySeries: [],
      prevDailySeries: [],
      benchmarkDailySeries: [],
      currentSpendToDate: 0,
      ghostSpendToDate: 0,
      benchmarkSpendToDate: 0,
      deltaVsGhost: 0,
      deltaVsGhostPct: 0,
      deltaVsBenchmark: 0,
      deltaVsBenchmarkPct: 0,
      projectedExpense: 0,
      ghostTotalExpense: 0,
      deltaEom: 0,
      paceStatus: emptyStatus,
    };
  }

  const unitDates = (offset: number) => periodUnitDates(shiftMonth(key, offset), cycle);
  const currentDates = unitDates(0);
  const lastDayOfMonth = currentDates.length;
  const todayIdx = currentDates.indexOf(localTodayIso());
  const currentDay = isCurrentMonth && todayIdx >= 0 ? todayIdx + 1 : lastDayOfMonth;

  // 1. Current unit cumulative series (up to currentDay)
  const currentPeriod = key;
  const { series: currentDailySeries, total: currentSpendToDate } = cumulativeSeries(currentDates, globalDailySum, currentDay);

  // 2. Previous unit series (Ghost — full length)
  const prevPeriod = shiftMonth(key, -1);
  const { series: prevDailySeries, total: ghostTotalExpense } = cumulativeSeries(unitDates(-1), globalDailySum);

  // 3. Unit -2 and -3 for 3-period benchmark
  const { series: m2Series } = cumulativeSeries(unitDates(-2), globalDailySum);
  const { series: m3Series } = cumulativeSeries(unitDates(-3), globalDailySum);

  // Calculate 3-Month Average Benchmark Series (up to current month's lastDayOfMonth)
  const benchmarkDailySeries: number[] = [];
  const historicalSeriesList = [prevDailySeries, m2Series, m3Series].filter(s => s.length > 0 && s.some(v => v > 0));

  for (let d = 1; d <= lastDayOfMonth; d++) {
    if (historicalSeriesList.length === 0) {
      benchmarkDailySeries.push(0);
      continue;
    }

    let sum = 0;
    let count = 0;
    for (const hSeries of historicalSeriesList) {
      const idx = Math.min(d, hSeries.length) - 1;
      if (idx >= 0 && hSeries[idx] !== undefined) {
        sum += hSeries[idx];
        count++;
      }
    }
    benchmarkDailySeries.push(count > 0 ? Math.round(sum / count) : 0);
  }

  // Ghost spend at exact same day
  const ghostSpendToDate = prevDailySeries.length >= currentDay
    ? prevDailySeries[currentDay - 1]
    : (prevDailySeries[prevDailySeries.length - 1] || 0);

  const benchmarkSpendToDate = benchmarkDailySeries.length >= currentDay
    ? benchmarkDailySeries[currentDay - 1]
    : 0;

  // Deltas
  const deltaVsGhost = currentSpendToDate - ghostSpendToDate;
  const deltaVsGhostPct = ghostSpendToDate > 0 ? (deltaVsGhost / ghostSpendToDate) * 100 : 0;

  const deltaVsBenchmark = currentSpendToDate - benchmarkSpendToDate;
  const deltaVsBenchmarkPct = benchmarkSpendToDate > 0 ? (deltaVsBenchmark / benchmarkSpendToDate) * 100 : 0;

  const deltaEom = projectedExpense - ghostTotalExpense;

  const hasData = (prevDailySeries.length > 0 && prevDailySeries.some(v => v > 0)) ||
                  (currentDailySeries.length > 0 && currentDailySeries.some(v => v > 0));

  // Determine Pace Status
  let paceStatus: GhostPacerStatus;
  if (!hasData || ghostSpendToDate === 0) {
    paceStatus = {
      code: 'TIED',
      label: 'กำลังรวบรวมข้อมูล',
      color: '#38bdf8',
      bg: 'bg-sky-950/30',
      border: 'border-sky-500',
    };
  } else if (deltaVsGhost < -100) {
    paceStatus = {
      code: 'LEAD',
      label: 'ใช้น้อยกว่าเดือนก่อน',
      color: tc('income'),
      bg: 'bg-emerald-950/30',
      border: 'border-emerald-500',
    };
  } else if (deltaVsGhost > 100) {
    paceStatus = {
      code: 'TRAIL',
      label: 'ใช้เร็วกว่าเดือนก่อน',
      color: tc('expense'),
      bg: 'bg-danger/10',
      border: 'border-accent',
    };
  } else {
    paceStatus = {
      code: 'TIED',
      label: 'ใกล้เคียงเดือนก่อน',
      color: '#3b82f6',
      bg: 'bg-blue-950/30',
      border: 'border-blue-500',
    };
  }

  return {
    hasData,
    currentPeriod,
    prevPeriod,
    currentDay,
    lastDayOfMonth,
    currentDailySeries,
    prevDailySeries,
    benchmarkDailySeries,
    currentSpendToDate,
    ghostSpendToDate,
    benchmarkSpendToDate,
    deltaVsGhost,
    deltaVsGhostPct,
    deltaVsBenchmark,
    deltaVsBenchmarkPct,
    projectedExpense,
    ghostTotalExpense,
    deltaEom,
    paceStatus,
  };
}
