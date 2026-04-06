// src/views/Dashboard/components/CashflowTable.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { FileSpreadsheet } from 'lucide-react';
import { formatMoney, getThaiMonth } from '../../../utils/formatters';

export default function CashflowTable({ analytics, isDarkMode }) {
  const dm = isDarkMode;
  const card = `rounded-sm border shadow-sm transition-colors ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;

  if (!analytics || analytics.numMonths === 0) return null;

  return (
    <div className={`${card} overflow-hidden`}>
      <div className={`px-5 py-3 border-b flex items-center gap-2 ${dm ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <FileSpreadsheet className={`w-4 h-4 ${dm ? 'text-emerald-400' : 'text-emerald-600'}`} />
        <h3 className={`font-bold text-sm ${dm ? 'text-slate-200' : 'text-slate-800'}`}>ตารางสรุปกระแสเงินสด</h3>
      </div>
      <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
        <table className="w-full text-right text-sm whitespace-nowrap">
          <thead className={`border-b-2 ${dm ? 'border-slate-600 bg-slate-800/95' : 'border-slate-300 bg-slate-100/95'}`}>
            <tr>
              {[
                { label: 'ช่วงเวลา', cls: `text-center sticky left-0 z-10 ${dm ? 'text-slate-200 bg-slate-900' : 'text-slate-800 bg-slate-200'}` },
                { label: 'เงินเดือน', cls: dm ? 'text-emerald-400' : 'text-emerald-700' },
                { label: 'โบนัส', cls: dm ? 'text-emerald-400' : 'text-emerald-700' },
                { label: 'ค่าหอ', cls: dm ? 'text-slate-300' : 'text-slate-700' },
                { label: 'หนี้สิน', cls: dm ? 'text-purple-400' : 'text-purple-700' },
                { label: 'ค่ากิน', cls: dm ? 'text-slate-300' : 'text-slate-700' },
                { label: 'ผันแปร', cls: dm ? 'text-slate-300' : 'text-slate-700' },
                { label: 'ลงทุน', cls: dm ? 'text-slate-300' : 'text-slate-700' },
                { label: 'ไอที', cls: dm ? 'text-slate-300' : 'text-slate-700' },
                { label: 'ยอดจ่ายสุทธิ', cls: `border-l-2 font-black ${dm ? 'text-red-400 border-slate-600' : 'text-red-800 border-slate-300'}` },
                { label: 'เงินคงเหลือ', cls: `font-black ${dm ? 'text-blue-400' : 'text-[#00509E]'}` },
                { label: '% ออม', cls: `font-black text-center ${dm ? 'text-emerald-400' : 'text-emerald-600'}` },
              ].map(({ label, cls }) => (
                <th key={label} className={`px-4 py-2.5 font-bold ${cls}`}>{label}</th>
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
                expMoM = (
                  <span className={`text-[10px] ml-1.5 ${percent > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {percent > 0 ? '↑' : '↓'} {Math.abs(percent).toFixed(1)}%
                  </span>
                );
              }

              const savingsRateNum = row.income > 0 ? ((row.income - row.totalExp) / row.income * 100) : 0;
              const isNegSave = savingsRateNum < 0;
              const saveColor = isNegSave
                ? (dm ? 'text-red-400' : 'text-red-600')
                : (dm ? 'text-emerald-400' : 'text-emerald-600');

              return (
                <tr key={row.monthStr} className="group transition-colors">
                  <td className={`px-4 py-2 font-bold text-center sticky left-0 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors ${dm ? 'bg-slate-800 border-slate-700 text-slate-200 group-hover:bg-slate-700' : 'bg-white border-slate-100 text-slate-700 group-hover:bg-slate-50'}`}>{getThaiMonth(row.monthStr)}</td>
                  <td className={`px-4 py-2 font-medium ${dm ? 'text-emerald-400 group-hover:bg-slate-800' : 'text-emerald-700 group-hover:bg-slate-50'}`}>{row.salary > 0 ? formatMoney(row.salary) : '-'}</td>
                  <td className={`px-4 py-2 font-medium ${dm ? 'text-emerald-400 group-hover:bg-slate-800' : 'text-emerald-700 group-hover:bg-slate-50'}`}>{row.bonus > 0 ? formatMoney(row.bonus) : '-'}</td>
                  <td className={`px-4 py-2 font-medium ${dm ? 'text-slate-300 group-hover:bg-slate-800' : 'text-slate-700 group-hover:bg-slate-50'}`}>{row.rent > 0 ? formatMoney(row.rent) : '-'}</td>
                  <td className={`px-4 py-2 font-medium ${dm ? 'text-purple-400 group-hover:bg-slate-800' : 'text-purple-700 group-hover:bg-slate-50'}`}>{row.subs > 0 ? formatMoney(row.subs) : '-'}</td>
                  <td className={`px-4 py-2 font-medium ${dm ? 'text-slate-300 group-hover:bg-slate-800' : 'text-slate-700 group-hover:bg-slate-50'}`}>{row.food > 0 ? formatMoney(row.food) : '-'}</td>
                  <td className={`px-4 py-2 font-medium ${dm ? 'text-slate-300 group-hover:bg-slate-800' : 'text-slate-700 group-hover:bg-slate-50'}`}>{row.variable > 0 ? formatMoney(row.variable) : '-'}</td>
                  <td className={`px-4 py-2 font-medium ${dm ? 'text-slate-300 group-hover:bg-slate-800' : 'text-slate-700 group-hover:bg-slate-50'}`}>{row.invest > 0 ? formatMoney(row.invest) : '-'}</td>
                  <td className={`px-4 py-2 font-medium ${dm ? 'text-slate-300 group-hover:bg-slate-800' : 'text-slate-700 group-hover:bg-slate-50'}`}>{row.it > 0 ? formatMoney(row.it) : '-'}</td>
                  <td className={`px-4 py-2 font-bold border-l-2 ${dm ? 'text-red-400 border-slate-700 group-hover:bg-slate-800' : 'text-red-700 border-slate-200 group-hover:bg-slate-50'}`}>
                    <div className="flex items-center justify-end">
                      {formatMoney(row.totalExp)}
                      {expMoM}
                    </div>
                  </td>
                  <td className={`px-4 py-2 font-black ${dm ? 'text-blue-400 group-hover:bg-slate-800' : 'text-[#00509E] group-hover:bg-slate-50'}`}>{formatMoney(row.income - row.totalExp)}</td>
                  <td className={`px-4 py-2 font-black text-center ${saveColor} ${dm ? 'group-hover:bg-slate-800' : 'group-hover:bg-slate-50'}`}>
                    {savingsRateNum.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className={`font-bold border-t-2 ${dm ? 'bg-slate-900 border-slate-600 text-slate-200' : 'bg-slate-800 border-slate-900 text-white'}`}>
            <tr>
              <td className="px-4 py-2.5 text-center sticky left-0 z-10 bg-inherit border-r border-transparent">รวมทั้งหมด</td>
              <td className={`px-4 py-2.5 ${dm ? 'text-emerald-400' : 'text-emerald-300'}`}>{formatMoney(analytics.sortedCashflow.reduce((s, r) => s + r.salary, 0))}</td>
              <td className={`px-4 py-2.5 ${dm ? 'text-emerald-400' : 'text-emerald-300'}`}>{formatMoney(analytics.sortedCashflow.reduce((s, r) => s + r.bonus, 0))}</td>
              <td className="px-4 py-2.5">{formatMoney(analytics.sortedCashflow.reduce((s, r) => s + r.rent, 0))}</td>
              <td className={`px-4 py-2.5 ${dm ? 'text-purple-400' : 'text-purple-300'}`}>{formatMoney(analytics.sortedCashflow.reduce((s, r) => s + r.subs, 0))}</td>
              <td className="px-4 py-2.5">{formatMoney(analytics.sortedCashflow.reduce((s, r) => s + r.food, 0))}</td>
              <td className="px-4 py-2.5">{formatMoney(analytics.sortedCashflow.reduce((s, r) => s + r.variable, 0))}</td>
              <td className="px-4 py-2.5">{formatMoney(analytics.sortedCashflow.reduce((s, r) => s + r.invest, 0))}</td>
              <td className="px-4 py-2.5">{formatMoney(analytics.sortedCashflow.reduce((s, r) => s + r.it, 0))}</td>
              <td className={`px-4 py-2.5 border-l-2 ${dm ? 'text-red-400 border-slate-600' : 'text-red-300 border-slate-700'}`}>{formatMoney(analytics.totalExpense)}</td>
              <td className={`px-4 py-2.5 ${dm ? 'text-blue-400' : 'text-blue-300'}`}>{formatMoney(analytics.netCashflow)}</td>
              <td className={`px-4 py-2.5 text-center ${analytics.savingsRate < 0 ? (dm ? 'text-red-400' : 'text-red-400') : (dm ? 'text-emerald-400' : 'text-emerald-300')}`}>
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
  isDarkMode: PropTypes.bool.isRequired,
};