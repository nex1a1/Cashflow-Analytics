// frontend/src/views/Calendar/index.tsx
import React, { useMemo, useState, useCallback } from 'react';
import DayDetailModal from '../../components/modals/DayDetailModal/index';
import { hexToRgb } from '../../utils/formatters';
import CalendarSkeleton from './components/CalendarSkeleton';
import CalendarBlock from './components/CalendarBlock';
import LegendAllocationBlock, { LegendGroupItem, AllocationTotals, AllocCatItem } from './components/LegendAllocationBlock';
import PeriodOverview from './components/PeriodOverview/index';
import {
  CashflowGroup,
  Category,
  DayType,
  TransactionDisplay,
  AllocationType,
  FrequentItem,
  TransactionPayload
} from '../../types';
import { STORAGE_KEYS } from '../../constants';

export interface CalendarDayData {
  inc: number;
  exp: number;
  items: TransactionDisplay[];
  incItems: TransactionDisplay[];
}

export interface CategoryAllocationAmount {
  need: number;
  want: number;
  savings: number;
}

function resolveAllocationType(
  t: TransactionDisplay,
  catObj: Category | undefined,
  cashflowGroups: CashflowGroup[]
): AllocationType {
  if (t.allocation_type) return t.allocation_type;
  const groupId = catObj?.cashflowGroup || catObj?.cashflow_group_id;
  if (!groupId) return 'want';
  const groupObj = cashflowGroups.find(g => g.id === groupId);
  if (groupObj?.type === 'savings') return 'savings';
  return groupObj?.allocation_type || 'want';
}

function processCalendarTransaction(
  t: TransactionDisplay,
  categories: Category[],
  cashflowGroups: CashflowGroup[],
  excludedCategoryIds: Set<string>,
  dayData: Record<number, CalendarDayData>,
  catAllocAmounts: Record<string, CategoryAllocationAmount>,
  totals: { tInc: number; tExp: number; tNeed: number; tWant: number }
) {
  if (!t.date) return;
  const dateParts = t.date.split('-');
  if (dateParts.length < 3) return;
  const txD = Number.parseInt(dateParts[2], 10);
  if (!dayData[txD]) return;

  const catObj = categories.find(c => c.id === t.category_id || c.name === t.category);
  const catId = catObj ? catObj.id : (t.category_id || t.category || 'other');
  if (excludedCategoryIds.has(catId)) return;

  const amt = typeof t.amount === 'number' ? t.amount : (Number.parseFloat(String(t.amount)) || 0);

  if (catObj?.type === 'income') {
    dayData[txD].inc += amt;
    dayData[txD].incItems.push({ ...t, _catObj: catObj });
    totals.tInc += amt;
    return;
  }

  dayData[txD].exp += amt;
  dayData[txD].items.push({ ...t, _catObj: catObj });
  totals.tExp += amt;

  const aType = resolveAllocationType(t, catObj, cashflowGroups);

  if (!catAllocAmounts[catId]) {
    catAllocAmounts[catId] = { need: 0, want: 0, savings: 0 };
  }
  catAllocAmounts[catId][aType] += amt;

  if (aType === 'need') {
    totals.tNeed += amt;
  } else if (aType === 'want') {
    totals.tWant += amt;
  }
}

export interface CalendarViewProps {
  transactions: TransactionDisplay[];
  filterPeriod: string;
  setFilterPeriod: (period: string) => void;
  rawAvailableMonths: string[];
  handleOpenAddModal?: (date?: string) => void;
  categories: Category[];
  cashflowGroups: CashflowGroup[];
  dayTypes: Record<string, string>;
  handleDayTypeChange: (dateStr: string, val: string) => void;
  dayTypeConfig: DayType[];
  getFilterLabel: (period?: string) => string;
  isReadOnlyView?: boolean;
  handleDeleteTransaction?: (id: string) => void;
  onSaveTransaction?: (tx: TransactionPayload) => void | Promise<void>;
  paymentMethods?: any[];
  isLoading: boolean;
  frequentItems?: FrequentItem[];
}

