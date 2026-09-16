// src/views/Dashboard/components/CashflowTable/index.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { useDashboardContext } from '../../context/DashboardContext';
import { CashflowGroup, Category } from '@/types';
import { FilterToolbar } from './FilterToolbar';
import { CashflowTableHeader } from './CashflowTableHeader';
import { CashflowTableRow } from './CashflowTableRow';
import { CashflowTableFooter } from './CashflowTableFooter';
import { GroupTooltip } from './GroupTooltip';
import { useFilteredMaps } from './useFilteredMaps';
import { CommonTableProps, HoveredGroupState, MonthRow } from './types';

export default function CashflowTable() {
  const { analytics, transactions = [], cashflowGroups = [], categories = [], dm, showSkeleton } =
    useDashboardContext();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [hoveredGroup, setHoveredGroup] = useState<HoveredGroupState | null>(null);

  const [hoveredCol, setHoveredCol] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const [excludedMonths, setExcludedMonths] = useState<Set<string>>(new Set());
  const [excludedGroups, setExcludedGroups] = useState<Set<string>>(new Set());
  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set());
  const [excludedAllocations, setExcludedAllocations] = useState<Set<string>>(new Set());
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);

  // ─── Transaction-level allocation aggregation engine ───────────────────────
  const { filteredCatMap, filteredGroupMap } = useFilteredMaps({
    transactions, categories, cashflowGroups, excludedAllocations, analytics,
  });

  // ─── Callbacks ─────────────────────────────────────────────────────────────
  const toggleMonth = useCallback((monthStr: string) => {
    setExcludedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthStr)) next.delete(monthStr); else next.add(monthStr);
      return next;
    });
  }, []);

  const toggleGroupExclusion = useCallback((groupId: string) => {
    setExcludedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
      return next;
    });
  }, []);

  const toggleCategoryExclusion = useCallback((catId: string) => {
    setExcludedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId); else next.add(catId);
      return next;
    });
  }, []);

  const toggleAllocationFilter = useCallback((allocType: string) => {
    setExcludedAllocations((prev) => {
      const next = new Set(prev);
      if (next.has(allocType)) next.delete(allocType); else next.add(allocType);
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setExcludedGroups(new Set());
    setExcludedCategories(new Set());
    setExcludedMonths(new Set());
    setExcludedAllocations(new Set());
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
      return next;
    });
  }, []);

  // Fix #6: precompute once per (categories, analytics) change instead of re-scanning
  // every category × month for every (row, group) pair the table renders.
  const activeCatsByGroup = useMemo(() => {
    const map = new Map<string, Category[]>();
    categories.forEach((c) => {
      const groupId = c.cashflowGroup ?? c.cashflow_group_id;
      if (!groupId) return;
      const hasData = analytics?.sortedCashflow?.some(
        (row: MonthRow) => (analytics.monthlyCatMap?.[c.id]?.[row.monthStr] || 0) > 0,
      );
      if (!hasData) return;
      if (!map.has(groupId)) map.set(groupId, []);
      map.get(groupId)!.push(c);
    });
    return map;
  }, [categories, analytics]);

  const getActiveCatsForGroup = useCallback(
    (groupId: string): Category[] => activeCatsByGroup.get(groupId) || [],
    [activeCatsByGroup],
  );

  // Fix #8: ลบ allCats (unused), Fix #12: viewport boundary detection
  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLElement>, group: CashflowGroup) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const activeCats = getActiveCatsForGroup(group.id);

      // Clamp tooltip X so it doesn't overflow viewport
      const tooltipHalfWidth = 110;
      const rawX = rect.left + rect.width / 2;
      const clampedX = Math.min(
        Math.max(rawX, tooltipHalfWidth + 8),
        window.innerWidth - tooltipHalfWidth - 8,
      );

      setHoveredGroup({
        active: true,
        x: clampedX,
        y: rect.top,
        type: 'group',
        group,
        activeCats,
      });
    },
    [getActiveCatsForGroup],
  );

  const handleCategoryMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLElement>, group: CashflowGroup, category: Category) => {
      const rect = e.currentTarget.getBoundingClientRect();

      const tooltipHalfWidth = 90;
      const rawX = rect.left + rect.width / 2;
      const clampedX = Math.min(
        Math.max(rawX, tooltipHalfWidth + 8),
        window.innerWidth - tooltipHalfWidth - 8,
      );

      setHoveredGroup({
        active: true,
        x: clampedX,
        y: rect.top,
        type: 'category',
        group,
        category,
        activeCats: [],
      });
    },
    [],
  );

  const handleMouseLeave = useCallback(() => { setHoveredGroup(null); }, []);

  const activeIncomeGroups = useMemo(
    () =>
      (cashflowGroups || [])
        .filter((g) => g.type === 'income')
        .sort((a, b) => a.order_index - b.order_index)
        .filter(
          (g) =>
            analytics?.sortedCashflow?.some((row: MonthRow) => (row.groups[g.id] || 0) > 0) || showSkeleton,
        ),
    [cashflowGroups, analytics?.sortedCashflow, showSkeleton],
  );

  const activeExpenseGroups = useMemo(
    () =>
      (cashflowGroups || [])
        .filter((g) => g.type === 'expense')
        .sort((a, b) => a.order_index - b.order_index)
        .filter(
          (g) =>
            analytics?.sortedCashflow?.some((row: MonthRow) => (row.groups[g.id] || 0) > 0) || showSkeleton,
        ),
    [cashflowGroups, analytics?.sortedCashflow, showSkeleton],
  );

  if (!showSkeleton && (!analytics || analytics.numMonths === 0 || !cashflowGroups || cashflowGroups.length === 0))
    return null;

  const thinBorder = 'border-[#303030]/60';
  const boxBorder = 'border-[#3e3e3e]';
  const boundaryBorder = 'border-r-2 !border-r-[#303030]';
  const card = 'rounded-none border shadow-sm transition-colors bg-[#181818] border-[#303030]';

  const totalExcludedCount =
    excludedGroups.size + excludedCategories.size + excludedMonths.size + excludedAllocations.size;

  const segmentProps: CommonTableProps = {
    activeIncomeGroups, activeExpenseGroups, expandedGroups, toggleGroup,
    getActiveCatsForGroup, analytics, dm, thinBorder, boundaryBorder, boxBorder,
    handleMouseEnter, handleCategoryMouseEnter, handleMouseLeave,
    hoveredCol, setHoveredCol,
    excludedMonths, toggleMonth,
    excludedGroups, toggleGroupExclusion,
    excludedCategories, toggleCategoryExclusion,
    categories,
    filteredCatMap, filteredGroupMap,
  };

  return (
    <div className={`${card} overflow-hidden`}>
      <FilterToolbar
        isFilterBarOpen={isFilterBarOpen}
        setIsFilterBarOpen={setIsFilterBarOpen}
        excludedAllocations={excludedAllocations}
        toggleAllocationFilter={toggleAllocationFilter}
        resetFilters={resetFilters}
        totalExcludedCount={totalExcludedCount}
      />

      <div
        className="overflow-x-auto overflow-y-hidden custom-scrollbar"
        style={{ scrollbarWidth: 'thin', scrollbarGutter: 'auto' }}
      >
        {showSkeleton ? (
          <div className="p-8">
            <div className="h-40 w-full rounded-none animate-pulse bg-[#303030]/40" />
          </div>
        ) : (
          <table className="w-full min-w-full text-right text-[13px] whitespace-nowrap border-separate border-spacing-0">
            <CashflowTableHeader {...segmentProps} />
            <tbody className="divide-y divide-[#303030]/40">
              {analytics.sortedCashflow.map((row: MonthRow) => (
                <CashflowTableRow
                  key={row.monthStr}
                  row={row}
                  isRowHovered={hoveredRow === row.monthStr}
                  setHoveredRow={setHoveredRow}
                  isExcluded={excludedMonths.has(row.monthStr)}
                  {...segmentProps}
                />
              ))}
            </tbody>
            <CashflowTableFooter {...segmentProps} />
          </table>
        )}
      </div>
      <GroupTooltip hoveredGroup={hoveredGroup} />
    </div>
  );
}
