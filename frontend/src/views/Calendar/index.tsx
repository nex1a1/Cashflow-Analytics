// frontend/src/views/Calendar/index.tsx
import React, { useMemo, useState } from 'react';
import DayDetailModal from '../../components/modals/DayDetailModal/index';
import { hexToRgb } from '../../utils/formatters';
import CalendarSkeleton from './components/CalendarSkeleton';
import CalendarBlock from './components/CalendarBlock';
import LegendAllocationBlock from './components/LegendAllocationBlock';
import PeriodOverview from './components/PeriodOverview/index';
import { CashflowGroup, Category, DayType, TransactionDisplay } from '../../types';

function resolveAllocationType(t: any, catObj: any, cashflowGroups: CashflowGroup[]) {
  if (t.allocation_type) return t.allocation_type;
  if (!catObj?.cashflowGroup && !catObj?.cashflow_group_id) return 'want';
  const groupObj = cashflowGroups.find(g => g.id === catObj.cashflowGroup || g.id === catObj.cashflow_group_id);
  if (groupObj?.type === 'savings') return 'savings';
  return groupObj?.allocation_type || 'want';
}

function processCalendarTransaction(
  t: any,
  categories: Category[],
  cashflowGroups: CashflowGroup[],
  excludedCategoryIds: Set<string>,
  dayData: Record<number, any>,
  catAllocAmounts: Record<string, any>,
  totals: { tInc: number; tExp: number; tNeed: number; tWant: number }
) {
  const txD = Number.parseInt(t.date?.split('-')[2], 10);
  if (!dayData[txD]) return;

  const catObj = categories.find(c => c.id === t.category_id || c.name === t.category);
  const catId = catObj ? catObj.id : (t.category_id || t.category);
  if (excludedCategoryIds.has(catId)) return;

  const amt = Number.parseFloat(t.amount) || 0;

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
  transactions: any[];
  filterPeriod: string;
  setFilterPeriod: (period: string) => void;
  rawAvailableMonths: string[];
  handleOpenAddModal: (date?: string) => void;
  categories: any[];
  cashflowGroups: any[];
  dayTypes: Record<string, string>;
  handleDayTypeChange: (dateStr: string, val: string) => void;
  dayTypeConfig: DayType[];
  getFilterLabel: (period?: string) => string;
  isReadOnlyView?: boolean;
  handleDeleteTransaction?: (id: string) => void;
  onSaveTransaction?: (tx: any) => void;
  paymentMethods?: any[];
  isLoading: boolean;
  frequentItems?: any[];
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
  const [legendSortMode, setLegendSortMode] = useState<'structure' | 'amount'>(() => (localStorage.getItem('shark_calendar_legend_sort') as 'structure' | 'amount') || 'structure');
  const [legendLayoutMode, setLegendLayoutMode] = useState<'compact' | 'grouped'>(() => (localStorage.getItem('shark_calendar_legend_layout') as 'compact' | 'grouped') || 'compact');

  const handleSetSortMode = (mode: 'structure' | 'amount') => {
    setLegendSortMode(mode);
    localStorage.setItem('shark_calendar_legend_sort', mode);
  };

  const handleSetLayoutMode = (mode: 'compact' | 'grouped') => {
    setLegendLayoutMode(mode);
    localStorage.setItem('shark_calendar_legend_layout', mode);
  };

  const toggleCategory = (catId: string) => {
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
  };
  
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
  const { dayData: calendarData, monthInc, monthExp, monthNeed, monthWant, catAllocAmounts } = useMemo(() => {
    const dayData: Record<number, any> = {};
    const totals = { tInc: 0, tExp: 0, tNeed: 0, tWant: 0 };
    const catAllocAmounts: Record<string, any> = {};
    
    for (let i = 1; i <= daysInMonth; i++) {
      dayData[i] = { inc: 0, exp: 0, items: [], incItems: [] };
    }

    currentMonthTransactions.forEach(t => {
      processCalendarTransaction(t, categories, cashflowGroups, excludedCategoryIds, dayData, catAllocAmounts, totals);
    });

    for (let i = 1; i <= daysInMonth; i++) {
      dayData[i].items.sort((a: any, b: any) => b.amount - a.amount);
      dayData[i].incItems.sort((a: any, b: any) => b.amount - a.amount);
    }
    
    return { dayData, monthInc: totals.tInc, monthExp: totals.tExp, monthNeed: totals.tNeed, monthWant: totals.tWant, catAllocAmounts };
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
    const catsMap = new Map();
    const catAmounts: Record<string, number> = {};
    
    currentMonthTransactions.forEach(t => {
      const catObj = categories.find(c => c.id === t.category_id || c.name === t.category);
      const amt = Number.parseFloat(t.amount) || 0;
      const catId = catObj ? catObj.id : (t.category_id || t.category);

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
      return { sortedGroups: [], catAmounts: {} };
    }

    interface GroupMapEntry {
      groupObj: any;
      categories: any[];
      groupTotal: number;
    }
    const groupsMap: Record<string, GroupMapEntry> = {};
    const getGroupObj = (groupId: any, categoryType: any) => {
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

    Object.values(groupsMap).forEach((gData: GroupMapEntry) => {
      gData.categories.sort((a: any, b: any) => {
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
  const allocationTotals = useMemo(() => {
    interface AllocCat {
      name: string;
      groupName: string;
      amount: number;
      color: string;
      groupOrder: number;
      catOrder: number;
    }
    const needCats: AllocCat[] = [];
    const wantCats: AllocCat[] = [];
    const savingsCats: AllocCat[] = [];

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

    const sortFn = (a: AllocCat, b: AllocCat) => {
      if (legendSortMode === 'amount') {
        return b.amount - a.amount;
      }
      if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
      if (a.catOrder !== b.catOrder) return a.catOrder - b.catOrder;
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

  const prevMonth = () => {
    const d = new Date(y, m - 1, 1);
    setFilterPeriod(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const d = new Date(y, m + 1, 1);
    setFilterPeriod(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
  };
  const goToCurrentMonth = () => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    setFilterPeriod(currentMonthStr);
  };

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
        />

        {/* 2. Legend & Allocation Block */}
        {groupedLegendData.sortedGroups?.length > 0 && (
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
        )}
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
