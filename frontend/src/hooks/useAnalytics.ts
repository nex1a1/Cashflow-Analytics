// src/hooks/useAnalytics.ts — memoised wrapper around the pure aggregation in utils/analyticsAggregation.ts
import { useMemo } from 'react';
import { TransactionDisplay, Category, CashflowGroup, DayType } from '../types';
import { generateMainChartData } from '../utils/analyticsHelpers';
import { computeCoreAnalytics, AnalyticsSummary } from '../utils/analyticsAggregation';

export interface UseAnalyticsProps {
  transactions?: TransactionDisplay[];
  categories?: Category[];
  cashflowGroups?: CashflowGroup[];
  filterPeriod: string;
  hideFixedExpenses?: boolean;
  hideWantExpenses?: boolean;
  dashboardCategory?: string | string[];
  chartGroupBy?: string;
  dayTypes?: Record<string, string>;
  dayTypeConfig?: DayType[];
  summaryData?: AnalyticsSummary | null;
}

export default function useAnalytics({
  transactions = [],
  categories = [],
  cashflowGroups = [],
  filterPeriod,
  hideFixedExpenses = false,
  hideWantExpenses = false,
  dashboardCategory = 'ALL',
  chartGroupBy = 'monthly',
  dayTypes,
  dayTypeConfig,
  summaryData
}: UseAnalyticsProps) {
  // ── Phase 1: Core Transaction Aggregation ──────────────────────────
  // Heaviest computation — only re-runs when data or filter criteria change
  const coreAggregation = useMemo(() => computeCoreAnalytics({
    transactions, categories, cashflowGroups, filterPeriod,
    hideFixedExpenses, hideWantExpenses, dashboardCategory,
    dayTypes, dayTypeConfig, summaryData,
  }), [transactions, filterPeriod, categories, cashflowGroups, hideFixedExpenses, hideWantExpenses, dashboardCategory, dayTypes, dayTypeConfig, summaryData]);

  // ── Phase 2: Chart & Sparkline Generation ─────────────────────────
  // Re-runs only when chart display settings change (chartGroupBy)
  const chartAndPresentation = useMemo(() => {
    const { catMapLookup, datesInPeriod, state, sortedMonthsKeys, cashflowMap } = coreAggregation;

    const { chartData: mainChartData, chartType: mainChartType } = generateMainChartData({
      chartGroupBy: chartGroupBy as 'daily' | 'monthly', filterPeriod, sortedMonthsKeys, cashflowMap,
      datesInPeriod, dailyAllMap: state.dailyAllMap, hideFixedExpenses, hideWantExpenses,
      dashboardCategory, monthlyAllMap: state.monthlyAllMap, monthlyCatMap: state.monthlyCatMap, dailyCatMap: state.dailyCatMap, catMap: catMapLookup
    });

    return { mainChartData, mainChartType };
  }, [coreAggregation, chartGroupBy, filterPeriod, hideFixedExpenses, hideWantExpenses, dashboardCategory]);

  // ── Phase 3: Final Analytics Assembly ─────────────────────────────
  const analytics = useMemo(() => {
    const core = coreAggregation;
    const charts = chartAndPresentation;

    return {
      periodLabel: core.windowMeta.periodLabel,
      isSingleMonthView: core.windowMeta.isSingleMonthView,
      showForecasting: core.showForecasting, projectedExpense: core.projectedExpense,
      safeToSpend: core.safeToSpend, projectedSurplus: core.projectedSurplus,
      forecastingDetails: core.forecastingDetails,
      ghostPacerDetails: core.ghostPacerDetails,
      allocationEvolution: core.allocationEvolution,
      prevTotals: core.prevTotals, totalExpense: core.totals.expense, totalIncome: core.totals.income,
      totalSavings: core.totals.savings || 0,
      netCashflow: core.netCashflow, savingsRate: core.savingsRate, chartTotal: core.chartTotal, numMonths: core.numMonths,
      sortedCats: core.sortedCats,
      dailyAvg: core.adjustedDailyAvg,
      foodTotal: core.totals.food, foodDailyAvg: core.adjustedFoodDailyAvg,
      foodPercentage: core.pcts.foodPercentage,
      foodPctOfIncome: core.pcts.foodPctOfIncome,
      foodWorkdayAvg: core.foodWorkdayAvg, foodHolidayAvg: core.foodHolidayAvg,
      dailyWorkdayAvg: core.dailyWorkdayAvg, dailyHolidayAvg: core.dailyHolidayAvg,
      maxFoodDayAmount: core.maxFoodDayAmount,
      topWantCategories: core.topWantCategories,
      subscriptionTotal: core.totals.subscription,
      subscriptionCount: core.totals.subscriptionCount,
      subscriptionPercentage: core.pcts.subscriptionPercentage,
      subscriptionPctOfIncome: core.pcts.subscriptionPctOfIncome,
      subscriptionSub: core.totals.subscriptionSub,
      topSubscriptionServices: core.topSubscriptionServices,
      rentTotal: core.totals.rent,
      rentPercentage: core.pcts.rentPercentage,
      rentSub: core.totals.rentSub,
      fixedTotal: core.totals.fixed, variableTotal: core.totals.variable,
      globalMaxThreshold: core.globalMaxThreshold, datesInPeriod: core.datesInPeriod, filterPeriod, dayTypeCounts: core.dayTypeCounts,
      dailyAllMap: core.state.dailyAllMap,
      sortedMonthsKeys: core.sortedMonthsKeys, monthlyCatMap: core.state.monthlyCatMap, dailyCatMap: core.state.dailyCatMap,
      mainChartData: charts.mainChartData, mainChartType: charts.mainChartType,
      sortedCashflow: core.sortedCashflow,
      sortedGroups: core.sortedGroups,
      sortedAllocation: core.sortedAllocation
    };
  }, [coreAggregation, chartAndPresentation, filterPeriod]);

  return analytics;
}
