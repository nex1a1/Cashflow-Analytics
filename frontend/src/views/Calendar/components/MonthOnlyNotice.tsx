import React from 'react';
import { CalendarClock, BarChart3 } from 'lucide-react';

export interface MonthOnlyNoticeProps {
  filterLabel: string;
  currentMonthLabel: string;
  goToCurrentMonth: () => void;
  onSwitchToAnalysisMode?: () => void;
}

// Calendar renders a single month at a time. When the shared period filter is set to
// something wider (a quarter, half-year, full year, or custom range), there is no single
// month to draw — this replaces the old period-rollup dashboard that duplicated Dashboard's
// own numbers via a separate calculation pipeline (see calendarPeriodHelpers.ts history).
export default function MonthOnlyNotice({
  filterLabel,
  currentMonthLabel,
  goToCurrentMonth,
  onSwitchToAnalysisMode
}: MonthOnlyNoticeProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center text-center border border-[#2d2d2d] bg-[#181818] min-h-[520px] px-6 py-20">
      <div className="p-3.5 border border-[#2d2d2d] bg-[#121212] shrink-0">
        <CalendarClock className="w-6 h-6 text-neutral-500" strokeWidth={1.75} />
      </div>

      <h2 className="mt-5 text-lg font-black text-slate-100 tracking-wide">
        ปฏิทินแสดงผลได้ทีละเดือน
      </h2>

      <p className="mt-2.5 max-w-[440px] text-sm text-slate-400 leading-relaxed">
        ช่วงเวลาที่เลือกอยู่ตอนนี้คือ{' '}
        <span className="font-bold text-slate-200">{filterLabel}</span>{' '}
        ซึ่งกว้างกว่าหนึ่งเดือน เลือกเดือนที่ต้องการ หรือสลับไปโหมดวิเคราะห์เพื่อดูภาพรวมทั้งช่วง
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-7">
        <button
          type="button"
          onClick={goToCurrentMonth}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider bg-[#da291c] hover:bg-[#b01e0a] text-white transition-none cursor-pointer"
        >
          <CalendarClock className="w-3.5 h-3.5" />
          <span>ไปเดือนปัจจุบัน ({currentMonthLabel})</span>
        </button>

        {onSwitchToAnalysisMode && (
          <button
            type="button"
            onClick={onSwitchToAnalysisMode}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider border border-[#333333] bg-[#121212] text-slate-300 hover:text-white hover:border-slate-500 transition-none cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>ดูภาพรวมช่วงนี้ในโหมดวิเคราะห์</span>
          </button>
        )}
      </div>
    </div>
  );
}
