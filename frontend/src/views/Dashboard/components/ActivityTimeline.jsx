// src/views/Dashboard/components/ActivityTimeline.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarClock, CalendarDays, Flame, Info, TableProperties 
} from 'lucide-react';
import { useDashboardContext } from '../context/DashboardContext';

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

// --- Constants ---
const MONTH_LABELS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const DAY_LABELS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

const HEATMAP_SHADES_DARK = ['#1e1b4b', '#312e81', '#4338ca', '#5850ec', '#ea580c', '#e11d48'];
const HEATMAP_SHADES_LIGHT = ['#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#fed7aa', '#fecdd3'];

// --- Helpers ---
const getExpenseLevel = (amount, maxThreshold) => {
  if (!amount || amount === 0) return 0;
  const ratio = amount / maxThreshold;
  if (ratio <= (1 / 6)) return 1;
  if (ratio <= (2 / 6)) return 2;
  if (ratio <= (3 / 6)) return 3;
  if (ratio <= (4 / 6)) return 4;
  if (ratio <= (5 / 6)) return 5;
  return 6;
};

const getHeatmapColor = (level, isDarkMode) => {
  if (level === 0) return '#181818';
  const shades = isDarkMode ? HEATMAP_SHADES_DARK : HEATMAP_SHADES_LIGHT;
  return shades[level - 1] || shades[0];
};

/**
 * INTERNAL COMPONENT: TimelineModeToggle
 */
