import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { formatMoney } from '../../utils/formatters';
import { isDateInFilter } from '../../utils/dateHelpers';

// Shared Components
import FilterBar from './components/Shared/FilterBar';
import HorizontalFilterBar from './components/HorizontalView/HorizontalFilterBar';
import { EXCLUDED_HEATMAP_CATEGORIES } from './hooks/useHeatmapEngine';

// Extracted Sub-Components
import LedgerHeaderActions from './components/LedgerHeaderActions';
import LedgerCommandPanel, { LedgerGroupBreakdownSection } from './components/LedgerCommandPanel';
import LedgerContentArea from './components/LedgerContentArea';

// Custom Hooks
import { useLedgerData } from './hooks/useLedgerData';
import { useLedgerStats } from './hooks/useLedgerStats';
import { Category, CashflowGroup, TransactionDisplay, DayType } from '../../types';
import { HeatmapEngineOptions } from './hooks/useHeatmapEngine';


export interface LedgerViewProps {
  displayTransactions: TransactionDisplay[];
  isReadOnlyView?: boolean;
  getFilterLabel: (period: string) => string;
  filterPeriod: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  handleOpenAddModal: (date: string, type: string) => void;
  handleUpdateTransaction: (id: string, field: string, value: any) => void;
  handleDeleteTransaction: (id: string) => void;
  handleDeleteMonth: (period: string) => void;
  categories: Category[];
  advancedFilterCategory: string | string[];
  setAdvancedFilterCategory: (cats: string | string[]) => void;
  advancedFilterGroup: string;
  setAdvancedFilterGroup: (g: string) => void;
  advancedFilterDate: string;
  setAdvancedFilterDate: (d: string) => void;
  typeFilter: string;
  setTypeFilter: (t: string) => void;
  allocationFilter: string;
  setAllocationFilter: (a: string) => void;
  minAmount: string;
  setMinAmount: (m: string) => void;
  maxAmount: string;
  setMaxAmount: (m: string) => void;
  dayTypeFilter: string;
  setDayTypeFilter: (d: string) => void;
  availableDatesInPeriod: string[];
  allDatesInPeriod: string[];
  setFilterPeriod: (p: string) => void;
  rawAvailableMonths?: string[];
  cashflowGroups?: CashflowGroup[];
  activeCashflowGroupIds?: Set<string>;
  activeCategoryNames?: Set<string>;
  dayTypes?: Record<string, string>;
  dayTypeConfig?: DayType[];
  isFilterActive: boolean;
  clearFilters: () => void;
  isLoading: boolean;
  transactions?: TransactionDisplay[];
}

