// src/views/CalendarView.jsx
import { useMemo, useState } from 'react';
import DayDetailModal from '../components/DayDetailModal.jsx';
import {
  CalendarDays, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight, PlusCircle,
} from 'lucide-react';
import { formatMoney, hexToRgb } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';

/**
 * Skeleton สำหรับตอนโหลดข้อมูล
 */
function CalendarSkeleton() {
  const { isDarkMode } = useTheme();
  const shimmer = isDarkMode ? 'bg-slate-700 animate-pulse' : 'bg-slate-200 animate-pulse';
  const surface = isDarkMode ? 'bg-slate-900' : 'bg-white';
  const surfaceAlt = isDarkMode ? 'bg-slate-800' : 'bg-slate-50';
  const border = isDarkMode ? 'border-slate-700' : 'border-slate-200';
  const gapColor = isDarkMode ? 'bg-slate-700' : 'bg-slate-100';
  const DAYS_LABEL = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

  return (
    <div className="flex flex-col h-full pb-6 space-y-3 max-w-screen-2xl mx-auto w-full">
      {/* Header skeleton */}
      <div className={`${surface} rounded-sm border ${border} shadow-sm p-3 md:p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`h-6 w-36 rounded-sm ${shimmer}`} />
            <div className={`h-5 w-20 rounded-sm ${shimmer}`} />
            <div className={`h-5 w-20 rounded-sm ${shimmer}`} />
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`h-7 w-7 rounded-sm ${shimmer}`} />
            <div className={`h-7 w-24 rounded-sm ${shimmer}`} />
            <div className={`h-7 w-7 rounded-sm ${shimmer}`} />
          </div>
        </div>
      </div>

      {/* Grid skeleton */}
      <div className={`rounded-sm border ${border} shadow-sm overflow-hidden flex-1 flex flex-col`}>
        {/* Day labels */}
        <div className={`grid grid-cols-7 ${surfaceAlt} border-b ${border}`}>
          {DAYS_LABEL.map(label => (
            <div key={label} className="py-2 flex justify-center">
              <div className={`h-4 w-6 rounded-sm ${shimmer}`} />
            </div>
          ))}
        </div>
        {/* Day cells */}
        <div className={`grid grid-cols-7 gap-[1px] ${gapColor} flex-1`}>
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className={`min-h-[120px] 2xl:min-h-[140px] flex flex-col ${surfaceAlt}`}>
              <div className={`flex items-center justify-between px-1.5 py-1 border-b ${border}`}>
                <div className={`h-5 w-5 rounded-sm ${shimmer}`} />
                <div className={`h-4 w-10 rounded-sm ${shimmer}`} />
              </div>
              <div className="flex flex-col gap-1.5 p-1.5 flex-grow">
                {i % 3 === 0 && <div className={`h-3 w-14 rounded-sm ${shimmer}`} />}
                {i % 4 === 0 && <div className={`h-3 w-16 rounded-sm ${shimmer}`} />}
                {i % 5 === 0 && <div className={`h-3 w-12 rounded-sm ${shimmer}`} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer skeleton */}
      <div className={`${surface} rounded-sm border ${border} shadow-sm p-2 px-3 flex gap-2 items-center`}>
        <div className={`h-4 w-10 rounded-sm ${shimmer}`} />
        <div className={`h-5 w-16 rounded-sm ${shimmer}`} />
        <div className={`h-5 w-16 rounded-sm ${shimmer}`} />
        <div className={`ml-auto h-5 w-12 rounded-sm ${shimmer}`} />
      </div>
    </div>
  );
}

/**
 * Helper สำหรับจัดฟอร์แมตตัวเลขให้รองรับทศนิยม 2 ตำแหน่ง (ไม่ปัดเศษ)
 */
const formatValue = (val) => {
  return val.toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

/**
 * Component ย่อยสำหรับช่องแต่ละวันในปฏิทิน
 */
function CalendarDayCell({ 
  day, data, dateStr, isToday, isWeekend, 
  dayTypeConfig, dayTypes, handleDayTypeChange, onSelectDate 
}) {
  const { isDarkMode } = useTheme();
  const dow = new Date(dateStr.split('/').reverse().join('-')).getDay();
  const defType = isWeekend ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
  const curType = dayTypes[dateStr] || defType;
  const typeConf = dayTypeConfig.find(dt => dt.id === curType) || dayTypeConfig[0];

  const cellBg = useMemo(() => {
    if (isToday) return isDarkMode ? 'bg-blue-950' : 'bg-blue-50';
    if (isWeekend && !(data.inc > 0 || data.exp > 0)) return isDarkMode ? 'bg-slate-800/80' : 'bg-slate-50';
    return isDarkMode ? 'bg-slate-800' : 'bg-white';
  }, [isToday, isWeekend, data, isDarkMode]);

  return (
    <div className={`min-h-[120px] 2xl:min-h-[140px] flex flex-col relative group transition-colors duration-150 ${cellBg}`}>
      {isToday && (
        <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-[#00509E] opacity-50 z-20" />
      )}

      {/* Header ของแต่ละวัน (วันที่ + ตัวเลือกประเภทวัน) */}
      <div className={`flex items-center justify-between px-1.5 py-1 shrink-0 border-b z-30 relative ${isDarkMode ? 'border-slate-700/60 bg-slate-800/80' : 'border-slate-100 bg-white'}`}>
        <div className="flex items-center gap-1.5">
          <span className={`text-[15px] font-black leading-none w-6 h-6 flex items-center justify-center rounded-sm shrink-0 ${
            isToday
              ? 'bg-[#00509E] text-white'
              : isWeekend
                ? (isDarkMode ? 'text-red-400 bg-red-900/20' : 'text-red-500 bg-red-50')
                : (isDarkMode ? 'text-slate-200' : 'text-slate-700')
          }`}>
            {day}
          </span>
          <PlusCircle className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`} />
        </div>

        <select
          onClick={(e) => e.stopPropagation()} 
          value={curType}
          onChange={e => handleDayTypeChange(dateStr, e.target.value)}
          className="day-type-badge text-[11px] font-bold px-1.5 py-0.5 rounded-sm cursor-pointer outline-none appearance-none text-center border transition-all hover:scale-105 shadow-sm"
          style={{
            backgroundColor: `rgba(${hexToRgb(typeConf?.color)}, ${isDarkMode ? 0.18 : 0.05})`,
            borderColor: `rgba(${hexToRgb(typeConf?.color)}, ${isDarkMode ? 0.4 : 0.2})`,
            color: typeConf?.color || '#64748b',
          }}
        >
          {dayTypeConfig.map(dt => (
            <option key={dt.id} value={dt.id} style={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', color: isDarkMode ? '#f8fafc' : '#1e293b' }}>
              {dt.label}
            </option>
          ))}
        </select>
      </div>

      {/* ส่วนแสดงรายการธุรกรรม */}
      <div 
        onClick={() => onSelectDate(dateStr)}
        className={`flex flex-col flex-grow gap-1 p-1.5 overflow-hidden cursor-pointer z-10 ${!isToday && (isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-blue-50/40')}`}
      >
        <div className="flex justify-between items-baseline mb-0.5">
           {data.exp > 0 ? (
            <div className={`text-[13px] font-black leading-none ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              {formatValue(data.exp)}
            </div>
           ) : <div/>}
           {data.inc > 0 && (
            <div className={`text-[13px] font-bold leading-none ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              +{formatValue(data.inc)}
            </div>
          )}
        </div>

        {data.incItems?.slice(0, 1).map(tx => {
          const color = tx._catObj?.color || '#10b981';
          return (
            <div key={tx.id} className="flex items-center gap-1 overflow-hidden opacity-90" title={`${tx.description} — ${formatMoney(tx.amount)} ฿`}>
              <div className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
              <span className="truncate text-[12px] font-medium leading-tight flex-1" style={{ color }}>{tx.description || tx.category}</span>
            </div>
          );
        })}

        {data.items.slice(0, 4).map(tx => {
          const color = tx._catObj?.color || '#94a3b8';
          return (
            <div key={tx.id} className="flex items-center gap-1 overflow-hidden" title={`${tx.description} — ${formatMoney(tx.amount)} ฿`}>
              <div className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
              <span className="truncate text-[12px] font-medium leading-tight flex-1" style={{ color }}>{tx.description || tx.category}</span>
              <span className="text-[12px] font-bold shrink-0 ml-1 opacity-70" style={{ color }}>
                {formatValue(tx.amount)}
              </span>
            </div>
          );
        })}

        {(data.items.length > 4 || data.incItems?.length > 1) && (
          <div className="mt-auto pt-1 flex justify-between">
             {data.items.length > 4 && <span className={`text-[11px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>+{data.items.length - 4} จ่าย</span>}
             {data.incItems?.length > 1 && <span className={`text-[11px] font-bold text-right flex-1 ${isDarkMode ? 'text-emerald-700' : 'text-emerald-400'}`}>+{data.incItems.length - 1} รับ</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalendarView({
  transactions, filterPeriod, setFilterPeriod, rawAvailableMonths,
  handleOpenAddModal, categories, dayTypes,
  handleDayTypeChange, dayTypeConfig, getFilterLabel, isReadOnlyView,
  handleDeleteTransaction, onSaveTransaction, paymentMethods,
  isLoading,
}) {
  const { isDarkMode } = useTheme();
  const [selectedDate, setSelectedDate] = useState(null);

  if (isLoading) return <CalendarSkeleton />;

  const viewDate = useMemo(() => {
    if (filterPeriod && filterPeriod.match(/^\d{4}-\d{2}$/)) {
      const [y, m] = filterPeriod.split('-');
      return new Date(parseInt(y), parseInt(m) - 1, 1);
    }
    return new Date();
  }, [filterPeriod]);

  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = new Date(y, m, 1).getDay();

  const { dayData: calendarData, monthInc, monthExp } = useMemo(() => {
    let dayData = {};
    let tInc = 0, tExp = 0;
    
    for (let i = 1; i <= daysInMonth; i++) {
      dayData[i] = { inc: 0, exp: 0, items: [], incItems: [] };
    }

    const targetMonthYear = `${(m + 1).toString().padStart(2, '0')}/${y}`;

    transactions.forEach(t => {
      if (!t.date || !t.date.endsWith(targetMonthYear)) return;

      const txD = parseInt(t.date.split('/')[0], 10);
      if (dayData[txD]) {
        const catObj = categories.find(c => c.name === t.category);
        const amt = parseFloat(t.amount) || 0;
        
        if (catObj?.type === 'income') {
          dayData[txD].inc += amt;
          dayData[txD].incItems.push({ ...t, _catObj: catObj });
          tInc += amt;
        } else {
          dayData[txD].exp += amt;
          dayData[txD].items.push({ ...t, _catObj: catObj });
          tExp += amt;
        }
      }
    });

    for (let i = 1; i <= daysInMonth; i++) {
      dayData[i].items.sort((a, b) => b.amount - a.amount);
      dayData[i].incItems.sort((a, b) => b.amount - a.amount);
    }
    
    return { dayData, monthInc: tInc, monthExp: tExp };
  }, [transactions, y, m, daysInMonth, categories]);

  const dayTypeCounts = useMemo(() => {
    const counts = {};
    dayTypeConfig.forEach(dt => { counts[dt.id] = 0; });
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${d.toString().padStart(2, '0')}/${(m + 1).toString().padStart(2, '0')}/${y}`;
      const dow = new Date(y, m, d).getDay();
      const isWeekend = dow === 0 || dow === 6;
      const def = isWeekend ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
      const cur = dayTypes[dateStr] || def;
      if (cur) counts[cur] = (counts[cur] || 0) + 1;
    }
    return counts;
  }, [dayTypes, daysInMonth, m, y, dayTypeConfig]);

  const currentIndex = rawAvailableMonths.indexOf(filterPeriod);
  const hasPrev = currentIndex < rawAvailableMonths.length - 1;
  const hasNext = currentIndex > 0;
  const prevMonth = () => { if (hasPrev) setFilterPeriod(rawAvailableMonths[currentIndex + 1]); };
  const nextMonth = () => { if (hasNext) setFilterPeriod(rawAvailableMonths[currentIndex - 1]); };
  const goToCurrentMonth = () => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    setFilterPeriod(currentMonthStr);
  };

  const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const today = new Date();
  const monthNet = monthInc - monthExp;

  const DAYS_LABEL = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const WEEKEND_IDX = [0, 6];

  const styles = {
    surface: isDarkMode ? 'bg-slate-900' : 'bg-white',
    surfaceAlt: isDarkMode ? 'bg-slate-800' : 'bg-slate-50',
    border: isDarkMode ? 'border-slate-700' : 'border-slate-200',
    textMuted: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    gapColor: isDarkMode ? 'bg-slate-700' : 'bg-slate-100',
  };

  if (isReadOnlyView) {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6 max-w-screen-2xl mx-auto w-full">
        <div className={`flex flex-col items-center justify-center py-20 rounded-sm border-2 border-dashed h-[60vh] transition-colors shadow-sm ${isDarkMode ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
          <div className={`p-4 rounded-sm mb-4 ${styles.surfaceAlt}`}>
            <CalendarDays className={`w-12 h-12 ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`} />
          </div>
          <p className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>โหมดปฏิทินรองรับเฉพาะรายเดือน</p>
          <p className={`text-sm px-6 text-center max-w-md leading-relaxed mb-6 ${styles.textMuted}`}>
            ตอนนี้คุณกำลังดูข้อมูลแบบ <strong>{getFilterLabel(filterPeriod)}</strong><br/>
            ปฏิทินจะแสดงผลได้ดีที่สุดเมื่อดูเป็นรายเดือนครับ
          </p>
          <button 
            onClick={() => setFilterPeriod(currentMonthStr)}
            className={`px-5 py-2.5 rounded-sm text-sm font-bold shadow-sm transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-[#00509E] hover:bg-blue-800 text-white'}`}
          >
            สลับไปดูเดือนปัจจุบัน ({getFilterLabel(currentMonthStr)})
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6 space-y-3 w-full">
      {/* Header */}
      <div className={`${styles.surface} rounded-sm border ${styles.border} shadow-sm p-3 md:p-4`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className={`text-xl font-black flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
              <CalendarIcon className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`} />
              {thaiMonths[m]} {y}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {monthInc > 0 && (
                <span className={`text-[12px] font-bold px-2 py-0.5 rounded-sm border ${isDarkMode ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800/50' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  ▲ {formatValue(monthInc)} ฿
                </span>
              )}
              {monthExp > 0 && (
                <span className={`text-[12px] font-bold px-2 py-0.5 rounded-sm border ${isDarkMode ? 'bg-red-900/40 text-red-400 border-red-800/50' : 'bg-red-50 text-red-600 border-red-200'}`}>
                  ▼ {formatValue(monthExp)} ฿
                </span>
              )}
              {(monthInc > 0 || monthExp > 0) && (
                <span className={`text-[12px] font-bold px-2 py-0.5 rounded-sm border ${monthNet >= 0 ? (isDarkMode ? 'bg-blue-900/40 text-blue-400 border-blue-800/50' : 'bg-blue-50 text-[#00509E] border-blue-200') : (isDarkMode ? 'bg-orange-900/40 text-orange-400 border-orange-800/50' : 'bg-orange-50 text-orange-600 border-orange-200')}`}>
                  คงเหลือ {formatValue(monthNet)} ฿
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={prevMonth} disabled={!hasPrev} className={`p-1.5 rounded-sm border transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${isDarkMode ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-600'}`}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goToCurrentMonth} className={`px-3 py-1.5 rounded-sm border text-[12px] font-bold transition-all active:scale-95 ${isDarkMode ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-600'}`}>
              เดือนปัจจุบัน
            </button>
            <button onClick={nextMonth} disabled={!hasNext} className={`p-1.5 rounded-sm border transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${isDarkMode ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-600'}`}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className={`rounded-sm border ${styles.border} shadow-sm overflow-hidden flex-1 flex flex-col`}>
        <div className={`grid grid-cols-7 ${styles.surfaceAlt} border-b ${styles.border}`}>
          {DAYS_LABEL.map((label, i) => (
            <div key={label} className={`py-2 text-center text-[15px] font-bold tracking-wide ${WEEKEND_IDX.includes(i) ? (isDarkMode ? 'text-red-400' : 'text-red-500') : styles.textMuted}`}>
              {label}
            </div>
          ))}
        </div>

        <div className={`grid grid-cols-7 gap-[1px] ${styles.gapColor} flex-1`}>
          {Array(firstDayOfMonth).fill(null).map((_, i) => (
            <div key={`blank-${i}`} className={`min-h-[120px] 2xl:min-h-[140px] ${styles.surfaceAlt}`} />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
            const dateStr = `${d.toString().padStart(2, '0')}/${(m + 1).toString().padStart(2, '0')}/${y}`;
            const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
            const isWeekend = WEEKEND_IDX.includes(new Date(y, m, d).getDay());

            return (
              <CalendarDayCell
                key={d}
                day={d}
                data={calendarData[d]}
                dateStr={dateStr}
                isToday={isToday}
                isWeekend={isWeekend}
                dayTypeConfig={dayTypeConfig}
                dayTypes={dayTypes}
                handleDayTypeChange={handleDayTypeChange}
                onSelectDate={setSelectedDate}
              />
            );
          })}
        </div>
      </div>

      {/* Summary Footer */}
      <div className={`${styles.surface} rounded-sm border ${styles.border} shadow-sm p-2 px-3 flex flex-wrap gap-2 items-center`}>
        <span className={`text-[13px] font-bold mr-1 ${styles.textMuted}`}>สรุป:</span>
        {dayTypeConfig.map(dt => {
          const count = dayTypeCounts[dt.id] || 0;
          if (count === 0) return null;
          return (
            <div
              key={dt.id}
              className="flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[11px] font-bold"
              style={{
                backgroundColor: `rgba(${hexToRgb(dt.color)}, ${isDarkMode ? 0.15 : 0.05})`,
                borderColor: `rgba(${hexToRgb(dt.color)}, ${isDarkMode ? 0.3 : 0.2})`,
                color: dt.color,
              }}
            >
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: dt.color }} />
              <span>{dt.label} ({count})</span>
            </div>
          );
        })}
        <div className={`ml-auto text-[13px] font-bold px-2 py-0.5 rounded-sm ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
          {daysInMonth} วัน
        </div>
      </div>

      {selectedDate && (
        <DayDetailModal
          dateStr={selectedDate}
          transactions={transactions}
          categories={categories}
          onClose={() => setSelectedDate(null)}
          onSave={async (item) => { await onSaveTransaction(item); }}
          onDelete={(id) => { handleDeleteTransaction(id); }}
          paymentMethods={paymentMethods}
        />
      )}
    </div>
  );
}