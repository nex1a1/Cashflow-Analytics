import React from 'react';
import { CalendarClock, BarChart3 } from 'lucide-react';

export interface MonthOnlyNoticeProps {
  filterLabel: string;
  currentMonthLabel: string;
  goToCurrentMonth: () => void;
  onSwitchToAnalysisMode?: () => void;
}

// Calendar renders a single month (or pay cycle) at a time. When the shared period filter is set to
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
    <div className="flex flex-col items-center justify-center text-center border border-line bg-canvas rounded-none min-h-[520px] px-6 py-20">
      <div className="p-3.5 border border-line bg-surface rounded-none shrink-0">
        <CalendarClock className="w-8 h-8 text-ink-muted" strokeWidth={1.75} />
      </div>

      <h2 className="mt-5 text-lg font-black text-ink-display tracking-wide">
        ปฏิทินแสดงผลได้ทีละเดือน
      </h2>

      <p className="mt-2.5 max-w-[440px] text-sm text-ink-body leading-relaxed">
        ช่วงเวลาที่เลือกอยู่ตอนนี้คือ{' '}
        <span className="font-bold text-ink-soft">{filterLabel}</span>{' '}
        ซึ่งกว้างกว่าหนึ่งเดือน เลือกเดือนที่ต้องการจากตัวเลือกช่วงเวลาด้านบน หรือไปหน้าภาพรวมเพื่อดูทั้งช่วง
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-7">
        <button
          type="button"
          onClick={goToCurrentMonth}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-black bg-accent hover:bg-accent-active text-on-accent rounded-none transition-colors cursor-pointer"
        >
          <CalendarClock className="w-4 h-4" />
          <span>ไปเดือนปัจจุบัน ({currentMonthLabel})</span>
        </button>

        {onSwitchToAnalysisMode && (
          <button
            type="button"
            onClick={onSwitchToAnalysisMode}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-black border border-line bg-surface text-ink-soft hover:text-ink-display hover:border-line-strong rounded-none transition-colors cursor-pointer"
          >
            <BarChart3 className="w-4 h-4" />
            <span>ดูช่วงนี้ในหน้าภาพรวม</span>
          </button>
        )}
      </div>
    </div>
  );
}
