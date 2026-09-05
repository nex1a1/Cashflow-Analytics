// src/views/Dashboard/components/CashflowTable.jsx
import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, Eye, EyeOff, Filter, ChevronDown, RotateCcw } from 'lucide-react';
import { useDashboardContext } from '../context/DashboardContext';
import { formatMoney, getThaiMonth, hexToRgb } from '../../../utils/formatters';

function resolveTableHighlightOpacity(dm, isColHovered, isRowHovered) {
  if (isColHovered && isRowHovered) {
    return dm ? 0.22 : 0.44;
  }
  if (isColHovered) {
    return dm ? 0.14 : 0.34;
  }
  if (isRowHovered) {
    return dm ? 0.12 : 0.32;
  }
  return dm ? 0.08 : 0.28;
}

function resolveTableSubHighlightOpacity(dm, isColHovered, isRowHovered) {
  if (isColHovered && isRowHovered) {
    return dm ? 0.18 : 0.36;
  }
  if (isColHovered) {
    return dm ? 0.12 : 0.26;
  }
  if (isRowHovered) {
    return dm ? 0.10 : 0.24;
  }
  return dm ? 0.06 : 0.20;
}

function getHighlightBgColor(group, isColHovered, isRowHovered, dm) {
  const hexColor = group.color || (group.type === 'income' ? '#10B981' : '#64748B');
  const rgb = hexToRgb(hexColor);
  const opacity = resolveTableHighlightOpacity(dm, isColHovered, isRowHovered);
  return `rgba(${rgb}, ${opacity})`;
}

function getSubHighlightBgColor(group, subColor, isColHovered, isRowHovered, dm) {
  const hexColor = subColor || group.color || '#64748B';
  const rgb = hexToRgb(hexColor);
  const opacity = resolveTableSubHighlightOpacity(dm, isColHovered, isRowHovered);
  return `rgba(${rgb}, ${opacity})`;
}

function calculateAdjustedGroupsTotal({
  groups,
  row,
  excludedGroups,
  excludedCategories,
  categories,
  filteredGroupMap,
  filteredCatMap,
  analytics
}) {
  if (!row) return 0;
  return groups
    .filter(g => !excludedGroups.has(g.id))
    .reduce((sum, g) => {
      const rawVal = filteredGroupMap[g.id]?.[row.monthStr] ?? (row.groups[g.id] || 0);
      const groupCats = categories.filter(c => c.cashflowGroup === g.id || c.cashflow_group_id === g.id);
      const excludedCatSum = groupCats
        .filter(c => excludedCategories?.has(c.id))
        .reduce((cSum, c) => cSum + (filteredCatMap[c.id]?.[row.monthStr] ?? (analytics.monthlyCatMap?.[c.id]?.[row.monthStr] || 0)), 0);
      return sum + Math.max(0, rawVal - excludedCatSum);
    }, 0);
}

function calculateActiveMonthGroupTotal({
  groupId,
  activeMonths,
  categories,
  excludedCategories,
  filteredGroupMap,
  filteredCatMap,
  analytics
}) {
  const groupCats = categories.filter(c => c.cashflowGroup === groupId || c.cashflow_group_id === groupId);
  return activeMonths.reduce((s, r) => {
    const rawVal = filteredGroupMap[groupId]?.[r.monthStr] ?? (r.groups[groupId] || 0);
    const excludedCatSum = groupCats
      .filter(c => excludedCategories?.has(c.id))
      .reduce((cSum, c) => cSum + (filteredCatMap[c.id]?.[r.monthStr] ?? (analytics.monthlyCatMap?.[c.id]?.[r.monthStr] || 0)), 0);
    return s + Math.max(0, rawVal - excludedCatSum);
  }, 0);
}

function findPreviousActiveMonth(sortedCashflow, currentMonthStr, excludedMonths) {
  const currentIndex = sortedCashflow.findIndex(r => r.monthStr === currentMonthStr);
  if (currentIndex <= 0) return null;
  for (let i = currentIndex - 1; i >= 0; i--) {
    const candidate = sortedCashflow[i];
    if (!excludedMonths.has(candidate.monthStr)) {
      return candidate;
    }
  }
  return null;
}

