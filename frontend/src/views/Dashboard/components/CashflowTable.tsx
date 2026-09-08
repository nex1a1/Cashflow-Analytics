// src/views/Dashboard/components/CashflowTable.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FileSpreadsheet, Eye, EyeOff, Filter, ChevronDown, RotateCcw } from 'lucide-react';
import { useDashboardContext, DashboardAnalyticsResult } from '../context/DashboardContext';
import { formatMoney, getThaiMonth, hexToRgb } from '../../../utils/formatters';
import { CashflowGroup, Category } from '../../../types';

// ─── Local Interfaces ─────────────────────────────────────────────────────────

interface MonthRow {
  monthStr: string;
  groups: Record<string, number>;
}

/** Alias — DashboardAnalyticsResult carries sortedCashflow / numMonths / monthlyCatMap via its index signature */
type Analytics = DashboardAnalyticsResult;

interface HoveredGroupState {
  active: boolean;
  x: number;
  y: number;
  group: CashflowGroup;
  activeCats: Category[];
}

type MonthlyMap = Record<string, Record<string, number>>;

// ─── Shared highlight helpers (single source of truth) ────────────────────────

function resolveTableHighlightOpacity(dm: boolean, isColHovered: boolean, isRowHovered: boolean): number {
  if (isColHovered && isRowHovered) return dm ? 0.22 : 0.44;
  if (isColHovered) return dm ? 0.14 : 0.34;
  if (isRowHovered) return dm ? 0.12 : 0.32;
  return dm ? 0.08 : 0.28;
}

function resolveTableSubHighlightOpacity(dm: boolean, isColHovered: boolean, isRowHovered: boolean): number {
  if (isColHovered && isRowHovered) return dm ? 0.18 : 0.36;
  if (isColHovered) return dm ? 0.12 : 0.26;
  if (isRowHovered) return dm ? 0.10 : 0.24;
  return dm ? 0.06 : 0.20;
}

function getHighlightBgColor(
  group: CashflowGroup,
  isColHovered: boolean,
  isRowHovered: boolean,
  dm: boolean | undefined,
): string {
  const hexColor = group.color || (group.type === 'income' ? '#10B981' : '#64748B');
  const rgb = hexToRgb(hexColor);
  const opacity = resolveTableHighlightOpacity(dm ?? false, isColHovered, isRowHovered);
  return `rgba(${rgb}, ${opacity})`;
}

function getSubHighlightBgColor(
  group: CashflowGroup,
  subColor: string | null | undefined,
  isColHovered: boolean,
  isRowHovered: boolean,
  dm: boolean | undefined,
): string {
  const hexColor = subColor || group.color || '#64748B';
  const rgb = hexToRgb(hexColor);
  const opacity = resolveTableSubHighlightOpacity(dm ?? false, isColHovered, isRowHovered);
  return `rgba(${rgb}, ${opacity})`;
}

// ─── Calculation helpers ───────────────────────────────────────────────────────

interface AdjustedTotalParams {
  groups: CashflowGroup[];
  row: MonthRow | null;
  excludedGroups: Set<string>;
  excludedCategories: Set<string>;
  categories: Category[];
  filteredGroupMap: MonthlyMap;
  filteredCatMap: MonthlyMap;
  analytics: Analytics;
}

function calculateAdjustedGroupsTotal({
  groups,
  row,
  excludedGroups,
  excludedCategories,
  categories,
  filteredGroupMap,
  filteredCatMap,
  analytics,
}: AdjustedTotalParams): number {
  if (!row) return 0;
  return groups
    .filter((g) => !excludedGroups.has(g.id))
    .reduce((sum, g) => {
      const rawVal = filteredGroupMap[g.id]?.[row.monthStr] ?? (row.groups[g.id] || 0);
      const groupCats = categories.filter((c) => c.cashflowGroup === g.id || c.cashflow_group_id === g.id);
      const excludedCatSum = groupCats
        .filter((c) => excludedCategories?.has(c.id))
        .reduce(
          (cSum, c) =>
            cSum +
            (filteredCatMap[c.id]?.[row.monthStr] ??
              (analytics.monthlyCatMap?.[c.id]?.[row.monthStr] || 0)),
          0,
        );
      return sum + Math.max(0, rawVal - excludedCatSum);
    }, 0);
}

interface ActiveMonthGroupTotalParams {
  groupId: string;
  activeMonths: MonthRow[];
  categories: Category[];
  excludedCategories: Set<string>;
  filteredGroupMap: MonthlyMap;
  filteredCatMap: MonthlyMap;
  analytics: Analytics;
}

function calculateActiveMonthGroupTotal({
  groupId,
  activeMonths,
  categories,
  excludedCategories,
  filteredGroupMap,
  filteredCatMap,
  analytics,
}: ActiveMonthGroupTotalParams): number {
  const groupCats = categories.filter((c) => c.cashflowGroup === groupId || c.cashflow_group_id === groupId);
  return activeMonths.reduce((s, r) => {
    const rawVal = filteredGroupMap[groupId]?.[r.monthStr] ?? (r.groups[groupId] || 0);
    const excludedCatSum = groupCats
      .filter((c) => excludedCategories?.has(c.id))
      .reduce(
        (cSum, c) =>
          cSum +
          (filteredCatMap[c.id]?.[r.monthStr] ??
            (analytics.monthlyCatMap?.[c.id]?.[r.monthStr] || 0)),
        0,
      );
    return s + Math.max(0, rawVal - excludedCatSum);
  }, 0);
}

function findPreviousActiveMonth(
  sortedCashflow: MonthRow[],
  currentMonthStr: string,
  excludedMonths: Set<string>,
): MonthRow | null {
  const currentIndex = sortedCashflow.findIndex((r) => r.monthStr === currentMonthStr);
  if (currentIndex <= 0) return null;
  for (let i = currentIndex - 1; i >= 0; i--) {
    const candidate = sortedCashflow[i];
    if (!excludedMonths.has(candidate.monthStr)) return candidate;
  }
  return null;
}

function renderMoMBadge(currentAdjustedExpense: number, prevAdjustedExpense: number): React.ReactNode {
  if (!prevAdjustedExpense || prevAdjustedExpense <= 0) return null;
  const diff = currentAdjustedExpense - prevAdjustedExpense;
  const percent = (diff / prevAdjustedExpense) * 100;
  const isUp = percent > 0;
  const isFlat = Math.abs(percent) < 0.1;

  let badgeClass = 'bg-[#303030]/40 text-slate-400 border-[#3e3e3e]/30';
  let arrow = '-';
  if (!isFlat) {
    if (isUp) {
      badgeClass = 'bg-[#da291c]/10 text-[#ff4d4d] border-[#da291c]/25';
      arrow = '↑';
    } else {
      badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      arrow = '↓';
    }
  }

  return (
    <span
      className={`inline-flex items-center justify-center w-[50px] min-w-[50px] max-w-[50px] text-[9px] font-black py-[2px] rounded-none leading-none border ${badgeClass}`}
    >
      {arrow} {Math.abs(percent).toFixed(1)}%
    </span>
  );
}

// ─── Shared prop types ─────────────────────────────────────────────────────────

