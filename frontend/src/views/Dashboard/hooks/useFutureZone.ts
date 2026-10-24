import { useMemo } from 'react';
import { useDashboardContext } from '../context/DashboardContext';
import { isSingleUnitPeriod } from '@/utils/payCycle';
import { resolveFutureZone, type FutureZone } from '../components/MainChart/futureZone';

/** Where "now" sits on the main chart's x-axis (null for Sankey / when the whole range is in the past). */
export function useFutureZone(chartViewType: string): FutureZone | null {
  const { analytics, filterPeriod, chartGroupBy } = useDashboardContext();
  const months = analytics?.sortedMonthsKeys;
  const dates = analytics?.datesInPeriod;

  return useMemo(() => {
    if (chartViewType === 'sankey' || chartViewType === 'multiples') return null;
    const showMonthly = !isSingleUnitPeriod(filterPeriod) && chartGroupBy === 'monthly';
    return showMonthly
      ? resolveFutureZone(months || [], 'month', filterPeriod)
      : resolveFutureZone(dates || [], 'day', filterPeriod);
  }, [chartViewType, filterPeriod, chartGroupBy, months, dates]);
}
