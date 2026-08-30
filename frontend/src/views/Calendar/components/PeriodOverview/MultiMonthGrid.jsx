// src/views/Calendar/components/PeriodOverview/MultiMonthGrid.jsx
import React from 'react';
import { CalendarDays, ChevronRight, TableProperties } from 'lucide-react';

const formatVal = (val) => (val || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function MultiMonthGrid({
  displayMonths,
  currentMonthStr,
  setFilterPeriod,
  goToCurrentMonth,
  filterPeriodLabel
}) {
  if (!displayMonths || displayMonths.length === 0) {
    return (
      <div className="bg-[#181818] border border-[#2d2d2d] p-8 text-center flex flex-col items-center justify-center space-y-3">
        <CalendarDays className="w-8 h-8 text-slate-600" />
        <p className="text-sm font-bold text-slate-300">ไม่พบบันทึกข้อมูลในช่วงเวลา {filterPeriodLabel}</p>
        <button
          onClick={goToCurrentMonth}
          className="px-4 py-2 rounded-none text-xs font-bold bg-[#da291c] hover:bg-[#b01e0a] text-white transition-colors"
        >
          ไปเดือนปัจจุบัน
        </button>
      </div>
    );
  }

  // Calculate Period Grand Totals for summary column
  const totalIncome = displayMonths.reduce((sum, m) => sum + m.income, 0);
  const totalExpense = displayMonths.reduce((sum, m) => sum + m.expense, 0);
  const totalNet = totalIncome - totalExpense;
  const avgSavingsRate = totalIncome > 0 ? Math.max(0, Math.round((totalNet / totalIncome) * 100)) : 0;

  return (
    <div className="bg-[#181818] border border-[#2d2d2d] p-3 flex flex-col space-y-2.5">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TableProperties className="w-3.5 h-3.5 text-[#da291c]" />
          <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider">
            ตารางเปรียบเทียบกระแสเงินสดรายเดือน (CONDENSED FINANCIAL MATRIX)
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">
            {displayMonths.length} เดือน
          </span>
        </div>
        <span className="text-[10px] text-slate-500 hidden sm:inline font-mono">
          คลิกที่หัวคอลัมน์เพื่อเปิดดูปฏิทินรายวันของเดือนนั้น
        </span>
      </div>

      {/* Condensed Matrix Table */}
      <div className="overflow-x-auto border border-[#2d2d2d] bg-[#141414] select-none">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-[#2d2d2d] bg-[#121212]">
              {/* Sticky Metric Header */}
              <th className="p-2.5 px-3 font-sans font-black text-[11px] text-slate-400 uppercase tracking-wider sticky left-0 bg-[#121212] z-10 border-r border-[#2d2d2d] min-w-[140px]">
                ตัวชี้วัด / เดือน
              </th>

              {/* Month Columns */}
              {displayMonths.map((mObj) => {
                const isCurrent = mObj.monthStr === currentMonthStr;

                return (
                  <th
                    key={mObj.monthStr}
                    onClick={() => setFilterPeriod(mObj.monthStr)}
                    className={`p-2.5 px-3 text-center border-r border-[#252525] transition-colors cursor-pointer group min-w-[95px] hover:bg-[#202020] ${
                      isCurrent ? 'bg-[#221515] border-t-2 border-t-[#da291c]' : ''
                    }`}
                    title={`คลิกเพื่อเปิดดูปฏิทินรายวันของ ${mObj.monthLabel}`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className={`text-[11px] font-black group-hover:text-white ${isCurrent ? 'text-[#da291c]' : 'text-slate-200'}`}>
                        {mObj.shortLabel}
                      </span>
                      {isCurrent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#da291c] shrink-0" />
                      )}
                      <ChevronRight className="w-3 h-3 text-[#da291c] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </th>
                );
              })}

              {/* Summary Total Column */}
              <th className="p-2.5 px-3 text-right bg-[#171717] font-black text-slate-300 min-w-[110px]">
                รวมช่วงเวลา
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#222222]">
            {/* Row 1: Income */}
            <tr className="hover:bg-[#181818]">
              <td className="p-2 px-3 font-sans font-bold text-emerald-400/90 text-[11px] sticky left-0 bg-[#141414] border-r border-[#2d2d2d] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>รายรับ (INCOME)</span>
              </td>
              {displayMonths.map((mObj) => (
                <td
                  key={mObj.monthStr}
                  onClick={() => setFilterPeriod(mObj.monthStr)}
                  className="p-2 px-3 text-center text-emerald-400 tabular-nums border-r border-[#222222] cursor-pointer hover:bg-[#1f1f1f]"
                >
                  +{formatVal(mObj.income)}
                </td>
              ))}
              <td className="p-2 px-3 text-right text-emerald-400 font-bold tabular-nums bg-[#161616]">
                +{formatVal(totalIncome)}
              </td>
            </tr>

            {/* Row 2: Expense */}
            <tr className="hover:bg-[#181818]">
              <td className="p-2 px-3 font-sans font-bold text-rose-400/90 text-[11px] sticky left-0 bg-[#141414] border-r border-[#2d2d2d] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>รายจ่าย (EXPENSE)</span>
              </td>
              {displayMonths.map((mObj) => (
                <td
                  key={mObj.monthStr}
                  onClick={() => setFilterPeriod(mObj.monthStr)}
                  className="p-2 px-3 text-center text-rose-400 tabular-nums border-r border-[#222222] cursor-pointer hover:bg-[#1f1f1f]"
                >
                  -{formatVal(mObj.expense)}
                </td>
              ))}
              <td className="p-2 px-3 text-right text-rose-400 font-bold tabular-nums bg-[#161616]">
                -{formatVal(totalExpense)}
              </td>
            </tr>

            {/* Row 3: Net Cashflow */}
            <tr className="hover:bg-[#181818] bg-[#161616]">
              <td className="p-2 px-3 font-sans font-black text-slate-200 text-[11px] sticky left-0 bg-[#161616] border-r border-[#2d2d2d] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                <span>คงเหลือสุทธิ (NET)</span>
              </td>
              {displayMonths.map((mObj) => (
                <td
                  key={mObj.monthStr}
                  onClick={() => setFilterPeriod(mObj.monthStr)}
                  className={`p-2 px-3 text-center font-black tabular-nums border-r border-[#222222] cursor-pointer hover:bg-[#202020] ${
                    mObj.isSurplus ? 'text-yellow-400' : 'text-rose-400'
                  }`}
                >
                  {mObj.isSurplus ? '+' : ''}{formatVal(mObj.net)}
                </td>
              ))}
              <td className={`p-2 px-3 text-right font-black tabular-nums bg-[#181818] ${
                totalNet >= 0 ? 'text-yellow-400' : 'text-rose-400'
              }`}>
                {totalNet >= 0 ? '+' : ''}{formatVal(totalNet)}
              </td>
            </tr>

            {/* Row 4: Savings Rate */}
            <tr className="hover:bg-[#181818]">
              <td className="p-2 px-3 font-sans font-bold text-slate-400 text-[11px] sticky left-0 bg-[#141414] border-r border-[#2d2d2d] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                <span>อัตราการออม (SAVINGS)</span>
              </td>
              {displayMonths.map((mObj) => (
                <td
                  key={mObj.monthStr}
                  onClick={() => setFilterPeriod(mObj.monthStr)}
                  className="p-2 px-3 text-center text-slate-300 tabular-nums border-r border-[#222222] cursor-pointer hover:bg-[#1f1f1f]"
                >
                  {mObj.savingsRate}%
                </td>
              ))}
              <td className="p-2 px-3 text-right text-emerald-400 font-bold tabular-nums bg-[#161616]">
                {avgSavingsRate}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