interface BorderClasses {
  thinBorder: string;
  boundaryBorder: string;
  boxBorder: string;
}

interface CommonTableProps extends BorderClasses {
  activeIncomeGroups: CashflowGroup[];
  activeExpenseGroups: CashflowGroup[];
  expandedGroups: Set<string>;
  toggleGroup: (groupId: string) => void;
  getActiveCatsForGroup: (groupId: string) => Category[];
  analytics: Analytics;
  dm: boolean | undefined;
  handleMouseEnter: (e: React.MouseEvent<HTMLElement>, group: CashflowGroup) => void;
  handleMouseLeave: () => void;
  hoveredCol: string | null;
  setHoveredCol: (col: string | null) => void;
  excludedMonths: Set<string>;
  toggleMonth: (monthStr: string) => void;
  excludedGroups: Set<string>;
  toggleGroupExclusion: (groupId: string) => void;
  excludedCategories: Set<string>;
  toggleCategoryExclusion: (catId: string) => void;
  categories: Category[];
  filteredCatMap: MonthlyMap;
  filteredGroupMap: MonthlyMap;
}

// ─── INTERNAL: CashflowTableHeader ───────────────────────────────────────────

interface HeaderProps extends Omit<CommonTableProps, 'excludedMonths' | 'toggleMonth'> {
  // no additional props needed
}

