// src/utils/chartGrouping.ts
// The main chart's รายเดือน / รายวัน switch: a daily axis over many months is hundreds of
// hair-thin bars with skipped labels, so it is only offered for short periods (<= ~3 months).
import { isSingleUnitPeriod, stripCycle } from './payCycle';
import { resolvePeriodDateBounds } from './dateHelpers';

export const DAILY_CHART_MAX_DAYS = 93;
const DAY_MS = 86_400_000;

/** rough number of days a period covers (Infinity for "all") */
export function periodSpanDays(period: string): number {
  const base = stripCycle(period || '');
  if (base === 'ALL') return Infinity;
  if (base.includes(',')) return base.split(',').length * 31;
  const bounds = resolvePeriodDateBounds(period);
  if (!bounds) return 0;
  return Math.round((bounds.end.getTime() - bounds.start.getTime()) / DAY_MS) + 1;
}

export function isDailyChartAllowed(period: string): boolean {
  return isSingleUnitPeriod(period) || periodSpanDays(period) <= DAILY_CHART_MAX_DAYS;
}

/** the saved preference, overridden to monthly while the period is too long for a daily axis */
export function effectiveChartGroupBy(preferred: string, period: string): string {
  return preferred === 'daily' && !isDailyChartAllowed(period) ? 'monthly' : preferred;
}
