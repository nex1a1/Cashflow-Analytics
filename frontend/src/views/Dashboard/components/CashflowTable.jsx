// src/views/Dashboard/components/CashflowTable.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { FileSpreadsheet } from 'lucide-react';
import { formatMoney, getThaiMonth, hexToRgb } from '../../../utils/formatters';

export default function CashflowTable({ analytics, cashflowGroups = [], isDarkMode }) {
  const dm = isDarkMode;
  const card = `rounded-sm border shadow-sm transition-colors ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;

  if (!analytics || analytics.numMonths === 0 || !cashflowGroups || cashflowGroups.length === 0) return null;

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
    if (!group.highlightBg) return 'transparent';
    const hexColor = group.color || (group.type === 'income' ? '#10B981' : '#64748B');
    const rgb = hexToRgb(hexColor);
    return dm ? `rgba(${rgb}, 0.15)` : `rgba(${rgb}, 0.08)`;
  };

  return (
    <div className={`${card} overflow-hidden`}>
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

              <th rowSpan={2} className={`px-3 py-2.5 font-bold border-l-2 font-black align-middle ${dm ? 'text-red-400 border-slate-600' : 'text-red-800 border-slate-300'}`}>ยอดจ่ายสุทธิ</th>
              <th rowSpan={2} className={`px-3 py-2.5 font-bold font-black align-middle ${dm ? 'text-blue-400' : 'text-[#00509E]'}`}>เงินคงเหลือ</th>
              <th rowSpan={2} className={`px-3 py-2.5 font-bold font-black text-center align-middle ${dm ? 'text-emerald-400' : 'text-emerald-600'}`}>% ออม</th>
            </tr>
            
            {/* 🚀 ROW 2: ชื่อคอลัมน์ย่อย */}
            <tr>
              {activeIncomeGroups.map((g, idx) => (
                /* เช็คว่าเป็นคอลัมน์สุดท้ายของรายรับไหม ถ้าใช่ให้เติมเส้นขั่น */
                <th key={g.id} className={`px-3 py-1.5 font-extrabold text-center ${idx === activeIncomeGroups.length - 1 ? dividerCls : ''}`} style={{ color: g.color || (dm ? '#34d399' : '#059669'), backgroundColor: getHighlightBg(g) }}>
                  {g.name}
                </th>
              ))}
              
              {activeExpenseGroups.map(g => (
                <th key={g.id} className="px-3 py-1.5 font-bold text-center" style={{ color: g.color || (dm ? '#cbd5e1' : '#334155'), backgroundColor: getHighlightBg(g) }}>
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
                expMoM = <span className={`text-[10px] ml-1.5 ${percent > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{percent > 0 ? '↑' : '↓'} {Math.abs(percent).toFixed(1)}%</span>;
              }

              const savingsRateNum = row.income > 0 ? ((row.income - row.totalExp) / row.income * 100) : 0;
              const saveColor = savingsRateNum < 0 ? (dm ? 'text-red-400' : 'text-red-600') : (dm ? 'text-emerald-400' : 'text-emerald-600');

              return (
                <tr key={row.monthStr} className="group transition-colors border-b border-transparent hover:border-slate-500">
                  <td className={`px-3 py-2 font-bold text-center sticky left-0 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors ${dm ? 'text-blue-300 bg-slate-800 border-slate-700 group-hover:bg-slate-700' : 'text-[#00509E] bg-white border-slate-100 group-hover:bg-slate-50'}`}>{getThaiMonth(row.monthStr)}</td>
                  
                  {activeIncomeGroups.map((g, idx) => (
                     <td key={g.id} className={`px-3 py-2 font-semibold ${dm ? 'group-hover:bg-slate-800/80' : 'group-hover:bg-slate-50'} ${idx === activeIncomeGroups.length - 1 ? dividerCls : ''}`} style={{ color: g.color || (dm ? '#34d399' : '#059669'), backgroundColor: getHighlightBg(g) }}>
                       {row.groups[g.id] > 0 ? formatMoney(row.groups[g.id]) : '-'}
                     </td>
                  ))}
                  
                  {activeExpenseGroups.map(g => (
                     <td key={g.id} className={`px-3 py-2 font-medium ${dm ? 'group-hover:bg-slate-800/80' : 'group-hover:bg-slate-50'}`} style={{ color: g.color || (dm ? '#cbd5e1' : '#334155'), backgroundColor: getHighlightBg(g) }}>
                       {row.groups[g.id] > 0 ? formatMoney(row.groups[g.id]) : '-'}
                     </td>
                  ))}

                  <td className={`px-3 py-2 font-bold border-l-2 ${dm ? 'text-red-400 border-slate-700 group-hover:bg-slate-800' : 'text-red-700 border-slate-200 group-hover:bg-slate-50'}`}>
                    <div className="flex items-center justify-end">{formatMoney(row.totalExp)}{expMoM}</div>
                  </td>
                  <td className={`px-3 py-2 font-black ${dm ? 'text-blue-400 group-hover:bg-slate-800' : 'text-[#00509E] group-hover:bg-slate-50'}`}>{formatMoney(row.income - row.totalExp)}</td>
                  <td className={`px-3 py-2 font-black text-center ${saveColor} ${dm ? 'group-hover:bg-slate-800' : 'group-hover:bg-slate-50'}`}>{savingsRateNum.toFixed(1)}%</td>
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
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

CashflowTable.propTypes = {
  analytics: PropTypes.object.isRequired,
  cashflowGroups: PropTypes.array.isRequired,
  isDarkMode: PropTypes.bool.isRequired,
};