const CashflowTableHeader = React.memo(({
  activeIncomeGroups,
  activeExpenseGroups,
  expandedGroups,
  toggleGroup,
  getActiveCatsForGroup,
  dm,
  thinBorder,
  boundaryBorder,
  boxBorder,
  handleMouseEnter,
  handleMouseLeave,
  hoveredCol,
  setHoveredCol,
  excludedGroups,
  toggleGroupExclusion,
  excludedCategories,
  toggleCategoryExclusion,
}: HeaderProps) => {
  // Fix #5: use module-level highlight helpers (isRowHovered = false in header)
  const getHeaderGroupBg = (group: CashflowGroup, isColHovered: boolean) =>
    getHighlightBgColor(group, isColHovered, false, dm);
  const getHeaderCatBg = (group: CashflowGroup, subColor: string | null | undefined, isColHovered: boolean) =>
    getSubHighlightBgColor(group, subColor, isColHovered, false, dm);

  return (
    <thead className="sticky top-0 z-30 bg-[#121212]">
      <tr>
        <th
          rowSpan={2}
          onMouseEnter={() => setHoveredCol('month')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-3 py-2.5 font-bold text-center sticky left-0 z-50 align-middle border-l border-r border-b ${thinBorder} shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] transition-colors ${
            hoveredCol === 'month' ? 'bg-[#303030] text-blue-300' : 'text-blue-300 bg-[#121212]'
          }`}
        >
          ช่วงเวลา
        </th>

        {activeIncomeGroups.length > 0 && (
          <th
            colSpan={activeIncomeGroups.reduce(
              (acc, g) => acc + (expandedGroups.has(g.id) ? getActiveCatsForGroup(g.id).length + 1 : 1),
              0,
            )}
            className={`px-3 py-1.5 font-black text-center border-l border-b border-dashed ${thinBorder} text-emerald-400`}
          >
            รายรับ (+)
          </th>
        )}

        {activeExpenseGroups.length > 0 && (
          <th
            colSpan={activeExpenseGroups.reduce(
              (acc, g) => acc + (expandedGroups.has(g.id) ? getActiveCatsForGroup(g.id).length + 1 : 1),
              0,
            )}
            className={`px-3 py-1.5 font-black text-center border-l border-b border-dashed ${thinBorder} text-slate-400`}
          >
            รายจ่าย (-)
          </th>
        )}

        <th
          rowSpan={2}
          onMouseEnter={() => setHoveredCol('trend')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-3 py-2.5 font-bold border-l border-b ${thinBorder} align-middle sticky right-[250px] z-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.15)] transition-colors w-[140px] min-w-[140px] max-w-[140px] ${
            hoveredCol === 'trend' ? 'bg-[#303030] text-[#ff4d4d]' : 'text-[#ff4d4d] bg-[#121212]'
          }`}
        >
          รวมรายจ่าย (Trend)
        </th>
        <th
          rowSpan={2}
          onMouseEnter={() => setHoveredCol('net')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-3 py-2.5 font-bold border-l border-b ${thinBorder} align-middle sticky right-[140px] z-50 transition-colors w-[110px] min-w-[110px] max-w-[110px] ${
            hoveredCol === 'net' ? 'bg-[#303030] text-emerald-400' : 'text-emerald-400 bg-[#121212]'
          }`}
        >
          เงินคงเหลือ
        </th>
        {/* Fix #10: เพิ่ม title tooltip อธิบายสูตรคำนวณ */}
        <th
          rowSpan={2}
          onMouseEnter={() => setHoveredCol('pct-left')}
          onMouseLeave={() => setHoveredCol(null)}
          title="(เงินคงเหลือ ÷ รายรับรวม) × 100 — อัตราการออม"
          className={`px-2 py-2.5 font-bold border-l border-b text-center align-middle sticky right-[70px] z-50 w-[70px] min-w-[70px] max-w-[70px] ${thinBorder} transition-colors cursor-help ${
            hoveredCol === 'pct-left' ? 'bg-[#303030] text-teal-400' : 'text-teal-400 bg-[#121212]'
          }`}
        >
          %เหลือ
        </th>
        {/* Fix #10: เพิ่ม title tooltip อธิบายสูตรคำนวณ */}
        <th
          rowSpan={2}
          onMouseEnter={() => setHoveredCol('pct-spent')}
          onMouseLeave={() => setHoveredCol(null)}
          title="(รายจ่ายรวม ÷ รายรับรวม) × 100 — อัตราการใช้จ่าย"
          className={`px-2 py-2.5 font-bold border-l border-r border-b text-center align-middle sticky right-0 z-50 w-[70px] min-w-[70px] max-w-[70px] ${thinBorder} transition-colors cursor-help ${
            hoveredCol === 'pct-spent' ? 'bg-[#303030] text-pink-400' : 'text-pink-400 bg-[#121212]'
          }`}
        >
          %จ่าย
        </th>
      </tr>

      <tr>
        {activeIncomeGroups.map((g, idx) => {
          const isExpanded = expandedGroups.has(g.id);
          const cats = getActiveCatsForGroup(g.id);
          const isLastIncome = idx === activeIncomeGroups.length - 1;
          const colId = `g-${g.id}`;
          const isColHovered = hoveredCol === colId;
          const isExcluded = excludedGroups.has(g.id);

          return (
            <React.Fragment key={g.id}>
              <th
                onMouseEnter={(e) => { handleMouseEnter(e, g); setHoveredCol(colId); }}
                onMouseLeave={() => { handleMouseLeave(); setHoveredCol(null); }}
                className={`px-3 py-1.5 font-extrabold text-center transition-colors border-l border-b ${isExpanded ? boxBorder : thinBorder} ${isLastIncome && !isExpanded ? boundaryBorder : ''} ${isExcluded ? 'opacity-40' : ''}`}
                style={{ color: isExcluded ? undefined : (g.color || '#34d399'), backgroundColor: getHeaderGroupBg(g, isColHovered) }}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-label={`กลุ่มรายรับ ${g.name} - คลิกเพื่อ${isExpanded ? 'ยุบ' : 'ขยาย'}`}
                    onClick={() => toggleGroup(g.id)}
                    className={`cursor-pointer inline-flex items-center bg-transparent border-0 p-0 font-extrabold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#da291c] ${isExcluded ? 'line-through text-neutral-500' : ''}`}
                    style={{ color: isExcluded ? undefined : (g.color || '#34d399') }}
                  >
                    {g.name} {isExpanded ? '«' : '»'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleGroupExclusion(g.id); }}
                    className={`p-0.5 rounded transition-colors inline-flex items-center justify-center ${
                      isExcluded
                        ? 'text-neutral-500 hover:text-neutral-300 hover:bg-[#303030]'
                        : 'text-neutral-400 hover:text-white hover:bg-[#303030]/50'
                    }`}
                    title={isExcluded ? 'นำกลับมารวมคำนวณ' : 'ยกเว้นกลุ่มนี้จากการคำนวณ'}
                  >
                    {isExcluded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </th>
              {isExpanded && cats.map((c, cIdx) => {
                const catColId = `c-${c.id}`;
                const isCatColHovered = hoveredCol === catColId;
                const isCatExcluded = excludedCategories?.has(c.id);
                const isCatFaded = isExcluded || isCatExcluded;

                return (
                  <th
                    key={c.id}
                    onMouseEnter={() => setHoveredCol(catColId)}
                    onMouseLeave={() => setHoveredCol(null)}
                    className={`px-2 py-1.5 font-black text-center text-[9px] uppercase border-l border-b transition-colors ${cIdx === cats.length - 1 && isLastIncome ? boundaryBorder : thinBorder} border-t-[#3e3e3e]/65 border-b-[#3e3e3e]/65 ${isCatFaded ? 'opacity-30' : ''}`}
                    style={{ color: isCatFaded ? '#64748B' : (c.color ?? undefined), backgroundColor: getHeaderCatBg(g, c.color, isCatColHovered) }}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className={isCatFaded ? 'line-through text-neutral-500' : ''}>{c.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleCategoryExclusion(c.id); }}
                        className={`p-0.5 rounded transition-colors inline-flex items-center justify-center ${
                          isCatExcluded
                            ? 'text-neutral-500 hover:text-neutral-300 hover:bg-[#303030]'
                            : 'text-neutral-400 hover:text-white hover:bg-[#303030]/50'
                        }`}
                        title={isCatExcluded ? 'นำหมวดหมู่นี้กลับมารวมคำนวณ' : 'ยกเว้นหมวดหมู่นี้จากการคำนวณ'}
                      >
                        {isCatExcluded ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                      </button>
                    </div>
                  </th>
                );
              })}
            </React.Fragment>
          );
        })}

        {activeExpenseGroups.map((g) => {
          const isExpanded = expandedGroups.has(g.id);
          const cats = getActiveCatsForGroup(g.id);
          const colId = `g-${g.id}`;
          const isColHovered = hoveredCol === colId;
          const isExcluded = excludedGroups.has(g.id);

          return (
            <React.Fragment key={g.id}>
              <th
                onMouseEnter={(e) => { handleMouseEnter(e, g); setHoveredCol(colId); }}
                onMouseLeave={() => { handleMouseLeave(); setHoveredCol(null); }}
                className={`px-3 py-1.5 font-bold text-center transition-colors border-l border-b ${isExpanded ? boxBorder : thinBorder} ${isExcluded ? 'opacity-40' : ''}`}
                style={{ color: isExcluded ? undefined : (g.color || '#cbd5e1'), backgroundColor: getHeaderGroupBg(g, isColHovered) }}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-label={`กลุ่มรายจ่าย ${g.name} - คลิกเพื่อ${isExpanded ? 'ยุบ' : 'ขยาย'}`}
                    onClick={() => toggleGroup(g.id)}
                    className={`cursor-pointer inline-flex items-center bg-transparent border-0 p-0 font-bold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#da291c] ${isExcluded ? 'line-through text-neutral-500' : ''}`}
                    style={{ color: isExcluded ? undefined : (g.color || '#cbd5e1') }}
                  >
                    {g.name} {isExpanded ? '«' : '»'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleGroupExclusion(g.id); }}
                    className={`p-0.5 rounded transition-colors inline-flex items-center justify-center ${
                      isExcluded
                        ? 'text-neutral-500 hover:text-neutral-300 hover:bg-[#303030]'
                        : 'text-neutral-400 hover:text-white hover:bg-[#303030]/50'
                    }`}
                    title={isExcluded ? 'นำกลับมารวมคำนวณ' : 'ยกเว้นกลุ่มนี้จากการคำนวณ'}
                  >
                    {isExcluded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </th>
              {isExpanded && cats.map((c) => {
                const catColId = `c-${c.id}`;
                const isCatColHovered = hoveredCol === catColId;
                const isCatExcluded = excludedCategories?.has(c.id);
                const isCatFaded = isExcluded || isCatExcluded;

                return (
                  <th
                    key={c.id}
                    onMouseEnter={() => setHoveredCol(catColId)}
                    onMouseLeave={() => setHoveredCol(null)}
                    className={`px-2 py-1.5 font-black text-center text-[9px] uppercase border-l border-b transition-colors ${thinBorder} border-t-[#3e3e3e]/65 border-b-[#3e3e3e]/65 ${isCatFaded ? 'opacity-30' : ''}`}
                    style={{ color: isCatFaded ? '#64748B' : (c.color ?? undefined), backgroundColor: getHeaderCatBg(g, c.color, isCatColHovered) }}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className={isCatFaded ? 'line-through text-neutral-500' : ''}>{c.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleCategoryExclusion(c.id); }}
                        className={`p-0.5 rounded transition-colors inline-flex items-center justify-center ${
                          isCatExcluded
                            ? 'text-neutral-500 hover:text-neutral-300 hover:bg-[#303030]'
                            : 'text-neutral-400 hover:text-white hover:bg-[#303030]/50'
                        }`}
                        title={isCatExcluded ? 'นำหมวดหมู่นี้กลับมารวมคำนวณ' : 'ยกเว้นหมวดหมู่นี้จากการคำนวณ'}
                      >
                        {isCatExcluded ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                      </button>
                    </div>
                  </th>
                );
              })}
            </React.Fragment>
          );
        })}
      </tr>
    </thead>
  );
});

CashflowTableHeader.displayName = 'CashflowTableHeader';

// ─── INTERNAL: CashflowTableGroupCells ────────────────────────────────────────

interface GroupCellsProps extends BorderClasses {
  g: CashflowGroup;
  idx: number;
  isLastGroup: boolean;
  isIncome: boolean;
  expandedGroups: Set<string>;
  getActiveCatsForGroup: (groupId: string) => Category[];
  row: MonthRow;
  excludedGroups: Set<string>;
  excludedCategories: Set<string>;
  categories: Category[];
  filteredGroupMap: MonthlyMap;
  filteredCatMap: MonthlyMap;
  analytics: Analytics;
  hoveredCol: string | null;
  setHoveredCol: (col: string | null) => void;
  isRowHovered: boolean;
  dm: boolean | undefined;
  isExcluded: boolean;
}