function LedgerView({
  displayTransactions, isReadOnlyView, getFilterLabel, filterPeriod,
  searchQuery, setSearchQuery, handleOpenAddModal,
  handleUpdateTransaction, handleDeleteTransaction, handleDeleteMonth,
  categories, advancedFilterCategory, setAdvancedFilterCategory,
  advancedFilterGroup, setAdvancedFilterGroup,
  advancedFilterDate, setAdvancedFilterDate,
  typeFilter, setTypeFilter,
  allocationFilter, setAllocationFilter,
  minAmount, setMinAmount,
  maxAmount, setMaxAmount,
  dayTypeFilter, setDayTypeFilter,
  availableDatesInPeriod,
  allDatesInPeriod,
  setFilterPeriod, rawAvailableMonths,
  cashflowGroups = [],
  activeCashflowGroupIds = new Set(),
  activeCategoryNames = new Set(),
  dayTypes = {},
  dayTypeConfig = [],
  isFilterActive,
  clearFilters,
  isLoading,
  transactions = []
}: LedgerViewProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'horizontal'>('list');
  const [showGroupBreakdown, setShowGroupBreakdown] = useState(false);
  const [confirmDeleteMonth, setConfirmDeleteMonth] = useState(false);

  // ── Logic: Dedicated Horizontal Ledger Filters (Approach A) ──
  const [horizontalFilterOpen, setHorizontalFilterOpen] = useState(false);
  const [horizontalFilters, setHorizontalFilters] = useState<HeatmapEngineOptions>({
    selectedCategories: 'ALL',
    includeFixedCosts: false,
    allocationFilter: 'ALL',
    dayTypeFilter: 'ALL',
    hideZeroDays: false,
  });

  const clearHorizontalFilters = useCallback(() => {
    setHorizontalFilters({
      selectedCategories: 'ALL',
      includeFixedCosts: false,
      allocationFilter: 'ALL',
      dayTypeFilter: 'ALL',
      hideZeroDays: false,
    });
  }, []);

  const totalExpenseCats = useMemo(() => {
    return (categories || []).filter(c => (c as any).type === 'expense').length;
  }, [categories]);

  const defaultNonFixedCount = useMemo(() => {
    return (categories || []).filter(c => (c as any).type === 'expense' && !EXCLUDED_HEATMAP_CATEGORIES.includes(c.name)).length;
  }, [categories]);

  const isHorizontalFilterActive = useMemo<boolean>(() => {
    return Boolean(
      horizontalFilters.selectedCategories !== 'ALL' ||
      horizontalFilters.includeFixedCosts ||
      horizontalFilters.allocationFilter !== 'ALL' ||
      horizontalFilters.dayTypeFilter !== 'ALL' ||
      horizontalFilters.hideZeroDays
    );
  }, [horizontalFilters]);

  const horizontalActiveCount = useMemo(() => {
    return [
      horizontalFilters.selectedCategories !== 'ALL',
      horizontalFilters.includeFixedCosts,
      horizontalFilters.allocationFilter !== 'ALL',
      horizontalFilters.dayTypeFilter !== 'ALL',
      horizontalFilters.hideZeroDays
    ].filter(Boolean).length;
  }, [horizontalFilters]);

  // Base month transactions for Horizontal View (Independent from List search/filters)
  const monthTransactions = useMemo(() => {
    return (transactions || []).filter(t => isDateInFilter(t.date, filterPeriod));
  }, [transactions, filterPeriod]);

  useEffect(() => {
    if (!confirmDeleteMonth) return;
    const timer = setTimeout(() => setConfirmDeleteMonth(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmDeleteMonth]);

  const handleDeleteMonthClick = () => {
    if (confirmDeleteMonth) {
      handleDeleteMonth(filterPeriod);
      setConfirmDeleteMonth(false);
    } else {
      setConfirmDeleteMonth(true);
    }
  };

  // ── Logic: Smooth Loading Transition (Only on initial cold start without data) ──
  const showSkeleton = isLoading && (!displayTransactions || displayTransactions.length === 0) && (!transactions || transactions.length === 0);

  // ─── Logic: Data Orchestration ───
  const {
    sortedTransactions,
    pages,
    currentPage,
    setCurrentPage,
    sortConfig,
    handleSort,
    dateBands,
    isDateSorted
  } = useLedgerData(displayTransactions, filterPeriod, searchQuery, {
    advancedFilterCategory, advancedFilterGroup, advancedFilterDate,
    typeFilter, allocationFilter, minAmount, maxAmount, dayTypeFilter,
    categories, cashflowGroups // Pass these in for order_index lookup
  });

  // ─── Logic: Aggregation & Stats ───
  const {
    sumInc,
    sumExp,
    net,
    savingsRate,
    activeIncomeCards,
    activeSavingsCards,
    activeExpenseCards,
    getSubValue,
    catTypeMap
  } = useLedgerStats({
    displayTransactions,
    categories,
    cashflowGroups,
    formatMoney,
    advancedFilterGroup,
    setAdvancedFilterGroup,
    allDatesInPeriod
  });

  const totalPages = pages.length || 1;
  const currentData = pages[currentPage - 1] || [];

  // Page-specific summaries
  const { pageInc, pageExp } = useMemo(() => {
    let inc = 0, exp = 0;
    currentData.forEach(t => {
      const type = catTypeMap[t.category];
      const amt = typeof t.amount === 'string' ? Number.parseFloat(t.amount) : t.amount;
      if (type === 'income') inc += (amt || 0);
      else exp += (amt || 0);
    });
    return { pageInc: inc, pageExp: exp };
  }, [currentData, catTypeMap]);

  return (
    <div className="flex flex-col gap-0 w-full pb-8">
      <div className="flex flex-col gap-3.5 mb-4 relative z-20">
        {/* Top Header Actions */}
        <div className="flex flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-6 bg-[#da291c] rounded-none shrink-0" />
              <h2 className="text-2xl font-black uppercase tracking-wider leading-none text-slate-100 font-sans">
                บัญชีแยกประเภท
              </h2>
            </div>
            <p className="text-[10px] font-black tracking-widest mt-1.5 font-sans text-slate-400 uppercase flex items-center gap-2">
              <span>{getFilterLabel(filterPeriod)}</span>
              <span className="text-neutral-800 font-bold">•</span>
              <span className="text-[#da291c] font-extrabold">
                {viewMode === 'list' ? displayTransactions.length : monthTransactions.length}
              </span>
              <span>รายการ</span>
            </p>
          </div>
          <LedgerHeaderActions
            viewMode={viewMode}
            setViewMode={setViewMode}
            filterOpen={filterOpen}
            setFilterOpen={setFilterOpen}
            isFilterActive={isFilterActive}
            horizontalFilterOpen={horizontalFilterOpen}
            setHorizontalFilterOpen={setHorizontalFilterOpen}
            isHorizontalFilterActive={isHorizontalFilterActive}
            handleOpenAddModal={handleOpenAddModal}
            hasTransactions={displayTransactions.length > 0 || monthTransactions.length > 0}
            confirmDeleteMonth={confirmDeleteMonth}
            handleDeleteMonthClick={handleDeleteMonthClick}
          />
        </div>

        <LedgerCommandPanel
          sumInc={sumInc}
          sumExp={sumExp}
          net={net}
          savingsRate={savingsRate}
          formatMoney={formatMoney}
          getSubValue={getSubValue}
          showGroupBreakdown={showGroupBreakdown}
          setShowGroupBreakdown={setShowGroupBreakdown}
          totalActiveGroupCards={activeIncomeCards.length + activeSavingsCards.length + activeExpenseCards.length}
        />

        {showGroupBreakdown && (activeIncomeCards.length > 0 || activeSavingsCards.length > 0 || activeExpenseCards.length > 0) && (
          <LedgerGroupBreakdownSection
            activeIncomeCards={activeIncomeCards}
            activeSavingsCards={activeSavingsCards}
            activeExpenseCards={activeExpenseCards}
          />
        )}

        {viewMode === 'list' && (
          <FilterBar
            isExpanded={filterOpen}
            setIsExpanded={setFilterOpen}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            advancedFilterDate={advancedFilterDate} setAdvancedFilterDate={setAdvancedFilterDate}
            advancedFilterGroup={advancedFilterGroup} setAdvancedFilterGroup={setAdvancedFilterGroup}
            advancedFilterCategory={advancedFilterCategory} setAdvancedFilterCategory={setAdvancedFilterCategory}
            typeFilter={typeFilter} setTypeFilter={setTypeFilter}
            allocationFilter={allocationFilter} setAllocationFilter={setAllocationFilter}
            minAmount={minAmount} setMinAmount={setMinAmount}
            maxAmount={maxAmount} setMaxAmount={setMaxAmount}
            dayTypeFilter={dayTypeFilter} setDayTypeFilter={setDayTypeFilter}
            availableDatesInPeriod={availableDatesInPeriod} cashflowGroups={cashflowGroups}
            activeCashflowGroupIds={activeCashflowGroupIds} activeCategoryNames={activeCategoryNames}
            categories={categories} clearFilters={clearFilters} isFilterActive={isFilterActive}
            filterPeriod={filterPeriod}
            dayTypes={dayTypes} dayTypeConfig={dayTypeConfig}
          />
        )}

        {viewMode === 'horizontal' && horizontalFilterOpen && (
          <HorizontalFilterBar
            categories={categories}
            cashflowGroups={cashflowGroups}
            monthTransactions={monthTransactions}
            filters={horizontalFilters}
            setFilters={setHorizontalFilters}
            clearFilters={clearHorizontalFilters}
            isFilterActive={isHorizontalFilterActive}
            activeCount={horizontalActiveCount}
          />
        )}
      </div>

      <LedgerContentArea
        showSkeleton={showSkeleton}
        displayTransactions={displayTransactions}
        monthTransactions={monthTransactions}
        horizontalFilters={horizontalFilters}
        clearHorizontalFilters={clearHorizontalFilters}
        isHorizontalFilterActive={isHorizontalFilterActive}
        isFilterActive={isFilterActive}
        clearFilters={clearFilters}
        viewMode={viewMode}
        categories={categories}
        cashflowGroups={cashflowGroups}
        formatMoney={formatMoney}
        dayTypes={dayTypes}
        dayTypeConfig={dayTypeConfig}
        allDatesInPeriod={allDatesInPeriod}
        currentData={currentData}
        sortedTransactions={sortedTransactions}
        sortConfig={sortConfig as { key: string; direction: 'asc' | 'desc' }}
        handleSort={handleSort}
        isDateSorted={isDateSorted}
        dateBands={dateBands}
        handleUpdateTransaction={handleUpdateTransaction}
        handleDeleteTransaction={handleDeleteTransaction}
        handleOpenAddModal={handleOpenAddModal}
        pageInc={pageInc}
        pageExp={pageExp}
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
      />
    </div>
  );
}

export default React.memo(LedgerView);
