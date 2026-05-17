// src/views/Dashboard/components/CashflowTable.jsx
import React, { useState, useCallback } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { useDashboardContext } from '../context/DashboardContext';
import { formatMoney, getThaiMonth, hexToRgb } from '../../../utils/formatters';

/**
 * INTERNAL COMPONENT: CashflowTableHeader
 */
const CashflowTableHeader = ({ 
  activeIncomeGroups, activeExpenseGroups, expandedGroups, toggleGroup, 
  getActiveCatsForGroup, dm, thinBorder, boundaryBorder, boxBorder 
}) => {
  const getHighlightBg = (group) => {
    const hexColor = group.color || (group.type === 'income' ? '#10B981' : '#64748B');
    const rgb = hexToRgb(hexColor);
    const opacity = group.highlightBg ? (dm ? 0.25 : 0.12) : (dm ? 0.08 : 0.05);
    return `rgba(${rgb}, ${opacity})`;
  };

  const getSubHighlightBg = (group, subColor) => {
    const hexColor = subColor || group.color || '#64748B';
    const rgb = hexToRgb(hexColor);
    const opacity = dm ? 0.06 : 0.03;
    return `rgba(${rgb}, ${opacity})`;
  };

  return (
    <thead className={`sticky top-0 z-30 ${dm ? 'bg-slate-800' : 'bg-slate-100'}`}>
      <tr>
        <th rowSpan={2} className={`px-3 py-2.5 font-bold text-center sticky left-0 z-50 align-middle border-l border-b ${thinBorder} ${dm ? 'text-blue-300 bg-slate-900' : 'text-[#00509E] bg-slate-200'}`}>ช่วงเวลา</th>
        
        {activeIncomeGroups.length > 0 && (
          <th colSpan={activeIncomeGroups.reduce((acc, g) => acc + (expandedGroups.has(g.id) ? getActiveCatsForGroup(g.id).length + 1 : 1), 0)} className={`px-3 py-1.5 font-black text-center border-l border-b border-dashed ${thinBorder} ${dm ? 'text-emerald-400' : 'text-emerald-700'}`}>
            รายรับ (+)
          </th>
        )}

        {activeExpenseGroups.length > 0 && (
          <th colSpan={activeExpenseGroups.reduce((acc, g) => acc + (expandedGroups.has(g.id) ? getActiveCatsForGroup(g.id).length + 1 : 1), 0)} className={`px-3 py-1.5 font-black text-center border-l border-b border-dashed ${thinBorder} ${dm ? 'text-slate-400' : 'text-slate-700'}`}>
            รายจ่าย (-)
          </th>
        )}
        
        <th rowSpan={2} className={`px-3 py-2.5 font-bold border-l border-b ${thinBorder} align-middle sticky right-[230px] z-50 ${dm ? 'text-red-400 bg-slate-900' : 'text-red-800 bg-slate-200'} min-w-[100px] max-w-[100px]`}>Trend</th>
        <th rowSpan={2} className={`px-3 py-2.5 font-bold border-l border-b ${thinBorder} align-middle sticky right-[120px] z-50 ${dm ? 'text-blue-400 bg-slate-900' : 'text-[#00509E] bg-slate-200'} min-w-[110px] max-w-[110px]`}>เงินคงเหลือ</th>
        <th rowSpan={2} className={`px-3 py-2.5 font-bold border-l border-b text-center align-middle sticky right-[60px] z-50 ${dm ? 'text-emerald-400 bg-slate-900' : 'text-emerald-600 bg-slate-200'} min-w-[60px] max-w-[60px]`}>%ออม</th>
        <th rowSpan={2} className={`px-3 py-2.5 font-bold border-l border-r border-b text-center align-middle sticky right-0 z-50 ${dm ? 'text-pink-400 bg-slate-900' : 'text-pink-600 bg-slate-200'} min-w-[60px] max-w-[60px] ${thinBorder}`}>%จ่าย</th>
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
                className={`px-3 py-1.5 font-extrabold text-center cursor-pointer transition-colors border-l border-b ${isExpanded ? boxBorder : thinBorder} ${isLastIncome && !isExpanded ? boundaryBorder : ''}`} 
                style={{ color: g.color || (dm ? '#34d399' : '#059669'), backgroundColor: getHighlightBg(g) }}
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
                className={`px-3 py-1.5 font-bold text-center cursor-pointer transition-colors border-l border-b ${isExpanded ? boxBorder : thinBorder}`} 
                style={{ color: g.color || (dm ? '#cbd5e1' : '#334155'), backgroundColor: getHighlightBg(g) }}
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
  getActiveCatsForGroup, analytics, dm, thinBorder, boundaryBorder, boxBorder 
}) => {
  const getHighlightBg = (group) => {
    const hexColor = group.color || (group.type === 'income' ? '#10B981' : '#64748B');
    const rgb = hexToRgb(hexColor);
    const opacity = group.highlightBg ? (dm ? 0.25 : 0.12) : (dm ? 0.08 : 0.05);
    return `rgba(${rgb}, ${opacity})`;
  };

  const getSubHighlightBg = (group, subColor) => {
    const hexColor = subColor || group.color || '#64748B';
    const rgb = hexToRgb(hexColor);
    const opacity = dm ? 0.06 : 0.03;
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
      <span className={`inline-flex items-center justify-center min-w-[38px] text-[9px] font-black px-1 py-[1px] rounded leading-none ${isFlat ? (dm ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500') : (isUp ? (dm ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600') : (dm ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'))}`}>
        {isFlat ? '-' : (isUp ? '↑' : '↓')} {Math.abs(percent).toFixed(1)}%
      </span>
    );
  }

  return (
    <tr className="group hover:bg-slate-400/5 transition-colors">
      <td className={`px-3 py-2 font-bold text-center sticky left-0 z-10 border-l border-r border-b ${thinBorder} transition-colors ${dm ? 'text-blue-300 bg-slate-800 group-hover:bg-slate-700' : 'text-[#00509E] bg-slate-50 group-hover:bg-slate-100'}`}>{getThaiMonth(row.monthStr)}</td>
      
      {activeIncomeGroups.map((g, idx) => {
        const isExpanded = expandedGroups.has(g.id);
        const cats = getActiveCatsForGroup(g.id);
        const isLastIncome = idx === activeIncomeGroups.length - 1;

        return (
          <React.Fragment key={g.id}>
            <td className={`px-3 py-2 font-semibold border-l border-b ${isExpanded ? boxBorder : thinBorder} ${isLastIncome && !isExpanded ? boundaryBorder : ''}`} style={{ color: g.color || (dm ? '#34d399' : '#059669'), backgroundColor: getHighlightBg(g) }}>
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
            <td className={`px-3 py-2 font-medium border-l border-b ${isExpanded ? boxBorder : thinBorder}`} style={{ color: g.color || (dm ? '#cbd5e1' : '#334155'), backgroundColor: getHighlightBg(g) }}>
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

      <td className={`px-3 py-2 font-bold border-l border-b ${thinBorder} sticky right-[230px] z-10 transition-colors ${dm ? 'text-red-400 bg-slate-800 group-hover:bg-slate-700' : 'text-red-700 bg-slate-50 group-hover:bg-slate-100'} min-w-[100px] max-w-[100px]`}>
        <div className="flex items-center justify-between gap-1">
          <div className="shrink-0">{expMoMJSX}</div>
          <span className="text-[11px] tabular-nums">{formatMoney(row.totalExp)}</span>
        </div>
      </td>
      <td className={`px-3 py-2 font-black border-l border-b ${thinBorder} sticky right-[120px] z-10 transition-colors ${dm ? 'text-blue-400 bg-slate-800 group-hover:bg-slate-700' : 'text-[#00509E] bg-slate-50 group-hover:bg-slate-100'} min-w-[110px] max-w-[110px]`}>{formatMoney(row.income - row.totalExp)}</td>
      <td className={`px-3 py-2 font-black border-l border-b text-center ${thinBorder} sticky right-[60px] z-10 transition-colors ${dm ? 'bg-slate-800 group-hover:bg-slate-700' : 'bg-slate-50 group-hover:bg-slate-100'} ${row.income > 0 && (row.income - row.totalExp) < 0 ? 'text-red-400' : 'text-emerald-400'} min-w-[60px] max-w-[60px]`}>{row.income > 0 ? ((row.income - row.totalExp) / row.income * 100).toFixed(1) : '0.0'}%</td>
      <td className={`px-3 py-2 font-black border-l border-r border-b text-center ${thinBorder} sticky right-0 z-10 transition-colors ${dm ? 'bg-slate-800 group-hover:bg-slate-700' : 'bg-slate-50 group-hover:bg-slate-100'} ${row.income > 0 && (row.totalExp / row.income * 100) > 100 ? 'text-red-400' : 'text-pink-400'} min-w-[60px] max-w-[60px]`}>{row.income > 0 ? (row.totalExp / row.income * 100).toFixed(1) + '%' : '-'}</td>
    </tr>
  );
};

/**
 * INTERNAL COMPONENT: CashflowTableFooter
 */
const CashflowTableFooter = ({ 
  activeIncomeGroups, activeExpenseGroups, expandedGroups, 
  getActiveCatsForGroup, analytics, dm, thinBorder, boundaryBorder, boxBorder 
}) => {
  if (analytics.numMonths <= 1) return null;

  return (
    <tfoot className={`font-bold border-t ${thinBorder} sticky bottom-0 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]`}>
      <tr className={dm ? 'text-slate-200' : 'text-white'}>
        <td className={`px-3 py-2.5 text-center sticky left-0 z-30 border-l border-r border-b ${thinBorder} ${dm ? 'bg-slate-900' : 'bg-slate-800'}`}>รวมทั้งหมด</td>
        {activeIncomeGroups.map((g, idx) => {
          const isExpanded = expandedGroups.has(g.id);
          const cats = getActiveCatsForGroup(g.id);
          const isLastIncome = idx === activeIncomeGroups.length - 1;

          return (
            <React.Fragment key={g.id}>
              <td className={`px-3 py-2.5 border-l border-b ${thinBorder} ${dm ? 'bg-slate-900' : 'bg-slate-800'} ${isExpanded ? boxBorder : thinBorder} ${isLastIncome && !isExpanded ? boundaryBorder : ''}`} style={{ color: g.color || (dm ? '#34d399' : '#059669') }}>
                {formatMoney(analytics.sortedCashflow.reduce((s, r) => s + (r.groups[g.id] || 0), 0))}
              </td>
              {isExpanded && cats.map((c, cIdx) => (
                <td key={c.id} className={`px-2 py-2.5 text-[9px] font-black uppercase border-l border-b ${dm ? 'bg-slate-900' : 'bg-slate-800'} ${cIdx === cats.length - 1 && isLastIncome ? boundaryBorder : thinBorder}`} style={{ color: c.color }}>
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
              <td className={`px-3 py-2.5 border-l border-b ${thinBorder} ${dm ? 'bg-slate-900' : 'bg-slate-800'} ${isExpanded ? boxBorder : thinBorder}`} style={{ color: g.color || (dm ? '#cbd5e1' : '#334155') }}>
                {formatMoney(analytics.sortedCashflow.reduce((s, r) => s + (r.groups[g.id] || 0), 0))}
              </td>
              {isExpanded && cats.map((c) => (
                <td key={c.id} className={`px-2 py-2.5 text-[9px] font-black uppercase border-l border-b ${dm ? 'bg-slate-900' : 'bg-slate-800'} ${thinBorder}`} style={{ color: c.color }}>
                  {formatMoney(analytics.sortedCashflow.reduce((s, r) => s + (analytics.monthlyCatMap?.[c.id]?.[r.monthStr] || 0), 0))}
                </td>
              ))}
            </React.Fragment>
          );
        })}
        <td className={`px-3 py-2.5 border-l border-b ${thinBorder} text-red-400 sticky right-[230px] z-30 ${dm ? 'bg-slate-900' : 'bg-slate-800'} min-w-[100px] max-w-[100px]`}>{formatMoney(analytics.totalExpense)}</td>
        <td className={`px-3 py-2.5 border-l border-b ${thinBorder} text-blue-400 sticky right-[120px] z-30 ${dm ? 'bg-slate-900' : 'bg-slate-800'} min-w-[110px] max-w-[110px]`}>{formatMoney(analytics.netCashflow)}</td>
        <td className={`px-3 py-2.5 border-l border-b ${thinBorder} text-center text-emerald-400 sticky right-[60px] z-30 ${dm ? 'bg-slate-900' : 'bg-slate-800'} min-w-[60px] max-w-[60px]`}>{analytics.totalIncome > 0 ? `${analytics.savingsRate}%` : '0%'}</td>
        <td className={`px-3 py-2.5 border-l border-r border-b ${thinBorder} text-center text-pink-400 sticky right-0 z-30 ${dm ? 'bg-slate-900' : 'bg-slate-800'} min-w-[60px] max-w-[60px]`}>{analytics.totalIncome > 0 ? `${(analytics.totalExpense / analytics.totalIncome * 100).toFixed(1)}%` : '0%'}</td>
      </tr>
    </tfoot>
  );
};

/**
 * CashflowTable - A high-density spreadsheet view of monthly financial data.
 */
export default function CashflowTable() {
  const { analytics, cashflowGroups = [], categories = [], dm, showSkeleton } = useDashboardContext();
  const [expandedGroups, setExpandedGroups] = useState(new Set());

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

  if (!showSkeleton && (!analytics || analytics.numMonths === 0 || !cashflowGroups || cashflowGroups.length === 0)) return null;

  const activeIncomeGroups = cashflowGroups
    .filter(g => g.type === 'income')
    .sort((a,b) => a.order_index - b.order_index)
    .filter(g => analytics?.sortedCashflow?.some(row => (row.groups[g.id] || 0) > 0) || showSkeleton);

  const activeExpenseGroups = cashflowGroups
    .filter(g => g.type === 'expense')
    .sort((a,b) => a.order_index - b.order_index)
    .filter(g => analytics?.sortedCashflow?.some(row => (row.groups[g.id] || 0) > 0) || showSkeleton);

  const thinBorder = dm ? 'border-slate-700' : 'border-slate-200';
  const boxBorder = dm ? 'border-slate-500' : 'border-slate-400';
  const boundaryBorder = dm ? 'border-r-2 !border-r-slate-500' : 'border-r-2 !border-r-slate-300';
  const card = `rounded-sm border shadow-sm transition-colors ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`;

  const segmentProps = {
    activeIncomeGroups, activeExpenseGroups, expandedGroups, toggleGroup, 
    getActiveCatsForGroup, analytics, dm, thinBorder, boundaryBorder, boxBorder
  };

  return (
    <div className={`${card} overflow-hidden`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between gap-2 ${dm ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className={`w-4 h-4 ${dm ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <h3 className={`font-bold text-sm ${dm ? 'text-slate-200' : 'text-slate-800'}`}>ตารางสรุปกระแสเงินสด</h3>
        </div>
      </div>
      
      <div className="overflow-x-auto custom-scrollbar" style={{ scrollbarWidth: 'thin', scrollbarGutter: 'auto' }}>
        {showSkeleton ? (
          <div className="p-8">
            <div className={`h-40 w-full rounded-sm animate-pulse ${dm ? 'bg-slate-900/40' : 'bg-slate-50'}`} />
          </div>
        ) : (
          <table className="w-full min-w-full text-right text-[13px] whitespace-nowrap border-separate border-spacing-0">
            <CashflowTableHeader {...segmentProps} />
            <tbody className={`divide-y ${dm ? 'divide-slate-700/40' : 'divide-slate-100'}`}>
              {analytics.sortedCashflow.map((row) => (
                <CashflowTableRow key={row.monthStr} row={row} {...segmentProps} />
              ))}
            </tbody>
            <CashflowTableFooter {...segmentProps} />
          </table>
        )}
      </div>
    </div>
  );
}