function renderMoMBadge(currentAdjustedExpense, prevAdjustedExpense) {
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
    <span className={`inline-flex items-center justify-center w-[50px] min-w-[50px] max-w-[50px] text-[9px] font-black py-[2px] rounded-none leading-none border ${badgeClass}`}>
      {arrow} {Math.abs(percent).toFixed(1)}%
    </span>
  );
}

/**
 * INTERNAL COMPONENT: CashflowTableHeader
 */
const CashflowTableHeader = React.memo(({ 
  activeIncomeGroups, activeExpenseGroups, expandedGroups, toggleGroup, 
  getActiveCatsForGroup, dm, thinBorder, boundaryBorder, boxBorder,
  handleMouseEnter, handleMouseLeave,
  hoveredCol, setHoveredCol,
  excludedGroups, toggleGroupExclusion,
  excludedCategories, toggleCategoryExclusion
}) => {
  const getHighlightBg = (group, isHovered) => {
    const hexColor = group.color || (group.type === 'income' ? '#10B981' : '#64748B');
    const rgb = hexToRgb(hexColor);
    let opacity = dm ? 0.08 : 0.28;
    if (isHovered) opacity = dm ? 0.16 : 0.38;
    return `rgba(${rgb}, ${opacity})`;
  };

  const getSubHighlightBg = (group, subColor, isHovered) => {
    const hexColor = subColor || group.color || '#64748B';
    const rgb = hexToRgb(hexColor);
    let opacity = dm ? 0.06 : 0.20;
    if (isHovered) opacity = dm ? 0.12 : 0.30;
    return `rgba(${rgb}, ${opacity})`;
  };

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
          <th colSpan={activeIncomeGroups.reduce((acc, g) => acc + (expandedGroups.has(g.id) ? getActiveCatsForGroup(g.id).length + 1 : 1), 0)} className={`px-3 py-1.5 font-black text-center border-l border-b border-dashed ${thinBorder} ${'text-emerald-400'}`}>
            รายรับ (+)
          </th>
        )}

        {activeExpenseGroups.length > 0 && (
          <th colSpan={activeExpenseGroups.reduce((acc, g) => acc + (expandedGroups.has(g.id) ? getActiveCatsForGroup(g.id).length + 1 : 1), 0)} className={`px-3 py-1.5 font-black text-center border-l border-b border-dashed ${thinBorder} ${'text-slate-400'}`}>
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
        <th 
          rowSpan={2} 
          onMouseEnter={() => setHoveredCol('pct-left')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-2 py-2.5 font-bold border-l border-b text-center align-middle sticky right-[70px] z-50 w-[70px] min-w-[70px] max-w-[70px] ${thinBorder} transition-colors ${
            hoveredCol === 'pct-left' ? 'bg-[#303030] text-teal-400' : 'text-teal-400 bg-[#121212]'
          }`}
        >
          %เหลือ
        </th>
        <th 
          rowSpan={2} 
          onMouseEnter={() => setHoveredCol('pct-spent')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-2 py-2.5 font-bold border-l border-r border-b text-center align-middle sticky right-0 z-50 w-[70px] min-w-[70px] max-w-[70px] ${thinBorder} transition-colors ${
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
                onMouseEnter={(e) => {
                  handleMouseEnter(e, g);
                  setHoveredCol(colId);
                }}
                onMouseLeave={() => {
                  handleMouseLeave();
                  setHoveredCol(null);
                }}
                className={`px-3 py-1.5 font-extrabold text-center transition-colors border-l border-b ${isExpanded ? boxBorder : thinBorder} ${isLastIncome && !isExpanded ? boundaryBorder : ''} ${isExcluded ? 'opacity-40' : ''}`} 
                style={{ color: isExcluded ? undefined : (g.color || '#34d399'), backgroundColor: getHighlightBg(g, isColHovered) }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleGroupExclusion(g.id);
                    }}
                    className={`p-0.5 rounded transition-colors inline-flex items-center justify-center ${
                      isExcluded 
                        ? 'text-neutral-500 hover:text-neutral-300 hover:bg-[#303030]' 
                        : 'text-neutral-400 hover:text-white hover:bg-[#303030]/50'
                    }`}
                    title={isExcluded ? "นำกลับมารวมคำนวณ" : "ยกเว้นกลุ่มนี้จากการคำนวณ"}
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
                    style={{ color: isCatFaded ? '#64748B' : c.color, backgroundColor: getSubHighlightBg(g, c.color, isCatColHovered) }}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className={isCatFaded ? 'line-through text-neutral-500' : ''}>
                        {c.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategoryExclusion(c.id);
                        }}
                        className={`p-0.5 rounded transition-colors inline-flex items-center justify-center ${
                          isCatExcluded 
                            ? 'text-neutral-500 hover:text-neutral-300 hover:bg-[#303030]' 
                            : 'text-neutral-400 hover:text-white hover:bg-[#303030]/50'
                        }`}
                        title={isCatExcluded ? "นำหมวดหมู่นี้กลับมารวมคำนวณ" : "ยกเว้นหมวดหมู่นี้จากการคำนวณ"}
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
                onMouseEnter={(e) => {
                  handleMouseEnter(e, g);
                  setHoveredCol(colId);
                }}
                onMouseLeave={() => {
                  handleMouseLeave();
                  setHoveredCol(null);
                }}
                className={`px-3 py-1.5 font-bold text-center transition-colors border-l border-b ${isExpanded ? boxBorder : thinBorder} ${isExcluded ? 'opacity-40' : ''}`} 
                style={{ color: isExcluded ? undefined : (g.color || '#cbd5e1'), backgroundColor: getHighlightBg(g, isColHovered) }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleGroupExclusion(g.id);
                    }}
                    className={`p-0.5 rounded transition-colors inline-flex items-center justify-center ${
                      isExcluded 
                        ? 'text-neutral-500 hover:text-neutral-300 hover:bg-[#303030]' 
                        : 'text-neutral-400 hover:text-white hover:bg-[#303030]/50'
                    }`}
                    title={isExcluded ? "นำกลับมารวมคำนวณ" : "ยกเว้นกลุ่มนี้จากการคำนวณ"}
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
                    style={{ color: isCatFaded ? '#64748B' : c.color, backgroundColor: getSubHighlightBg(g, c.color, isCatColHovered) }}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className={isCatFaded ? 'line-through text-neutral-500' : ''}>
                        {c.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategoryExclusion(c.id);
                        }}
                        className={`p-0.5 rounded transition-colors inline-flex items-center justify-center ${
                          isCatExcluded 
                            ? 'text-neutral-500 hover:text-neutral-300 hover:bg-[#303030]' 
                            : 'text-neutral-400 hover:text-white hover:bg-[#303030]/50'
                        }`}
                        title={isCatExcluded ? "นำหมวดหมู่นี้กลับมารวมคำนวณ" : "ยกเว้นหมวดหมู่นี้จากการคำนวณ"}
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

function CashflowTableGroupCells({
  g, idx, isLastGroup, isIncome, expandedGroups, getActiveCatsForGroup,
  row, excludedGroups, excludedCategories, categories,
  filteredGroupMap, filteredCatMap, analytics,
  hoveredCol, setHoveredCol, isRowHovered, dm,
  thinBorder, boundaryBorder, boxBorder, isExcluded
}) {
  const isExpanded = expandedGroups.has(g.id);
  const cats = getActiveCatsForGroup(g.id);
  const colId = `g-${g.id}`;
  const isColHovered = hoveredCol === colId;
  const isGroupExcluded = excludedGroups.has(g.id);
  const isCellFaded = isExcluded || isGroupExcluded;

  const groupCats = categories.filter(c => c.cashflowGroup === g.id || c.cashflow_group_id === g.id);
  const rawVal = filteredGroupMap[g.id]?.[row.monthStr] ?? (row.groups[g.id] || 0);
  const excludedCatSum = groupCats
    .filter(c => excludedCategories?.has(c.id))
    .reduce((cSum, c) => cSum + (filteredCatMap[c.id]?.[row.monthStr] ?? (analytics.monthlyCatMap?.[c.id]?.[row.monthStr] || 0)), 0);
  const adjustedGroupVal = Math.max(0, rawVal - excludedCatSum);

  const defaultColor = isIncome ? '#34d399' : '#cbd5e1';
  const groupBg = isCellFaded ? '#0d0d0d' : getHighlightBgColor(g, isColHovered, isRowHovered, dm);
  const groupTextColor = isCellFaded ? undefined : (g.color || defaultColor);
  const boundaryCls = isLastGroup && !isExpanded ? boundaryBorder : '';

  return (
    <React.Fragment key={g.id}>
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
            style={{ color: isCatFaded ? undefined : c.color, backgroundColor: catBg }}
          >
            {amt > 0 ? formatMoney(amt) : '-'}
          </td>
        );
      })}
    </React.Fragment>
  );
}

function getSummaryCellBg(isExcluded, isColHover, isRowHovered) {
  if (isExcluded) return 'text-neutral-700 bg-[#0d0d0d] opacity-25 select-none line-through';
  if (isColHover) return 'bg-[#1c1c1c]';
  if (isRowHovered) return 'bg-[#1c1c1c]/80';
  return 'bg-[#181818] group-hover:bg-[#1c1c1c]';
}

function SummaryTrendCell({
  isExcluded,
  isTrendHovered,
  isRowHovered,
  thinBorder,
  currentAdjustedExpense,
  prevAdjustedExpense,
  onHover,
}) {
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

function SummaryNetCell({
  isExcluded,
  isNetHovered,
  isRowHovered,
  thinBorder,
  netAmount,
  onHover,
}) {
  let netColor = '';
  if (!isExcluded) {
    netColor = netAmount >= 0 ? 'text-emerald-400' : 'text-[#ff4d4d]';
  }
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

function SummaryPctLeftCell({
  isExcluded,
  isPctLeftHovered,
  isRowHovered,
  thinBorder,
  currentAdjustedIncome,
  netAmount,
  onHover,
}) {
  let pctLeftColor = '';
  if (!isExcluded) {
    pctLeftColor = (currentAdjustedIncome > 0 && netAmount < 0) ? 'text-[#ff4d4d]' : 'text-teal-400';
  }
  const pctLeftText = currentAdjustedIncome > 0 ? ((netAmount / currentAdjustedIncome) * 100).toFixed(1) + '%' : '0.0%';
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

function SummaryPctSpentCell({
  isExcluded,
  isPctSpentHovered,
  isRowHovered,
  thinBorder,
  currentAdjustedIncome,
  currentAdjustedExpense,
  onHover,
}) {
  let pctSpentColor = '';
  if (!isExcluded) {
    const isOverSpent = currentAdjustedIncome > 0 && (currentAdjustedExpense / currentAdjustedIncome * 100) > 100;
    pctSpentColor = isOverSpent ? 'text-[#ff4d4d]' : 'text-pink-400';
  }
  const pctSpentText = currentAdjustedIncome > 0 ? ((currentAdjustedExpense / currentAdjustedIncome * 100).toFixed(1) + '%') : '-';
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

function CashflowTableRowSummaryCells({
  currentAdjustedIncome, currentAdjustedExpense, prevAdjustedExpense,
  isExcluded, isRowHovered, hoveredCol, setHoveredCol, thinBorder
}) {
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

/**
 * INTERNAL COMPONENT: CashflowTableRow
 */
const CashflowTableRow = React.memo(({ 
  row, activeIncomeGroups, activeExpenseGroups, expandedGroups, 
  getActiveCatsForGroup, analytics, dm, thinBorder, boundaryBorder, boxBorder,
  handleMouseEnter, handleMouseLeave,
  hoveredCol, setHoveredCol,
  isRowHovered, setHoveredRow,
  isExcluded, excludedMonths, toggleMonth,
  excludedGroups, excludedCategories, categories,
  filteredCatMap = {}, filteredGroupMap = {}
}) => {
  const prevMonth = findPreviousActiveMonth(analytics.sortedCashflow, row.monthStr, excludedMonths);

  const currentAdjustedIncome = calculateAdjustedGroupsTotal({
    groups: activeIncomeGroups, row, excludedGroups, excludedCategories, categories, filteredGroupMap, filteredCatMap, analytics
  });
  const currentAdjustedExpense = calculateAdjustedGroupsTotal({
    groups: activeExpenseGroups, row, excludedGroups, excludedCategories, categories, filteredGroupMap, filteredCatMap, analytics
  });
  const prevAdjustedExpense = calculateAdjustedGroupsTotal({
    groups: activeExpenseGroups, row: prevMonth, excludedGroups, excludedCategories, categories, filteredGroupMap, filteredCatMap, analytics
  });

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
      <td 
        onClick={() => toggleMonth(row.monthStr)}
        title={isExcluded ? "คลิกเพื่อนำกลับมารวมคำนวณ" : "คลิกเพื่อนำออกจากการคำนวณทางด้านขวา"}
        onMouseEnter={() => setHoveredCol('month')}
        onMouseLeave={() => setHoveredCol(null)}
        className={`px-3 py-2 font-bold text-center sticky left-0 z-10 border-l border-r border-b ${thinBorder} shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] cursor-pointer select-none transition-colors ${monthCellBg}`}
      >
        {getThaiMonth(row.monthStr)}
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
      
      {activeExpenseGroups.map((g) => (
        <CashflowTableGroupCells
          key={g.id}
          g={g}
          idx={0}
          isLastGroup={false}
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

/**
 * INTERNAL COMPONENT: CashflowTableFooter
 */
const CashflowTableFooter = React.memo(({ 
  activeIncomeGroups, activeExpenseGroups, expandedGroups, 
  getActiveCatsForGroup, analytics, dm, thinBorder, boundaryBorder, boxBorder,
  handleMouseEnter, handleMouseLeave,
  hoveredCol, setHoveredCol,
  excludedMonths, excludedGroups, excludedCategories, categories,
  filteredCatMap = {}, filteredGroupMap = {}
}) => {
  if (analytics.numMonths <= 1) return null;

  const activeMonths = analytics.sortedCashflow.filter(r => !excludedMonths.has(r.monthStr));

  const getAdjustedIncome = (r) => calculateAdjustedGroupsTotal({
    groups: activeIncomeGroups, row: r, excludedGroups, excludedCategories, categories, filteredGroupMap, filteredCatMap, analytics
  });

  const getAdjustedExpense = (r) => calculateAdjustedGroupsTotal({
    groups: activeExpenseGroups, row: r, excludedGroups, excludedCategories, categories, filteredGroupMap, filteredCatMap, analytics
  });

  const totalActiveIncome = activeMonths.reduce((s, r) => s + getAdjustedIncome(r), 0);
  const totalActiveExpense = activeMonths.reduce((s, r) => s + getAdjustedExpense(r), 0);
  const totalActiveNet = totalActiveIncome - totalActiveExpense;
  const activeSavingsRate = totalActiveIncome > 0 ? ((totalActiveNet / totalActiveIncome) * 100).toFixed(1) : '0.0';
  const activePctSpent = totalActiveIncome > 0 ? ((totalActiveExpense / totalActiveIncome) * 100).toFixed(1) : '0.0';

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
                  groupId: g.id, activeMonths, categories, excludedCategories, filteredGroupMap, filteredCatMap, analytics
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
                    style={{ color: isCatFaded ? '#64748B' : c.color }}
                  >
                    {formatMoney(activeMonths.reduce((s, r) => s + (filteredCatMap[c.id]?.[r.monthStr] ?? (analytics.monthlyCatMap?.[c.id]?.[r.monthStr] || 0)), 0))}
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
                  groupId: g.id, activeMonths, categories, excludedCategories, filteredGroupMap, filteredCatMap, analytics
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
                    style={{ color: isCatFaded ? '#64748B' : c.color }}
                  >
                    {formatMoney(activeMonths.reduce((s, r) => s + (filteredCatMap[c.id]?.[r.monthStr] ?? (analytics.monthlyCatMap?.[c.id]?.[r.monthStr] || 0)), 0))}
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

/**
 * INTERNAL COMPONENT: GroupTooltip
 */
const GroupTooltip = ({ hoveredGroup, dm }) => {
  if (!hoveredGroup?.active) return null;

  const { x, y, group, activeCats } = hoveredGroup;

  // If there are no active categories, do not display the tooltip.
  if (!activeCats || activeCats.length === 0) return null;

  const groupColor = group.color || (group.type === 'income' ? '#10B981' : '#64748B');

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed pointer-events-none z-[99999]"
        style={{ left: x, top: y - 6, transform: 'translate(-50%, -100%)' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 2 }}
          transition={{ duration: 0.12 }}
          className="flex flex-col items-center min-w-[160px] max-w-[420px]"
        >
          <div className="w-full rounded-none p-2 text-[11px] font-medium shadow-2xl border backdrop-blur-md bg-[#121212]/95 border-[#3e3e3e] text-slate-200">
            {/* Header: Slim, crisp and completely squared */}
            <div className="flex items-center gap-1.5 border-b pb-1.5 mb-1.5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <span className="w-2 h-2 rounded-none shrink-0" style={{ backgroundColor: groupColor }} />
              <span className="font-black text-[11px] uppercase tracking-wider">{group.name}</span>
              <span className="text-[9px] font-bold opacity-60">({activeCats.length})</span>
            </div>

            {/* Content List: Horizontal flow with high density and squared tags */}
            <div className="flex flex-wrap gap-1">
              {activeCats.map(c => {
                const catColor = c.color || '#64748B';
                const rgb = hexToRgb(catColor);
                return (
                  <div 
                    key={c.id} 
                    className="flex items-center gap-1 py-0.5 px-1.5 rounded-none border text-[10px] font-bold text-slate-300"
                    style={{ 
                      backgroundColor: `rgba(${rgb}, 0.08)`, 
                      borderColor: `rgba(${rgb}, 0.25)` 
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
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

/**
 * CashflowTable - A high-density spreadsheet view of monthly financial data.
 */
export default function CashflowTable() {
  const { analytics, transactions = [], cashflowGroups = [], categories = [], dm, showSkeleton } = useDashboardContext();
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [hoveredGroup, setHoveredGroup] = useState(null);
  
  // High-performance state hooks for row/column intersection highlighting
  const [hoveredCol, setHoveredCol] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  const [excludedMonths, setExcludedMonths] = useState(new Set());
  const [excludedGroups, setExcludedGroups] = useState(new Set());
  const [excludedCategories, setExcludedCategories] = useState(new Set());
  const [excludedAllocations, setExcludedAllocations] = useState(new Set());
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);

  // Transaction-level allocation aggregation engine
  const { filteredCatMap, filteredGroupMap } = React.useMemo(() => {
    const catMap = {};
    const groupMap = {};

    if (excludedAllocations.size === 0) {
      return { filteredCatMap: catMap, filteredGroupMap: groupMap };
    }

    // Pre-initialize zeros for all categories and groups across all months in sortedCashflow
    const allMonths = (analytics?.sortedCashflow || []).map(r => r.monthStr);
    categories.forEach(c => {
      catMap[c.id] = {};
      allMonths.forEach(ym => { catMap[c.id][ym] = 0; });
    });
    cashflowGroups.forEach(g => {
      groupMap[g.id] = {};
      allMonths.forEach(ym => { groupMap[g.id][ym] = 0; });
    });

    if (!transactions || transactions.length === 0) {
      return { filteredCatMap: catMap, filteredGroupMap: groupMap };
    }

    const catLookup = {};
    categories.forEach(c => {
      catLookup[c.id] = c;
      catLookup[String(c.id)] = c;
    });

    const groupLookup = {};
    cashflowGroups.forEach(g => {
      groupLookup[g.id] = g;
      groupLookup[String(g.id)] = g;
    });

    transactions.forEach(t => {
      if (t.is_deleted) return;

      const catId = t.category_id ?? t.categoryId;
      const catObj = catLookup[catId];
      const groupId = catObj?.cashflowGroup ?? catObj?.cashflow_group_id;
      const groupObj = groupLookup[groupId];

      const isIncome = groupObj?.type === 'income';

      // Allocation filters (WANT / NEED / SAVINGS) strictly apply ONLY to expenses, NOT income!
      if (!isIncome) {
        const tAlloc = t.allocation_type || t.allocationType || catObj?.allocation_type || catObj?.allocationType || groupObj?.allocation_type || groupObj?.allocationType || 'want';
        if (excludedAllocations.has(tAlloc)) return;
      }

      const dateStr = t.date;
      if (!dateStr) return;
      const ym = dateStr.substring(0, 7);
      const amt = t.amount || 0;

      if (catId && catMap[catId]?.[ym] !== undefined) {
        catMap[catId][ym] += amt;
      }
      if (groupId && groupMap[groupId]?.[ym] !== undefined) {
        groupMap[groupId][ym] += amt;
      }
    });

    return { filteredCatMap: catMap, filteredGroupMap: groupMap };
  }, [transactions, categories, cashflowGroups, excludedAllocations, analytics?.sortedCashflow]);

  const toggleMonth = useCallback((monthStr) => {
    setExcludedMonths(prev => {
      const next = new Set(prev);
      if (next.has(monthStr)) next.delete(monthStr);
      else next.add(monthStr);
      return next;
    });
  }, []);

  const toggleGroupExclusion = useCallback((groupId) => {
    setExcludedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const toggleCategoryExclusion = useCallback((catId) => {
    setExcludedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }, []);

  const toggleAllocationFilter = useCallback((allocType) => {
    setExcludedAllocations(prev => {
      const next = new Set(prev);
      if (next.has(allocType)) next.delete(allocType);
      else next.add(allocType);
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setExcludedGroups(new Set());
    setExcludedCategories(new Set());
    setExcludedMonths(new Set());
    setExcludedAllocations(new Set());
  }, []);

  const toggleGroup = useCallback((groupId) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const getActiveCatsForGroup = useCallback((groupId) => {
    const allCatsInGroup = categories.filter(c => c.cashflowGroup === groupId || c.cashflow_group_id === groupId);
    return allCatsInGroup.filter(c => {
      return analytics?.sortedCashflow?.some(row => (analytics.monthlyCatMap?.[c.id]?.[row.monthStr] || 0) > 0);
    });
  }, [categories, analytics]);

  const handleMouseEnter = useCallback((e, group) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const allCats = categories.filter(c => c.cashflowGroup === group.id || c.cashflow_group_id === group.id);
    const activeCats = getActiveCatsForGroup(group.id);
    
    setHoveredGroup({
      active: true,
      x: rect.left + rect.width / 2,
      y: rect.top,
      group,
      allCats,
      activeCats
    });
  }, [categories, getActiveCatsForGroup]);

  const handleMouseLeave = useCallback(() => {
    setHoveredGroup(null);
  }, []);

  const activeIncomeGroups = React.useMemo(() => {
    if (!cashflowGroups || cashflowGroups.length === 0) return [];
    return cashflowGroups
      .filter(g => g.type === 'income')
      .sort((a,b) => a.order_index - b.order_index)
      .filter(g => analytics?.sortedCashflow?.some(row => (row.groups[g.id] || 0) > 0) || showSkeleton);
  }, [cashflowGroups, analytics?.sortedCashflow, showSkeleton]);

  const activeExpenseGroups = React.useMemo(() => {
    if (!cashflowGroups || cashflowGroups.length === 0) return [];
    return cashflowGroups
      .filter(g => g.type === 'expense')
      .sort((a,b) => a.order_index - b.order_index)
      .filter(g => analytics?.sortedCashflow?.some(row => (row.groups[g.id] || 0) > 0) || showSkeleton);
  }, [cashflowGroups, analytics?.sortedCashflow, showSkeleton]);

  if (!showSkeleton && (!analytics || analytics.numMonths === 0 || !cashflowGroups || cashflowGroups.length === 0)) return null;

  const thinBorder = 'border-[#303030]/60';
  const boxBorder = 'border-[#3e3e3e]';
  const boundaryBorder = 'border-r-2 !border-r-[#303030]';
  
  // Obsidian zero-rounded flat edge compliance
  const card = 'rounded-none border shadow-sm transition-colors bg-[#181818] border-[#303030]';

  const totalExcludedCount = excludedGroups.size + excludedCategories.size + excludedMonths.size + excludedAllocations.size;

  const segmentProps = {
    activeIncomeGroups, activeExpenseGroups, expandedGroups, toggleGroup, 
    getActiveCatsForGroup, analytics, dm, thinBorder, boundaryBorder, boxBorder,
    handleMouseEnter, handleMouseLeave,
    hoveredCol, setHoveredCol,
    excludedMonths, toggleMonth,
    excludedGroups, toggleGroupExclusion,
    excludedCategories, toggleCategoryExclusion,
    categories,
    filteredCatMap, filteredGroupMap
  };

  return (
    <div className={`${card} overflow-hidden`}>
      {/* ─── HEADER (Editorial Style) ─── */}
      <div className="px-4 py-2 border-b flex flex-col gap-2 bg-[#121212]/80 border-[#2d2d2d]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-3 bg-[#da291c] shrink-0" /> {/* Rosso Corsa racing line brand accent */}
            <FileSpreadsheet className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-200">
              ตารางสรุปกระแสเงินสด
            </span>
          </div>

          {/* Quick Allocation Filter Toggle Button (Compact HUD Style) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFilterBarOpen(prev => !prev)}
              className={`group relative inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-extrabold rounded-none border transition-all duration-150 select-none cursor-pointer ${
                isFilterBarOpen || totalExcludedCount > 0
                  ? 'bg-[#da291c]/15 text-white border-[#da291c]/60 shadow-[0_0_12px_rgba(218,41,28,0.25)]'
                  : 'bg-[#181818] text-neutral-300 border-[#333333] hover:bg-[#222222] hover:border-neutral-500 hover:text-white'
              }`}
              title={totalExcludedCount > 0 ? `เปิด/ปิด ตัวกรอง (กำลังซ่อนอยู่ ${totalExcludedCount} รายการ)` : "เปิด/ปิด ตัวกรอง Allocation"}
            >
              <Filter className={`w-3.5 h-3.5 transition-colors ${
                isFilterBarOpen || totalExcludedCount > 0 ? 'text-[#ff4d4d]' : 'text-neutral-400 group-hover:text-white'
              }`} />

              {totalExcludedCount > 0 && (
                <span className="px-1 py-[1px] text-[9.5px] font-black bg-[#da291c] text-white leading-none rounded-none shadow-sm tracking-tighter">
                  {totalExcludedCount}
                </span>
              )}

              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isFilterBarOpen ? 'rotate-180 text-white' : 'text-neutral-500 group-hover:text-neutral-300'
              }`} />
            </button>
          </div>
        </div>

        {/* Expandable Filter Bar (Right Aligned) */}
        {isFilterBarOpen && (
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1.5 border-t border-[#262626]/80 text-[11px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mr-auto">
              โหมดปิดรายการตาม Allocation (Transaction-Level):
            </span>

            {/* WANT Button (Amber / Orange - #F59E0B) */}
            <button
              onClick={() => toggleAllocationFilter('want')}
              className={`px-2.5 py-1 font-bold rounded-none border transition-all inline-flex items-center gap-1.5 ${
                excludedAllocations.has('want')
                  ? 'bg-[#F59E0B]/20 text-amber-300 border-[#F59E0B]/60 line-through shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'bg-[#1a1a1a] text-amber-400 border-amber-800/40 hover:bg-[#252525] hover:border-amber-600/60'
              }`}
            >
              {excludedAllocations.has('want') ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3 text-amber-400" />}
              <span>ปิด WANT (กิเลส)</span>
            </button>

            {/* NEED Button (Red / Crimson - #EF4444) */}
            <button
              onClick={() => toggleAllocationFilter('need')}
              className={`px-2.5 py-1 font-bold rounded-none border transition-all inline-flex items-center gap-1.5 ${
                excludedAllocations.has('need')
                  ? 'bg-[#EF4444]/20 text-red-300 border-[#EF4444]/60 line-through shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                  : 'bg-[#1a1a1a] text-red-400 border-red-800/40 hover:bg-[#252525] hover:border-red-600/60'
              }`}
            >
              {excludedAllocations.has('need') ? <EyeOff className="w-3 h-3 text-red-400" /> : <Eye className="w-3 h-3 text-red-400" />}
              <span>ปิด NEED (จำเป็น)</span>
            </button>

            {/* SAVINGS Button (Emerald / Green - #10B981) */}
            <button
              onClick={() => toggleAllocationFilter('savings')}
              className={`px-2.5 py-1 font-bold rounded-none border transition-all inline-flex items-center gap-1.5 ${
                excludedAllocations.has('savings')
                  ? 'bg-[#10B981]/20 text-emerald-300 border-[#10B981]/60 line-through shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'bg-[#1a1a1a] text-emerald-400 border-emerald-800/40 hover:bg-[#252525] hover:border-emerald-600/60'
              }`}
            >
              {excludedAllocations.has('savings') ? <EyeOff className="w-3 h-3 text-emerald-400" /> : <Eye className="w-3 h-3 text-emerald-400" />}
              <span>ปิด SAVINGS (เงินออม)</span>
            </button>

            {/* RESET Button */}
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
      
      <div className="overflow-x-auto overflow-y-hidden custom-scrollbar" style={{ scrollbarWidth: 'thin', scrollbarGutter: 'auto' }}>
        {showSkeleton ? (
          <div className="p-8">
            <div className="h-40 w-full rounded-none animate-pulse bg-[#303030]/40" />
          </div>
        ) : (
          <table className="w-full min-w-full text-right text-[13px] whitespace-nowrap border-separate border-spacing-0">
            <CashflowTableHeader {...segmentProps} />
            <tbody className="divide-y divide-[#303030]/40">
              {analytics.sortedCashflow.map((row) => (
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
      <GroupTooltip hoveredGroup={hoveredGroup} dm={dm} />
    </div>
  );
}