function CashflowTableGroupCells({
  g, isLastGroup, isIncome, expandedGroups, getActiveCatsForGroup,
  row, excludedGroups, excludedCategories, categories,
  filteredGroupMap, filteredCatMap, analytics,
  hoveredCol, setHoveredCol, isRowHovered, dm,
  thinBorder, boundaryBorder, boxBorder, isExcluded,
}: GroupCellsProps) {
  const isExpanded = expandedGroups.has(g.id);
  const cats = getActiveCatsForGroup(g.id);
  const colId = `g-${g.id}`;
  const isColHovered = hoveredCol === colId;
  const isGroupExcluded = excludedGroups.has(g.id);
  const isCellFaded = isExcluded || isGroupExcluded;

  const groupCats = categories.filter((c) => c.cashflowGroup === g.id || c.cashflow_group_id === g.id);
  const rawVal = filteredGroupMap[g.id]?.[row.monthStr] ?? (row.groups[g.id] || 0);
  const excludedCatSum = groupCats
    .filter((c) => excludedCategories?.has(c.id))
    .reduce(
      (cSum, c) =>
        cSum + (filteredCatMap[c.id]?.[row.monthStr] ?? (analytics.monthlyCatMap?.[c.id]?.[row.monthStr] || 0)),
      0,
    );
  const adjustedGroupVal = Math.max(0, rawVal - excludedCatSum);

  const defaultColor = isIncome ? '#34d399' : '#cbd5e1';
  const groupBg = isCellFaded ? '#0d0d0d' : getHighlightBgColor(g, isColHovered, isRowHovered, dm);
  const groupTextColor = isCellFaded ? undefined : (g.color || defaultColor);
  const boundaryCls = isLastGroup && !isExpanded ? boundaryBorder : '';

  return (
    <React.Fragment>
      <td
        onMouseEnter={() => setHoveredCol(colId)}
        onMouseLeave={() => setHoveredCol(null)}
        className={`px-3 py-2 ${isIncome ? 'font-semibold' : 'font-medium'} border-l border-b transition-colors ${isExpanded ? boxBorder : thinBorder} ${boundaryCls} ${
          isCellFaded ? 'opacity-40 select-none text-neutral-500 line-through' : ''
        }`}
        style={{ color: groupTextColor, backgroundColor: groupBg }}
      >
        {adjustedGroupVal > 0 ? formatMoney(adjustedGroupVal) : '-'}
      </td>
      {isExpanded && cats.map((c, cIdx) => {
        const amt = filteredCatMap[c.id]?.[row.monthStr] ?? (analytics.monthlyCatMap?.[c.id]?.[row.monthStr] || 0);
        const catColId = `c-${c.id}`;
        const isCatColHovered = hoveredCol === catColId;
        const isCatExcluded = excludedCategories?.has(c.id);
        const isCatFaded = isCellFaded || isCatExcluded;
        const catBoundaryCls = cIdx === cats.length - 1 && isLastGroup ? boundaryBorder : thinBorder;
        const catBg = isCatFaded ? '#0d0d0d' : getSubHighlightBgColor(g, c.color, isCatColHovered, isRowHovered, dm);

        return (
          <td
            key={c.id}
            onMouseEnter={() => setHoveredCol(catColId)}
            onMouseLeave={() => setHoveredCol(null)}
            className={`px-2 py-2 text-[10px] tabular-nums font-black border-l border-b transition-colors ${catBoundaryCls} ${
              isCatFaded ? 'opacity-40 select-none text-neutral-500 line-through' : ''
            }`}
            style={{ color: isCatFaded ? undefined : (c.color ?? undefined), backgroundColor: catBg }}
          >
            {amt > 0 ? formatMoney(amt) : '-'}
          </td>
        );
      })}
    </React.Fragment>
  );
}

// ─── INTERNAL: Summary cells ───────────────────────────────────────────────────

function getSummaryCellBg(isExcluded: boolean, isColHover: boolean, isRowHovered: boolean): string {
  if (isExcluded) return 'text-neutral-700 bg-[#0d0d0d] opacity-25 select-none line-through';
  if (isColHover) return 'bg-[#1c1c1c]';
  if (isRowHovered) return 'bg-[#1c1c1c]/80';
  return 'bg-[#181818] group-hover:bg-[#1c1c1c]';
}

interface SummaryTrendCellProps {
  isExcluded: boolean;
  isTrendHovered: boolean;
  isRowHovered: boolean;
  thinBorder: string;
  currentAdjustedExpense: number;
  prevAdjustedExpense: number;
  onHover: (col: string | null) => void;
}

function SummaryTrendCell({
  isExcluded, isTrendHovered, isRowHovered, thinBorder,
  currentAdjustedExpense, prevAdjustedExpense, onHover,
}: SummaryTrendCellProps) {
  const expMoMJSX = !isExcluded ? renderMoMBadge(currentAdjustedExpense, prevAdjustedExpense) : null;
  let bgCls = 'text-[#ff4d4d] bg-[#181818] group-hover:bg-[#1c1c1c]';
  if (isExcluded) {
    bgCls = 'text-neutral-700 bg-[#0d0d0d] opacity-25 select-none line-through';
  } else if (isTrendHovered) {
    bgCls = 'text-[#ff4d4d] bg-[#1c1c1c]';
  } else if (isRowHovered) {
    bgCls = 'text-[#ff4d4d] bg-[#1c1c1c]/80';
  }

  return (
    <td
      onMouseEnter={() => onHover('trend')}
      onMouseLeave={() => onHover(null)}
      className={`px-3 py-2 font-bold border-l border-b ${thinBorder} sticky right-[250px] z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.15)] transition-colors w-[140px] min-w-[140px] max-w-[140px] ${bgCls}`}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="shrink-0">{expMoMJSX}</div>
        <span className="text-[11px] tabular-nums">{formatMoney(currentAdjustedExpense)}</span>
      </div>
    </td>
  );
}

interface SummaryNetCellProps {
  isExcluded: boolean;
  isNetHovered: boolean;
  isRowHovered: boolean;
  thinBorder: string;
  netAmount: number;
  onHover: (col: string | null) => void;
}

function SummaryNetCell({ isExcluded, isNetHovered, isRowHovered, thinBorder, netAmount, onHover }: SummaryNetCellProps) {
  let netColor = '';
  if (!isExcluded) netColor = netAmount >= 0 ? 'text-emerald-400' : 'text-[#ff4d4d]';
  const bgCls = getSummaryCellBg(isExcluded, isNetHovered, isRowHovered);

  return (
    <td
      onMouseEnter={() => onHover('net')}
      onMouseLeave={() => onHover(null)}
      className={`px-3 py-2 font-black border-l border-b ${thinBorder} sticky right-[140px] z-10 transition-colors w-[110px] min-w-[110px] max-w-[110px] ${bgCls} ${netColor}`}
    >
      {formatMoney(netAmount)}
    </td>
  );
}

