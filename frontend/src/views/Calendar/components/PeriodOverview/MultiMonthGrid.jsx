// src/views/Calendar/components/PeriodOverview/MultiMonthGrid.jsx
import React from 'react';
import { CalendarDays, ChevronRight } from 'lucide-react';

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
      <div className="bg-[#181818] border border-[#2d2d2d] p-12 text-center flex flex-col items-center justify-center space-y-3">
        <CalendarDays className="w-10 h-10 text-slate-600" />
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

  // Determine grid columns dynamically based on month count
  const count = displayMonths.length;
  let gridColsClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  if (count === 1) gridColsClass = 'grid-cols-1 max-w-md';
  else if (count === 2) gridColsClass = 'grid-cols-1 sm:grid-cols-2 max-w-3xl';
  else if (count === 3) gridColsClass = 'grid-cols-1 sm:grid-cols-3';

  return (
    <div className="flex flex-col space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-[#da291c]" />
          <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
            สรุปข้อมูลรายเดือน ({displayMonths.length} เดือน)
          </h3>
        </div>
        <span className="text-xs text-slate-500 hidden sm:inline font-mono">
          คลิกที่การ์ดเพื่อเปิดดูปฏิทินรายวัน
        </span>
      </div>

      {/* Grid of Compact Month Cards */}
      <div className={`grid ${gridColsClass} gap-2.5`}>
        {displayMonths.map((mObj) => {
          const isCurrent = mObj.monthStr === currentMonthStr;
          const expRatio = mObj.income > 0 ? Math.min(100, Math.round((mObj.expense / mObj.income) * 100)) : 100;

          return (
            <button
              key={mObj.monthStr}
              type="button"
              onClick={() => setFilterPeriod(mObj.monthStr)}
              className={`p-3.5 text-left bg-[#181818] border rounded-none flex flex-col justify-between transition-all relative group cursor-pointer hover:border-[#da291c] hover:bg-[#1d1d1d] ${
                isCurrent ? 'border-[#da291c]/80 shadow-[0_0_12px_rgba(218,41,28,0.12)]' : 'border-[#2d2d2d]'
              }`}
            >
              {/* Header: Month Name & Net Status Badge */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-100 group-hover:text-white transition-colors">
                      {mObj.monthLabel}
                    </span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.2 bg-[#da291c] text-white text-[9px] font-black uppercase tracking-wider">
                        เดือนนี้
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-mono font-black px-2 py-0.5 border ${
                      mObj.isSurplus
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                        : 'bg-rose-950/40 text-rose-400 border-rose-800/40'
                    }`}
                  >
                    {mObj.isSurplus ? '+' : ''}{formatVal(mObj.net)} ฿
                  </span>
                </div>

                {/* Subtotals (Inflow vs Outflow) */}
                <div className="mt-2.5 space-y-1 text-xs font-mono">
                  <div className="flex justify-between items-center text-emerald-400">
                    <span className="text-[10px] text-slate-500 font-sans">รับ:</span>
                    <span>+{formatVal(mObj.income)} ฿</span>
                  </div>
                  <div className="flex justify-between items-center text-rose-400">
                    <span className="text-[10px] text-slate-500 font-sans">จ่าย:</span>
                    <span>-{formatVal(mObj.expense)} ฿</span>
                  </div>
                </div>

                {/* Mini Expense Ratio Bar */}
                <div className="mt-2 h-1 w-full bg-[#121212] overflow-hidden">
                  <div
                    className={`h-full ${mObj.isSurplus ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ width: `${expRatio}%` }}
                  />
                </div>
              </div>

              {/* Footer: Tx Count & Drill-down Cue */}
              <div className="mt-3 pt-2 border-t border-[#252525] flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>{mObj.txCount} รายการ (ออม {mObj.savingsRate}%)</span>
                <span className="text-slate-400 group-hover:text-[#da291c] flex items-center gap-0.5 font-bold transition-colors">
                  <span>เปิดปฏิทิน</span>
                  <ChevronRight className="w-3 h-3 text-[#da291c]" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
