import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  CalendarClock, CalendarDays, Flame, Info, TableProperties 
} from 'lucide-react';
import { useDashboardContext } from '../context/DashboardContext';
import { DayType } from '@/types';
import { THAI_MONTHS_SHORT, formatMoney } from '@/utils/formatters';

// ─── TYPES & INTERFACES ──────────────────────────────────────────
export type TimelineViewMode = 'dayType' | 'heatmap';
export type TimelineLayoutMode = 'github' | 'calendar';

export interface TimelineTooltipState {
  active: boolean;
  x: number;
  y: number;
  dateDisplay: string;
  dayType: DayType | null;
  amount: number;
}

export interface DayDetails {
  displayStr: string;
  dayType: DayType;
  amount: number;
  dayOfWeek: number;
}

// ─── CONSTANTS & PALETTE (Ferrari Editorial) ───────────────────
const THAI_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'] as const;
const THAI_DAYS_MINI = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] as const;

// Ferrari Editorial Thermal Scale: near-black -> deep zinc -> bronze -> racing orange -> Rosso Corsa
export const FERRARI_HEATMAP_SHADES = [
  '#27272a', // Level 1: Zinc 800 (Minimal spend)
  '#3f3f46', // Level 2: Zinc 700 (Low spend)
  '#78350f', // Level 3: Deep Warm Amber
  '#b45309', // Level 4: Racing Amber
  '#c2410c', // Level 5: Racing Orange
  '#da291c', // Level 6: Rosso Corsa Championship Red (Peak)
] as const;

// Helper: คำนวณวันที่วันนี้ตาม Local Timezone (ป้องกัน UTC Off-by-One Bug)
export const getLocalTodayString = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getExpenseLevel = (amount: number, maxThreshold: number): number => {
  if (!amount || amount <= 0) return 0;
  const ratio = amount / maxThreshold;
  if (ratio <= 1 / 6) return 1;
  if (ratio <= 2 / 6) return 2;
  if (ratio <= 3 / 6) return 3;
  if (ratio <= 4 / 6) return 4;
  if (ratio <= 5 / 6) return 5;
  return 6;
};

export const getHeatmapColor = (level: number): string => {
  if (level === 0) return '#181818';
  return FERRARI_HEATMAP_SHADES[level - 1] || FERRARI_HEATMAP_SHADES[0];
};

// ─── SUB-COMPONENT: TimelineModeToggle ─────────────────────────
interface TimelineModeToggleProps {
  viewMode: TimelineViewMode;
  setViewMode: (mode: TimelineViewMode) => void;
}

const TimelineModeToggle: React.FC<TimelineModeToggleProps> = ({ viewMode, setViewMode }) => {
  const modeButtons: Array<{ id: TimelineViewMode; label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = [
    { id: 'dayType', label: 'ประเภทวัน', icon: CalendarDays, color: 'text-[#ff4d4d]' },
    { id: 'heatmap', label: 'ระดับการจ่าย', icon: Flame, color: 'text-orange-400' }
  ];

  return (
    <div className="relative flex p-1 rounded-none border shadow-sm bg-[#121212] border-[#3e3e3e]">
      {modeButtons.map((btn) => {
        const Icon = btn.icon;
        const isActive = viewMode === btn.id;
        return (
          <button
            key={btn.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => setViewMode(btn.id)}
            className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-none transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#da291c] ${
              isActive ? btn.color : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> 
            <span>{btn.label}</span>
            {isActive && (
              <div className="absolute inset-0 rounded-none shadow-sm z-[-1] bg-[#303030]/60" />
            )}
          </button>
        );
      })}
    </div>
  );
};

// ─── SUB-COMPONENT: TimelineDayTypeLegend ──────────────────────
interface TimelineDayTypeLegendProps {
  dayTypeConfig: DayType[];
  dayTypeCounts: Record<string, number>;
}

const TimelineDayTypeLegend: React.FC<TimelineDayTypeLegendProps> = ({ dayTypeConfig, dayTypeCounts }) => {
  const totalDays = useMemo(
    () => Object.values(dayTypeCounts || {}).reduce((acc, count) => acc + (Number(count) || 0), 0),
    [dayTypeCounts]
  );
  
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {dayTypeConfig
        .filter((dt) => (dayTypeCounts?.[dt.id] || 0) > 0)
        .map((dt) => {
          const count = dayTypeCounts[dt.id] || 0;
          const percentage = totalDays > 0 ? ((count / totalDays) * 100).toFixed(1) : '0.0';
          return (
            <div key={dt.id} className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-none shrink-0 shadow-sm border border-black/20" 
                style={{ backgroundColor: dt.color || '#475569' }} 
              />
              <span className="text-xs font-bold text-slate-400">
                {dt.label} 
                <span className="opacity-70 text-[10px] ml-1 tabular-nums">
                  ({count} วัน / {percentage}%)
                </span>
              </span>
            </div>
          );
        })}
    </div>
  );
};