interface SummaryPctLeftCellProps {
  isExcluded: boolean;
  isPctLeftHovered: boolean;
  isRowHovered: boolean;
  thinBorder: string;
  currentAdjustedIncome: number;
  netAmount: number;
  onHover: (col: string | null) => void;
}

function SummaryPctLeftCell({
  isExcluded, isPctLeftHovered, isRowHovered, thinBorder,
  currentAdjustedIncome, netAmount, onHover,
}: SummaryPctLeftCellProps) {
  let pctLeftColor = '';
  if (!isExcluded) {
    pctLeftColor = currentAdjustedIncome > 0 && netAmount < 0 ? 'text-[#ff4d4d]' : 'text-teal-400';
  }
  const pctLeftText =
    currentAdjustedIncome > 0 ? ((netAmount / currentAdjustedIncome) * 100).toFixed(1) + '%' : '0.0%';
  const bgCls = getSummaryCellBg(isExcluded, isPctLeftHovered, isRowHovered);

  return (
    <td
      onMouseEnter={() => onHover('pct-left')}
      onMouseLeave={() => onHover(null)}
      className={`px-2 py-2 font-black border-l border-b text-center ${thinBorder} sticky right-[70px] z-10 transition-colors w-[70px] min-w-[70px] max-w-[70px] ${bgCls} ${pctLeftColor}`}
    >
      {pctLeftText}
    </td>
  );
}

interface SummaryPctSpentCellProps {
  isExcluded: boolean;
  isPctSpentHovered: boolean;
  isRowHovered: boolean;
  thinBorder: string;
  currentAdjustedIncome: number;
  currentAdjustedExpense: number;
  onHover: (col: string | null) => void;
}

function SummaryPctSpentCell({
  isExcluded, isPctSpentHovered, isRowHovered, thinBorder,
  currentAdjustedIncome, currentAdjustedExpense, onHover,
}: SummaryPctSpentCellProps) {
  let pctSpentColor = '';
  if (!isExcluded) {
    const isOverSpent = currentAdjustedIncome > 0 && currentAdjustedExpense / currentAdjustedIncome * 100 > 100;
    pctSpentColor = isOverSpent ? 'text-[#ff4d4d]' : 'text-pink-400';
  }
  const pctSpentText =
    currentAdjustedIncome > 0
      ? ((currentAdjustedExpense / currentAdjustedIncome) * 100).toFixed(1) + '%'
      : '-';
  const bgCls = getSummaryCellBg(isExcluded, isPctSpentHovered, isRowHovered);

  return (
    <td
      onMouseEnter={() => onHover('pct-spent')}
      onMouseLeave={() => onHover(null)}
      className={`px-2 py-2 font-black border-l border-r border-b text-center ${thinBorder} sticky right-0 z-10 transition-colors w-[70px] min-w-[70px] max-w-[70px] ${bgCls} ${pctSpentColor}`}
    >
      {pctSpentText}
    </td>
  );
}

interface RowSummaryCellsProps {
  currentAdjustedIncome: number;
  currentAdjustedExpense: number;
  prevAdjustedExpense: number;
  isExcluded: boolean;
  isRowHovered: boolean;
  hoveredCol: string | null;
  setHoveredCol: (col: string | null) => void;
  thinBorder: string;
}

function CashflowTableRowSummaryCells({
  currentAdjustedIncome, currentAdjustedExpense, prevAdjustedExpense,
  isExcluded, isRowHovered, hoveredCol, setHoveredCol, thinBorder,
}: RowSummaryCellsProps) {
  const netAmount = currentAdjustedIncome - currentAdjustedExpense;

  return (
    <>
      <SummaryTrendCell
        isExcluded={isExcluded}
        isTrendHovered={hoveredCol === 'trend'}
        isRowHovered={isRowHovered}
        thinBorder={thinBorder}
        currentAdjustedExpense={currentAdjustedExpense}
        prevAdjustedExpense={prevAdjustedExpense}
        onHover={setHoveredCol}
      />
      <SummaryNetCell
        isExcluded={isExcluded}
        isNetHovered={hoveredCol === 'net'}
        isRowHovered={isRowHovered}
        thinBorder={thinBorder}
        netAmount={netAmount}
        onHover={setHoveredCol}
      />
      <SummaryPctLeftCell
        isExcluded={isExcluded}
        isPctLeftHovered={hoveredCol === 'pct-left'}
        isRowHovered={isRowHovered}
        thinBorder={thinBorder}
        currentAdjustedIncome={currentAdjustedIncome}
        netAmount={netAmount}
        onHover={setHoveredCol}
      />
      <SummaryPctSpentCell
        isExcluded={isExcluded}
        isPctSpentHovered={hoveredCol === 'pct-spent'}
        isRowHovered={isRowHovered}
        thinBorder={thinBorder}
        currentAdjustedIncome={currentAdjustedIncome}
        currentAdjustedExpense={currentAdjustedExpense}
        onHover={setHoveredCol}
      />
    </>
  );
}

// ─── INTERNAL: CashflowTableRow ────────────────────────────────────────────────

interface RowProps extends CommonTableProps {
  row: MonthRow;
  isRowHovered: boolean;
  setHoveredRow: (monthStr: string | null) => void;
  isExcluded: boolean;
}