const TimelineModeToggle = ({ viewMode, setViewMode, isDarkMode }) => {
  const modeButtons = [
    { id: 'dayType', label: 'ประเภทวัน', icon: CalendarDays, color: 'text-[#ff4d4d]' },
    { id: 'heatmap', label: 'ระดับการจ่าย', icon: Flame, color: 'text-orange-400' }
  ];

  return (
    <div className="relative flex p-1 rounded-none border shadow-sm bg-[#121212] border-[#3e3e3e]">
      {modeButtons.map((btn) => (
        <button
          key={btn.id}
          type="button"
          aria-pressed={viewMode === btn.id}
          onClick={() => setViewMode(btn.id)}
          className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-none transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#da291c] ${
            viewMode === btn.id 
              ? btn.color 
              : ('text-slate-400 hover:text-slate-200')
          }`}
        >
          <btn.icon className="w-3.5 h-3.5" /> 
          <span>{btn.label}</span>
          {viewMode === btn.id && (
            <motion.div
              layoutId="activeModeTab"
              className="absolute inset-0 rounded-none shadow-sm z-[-1] bg-[#303030]/60"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
};

/**
 * INTERNAL COMPONENT: TimelineDayTypeLegend
 */
const TimelineDayTypeLegend = ({ dayTypeConfig, dayTypeCounts, isDarkMode }) => {
  const muted = `text-xs font-bold ${'text-slate-400'}`;
  const totalDays = Object.values(dayTypeCounts).reduce((acc, count) => acc + count, 0);
  
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {dayTypeConfig
        .filter(dt => (dayTypeCounts[dt.id] || 0) > 0)
        .map(dt => {
          const count = dayTypeCounts[dt.id];
          const percentage = totalDays > 0 ? ((count / totalDays) * 100).toFixed(2) : '0.00';
          return (
            <div key={dt.id} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-none shrink-0 shadow-sm" style={{ backgroundColor: dt.color }} />
              <span className={muted}>
                {dt.label} 
                <span className="opacity-70 text-[10px] ml-1">({count} วัน / {percentage}%)</span>
              </span>
            </div>
          );
        })}
    </div>
  );
};

/**
 * INTERNAL COMPONENT: TimelineHeatmapLegend
 */
const TimelineHeatmapLegend = ({ globalMaxThreshold, isDarkMode }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="relative group/info cursor-help mr-1">
        <Info className="w-3.5 h-3.5 text-slate-400" />
        <AnimatePresence>
          <motion.div 
            className="absolute bottom-full right-0 md:left-0 md:right-auto mb-2 opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity z-50 flex flex-col items-center md:items-start invisible group-hover/info:visible"
            initial={{ opacity: 0, y: 5 }}
            whileHover={{ opacity: 1, y: 0 }}
          >
            <div className="text-left rounded-none py-2 px-3 text-[10px] font-medium shadow-2xl w-[250px] leading-relaxed bg-[#121212] text-white border border-[#3e3e3e]">
              <p className="font-bold mb-1 text-orange-400">ระดับสีคำนวณแบบมาตรฐาน (Global Max)</p>
              <p className="text-slate-300">
                ระดับสีอ้างอิงจากเพดานการจ่ายเงินสูงสุดตลอดกาลของคุณ ({globalMaxThreshold.toLocaleString('th-TH')} บ.) 
                เพื่อให้สเกลสีคงที่เมื่อเปรียบเทียบข้ามช่วงเวลา
              </p>
            </div>
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#121212] md:ml-2 mr-2 md:mr-0" />
          </motion.div>
        </AnimatePresence>
      </div>
      <span className="text-[10px] font-bold text-slate-400">น้อย</span>
      {[0, 1, 2, 3, 4, 5, 6].map(level => (
        <div 
          key={level} 
          className="w-3 h-3 rounded-none shrink-0 border" 
          style={{ 
            backgroundColor: getHeatmapColor(level, isDarkMode), 
            borderColor: level === 0 ? ('#3e3e3e') : 'transparent' 
          }} 
        />
      ))}
      <span className="text-[10px] font-bold text-slate-400">มาก</span>
    </div>
  );
};

/**
 * INTERNAL COMPONENT: TimelineTooltip
 */
const TimelineTooltip = ({ active, x, y, dateDisplay, amount, dayType, viewMode, isDarkMode }) => {
  return createPortal(
    <AnimatePresence>
      {active && (
        <div
          className="fixed pointer-events-none z-[99999]"
          style={{ left: x, top: y - 6, transform: 'translate(-50%, -100%)' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 2 }}
            transition={{ duration: 0.1 }}
            className="flex flex-col items-center"
          >
            <div className="flex flex-col items-center text-center rounded-none py-2 px-3 text-[11px] font-bold shadow-2xl border min-w-[120px] bg-[#121212]/95 backdrop-blur-md border-[#3e3e3e] text-white">
              <div className="text-slate-400 font-medium text-[9px] mb-1 uppercase tracking-wider">{dateDisplay}</div>
              {viewMode === 'dayType' ? (
                <div className="flex items-center justify-center gap-1.5" style={{ color: dayType?.color || '#cbd5e1' }}>
                  <div className="w-1.5 h-1.5 rounded-none shrink-0" style={{ backgroundColor: dayType?.color }} />
                  {dayType?.label || 'ไม่มีข้อมูล'}
                </div>
              ) : (
                <div className={`flex flex-col items-center ${amount > 0 ? 'text-orange-400' : 'text-slate-400'}`}>
                  <div className="text-[13px] leading-none">
                    {amount > 0 ? amount.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : 'ไม่มีรายจ่าย'}
                  </div>
                </div>
              )}
            </div>
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#121212]/95" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

/**
 * INTERNAL COMPONENT: TimelineDayCell - High performance memoized grid cell
 */
const TimelineDayCell = React.memo(({
  dateStr, isToday, viewMode, dm, dayType, amount, globalMaxThreshold,
  onMouseEnter, onMouseLeave, className = "w-3.5 h-3.5"
}) => {
  const level = getExpenseLevel(amount, globalMaxThreshold);
  const backgroundColor = viewMode === 'heatmap' 
    ? getHeatmapColor(level, dm) 
    : (dayType?.color || '#cbd5e1');

  const [y, m, d] = dateStr.split('-');
  const displayStr = `${DAY_LABELS[new Date(y, +m - 1, d).getDay()]} ${+d} ${MONTH_LABELS[+m - 1]} ${y.slice(2)}`;
  const detailsText = viewMode === 'dayType'
    ? `ประเภทวัน: ${dayType?.label || 'ไม่มีข้อมูล'}`
    : `ยอดรายจ่าย: ${amount > 0 ? amount.toLocaleString('th-TH') + ' บาท' : 'ไม่มีรายจ่าย'}`;

  return (
    <button
      type="button"
      role="gridcell"
      tabIndex={0}
      aria-label={`${displayStr}, ${detailsText}`}
      className={`${className} rounded-none cursor-pointer border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#da291c] focus-visible:z-10 ${
        isToday 
          ? 'ring ring-[#da291c] z-10' 
          : 'opacity-90 hover:opacity-100 hover:border-[#da291c] hover:z-10'
      }`}
      style={{
        backgroundColor,
        borderColor: (viewMode === 'heatmap' && level === 0) ? ('#3e3e3e') : 'transparent'
      }}
      onMouseEnter={(e) => onMouseEnter(e, dateStr)}
      onMouseLeave={onMouseLeave}
      onFocus={(e) => onMouseEnter(e, dateStr)}
      onBlur={onMouseLeave}
    />
  );
});

TimelineDayCell.displayName = 'TimelineDayCell';

/**
 * INTERNAL COMPONENT: TimelineLayoutToggle
 */
const TimelineLayoutToggle = ({ layoutMode, setLayoutMode }) => {
  const layoutButtons = [
    { id: 'github', label: 'GitHub แนวนอน', icon: TableProperties },
    { id: 'calendar', label: 'ปฏิทินทั่วไป', icon: CalendarDays }
  ];

  return (
    <div className="relative flex p-1 rounded-none border shadow-sm bg-[#121212] border-[#3e3e3e]">
      {layoutButtons.map((btn) => (
        <button
          key={btn.id}
          type="button"
          aria-pressed={layoutMode === btn.id}
          onClick={() => setLayoutMode(btn.id)}
          className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-none transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#da291c] ${
            layoutMode === btn.id 
              ? 'text-slate-100' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <btn.icon className="w-3.5 h-3.5" /> 
          <span>{btn.label}</span>
          {layoutMode === btn.id && (
            <motion.div
              layoutId="activeLayoutTab"
              className="absolute inset-0 rounded-none shadow-sm z-[-1] bg-[#303030]/60"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
};

/**
 * Main Activity Timeline Component
 */
export default function ActivityTimeline() {
  const { analytics, dayTypeConfig, dayTypes, dm, showSkeleton } = useDashboardContext();
  const [viewMode, setViewMode] = useState('dayType');
  const [layoutMode, setLayoutMode] = useState('github');
  
  const [tooltip, setTooltip] = useState({
    active: false,
    x: 0,
    y: 0,
    dateDisplay: '',
    dayType: null,
    amount: 0
  });

  const datesInPeriod = useMemo(() => analytics.datesInPeriod || [], [analytics.datesInPeriod]);
  const dailyExpenses = useMemo(() => analytics.dailyAllMap || {}, [analytics.dailyAllMap]);
  const globalMaxThreshold = analytics.globalMaxThreshold || 100;
  const datesInPeriodSet = useMemo(() => new Set(datesInPeriod), [datesInPeriod]);

  const weeks = useMemo(() => {
    if (datesInPeriod.length === 0) return [];
    const result = [];
    let currentWeek = new Array(7).fill(null);
    let monthLabel = null;
    datesInPeriod.forEach((dateStr, index) => {
      const [y, m, d] = dateStr.split('-');
      const dateObj = new Date(y, +m - 1, d);
      const dayOfWeek = dateObj.getDay();
      if (d === '01' || index === 0) monthLabel = `${MONTH_LABELS[+m - 1]} ${y.slice(2)}`;
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
    
    const groups = {};
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
      
      const dates = groups[key];
      const firstDateObj = new Date(year, monthIdx, 1);
      const startDayOfWeek = firstDateObj.getDay();
      const totalDays = new Date(year, monthIdx + 1, 0).getDate();

      const gridCells = [];
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

  const getDayDetails = useCallback((dateStr) => {
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(y, +m - 1, d);
    const dayOfWeek = dateObj.getDay();
    const displayStr = `${DAY_LABELS[dayOfWeek]} ${+d} ${MONTH_LABELS[+m - 1]} ${y.slice(2)}`;
    const defaultDayType = (dayOfWeek === 0 || dayOfWeek === 6) 
      ? (dayTypeConfig.find(t => t.name === 'holiday') || dayTypeConfig[1] || dayTypeConfig[0])
      : (dayTypeConfig.find(t => t.name === 'workday') || dayTypeConfig[0]);
    const dayType = dayTypeConfig.find(t => t.id === dayTypes[dateStr]) || defaultDayType;
    const amount = dailyExpenses[dateStr] || 0;
    return { displayStr, dayType, amount, dayOfWeek };
  }, [dayTypeConfig, dayTypes, dailyExpenses]);

  const handleMouseEnter = useCallback((e, dateStr) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { displayStr, dayType, amount } = getDayDetails(dateStr);
    setTooltip({ active: true, x: rect.left + rect.width / 2, y: rect.top, dateDisplay: displayStr, dayType, amount });
  }, [getDayDetails]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(prev => ({ ...prev, active: false }));
  }, []);

  // Styles
  const cardStyles = `rounded-none border shadow-sm transition-colors bg-[#181818] border-[#303030]`;

  if (!showSkeleton && (!analytics.dayTypeCounts || Object.keys(analytics.dayTypeCounts).length === 0)) return null;

  return (
    <div className={cardStyles}>
      {/* ─── HEADER (Editorial Style) ─── */}
      <div className="px-4 py-2 border-b flex items-center justify-between bg-[#121212]/80 border-[#2d2d2d] w-full gap-4 relative z-20 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-3 bg-[#da291c] shrink-0" /> {/* Rosso Corsa racing line brand accent */}
          <CalendarClock className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-200">
            ไทม์ไลน์กิจกรรม
          </span>
          <div className="ml-2">
            <TimelineModeToggle viewMode={viewMode} setViewMode={setViewMode} isDarkMode={dm} />
          </div>
        </div>
        <div className="flex items-center">
          <TimelineLayoutToggle layoutMode={layoutMode} setLayoutMode={setLayoutMode} />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Legend Row (New Line) */}
        <div className="flex justify-end min-h-[20px]">
          {showSkeleton ? (
            <div className="h-4 w-48 rounded-none animate-pulse bg-[#303030]" />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={viewMode}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.2 }}
              >
                {viewMode === 'dayType' ? (
                  <TimelineDayTypeLegend 
                    dayTypeConfig={dayTypeConfig} 
                    dayTypeCounts={analytics.dayTypeCounts} 
                    isDarkMode={dm} 
                  />
                ) : (
                  <TimelineHeatmapLegend 
                    globalMaxThreshold={globalMaxThreshold} 
                    isDarkMode={dm} 
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Timeline Grid */}
        <div className="border rounded-none relative z-10 bg-[#121212] border-[#3e3e3e] min-h-[164px] flex flex-col justify-center">
          {showSkeleton ? (
            <div className="py-12 px-3">
               <div className="h-24 w-full rounded-none animate-pulse bg-[#303030]" />
            </div>
          ) : datesInPeriod.length === 0 ? (
            <div className="text-center text-slate-400 py-10 text-sm italic">ไม่มีข้อมูลการทำกิจกรรมในวันที่เลือก</div>
          ) : layoutMode === 'calendar' ? (
            <div className="p-3.5 w-full flex items-center justify-center overflow-x-auto custom-scrollbar">
              <div className="flex flex-wrap items-start justify-center gap-2.5 max-w-[1022px] mx-auto">
                {calendarMonths.map(month => (
                  <div key={month.key} className="border border-[#2d2d2d] bg-[#181818] px-2 pt-2 pb-2.5 flex flex-col items-center w-[162px] shrink-0 select-none shadow-sm">
                    {/* Month Title */}
                    <div className="text-[11.5px] font-black text-slate-200 tracking-wider uppercase mb-1.5 border-b border-[#2d2d2d] pb-1 w-full text-center flex items-center justify-center gap-1.5">
                      <div className="w-[3.5px] h-[3.5px] bg-[#da291c] rounded-none shrink-0" />
                      <span>{MONTH_LABELS[month.monthIdx]} {month.year.toString().slice(-2)}</span>
                    </div>

                    {/* Week Day Header */}
                    <div className="grid grid-cols-7 gap-[1px] mb-1 w-[146px]">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, i) => (
                        <div key={i} className={`w-[20px] text-center text-[8.5px] font-black leading-tight ${i === 0 || i === 6 ? 'text-red-400/80' : 'text-slate-400'}`}>
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-[1px] bg-[#2d2d2d]/30 w-[146px]">
                      {month.gridCells.map((dateStr, idx) => {
                        if (!dateStr) {
                          return <div key={`empty-${idx}`} className="w-[20px] h-[20px] bg-transparent" />;
                        }

                        const inPeriod = datesInPeriodSet.has(dateStr);
                        if (!inPeriod) {
                          return <div key={dateStr} className="w-[20px] h-[20px] bg-[#121212]/40 border border-[#2d2d2d]/10 opacity-20" />;
                        }

                        const isToday = dateStr === new Date().toISOString().split('T')[0];
                        const { dayType, amount } = getDayDetails(dateStr);

                        return (
                          <div key={dateStr} className="w-[20px] h-[20px] flex items-center justify-center">
                            <TimelineDayCell
                              dateStr={dateStr}
                              isToday={isToday}
                              viewMode={viewMode}
                              dm={dm}
                              dayType={dayType}
                              amount={amount}
                              globalMaxThreshold={globalMaxThreshold}
                              onMouseEnter={handleMouseEnter}
                              onMouseLeave={handleMouseLeave}
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
          ) : (
            <div className="overflow-x-auto pb-4 pt-6 px-3 flex justify-center custom-scrollbar" style={{ scrollbarWidth: 'thin' }}>
              <div className="flex w-max gap-x-[1px] mx-auto">
                
                {/* Day Labels (Sticky) */}
                <div className="flex flex-col gap-[1px] shrink-0 sticky left-0 z-20 pr-1 border-r"
                  style={{ backgroundColor: '#121212', borderColor: '#303030' }}>
                  <div className="h-4" />
                  {DAY_LABELS.map((day, i) => (
                    <div 
                      key={day} 
                      className={`h-3.5 flex items-center justify-end text-[9px] font-black ${
                        i === 0 || i === 6 ? ('text-red-400/80') : ('text-slate-500')
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Weeks & Days */}
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[1px] shrink-0">
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
                      if (!dateStr) return <div key={`empty-${weekIndex}-${dayIndex}`} className="w-3.5 h-3.5 bg-transparent" />;
                      
                      const isToday = dateStr === new Date().toISOString().split('T')[0];
                      const { dayType, amount } = getDayDetails(dateStr);

                      return (
                        <TimelineDayCell
                          key={dateStr}
                          dateStr={dateStr}
                          isToday={isToday}
                          viewMode={viewMode}
                          dm={dm}
                          dayType={dayType}
                          amount={amount}
                          globalMaxThreshold={globalMaxThreshold}
                          onMouseEnter={handleMouseEnter}
                          onMouseLeave={handleMouseLeave}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <TimelineTooltip 
        {...tooltip} 
        viewMode={viewMode} 
        isDarkMode={dm} 
      />
    </div>
  );
}
