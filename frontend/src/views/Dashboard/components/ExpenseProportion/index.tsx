// src/views/Dashboard/components/ExpenseProportion/index.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { Inbox, TrendingUp } from 'lucide-react';
import { formatMoney } from '@/utils/formatters';
import { getDoughnutChartOptions } from '@/utils/chartOptions';
import { useDashboardContext } from '../../context/DashboardContext';
import {
  DisplayMode,
  SortMode,
  AllocationItemData,
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
import { AllocationEvolutionChart } from './AllocationEvolutionChart';
import type { AllocationEvolutionData } from '@/utils/allocationEvolutionHelpers';

function ExpenseProportionEmpty() {
  return (
    <div className="flex flex-col w-full h-full items-center justify-center text-center opacity-60 p-10">
      <Inbox className="w-10 h-10 mb-2 opacity-20" />
      <p className="text-sm font-bold uppercase tracking-widest">ไม่มีข้อมูลรายจ่าย</p>
      <p className="text-[11px] font-medium normal-case tracking-normal opacity-70 mt-1">
        ลองเปลี่ยนเดือน หรือเพิ่มรายการรายจ่ายใหม่
      </p>
    </div>
  );
}

function AllocationEvolutionEmpty() {
  return (
    <div className="flex flex-col w-full h-full items-center justify-center text-center opacity-60 p-10">
      <TrendingUp className="w-10 h-10 mb-2 opacity-20" />
      <p className="text-sm font-bold uppercase tracking-widest">ยังไม่มีข้อมูลย้อนหลังพอ</p>
      <p className="text-[11px] font-medium normal-case tracking-normal opacity-70 mt-1">
        บันทึกรายการต่อเนื่องอย่างน้อย 2 เดือนเพื่อดูแนวโน้ม 50/30/20
      </p>
    </div>
  );
}

const SKELETON_KEYS = ['prop-skel-0', 'prop-skel-1', 'prop-skel-2', 'prop-skel-3', 'prop-skel-4'];

function ExpenseProportionSkeleton() {
  return (
    <div className="flex flex-row items-stretch h-32">
      <div className="shrink-0 w-[133px] flex items-center justify-center border-r border-dashed border-[#303030]/40 bg-[#303030]/30">
        {/* animate-spin is the Static Performance Engine's one carve-out for loading feedback (animate-pulse is globally neutralized) */}
        <div className="w-10 h-10 rounded-full border-4 border-[#303030] border-t-[#da291c] animate-spin" />
      </div>
      <div className="flex-1 grid grid-cols-5 gap-[1px] bg-[#303030]/20">
        {SKELETON_KEYS.map((key) => (
          <div key={key} className="p-2 bg-[#303030]/40">
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
    totalExpense = 0,
    sortedAllocation = [] as AllocationItemData[],
    totalIncome = 0,
    netCashflow = 0,
    allocationEvolution,
  } = analytics;

  const evolutionData = (allocationEvolution as AllocationEvolutionData | undefined) || { eligible: false, hasData: false, months: [], label: '' };

  // Fall back to Category if the period filter changed underneath an active
  // Evolution selection and it's no longer eligible (e.g. switched to a
  // single month) — mirrors SummaryStrategic's effectiveTab pattern.
  const effectiveDisplayMode: DisplayMode = (displayMode === 'evolution' && !evolutionData.eligible) ? 'category' : displayMode;
  const isAllocationMode = effectiveDisplayMode === 'allocation';
  const isEvolutionMode = effectiveDisplayMode === 'evolution';

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
    if (isAllocationMode) return simulatedAllocation;
    return sortedCats;
  }, [isAllocationMode, simulatedAllocation, sortedCats]);

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

  // Sorted independently of the active mode, since the Grid always mounts both
  // modes' cells (stacked in the same CSS grid cell) to keep their heights in sync.
  const categoryActiveItems = useMemo(() => {
    return sortProportionItems(sortedCats, sortMode, false);
  }, [sortedCats, sortMode]);

  const activeChartData = useMemo(() => {
    return buildDoughnutChartData(activeItems, hoveredIdx);
  }, [activeItems, hoveredIdx]);

  const allocationTotal = useMemo(() => {
    return totalIncome || (totalExpense + Math.max(0, netCashflow || 0));
  }, [totalExpense, totalIncome, netCashflow]);

  const activeTotal = isAllocationMode ? allocationTotal : chartTotal;

  const itemCount = isEvolutionMode
    ? evolutionData.months.filter(m => m.total > 0).length
    : activeItems.length;

  const handleChartMouseLeave = useCallback(() => {
    setIsSliceHovered(false);
    setHoveredIdx(-1);
  }, []);

  const options = useMemo(() => {
    const baseOptions = getDoughnutChartOptions(Boolean(dm));
    return {
      ...baseOptions,
      cutout: '72%', 
      onHover: (_event: any, elements: any[]) => {
        const hasElements = Boolean(elements && elements.length > 0);
        setIsSliceHovered(hasElements);
        const hoverIdx = resolveDoughnutHoverIndex(elements);
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
  }, [dm, activeItems]);
  
  const cardClass = "rounded-none border flex flex-col w-full bg-[#181818] border-[#303030] relative overflow-visible z-10";
  const isEmpty = !isEvolutionMode && itemCount === 0 && !showSkeleton;
  const hasNoIncomeData = isAllocationMode && totalIncome <= 0;

  const activeHoveredItem = (!isSliceHovered && hoveredIdx >= 0 && hoveredIdx < activeItems.length)
    ? activeItems[hoveredIdx]
    : null;

  const categoryAllocationBody = isEmpty ? (
    <ExpenseProportionEmpty />
  ) : (
    <div className="flex flex-row items-stretch h-full min-h-[196px]">
      <ExpenseProportionChart
        activeChartData={activeChartData}
        options={options}
        isAllocationMode={isAllocationMode}
        activeTotal={activeTotal}
        onMouseLeave={handleChartMouseLeave}
        isSliceHovered={isSliceHovered}
        hoveredItem={activeHoveredItem}
        activeItems={activeItems}
      />
      <ExpenseProportionGrid
        categoryItems={categoryActiveItems}
        allocationItems={simulatedAllocation}
        isAllocationMode={isAllocationMode}
        hoveredIdx={hoveredIdx}
        onHover={setHoveredIdx}
        allocationTotal={allocationTotal}
        excludedGroupIds={excludedGroupIds}
        onToggleGroup={toggleGroupExclusion}
      />
    </div>
  );

  const evolutionBody = evolutionData.hasData ? (
    <AllocationEvolutionChart months={evolutionData.months} />
  ) : (
    <AllocationEvolutionEmpty />
  );

  return (
    <div className={cardClass}>
      <ExpenseProportionHeader
        displayMode={effectiveDisplayMode}
        onChangeMode={changeDisplayMode}
        sortMode={sortMode}
        onToggleSort={handleSortToggle}
        isAllocationMode={isAllocationMode}
        excludedGroupIds={excludedGroupIds}
        totalReduced={totalReduced}
        onResetExclusions={resetExclusions}
        showSkeleton={showSkeleton}
        itemCount={itemCount}
        hasNoIncomeData={hasNoIncomeData}
        evolutionEligible={evolutionData.eligible}
        evolutionLabel={evolutionData.label}
      />

      {showSkeleton ? (
        <ExpenseProportionSkeleton />
      ) : evolutionData.eligible ? (
        // Both bodies mount at once, stacked in the same CSS grid cell
        // ([grid-area:1/1]) like ExpenseProportionGrid's own Category/
        // Allocation stack, so Evolution's height always matches whichever
        // of the two is taller instead of resizing the card on switch.
        <div className="grid flex-1">
          <div
            className={`[grid-area:1/1] ${isEvolutionMode ? 'invisible pointer-events-none' : ''}`}
            aria-hidden={isEvolutionMode}
          >
            {categoryAllocationBody}
          </div>
          <div
            className={`[grid-area:1/1] ${isEvolutionMode ? '' : 'invisible pointer-events-none'}`}
            aria-hidden={!isEvolutionMode}
          >
            {evolutionBody}
          </div>
        </div>
      ) : (
        categoryAllocationBody
      )}
    </div>
  );
}

export default React.memo(ExpenseProportion);
