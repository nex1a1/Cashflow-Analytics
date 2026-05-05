// src/views/Dashboard/components/CashflowTable.jsx
import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { FileSpreadsheet } from 'lucide-react';
import { formatMoney, getThaiMonth, hexToRgb } from '../../../utils/formatters';
import { useTheme } from '../../../context/ThemeContext';
export default function CashflowTable({ analytics, cashflowGroups = [], categories = [] }) {
  const { isDarkMode: dm } = useTheme();
  const [tooltip, setTooltip] = useState(null);
  const tooltipRef = useRef(null);

  const card = `rounded-sm border shadow-sm transition-colors ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;
  if (!analytics || analytics.numMonths === 0 || !cashflowGroups || cashflowGroups.length === 0) return null;

  const handleCellHover = (e, g) => {
    if (!categories || categories.length === 0) return;
    const catsInGroup = categories.filter(c => c.cashflowGroup === g.id || c.cashflow_group_id === g.id);
    if (catsInGroup.length === 0) return;
    setTooltip({ x: e.clientX, y: e.clientY, group: g, cats: catsInGroup });
  };

  const handleCellMouseMove = (e) => {
    if (!tooltip) return;
    setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
  };

  const handleCellLeave = () => {
    setTooltip(null);
  };

  const activeIncomeGroups = cashflowGroups
    .filter(g => g.type === 'income')
    .sort((a,b) => a.order - b.order)
    .filter(g => analytics.sortedCashflow.some(row => (row.groups[g.id] || 0) > 0));

  const activeExpenseGroups = cashflowGroups
    .filter(g => g.type === 'expense')
    .sort((a,b) => a.order - b.order)
    .filter(g => analytics.sortedCashflow.some(row => (row.groups[g.id] || 0) > 0));

  // 🚀 เส้นแบ่งสี Slate ตามโหมดมืด/สว่าง
  const dividerCls = `border-r-2 ${dm ? 'border-slate-600' : 'border-slate-300'}`;

  const getHighlightBg = (group) => {
    const hexColor = group.color || (group.type === 'income' ? '#10B981' : '#64748B');
    const rgb = hexToRgb(hexColor);
    const opacity = group.highlightBg ? (dm ? 0.30 : 0.15) : (dm ? 0.10 : 0.06);
    return `rgba(${rgb}, ${opacity})`;
  };

  const getCategoryTooltip = (groupId) => {
    if (!categories || categories.length === 0) return '';
    const catsInGroup = categories.filter(c => c.cashflowGroup === groupId);
    if (catsInGroup.length === 0) return '';
    return `รวมหมวดหมู่: ${catsInGroup.map(c => c.name).join(', ')}`;
  };

  return (
    <>
      {/* ── Custom Header Tooltip ── */}
      {tooltip && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] pointer-events-none"
          style={{ left: tooltip.x + 14, top: tooltip.y - 8, transform: 'translateY(-100%)' }}
        >
          <div style={{
            background: dm ? 'rgba(15,23,42,0.97)' : 'rgba(255,255,255,0.98)',
            border: `1px solid ${dm ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            borderRadius: 4,
            boxShadow: dm ? '0 10px 30px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.08)',
            minWidth: 200,
            maxWidth: 300,
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
          }}>
            <div style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: `1px solid ${dm ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
              background: tooltip.group?.color ? `${tooltip.group.color}18` : (dm ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
            }}>
              {tooltip.group?.icon && <span style={{ fontSize: 16, lineHeight: 1 }}>{tooltip.group.icon}</span>}
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: dm ? '#f1f5f9' : '#1e293b', lineHeight: 1.2 }}>
                  {tooltip.group?.name}
                </p>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: dm ? '#94a3b8' : '#64748b', lineHeight: 1.3, marginTop: 1 }}>
                  รวมหมวดหมู่ย่อย
                </p>
              </div>
            </div>
            <div style={{ padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {tooltip.cats.map((c, i) => (
                <span key={i} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: dm ? '#cbd5e1' : '#475569',
                  background: dm ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: `1px solid ${dm ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
                }}>
                  {c.icon && <span style={{marginRight: '4px', fontSize: '10px'}}>{c.icon}</span>}
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={`${card} overflow-hidden`} onMouseLeave={handleCellLeave}>
        <div className={`px-4 py-3 border-b flex items-center gap-2 ${dm ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <FileSpreadsheet className={`w-4 h-4 ${dm ? 'text-emerald-400' : 'text-emerald-600'}`} />
        <h3 className={`font-bold text-sm ${dm ? 'text-slate-200' : 'text-slate-800'}`}>ตารางสรุปกระแสเงินสด</h3>
      </div>
      <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
        <table className="w-full text-right text-[13px] whitespace-nowrap">
          <thead className={`border-b-2 ${dm ? 'border-slate-600 bg-slate-800/95' : 'border-slate-300 bg-slate-100/95'}`}>
            
            {/* 🚀 ROW 1: หัวตารางจัดกลุ่มใหญ่ */}
            <tr>
              <th rowSpan={2} className={`px-3 py-2.5 font-bold text-center sticky left-0 z-10 align-middle ${dm ? 'text-blue-300 bg-slate-900' : 'text-[#00509E] bg-slate-200'}`}>ช่วงเวลา</th>
              
              {activeIncomeGroups.length > 0 && (
                /* เติมเส้นขั่น dividerCls ไว้หลัง รายรับ (+) */
                <th colSpan={activeIncomeGroups.length} className={`px-3 py-1.5 font-black text-center border-b border-dashed ${dm ? 'text-emerald-400 border-slate-600' : 'text-emerald-700 border-slate-300'} ${dividerCls}`}>
                  รายรับ (+)
                </th>
              )}
              
              {activeExpenseGroups.length > 0 && (
                <th colSpan={activeExpenseGroups.length} className={`px-3 py-1.5 font-black text-center border-b border-dashed ${dm ? 'text-slate-300 border-slate-600' : 'text-slate-700 border-slate-300'}`}>
                  รายจ่าย (-)
                </th>
              )}

              <th rowSpan={2} className={`px-3 py-2.5 font-bold border-l-2 font-black align-middle ${dm ? 'text-red-400 border-slate-600' : 'text-red-800 border-slate-300'}`}>
                {analytics.numMonths > 1 ? (
                  <div className="flex items-center justify-between gap-3 min-w-[120px]">
                    <span className={`w-11 flex-shrink-0 text-center text-[10px] font-bold uppercase tracking-wider ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Trend</span>
                    <span className="text-right">ยอดจ่ายสุทธิ</span>
                  </div>
                ) : (
                  <div className="text-right">ยอดจ่ายสุทธิ</div>
                )}
              </th>
              <th rowSpan={2} className={`px-3 py-2.5 font-bold font-black align-middle ${dm ? 'text-blue-400' : 'text-[#00509E]'}`}>เงินคงเหลือ</th>
              <th rowSpan={2} className={`px-3 py-2.5 font-bold font-black text-center align-middle ${dm ? 'text-emerald-400' : 'text-emerald-600'}`}>% ออม</th>
              <th rowSpan={2} className={`px-3 py-2.5 font-bold font-black text-center align-middle ${dm ? 'text-pink-400' : 'text-pink-600'}`}>% จ่าย</th>
            </tr>
            
            {/* 🚀 ROW 2: ชื่อคอลัมน์ย่อย */}
            <tr>
              {activeIncomeGroups.map((g, idx) => (
                /* เช็คว่าเป็นคอลัมน์สุดท้ายของรายรับไหม ถ้าใช่ให้เติมเส้นขั่น */
                <th 
                  key={g.id} 
                  onMouseEnter={(e) => handleCellHover(e, g)}
                  onMouseMove={handleCellMouseMove}
                  onMouseLeave={handleCellLeave}
                  className={`px-3 py-1.5 font-extrabold text-center cursor-help ${idx === activeIncomeGroups.length - 1 ? dividerCls : ''}`} 
                  style={{ color: g.color || (dm ? '#34d399' : '#059669'), backgroundColor: getHighlightBg(g) }}
                >
                  {g.name}
                </th>
              ))}
              
              {activeExpenseGroups.map(g => (
                <th 
                  key={g.id} 
                  onMouseEnter={(e) => handleCellHover(e, g)}
                  onMouseMove={handleCellMouseMove}
                  onMouseLeave={handleCellLeave}
                  className="px-3 py-1.5 font-bold text-center cursor-help" 
                  style={{ color: g.color || (dm ? '#cbd5e1' : '#334155'), backgroundColor: getHighlightBg(g) }}
                >
                  {g.name}
                </th>
              ))}
            </tr>

          </thead>
          <tbody className={`divide-y ${dm ? 'divide-slate-700/50' : 'divide-slate-200'}`}>
            {analytics.sortedCashflow.map((row, index, array) => {
              const prevMonth = array[index - 1];
              let expMoM = null;
              if (prevMonth && prevMonth.totalExp > 0) {
                const diff = row.totalExp - prevMonth.totalExp;
                const percent = (diff / prevMonth.totalExp) * 100;
                const isUp = percent > 0;
                const isFlat = Math.abs(percent) < 0.1;
                
                if (isFlat) {
                    expMoM = (
                        <span className={`inline-flex items-center justify-center min-w-[44px] text-[11px] font-bold px-1 py-[2px] rounded leading-none ${dm ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                          - 0.0%
                        </span>
                    );
                } else {
                    expMoM = (
                        <span className={`inline-flex items-center justify-center min-w-[44px] gap-[2px] text-[11px] font-bold px-1 py-[2px] rounded leading-none ${isUp ? (dm ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600') : (dm ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600')}`}>
                          {isUp ? '↑' : '↓'} {Math.abs(percent).toFixed(1)}%
                        </span>
                    );
                }
              }

              const savingsRateNum = row.income > 0 ? ((row.income - row.totalExp) / row.income * 100) : 0;
              const saveColor = savingsRateNum < 0 ? (dm ? 'text-red-400' : 'text-red-600') : (dm ? 'text-emerald-400' : 'text-emerald-600');

              const expenseRateNum = row.income > 0 ? (row.totalExp / row.income * 100) : 0;
              const expRateColor = expenseRateNum > 100 ? (dm ? 'text-red-400 font-extrabold' : 'text-red-600 font-extrabold') : (dm ? 'text-pink-400' : 'text-pink-600');

              return (
                <tr key={row.monthStr} className="group transition-colors border-b border-transparent hover:border-slate-500">
                  <td className={`px-3 py-2 font-bold text-center sticky left-0 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors align-middle ${dm ? 'text-blue-300 bg-slate-800 border-slate-700 group-hover:bg-slate-700' : 'text-[#00509E] bg-white border-slate-100 group-hover:bg-slate-50'}`}>{getThaiMonth(row.monthStr)}</td>
                  
                  {activeIncomeGroups.map((g, idx) => (
                     <td key={g.id} className={`px-3 py-2 font-semibold align-middle ${dm ? 'group-hover:bg-slate-800/80' : 'group-hover:bg-slate-50'} ${idx === activeIncomeGroups.length - 1 ? dividerCls : ''}`} style={{ color: g.color || (dm ? '#34d399' : '#059669'), backgroundColor: getHighlightBg(g) }}>
                       {row.groups[g.id] > 0 ? formatMoney(row.groups[g.id]) : '-'}
                     </td>
                  ))}
                  
                  {activeExpenseGroups.map(g => (
                     <td key={g.id} className={`px-3 py-2 font-medium align-middle ${dm ? 'group-hover:bg-slate-800/80' : 'group-hover:bg-slate-50'}`} style={{ color: g.color || (dm ? '#cbd5e1' : '#334155'), backgroundColor: getHighlightBg(g) }}>
                       {row.groups[g.id] > 0 ? formatMoney(row.groups[g.id]) : '-'}
                     </td>
                  ))}

                  <td className={`px-3 py-2 font-bold border-l-2 align-middle ${dm ? 'text-red-400 border-slate-700 group-hover:bg-slate-800' : 'text-red-700 border-slate-200 group-hover:bg-slate-50'}`}>
                    {analytics.numMonths > 1 ? (
                      <div className="flex items-center justify-between gap-3 min-w-[120px]">
                        <div className="w-11 flex-shrink-0 text-left">{expMoM}</div>
                        <span className="leading-none text-right whitespace-nowrap">{formatMoney(row.totalExp)}</span>
                      </div>
                    ) : (
                      <div className="text-right">{formatMoney(row.totalExp)}</div>
                    )}
                  </td>
                  <td className={`px-3 py-2 font-black align-middle ${dm ? 'text-blue-400 group-hover:bg-slate-800' : 'text-[#00509E] group-hover:bg-slate-50'}`}>{formatMoney(row.income - row.totalExp)}</td>
                  <td className={`px-3 py-2 font-black text-center align-middle ${saveColor} ${dm ? 'group-hover:bg-slate-800' : 'group-hover:bg-slate-50'}`}>{savingsRateNum.toFixed(1)}%</td>
                  <td className={`px-3 py-2 font-black text-center align-middle ${expRateColor} ${dm ? 'group-hover:bg-slate-800' : 'group-hover:bg-slate-50'}`}>{expenseRateNum > 0 ? expenseRateNum.toFixed(1) + '%' : '-'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className={`font-bold border-t-2 ${dm ? 'bg-slate-900 border-slate-600 text-slate-200' : 'bg-slate-800 border-slate-900 text-white'}`}>
            <tr>
              <td className={`px-3 py-2.5 text-center sticky left-0 z-10 bg-inherit border-r border-transparent ${dm ? 'text-blue-300' : 'text-blue-200'}`}>รวมทั้งหมด</td>
              
              {activeIncomeGroups.map((g, idx) => (
                <td key={g.id} className={`px-3 py-2.5 ${idx === activeIncomeGroups.length - 1 ? dividerCls : ''}`} style={{ color: g.color || (dm ? '#34d399' : '#059669'), backgroundColor: getHighlightBg(g) }}>
                  {formatMoney(analytics.sortedCashflow.reduce((s, r) => s + (r.groups[g.id] || 0), 0))}
                </td>
              ))}
              {activeExpenseGroups.map(g => (
                <td key={g.id} className="px-3 py-2.5" style={{ color: g.color || (dm ? '#cbd5e1' : '#334155'), backgroundColor: getHighlightBg(g) }}>
                  {formatMoney(analytics.sortedCashflow.reduce((s, r) => s + (r.groups[g.id] || 0), 0))}
                </td>
              ))}

              <td className={`px-3 py-2.5 border-l-2 ${dm ? 'text-red-400 border-slate-600' : 'text-red-400 border-slate-700'}`}>{formatMoney(analytics.totalExpense)}</td>
              <td className={`px-3 py-2.5 ${dm ? 'text-blue-400' : 'text-blue-300'}`}>{formatMoney(analytics.netCashflow)}</td>
              <td className={`px-3 py-2.5 text-center ${analytics.savingsRate < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {analytics.totalIncome > 0 ? `${analytics.savingsRate}%` : '0%'}
              </td>
              <td className={`px-3 py-2.5 text-center ${analytics.totalIncome > 0 && (analytics.totalExpense / analytics.totalIncome * 100) > 100 ? 'text-red-400' : (dm ? 'text-orange-400' : 'text-orange-500')}`}>
                {analytics.totalIncome > 0 ? `${(analytics.totalExpense / analytics.totalIncome * 100).toFixed(1)}%` : '0%'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    </>
  );
}

CashflowTable.propTypes = {
  analytics: PropTypes.object.isRequired,
  cashflowGroups: PropTypes.array.isRequired,
};