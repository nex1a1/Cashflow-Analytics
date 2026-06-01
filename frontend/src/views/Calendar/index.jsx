import { useMemo, useState, useEffect } from 'react';
import DayDetailModal from '../../components/modals/DayDetailModal/index';
import { CalendarDays, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { hexToRgb } from '../../utils/formatters';
import CalendarSkeleton from './components/CalendarSkeleton';
import CalendarDayCell from './components/CalendarDayCell';

const formatValue = (val) => {
  return val.toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

export default function CalendarView({
  transactions, filterPeriod, setFilterPeriod, rawAvailableMonths,
  handleOpenAddModal, categories, cashflowGroups, dayTypes,
  handleDayTypeChange, dayTypeConfig, getFilterLabel, isReadOnlyView,
  handleDeleteTransaction, onSaveTransaction, paymentMethods,
  isLoading, frequentItems = []
}) {
  const isDarkMode = true;
  const [selectedDate, setSelectedDate] = useState(null);
  
  // ── Logic: Smooth Loading Transition ───────────────────────
  const [showSkeleton, setShowSkeleton] = useState(isLoading);

  useEffect(() => {
    if (isLoading) {
      setShowSkeleton(true);
    } else {
      // Add a tiny delay to prevent the "flash" on ultra-fast local transitions
      const timer = setTimeout(() => setShowSkeleton(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const viewDate = useMemo(() => {
    if (filterPeriod && filterPeriod.match(/^\d{4}-\d{2}$/)) {
      const [yearStr, monthStr] = filterPeriod.split('-');
      return new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
    }
    return new Date();
  }, [filterPeriod]);

  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = new Date(y, m, 1).getDay();

  const suffixDaysCount = useMemo(() => {
    const totalCells = firstDayOfMonth + daysInMonth;
    const remainder = totalCells % 7;
    return remainder === 0 ? 0 : 7 - remainder;
  }, [firstDayOfMonth, daysInMonth]);

  const { dayData: calendarData, monthInc, monthExp } = useMemo(() => {
    let dayData = {};
    let tInc = 0, tExp = 0;
    
    for (let i = 1; i <= daysInMonth; i++) {
      dayData[i] = { inc: 0, exp: 0, items: [], incItems: [] };
    }

    const targetMonthYear = `${y}-${(m + 1).toString().padStart(2, '0')}`;

    transactions.forEach(t => {
      if (!t.date || !t.date.startsWith(targetMonthYear)) return;

      const txD = parseInt(t.date.split('-')[2], 10);
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
      const dateStr = `${y}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const dow = new Date(y, m, d).getDay();
      const isWeekend = dow === 0 || dow === 6;
      const def = isWeekend ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
      const cur = dayTypes[dateStr] || def;
      if (cur) counts[cur] = (counts[cur] || 0) + 1;
    }
    return counts;
  }, [dayTypes, daysInMonth, m, y, dayTypeConfig]);

  const activeCategories = useMemo(() => {
    const targetMonthYear = `${y}-${(m + 1).toString().padStart(2, '0')}`;
    const catsMap = new Map();
    
    transactions.forEach(t => {
      if (!t.date || !t.date.startsWith(targetMonthYear)) return;
      
      const catObj = categories.find(c => c.name === t.category);
      if (catObj) {
        catsMap.set(catObj.id, catObj);
      } else if (t.category) {
        catsMap.set(t.category, {
          id: t.category,
          name: t.category,
          color: '#94a3b8',
          type: 'expense'
        });
      }
    });
    
    return Array.from(catsMap.values()).sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'income' ? -1 : 1;
      }
      return a.name.localeCompare(b.name, 'th');
    });
  }, [transactions, y, m, categories]);

  const prevMonth = () => {
    const d = new Date(y, m - 1, 1);
    setFilterPeriod(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const d = new Date(y, m + 1, 1);
    setFilterPeriod(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
  };
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
    surface: 'bg-[#181818]',
    surfaceAlt: 'bg-[#121212]',
    border: 'border-[#2d2d2d]',
    textMuted: 'text-slate-400',
    gapColor: 'bg-[#2d2d2d]',
  };

  // ── Unified Render ──────────────────────────────────────────
  
  // 1. Calculate current month string for the "Switch" button
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

  // 2. Decide what the "Main Content" is
  let content = null;

  if (showSkeleton) {
    content = <CalendarSkeleton />;
  } else if (isReadOnlyView) {
    content = (
      <div className="flex flex-col h-full max-w-screen-2xl mx-auto w-full">
        <div className={`flex flex-col items-center justify-center py-20 rounded-none border-2 border-dashed h-[60vh] transition-colors ${'bg-[#121212] border-[#2d2d2d] text-slate-400'}`}>
          <div className={`p-4 rounded-none mb-4 ${styles.surfaceAlt} border border-[#2d2d2d]`}>
            <CalendarDays className={`w-12 h-12 ${'text-[#da291c]'}`} />
          </div>
          <p className={`text-xl font-bold mb-2 ${'text-slate-200'}`}>โหมดปฏิทินรองรับเฉพาะรายเดือน</p>
          <p className={`text-sm px-6 text-center max-w-md leading-relaxed mb-6 ${styles.textMuted}`}>
            ตอนนี้คุณกำลังดูข้อมูลแบบ <strong>{getFilterLabel(filterPeriod)}</strong><br/>
            ปฏิทินจะแสดงผลได้ดีที่สุดเมื่อดูเป็นรายเดือนครับ
          </p>
          <button 
            onClick={goToCurrentMonth}
            className="px-5 py-2.5 rounded-none text-sm font-bold bg-[#da291c] hover:bg-[#b01e0a] text-white transition-none"
          >
            สลับไปดูเดือนปัจจุบัน ({getFilterLabel(currentMonthStr)})
          </button>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="flex flex-col h-full space-y-3.5 w-full">
        {/* Header */}
        <div className={`${styles.surface} rounded-none border ${styles.border} p-4`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className={`text-xl font-black flex items-center gap-2 tracking-wide ${'text-slate-100'}`}>
                <CalendarIcon className={`w-5 h-5 ${'text-[#da291c]'}`} />
                {thaiMonths[m]} {y}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {monthInc > 0 && (
                  <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded-none border tabular-nums font-mono ${'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'}`}>
                    ▲ {formatValue(monthInc)} ฿
                  </span>
                )}
                {monthExp > 0 && (
                  <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded-none border tabular-nums font-mono ${'bg-red-950/40 text-red-400 border-red-800/40'}`}>
                    ▼ {formatValue(monthExp)} ฿
                  </span>
                )}
                {(monthInc > 0 || monthExp > 0) && (
                  <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded-none border tabular-nums font-mono ${monthNet >= 0 ? ('bg-yellow-500/10 text-yellow-450 border-yellow-500/20') : ('bg-rose-500/10 text-rose-450 border-rose-500/20')}`}>
                    คงเหลือ {formatValue(monthNet)} ฿
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={prevMonth} 
                className="p-1.5 rounded-none border disabled:opacity-30 disabled:cursor-not-allowed border-[#2d2d2d] bg-[#121212] hover:bg-[#1d1d1d] hover:border-[#da291c] text-slate-300 transition-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={goToCurrentMonth} 
                className="px-3 py-1.5 rounded-none border text-[12px] font-bold border-[#2d2d2d] bg-[#121212] hover:bg-[#1d1d1d] hover:border-[#da291c] text-slate-300 transition-none"
              >
                เดือนปัจจุบัน
              </button>
              <button 
                onClick={nextMonth} 
                className="p-1.5 rounded-none border disabled:opacity-30 disabled:cursor-not-allowed border-[#2d2d2d] bg-[#121212] hover:bg-[#1d1d1d] hover:border-[#da291c] text-slate-300 transition-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className={`rounded-none border ${styles.border} overflow-hidden flex-1 flex flex-col`}>
          <div className={`grid grid-cols-7 gap-[1px] bg-[#2d2d2d] border-b ${styles.border}`}>
            {DAYS_LABEL.map((label, i) => (
              <div key={label} className={`py-2 text-center text-[14px] font-black tracking-wider ${styles.surfaceAlt} ${WEEKEND_IDX.includes(i) ? ('text-red-400') : styles.textMuted}`}>
                {label}
              </div>
            ))}
          </div>

          <div className={`grid grid-cols-7 gap-[1px] ${styles.gapColor} flex-1`}>
            {Array(firstDayOfMonth).fill(null).map((_, i) => (
              <div 
                key={`blank-${i}`} 
                className={`min-h-[120px] 2xl:min-h-[140px] ${styles.surfaceAlt} ${
                  'bg-[radial-gradient(rgba(218,41,28,0.06)_1px,transparent_1px)] bg-[size:10px_10px] opacity-40'
                }`} 
              />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
              const dateStr = `${y}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
              const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
              const dow = new Date(y, m, d).getDay();
              const isWeekend = WEEKEND_IDX.includes(dow);
              const defType = isWeekend ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
              const dayType = dayTypes[dateStr] || defType;

              return (
                <CalendarDayCell
                  key={d}
                  day={d}
                  data={calendarData[d]}
                  dateStr={dateStr}
                  isToday={isToday}
                  isWeekend={isWeekend}
                  dayTypeConfig={dayTypeConfig}
                  dayType={dayType}
                  handleDayTypeChange={handleDayTypeChange}
                  onSelectDate={setSelectedDate}
                />
              );
            })}

            {Array.from({ length: suffixDaysCount }).map((_, i) => (
              <div 
                key={`suffix-blank-${i}`} 
                className={`min-h-[120px] 2xl:min-h-[140px] ${styles.surfaceAlt} ${
                  'bg-[radial-gradient(rgba(218,41,28,0.06)_1px,transparent_1px)] bg-[size:10px_10px] opacity-40'
                }`} 
              />
            ))}
          </div>
        </div>

        {/* Category Color Legend */}
        {activeCategories.length > 0 && (
          <div className={`${styles.surface} rounded-none border ${styles.border} p-3 px-4`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[12px] font-black text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-none bg-[#da291c] animate-pulse" />
                หมวดหมู่ธุรกรรมในเดือนนี้ (Category Colors)
              </span>
              <div className="h-[1px] bg-[#2d2d2d] flex-1 ml-1" />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {activeCategories.map(cat => {
                const color = cat.color || '#94a3b8';
                return (
                  <div 
                    key={cat.id} 
                    className="flex items-center gap-2 text-[12px] font-bold px-2 py-1 rounded-none border cursor-default select-none"
                    style={{
                      backgroundColor: `rgba(${hexToRgb(color)}, ${isDarkMode ? 0.08 : 0.03})`,
                      borderColor: `rgba(${hexToRgb(color)}, ${isDarkMode ? 0.25 : 0.15})`,
                      color: color,
                    }}
                  >
                    <div className="w-2.5 h-2.5 rounded-none shrink-0" style={{ backgroundColor: color }} />
                    <span className="opacity-90">{cat.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary Footer */}
        <div className={`${styles.surface} rounded-none border ${styles.border} p-3 px-4 flex flex-wrap gap-2.5 items-center`}>
          <span className={`text-[13px] font-bold mr-1 ${styles.textMuted}`}>สรุป:</span>
          {dayTypeConfig.map(dt => {
            const count = dayTypeCounts[dt.id] || 0;
            if (count === 0) return null;
            return (
              <div
                key={dt.id}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-none border text-[10px] font-black tracking-wider uppercase"
                style={{
                  backgroundColor: `rgba(${hexToRgb(dt.color)}, 0.08)`,
                  borderColor: `rgba(${hexToRgb(dt.color)}, 0.25)`,
                  color: dt.color,
                }}
              >
                <div className="w-2.5 h-2.5 rounded-none" style={{ backgroundColor: dt.color }} />
                <span>{dt.label} (<span className="tabular-nums font-mono">{count}</span>)</span>
              </div>
            );
          })}
          <div className="ml-auto text-[12px] font-black px-2.5 py-0.5 rounded-none border bg-[#121212] border-[#2d2d2d] text-slate-300 tabular-nums font-mono">
            {daysInMonth} วัน
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-6 w-full min-h-[600px]">
      {content}

      {selectedDate && (
        <DayDetailModal
          dateStr={selectedDate}
          transactions={transactions}
          categories={categories}
          cashflowGroups={cashflowGroups}
          onClose={() => setSelectedDate(null)}
          onSave={async (item) => { await onSaveTransaction(item); }}
          onDelete={(id) => { handleDeleteTransaction(id); }}
          paymentMethods={paymentMethods}
          frequentItems={frequentItems}
        />
      )}
    </div>
  );
}