const CashflowTableRow = React.memo(({
  row, activeIncomeGroups, activeExpenseGroups, expandedGroups,
  getActiveCatsForGroup, analytics, dm, thinBorder, boundaryBorder, boxBorder,
  handleMouseEnter, handleMouseLeave,
  hoveredCol, setHoveredCol,
  isRowHovered, setHoveredRow,
  isExcluded, excludedMonths, toggleMonth,
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
  let monthCellBg = 'text-blue-300 bg-[#181818] group-hover:bg-[#1c1c1c]';
  if (isExcluded) {
    monthCellBg = 'text-neutral-500 bg-[#0f0f0f] line-through decoration-neutral-600';
  } else if (isMonthHovered) {
    monthCellBg = 'text-blue-300 bg-[#1c1c1c]';
  } else if (isRowHovered) {
    monthCellBg = 'text-blue-300 bg-[#1c1c1c]/80';
  }

  return (
    <tr
      onMouseEnter={() => setHoveredRow(row.monthStr)}
      onMouseLeave={() => setHoveredRow(null)}
      className="group hover:bg-[#303030]/10 transition-colors"
    >
      {/* Fix #9: เพิ่ม EyeOff icon บอก state ที่ถูก exclude + cursor hint */}
      <td
        onClick={() => toggleMonth(row.monthStr)}
        title={isExcluded ? 'คลิกเพื่อนำกลับมารวมคำนวณ' : 'คลิกเพื่อนำออกจากการคำนวณ'}
        onMouseEnter={() => setHoveredCol('month')}
        onMouseLeave={() => setHoveredCol(null)}
        className={`px-3 py-2 font-bold text-center sticky left-0 z-10 border-l border-r border-b ${thinBorder} shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] cursor-pointer select-none transition-colors ${monthCellBg}`}
      >
        <div className="flex items-center justify-center gap-1.5">
          {isExcluded && <EyeOff className="w-3 h-3 shrink-0 text-neutral-600" />}
          <span>{getThaiMonth(row.monthStr)}</span>
        </div>
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
          dm={dm}
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
          dm={dm}
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

// ─── INTERNAL: CashflowTableFooter ────────────────────────────────────────────

interface FooterProps extends Omit<CommonTableProps, 'toggleMonth' | 'toggleGroupExclusion' | 'toggleCategoryExclusion' | 'handleMouseEnter' | 'handleMouseLeave'> {
  // no additional props
}

const CashflowTableFooter = React.memo(({
  activeIncomeGroups, activeExpenseGroups, expandedGroups,
  getActiveCatsForGroup, analytics, thinBorder, boundaryBorder, boxBorder,
  hoveredCol, setHoveredCol,
  excludedMonths, excludedGroups, excludedCategories, categories,
  filteredCatMap = {}, filteredGroupMap = {},
}: FooterProps) => {
  // Fix #13: แสดง message แทนการหาย เมื่อมีแค่เดือนเดียว
  if (analytics.numMonths <= 1) {
    return (
      <tfoot>
        <tr>
          <td
            colSpan={999}
            className={`px-4 py-2 text-center text-[10px] text-neutral-600 italic border-t ${thinBorder} bg-[#121212]`}
          >
            ยอดรวมจะแสดงเมื่อมีข้อมูลมากกว่า 1 เดือน
          </td>
        </tr>
      </tfoot>
    );
  }

  const activeMonths: MonthRow[] = (analytics.sortedCashflow as MonthRow[]).filter((r) => !excludedMonths.has(r.monthStr));

  // Fix #3: pre-compute per-month totals once instead of calling getAdjusted* twice in reduce
  const { totalActiveIncome, totalActiveExpense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const r of activeMonths) {
      income += calculateAdjustedGroupsTotal({
        groups: activeIncomeGroups, row: r, excludedGroups, excludedCategories, categories,
        filteredGroupMap, filteredCatMap, analytics,
      });
      expense += calculateAdjustedGroupsTotal({
        groups: activeExpenseGroups, row: r, excludedGroups, excludedCategories, categories,
        filteredGroupMap, filteredCatMap, analytics,
      });
    }
    return { totalActiveIncome: income, totalActiveExpense: expense };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMonths, activeIncomeGroups, activeExpenseGroups, excludedGroups, excludedCategories, categories, filteredGroupMap, filteredCatMap, analytics]);

  const totalActiveNet = totalActiveIncome - totalActiveExpense;
  const activeSavingsRate =
    totalActiveIncome > 0 ? ((totalActiveNet / totalActiveIncome) * 100).toFixed(1) : '0.0';
  const activePctSpent =
    totalActiveIncome > 0 ? ((totalActiveExpense / totalActiveIncome) * 100).toFixed(1) : '0.0';

  return (
    <tfoot className={`font-bold border-t ${thinBorder} sticky bottom-0 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]`}>
      <tr className="text-slate-200">
        <td
          onMouseEnter={() => setHoveredCol('month')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-3 py-2.5 text-center sticky left-0 z-30 border-l border-r border-b ${thinBorder} shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] transition-colors ${
            hoveredCol === 'month' ? 'bg-[#1c1c1c]' : 'bg-[#181818]'
          }`}
        >
          รวมทั้งหมด
        </td>
        {activeIncomeGroups.map((g, idx) => {
          const isExpanded = expandedGroups.has(g.id);
          const cats = getActiveCatsForGroup(g.id);
          const isLastIncome = idx === activeIncomeGroups.length - 1;
          const colId = `g-${g.id}`;
          const isColHovered = hoveredCol === colId;
          const isGroupExcluded = excludedGroups.has(g.id);

          return (
            <React.Fragment key={g.id}>
              <td
                onMouseEnter={() => setHoveredCol(colId)}
                onMouseLeave={() => setHoveredCol(null)}
                className={`px-3 py-2.5 border-l border-b transition-colors ${isExpanded ? boxBorder : thinBorder} ${isLastIncome && !isExpanded ? boundaryBorder : ''} ${
                  isColHovered ? 'bg-[#1c1c1c]' : 'bg-[#181818]'
                } ${isGroupExcluded ? 'opacity-40 select-none text-neutral-500 line-through' : ''}`}
                style={{ color: isGroupExcluded ? undefined : (g.color || '#34d399') }}
              >
                {formatMoney(calculateActiveMonthGroupTotal({
                  groupId: g.id, activeMonths, categories, excludedCategories, filteredGroupMap, filteredCatMap, analytics,
                }))}
              </td>
              {isExpanded && cats.map((c, cIdx) => {
                const catColId = `c-${c.id}`;
                const isCatColHovered = hoveredCol === catColId;
                const isCatExcluded = excludedCategories?.has(c.id);
                const isCatFaded = isGroupExcluded || isCatExcluded;

                return (
                  <td
                    key={c.id}
                    onMouseEnter={() => setHoveredCol(catColId)}
                    onMouseLeave={() => setHoveredCol(null)}
                    className={`px-2 py-2.5 text-[9px] font-black uppercase border-l border-b transition-colors ${cIdx === cats.length - 1 && isLastIncome ? boundaryBorder : thinBorder} ${
                      isCatColHovered ? 'bg-[#1c1c1c]' : 'bg-[#181818]'
                    } ${isCatFaded ? 'opacity-40 select-none text-neutral-500 line-through' : ''}`}
                    style={{ color: isCatFaded ? '#64748B' : (c.color ?? undefined) }}
                  >
                    {formatMoney(
                      activeMonths.reduce(
                        (s, r) =>
                          s + (filteredCatMap[c.id]?.[r.monthStr] ?? (analytics.monthlyCatMap?.[c.id]?.[r.monthStr] || 0)),
                        0,
                      ),
                    )}
                  </td>
                );
              })}
            </React.Fragment>
          );
        })}

        {activeExpenseGroups.map((g) => {
          const isExpanded = expandedGroups.has(g.id);
          const cats = getActiveCatsForGroup(g.id);
          const colId = `g-${g.id}`;
          const isColHovered = hoveredCol === colId;
          const isGroupExcluded = excludedGroups.has(g.id);

          return (
            <React.Fragment key={g.id}>
              <td
                onMouseEnter={() => setHoveredCol(colId)}
                onMouseLeave={() => setHoveredCol(null)}
                className={`px-3 py-2.5 border-l border-b transition-colors ${isExpanded ? boxBorder : thinBorder} ${
                  isColHovered ? 'bg-[#1c1c1c]' : 'bg-[#181818]'
                } ${isGroupExcluded ? 'opacity-40 select-none text-neutral-500 line-through' : ''}`}
                style={{ color: isGroupExcluded ? undefined : (g.color || '#cbd5e1') }}
              >
                {formatMoney(calculateActiveMonthGroupTotal({
                  groupId: g.id, activeMonths, categories, excludedCategories, filteredGroupMap, filteredCatMap, analytics,
                }))}
              </td>
              {isExpanded && cats.map((c) => {
                const catColId = `c-${c.id}`;
                const isCatColHovered = hoveredCol === catColId;
                const isCatExcluded = excludedCategories?.has(c.id);
                const isCatFaded = isGroupExcluded || isCatExcluded;

                return (
                  <td
                    key={c.id}
                    onMouseEnter={() => setHoveredCol(catColId)}
                    onMouseLeave={() => setHoveredCol(null)}
                    className={`px-2 py-2.5 text-[9px] font-black uppercase border-l border-b transition-colors ${thinBorder} ${
                      isCatColHovered ? 'bg-[#1c1c1c]' : 'bg-[#181818]'
                    } ${isCatFaded ? 'opacity-40 select-none text-neutral-500 line-through' : ''}`}
                    style={{ color: isCatFaded ? '#64748B' : (c.color ?? undefined) }}
                  >
                    {formatMoney(
                      activeMonths.reduce(
                        (s, r) =>
                          s + (filteredCatMap[c.id]?.[r.monthStr] ?? (analytics.monthlyCatMap?.[c.id]?.[r.monthStr] || 0)),
                        0,
                      ),
                    )}
                  </td>
                );
              })}
            </React.Fragment>
          );
        })}

        <td
          onMouseEnter={() => setHoveredCol('trend')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-3 py-2.5 border-l border-b ${thinBorder} text-[#ff4d4d] sticky right-[250px] z-30 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.15)] transition-colors w-[140px] min-w-[140px] max-w-[140px] ${
            hoveredCol === 'trend' ? 'bg-[#1c1c1c]' : 'bg-[#181818]'
          }`}
        >
          {formatMoney(totalActiveExpense)}
        </td>
        <td
          onMouseEnter={() => setHoveredCol('net')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-3 py-2.5 border-l border-b ${thinBorder} sticky right-[140px] z-30 transition-colors w-[110px] min-w-[110px] max-w-[110px] ${
            hoveredCol === 'net' ? 'bg-[#1c1c1c]' : 'bg-[#181818]'
          } ${totalActiveNet >= 0 ? 'text-emerald-400' : 'text-[#ff4d4d]'}`}
        >
          {formatMoney(totalActiveNet)}
        </td>
        <td
          onMouseEnter={() => setHoveredCol('pct-left')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-2 py-2.5 border-l border-b ${thinBorder} text-center text-teal-400 sticky right-[70px] z-30 transition-colors w-[70px] min-w-[70px] max-w-[70px] ${
            hoveredCol === 'pct-left' ? 'bg-[#1c1c1c]' : 'bg-[#181818]'
          }`}
        >
          {totalActiveIncome > 0 ? `${activeSavingsRate}%` : '0%'}
        </td>
        <td
          onMouseEnter={() => setHoveredCol('pct-spent')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-2 py-2.5 border-l border-r border-b ${thinBorder} text-center text-pink-400 sticky right-0 z-30 transition-colors w-[70px] min-w-[70px] max-w-[70px] ${
            hoveredCol === 'pct-spent' ? 'bg-[#1c1c1c]' : 'bg-[#181818]'
          }`}
        >
          {totalActiveIncome > 0 ? `${activePctSpent}%` : '0%'}
        </td>
      </tr>
    </tfoot>
  );
});

CashflowTableFooter.displayName = 'CashflowTableFooter';

// ─── INTERNAL: GroupTooltip ────────────────────────────────────────────────────

// Fix #6: ลบ Framer Motion ออก — ใช้ plain div แทน (animations globally suppressed via index.css)
const GroupTooltip = ({ hoveredGroup }: { hoveredGroup: HoveredGroupState | null }) => {
  if (!hoveredGroup?.active) return null;
  const { x, y, group, activeCats } = hoveredGroup;
  if (!activeCats || activeCats.length === 0) return null;

  const groupColor = group.color || (group.type === 'income' ? '#10B981' : '#64748B');

  return createPortal(
    <div
      className="fixed pointer-events-none z-[99999]"
      style={{ left: x, top: y - 6, transform: 'translate(-50%, -100%)' }}
    >
      <div className="flex flex-col items-center min-w-[160px] max-w-[420px]">
        <div className="w-full rounded-none p-2 text-[11px] font-medium shadow-2xl border backdrop-blur-md bg-[#121212]/95 border-[#3e3e3e] text-slate-200">
          <div
            className="flex items-center gap-1.5 border-b pb-1.5 mb-1.5"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <span className="w-2 h-2 rounded-none shrink-0" style={{ backgroundColor: groupColor }} />
            <span className="font-black text-[11px] uppercase tracking-wider">{group.name}</span>
            <span className="text-[9px] font-bold opacity-60">({activeCats.length})</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {activeCats.map((c) => {
              const catColor = c.color || '#64748B';
              const rgb = hexToRgb(catColor);
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-1 py-0.5 px-1.5 rounded-none border text-[10px] font-bold text-slate-300"
                  style={{
                    backgroundColor: `rgba(${rgb}, 0.08)`,
                    borderColor: `rgba(${rgb}, 0.25)`,
                  }}
                >
                  <span className="text-[11px] leading-none shrink-0">{c.icon || '📁'}</span>
                  <span className="whitespace-nowrap leading-none">{c.name}</span>
                </div>
              );
            })}
          </div>
        </div>
        {/* Arrow */}
        <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#121212]/95" />
      </div>
    </div>,
    document.body,
  );
};

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────

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
  const { filteredCatMap, filteredGroupMap } = useMemo<{
    filteredCatMap: MonthlyMap;
    filteredGroupMap: MonthlyMap;
  }>(() => {
    const catMap: MonthlyMap = {};
    const groupMap: MonthlyMap = {};

    if (excludedAllocations.size === 0) return { filteredCatMap: catMap, filteredGroupMap: groupMap };

    const allMonths: string[] = (analytics?.sortedCashflow || []).map((r: MonthRow) => r.monthStr);
    categories.forEach((c) => {
      catMap[c.id] = {};
      allMonths.forEach((ym: string) => { catMap[c.id][ym] = 0; });
    });
    cashflowGroups.forEach((g) => {
      groupMap[g.id] = {};
      allMonths.forEach((ym: string) => { groupMap[g.id][ym] = 0; });
    });

    if (!transactions || transactions.length === 0) return { filteredCatMap: catMap, filteredGroupMap: groupMap };

    const catLookup: Record<string, Category> = {};
    categories.forEach((c) => {
      catLookup[c.id] = c;
      catLookup[String(c.id)] = c;
    });

    const groupLookup: Record<string, CashflowGroup> = {};
    cashflowGroups.forEach((g) => {
      groupLookup[g.id] = g;
      groupLookup[String(g.id)] = g;
    });

    transactions.forEach((t) => {
      if ((t as { is_deleted?: boolean }).is_deleted) return;

      const catId = (t as { category_id?: string; categoryId?: string }).category_id ??
        (t as { categoryId?: string }).categoryId;
      if (!catId) return;
      const catObj = catLookup[catId];
      const groupId = catObj?.cashflowGroup ?? catObj?.cashflow_group_id;
      if (!groupId) return;
      const groupObj = groupLookup[groupId];
      const isIncome = groupObj?.type === 'income';

      // Allocation filters apply ONLY to expenses, not income
      if (!isIncome) {
        const tAlloc: string =
          (t as { allocation_type?: string }).allocation_type ??
          (t as { allocationType?: string }).allocationType ??
          catObj?.allocation_type ??
          groupObj?.allocation_type ??
          'want';
        if (excludedAllocations.has(tAlloc)) return;
      }

      const dateStr = (t as { date?: string }).date;
      if (!dateStr) return;
      const ym = dateStr.substring(0, 7);
      const amt = (t as { amount?: number }).amount || 0;

      if (catMap[catId]?.[ym] !== undefined) catMap[catId][ym] += amt;
      if (groupId && groupMap[groupId]?.[ym] !== undefined) groupMap[groupId][ym] += amt;
    });

    return { filteredCatMap: catMap, filteredGroupMap: groupMap };
  }, [transactions, categories, cashflowGroups, excludedAllocations, analytics?.sortedCashflow]);

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

  const getActiveCatsForGroup = useCallback(
    (groupId: string): Category[] => {
      const allCatsInGroup = categories.filter(
        (c) => c.cashflowGroup === groupId || c.cashflow_group_id === groupId,
      );
      return allCatsInGroup.filter((c) =>
        analytics?.sortedCashflow?.some(
          (row: MonthRow) => (analytics.monthlyCatMap?.[c.id]?.[row.monthStr] || 0) > 0,
        ),
      );
    },
    [categories, analytics],
  );

  // Fix #8: ลบ allCats (unused), Fix #12: viewport boundary detection
  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLElement>, group: CashflowGroup) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const activeCats = getActiveCatsForGroup(group.id);

      // Clamp tooltip X so it doesn't overflow viewport
      const tooltipHalfWidth = 100; // เผื่อ min-w-[160px] / 2
      const rawX = rect.left + rect.width / 2;
      const clampedX = Math.min(
        Math.max(rawX, tooltipHalfWidth + 8),
        window.innerWidth - tooltipHalfWidth - 8,
      );

      setHoveredGroup({
        active: true,
        x: clampedX,
        y: rect.top,
        group,
        activeCats,
      });
    },
    [getActiveCatsForGroup],
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
    handleMouseEnter, handleMouseLeave,
    hoveredCol, setHoveredCol,
    excludedMonths, toggleMonth,
    excludedGroups, toggleGroupExclusion,
    excludedCategories, toggleCategoryExclusion,
    categories,
    filteredCatMap, filteredGroupMap,
  };

  return (
    <div className={`${card} overflow-hidden`}>
      {/* ─── HEADER ─── */}
      <div className="px-4 py-2 border-b flex flex-col gap-2 bg-[#121212]/80 border-[#2d2d2d]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-3 bg-[#da291c] shrink-0" />
            <FileSpreadsheet className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-200">
              ตารางสรุปกระแสเงินสด
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFilterBarOpen((prev) => !prev)}
              className={`group relative inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-extrabold rounded-none border transition-all duration-150 select-none cursor-pointer ${
                isFilterBarOpen || totalExcludedCount > 0
                  ? 'bg-[#da291c]/15 text-white border-[#da291c]/60 shadow-[0_0_12px_rgba(218,41,28,0.25)]'
                  : 'bg-[#181818] text-neutral-300 border-[#333333] hover:bg-[#222222] hover:border-neutral-500 hover:text-white'
              }`}
              title={
                totalExcludedCount > 0
                  ? `เปิด/ปิด ตัวกรอง (กำลังซ่อนอยู่ ${totalExcludedCount} รายการ)`
                  : 'เปิด/ปิด ตัวกรอง Allocation'
              }
            >
              <Filter
                className={`w-3.5 h-3.5 transition-colors ${
                  isFilterBarOpen || totalExcludedCount > 0 ? 'text-[#ff4d4d]' : 'text-neutral-400 group-hover:text-white'
                }`}
              />
              {totalExcludedCount > 0 && (
                <span className="px-1 py-[1px] text-[9.5px] font-black bg-[#da291c] text-white leading-none rounded-none shadow-sm tracking-tighter">
                  {totalExcludedCount}
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isFilterBarOpen ? 'rotate-180 text-white' : 'text-neutral-500 group-hover:text-neutral-300'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Expandable Filter Bar */}
        {isFilterBarOpen && (
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1.5 border-t border-[#262626]/80 text-[11px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mr-auto">
              โหมดปิดรายการตาม Allocation (Transaction-Level):
            </span>

            {/* Fix #11: ลบ line-through ออกจาก text ใน button — ใช้ icon + opacity แทน */}
            <button
              onClick={() => toggleAllocationFilter('want')}
              className={`px-2.5 py-1 font-bold rounded-none border transition-all inline-flex items-center gap-1.5 ${
                excludedAllocations.has('want')
                  ? 'bg-[#F59E0B]/20 text-amber-300 border-[#F59E0B]/60 opacity-60 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'bg-[#1a1a1a] text-amber-400 border-amber-800/40 hover:bg-[#252525] hover:border-amber-600/60'
              }`}
            >
              {excludedAllocations.has('want') ? (
                <EyeOff className="w-3 h-3 text-amber-400" />
              ) : (
                <Eye className="w-3 h-3 text-amber-400" />
              )}
              <span>ปิด WANT (กิเลส)</span>
            </button>

            <button
              onClick={() => toggleAllocationFilter('need')}
              className={`px-2.5 py-1 font-bold rounded-none border transition-all inline-flex items-center gap-1.5 ${
                excludedAllocations.has('need')
                  ? 'bg-[#EF4444]/20 text-red-300 border-[#EF4444]/60 opacity-60 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                  : 'bg-[#1a1a1a] text-red-400 border-red-800/40 hover:bg-[#252525] hover:border-red-600/60'
              }`}
            >
              {excludedAllocations.has('need') ? (
                <EyeOff className="w-3 h-3 text-red-400" />
              ) : (
                <Eye className="w-3 h-3 text-red-400" />
              )}
              <span>ปิด NEED (จำเป็น)</span>
            </button>

            <button
              onClick={() => toggleAllocationFilter('savings')}
              className={`px-2.5 py-1 font-bold rounded-none border transition-all inline-flex items-center gap-1.5 ${
                excludedAllocations.has('savings')
                  ? 'bg-[#10B981]/20 text-emerald-300 border-[#10B981]/60 opacity-60 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'bg-[#1a1a1a] text-emerald-400 border-emerald-800/40 hover:bg-[#252525] hover:border-emerald-600/60'
              }`}
            >
              {excludedAllocations.has('savings') ? (
                <EyeOff className="w-3 h-3 text-emerald-400" />
              ) : (
                <Eye className="w-3 h-3 text-emerald-400" />
              )}
              <span>ปิด SAVINGS (เงินออม)</span>
            </button>

            {totalExcludedCount > 0 && (
              <button
                onClick={resetFilters}
                className="px-2.5 py-1 font-bold rounded-none border border-neutral-700 bg-[#202020] text-neutral-300 hover:text-white hover:bg-[#2d2d2d] transition-colors inline-flex items-center gap-1"
                title="คืนค่าการแสดงผลทั้งหมด"
              >
                <RotateCcw className="w-3 h-3 text-neutral-400" />
                <span>ล้างตัวกรอง</span>
              </button>
            )}
          </div>
        )}
      </div>

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
