// src/views/Dashboard/components/ExpenseProportion/index.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { Inbox } from 'lucide-react';
import { formatMoney } from '@/utils/formatters';
import { getDoughnutChartOptions } from '@/utils/chartOptions';
import { useDashboardContext } from '../../context/DashboardContext';
import {
  DisplayMode,
  SortMode,
  AllocationItemData,
  GroupItemData,
  CategoryItemData,
} from './types';
import {
  calculateSimulatedAllocation,
  sortProportionItems,
  buildDoughnutChartData,
  resolveDoughnutHoverIndex,
} from './proportionHelpers';
import { ExpenseProportionHeader } from './ExpenseProportionHeader';
import { ExpenseProportionChart } from './ExpenseProportionChart';
import { ExpenseProportionGrid } from './ExpenseProportionGrid';

function ExpenseProportionEmpty() {
  return (
    <div className="rounded-none border shadow-sm flex flex-col w-full bg-[#181818] border-[#303030] relative overflow-visible z-10 p-10 items-center justify-center text-center opacity-60">
      <Inbox className="w-10 h-10 mb-2 opacity-20" />
      <p className="text-sm font-bold uppercase tracking-widest">No Expense Data</p>
    </div>
  );
}

const SKELETON_KEYS = ['prop-skel-0', 'prop-skel-1', 'prop-skel-2', 'prop-skel-3', 'prop-skel-4'];