// ─── SUB-COMPONENT: TimelineHeatmapLegend ──────────────────────
interface TimelineHeatmapLegendProps {
  globalMaxThreshold: number;
}

const TimelineHeatmapLegend: React.FC<TimelineHeatmapLegendProps> = ({ globalMaxThreshold }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="relative group/info cursor-help mr-1">
        <Info className="w-3.5 h-3.5 text-slate-400" />
        <div className="absolute bottom-full right-0 md:left-0 md:right-auto mb-2 opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity z-50 flex flex-col items-center md:items-start invisible group-hover/info:visible">
          <div className="text-left rounded-none py-2 px-3 text-[10px] font-medium shadow-2xl w-[260px] leading-relaxed bg-[#121212] text-white border border-[#3e3e3e]">
            <p className="font-bold mb-1 text-orange-400">ระดับสีคำนวณแบบมาตรฐาน (Global Max)</p>
            <p className="text-slate-300">
              ระดับสีอ้างอิงจากเพดานการจ่ายเงินสูงสุดของคุณ ({formatMoney(globalMaxThreshold)} ฿) 
              เพื่อให้สเกลความร้อนคงที่เมื่อเปรียบเทียบข้ามช่วงเวลา
            </p>
          </div>
          <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#121212] md:ml-2 mr-2 md:mr-0" />
        </div>
      </div>
      <span className="text-[10px] font-bold text-slate-400">น้อย</span>
      {[0, 1, 2, 3, 4, 5, 6].map((level) => (
        <div 
          key={level} 
          className="w-3 h-3 rounded-none shrink-0 border" 
          style={{ 
            backgroundColor: getHeatmapColor(level), 
            borderColor: level === 0 ? '#3e3e3e' : 'transparent' 
          }} 
        />
      ))}
      <span className="text-[10px] font-bold text-slate-400">มาก</span>
    </div>
  );
};

// ─── SUB-COMPONENT: TimelineTooltip ────────────────────────────
interface TimelineTooltipProps extends TimelineTooltipState {
  viewMode: TimelineViewMode;
}

const TimelineTooltip: React.FC<TimelineTooltipProps> = ({
  active,
  x,
  y,
  dateDisplay,
  amount,
  dayType,
  viewMode
}) => {
  if (!active) return null;
  return createPortal(
    <div
      className="fixed pointer-events-none z-[99999]"
      style={{ left: x, top: Math.max(10, y - 6), transform: 'translate(-50%, -100%)' }}
    >
      <div className="flex flex-col items-center">
        <div className="flex flex-col items-center text-center rounded-none py-2 px-3 text-[11px] font-bold shadow-2xl border min-w-[120px] bg-[#121212]/95 backdrop-blur-md border-[#3e3e3e] text-white">
          <div className="text-slate-400 font-medium text-[9px] mb-1 uppercase tracking-wider">{dateDisplay}</div>
          {viewMode === 'dayType' ? (
            <div className="flex items-center justify-center gap-1.5" style={{ color: dayType?.color || '#cbd5e1' }}>
              <div className="w-2 h-2 rounded-none shrink-0" style={{ backgroundColor: dayType?.color || '#cbd5e1' }} />
              <span>{dayType?.label || 'ไม่มีข้อมูล'}</span>
            </div>
          ) : (
            <div className={`flex flex-col items-center ${amount > 0 ? 'text-orange-400' : 'text-slate-400'}`}>
              <div className="text-[13px] leading-none tabular-nums font-mono">
                {amount > 0 ? `${formatMoney(amount)} ฿` : 'ไม่มีรายจ่าย'}
              </div>
            </div>
          )}
        </div>
        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#3e3e3e]" />
      </div>
    </div>,
    document.body
  );
};

