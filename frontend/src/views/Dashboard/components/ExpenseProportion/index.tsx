// src/views/Dashboard/components/ExpenseProportion/index.tsx
import { useMemo, useState, useCallback } from 'react';
import { Inbox, TrendingUp } from 'lucide-react';
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
  planOf,
} from './proportionHelpers';
import { ExpenseProportionHeader } from './ExpenseProportionHeader';
import { ExpenseProportionGrid } from './ExpenseProportionGrid';
import { AllocationEvolutionChart } from './AllocationEvolutionChart';
import { monthKeyOf } from '@/utils/payCycle';
import useToday from '@/hooks/useToday';
import type { AllocationEvolutionData } from '@/utils/allocationEvolutionHelpers';

function ExpenseProportionEmpty() {
  return (
    <div className="flex flex-col w-full h-full items-center justify-center text-center text-ink-body p-10">
      <Inbox className="w-10 h-10 mb-2 opacity-20" />
      <p className="text-sm font-bold uppercase tracking-widest">ไม่มีข้อมูลรายจ่าย</p>
      <p className="text-[11px] font-medium normal-case tracking-normal mt-1">
        ลองเปลี่ยนเดือน หรือเพิ่มรายการรายจ่ายใหม่
      </p>
    </div>
  );
}

function AllocationEvolutionEmpty() {
  return (
    <div className="flex flex-col w-full h-full items-center justify-center text-center text-ink-body p-10">
      <TrendingUp className="w-10 h-10 mb-2 opacity-20" />
      <p className="text-sm font-bold uppercase tracking-widest">ยังไม่มีข้อมูลย้อนหลังพอ</p>
      <p className="text-[11px] font-medium normal-case tracking-normal mt-1">
        บันทึกรายการต่อเนื่องอย่างน้อย 2 เดือนเพื่อดูแนวโน้ม 50/30/20
      </p>
    </div>
  );
}

const SKELETON_KEYS = Array.from({ length: 12 }, (_, i) => `prop-skel-${i}`);

/** Same shape as the category view: the strip, then rows in four columns. */
function ExpenseProportionSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-3 animate-pulse">
      <div className="h-3 bg-surface-elevated" />
      <div className="grid grid-cols-4 gap-px bg-line">
        {SKELETON_KEYS.map((key) => (
          <div key={key} className="h-8 px-2.5 flex items-center gap-2 bg-surface">
            <div className="h-2 flex-1 max-w-24 bg-surface-elevated" />
            <div className="h-2 w-10 ml-auto bg-surface-elevated" />
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
  const { analytics, showSkeleton, filterPeriod } = useDashboardContext();
  const today = useToday();
  const [displayMode, setDisplayMode] = useState<DisplayMode>('category');
  const [sortMode, setSortMode] = useState<SortMode>('amount-desc');
  const [hoveredIdx, setHoveredIdx] = useState<number>(-1);
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
      return prev === 'order-asc' ? 'order-desc' : 'order-asc';
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

  // money dated after today (entered ahead): drawn hatched in the cells, summed in the header
  const planTotal = useMemo(() => activeItems.reduce((sum, i) => sum + planOf(i), 0), [activeItems]);

  const allocationTotal = useMemo(() => {
    return totalIncome || (totalExpense + Math.max(0, netCashflow || 0));
  }, [totalExpense, totalIncome, netCashflow]);

  const activeTotal = isAllocationMode ? allocationTotal : chartTotal;

  const itemCount = isEvolutionMode
    ? evolutionData.months.filter(m => m.total > 0).length
    : activeItems.length;

  const cardClass = "rounded-none border flex flex-col w-full bg-canvas border-line relative overflow-visible z-10";
  const isEmpty = !isEvolutionMode && itemCount === 0 && !showSkeleton;
  const hasNoIncomeData = isAllocationMode && totalIncome <= 0;

  const categoryAllocationBody = isEmpty ? (
    <ExpenseProportionEmpty />
  ) : (
    <div className="flex flex-row items-stretch h-full">
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
    <AllocationEvolutionChart months={evolutionData.months} currentKey={monthKeyOf(today, filterPeriod)} />
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
        hasPlan={planTotal > 0 && !isEvolutionMode}
        total={isEvolutionMode || isEmpty ? undefined : activeTotal}
        planTotal={planTotal}
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
