// src/views/Dashboard/components/CashflowTable.jsx
import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet } from 'lucide-react';
import { useDashboardContext } from '../context/DashboardContext';
import { formatMoney, getThaiMonth, hexToRgb } from '../../../utils/formatters';

/**
 * INTERNAL COMPONENT: CashflowTableHeader
 */
const CashflowTableHeader = React.memo(({ 
  activeIncomeGroups, activeExpenseGroups, expandedGroups, toggleGroup, 
  getActiveCatsForGroup, dm, thinBorder, boundaryBorder, boxBorder,
  handleMouseEnter, handleMouseLeave,
  hoveredCol, setHoveredCol
}) => {
  const getHighlightBg = (group, isHovered) => {
    const hexColor = group.color || (group.type === 'income' ? '#10B981' : '#64748B');
    const rgb = hexToRgb(hexColor);
    const opacity = dm ? (isHovered ? 0.16 : 0.08) : (isHovered ? 0.38 : 0.28);
    return `rgba(${rgb}, ${opacity})`;
  };

  const getSubHighlightBg = (group, subColor, isHovered) => {
    const hexColor = subColor || group.color || '#64748B';
    const rgb = hexToRgb(hexColor);
    const opacity = dm ? (isHovered ? 0.12 : 0.06) : (isHovered ? 0.30 : 0.20);
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

          return (
            <React.Fragment key={g.id}>
              <th 
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                aria-label={`กลุ่มรายรับ ${g.name} - คลิกเพื่อ${isExpanded ? 'ยุบ' : 'ขยาย'}`}
                onClick={() => toggleGroup(g.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleGroup(g.id);
                  }
                }}
                onMouseEnter={(e) => {
                  handleMouseEnter(e, g);
                  setHoveredCol(colId);
                }}
                onMouseLeave={() => {
                  handleMouseLeave();
                  setHoveredCol(null);
                }}
                className={`px-3 py-1.5 font-extrabold text-center cursor-pointer transition-colors border-l border-b ${isExpanded ? boxBorder : thinBorder} ${isLastIncome && !isExpanded ? boundaryBorder : ''} focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#da291c]`} 
                style={{ color: g.color || ('#34d399'), backgroundColor: getHighlightBg(g, isColHovered) }}
              >
                {g.name} {isExpanded ? '«' : '»'}
              </th>
              {isExpanded && cats.map((c, cIdx) => {
                const catColId = `c-${c.id}`;
                const isCatColHovered = hoveredCol === catColId;
                return (
                  <th 
                    key={c.id} 
                    onMouseEnter={() => setHoveredCol(catColId)}
                    onMouseLeave={() => setHoveredCol(null)}
                    className={`px-2 py-1.5 font-black text-center text-[9px] uppercase border-l border-b transition-colors ${cIdx === cats.length - 1 && isLastIncome ? boundaryBorder : thinBorder} border-t-[#3e3e3e]/65 border-b-[#3e3e3e]/65`} 
                    style={{ color: c.color, backgroundColor: getSubHighlightBg(g, c.color, isCatColHovered) }}
                  >
                    {c.name}
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

          return (
            <React.Fragment key={g.id}>
              <th 
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                aria-label={`กลุ่มรายจ่าย ${g.name} - คลิกเพื่อ${isExpanded ? 'ยุบ' : 'ขยาย'}`}
                onClick={() => toggleGroup(g.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleGroup(g.id);
                  }
                }}
                onMouseEnter={(e) => {
                  handleMouseEnter(e, g);
                  setHoveredCol(colId);
                }}
                onMouseLeave={() => {
                  handleMouseLeave();
                  setHoveredCol(null);
                }}
                className={`px-3 py-1.5 font-bold text-center cursor-pointer transition-colors border-l border-b ${isExpanded ? boxBorder : thinBorder} focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#da291c]`} 
                style={{ color: g.color || ('#cbd5e1'), backgroundColor: getHighlightBg(g, isColHovered) }}
              >
                {g.name} {isExpanded ? '«' : '»'}
              </th>
              {isExpanded && cats.map((c) => {
                const catColId = `c-${c.id}`;
                const isCatColHovered = hoveredCol === catColId;
                return (
                  <th 
                    key={c.id} 
                    onMouseEnter={() => setHoveredCol(catColId)}
                    onMouseLeave={() => setHoveredCol(null)}
                    className={`px-2 py-1.5 font-black text-center text-[9px] uppercase border-l border-b transition-colors ${thinBorder} border-t-[#3e3e3e]/65 border-b-[#3e3e3e]/65`} 
                    style={{ color: c.color, backgroundColor: getSubHighlightBg(g, c.color, isCatColHovered) }}
                  >
                    {c.name}
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

/**
 * INTERNAL COMPONENT: CashflowTableRow
 */
const CashflowTableRow = React.memo(({ 
  row, activeIncomeGroups, activeExpenseGroups, expandedGroups, 
  getActiveCatsForGroup, analytics, dm, thinBorder, boundaryBorder, boxBorder,
  handleMouseEnter, handleMouseLeave,
  hoveredCol, setHoveredCol,
  isRowHovered, setHoveredRow,
  isExcluded, excludedMonths, toggleMonth
}) => {
  const getHighlightBg = (group, isColHovered) => {
    const hexColor = group.color || (group.type === 'income' ? '#10B981' : '#64748B');
    const rgb = hexToRgb(hexColor);
    // Intersection Glow Logic: bump opacity when both row and col are hovered
    const opacity = dm 
      ? (isColHovered && isRowHovered ? 0.22 : (isColHovered ? 0.14 : (isRowHovered ? 0.12 : 0.08))) 
      : (isColHovered && isRowHovered ? 0.44 : (isColHovered ? 0.34 : (isRowHovered ? 0.32 : 0.28)));
    return `rgba(${rgb}, ${opacity})`;
  };

  const getSubHighlightBg = (group, subColor, isColHovered) => {
    const hexColor = subColor || group.color || '#64748B';
    const rgb = hexToRgb(hexColor);
    const opacity = dm 
      ? (isColHovered && isRowHovered ? 0.18 : (isColHovered ? 0.12 : (isRowHovered ? 0.10 : 0.06))) 
      : (isColHovered && isRowHovered ? 0.36 : (isColHovered ? 0.26 : (isRowHovered ? 0.24 : 0.20)));
    return `rgba(${rgb}, ${opacity})`;
  };

  // Find the previous active month before the current row
  const currentIndex = analytics.sortedCashflow.findIndex(r => r.monthStr === row.monthStr);
  let prevMonth = null;
  for (let i = currentIndex - 1; i >= 0; i--) {
    const candidate = analytics.sortedCashflow[i];
    if (!excludedMonths.has(candidate.monthStr)) {
      prevMonth = candidate;
      break;
    }
  }

  let expMoMJSX = null;
  if (!isExcluded && prevMonth && prevMonth.totalExp > 0) {
    const diff = row.totalExp - prevMonth.totalExp;
    const percent = (diff / prevMonth.totalExp) * 100;
    const isUp = percent > 0;
    const isFlat = Math.abs(percent) < 0.1;

    // Elite vibrant semi-transparent badge styling (rounded-none compliance, high-contrast text)
    const badgeClass = isFlat 
      ? 'bg-[#303030]/40 text-slate-400 border-[#3e3e3e]/30' 
      : isUp 
        ? 'bg-[#da291c]/10 text-[#ff4d4d] border-[#da291c]/25' 
        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

    expMoMJSX = (
      <span className={`inline-flex items-center justify-center w-[50px] min-w-[50px] max-w-[50px] text-[9px] font-black py-[2px] rounded-none leading-none border ${badgeClass}`}>
        {isFlat ? '-' : (isUp ? '↑' : '↓')} {Math.abs(percent).toFixed(1)}%
      </span>
    );
  }

  const isMonthHovered = hoveredCol === 'month';
  const isTrendHovered = hoveredCol === 'trend';
  const isNetHovered = hoveredCol === 'net';
  const isPctLeftHovered = hoveredCol === 'pct-left';
  const isPctSpentHovered = hoveredCol === 'pct-spent';

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
        className={`px-3 py-2 font-bold text-center sticky left-0 z-10 border-l border-r border-b ${thinBorder} shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] cursor-pointer select-none transition-colors ${
          isExcluded
            ? 'text-neutral-500 bg-[#0f0f0f] line-through decoration-neutral-600'
            : isMonthHovered 
              ? 'text-blue-300 bg-[#1c1c1c]' 
              : (isRowHovered ? 'text-blue-300 bg-[#1c1c1c]/80' : 'text-blue-300 bg-[#181818] group-hover:bg-[#1c1c1c]')
        }`}
      >
        {getThaiMonth(row.monthStr)}
      </td>
      
      {activeIncomeGroups.map((g, idx) => {
        const isExpanded = expandedGroups.has(g.id);
        const cats = getActiveCatsForGroup(g.id);
        const isLastIncome = idx === activeIncomeGroups.length - 1;
        const colId = `g-${g.id}`;
        const isColHovered = hoveredCol === colId;

        return (
          <React.Fragment key={g.id}>
            <td 
              onMouseEnter={() => setHoveredCol(colId)}
              onMouseLeave={() => setHoveredCol(null)}
              className={`px-3 py-2 font-semibold border-l border-b transition-colors ${isExpanded ? boxBorder : thinBorder} ${isLastIncome && !isExpanded ? boundaryBorder : ''} ${
                isExcluded ? 'opacity-40 select-none text-neutral-500' : ''
              }`} 
              style={{ color: isExcluded ? undefined : (g.color || '#34d399'), backgroundColor: isExcluded ? '#0d0d0d' : getHighlightBg(g, isColHovered) }}
            >
              {row.groups[g.id] > 0 ? formatMoney(row.groups[g.id]) : '-'}
            </td>
            {isExpanded && cats.map((c, cIdx) => {
              const amt = analytics.monthlyCatMap?.[c.id]?.[row.monthStr] || 0;
              const catColId = `c-${c.id}`;
              const isCatColHovered = hoveredCol === catColId;
              return (
                <td 
                  key={c.id} 
                  onMouseEnter={() => setHoveredCol(catColId)}
                  onMouseLeave={() => setHoveredCol(null)}
                  className={`px-2 py-2 text-[10px] tabular-nums font-black border-l border-b transition-colors ${cIdx === cats.length - 1 && isLastIncome ? boundaryBorder : thinBorder} ${
                    isExcluded ? 'opacity-40 select-none text-neutral-500' : ''
                  }`} 
                  style={{ color: isExcluded ? undefined : c.color, backgroundColor: isExcluded ? '#0d0d0d' : getSubHighlightBg(g, c.color, isCatColHovered) }}
                >
                  {amt > 0 ? formatMoney(amt) : '-'}
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

        return (
          <React.Fragment key={g.id}>
            <td 
              onMouseEnter={() => setHoveredCol(colId)}
              onMouseLeave={() => setHoveredCol(null)}
              className={`px-3 py-2 font-medium border-l border-b transition-colors ${isExpanded ? boxBorder : thinBorder} ${
                isExcluded ? 'opacity-40 select-none text-neutral-500' : ''
              }`} 
              style={{ color: isExcluded ? undefined : (g.color || '#cbd5e1'), backgroundColor: isExcluded ? '#0d0d0d' : getHighlightBg(g, isColHovered) }}
            >
              {row.groups[g.id] > 0 ? formatMoney(row.groups[g.id]) : '-'}
            </td>
            {isExpanded && cats.map((c) => {
              const amt = analytics.monthlyCatMap?.[c.id]?.[row.monthStr] || 0;
              const catColId = `c-${c.id}`;
              const isCatColHovered = hoveredCol === catColId;
              return (
                <td 
                  key={c.id} 
                  onMouseEnter={() => setHoveredCol(catColId)}
                  onMouseLeave={() => setHoveredCol(null)}
                  className={`px-2 py-2 text-[10px] tabular-nums font-black border-l border-b transition-colors ${thinBorder} ${
                    isExcluded ? 'opacity-40 select-none text-neutral-500' : ''
                  }`} 
                  style={{ color: isExcluded ? undefined : c.color, backgroundColor: isExcluded ? '#0d0d0d' : getSubHighlightBg(g, c.color, isCatColHovered) }}
                >
                  {amt > 0 ? formatMoney(amt) : '-'}
                </td>
              );
            })}
          </React.Fragment>
        );
      })}

      <td 
        onMouseEnter={() => setHoveredCol('trend')}
        onMouseLeave={() => setHoveredCol(null)}
        className={`px-3 py-2 font-bold border-l border-b ${thinBorder} sticky right-[250px] z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.15)] transition-colors w-[140px] min-w-[140px] max-w-[140px] ${
          isExcluded
            ? 'text-neutral-700 bg-[#0d0d0d] opacity-25 select-none line-through'
            : isTrendHovered 
              ? 'text-[#ff4d4d] bg-[#1c1c1c]' 
              : (isRowHovered ? 'text-[#ff4d4d] bg-[#1c1c1c]/80' : 'text-[#ff4d4d] bg-[#181818] group-hover:bg-[#1c1c1c]')
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <div className="shrink-0">{!isExcluded && expMoMJSX}</div>
          <span className="text-[11px] tabular-nums">{formatMoney(row.totalExp)}</span>
        </div>
      </td>
      <td 
        onMouseEnter={() => setHoveredCol('net')}
        onMouseLeave={() => setHoveredCol(null)}
        className={`px-3 py-2 font-black border-l border-b ${thinBorder} sticky right-[140px] z-10 transition-colors w-[110px] min-w-[110px] max-w-[110px] ${
          isExcluded
            ? 'text-neutral-700 bg-[#0d0d0d] opacity-25 select-none line-through'
            : isNetHovered 
              ? 'bg-[#1c1c1c]' 
              : (isRowHovered ? 'bg-[#1c1c1c]/80' : 'bg-[#181818] group-hover:bg-[#1c1c1c]')
        } ${!isExcluded ? ((row.income - row.totalExp) >= 0 ? 'text-emerald-400' : 'text-[#ff4d4d]') : ''}`}
      >
        {formatMoney(row.income - row.totalExp)}
      </td>
      <td 
        onMouseEnter={() => setHoveredCol('pct-left')}
        onMouseLeave={() => setHoveredCol(null)}
        className={`px-2 py-2 font-black border-l border-b text-center ${thinBorder} sticky right-[70px] z-10 transition-colors w-[70px] min-w-[70px] max-w-[70px] ${
          isExcluded
            ? 'text-neutral-700 bg-[#0d0d0d] opacity-25 select-none line-through'
            : isPctLeftHovered 
              ? 'bg-[#1c1c1c]' 
              : (isRowHovered ? 'bg-[#1c1c1c]/80' : 'bg-[#181818] group-hover:bg-[#1c1c1c]')
        } ${!isExcluded ? (row.income > 0 && (row.income - row.totalExp) < 0 ? 'text-[#ff4d4d]' : 'text-teal-400') : ''}`}
      >
        {row.income > 0 ? ((row.income - row.totalExp) / row.income * 100).toFixed(1) : '0.0'}%
      </td>
      <td 
        onMouseEnter={() => setHoveredCol('pct-spent')}
        onMouseLeave={() => setHoveredCol(null)}
        className={`px-2 py-2 font-black border-l border-r border-b text-center ${thinBorder} sticky right-0 z-10 transition-colors w-[70px] min-w-[70px] max-w-[70px] ${
          isExcluded
            ? 'text-neutral-700 bg-[#0d0d0d] opacity-25 select-none line-through'
            : isPctSpentHovered 
              ? 'bg-[#1c1c1c]' 
              : (isRowHovered ? 'bg-[#1c1c1c]/80' : 'bg-[#181818] group-hover:bg-[#1c1c1c]')
        } ${!isExcluded ? (row.income > 0 && (row.totalExp / row.income * 100) > 100 ? 'text-[#ff4d4d]' : 'text-pink-400') : ''}`}
      >
        {row.income > 0 ? (row.totalExp / row.income * 100).toFixed(1) + '%' : '-'}
      </td>
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
  excludedMonths
}) => {
  if (analytics.numMonths <= 1) return null;

  const activeMonths = analytics.sortedCashflow.filter(r => !excludedMonths.has(r.monthStr));
  const totalActiveIncome = activeMonths.reduce((s, r) => s + r.income, 0);
  const totalActiveExpense = activeMonths.reduce((s, r) => s + r.totalExp, 0);
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

          return (
            <React.Fragment key={g.id}>
              <td 
                onMouseEnter={() => setHoveredCol(colId)}
                onMouseLeave={() => setHoveredCol(null)}
                className={`px-3 py-2.5 border-l border-b transition-colors ${isExpanded ? boxBorder : thinBorder} ${isLastIncome && !isExpanded ? boundaryBorder : ''} ${
                  isColHovered ? 'bg-[#1c1c1c]' : 'bg-[#181818]'
                }`} 
                style={{ color: g.color || ('#34d399') }}
              >
                {formatMoney(activeMonths.reduce((s, r) => s + (r.groups[g.id] || 0), 0))}
              </td>
              {isExpanded && cats.map((c, cIdx) => {
                const catColId = `c-${c.id}`;
                const isCatColHovered = hoveredCol === catColId;
                return (
                  <td 
                    key={c.id} 
                    onMouseEnter={() => setHoveredCol(catColId)}
                    onMouseLeave={() => setHoveredCol(null)}
                    className={`px-2 py-2.5 text-[9px] font-black uppercase border-l border-b transition-colors ${cIdx === cats.length - 1 && isLastIncome ? boundaryBorder : thinBorder} ${
                      isCatColHovered ? 'bg-[#1c1c1c]' : 'bg-[#181818]'
                    }`} 
                    style={{ color: c.color }}
                  >
                    {formatMoney(activeMonths.reduce((s, r) => s + (analytics.monthlyCatMap?.[c.id]?.[r.monthStr] || 0), 0))}
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

          return (
            <React.Fragment key={g.id}>
              <td 
                onMouseEnter={() => setHoveredCol(colId)}
                onMouseLeave={() => setHoveredCol(null)}
                className={`px-3 py-2.5 border-l border-b transition-colors ${isExpanded ? boxBorder : thinBorder} ${
                  isColHovered ? 'bg-[#1c1c1c]' : 'bg-[#181818]'
                }`} 
                style={{ color: g.color || ('#cbd5e1') }}
              >
                {formatMoney(activeMonths.reduce((s, r) => s + (r.groups[g.id] || 0), 0))}
              </td>
              {isExpanded && cats.map((c) => {
                const catColId = `c-${c.id}`;
                const isCatColHovered = hoveredCol === catColId;
                return (
                  <td 
                    key={c.id} 
                    onMouseEnter={() => setHoveredCol(catColId)}
                    onMouseLeave={() => setHoveredCol(null)}
                    className={`px-2 py-2.5 text-[9px] font-black uppercase border-l border-b transition-colors ${thinBorder} ${
                      isCatColHovered ? 'bg-[#1c1c1c]' : 'bg-[#181818]'
                    }`} 
                    style={{ color: c.color }}
                  >
                    {formatMoney(activeMonths.reduce((s, r) => s + (analytics.monthlyCatMap?.[c.id]?.[r.monthStr] || 0), 0))}
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
  if (!hoveredGroup || !hoveredGroup.active) return null;

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
  const { analytics, cashflowGroups = [], categories = [], dm, showSkeleton } = useDashboardContext();
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [hoveredGroup, setHoveredGroup] = useState(null);
  
  // High-performance state hooks for row/column intersection highlighting
  const [hoveredCol, setHoveredCol] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  const [excludedMonths, setExcludedMonths] = useState(new Set());

  const toggleMonth = useCallback((monthStr) => {
    setExcludedMonths(prev => {
      const next = new Set(prev);
      if (next.has(monthStr)) next.delete(monthStr);
      else next.add(monthStr);
      return next;
    });
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

  if (!showSkeleton && (!analytics || analytics.numMonths === 0 || !cashflowGroups || cashflowGroups.length === 0)) return null;

  const activeIncomeGroups = React.useMemo(() => {
    return cashflowGroups
      .filter(g => g.type === 'income')
      .sort((a,b) => a.order_index - b.order_index)
      .filter(g => analytics?.sortedCashflow?.some(row => (row.groups[g.id] || 0) > 0) || showSkeleton);
  }, [cashflowGroups, analytics?.sortedCashflow, showSkeleton]);

  const activeExpenseGroups = React.useMemo(() => {
    return cashflowGroups
      .filter(g => g.type === 'expense')
      .sort((a,b) => a.order_index - b.order_index)
      .filter(g => analytics?.sortedCashflow?.some(row => (row.groups[g.id] || 0) > 0) || showSkeleton);
  }, [cashflowGroups, analytics?.sortedCashflow, showSkeleton]);

  const thinBorder = 'border-[#303030]/60';
  const boxBorder = 'border-[#3e3e3e]';
  const boundaryBorder = 'border-r-2 !border-r-[#303030]';
  
  // Obsidian zero-rounded flat edge compliance
  const card = 'rounded-none border shadow-sm transition-colors bg-[#181818] border-[#303030]';

  const segmentProps = {
    activeIncomeGroups, activeExpenseGroups, expandedGroups, toggleGroup, 
    getActiveCatsForGroup, analytics, dm, thinBorder, boundaryBorder, boxBorder,
    handleMouseEnter, handleMouseLeave,
    hoveredCol, setHoveredCol,
    excludedMonths, toggleMonth
  };

  return (
    <div className={`${card} overflow-hidden`}>
      {/* ─── HEADER (Editorial Style) ─── */}
      <div className="px-4 py-2 border-b flex items-center justify-between bg-[#121212]/80 border-[#2d2d2d]">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-3 bg-[#da291c] shrink-0" /> {/* Rosso Corsa racing line brand accent */}
          <FileSpreadsheet className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-200">
            ตารางสรุปกระแสเงินสด
          </span>
        </div>
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
