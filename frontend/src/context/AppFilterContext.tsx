import React, { createContext, use, useEffect, ReactNode } from 'react';
import { AppFilterContextValue } from '../types';
import { getFilterLabel } from '../utils/formatters';
import { effectiveChartGroupBy } from '../utils/chartGrouping';
import useFilters from '../hooks/useFilters';
import useAnalytics from '../hooks/useAnalytics';
import { useAppData } from './AppDataContext';
import { useAppUI } from './AppUIContext';

const AppFilterContext = createContext<AppFilterContextValue | undefined>(undefined);

export interface AppFilterProviderProps {
  children: ReactNode;
}

export const AppFilterProvider: React.FC<AppFilterProviderProps> = ({ children }) => {
  const {
    transactions,
    categories,
    cashflowGroups,
    masterPeriods,
    summaryData,
    dayTypes,
    dayTypeConfig,
    loadPeriodData,
  } = useAppData();

  const {
    activeTab,
    hideFixedExpenses,
    hideWantExpenses,
    dashboardCategory,
    chartGroupBy,
  } = useAppUI();

  // Filters Hook
  const {
    filterPeriod,
    setFilterPeriod,
    groupedOptions,
    rawAvailableMonths,
    isReadOnlyView,
    searchQuery,
    setSearchQuery,
    advancedFilterCategory,
    setAdvancedFilterCategory,
    advancedFilterGroup,
    setAdvancedFilterGroup,
    advancedFilterDate,
    setAdvancedFilterDate,
    typeFilter,
    setTypeFilter,
    allocationFilter,
    setAllocationFilter,
    minAmount,
    setMinAmount,
    maxAmount,
    setMaxAmount,
    dayTypeFilter,
    setDayTypeFilter,
    availableDatesInPeriod,
    allDatesInPeriod,
    displayTransactions,
    activeCashflowGroupIds,
    activeCategoryNames,
    isFilterActive,
    clearFilters,
  } = useFilters({ transactions, categories, masterPeriods });

  // Fetch data whenever filterPeriod changes
  useEffect(() => {
    loadPeriodData(filterPeriod);
  }, [filterPeriod, loadPeriodData]);

  // Document Title Synchronization
  useEffect(() => {
    const tabLabels: Record<string, string> = {
      insights: 'Dashboard',
      kakeibo: 'Kakeibo',
      calendar: 'Calendar',
      ledger: 'Ledger',
      portfolio: 'Portfolio',
      settings: 'Settings'
    };
    const tabLabel = tabLabels[activeTab] || 'Home';
    const periodLabel = getFilterLabel(filterPeriod);
    document.title = `SHARK | ${tabLabel} [${periodLabel}]`;
  }, [activeTab, filterPeriod]);

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

  const value: AppFilterContextValue = {
    filterPeriod,
    setFilterPeriod,
    masterPeriods,
    groupedOptions,
    rawAvailableMonths,
    isReadOnlyView,
    searchQuery,
    setSearchQuery,
    isFilterActive,
    clearFilters,
    displayTransactions,
    analytics,
    allDatesInPeriod,
    availableDatesInPeriod,
    advancedFilterCategory,
    setAdvancedFilterCategory,
    advancedFilterGroup,
    setAdvancedFilterGroup,
    advancedFilterDate,
    setAdvancedFilterDate,
    typeFilter,
    setTypeFilter,
    allocationFilter,
    setAllocationFilter,
    minAmount,
    setMinAmount,
    maxAmount,
    setMaxAmount,
    dayTypeFilter,
    setDayTypeFilter,
    activeCashflowGroupIds,
    activeCategoryNames,
    getFilterLabel: (period?: string) => getFilterLabel(period || filterPeriod),
  };

  return (
    <AppFilterContext value={value}>
      {children}
    </AppFilterContext>
  );
};

export const useAppFilter = (): AppFilterContextValue => {
  const context = use(AppFilterContext);
  if (!context) {
    throw new Error('useAppFilter must be used within an AppFilterProvider');
  }
  return context;
};
