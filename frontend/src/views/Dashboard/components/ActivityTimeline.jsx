// src/views/Dashboard/components/ActivityTimeline.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { CalendarClock, Flame, CalendarDays, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../../context/ThemeContext';

// --- Constants ---
const MONTH_LABELS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const DAY_LABELS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

const HEATMAP_SHADES_DARK = ['#2e1065', '#4338ca', '#6d28d9', '#c2410c', '#ea580c', '#f97316'];
const HEATMAP_SHADES_LIGHT = ['#e0e7ff', '#c7d2fe', '#ddd6fe', '#ffedd5', '#fed7aa', '#fb923c'];

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
  if (level === 0) return isDarkMode ? '#1e293b' : '#f1f5f9';
  const shades = isDarkMode ? HEATMAP_SHADES_DARK : HEATMAP_SHADES_LIGHT;
  return shades[level - 1] || shades[0];
};

// --- Sub-components ---

const ModeToggle = ({ viewMode, setViewMode, isDarkMode }) => {
  const modeButtons = [
    { id: 'dayType', label: 'ประเภทวัน', icon: CalendarDays, color: isDarkMode ? 'text-blue-400' : 'text-[#00509E]' },
    { id: 'heatmap', label: 'ระดับการจ่าย', icon: Flame, color: isDarkMode ? 'text-orange-400' : 'text-orange-600' }
  ];

  return (
    <div className={`relative flex p-1 rounded-md border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
      {modeButtons.map((btn) => (
        <button
          key={btn.id}
          onClick={() => setViewMode(btn.id)}
          className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md transition-colors duration-200 ${
            viewMode === btn.id 
              ? btn.color 
              : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
          }`}
        >
          <btn.icon className="w-3.5 h-3.5" /> 
          <span>{btn.label}</span>
          {viewMode === btn.id && (
            <motion.div
              layoutId="activeModeTab"
              className={`absolute inset-0 rounded-md shadow-sm z-[-1] ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
};

const DayTypeLegend = ({ dayTypeConfig, dayTypeCounts, isDarkMode }) => {
  const muted = `text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`;
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
              <div className="w-3 h-3 rounded-sm shrink-0 shadow-sm" style={{ backgroundColor: dt.color }} />
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

const HeatmapLegend = ({ globalMaxThreshold, isDarkMode }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="relative group/info cursor-help mr-1">
        <Info className={`w-3.5 h-3.5 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
        <AnimatePresence>
          <motion.div 
            className="absolute bottom-full right-0 md:left-0 md:right-auto mb-2 opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity z-50 flex flex-col items-center md:items-start invisible group-hover/info:visible"
            initial={{ opacity: 0, y: 5 }}
            whileHover={{ opacity: 1, y: 0 }}
          >
            <div className={`text-left rounded-sm py-2 px-3 text-[10px] font-medium shadow-2xl w-[250px] leading-relaxed ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-slate-800 text-white'}`}>
              <p className="font-bold mb-1 text-orange-400">ระดับสีคำนวณแบบมาตรฐาน (Global Max)</p>
              <p className="text-slate-300">
                ระดับสีอ้างอิงจากเพดานการจ่ายเงินสูงสุดตลอดกาลของคุณ ({globalMaxThreshold.toLocaleString('th-TH')} บ.) 
                เพื่อให้สเกลสีคงที่เมื่อเปรียบเทียบข้ามช่วงเวลา
              </p>
            </div>
            <div className={`w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] ${isDarkMode ? 'border-t-slate-900' : 'border-t-slate-800'} md:ml-2 mr-2 md:mr-0`} />
          </motion.div>
        </AnimatePresence>
      </div>
      <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>น้อย</span>
      {[0, 1, 2, 3, 4, 5, 6].map(level => (
        <div 
          key={level} 
          className="w-3 h-3 rounded-sm shrink-0 border" 
          style={{ 
            backgroundColor: getHeatmapColor(level, isDarkMode), 
            borderColor: level === 0 ? (isDarkMode ? '#334155' : '#e2e8f0') : 'transparent' 
          }} 
        />
      ))}
      <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>มาก</span>
    </div>
  );
};

const TimelineTooltip = ({ active, x, y, dateDisplay, amount, dayType, viewMode, isDarkMode }) => {
  return createPortal(
    <AnimatePresence>
      {active && (
        <div
          className="fixed pointer-events-none z-[99999]"
          style={{ left: x, top: y - 6, transform: 'translate(-50%, -100%)' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="flex flex-col items-center"
          >
            <div className={`text-center rounded-md py-2 px-3 text-[11px] font-bold shadow-2xl border min-w-[120px] ${
              isDarkMode 
                ? 'bg-slate-900 border-slate-700 text-white shadow-black/60' 
                : 'bg-slate-800 border-slate-700 text-white shadow-slate-400/60'
            }`}>
              <div className="text-slate-400 font-medium text-[9px] mb-1 uppercase tracking-wider">{dateDisplay}</div>
              {viewMode === 'dayType' ? (
                <div className="flex items-center justify-center gap-1.5" style={{ color: dayType?.color || '#cbd5e1' }}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dayType?.color }} />
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
            <div className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] ${
              isDarkMode ? 'border-t-slate-900' : 'border-t-slate-800'
            }`} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

// --- Main Component ---

export default function ActivityTimeline({ analytics, dayTypeConfig, dayTypes }) {
  const { isDarkMode: dm } = useTheme();
  const [viewMode, setViewMode] = useState('dayType');
  
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

  const weeks = useMemo(() => {
    if (datesInPeriod.length === 0) return [];
    const result = [];
    let currentWeek = Array(7).fill(null);
    let monthLabel = null;

    datesInPeriod.forEach((dateStr, index) => {
      const [y, m, d] = dateStr.split('-');
      const dateObj = new Date(y, +m - 1, d);
      const dayOfWeek = dateObj.getDay();

      if (d === '01' || index === 0) {
        monthLabel = `${MONTH_LABELS[+m - 1]} ${y.slice(2)}`;
      }

      currentWeek[dayOfWeek] = dateStr;

      if (dayOfWeek === 6 || index === datesInPeriod.length - 1) {
        result.push({ days: [...currentWeek], monthLabel });
        currentWeek = Array(7).fill(null);
        monthLabel = null;
      }
    });
    return result;
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

  const handleMouseEnter = (e, dateStr) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { displayStr, dayType, amount } = getDayDetails(dateStr);

    setTooltip({
      active: true,
      x: rect.left + rect.width / 2,
      y: rect.top,
      dateDisplay: displayStr,
      dayType,
      amount
    });
  };

  const handleMouseLeave = () => setTooltip(prev => ({ ...prev, active: false }));

  // Styles
  const cardStyles = `rounded-sm border shadow-sm transition-colors ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;
  const headerTextStyles = `font-bold text-sm flex items-center gap-2 ${dm ? 'text-slate-200' : 'text-slate-800'}`;
  const dividerStyles = `border-b mb-3 pb-3 ${dm ? 'border-slate-700' : 'border-slate-100'}`;

  if (Object.keys(analytics.dayTypeCounts || {}).length === 0) return null;

  return (
    <div className={`${cardStyles} p-4`}>
      {/* Header & Controls */}
      <div className={`flex items-center justify-between ${dividerStyles} gap-4 relative z-20`}>
        <div className="flex items-center gap-4 flex-wrap">
          <h3 className={headerTextStyles}>
            <CalendarClock className={`w-4 h-4 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} />
            ไทม์ไลน์กิจกรรม
          </h3>
          <ModeToggle viewMode={viewMode} setViewMode={setViewMode} isDarkMode={dm} />
        </div>
      </div>

      {/* Legend Row (New Line) */}
      <div className="mb-4 flex justify-end">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.2 }}
          >
            {viewMode === 'dayType' ? (
              <DayTypeLegend 
                dayTypeConfig={dayTypeConfig} 
                dayTypeCounts={analytics.dayTypeCounts} 
                isDarkMode={dm} 
              />
            ) : (
              <HeatmapLegend 
                globalMaxThreshold={globalMaxThreshold} 
                isDarkMode={dm} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Timeline Grid */}
      <div className={`border rounded-sm relative z-10 ${dm ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-50/50 border-slate-200'}`}>
        {datesInPeriod.length === 0 ? (
          <div className="text-center text-slate-400 py-10 text-sm italic">ไม่มีข้อมูลการทำกิจกรรมในวันที่เลือก</div>
        ) : (
          <div className="overflow-x-auto pb-4 pt-10 px-3 flex justify-center custom-scrollbar" style={{ scrollbarWidth: 'thin' }}>
            <div className="flex w-max gap-x-[3px] mx-auto">
              
              {/* Day Labels (Sticky) */}
              <div className="flex flex-col gap-[3px] shrink-0 sticky left-0 z-20 pr-3 border-r"
                style={{ backgroundColor: dm ? '#1a2232' : '#f8fafc', borderColor: dm ? '#334155' : '#e2e8f0' }}>
                <div className="h-4" />
                {DAY_LABELS.map((day, i) => (
                  <div 
                    key={day} 
                    className={`h-3.5 flex items-center justify-end text-[9px] font-black ${
                      i === 0 || i === 6 ? (dm ? 'text-red-400/80' : 'text-red-500/80') : (dm ? 'text-slate-500' : 'text-slate-400')
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Weeks & Days */}
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px] shrink-0">
                  {/* Month Label */}
                  <div className="h-4 relative flex items-end pb-1">
                    {week.monthLabel && (
                      <div className="absolute left-0 bottom-0.5 flex items-end whitespace-nowrap">
                        <div className={`w-[2px] h-3 mr-1 rounded-full ${dm ? 'bg-blue-500/50' : 'bg-blue-400/50'}`} />
                        <span className={`text-[9px] font-black leading-none uppercase tracking-tighter ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
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
                    const level = getExpenseLevel(amount, globalMaxThreshold);
                    
                    const backgroundColor = viewMode === 'heatmap' 
                      ? getHeatmapColor(level, dm) 
                      : (dayType?.color || '#cbd5e1');

                    return (
                      <motion.div 
                        key={dateStr} 
                        className={`w-3.5 h-3.5 rounded-[2px] cursor-pointer border transition-colors ${
                          isToday 
                            ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900 z-10' 
                            : 'opacity-90 hover:opacity-100 hover:border-slate-400 dark:hover:border-slate-500'
                        }`}
                        style={{
                          backgroundColor,
                          borderColor: (viewMode === 'heatmap' && level === 0) ? (dm ? '#1e293b' : '#e2e8f0') : 'transparent'
                        }}
                        whileHover={{ scale: 1.25 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        onMouseEnter={(e) => handleMouseEnter(e, dateStr)}
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

      <TimelineTooltip 
        {...tooltip} 
        viewMode={viewMode} 
        isDarkMode={dm} 
      />
    </div>
  );
}

ActivityTimeline.propTypes = {
  analytics: PropTypes.shape({
    datesInPeriod: PropTypes.array,
    dailyAllMap: PropTypes.object,
    globalMaxThreshold: PropTypes.number,
    dayTypeCounts: PropTypes.object,
  }).isRequired,
  dayTypeConfig: PropTypes.array.isRequired,
  dayTypes: PropTypes.object.isRequired,
};