function CalendarView({
  transactions, filterPeriod, setFilterPeriod, rawAvailableMonths,
  handleOpenAddModal, categories, cashflowGroups, dayTypes,
  handleDayTypeChange, dayTypeConfig, getFilterLabel, isReadOnlyView,
  handleDeleteTransaction, onSaveTransaction,
  paymentMethods, isLoading, frequentItems = []
}: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<Set<string>>(new Set());
  const [legendSortMode, setLegendSortMode] = useState<'structure' | 'amount'>(() => (localStorage.getItem(STORAGE_KEYS.CALENDAR_LEGEND_SORT) as 'structure' | 'amount') || 'structure');
  const [legendLayoutMode, setLegendLayoutMode] = useState<'compact' | 'grouped'>(() => (localStorage.getItem(STORAGE_KEYS.CALENDAR_LEGEND_LAYOUT) as 'compact' | 'grouped') || 'compact');

  const handleSetSortMode = useCallback((mode: 'structure' | 'amount') => {
    setLegendSortMode(mode);
    localStorage.setItem(STORAGE_KEYS.CALENDAR_LEGEND_SORT, mode);
  }, []);

  const handleSetLayoutMode = useCallback((mode: 'compact' | 'grouped') => {
    setLegendLayoutMode(mode);
    localStorage.setItem(STORAGE_KEYS.CALENDAR_LEGEND_LAYOUT, mode);
  }, []);

  const toggleCategory = useCallback((catId: string) => {
    if (catId === 'CLEAR_ALL') {
      setExcludedCategoryIds(new Set());
      return;
    }
    setExcludedCategoryIds(prev => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  }, []);
  
  // ── Logic: Smooth Loading Transition (Only on initial cold start without data) ──
  const showSkeleton = isLoading && (!transactions || transactions.length === 0) && (!dayTypes || Object.keys(dayTypes).length === 0);

  const viewDate = useMemo(() => {
    if (filterPeriod && /^\d{4}-\d{2}$/.exec(filterPeriod)) {
      const [yearStr, monthStr] = filterPeriod.split('-');
      return new Date(Number.parseInt(yearStr, 10), Number.parseInt(monthStr, 10) - 1, 1);
    }
    return new Date();
  }, [filterPeriod]);

  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = new Date(y, m, 1).getDay();

  const suffixDaysCount = useMemo(() => {
    const totalCells = firstDayOfMonth + daysInMonth;
    const remainder = totalCells % 7;
    return remainder === 0 ? 0 : 7 - remainder;
  }, [firstDayOfMonth, daysInMonth]);

  // Pre-filter transactions for the current month once for performance
  const currentMonthTransactions = useMemo(() => {
    const targetMonthYear = `${y}-${(m + 1).toString().padStart(2, '0')}`;
    return transactions.filter(t => t.date?.startsWith(targetMonthYear));
  }, [transactions, y, m]);

  // Derive calendar grid data and base aggregates
  const { dayData: calendarData, monthInc, monthExp, monthNeed, monthWant, catAllocAmounts, maxDailyExpense } = useMemo(() => {
    const dayData: Record<number, CalendarDayData> = {};
    const totals = { tInc: 0, tExp: 0, tNeed: 0, tWant: 0 };
    const catAllocAmounts: Record<string, CategoryAllocationAmount> = {};
    
    for (let i = 1; i <= daysInMonth; i++) {
      dayData[i] = { inc: 0, exp: 0, items: [], incItems: [] };
    }

    currentMonthTransactions.forEach(t => {
      processCalendarTransaction(t, categories, cashflowGroups, excludedCategoryIds, dayData, catAllocAmounts, totals);
    });

    let maxDailyExpense = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      dayData[i].items.sort((a, b) => b.amount - a.amount);
      dayData[i].incItems.sort((a, b) => b.amount - a.amount);
      if (dayData[i].exp > maxDailyExpense) {
        maxDailyExpense = dayData[i].exp;
      }
    }
    
    return { dayData, monthInc: totals.tInc, monthExp: totals.tExp, monthNeed: totals.tNeed, monthWant: totals.tWant, catAllocAmounts, maxDailyExpense };
  }, [currentMonthTransactions, daysInMonth, categories, cashflowGroups, excludedCategoryIds]);

  const dayTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    dayTypeConfig.forEach(dt => { counts[dt.id] = 0; });
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const dow = new Date(y, m, d).getDay();
      const isWeekend = dow === 0 || dow === 6;
      const def = isWeekend ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
      const cur = dayTypes[dateStr] || def;
      if (cur) counts[cur] = (counts[cur] || 0) + 1;
    }
    return counts;
  }, [dayTypes, daysInMonth, m, y, dayTypeConfig]);

  // Grouped active categories with totals for the current month
  const groupedLegendData = useMemo(() => {
    const catsMap = new Map<string, Category>();
    const catAmounts: Record<string, number> = {};
    
    currentMonthTransactions.forEach(t => {
      const catObj = categories.find(c => c.id === t.category_id || c.name === t.category);
      const amt = typeof t.amount === 'number' ? t.amount : (Number.parseFloat(String(t.amount)) || 0);
      const catId = catObj ? catObj.id : (t.category_id || t.category || 'other');

      if (!catsMap.has(catId)) {
        if (catObj) {
          catsMap.set(catId, catObj);
        } else {
          catsMap.set(catId, {
            id: catId,
            name: t.category || 'อื่นๆ',
            color: '#94a3b8',
            type: 'expense',
            cashflowGroup: null
          });
        }
      }
      catAmounts[catId] = (catAmounts[catId] || 0) + amt;
    });

    const activeCatsArray = Array.from(catsMap.values());
    if (activeCatsArray.length === 0) {
      return { sortedGroups: [] as LegendGroupItem[], catAmounts: {} };
    }

    const groupsMap: Record<string, LegendGroupItem> = {};
    const getGroupObj = (groupId: string | null | undefined, categoryType: string | undefined) => {
      if (groupId) {
        const found = cashflowGroups.find(g => g.id === groupId);
        if (found) return found;
      }
      return {
        id: groupId || 'uncategorized',
        name: categoryType === 'income' ? 'รายรับอื่นๆ' : 'หมวดหมู่อื่นๆ',
        type: categoryType || 'expense',
        icon: categoryType === 'income' ? '💰' : '📌',
        color: '#64748b',
        order_index: 9999
      };
    };

    activeCatsArray.forEach(cat => {
      const groupId = cat.cashflowGroup || cat.cashflow_group_id || 'uncategorized';
      const groupKey = `${cat.type}_${groupId}`;
      const amt = catAmounts[cat.id] || 0;

      if (!groupsMap[groupKey]) {
        groupsMap[groupKey] = {
          groupObj: getGroupObj(cat.cashflowGroup || cat.cashflow_group_id, cat.type),
          categories: [],
          groupTotal: 0
        };
      }
      groupsMap[groupKey].categories.push(cat);
      groupsMap[groupKey].groupTotal += amt;
    });

    Object.values(groupsMap).forEach((gData: LegendGroupItem) => {
      gData.categories.sort((a, b) => {
        if (legendSortMode === 'amount') {
          const amtA = catAmounts[a.id] || 0;
          const amtB = catAmounts[b.id] || 0;
          if (amtB !== amtA) return amtB - amtA;
          return (a.name || '').localeCompare(b.name || '', 'th');
        } else {
          const catIdxA = a.order_index ?? 999;
          const catIdxB = b.order_index ?? 999;
          if (catIdxA !== catIdxB) return catIdxA - catIdxB;
          return (a.name || '').localeCompare(b.name || '', 'th');
        }
      });
    });

    const sortedGroups = Object.values(groupsMap).sort((a: any, b: any) => {
      const typeOrder: Record<string, number> = { income: 0, savings: 1, expense: 2 };
      const typeA = typeOrder[a.groupObj.type] ?? 9;
      const typeB = typeOrder[b.groupObj.type] ?? 9;
      if (typeA !== typeB) return typeA - typeB;

      const idxA = a.groupObj.order_index ?? 9999;
      const idxB = b.groupObj.order_index ?? 9999;
      if (idxA !== idxB) return idxA - idxB;

      return (a.groupObj.name || '').localeCompare(b.groupObj.name || '', 'th');
    });

    return { sortedGroups, catAmounts };
  }, [currentMonthTransactions, categories, cashflowGroups, legendSortMode]);

  // Derived Allocation details
  const allocationTotals: AllocationTotals = useMemo(() => {
    const needCats: AllocCatItem[] = [];
    const wantCats: AllocCatItem[] = [];
    const savingsCats: AllocCatItem[] = [];

    categories.forEach(cat => {
      if (excludedCategoryIds.has(cat.id)) return;

      const allocs = catAllocAmounts[cat.id];
      if (!allocs) return;

      const groupObj = cashflowGroups.find(g => g.id === (cat.cashflowGroup || cat.cashflow_group_id));
      const groupName = groupObj ? groupObj.name : 'หมวดหมู่อื่นๆ';
      const groupOrder = groupObj?.order_index ?? 9999;
      const catOrder = cat.order_index ?? 9999;

      if (allocs.need > 0) {
        needCats.push({
          name: cat.name,
          groupName,
          amount: allocs.need,
          color: cat.color || groupObj?.color || '#EF4444',
          groupOrder,
          catOrder
        });
      }

      if (allocs.want > 0) {
        wantCats.push({
          name: cat.name,
          groupName,
          amount: allocs.want,
          color: cat.color || groupObj?.color || '#F59E0B',
          groupOrder,
          catOrder
        });
      }

      if (allocs.savings > 0) {
        savingsCats.push({
          name: cat.name,
          groupName,
          amount: allocs.savings,
          color: cat.color || groupObj?.color || '#10B981',
          groupOrder,
          catOrder
        });
      }
    });

    const netCashflow = monthInc - monthExp;
    const netSavingsActual = Math.max(0, netCashflow);
    const totalAllocation = monthNeed + monthWant + netSavingsActual;

    if (netSavingsActual > 0) {
      savingsCats.push({
        name: 'เงินเหลือสะสม (Surplus)',
        groupName: 'กระแสเงินสด',
        amount: netSavingsActual,
        color: '#10B981',
        groupOrder: -1,
        catOrder: -1
      });
    }

    const sortFn = (a: AllocCatItem, b: AllocCatItem) => {
      if (legendSortMode === 'amount') {
        return b.amount - a.amount;
      }
      const gA = a.groupOrder ?? 9999;
      const gB = b.groupOrder ?? 9999;
      if (gA !== gB) return gA - gB;
      const cA = a.catOrder ?? 9999;
      const cB = b.catOrder ?? 9999;
      if (cA !== cB) return cA - cB;
      return a.name.localeCompare(b.name, 'th');
    };

    needCats.sort(sortFn);
    wantCats.sort(sortFn);
    savingsCats.sort(sortFn);

    return {
      need: monthNeed,
      want: monthWant,
      savings: netSavingsActual,
      totalExpense: totalAllocation,
      needPct: totalAllocation > 0 ? Math.round((monthNeed / totalAllocation) * 100) : 0,
      wantPct: totalAllocation > 0 ? Math.round((monthWant / totalAllocation) * 100) : 0,
      savingsPct: totalAllocation > 0 ? Math.round((netSavingsActual / totalAllocation) * 100) : 0,
      needCats,
      wantCats,
      savingsCats,
    };
  }, [categories, cashflowGroups, catAllocAmounts, monthInc, monthExp, monthNeed, monthWant, excludedCategoryIds, legendSortMode]);

  const prevMonth = useCallback(() => {
    const d = new Date(y, m - 1, 1);
    setFilterPeriod(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
  }, [y, m, setFilterPeriod]);

  const nextMonth = useCallback(() => {
    const d = new Date(y, m + 1, 1);
    setFilterPeriod(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
  }, [y, m, setFilterPeriod]);

  const goToCurrentMonth = useCallback(() => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    setFilterPeriod(currentMonthStr);
  }, [setFilterPeriod]);

  const monthNet = monthInc - monthExp;
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

  let content: React.ReactNode = null;

  if (showSkeleton) {
    content = <CalendarSkeleton />;
  } else if (isReadOnlyView) {
    content = (
      <PeriodOverview
        filterPeriod={filterPeriod}
        setFilterPeriod={setFilterPeriod}
        transactions={transactions}
        categories={categories}
        cashflowGroups={cashflowGroups}
        dayTypes={dayTypes}
        dayTypeConfig={dayTypeConfig}
        getFilterLabel={getFilterLabel}
        goToCurrentMonth={goToCurrentMonth}
        currentMonthStr={currentMonthStr}
        onSelectDate={setSelectedDate}
      />
    );
  } else {
    content = (
      <div className="flex flex-col h-full space-y-3.5 w-full">
        {/* 1. Calendar Block (Header, Grid, Footer) */}
        <CalendarBlock
          y={y}
          m={m}
          daysInMonth={daysInMonth}
          firstDayOfMonth={firstDayOfMonth}
          suffixDaysCount={suffixDaysCount}
          monthInc={monthInc}
          monthExp={monthExp}
          monthNet={monthNet}
          prevMonth={prevMonth}
          nextMonth={nextMonth}
          goToCurrentMonth={goToCurrentMonth}
          calendarData={calendarData}
          dayTypes={dayTypes}
          dayTypeConfig={dayTypeConfig}
          dayTypeCounts={dayTypeCounts}
          handleDayTypeChange={handleDayTypeChange}
          onSelectDate={setSelectedDate}
          hexToRgb={hexToRgb}
          excludedCategoryIds={excludedCategoryIds}
          toggleCategory={toggleCategory}
          maxDailyExpense={maxDailyExpense}
        />

        {/* 2. Legend & Allocation Block */}
        <LegendAllocationBlock
          sortedGroups={groupedLegendData.sortedGroups}
          catAmounts={groupedLegendData.catAmounts}
          excludedCategoryIds={excludedCategoryIds}
          toggleCategory={toggleCategory}
          legendLayoutMode={legendLayoutMode}
          legendSortMode={legendSortMode}
          handleSetLayoutMode={handleSetLayoutMode}
          handleSetSortMode={handleSetSortMode}
          allocationTotals={allocationTotals}
          hexToRgb={hexToRgb}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-6 w-full min-h-[600px]">
      {content}

      {selectedDate && (
        <DayDetailModal
          dateStr={selectedDate}
          transactions={transactions}
          categories={categories}
          cashflowGroups={cashflowGroups}
          onClose={() => setSelectedDate(null)}
          onSave={async (item) => { if (onSaveTransaction) await onSaveTransaction(item); }}
          onDelete={(id) => { if (handleDeleteTransaction) handleDeleteTransaction(id); }}
          dayTypes={dayTypes}
          dayTypeConfig={dayTypeConfig}
          frequentItems={frequentItems}
        />
      )}
    </div>
  );
}

export default React.memo(CalendarView);
