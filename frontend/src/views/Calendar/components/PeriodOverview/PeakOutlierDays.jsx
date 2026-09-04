// src/views/Calendar/components/PeriodOverview/PeakOutlierDays.jsx
import React from 'react';
import { Calendar, ExternalLink, Filter, ShieldCheck, Zap } from 'lucide-react';

const formatVal = (val) => (val || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function PeakOutlierDays({
  peakOutliers = [],
  rentTransactionsCount = 0,
  excludeRent = true,
  setExcludeRent,
  onSelectDate,
  setFilterPeriod
}) {
  if (!peakOutliers || peakOutliers.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#181818] border border-[#2d2d2d] p-4 flex flex-col space-y-3">
      {/* Header & Filter Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#da291c]" />
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
              วันที่มีการใช้จ่ายสูงสุดประจำรอบ (OUTLIER SPEND DAYS)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            ตรวจจับวันที่มีการใช้จ่ายผิดปกติหรือยอดเงินพุ่งสูงผิดหูผิดตา
          </p>
        </div>

        {/* Toggle Rent Filter */}
        {setExcludeRent && (
          <button
            type="button"
            onClick={() => setExcludeRent(prev => !prev)}
            className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border transition-colors shrink-0 self-start sm:self-auto cursor-pointer ${
              excludeRent
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50 hover:bg-emerald-900/40'
                : 'bg-[#1e1e1e] text-slate-400 border-[#333333] hover:text-slate-200'
            }`}
            title="คลิกเพื่อสลับการแสดง/ซ่อนค่าเช่าและค่าหอพัก"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{excludeRent ? 'ซ่อนค่าเช่า/ค่าหอพัก (เปิดอยู่)' : 'แสดงทั้งหมด (รวมค่าเช่า)'}</span>
          </button>
        )}
      </div>

      {/* Smart Disclaimer Note */}
      {excludeRent ? (
        <div className="text-[11px] font-sans px-2.5 py-1.5 bg-[#141414] border border-emerald-900/30 text-emerald-400/90 flex items-center justify-between gap-2">
          <span>
            💡 <strong>หมายเหตุ:</strong> ระบบได้กรองรายการค่าเช่า/ค่าหอพักรายเดือนออกแล้ว เพื่อตรวจจับวันที่มีการใช้จ่ายสูงจริงๆ (True Outliers)
          </span>
          <span className="text-[10px] font-mono text-slate-500 shrink-0">
            [กรองออก {rentTransactionsCount} รายการ]
          </span>
        </div>
      ) : (
        <div className="text-[11px] font-sans px-2.5 py-1.5 bg-[#141414] border border-amber-900/30 text-amber-400/90 flex items-center justify-between gap-2">
          <span>
            ⚠️ <strong>หมายเหตุ:</strong> กำลังแสดงทุกหมวดหมู่รวมค่าเช่ารายเดือน (วันจ่ายค่าเช่ามักขึ้นอันดับสูงสุดเป็นประจำทุกเดือน)
          </span>
        </div>
      )}

      {/* Outlier Rows */}
      <div className="space-y-1.5">
        {peakOutliers.map((item, idx) => {
          const monthStr = item.dateStr.substring(0, 7);

          return (
            <div
              key={item.dateStr}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-[#141414] hover:bg-[#1f1f1f] border border-[#252525] hover:border-[#da291c]/50 transition-none gap-2"
            >
              {/* Left: Rank, Date, Day-Type */}
              <button
                type="button"
                onClick={() => onSelectDate && onSelectDate(item.dateStr)}
                aria-label={`ดูรายการของวันที่ ${item.formattedDate}`}
                className="flex items-center gap-3 text-left cursor-pointer flex-1 min-w-0 bg-transparent border-0 p-0"
              >
                <span className={`w-6 h-6 flex items-center justify-center text-xs font-black font-mono ${
                  idx === 0 ? 'bg-[#da291c] text-white' : (idx === 1 ? 'bg-orange-600 text-white' : 'bg-[#262626] text-slate-400')
                }`}>
                  #{idx + 1}
                </span>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-100 font-mono">
                      {item.formattedDate}
                    </span>
                    <span className="text-xs text-slate-400 font-sans">
                      ({item.dayOfWeek})
                    </span>
                    <span
                      className="px-1.5 py-0.2 text-[9px] font-bold border rounded-none"
                      style={{
                        color: item.dayType.color,
                        borderColor: `${item.dayType.color}40`,
                        backgroundColor: `${item.dayType.color}15`
                      }}
                    >
                      {item.dayType.label}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>รายการหลัก: <strong className="text-slate-300 font-semibold">{item.topItemTitle}</strong></span>
                    <span className="text-slate-600">•</span>
                    <span className="font-mono text-[11px] text-slate-500">{item.transactions.length} รายการ</span>
                  </div>
                </div>
              </button>

              {/* Right: Amount & Action Buttons */}
              <div className="flex items-center justify-between sm:justify-end gap-2.5 self-end sm:self-auto w-full sm:w-auto border-t sm:border-t-0 border-[#202020] pt-2 sm:pt-0">
                <div className="text-right mr-1">
                  <div className="text-base font-black font-mono text-rose-400 tabular-nums">
                    -฿{formatVal(item.totalExpense)}
                  </div>
                </div>

                {setFilterPeriod && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterPeriod(monthStr);
                    }}
                    className="p-1.5 px-2 text-slate-400 hover:text-white bg-[#1a1a1a] hover:bg-[#252525] border border-[#333333] hover:border-slate-500 transition-none flex items-center gap-1 text-[10px] font-bold"
                    title="เปิดดูปฏิทินของเดือนนี้"
                  >
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span className="hidden md:inline">ดูทั้งเดือน</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectDate) onSelectDate(item.dateStr);
                  }}
                  className="p-1.5 px-2 text-slate-200 hover:text-white bg-[#1a1a1a] hover:bg-[#252525] border border-[#333333] hover:border-[#da291c] transition-none flex items-center gap-1 text-[10px] font-bold"
                  title="เปิดดูรายการและแก้ไขในวันนั้น"
                >
                  <ExternalLink className="w-3 h-3 text-[#da291c]" />
                  <span>ดูรายการ</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
