// src/views/Calendar/components/PeriodOverview/PeakOutlierDays.jsx
import React from 'react';
import { AlertCircle, ExternalLink, Zap } from 'lucide-react';

const formatVal = (val) => (val || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function PeakOutlierDays({
  peakOutliers,
  onSelectDate
}) {
  if (!peakOutliers || peakOutliers.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#181818] border border-[#2d2d2d] p-4 flex flex-col space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#da291c]" />
          <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
            วันที่มีการใช้จ่ายสูงสุดประจำรอบ (OUTLIER SPEND DAYS)
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-400">
          คลิกที่แถวเพื่อเปิดดูหรือแก้ไขรายการของวันนั้น
        </span>
      </div>

      {/* Outlier Rows */}
      <div className="space-y-1.5">
        {peakOutliers.map((item, idx) => (
          <div
            key={item.dateStr}
            onClick={() => onSelectDate && onSelectDate(item.dateStr)}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-[#141414] hover:bg-[#1f1f1f] border border-[#252525] hover:border-[#da291c]/50 transition-none cursor-pointer gap-2"
          >
            {/* Left: Rank, Date, Day-Type */}
            <div className="flex items-center gap-3">
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
            </div>

            {/* Right: Amount & Drill-down Button */}
            <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto w-full sm:w-auto border-t sm:border-t-0 border-[#202020] pt-2 sm:pt-0">
              <div className="text-right">
                <div className="text-base font-black font-mono text-rose-400 tabular-nums">
                  -฿{formatVal(item.totalExpense)}
                </div>
              </div>

              <button
                type="button"
                className="p-1.5 text-slate-400 hover:text-white bg-[#1a1a1a] hover:bg-[#252525] border border-[#333333] transition-none flex items-center gap-1 text-[11px] font-bold"
                title="เปิดดูรายละเอียดวันที่นี้"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#da291c]" />
                <span className="hidden md:inline">ดูรายการ</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
