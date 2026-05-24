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
const CashflowTableHeader = ({ 
  activeIncomeGroups, activeExpenseGroups, expandedGroups, toggleGroup, 
  getActiveCatsForGroup, dm, thinBorder, boundaryBorder, boxBorder,
  handleMouseEnter, handleMouseLeave
}) => {
  const getHighlightBg = (group) => {
    const hexColor = group.color || (group.type === 'income' ? '#10B981' : '#64748B');
    const rgb = hexToRgb(hexColor);
    const opacity = dm ? 0.08 : 0.28;
    return `rgba(${rgb}, ${opacity})`;
  };

  const getSubHighlightBg = (group, subColor) => {
    const hexColor = subColor || group.color || '#64748B';
    const rgb = hexToRgb(hexColor);
    const opacity = dm ? 0.06 : 0.20;
    return `rgba(${rgb}, ${opacity})`;
  };

  return (
    <thead className={`sticky top-0 z-30 ${'bg-slate-950'}`}>
      <tr>
        <th rowSpan={2} className={`px-3 py-2.5 font-bold text-center sticky left-0 z-50 align-middle border-l border-r border-b ${thinBorder} shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] ${'text-blue-300 bg-slate-950'}`}>ช่วงเวลา</th>
        
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
        
        <th rowSpan={2} className={`px-3 py-2.5 font-bold border-l border-b ${thinBorder} align-middle sticky right-[230px] z-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.15)] ${'text-red-400 bg-slate-950'} w-[140px] min-w-[140px] max-w-[140px]`}>รวมรายจ่าย (Trend)</th>
        <th rowSpan={2} className={`px-3 py-2.5 font-bold border-l border-b ${thinBorder} align-middle sticky right-[120px] z-50 ${'text-blue-400 bg-slate-950'} w-[110px] min-w-[110px] max-w-[110px]`}>เงินคงเหลือ</th>
        <th rowSpan={2} className={`px-3 py-2.5 font-bold border-l border-b text-center align-middle sticky right-[60px] z-50 ${'text-emerald-400 bg-slate-950'} w-[60px] min-w-[60px] max-w-[60px] ${thinBorder}`}>%เหลือ</th>
        <th rowSpan={2} className={`px-3 py-2.5 font-bold border-l border-r border-b text-center align-middle sticky right-0 z-50 ${'text-pink-400 bg-slate-950'} w-[60px] min-w-[60px] max-w-[60px] ${thinBorder}`}>%จ่าย</th>
      </tr>
      
      <tr>
        {activeIncomeGroups.map((g, idx) => {
          const isExpanded = expandedGroups.has(g.id);
          const cats = getActiveCatsForGroup(g.id);
          const isLastIncome = idx === activeIncomeGroups.length - 1;

          return (
            <React.Fragment key={g.id}>
              <th 
                onClick={() => toggleGroup(g.id)}
                onMouseEnter={(e) => handleMouseEnter(e, g)}
                onMouseLeave={handleMouseLeave}
                className={`px-3 py-1.5 font-extrabold text-center cursor-pointer transition-colors border-l border-b ${isExpanded ? boxBorder : thinBorder} ${isLastIncome && !isExpanded ? boundaryBorder : ''}`} 
                style={{ color: g.color || ('#34d399'), backgroundColor: getHighlightBg(g) }}
              >
                {g.name} {isExpanded ? '«' : '»'}
              </th>
              {isExpanded && cats.map((c, cIdx) => (
                <th key={c.id} className={`px-2 py-1.5 font-black text-center text-[9px] uppercase border-l border-b transition-all ${cIdx === cats.length - 1 && isLastIncome ? boundaryBorder : thinBorder} border-t-slate-500 border-b-slate-500`} style={{ color: c.color, backgroundColor: getSubHighlightBg(g, c.color) }}>
                  {c.name}
                </th>
              ))}
            </React.Fragment>
          );
        })}
        
        {activeExpenseGroups.map((g) => {
          const isExpanded = expandedGroups.has(g.id);
          const cats = getActiveCatsForGroup(g.id);
          return (
            <React.Fragment key={g.id}>
              <th 
                onClick={() => toggleGroup(g.id)}
                onMouseEnter={(e) => handleMouseEnter(e, g)}
                onMouseLeave={handleMouseLeave}
                className={`px-3 py-1.5 font-bold text-center cursor-pointer transition-colors border-l border-b ${isExpanded ? boxBorder : thinBorder}`} 
                style={{ color: g.color || ('#cbd5e1'), backgroundColor: getHighlightBg(g) }}
              >
                {g.name} {isExpanded ? '«' : '»'}
              </th>
              {isExpanded && cats.map((c) => (
                <th key={c.id} className={`px-2 py-1.5 font-black text-center text-[9px] uppercase border-l border-b transition-all ${thinBorder} border-t-slate-500 border-b-slate-500`} style={{ color: c.color, backgroundColor: getSubHighlightBg(g, c.color) }}>
                  {c.name}
                </th>
              ))}
            </React.Fragment>
          );
        })}
      </tr>
    </thead>
  );
};

