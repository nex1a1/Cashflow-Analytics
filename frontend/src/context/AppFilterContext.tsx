import React, { createContext, useContext, useEffect, useMemo, ReactNode } from 'react';
import { AppFilterContextValue, TransactionDisplay } from '../types';
import { getFilterLabel } from '../utils/formatters';
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
    topXLimit,
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
      dashboard: 'Dashboard',
      calendar: 'Calendar',
      ledger: 'Ledger',
      settings: 'Settings'
    };
    const tabLabel = tabLabels[activeTab] || 'Home';
    const periodLabel = getFilterLabel(filterPeriod);
    document.title = `SHARK | ${tabLabel} [${periodLabel}]`;
  }, [activeTab, filterPeriod]);

  const validAnalyticsTxs = useMemo(
    () =>
      transactions.filter(
        t => categories.find(c => c.name === t.category)?.cashflowGroup !== 'debt'
      ),
    [transactions, categories]
  );

  const analytics = useAnalytics({
    transactions: validAnalyticsTxs,
    categories,
    filterPeriod,
    cashflowGroups,
    hideFixedExpenses,
    hideWantExpenses,
    dashboardCategory,
    chartGroupBy,
    topXLimit,
    dayTypes,
    dayTypeConfig,
    isDarkMode: true,
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
    <AppFilterContext.Provider value={value}>
      {children}
    </AppFilterContext.Provider>
  );
};

export const useAppFilter = (): AppFilterContextValue => {
  const context = useContext(AppFilterContext);
  if (!context) {
    throw new Error('useAppFilter must be used within an AppFilterProvider');
  }
  return context;
};