// ─── SUB-COMPONENT: TimelineDayCell (High performance memoized) ─
interface TimelineDayCellProps {
  dateStr: string;
  isToday: boolean;
  viewMode: TimelineViewMode;
  dayType?: DayType;
  amount: number;
  globalMaxThreshold: number;
  onHover: (e: React.MouseEvent | React.FocusEvent, dateStr: string) => void;
  onLeave: () => void;
  className?: string;
}

const TimelineDayCell = React.memo<TimelineDayCellProps>(({
  dateStr,
  isToday,
  viewMode,
  dayType,
  amount,
  globalMaxThreshold,
  onHover,
  onLeave,
  className = "w-4 h-4"
}) => {
  const level = getExpenseLevel(amount, globalMaxThreshold);
  const backgroundColor = viewMode === 'heatmap' 
    ? getHeatmapColor(level) 
    : (dayType?.color || '#333333');

  const [y, m, d] = dateStr.split('-');
  const dateObj = new Date(Number(y), +m - 1, Number(d));
  const dayOfWeek = dateObj.getDay();
  const displayStr = `${THAI_DAYS[dayOfWeek]} ${+d} ${THAI_MONTHS_SHORT[+m - 1]} ${y.slice(2)}`;

  let detailsText = 'ยอดรายจ่าย: ไม่มีรายจ่าย';
  if (viewMode === 'dayType') {
    detailsText = `ประเภทวัน: ${dayType?.label || 'ไม่มีข้อมูล'}`;
  } else if (amount > 0) {
    detailsText = `ยอดรายจ่าย: ${formatMoney(amount)} บาท`;
  }

  const handleMouseEnter = useCallback((e: React.MouseEvent) => onHover(e, dateStr), [onHover, dateStr]);
  const handleMouseLeave = useCallback(() => onLeave(), [onLeave]);
  const handleFocus = useCallback((e: React.FocusEvent) => onHover(e, dateStr), [onHover, dateStr]);

  return (
    <button
      type="button"
      tabIndex={0}
      aria-label={`${displayStr}, ${detailsText}`}
      className={`${className} rounded-none cursor-pointer border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#da291c] focus-visible:z-10 ${
        isToday 
          ? 'ring-1 ring-[#da291c] z-10' 
          : 'opacity-90 hover:opacity-100 hover:border-[#da291c] hover:z-10'
      }`}
      style={{
        backgroundColor,
        borderColor: (viewMode === 'heatmap' && level === 0) ? '#2d2d2d' : 'transparent'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleMouseLeave}
    />
  );
});

TimelineDayCell.displayName = 'TimelineDayCell';

// ─── SUB-COMPONENT: TimelineLayoutToggle ───────────────────────
interface TimelineLayoutToggleProps {
  layoutMode: TimelineLayoutMode;
  setLayoutMode: (mode: TimelineLayoutMode) => void;
}

const TimelineLayoutToggle: React.FC<TimelineLayoutToggleProps> = ({ layoutMode, setLayoutMode }) => {
  const layoutButtons: Array<{ id: TimelineLayoutMode; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'github', label: 'GitHub แนวนอน', icon: TableProperties },
    { id: 'calendar', label: 'ปฏิทินทั่วไป', icon: CalendarDays }
  ];

  return (
    <div className="relative flex p-1 rounded-none border shadow-sm bg-[#121212] border-[#3e3e3e]">
      {layoutButtons.map((btn) => {
        const Icon = btn.icon;
        const isActive = layoutMode === btn.id;
        return (
          <button
            key={btn.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => setLayoutMode(btn.id)}
            className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-none transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#da291c] ${
              isActive ? 'text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> 
            <span>{btn.label}</span>
            {isActive && (
              <div className="absolute inset-0 rounded-none shadow-sm z-[-1] bg-[#303030]/60" />
            )}
          </button>
        );
      })}
    </div>
  );
};

