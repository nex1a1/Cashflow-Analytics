// src/views/Dashboard/components/CashflowTable/CashflowTableRow.tsx
import React, { useMemo } from 'react';
import { EyeOff } from 'lucide-react';
import { getThaiMonth } from '@/utils/formatters';
import { cycleLabel, cycleRangeLabel, toCycleKey } from '@/utils/payCycle';
import { getLocalTodayString } from '../ActivityTimeline';
import { CashflowTableGroupCells } from './CashflowTableGroupCells';
import { CashflowTableRowSummaryCells } from './CashflowTableSummaryCells';
import { calculateAdjustedGroupsTotal, findPreviousActiveMonth } from './helpers';
import { MONTH_COL_CLS } from './constants';
import { RowProps } from './types';

export const CashflowTableRow = React.memo(({
  row, activeIncomeGroups, activeExpenseGroups, expandedGroups,
  getActiveCatsForGroup, analytics, thinBorder, boundaryBorder, boxBorder,
  handleMouseEnter, handleMouseLeave,
  hoveredCol, setHoveredCol,
  isRowHovered, setHoveredRow,
  isExcluded, isPartial, isCycleMode, excludedMonths, toggleMonth,
  excludedGroups, excludedCategories, categories,
  filteredCatMap = {}, filteredGroupMap = {},
}: RowProps) => {
  // Fix #2: memoize all three adjusted totals so they don't recompute on unrelated state changes
  const prevMonth = useMemo(
    () => findPreviousActiveMonth(analytics.sortedCashflow, row.monthStr, excludedMonths),
    [analytics.sortedCashflow, row.monthStr, excludedMonths],
  );

  const adjustedTotalParams = useMemo(
    () => ({ excludedGroups, excludedCategories, categories, filteredGroupMap, filteredCatMap, analytics }),
    [excludedGroups, excludedCategories, categories, filteredGroupMap, filteredCatMap, analytics],
  );

  const currentAdjustedIncome = useMemo(
    () => calculateAdjustedGroupsTotal({ groups: activeIncomeGroups, row, ...adjustedTotalParams }),
    [activeIncomeGroups, row, adjustedTotalParams],
  );
  const currentAdjustedExpense = useMemo(
    () => calculateAdjustedGroupsTotal({ groups: activeExpenseGroups, row, ...adjustedTotalParams }),
    [activeExpenseGroups, row, adjustedTotalParams],
  );
  const prevAdjustedExpense = useMemo(
    () => calculateAdjustedGroupsTotal({ groups: activeExpenseGroups, row: prevMonth, ...adjustedTotalParams }),
    [activeExpenseGroups, prevMonth, adjustedTotalParams],
  );

  const isMonthHovered = hoveredCol === 'month';
  let monthCellBg = 'text-neutral-200 bg-canvas group-hover:bg-surface-hover';
  if (isExcluded) {
    monthCellBg = 'text-neutral-400 bg-canvas line-through decoration-neutral-600';
  } else if (isMonthHovered) {
    monthCellBg = 'text-white bg-surface-hover';
  } else if (isRowHovered) {
    monthCellBg = 'text-neutral-200 bg-surface-hover/80';
  }

  return (
    <tr
      onMouseEnter={() => setHoveredRow(row.monthStr)}
      onMouseLeave={() => setHoveredRow(null)}
      className={`group hover:bg-surface-elevated/10 transition-colors ${isPartial ? 'opacity-40' : ''}`}
      title={isPartial ? 'รอบไม่เต็ม — ไม่นำไปรวมในยอดรวมและการเทียบช่วงก่อนหน้า' : undefined}
    >
      {/* Fix #9: เพิ่ม EyeOff icon บอก state ที่ถูก exclude + cursor hint */}
      <td
        onMouseEnter={() => setHoveredCol('month')}
        onMouseLeave={() => setHoveredCol(null)}
        className={`p-0 font-bold text-center sticky left-0 z-10 border-l border-r border-b ${thinBorder} shadow-[4px_0_8px_-4px_rgb(0_0_0/calc(0.15*var(--shadow-k)))] transition-colors ${MONTH_COL_CLS} ${monthCellBg}`}
      >
        <button
          type="button"
          onClick={() => toggleMonth(row.monthStr)}
          aria-pressed={isExcluded}
          aria-label={`ยกเว้น ${isCycleMode ? cycleLabel(row.monthStr) : getThaiMonth(row.monthStr)} จากการคำนวณ`}
          title={isExcluded ? 'คลิกเพื่อนำกลับมารวมคำนวณ' : 'คลิกเพื่อนำออกจากการคำนวณ'}
          className="w-full px-3 py-2 flex items-center justify-center gap-1.5 font-bold cursor-pointer select-none"
        >
          {isExcluded && <EyeOff className="w-3 h-3 shrink-0 text-ink-muted" aria-hidden="true" />}
          {isCycleMode ? (
            <div className="flex flex-col items-center leading-tight">
              <span className="inline-flex items-center gap-1">
                {cycleLabel(row.monthStr)}
                {row.monthStr === toCycleKey(getLocalTodayString()) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" title="รอบปัจจุบัน (ยังไม่จบ)" />
                )}
              </span>
              <span className="text-[11px] font-normal text-neutral-500">{cycleRangeLabel(row.monthStr)}</span>
            </div>
          ) : (
            <span>{getThaiMonth(row.monthStr)}</span>
          )}
        </button>
      </td>

      {activeIncomeGroups.map((g, idx) => (
        <CashflowTableGroupCells
          key={g.id}
          g={g}
          idx={idx}
          isLastGroup={idx === activeIncomeGroups.length - 1}
          isIncome={true}
          expandedGroups={expandedGroups}
          getActiveCatsForGroup={getActiveCatsForGroup}
          row={row}
          excludedGroups={excludedGroups}
          excludedCategories={excludedCategories}
          categories={categories}
          filteredGroupMap={filteredGroupMap}
          filteredCatMap={filteredCatMap}
          analytics={analytics}
          hoveredCol={hoveredCol}
          setHoveredCol={setHoveredCol}
          isRowHovered={isRowHovered}
          thinBorder={thinBorder}
          boundaryBorder={boundaryBorder}
          boxBorder={boxBorder}
          isExcluded={isExcluded}
        />
      ))}

      {/* Fix #4: ส่ง idx และ isLastGroup ที่ถูกต้องแทนการ hardcode */}
      {activeExpenseGroups.map((g, idx) => (
        <CashflowTableGroupCells
          key={g.id}
          g={g}
          idx={idx}
          isLastGroup={idx === activeExpenseGroups.length - 1}
          isIncome={false}
          expandedGroups={expandedGroups}
          getActiveCatsForGroup={getActiveCatsForGroup}
          row={row}
          excludedGroups={excludedGroups}
          excludedCategories={excludedCategories}
          categories={categories}
          filteredGroupMap={filteredGroupMap}
          filteredCatMap={filteredCatMap}
          analytics={analytics}
          hoveredCol={hoveredCol}
          setHoveredCol={setHoveredCol}
          isRowHovered={isRowHovered}
          thinBorder={thinBorder}
          boundaryBorder={boundaryBorder}
          boxBorder={boxBorder}
          isExcluded={isExcluded}
        />
      ))}

      <CashflowTableRowSummaryCells
        currentAdjustedIncome={currentAdjustedIncome}
        currentAdjustedExpense={currentAdjustedExpense}
        prevAdjustedExpense={prevAdjustedExpense}
        isExcluded={isExcluded}
        isRowHovered={isRowHovered}
        hoveredCol={hoveredCol}
        setHoveredCol={setHoveredCol}
        thinBorder={thinBorder}
      />
    </tr>
  );
});

CashflowTableRow.displayName = 'CashflowTableRow';