function ExpenseProportionSkeleton() {
  return (
    <div className="flex flex-row items-stretch h-32">
      <div className="shrink-0 w-[133px] flex items-center justify-center border-r border-dashed border-[#303030]/40 bg-[#303030]/30">
        <div className="w-20 h-24 rounded-full animate-pulse bg-[#303030]" />
      </div>
      <div className="flex-1 grid grid-cols-5 gap-[1px] bg-[#303030]/20">
        {SKELETON_KEYS.map((key) => (
          <div key={key} className="p-2 animate-pulse bg-[#303030]/40">
            <div className="h-2 w-12 mb-2 rounded-none bg-[#303030]" />
            <div className="h-4 w-16 mb-2 rounded-none bg-[#303030]" />
            <div className="h-1 w-full rounded-none bg-[#303030]" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ExpenseProportion - Financial expenditure proportions dashboard component.
 */
export function ExpenseProportion() {
  const { analytics, dm, showSkeleton } = useDashboardContext();
  const [displayMode, setDisplayMode] = useState<DisplayMode>('category');
  const [sortMode, setSortMode] = useState<SortMode>('amount-desc');
  const [hoveredIdx, setHoveredIdx] = useState<number>(-1);
  const [isSliceHovered, setIsSliceHovered] = useState<boolean>(false);
  const [excludedGroupIds, setExcludedGroupIds] = useState<string[]>([]);

  const { 
    sortedCats = [] as CategoryItemData[], 
    chartTotal = 0,
    sortedGroups = [] as GroupItemData[], 
    totalExpense = 0,
    sortedAllocation = [] as AllocationItemData[], 
    totalIncome = 0,
    netCashflow = 0,
    isSingleMonthView = false,
  } = analytics;

  const isGroupMode = displayMode === 'group';
  const isAllocationMode = displayMode === 'allocation';

  const toggleGroupExclusion = useCallback((groupId: string) => {
    setExcludedGroupIds(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  }, []);

  const resetExclusions = useCallback(() => {
    setExcludedGroupIds([]);
  }, []);
  
  const changeDisplayMode = useCallback((mode: DisplayMode) => {
    setDisplayMode(mode);
    setHoveredIdx(-1);
    setIsSliceHovered(false);
    setExcludedGroupIds([]);
  }, []);

  const { simulatedAllocation, totalReduced } = useMemo(() => {
    return calculateSimulatedAllocation(
      isAllocationMode, excludedGroupIds, sortedAllocation, totalIncome, totalExpense, netCashflow
    );
  }, [isAllocationMode, excludedGroupIds, sortedAllocation, totalIncome, totalExpense, netCashflow]);

  const rawItems = useMemo(() => {
    if (isGroupMode) return sortedGroups;
    if (isAllocationMode) return simulatedAllocation;
    return sortedCats;
  }, [isGroupMode, isAllocationMode, sortedGroups, simulatedAllocation, sortedCats]);

  const handleSortToggle = useCallback((targetType: 'amount' | 'order') => {
    setSortMode(prev => {
      if (targetType === 'amount') {
        return prev === 'amount-desc' ? 'amount-asc' : 'amount-desc';
      }
      if (targetType === 'order') {
        return prev === 'order-asc' ? 'order-desc' : 'order-asc';
      }
      return 'amount-desc';
    });
  }, []);

  const activeItems = useMemo(() => {
    return sortProportionItems(rawItems, sortMode, isAllocationMode);
  }, [rawItems, sortMode, isAllocationMode]);

  const activeChartData = useMemo(() => {
    return buildDoughnutChartData(activeItems, isGroupMode, hoveredIdx);
  }, [activeItems, isGroupMode, hoveredIdx]);

  const activeTotal = useMemo(() => {
    if (isGroupMode) return chartTotal;
    if (isAllocationMode) {
      return totalIncome || (totalExpense + Math.max(0, netCashflow || 0));
    }
    return chartTotal;
  }, [isGroupMode, isAllocationMode, totalExpense, totalIncome, netCashflow, chartTotal]);

  const gridColsClass = (isGroupMode || isAllocationMode) ? 'grid-cols-3' : 'grid-cols-5';
  const itemCount = activeItems.length;

  const handleChartMouseLeave = useCallback(() => {
    setIsSliceHovered(false);
    setHoveredIdx(-1);
  }, []);

  const options = useMemo(() => {
    const baseOptions = getDoughnutChartOptions(Boolean(dm));
    return {
      ...baseOptions,
      cutout: isGroupMode ? '54%' : '72%', 
      onHover: (_event: any, elements: any[]) => {
        const hasElements = Boolean(elements && elements.length > 0);
        setIsSliceHovered(hasElements);
        const hoverIdx = resolveDoughnutHoverIndex(elements, isGroupMode, activeItems);
        setHoveredIdx(hoverIdx);
      },
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          enabled: true,
          backgroundColor: '#121212',
          borderColor: '#303030',
          borderWidth: 1,
          cornerRadius: 0, // Sharp Ferrari border
          titleColor: '#f8fafc',
          titleFont: { family: 'Inter', size: 10, weight: 'bold' as const },
          bodyColor: '#cbd5e1',
          bodyFont: { family: 'Inter', size: 10 },
          padding: 8,
          boxPadding: 4,
          usePointStyle: true,
          callbacks: {
            label: (context: any) => {
              const val = context.parsed;
              const item = activeItems[context.dataIndex];
              const pct = item?.percentage;
              if (pct) {
                return ` ฿${formatMoney(val)} (${pct}%)`;
              }
              return ` ฿${formatMoney(val)}`;
            }
          }
        }
      }
    };
  }, [dm, isGroupMode, activeItems]);
  
  const cardClass = "rounded-none border shadow-sm flex flex-col w-full bg-[#181818] border-[#303030] relative overflow-visible z-10";

  if (itemCount === 0 && !showSkeleton) {
    return <ExpenseProportionEmpty />;
  }

  const activeHoveredItem = (!isSliceHovered && hoveredIdx >= 0 && hoveredIdx < activeItems.length) 
    ? activeItems[hoveredIdx] 
    : null;

  return (
    <div className={cardClass}>
      <ExpenseProportionHeader
        displayMode={displayMode}
        onChangeMode={changeDisplayMode}
        sortMode={sortMode}
        onToggleSort={handleSortToggle}
        isAllocationMode={isAllocationMode}
        isGroupMode={isGroupMode}
        excludedGroupIds={excludedGroupIds}
        totalReduced={totalReduced}
        onResetExclusions={resetExclusions}
        showSkeleton={showSkeleton}
        itemCount={itemCount}
      />

      {showSkeleton ? (
        <ExpenseProportionSkeleton />
      ) : (
        <div className="flex flex-row items-stretch min-h-[140px]">
          <ExpenseProportionChart
            activeChartData={activeChartData}
            options={options}
            isAllocationMode={isAllocationMode}
            isGroupMode={isGroupMode}
            activeTotal={activeTotal}
            onMouseLeave={handleChartMouseLeave}
            isSliceHovered={isSliceHovered}
            hoveredItem={activeHoveredItem}
          />
          <ExpenseProportionGrid
            activeItems={activeItems}
            isAllocationMode={isAllocationMode}
            isGroupMode={isGroupMode}
            hoveredIdx={hoveredIdx}
            onHover={setHoveredIdx}
            activeTotal={activeTotal}
            excludedGroupIds={excludedGroupIds}
            onToggleGroup={toggleGroupExclusion}
            isSingleMonthView={isSingleMonthView}
            sortMode={sortMode}
            gridColsClass={gridColsClass}
          />
        </div>
      )}
    </div>
  );
}

export default React.memo(ExpenseProportion);