// ─── MAIN COMPONENT: ActivityTimeline ──────────────────────────
export default function ActivityTimeline() {
  const { analytics, dayTypeConfig, dayTypes, showSkeleton } = useDashboardContext();

  const [viewMode, setViewMode] = useState<TimelineViewMode>('dayType');
  const [layoutMode, setLayoutMode] = useState<TimelineLayoutMode>('github');

  const [tooltip, setTooltip] = useState<TimelineTooltipState>({
    active: false,
    x: 0,
    y: 0,
    dateDisplay: '',
    dayType: null,
    amount: 0
  });

  const datesInPeriod = useMemo(() => analytics.datesInPeriod || [], [analytics.datesInPeriod]);
  const dailyExpenses = useMemo(() => (analytics.dailyAllMap || {}) as Record<string, number>, [analytics.dailyAllMap]);
  const globalMaxThreshold = (analytics.globalMaxThreshold as number) || 100;
  const datesInPeriodSet = useMemo(() => new Set(datesInPeriod), [datesInPeriod]);

  // Local Timezone Today String (ป้องกันปัญหา UTC Shift)
  const todayStr = useMemo(() => getLocalTodayString(), []);

  // O(1) Map สำหรับ DayTypeConfig เพื่อลด Linear Search
  const dayTypeMap = useMemo(() => {
    const map = new Map<string, DayType>();
    (dayTypeConfig || []).forEach(dt => map.set(dt.id, dt));
    return map;
  }, [dayTypeConfig]);

  const defaultWorkday = useMemo(
    () => dayTypeConfig?.find(t => t.name === 'workday') || dayTypeConfig?.[0],
    [dayTypeConfig]
  );
  const defaultHoliday = useMemo(
    () => dayTypeConfig?.find(t => t.name === 'holiday') || dayTypeConfig?.[1] || dayTypeConfig?.[0],
    [dayTypeConfig]
  );

  const weeks = useMemo(() => {
    if (datesInPeriod.length === 0) return [];
    const result: Array<{ days: (string | null)[]; monthLabel: string | null }> = [];
    let currentWeek: (string | null)[] = new Array(7).fill(null);
    let monthLabel: string | null = null;

    datesInPeriod.forEach((dateStr, index) => {
      const [y, m, d] = dateStr.split('-');
      const dateObj = new Date(Number(y), +m - 1, Number(d));
      const dayOfWeek = dateObj.getDay();

      if (d === '01' || index === 0) {
        monthLabel = `${THAI_MONTHS_SHORT[+m - 1]} ${y.slice(2)}`;
      }
      currentWeek[dayOfWeek] = dateStr;

      if (dayOfWeek === 6 || index === datesInPeriod.length - 1) {
        result.push({ days: [...currentWeek], monthLabel });
        currentWeek = new Array(7).fill(null);
        monthLabel = null;
      }
    });
    return result;
  }, [datesInPeriod]);

  const calendarMonths = useMemo(() => {
    if (datesInPeriod.length === 0) return [];
    
    const groups: Record<string, string[]> = {};
    datesInPeriod.forEach(dateStr => {
      const parts = dateStr.split('-');
      if (parts.length < 2) return;
      const key = `${parts[0]}-${parts[1]}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(dateStr);
    });

    const monthKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b));

    return monthKeys.map(key => {
      const [yearStr, monthStr] = key.split('-');
      const year = Number.parseInt(yearStr, 10);
      const monthIdx = Number.parseInt(monthStr, 10) - 1;
      
      const firstDateObj = new Date(year, monthIdx, 1);
      const startDayOfWeek = firstDateObj.getDay();
      const totalDays = new Date(year, monthIdx + 1, 0).getDate();

      const gridCells: (string | null)[] = [];
      for (let i = 0; i < startDayOfWeek; i++) {
        gridCells.push(null);
      }
      for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
        const dateStr = `${yearStr}-${monthStr}-${dayNum.toString().padStart(2, '0')}`;
        gridCells.push(dateStr);
      }

      return {
        key,
        year,
        monthIdx,
        gridCells
      };
    });
  }, [datesInPeriod]);

  const getDayDetails = useCallback((dateStr: string): DayDetails => {
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(Number(y), +m - 1, Number(d));
    const dayOfWeek = dateObj.getDay();
    const displayStr = `${THAI_DAYS[dayOfWeek]} ${+d} ${THAI_MONTHS_SHORT[+m - 1]} ${y.slice(2)}`;

    const defaultDayType = (dayOfWeek === 0 || dayOfWeek === 6) ? defaultHoliday : defaultWorkday;
    const configuredDayTypeId = dayTypes[dateStr]?.id || dayTypes[dateStr];
    const dayType = (configuredDayTypeId ? dayTypeMap.get(configuredDayTypeId) : undefined) || defaultDayType || {
      id: 'unknown',
      name: 'unknown',
      label: 'ทั่วไป',
      color: '#475569',
      order_index: 0
    };
    const amount = dailyExpenses[dateStr] || 0;
    return { displayStr, dayType, amount, dayOfWeek };
  }, [dayTypeMap, dayTypes, dailyExpenses, defaultHoliday, defaultWorkday]);

  const handleMouseEnter = useCallback((e: React.MouseEvent | React.FocusEvent, dateStr: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { displayStr, dayType, amount } = getDayDetails(dateStr);
    const targetX = rect.left + rect.width / 2;
    // Clamping to avoid viewport overflow
    const clampedX = Math.max(70, Math.min(window.innerWidth - 70, targetX));
    setTooltip({ 
      active: true, 
      x: clampedX, 
      y: rect.top, 
      dateDisplay: displayStr, 
      dayType, 
      amount 
    });
  }, [getDayDetails]);

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, active: false }));
  }, []);

  if (!showSkeleton && (!analytics.dayTypeCounts || Object.keys(analytics.dayTypeCounts).length === 0)) {
    return null;
  }

  const renderTimelineContent = () => {
    if (showSkeleton) {
      return (
        <div className="py-12 px-3">
          <div className="h-24 w-full rounded-none animate-pulse bg-[#303030]" />
        </div>
      );
    }

    if (datesInPeriod.length === 0) {
      return (
        <div className="text-center text-slate-400 py-10 text-sm italic">
          ไม่มีข้อมูลการทำกิจกรรมในวันที่เลือก
        </div>
      );
    }

    if (layoutMode === 'calendar') {
      return (
        <div className="p-3.5 w-full flex items-center justify-center overflow-x-auto custom-scrollbar">
          <div className="flex flex-wrap items-start justify-center gap-2.5 max-w-[1022px] mx-auto">
            {calendarMonths.map(month => (
              <div key={month.key} className="border border-[#2d2d2d] bg-[#181818] px-2 pt-2 pb-2.5 flex flex-col items-center w-[162px] shrink-0 select-none shadow-sm">
                {/* Month Title */}
                <div className="text-[11.5px] font-black text-slate-200 tracking-wider uppercase mb-1.5 border-b border-[#2d2d2d] pb-1 w-full text-center flex items-center justify-center gap-1.5">
                  <div className="w-[3.5px] h-[3.5px] bg-[#da291c] rounded-none shrink-0" />
                  <span>{THAI_MONTHS_SHORT[month.monthIdx]} {month.year.toString().slice(-2)}</span>
                </div>

                {/* Week Day Header (Consistent Thai abbreviations) */}
                <div className="grid grid-cols-7 gap-[1px] mb-1 w-[146px]">
                  {THAI_DAYS_MINI.map((day, i) => (
                    <div key={day} className={`w-[20px] text-center text-[8.5px] font-black leading-tight ${i === 0 || i === 6 ? 'text-red-400/80' : 'text-slate-400'}`}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-[1px] bg-[#2d2d2d]/30 w-[146px]">
                  {month.gridCells.map((dateStr, idx) => {
                    if (!dateStr) {
                      return <div key={`empty-${month.key}-${idx}`} className="w-[20px] h-[20px] bg-transparent" />;
                    }

                    const inPeriod = datesInPeriodSet.has(dateStr);
                    if (!inPeriod) {
                      return <div key={dateStr} className="w-[20px] h-[20px] bg-[#121212]/40 border border-[#2d2d2d]/10 opacity-20" />;
                    }

                    const isToday = dateStr === todayStr;
                    const { dayType, amount } = getDayDetails(dateStr);

                    return (
                      <div key={dateStr} className="w-[20px] h-[20px] flex items-center justify-center">
                        <TimelineDayCell
                          dateStr={dateStr}
                          isToday={isToday}
                          viewMode={viewMode}
                          dayType={dayType}
                          amount={amount}
                          globalMaxThreshold={globalMaxThreshold}
                          onHover={handleMouseEnter}
                          onLeave={handleMouseLeave}
                          className="w-full h-full"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto pb-4 pt-6 px-3 flex justify-center custom-scrollbar" style={{ scrollbarWidth: 'thin' }}>
        <div className="flex w-max gap-x-[1px] mx-auto">
          {/* Day Labels (Sticky) */}
          <div 
            className="flex flex-col gap-[1px] shrink-0 sticky left-0 z-20 pr-1 border-r border-[#303030] bg-[#121212]"
          >
            <div className="h-4" />
            {THAI_DAYS.map((day, i) => (
              <div 
                key={day} 
                className={`h-4 flex items-center justify-end text-[9px] font-black ${
                  i === 0 || i === 6 ? 'text-red-400/80' : 'text-slate-500'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Weeks & Days */}
          {weeks.map((week, weekIndex) => {
            const weekKey = week.days.find(Boolean) || `wk-${weekIndex}`;
            return (
              <div key={weekKey} className="flex flex-col gap-[1px] shrink-0">
                {/* Month Label */}
                <div className="h-4 relative flex items-end pb-1">
                  {week.monthLabel && (
                    <div className="absolute left-0 bottom-0.5 flex items-end whitespace-nowrap">
                      <div className="w-[3px] h-3 mr-1 rounded-none bg-[#da291c]/50" />
                      <span className="text-[9px] font-black leading-none uppercase tracking-tighter text-slate-400">
                        {week.monthLabel}
                      </span>
                    </div>
                  )}
                </div>

                {/* Days in Week */}
                {week.days.map((dateStr, dayIndex) => {
                  if (!dateStr) {
                    return <div key={`empty-${weekKey}-${dayIndex}`} className="w-4 h-4 bg-transparent" />;
                  }
                  
                  const isToday = dateStr === todayStr;
                  const { dayType, amount } = getDayDetails(dateStr);

                  return (
                    <TimelineDayCell
                      key={dateStr}
                      dateStr={dateStr}
                      isToday={isToday}
                      viewMode={viewMode}
                      dayType={dayType}
                      amount={amount}
                      globalMaxThreshold={globalMaxThreshold}
                      onHover={handleMouseEnter}
                      onLeave={handleMouseLeave}
                      className="w-4 h-4"
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-none border shadow-sm transition-colors bg-[#181818] border-[#303030]">
      {/* ─── HEADER (Editorial Style) ─── */}
      <div className="px-4 py-2 border-b flex items-center justify-between bg-[#121212]/80 border-[#2d2d2d] w-full gap-4 relative z-20 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-3 bg-[#da291c] shrink-0" />
          <CalendarClock className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-200">
            ไทม์ไลน์กิจกรรม
          </span>
          <div className="ml-2">
            <TimelineModeToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>
        </div>
        <div className="flex items-center">
          <TimelineLayoutToggle layoutMode={layoutMode} setLayoutMode={setLayoutMode} />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Legend Row */}
        <div className="flex justify-end min-h-[20px]">
          {showSkeleton ? (
            <div className="h-4 w-48 rounded-none animate-pulse bg-[#303030]" />
          ) : (
            <div>
              {viewMode === 'dayType' ? (
                <TimelineDayTypeLegend 
                  dayTypeConfig={dayTypeConfig} 
                  dayTypeCounts={analytics.dayTypeCounts} 
                />
              ) : (
                <TimelineHeatmapLegend 
                  globalMaxThreshold={globalMaxThreshold} 
                />
              )}
            </div>
          )}
        </div>

        {/* Timeline Grid */}
        <div className="border rounded-none relative z-10 bg-[#121212] border-[#3e3e3e] min-h-[164px] flex flex-col justify-center">
          {renderTimelineContent()}
        </div>
      </div>

      <TimelineTooltip 
        {...tooltip} 
        viewMode={viewMode} 
      />
    </div>
  );
}
