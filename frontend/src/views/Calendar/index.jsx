import { useMemo, useState, useEffect } from 'react';
import DayDetailModal from '../../components/modals/DayDetailModal/index';
import { hexToRgb } from '../../utils/formatters';
import CalendarSkeleton from './components/CalendarSkeleton';
import CalendarBlock from './components/CalendarBlock';
import LegendAllocationBlock from './components/LegendAllocationBlock';
import PeriodOverview from './components/PeriodOverview/index';

export default function CalendarView({
  transactions, filterPeriod, setFilterPeriod, rawAvailableMonths,
  handleOpenAddModal, categories, cashflowGroups, dayTypes,
  handleDayTypeChange, dayTypeConfig, getFilterLabel, isReadOnlyView,
  handleDeleteTransaction, onSaveTransaction, paymentMethods,
  isLoading, frequentItems = []
}) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [excludedCategoryIds, setExcludedCategoryIds] = useState(new Set());
  const [legendSortMode, setLegendSortMode] = useState(() => localStorage.getItem('shark_calendar_legend_sort') || 'structure');
  const [legendLayoutMode, setLegendLayoutMode] = useState(() => localStorage.getItem('shark_calendar_legend_layout') || 'compact');

  const handleSetSortMode = (mode) => {
    setLegendSortMode(mode);
    localStorage.setItem('shark_calendar_legend_sort', mode);
  };

  const handleSetLayoutMode = (mode) => {
    setLegendLayoutMode(mode);
    localStorage.setItem('shark_calendar_legend_layout', mode);
  };

  const toggleCategory = (catId) => {
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
  
  // ── Logic: Smooth Loading Transition ───────────────────────
  const [showSkeleton, setShowSkeleton] = useState(isLoading);

  useEffect(() => {
    if (isLoading) {
      setShowSkeleton(true);
    } else {
      const timer = setTimeout(() => setShowSkeleton(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const viewDate = useMemo(() => {
    if (filterPeriod && filterPeriod.match(/^\d{4}-\d{2}$/)) {
      const [yearStr, monthStr] = filterPeriod.split('-');
      return new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
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
    return transactions.filter(t => t.date && t.date.startsWith(targetMonthYear));
  }, [transactions, y, m]);

  // Derive calendar grid data and base aggregates
  const { dayData: calendarData, monthInc, monthExp, monthNeed, monthWant, catAllocAmounts } = useMemo(() => {
    const dayData = {};
    let tInc = 0, tExp = 0;
    let tNeed = 0, tWant = 0;
    const catAllocAmounts = {};
    
    for (let i = 1; i <= daysInMonth; i++) {
      dayData[i] = { inc: 0, exp: 0, items: [], incItems: [] };
    }

    currentMonthTransactions.forEach(t => {
      const txD = parseInt(t.date.split('-')[2], 10);
      if (dayData[txD]) {
        const catObj = categories.find(c => c.id === t.category_id || c.name === t.category);
        const catId = catObj ? catObj.id : (t.category_id || t.category);
        if (excludedCategoryIds.has(catId)) return;

        const amt = parseFloat(t.amount) || 0;
        
        if (catObj?.type === 'income') {
          dayData[txD].inc += amt;
          dayData[txD].incItems.push({ ...t, _catObj: catObj });
          tInc += amt;
        } else {
          dayData[txD].exp += amt;
          dayData[txD].items.push({ ...t, _catObj: catObj });
          tExp += amt;
          
          const groupObj = catObj ? cashflowGroups.find(g => g.id === catObj.cashflowGroup) : null;
          const aType = t.allocation_type || (groupObj?.type === 'savings' ? 'savings' : (groupObj?.allocation_type || 'want'));
          
          if (!catAllocAmounts[catId]) {
            catAllocAmounts[catId] = { need: 0, want: 0, savings: 0 };
          }
          catAllocAmounts[catId][aType] += amt;

          if (aType === 'need') {
            tNeed += amt;
          } else if (aType === 'want') {
            tWant += amt;
          }
        }
      }
    });

    for (let i = 1; i <= daysInMonth; i++) {
      dayData[i].items.sort((a, b) => b.amount - a.amount);
      dayData[i].incItems.sort((a, b) => b.amount - a.amount);
    }
    
    return { dayData, monthInc: tInc, monthExp: tExp, monthNeed: tNeed, monthWant: tWant, catAllocAmounts };
  }, [currentMonthTransactions, daysInMonth, categories, cashflowGroups, excludedCategoryIds]);

  const dayTypeCounts = useMemo(() => {
    const counts = {};
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
    const catAmounts = {};
    
    currentMonthTransactions.forEach(t => {
      const catObj = categories.find(c => c.id === t.category_id || c.name === t.category);
      const amt = parseFloat(t.amount) || 0;
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

    const groupsMap = {};
    const getGroupObj = (groupId, categoryType) => {
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
      const groupId = cat.cashflowGroup || 'uncategorized';
      const groupKey = `${cat.type}_${groupId}`;
      const amt = catAmounts[cat.id] || 0;

      if (!groupsMap[groupKey]) {
        groupsMap[groupKey] = {
          groupObj: getGroupObj(cat.cashflowGroup, cat.type),
          categories: [],
          groupTotal: 0
        };
      }
      groupsMap[groupKey].categories.push(cat);
      groupsMap[groupKey].groupTotal += amt;
    });

    Object.values(groupsMap).forEach(gData => {
      gData.categories.sort((a, b) => {
        if (legendSortMode === 'amount') {
          const amtA = catAmounts[a.id] || 0;
          const amtB = catAmounts[b.id] || 0;
          if (amtB !== amtA) return amtB - amtA;
          return a.name.localeCompare(b.name, 'th');
        } else {
          const catIdxA = a.order_index ?? 999;
          const catIdxB = b.order_index ?? 999;
          if (catIdxA !== catIdxB) return catIdxA - catIdxB;
          return a.name.localeCompare(b.name, 'th');
        }
      });
    });

    const sortedGroups = Object.values(groupsMap).sort((a, b) => {
      const typeOrder = { income: 0, savings: 1, expense: 2 };
      const typeA = typeOrder[a.groupObj.type] ?? 9;
      const typeB = typeOrder[b.groupObj.type] ?? 9;
      if (typeA !== typeB) return typeA - typeB;

      const idxA = a.groupObj.order_index ?? 9999;
      const idxB = b.groupObj.order_index ?? 9999;
      if (idxA !== idxB) return idxA - idxB;

      return a.groupObj.name.localeCompare(b.groupObj.name, 'th');
    });

    return { sortedGroups, catAmounts };
  }, [currentMonthTransactions, categories, cashflowGroups, legendSortMode]);

  // Derived Allocation details
  const allocationTotals = useMemo(() => {
    const needCats = [];
    const wantCats = [];
    const savingsCats = [];

    categories.forEach(cat => {
      if (excludedCategoryIds.has(cat.id)) return;

      const allocs = catAllocAmounts[cat.id];
      if (!allocs) return;

      const groupObj = cashflowGroups.find(g => g.id === cat.cashflowGroup);
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

    const sortFn = (a, b) => {
      if (legendSortMode === 'amount') {
        return b.amount - a.amount;
      } else {
        if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
        if (a.catOrder !== b.catOrder) return a.catOrder - b.catOrder;
        return a.name.localeCompare(b.name, 'th');
      }
    };

    return {
      need: monthNeed,
      want: monthWant,
      savings: netSavingsActual,
      totalExpense: totalAllocation,
      needPct: totalAllocation > 0 ? Math.round((monthNeed / totalAllocation) * 100) : 0,
      wantPct: totalAllocation > 0 ? Math.round((monthWant / totalAllocation) * 100) : 0,
      savingsPct: totalAllocation > 0 ? Math.round((netSavingsActual / totalAllocation) * 100) : 0,
      needCats: needCats.sort(sortFn),
      wantCats: wantCats.sort(sortFn),
      savingsCats: savingsCats.sort(sortFn),
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

  // Desktop Keyboard Shortcuts (←, →, T)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if modal is open or if user is typing in form inputs
      if (selectedDate) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || document.activeElement?.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevMonth();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextMonth();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        goToCurrentMonth();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDate, y, m]);

  const monthNet = monthInc - monthExp;
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

  let content = null;

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
        {groupedLegendData.sortedGroups && groupedLegendData.sortedGroups.length > 0 && (
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
          onSave={async (item) => { await onSaveTransaction(item); }}
          onDelete={(id) => { handleDeleteTransaction(id); }}
          paymentMethods={paymentMethods}
          frequentItems={frequentItems}
        />
      )}
    </div>
  );
}
