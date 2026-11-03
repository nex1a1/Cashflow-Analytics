// The full-mode overview tab: reads the app contexts, runs the dashboard aggregation and renders DashboardView.
// It is a lazy chunk (with Chart.js), so the Lite overview never loads or computes any of it.
import { useAppData } from '@/context/AppDataContext';
import { useAppFilter } from '@/context/AppFilterContext';
import { useAppUI } from '@/context/AppUIContext';
import useAnalytics from '@/hooks/useAnalytics';
import { effectiveChartGroupBy } from '@/utils/chartGrouping';
import DashboardView from './index';

export default function DashboardTab({ showPortfolio, isLoading }: { showPortfolio: boolean; isLoading: boolean }) {
  const { transactions, categories, cashflowGroups, dayTypes, dayTypeConfig, summaryData } = useAppData();
  const { filterPeriod, getFilterLabel } = useAppFilter();
  const {
    hideFixedExpenses, setHideFixedExpenses,
    hideWantExpenses, setHideWantExpenses,
    dashboardCategory, setDashboardCategory,
    chartGroupBy, setChartGroupBy,
    topXLimit, setTopXLimit,
  } = useAppUI();

  const analytics = useAnalytics({
    transactions,
    categories,
    filterPeriod,
    cashflowGroups,
    hideFixedExpenses,
    hideWantExpenses,
    dashboardCategory,
    chartGroupBy: effectiveChartGroupBy(chartGroupBy, filterPeriod),
    dayTypes,
    dayTypeConfig,
    summaryData,
  });

  return (
    <DashboardView
      analytics={analytics}
      transactions={transactions}
      cashflowGroups={cashflowGroups}
      filterPeriod={filterPeriod}
      getFilterLabel={getFilterLabel}
      hideFixedExpenses={hideFixedExpenses}
      setHideFixedExpenses={setHideFixedExpenses}
      hideWantExpenses={hideWantExpenses}
      setHideWantExpenses={setHideWantExpenses}
      dashboardCategory={dashboardCategory}
      setDashboardCategory={setDashboardCategory}
      chartGroupBy={chartGroupBy}
      setChartGroupBy={setChartGroupBy}
      topXLimit={topXLimit}
      setTopXLimit={setTopXLimit}
      categories={categories}
      dayTypeConfig={dayTypeConfig}
      dayTypes={dayTypes}
      showPortfolio={showPortfolio}
      isLoading={isLoading}
    />
  );
}