/**
 * INTERNAL COMPONENT: CashflowTableRow
 */
const CashflowTableRow = ({ 
  row, activeIncomeGroups, activeExpenseGroups, expandedGroups, 
  getActiveCatsForGroup, analytics, dm, thinBorder, boundaryBorder, boxBorder,
  handleMouseEnter, handleMouseLeave
}) => {
  const getHighlightBg = (group) => {
    const hexColor = group.color || (group.type === 'income' ? '#10B981' : '#64748B');
    const rgb = hexToRgb(hexColor);
    const opacity = dm ? 0.08 : 0.28;
    return `rgba(${rgb}, ${opacity})`;
  };

  const getSubHighlightBg = (group, subColor) => {
    const hexColor = subColor || group.color || '#64748B';
    const rgb = hexToRgb(hexColor);
    const opacity = dm ? 0.06 : 0.20;
    return `rgba(${rgb}, ${opacity})`;
  };

  const prevIndex = analytics.sortedCashflow.findIndex(r => r.monthStr === row.monthStr) - 1;
  const prevMonth = analytics.sortedCashflow[prevIndex];
  let expMoMJSX = null;
  if (prevMonth && prevMonth.totalExp > 0) {
    const diff = row.totalExp - prevMonth.totalExp;
    const percent = (diff / prevMonth.totalExp) * 100;
    const isUp = percent > 0;
    const isFlat = Math.abs(percent) < 0.1;
    expMoMJSX = (
      <span className={`inline-flex items-center justify-center min-w-[38px] text-[9px] font-black px-1 py-[1px] rounded leading-none ${isFlat ? ('bg-slate-700 text-slate-400') : (isUp ? ('bg-red-500/20 text-red-400') : ('bg-emerald-500/20 text-emerald-400'))}`}>
        {isFlat ? '-' : (isUp ? '↑' : '↓')} {Math.abs(percent).toFixed(1)}%
      </span>
    );
  }

  return (
    <tr className="group hover:bg-slate-400/5 transition-colors">
      <td className={`px-3 py-2 font-bold text-center sticky left-0 z-10 border-l border-r border-b ${thinBorder} shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] transition-colors ${'text-blue-300 bg-slate-900 group-hover:bg-slate-850'}`}>{getThaiMonth(row.monthStr)}</td>
      
      {activeIncomeGroups.map((g, idx) => {
        const isExpanded = expandedGroups.has(g.id);
        const cats = getActiveCatsForGroup(g.id);
        const isLastIncome = idx === activeIncomeGroups.length - 1;

        return (
          <React.Fragment key={g.id}>
            <td 
              onMouseEnter={(e) => handleMouseEnter(e, g)}
              onMouseLeave={handleMouseLeave}
              className={`px-3 py-2 font-semibold border-l border-b ${isExpanded ? boxBorder : thinBorder} ${isLastIncome && !isExpanded ? boundaryBorder : ''}`} 
              style={{ color: g.color || ('#34d399'), backgroundColor: getHighlightBg(g) }}
            >
              {row.groups[g.id] > 0 ? formatMoney(row.groups[g.id]) : '-'}
            </td>
            {isExpanded && cats.map((c, cIdx) => {
              const amt = analytics.monthlyCatMap?.[c.id]?.[row.monthStr] || 0;
              return (
                <td key={c.id} className={`px-2 py-2 text-[10px] tabular-nums font-black border-l border-b ${cIdx === cats.length - 1 && isLastIncome ? boundaryBorder : thinBorder}`} style={{ color: c.color, backgroundColor: getSubHighlightBg(g, c.color) }}>
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
        return (
          <React.Fragment key={g.id}>
            <td 
              onMouseEnter={(e) => handleMouseEnter(e, g)}
              onMouseLeave={handleMouseLeave}
              className={`px-3 py-2 font-medium border-l border-b ${isExpanded ? boxBorder : thinBorder}`} 
              style={{ color: g.color || ('#cbd5e1'), backgroundColor: getHighlightBg(g) }}
            >
              {row.groups[g.id] > 0 ? formatMoney(row.groups[g.id]) : '-'}
            </td>
            {isExpanded && cats.map((c) => {
              const amt = analytics.monthlyCatMap?.[c.id]?.[row.monthStr] || 0;
              return (
                <td key={c.id} className={`px-2 py-2 text-[10px] tabular-nums font-black border-l border-b ${thinBorder}`} style={{ color: c.color, backgroundColor: getSubHighlightBg(g, c.color) }}>
                  {amt > 0 ? formatMoney(amt) : '-'}
                </td>
              );
            })}
          </React.Fragment>
        );
      })}

      <td className={`px-3 py-2 font-bold border-l border-b ${thinBorder} sticky right-[230px] z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.15)] transition-colors ${'text-red-400 bg-slate-900 group-hover:bg-slate-850'} w-[140px] min-w-[140px] max-w-[140px]`}>
        <div className="flex items-center justify-between gap-1">
          <div className="shrink-0">{expMoMJSX}</div>
          <span className="text-[11px] tabular-nums">{formatMoney(row.totalExp)}</span>
        </div>
      </td>
      <td className={`px-3 py-2 font-black border-l border-b ${thinBorder} sticky right-[120px] z-10 transition-colors ${'text-blue-400 bg-slate-900 group-hover:bg-slate-850'} w-[110px] min-w-[110px] max-w-[110px]`}>{formatMoney(row.income - row.totalExp)}</td>
      <td className={`px-3 py-2 font-black border-l border-b text-center ${thinBorder} sticky right-[60px] z-10 transition-colors ${'bg-slate-900 group-hover:bg-slate-850'} ${row.income > 0 && (row.income - row.totalExp) < 0 ? 'text-red-400' : 'text-emerald-400'} w-[60px] min-w-[60px] max-w-[60px]`}>{row.income > 0 ? ((row.income - row.totalExp) / row.income * 100).toFixed(1) : '0.0'}%</td>
      <td className={`px-3 py-2 font-black border-l border-r border-b text-center ${thinBorder} sticky right-0 z-10 transition-colors ${'bg-slate-900 group-hover:bg-slate-850'} ${row.income > 0 && (row.totalExp / row.income * 100) > 100 ? 'text-red-400' : 'text-pink-400'} w-[60px] min-w-[60px] max-w-[60px]`}>{row.income > 0 ? (row.totalExp / row.income * 100).toFixed(1) + '%' : '-'}</td>
    </tr>
  );
};

/**
 * INTERNAL COMPONENT: CashflowTableFooter
 */
const CashflowTableFooter = ({ 
  activeIncomeGroups, activeExpenseGroups, expandedGroups, 
  getActiveCatsForGroup, analytics, dm, thinBorder, boundaryBorder, boxBorder,
  handleMouseEnter, handleMouseLeave
}) => {
  if (analytics.numMonths <= 1) return null;

  return (
    <tfoot className={`font-bold border-t ${thinBorder} sticky bottom-0 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]`}>
      <tr className={'text-slate-200'}>
        <td className={`px-3 py-2.5 text-center sticky left-0 z-30 border-l border-r border-b ${thinBorder} shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] ${'bg-slate-900'}`}>รวมทั้งหมด</td>
        {activeIncomeGroups.map((g, idx) => {
          const isExpanded = expandedGroups.has(g.id);
          const cats = getActiveCatsForGroup(g.id);
          const isLastIncome = idx === activeIncomeGroups.length - 1;

          return (
            <React.Fragment key={g.id}>
              <td 
                onMouseEnter={(e) => handleMouseEnter(e, g)}
                onMouseLeave={handleMouseLeave}
                className={`px-3 py-2.5 border-l border-b ${thinBorder} ${'bg-slate-900'} ${isExpanded ? boxBorder : thinBorder} ${isLastIncome && !isExpanded ? boundaryBorder : ''}`} 
                style={{ color: g.color || ('#34d399') }}
              >
                {formatMoney(analytics.sortedCashflow.reduce((s, r) => s + (r.groups[g.id] || 0), 0))}
              </td>
              {isExpanded && cats.map((c, cIdx) => (
                <td key={c.id} className={`px-2 py-2.5 text-[9px] font-black uppercase border-l border-b ${'bg-slate-900'} ${cIdx === cats.length - 1 && isLastIncome ? boundaryBorder : thinBorder}`} style={{ color: c.color }}>
                  {formatMoney(analytics.sortedCashflow.reduce((s, r) => s + (analytics.monthlyCatMap?.[c.id]?.[r.monthStr] || 0), 0))}
                </td>
              ))}
            </React.Fragment>
          );
        })}

        {activeExpenseGroups.map((g) => {
          const isExpanded = expandedGroups.has(g.id);
          const cats = getActiveCatsForGroup(g.id);
          return (
            <React.Fragment key={g.id}>
              <td 
                onMouseEnter={(e) => handleMouseEnter(e, g)}
                onMouseLeave={handleMouseLeave}
                className={`px-3 py-2.5 border-l border-b ${thinBorder} ${'bg-slate-900'} ${isExpanded ? boxBorder : thinBorder}`} 
                style={{ color: g.color || ('#cbd5e1') }}
              >
                {formatMoney(analytics.sortedCashflow.reduce((s, r) => s + (r.groups[g.id] || 0), 0))}
              </td>
              {isExpanded && cats.map((c) => (
                <td key={c.id} className={`px-2 py-2.5 text-[9px] font-black uppercase border-l border-b ${'bg-slate-900'} ${thinBorder}`} style={{ color: c.color }}>
                  {formatMoney(analytics.sortedCashflow.reduce((s, r) => s + (analytics.monthlyCatMap?.[c.id]?.[r.monthStr] || 0), 0))}
                </td>
              ))}
            </React.Fragment>
          );
        })}
        <td className={`px-3 py-2.5 border-l border-b ${thinBorder} text-red-400 sticky right-[230px] z-30 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.15)] ${'bg-slate-900'} w-[140px] min-w-[140px] max-w-[140px]`}>{formatMoney(analytics.totalExpense)}</td>
        <td className={`px-3 py-2.5 border-l border-b ${thinBorder} text-blue-400 sticky right-[120px] z-30 ${'bg-slate-900'} w-[110px] min-w-[110px] max-w-[110px]`}>{formatMoney(analytics.netCashflow)}</td>
        <td className={`px-3 py-2.5 border-l border-b ${thinBorder} text-center text-emerald-400 sticky right-[60px] z-30 ${'bg-slate-900'} w-[60px] min-w-[60px] max-w-[60px]`}>{analytics.totalIncome > 0 ? `${analytics.savingsRate}%` : '0%'}</td>
        <td className={`px-3 py-2.5 border-l border-r border-b ${thinBorder} text-center text-pink-400 sticky right-0 z-30 ${'bg-slate-900'} w-[60px] min-w-[60px] max-w-[60px]`}>{analytics.totalIncome > 0 ? `${(analytics.totalExpense / analytics.totalIncome * 100).toFixed(1)}%` : '0%'}</td>
      </tr>
    </tfoot>
  );
};

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
          className="flex flex-col items-center min-w-[160px] max-w-[320px]"
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
                  <span className="truncate max-w-[85px] leading-none">{c.name}</span>
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

  const activeIncomeGroups = cashflowGroups
    .filter(g => g.type === 'income')
    .sort((a,b) => a.order_index - b.order_index)
    .filter(g => analytics?.sortedCashflow?.some(row => (row.groups[g.id] || 0) > 0) || showSkeleton);

  const activeExpenseGroups = cashflowGroups
    .filter(g => g.type === 'expense')
    .sort((a,b) => a.order_index - b.order_index)
    .filter(g => analytics?.sortedCashflow?.some(row => (row.groups[g.id] || 0) > 0) || showSkeleton);

  const thinBorder = 'border-slate-850';
  const boxBorder = 'border-slate-700';
  const boundaryBorder = 'border-r-2 !border-r-slate-800';
  const card = `rounded-sm border shadow-sm transition-colors ${'bg-slate-900 border-slate-800'}`;

  const segmentProps = {
    activeIncomeGroups, activeExpenseGroups, expandedGroups, toggleGroup, 
    getActiveCatsForGroup, analytics, dm, thinBorder, boundaryBorder, boxBorder,
    handleMouseEnter, handleMouseLeave
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
            <div className={`h-40 w-full rounded-sm animate-pulse ${'bg-slate-900/40'}`} />
          </div>
        ) : (
          <table className="w-full min-w-full text-right text-[13px] whitespace-nowrap border-separate border-spacing-0">
            <CashflowTableHeader {...segmentProps} />
            <tbody className={`divide-y ${'divide-slate-700/40'}`}>
              {analytics.sortedCashflow.map((row) => (
                <CashflowTableRow key={row.monthStr} row={row} {...segmentProps} />
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
