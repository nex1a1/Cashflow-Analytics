import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { AppFilterContextValue, TransactionDisplay } from '../types';
import { toISODate } from '../utils/dateHelpers';
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

  // Exclude future toggle
  const [excludeFuture, setExcludeFuture] = useState<boolean>(() => {
    return localStorage.getItem('excludeFuture') !== 'false';
  });

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
  } = useFilters({ transactions, categories, masterPeriods, excludeFuture });

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
    document.title = `CS | ${tabLabel} [${periodLabel}]`;
  }, [activeTab, filterPeriod]);

  // Toggle Exclude Future
  const handleToggleExcludeFuture = useCallback(() => {
    setExcludeFuture(prev => {
      const newVal = !prev;
      localStorage.setItem('excludeFuture', String(newVal));
      if (newVal) {
        const d = new Date();
        const curMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (/^\d{4}-\d{2}$/.exec(filterPeriod) && filterPeriod > curMonth) {
          setFilterPeriod(curMonth);
        } else if (/^\d{4}$/.exec(filterPeriod) && Number.parseInt(filterPeriod, 10) > d.getFullYear()) {
          setFilterPeriod(curMonth);
        } else if (filterPeriod.includes('-Q') || filterPeriod.includes('-H')) {
          const [y] = filterPeriod.split('-');
          if (Number.parseInt(y, 10) > d.getFullYear()) {
            setFilterPeriod(curMonth);
          }
        }
      }
      return newVal;
    });
  }, [filterPeriod, setFilterPeriod]);

  // Today helpers
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  }, []);

  const currentMonthStr = useMemo(() => todayStr.substring(0, 7), [todayStr]);

  // Dashboard Transactions (respecting future filter)
  const dashboardTransactions = useMemo(() => {
    if (excludeFuture) {
      return transactions.filter(t => {
        const isoDate = toISODate(t.date);
        if (isoDate <= todayStr) return true;

        if (isoDate.substring(0, 7) === currentMonthStr) {
          const cat = categories.find(c => c.id === t.category_id || c.name === t.category);
          if (cat) {
            const group = cashflowGroups.find(g => g.id === (cat.cashflowGroup || cat.cashflow_group_id));
            const type = group?.type || cat.type;
            if (type === 'income') return true;

            const groupName = (group?.name || '').toLowerCase();
            const catName = (cat.name || '').toLowerCase();
            const isRent =
              groupName.includes('หอ') ||
              groupName.includes('ที่พัก') ||
              groupName.includes('rent') ||
              groupName.includes('เช่า') ||
              catName.includes('ค่าเช่า') ||
              catName.includes('ค่าหอพัก');
            if (isRent) return true;
          }
        }
        return false;
      });
    }
    return transactions;
  }, [transactions, excludeFuture, todayStr, currentMonthStr, categories, cashflowGroups]);

  const validAnalyticsTxs = useMemo(
    () =>
      dashboardTransactions.filter(
        t => categories.find(c => c.name === t.category)?.cashflowGroup !== 'debt'
      ),
    [dashboardTransactions, categories]
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
    excludeFuture,
  });

  const value: AppFilterContextValue = {
    filterPeriod,
    setFilterPeriod,
    excludeFuture,
    handleToggleExcludeFuture,
    masterPeriods,
    groupedOptions,
    rawAvailableMonths,
    isReadOnlyView,
    searchQuery,
    setSearchQuery,
    isFilterActive,
    clearFilters,
    displayTransactions,
    dashboardTransactions,
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
