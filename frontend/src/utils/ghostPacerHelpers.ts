// src/utils/ghostPacerHelpers.ts
import { GhostPacerDetails, GhostPacerStatus } from '../views/Dashboard/components/SummaryCards/types';

interface CalculateGhostPacerParams {
  globalDailySum: Record<string, number>;
  filterPeriod: string;
  isCurrentMonth: boolean;
  filterYear: number;
  filterMonth: number; // 0-indexed
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
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const maxDay = cutoffDay ? Math.min(cutoffDay, daysInMonth) : daysInMonth;
  const series: number[] = [];
  let runningTotal = 0;

  const monthStr = String(month + 1).padStart(2, '0');
  for (let d = 1; d <= maxDay; d++) {
    const dayStr = String(d).padStart(2, '0');
    const isoDate = `${year}-${monthStr}-${dayStr}`;
    runningTotal += globalDailySum[isoDate] || 0;
    series.push(runningTotal);
  }

  return { series, total: runningTotal, daysCount: daysInMonth };
}

/**
 * Calculates Ghost Pacer comparison data between current month,
 * previous month (the Ghost), and the 3-month historical benchmark.
 */
export function calculateGhostPacerData({
  globalDailySum,
  filterPeriod,
  isCurrentMonth,
  filterYear,
  filterMonth,
  projectedExpense,
}: CalculateGhostPacerParams): GhostPacerDetails {
  const isSingleMonth = /^\d{4}-\d{2}$/.test(filterPeriod);
  
  // Default empty state when not in single month view or missing data
  const emptyStatus: GhostPacerStatus = {
    code: 'TIED',
    label: 'ไม่มีข้อมูลเปรียบเทียบ',
    color: '#737373',
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

  const lastDayOfMonth = new Date(filterYear, filterMonth + 1, 0).getDate();
  const currentDay = isCurrentMonth
    ? Math.max(1, Math.min(new Date().getDate(), lastDayOfMonth))
    : lastDayOfMonth;

  // 1. Current Month Cumulative Series (up to currentDay)
  const currentPeriod = `${filterYear}-${String(filterMonth + 1).padStart(2, '0')}`;
  const { series: currentDailySeries, total: currentSpendToDate } = buildCumulativeDailySeries(
    filterYear,
    filterMonth,
    globalDailySum,
    currentDay
  );

  // 2. Previous Month Series (Ghost — full month)
  const prevDate = new Date(filterYear, filterMonth - 1, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth();
  const prevPeriod = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;

  const { series: prevDailySeries, total: ghostTotalExpense } = buildCumulativeDailySeries(
    prevYear,
    prevMonth,
    globalDailySum
  );

  // 3. Month -2 and Month -3 for 3-Month Benchmark
  const m2Date = new Date(filterYear, filterMonth - 2, 1);
  const m3Date = new Date(filterYear, filterMonth - 3, 1);

  const { series: m2Series } = buildCumulativeDailySeries(m2Date.getFullYear(), m2Date.getMonth(), globalDailySum);
  const { series: m3Series } = buildCumulativeDailySeries(m3Date.getFullYear(), m3Date.getMonth(), globalDailySum);

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
      label: 'รวบรวมข้อมูลรอบแข่ง',
      color: '#38bdf8',
      bg: 'bg-sky-950/30',
      border: 'border-sky-500',
    };
  } else if (deltaVsGhost < -100) {
    paceStatus = {
      code: 'LEAD',
      label: 'คุมงบนำหน้าเดือนก่อน (Pacing Ahead)',
      color: '#10b981',
      bg: 'bg-emerald-950/30',
      border: 'border-emerald-500',
    };
  } else if (deltaVsGhost > 100) {
    paceStatus = {
      code: 'TRAIL',
      label: 'เร่งตัวเร็วกว่าเดือนก่อน (Trailing Ghost)',
      color: '#da291c',
      bg: 'bg-red-950/40',
      border: 'border-[#da291c]',
    };
  } else {
    paceStatus = {
      code: 'TIED',
      label: 'ความเร็วใกล้เคียงเดือนก่อน (Pace Tied)',
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
