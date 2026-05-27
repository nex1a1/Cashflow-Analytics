// src/views/Dashboard/components/CashflowTable.jsx
import React, { useState, useCallback, useMemo } from 'react';
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
    <thead className={`sticky top-0 z-30 ${'bg-slate-950'}`}>
      <tr>
        <th 
          rowSpan={2} 
          onMouseEnter={() => setHoveredCol('month')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-3 py-2.5 font-bold text-center sticky left-0 z-50 align-middle border-l border-r border-b ${thinBorder} shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] transition-colors ${
            hoveredCol === 'month' ? 'bg-slate-800 text-blue-300' : 'text-blue-300 bg-slate-950'
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
            hoveredCol === 'trend' ? 'bg-slate-800 text-red-400' : 'text-red-400 bg-slate-950'
          }`}
        >
          รวมรายจ่าย (Trend)
        </th>
        <th 
          rowSpan={2} 
          onMouseEnter={() => setHoveredCol('net')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-3 py-2.5 font-bold border-l border-b ${thinBorder} align-middle sticky right-[140px] z-50 transition-colors w-[110px] min-w-[110px] max-w-[110px] ${
            hoveredCol === 'net' ? 'bg-slate-800 text-blue-400' : 'text-blue-400 bg-slate-950'
          }`}
        >
          เงินคงเหลือ
        </th>
        <th 
          rowSpan={2} 
          onMouseEnter={() => setHoveredCol('pct-left')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-2 py-2.5 font-bold border-l border-b text-center align-middle sticky right-[70px] z-50 w-[70px] min-w-[70px] max-w-[70px] ${thinBorder} transition-colors ${
            hoveredCol === 'pct-left' ? 'bg-slate-800 text-emerald-400' : 'text-emerald-400 bg-slate-950'
          }`}
        >
          %เหลือ
        </th>
        <th 
          rowSpan={2} 
          onMouseEnter={() => setHoveredCol('pct-spent')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-2 py-2.5 font-bold border-l border-r border-b text-center align-middle sticky right-0 z-50 w-[70px] min-w-[70px] max-w-[70px] ${thinBorder} transition-colors ${
            hoveredCol === 'pct-spent' ? 'bg-slate-800 text-pink-400' : 'text-pink-400 bg-slate-950'
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
                onClick={() => toggleGroup(g.id)}
                onMouseEnter={(e) => {
                  handleMouseEnter(e, g);
                  setHoveredCol(colId);
                }}
                onMouseLeave={() => {
                  handleMouseLeave();
                  setHoveredCol(null);
                }}
                className={`px-3 py-1.5 font-extrabold text-center cursor-pointer transition-colors border-l border-b ${isExpanded ? boxBorder : thinBorder} ${isLastIncome && !isExpanded ? boundaryBorder : ''}`} 
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
                    className={`px-2 py-1.5 font-black text-center text-[9px] uppercase border-l border-b transition-colors ${cIdx === cats.length - 1 && isLastIncome ? boundaryBorder : thinBorder} border-t-slate-500 border-b-slate-500`} 
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
                onClick={() => toggleGroup(g.id)}
                onMouseEnter={(e) => {
                  handleMouseEnter(e, g);
                  setHoveredCol(colId);
                }}
                onMouseLeave={() => {
                  handleMouseLeave();
                  setHoveredCol(null);
                }}
                className={`px-3 py-1.5 font-bold text-center cursor-pointer transition-colors border-l border-b ${isExpanded ? boxBorder : thinBorder}`} 
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
                    className={`px-2 py-1.5 font-black text-center text-[9px] uppercase border-l border-b transition-colors ${thinBorder} border-t-slate-500 border-b-slate-500`} 
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
  row, prevMonth, activeIncomeGroups, activeExpenseGroups, expandedGroups, 
  getActiveCatsForGroup, analytics, dm, thinBorder, boundaryBorder, boxBorder,
  handleMouseEnter, handleMouseLeave,
  hoveredCol, setHoveredCol,
  isRowHovered, setHoveredRow
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

  let expMoMJSX = null;
  if (prevMonth && prevMonth.totalExp > 0) {
    const diff = row.totalExp - prevMonth.totalExp;
    const percent = (diff / prevMonth.totalExp) * 100;
    const isUp = percent > 0;
    const isFlat = Math.abs(percent) < 0.1;

    // Elite vibrant semi-transparent badge styling (rounded-none compliance)
    const badgeClass = isFlat 
      ? 'bg-slate-800/40 text-slate-400 border-slate-700/30' 
      : isUp 
        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
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
      className="group hover:bg-slate-400/5 transition-colors"
    >
      <td 
        onMouseEnter={() => setHoveredCol('month')}
        onMouseLeave={() => setHoveredCol(null)}
        className={`px-3 py-2 font-bold text-center sticky left-0 z-10 border-l border-r border-b ${thinBorder} shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] transition-colors ${
          isMonthHovered 
            ? 'text-blue-300 bg-slate-850' 
            : (isRowHovered ? 'text-blue-300 bg-slate-850/80' : 'text-blue-300 bg-slate-900 group-hover:bg-slate-850')
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
              className={`px-3 py-2 font-semibold border-l border-b transition-colors ${isExpanded ? boxBorder : thinBorder} ${isLastIncome && !isExpanded ? boundaryBorder : ''}`} 
              style={{ color: g.color || ('#34d399'), backgroundColor: getHighlightBg(g, isColHovered) }}
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
                  className={`px-2 py-2 text-[10px] tabular-nums font-black border-l border-b transition-colors ${cIdx === cats.length - 1 && isLastIncome ? boundaryBorder : thinBorder}`} 
                  style={{ color: c.color, backgroundColor: getSubHighlightBg(g, c.color, isCatColHovered) }}
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
              className={`px-3 py-2 font-medium border-l border-b transition-colors ${isExpanded ? boxBorder : thinBorder}`} 
              style={{ color: g.color || ('#cbd5e1'), backgroundColor: getHighlightBg(g, isColHovered) }}
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
                  className={`px-2 py-2 text-[10px] tabular-nums font-black border-l border-b transition-colors ${thinBorder}`} 
                  style={{ color: c.color, backgroundColor: getSubHighlightBg(g, c.color, isCatColHovered) }}
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
          isTrendHovered 
            ? 'text-red-400 bg-slate-850' 
            : (isRowHovered ? 'text-red-400 bg-slate-850/80' : 'text-red-400 bg-slate-900 group-hover:bg-slate-850')
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <div className="shrink-0">{expMoMJSX}</div>
          <span className="text-[11px] tabular-nums">{formatMoney(row.totalExp)}</span>
        </div>
      </td>
      <td 
        onMouseEnter={() => setHoveredCol('net')}
        onMouseLeave={() => setHoveredCol(null)}
        className={`px-3 py-2 font-black border-l border-b ${thinBorder} sticky right-[140px] z-10 transition-colors w-[110px] min-w-[110px] max-w-[110px] ${
          isNetHovered 
            ? 'text-blue-400 bg-slate-850' 
            : (isRowHovered ? 'text-blue-400 bg-slate-850/80' : 'text-blue-400 bg-slate-900 group-hover:bg-slate-850')
        }`}
      >
        {formatMoney(row.income - row.totalExp)}
      </td>
      <td 
        onMouseEnter={() => setHoveredCol('pct-left')}
        onMouseLeave={() => setHoveredCol(null)}
        className={`px-2 py-2 font-black border-l border-b text-center ${thinBorder} sticky right-[70px] z-10 transition-colors w-[70px] min-w-[70px] max-w-[70px] ${
          isPctLeftHovered 
            ? 'bg-slate-850' 
            : (isRowHovered ? 'bg-slate-850/80' : 'bg-slate-900 group-hover:bg-slate-850')
        } ${row.income > 0 && (row.income - row.totalExp) < 0 ? 'text-red-400' : 'text-emerald-400'}`}
      >
        {row.income > 0 ? ((row.income - row.totalExp) / row.income * 100).toFixed(1) : '0.0'}%
      </td>
      <td 
        onMouseEnter={() => setHoveredCol('pct-spent')}
        onMouseLeave={() => setHoveredCol(null)}
        className={`px-2 py-2 font-black border-l border-r border-b text-center ${thinBorder} sticky right-0 z-10 transition-colors w-[70px] min-w-[70px] max-w-[70px] ${
          isPctSpentHovered 
            ? 'bg-slate-850' 
            : (isRowHovered ? 'bg-slate-850/80' : 'bg-slate-900 group-hover:bg-slate-850')
        } ${row.income > 0 && (row.totalExp / row.income * 100) > 100 ? 'text-red-400' : 'text-pink-400'}`}
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
  hoveredCol, setHoveredCol
}) => {
  if (analytics.numMonths <= 1) return null;

  return (
    <tfoot className={`font-bold border-t ${thinBorder} sticky bottom-0 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]`}>
      <tr className={'text-slate-200'}>
        <td 
          onMouseEnter={() => setHoveredCol('month')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-3 py-2.5 text-center sticky left-0 z-30 border-l border-r border-b ${thinBorder} shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] transition-colors ${
            hoveredCol === 'month' ? 'bg-slate-850' : 'bg-slate-900'
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
                  isColHovered ? 'bg-slate-850' : 'bg-slate-900'
                }`} 
                style={{ color: g.color || ('#34d399') }}
              >
                {formatMoney(analytics.sortedCashflow.reduce((s, r) => s + (r.groups[g.id] || 0), 0))}
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
                      isCatColHovered ? 'bg-slate-850' : 'bg-slate-900'
                    }`} 
                    style={{ color: c.color }}
                  >
                    {formatMoney(analytics.sortedCashflow.reduce((s, r) => s + (analytics.monthlyCatMap?.[c.id]?.[r.monthStr] || 0), 0))}
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
                  isColHovered ? 'bg-slate-850' : 'bg-slate-900'
                }`} 
                style={{ color: g.color || ('#cbd5e1') }}
              >
                {formatMoney(analytics.sortedCashflow.reduce((s, r) => s + (r.groups[g.id] || 0), 0))}
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
                      isCatColHovered ? 'bg-slate-850' : 'bg-slate-900'
                    }`} 
                    style={{ color: c.color }}
                  >
                    {formatMoney(analytics.sortedCashflow.reduce((s, r) => s + (analytics.monthlyCatMap?.[c.id]?.[r.monthStr] || 0), 0))}
                  </td>
                );
              })}
            </React.Fragment>
          );
        })}
        <td 
          onMouseEnter={() => setHoveredCol('trend')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-3 py-2.5 border-l border-b ${thinBorder} text-red-400 sticky right-[250px] z-30 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.15)] transition-colors w-[140px] min-w-[140px] max-w-[140px] ${
            hoveredCol === 'trend' ? 'bg-slate-850' : 'bg-slate-900'
          }`}
        >
          {formatMoney(analytics.totalExpense)}
        </td>
        <td 
          onMouseEnter={() => setHoveredCol('net')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-3 py-2.5 border-l border-b ${thinBorder} text-blue-400 sticky right-[140px] z-30 transition-colors w-[110px] min-w-[110px] max-w-[110px] ${
            hoveredCol === 'net' ? 'bg-slate-850' : 'bg-slate-900'
          }`}
        >
          {formatMoney(analytics.netCashflow)}
        </td>
        <td 
          onMouseEnter={() => setHoveredCol('pct-left')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-2 py-2.5 border-l border-b ${thinBorder} text-center text-emerald-400 sticky right-[70px] z-30 transition-colors w-[70px] min-w-[70px] max-w-[70px] ${
            hoveredCol === 'pct-left' ? 'bg-slate-850' : 'bg-slate-900'
          }`}
        >
          {analytics.totalIncome > 0 ? `${analytics.savingsRate}%` : '0%'}
        </td>
        <td 
          onMouseEnter={() => setHoveredCol('pct-spent')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-2 py-2.5 border-l border-r border-b ${thinBorder} text-center text-pink-400 sticky right-0 z-30 transition-colors w-[70px] min-w-[70px] max-w-[70px] ${
            hoveredCol === 'pct-spent' ? 'bg-slate-850' : 'bg-slate-900'
          }`}
        >
          {analytics.totalIncome > 0 ? `${(analytics.totalExpense / analytics.totalIncome * 100).toFixed(1)}%` : '0%'}
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
          <div className={`w-full rounded-none p-2 text-[11px] font-medium shadow-2xl border backdrop-blur-md ${
            'bg-slate-950/95 border-slate-800 text-slate-200 shadow-black/80'
          }`}>
            {/* Header: Slim, crisp and completely squared */}
            <div className="flex items-center gap-1.5 border-b pb-1.5 mb-1.5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <span className="w-2 h-2 rounded-none shrink-0" style={{ backgroundColor: groupColor }} />
              <span className="font-black text-[11px] uppercase tracking-wider">{group.name}</span>
              <span className="text-[9px] font-bold opacity-60">({activeCats.length})</span>
            </div>

            {/* Content List: Horizontal flow with high density and squared tags */}
            <div className="flex flex-wrap gap-1">
              {activeCats.map(c => (
                <div 
                  key={c.id} 
                  className={`flex items-center gap-1 py-0.5 px-1.5 rounded-none border text-[10px] font-bold ${
                    'bg-slate-900/80 border-slate-800/60 text-slate-300'
                  }`}
                  style={{ borderLeftColor: c.color || '#64748B', borderLeftWidth: '3px' }}
                >
                  <span className="text-[11px] leading-none shrink-0">{c.icon || '📁'}</span>
                  <span className="whitespace-nowrap leading-none">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Arrow */}
          <div className={`w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] ${
            'border-t-slate-950/95'
          }`} />
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

  const toggleGroup = useCallback((groupId) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  // Pre-calculate active categories for each group once
  const activeCatsMap = useMemo(() => {
    if (!analytics || !analytics.sortedCashflow || !categories) return {};
    const map = {};
    for (const group of cashflowGroups) {
      const allCatsInGroup = categories.filter(c => c.cashflowGroup === group.id || c.cashflow_group_id === group.id);
      map[group.id] = allCatsInGroup.filter(c => {
        return analytics.sortedCashflow.some(row => (analytics.monthlyCatMap?.[c.id]?.[row.monthStr] || 0) > 0);
      });
    }
    return map;
  }, [categories, cashflowGroups, analytics]);

  const getActiveCatsForGroup = useCallback((groupId) => {
    return activeCatsMap[groupId] || [];
  }, [activeCatsMap]);

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

  // Memoize active groups to stabilize React.memo checks
  const activeIncomeGroups = useMemo(() => {
    if (!analytics || !cashflowGroups) return [];
    return cashflowGroups
      .filter(g => g.type === 'income')
      .sort((a,b) => a.order_index - b.order_index)
      .filter(g => analytics?.sortedCashflow?.some(row => (row.groups[g.id] || 0) > 0) || showSkeleton);
  }, [cashflowGroups, analytics, showSkeleton]);

  const activeExpenseGroups = useMemo(() => {
    if (!analytics || !cashflowGroups) return [];
    return cashflowGroups
      .filter(g => g.type === 'expense')
      .sort((a,b) => a.order_index - b.order_index)
      .filter(g => analytics?.sortedCashflow?.some(row => (row.groups[g.id] || 0) > 0) || showSkeleton);
  }, [cashflowGroups, analytics, showSkeleton]);

  const thinBorder = 'border-slate-850';
  const boxBorder = 'border-slate-700';
  const boundaryBorder = 'border-r-2 !border-r-slate-800';
  
  // Obsidian zero-rounded flat edge compliance
  const card = `rounded-none border shadow-sm transition-colors ${'bg-slate-900 border-slate-800'}`;

  const segmentProps = {
    activeIncomeGroups, activeExpenseGroups, expandedGroups, toggleGroup, 
    getActiveCatsForGroup, analytics, dm, thinBorder, boundaryBorder, boxBorder,
    handleMouseEnter, handleMouseLeave,
    hoveredCol, setHoveredCol
  };

  return (
    <div className={`${card} overflow-hidden`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between gap-2 ${'bg-slate-950/70 border-slate-850'}`}>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className={`w-4 h-4 ${'text-emerald-400'}`} />
          <h3 className={`font-bold text-sm ${'text-slate-200'}`}>ตารางสรุปกระแสเงินสด</h3>
        </div>
      </div>
      
      <div className="overflow-x-auto overflow-y-hidden custom-scrollbar" style={{ scrollbarWidth: 'thin', scrollbarGutter: 'auto' }}>
        {showSkeleton ? (
          <div className="p-8">
            <div className={`h-40 w-full rounded-none animate-pulse ${'bg-slate-900/40'}`} />
          </div>
        ) : (
          <table className="w-full min-w-full text-right text-[13px] whitespace-nowrap border-separate border-spacing-0">
            <CashflowTableHeader {...segmentProps} />
            <tbody className={`divide-y ${'divide-slate-700/40'}`}>
              {analytics.sortedCashflow.map((row, idx) => (
                <CashflowTableRow 
                  key={row.monthStr} 
                  row={row} 
                  prevMonth={idx > 0 ? analytics.sortedCashflow[idx - 1] : null}
                  isRowHovered={hoveredRow === row.monthStr}
                  setHoveredRow={setHoveredRow}
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
