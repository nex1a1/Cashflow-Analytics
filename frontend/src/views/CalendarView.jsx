// src/views/CalendarView.jsx
import { useMemo, useState } from 'react';
import DayDetailModal from '../components/DayDetailModal';
import {
  CalendarDays, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight, PlusCircle,
} from 'lucide-react';
import { formatMoney } from '../utils/formatters';
import { hexToRgb } from '../utils/formatters';

export default function CalendarView({
  transactions, filterPeriod, setFilterPeriod, rawAvailableMonths,
  handleOpenAddModal, categories, isDarkMode, dayTypes,
  handleDayTypeChange, dayTypeConfig, getFilterLabel, isReadOnlyView,
  handleDeleteTransaction, onSaveTransaction,paymentMethods
}) {
  const [selectedDate, setSelectedDate] = useState(null);

  // ── Hooks ต้องอยู่ก่อน early return ทั้งหมด ──
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

  const calendarData = useMemo(() => {
    let dayData = {};
    for (let i = 1; i <= daysInMonth; i++) {
      dayData[i] = { inc: 0, exp: 0, items: [], incItems: [] };
    }
    transactions.forEach(t => {
      const parts = t.date.split('/');
      if (parts.length === 3) {
        const txY = parseInt(parts[2]);
        const txM = parseInt(parts[1]) - 1;
        const txD = parseInt(parts[0]);
        if (txY === y && txM === m && dayData[txD]) {
          const catObj = categories.find(c => c.name === t.category);
          const amt = parseFloat(t.amount) || 0;
          if (catObj?.type === 'income') {
            dayData[txD].inc += amt;
            dayData[txD].incItems.push({ ...t, _catObj: catObj });
          } else {
            dayData[txD].exp += amt;
            dayData[txD].items.push({ ...t, _catObj: catObj });
          }
        }
      }
    });
    for (let i = 1; i <= daysInMonth; i++) {
      dayData[i].items.sort((a, b) => b.amount - a.amount);
      dayData[i].incItems.sort((a, b) => b.amount - a.amount);
    }
    return dayData;
  }, [transactions, y, m, daysInMonth, categories]);

  const dayTypeCounts = {};
  dayTypeConfig.forEach(dt => { dayTypeCounts[dt.id] = 0; });
  const blanks = Array(firstDayOfMonth).fill(null);
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  dayCells.forEach(d => {
    const dateStr = `${d.toString().padStart(2, '0')}/${(m + 1).toString().padStart(2, '0')}/${y}`;
    const dow = new Date(y, m, d).getDay();
    const def = (dow === 0 || dow === 6) ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
    const cur = dayTypes[dateStr] || def;
    if (cur) dayTypeCounts[cur] = (dayTypeCounts[cur] || 0) + 1;
  });

  const currentIndex = rawAvailableMonths.indexOf(filterPeriod);
  const hasPrev = currentIndex < rawAvailableMonths.length - 1;
  const hasNext = currentIndex > 0;
  const prevMonth = () => { if (hasPrev) setFilterPeriod(rawAvailableMonths[currentIndex + 1]); };
  const nextMonth = () => { if (hasNext) setFilterPeriod(rawAvailableMonths[currentIndex - 1]); };
  const goToLatest = () => { if (rawAvailableMonths.length > 0) setFilterPeriod(rawAvailableMonths[0]); };

  const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const today = new Date();

  const monthInc = dayCells.reduce((s, d) => s + calendarData[d].inc, 0);
  const monthExp = dayCells.reduce((s, d) => s + calendarData[d].exp, 0);
  const monthNet = monthInc - monthExp;

  const DAYS_LABEL = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const WEEKEND_IDX = [0, 6];

  const surface = isDarkMode ? 'bg-slate-900' : 'bg-white';
  const surfaceAlt = isDarkMode ? 'bg-slate-800' : 'bg-slate-50';
  const border = isDarkMode ? 'border-slate-700' : 'border-slate-200';
  const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const gapColor = isDarkMode ? 'bg-slate-700' : 'bg-slate-200';

  // Early return หลัง hooks ทั้งหมด ไม่ทำให้ Rules of Hooks พัง
  if (isReadOnlyView) {
    return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        <div className={`flex flex-col items-center justify-center py-32 rounded-2xl border-2 border-dashed h-[65vh] transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
          <CalendarDays className={`w-16 h-16 mb-4 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
          <p className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>ไม่สามารถแสดงปฏิทินได้</p>
          <p className={`text-sm px-6 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            กรุณาเปลี่ยนจาก <strong>{getFilterLabel(filterPeriod)}</strong> เป็น{' '}
            <strong className={isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}>รายเดือน</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 space-y-4">

      {/* Header */}
      <div className={`${surface} rounded-2xl border ${border} shadow-sm p-4 md:p-5`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className={`text-2xl font-black flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
              <CalendarIcon className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`} />
              {thaiMonths[m]} {y}
            </h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {monthInc > 0 && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isDarkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                  ▲ {formatMoney(monthInc)} ฿
                </span>
              )}
              {monthExp > 0 && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isDarkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-50 text-red-600'}`}>
                  ▼ {formatMoney(monthExp)} ฿
                </span>
              )}
              {(monthInc > 0 || monthExp > 0) && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${monthNet >= 0 ? (isDarkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-[#00509E]') : (isDarkMode ? 'bg-orange-900/40 text-orange-400' : 'bg-orange-50 text-orange-600')}`}>
                  คงเหลือ {formatMoney(monthNet)} ฿
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={prevMonth} disabled={!hasPrev} className={`p-2 rounded-xl border transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${isDarkMode ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-600'}`}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={goToLatest} className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all active:scale-95 ${isDarkMode ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-600'}`}>
              เดือนล่าสุด
            </button>
            <button onClick={nextMonth} disabled={!hasNext} className={`p-2 rounded-xl border transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${isDarkMode ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-600'}`}>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className={`rounded-2xl border ${border} shadow-sm overflow-hidden`}>

        {/* Day headers */}
        <div className={`grid grid-cols-7 ${surfaceAlt} border-b ${border}`}>
          {DAYS_LABEL.map((label, i) => (
            <div key={label} className={`py-3 text-center text-sm font-bold tracking-wide ${WEEKEND_IDX.includes(i) ? (isDarkMode ? 'text-red-400' : 'text-red-500') : textMuted}`}>
              {label}
            </div>
          ))}
        </div>

        {/* Grid body */}
        <div className={`grid grid-cols-7 gap-[1px] ${gapColor}`}>

          {/* Blanks */}
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className={`min-h-[180px] md:min-h-[210px] ${surfaceAlt}`} />
          ))}

          {/* Day cells */}
          {dayCells.map(d => {
            const data = calendarData[d];
            const hasData = data.inc > 0 || data.exp > 0 || data.incItems?.length > 0;
            const dateStr = `${d.toString().padStart(2, '0')}/${(m + 1).toString().padStart(2, '0')}/${y}`;
            const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
            const dow = new Date(y, m, d).getDay();
            const isWeekend = WEEKEND_IDX.includes(dow);

            const defType = isWeekend ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
            const curType = dayTypes[dateStr] || defType;
            const typeConf = dayTypeConfig.find(dt => dt.id === curType) || dayTypeConfig[0];

            let cellBg = isDarkMode ? 'bg-slate-800' : 'bg-white';
            if (isToday) cellBg = isDarkMode ? 'bg-blue-950' : 'bg-blue-50';
            else if (isWeekend && !hasData) cellBg = isDarkMode ? 'bg-slate-800/60' : 'bg-slate-50/70';

            return (
              <div
                key={d}
                onClick={() => setSelectedDate(dateStr)}
                className={`min-h-[180px] md:min-h-[210px] p-2.5 flex flex-col relative cursor-pointer group transition-colors duration-150 ${cellBg} ${!isToday && (isDarkMode ? 'hover:bg-slate-700/60' : 'hover:bg-blue-50/40')}`}
              >
                {/* Today ring */}
                {isToday && (
                  <div className="absolute inset-0 pointer-events-none ring-2 ring-inset ring-[#00509E] rounded-[1px] opacity-50" />
                )}

                {/* Cell header */}
                <div className="flex items-start justify-between mb-1.5 shrink-0">
                  <span className={`text-base md:text-lg font-black leading-none w-8 h-8 flex items-center justify-center rounded-full shrink-0 ${
                    isToday
                      ? 'bg-[#00509E] text-white'
                      : isWeekend
                        ? (isDarkMode ? 'text-red-400' : 'text-red-500')
                        : (isDarkMode ? 'text-slate-200' : 'text-slate-700')
                  }`}>
                    {d}
                  </span>

                  <div onClick={e => e.stopPropagation()}>
                    <select
                      value={curType}
                      onChange={e => handleDayTypeChange(dateStr, e.target.value)}
                      className="day-type-badge text-[10px] md:text-[11px] font-bold px-1.5 py-0.5 rounded-full cursor-pointer outline-none appearance-none text-center border transition-colors"
                      style={{
                        backgroundColor: `rgba(${hexToRgb(typeConf?.color)}, ${isDarkMode ? 0.18 : 0.1})`,
                        borderColor: `rgba(${hexToRgb(typeConf?.color)}, ${isDarkMode ? 0.35 : 0.22})`,
                        color: typeConf?.color || '#64748b',
                        filter: isDarkMode ? 'brightness(1.3)' : 'brightness(0.72)',
                      }}
                    >
                      {dayTypeConfig.map(dt => (
                        <option key={dt.id} value={dt.id} style={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', color: isDarkMode ? '#f8fafc' : '#1e293b' }}>
                          {dt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-grow gap-1.5 overflow-hidden">

                  {data.exp > 0 && (
                    <div className={`text-sm md:text-base font-black leading-tight ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                      ฿{Math.round(data.exp).toLocaleString('th-TH')}
                    </div>
                  )}

                  {data.inc > 0 && (
                    <div className={`text-xs md:text-sm font-bold leading-tight ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      +{Math.round(data.inc).toLocaleString('th-TH')}
                    </div>
                  )}

                  {/* Income items */}
                  {data.incItems?.slice(0, 2).map(tx => {
                    const color = tx._catObj?.color || '#10b981';
                    return (
                      <div key={tx.id} className="flex items-center gap-1 overflow-hidden" title={`${tx.description} — ${formatMoney(tx.amount)} ฿`}>
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span
                          className="truncate text-[11px] md:text-xs font-medium leading-tight flex-1 min-w-0"
                          style={{ color, filter: isDarkMode ? 'brightness(1.35) saturate(1.1)' : 'brightness(0.65)' }}
                        >
                          {tx.description || tx.category}
                        </span>
                        <span
                          className="text-[10px] md:text-[11px] font-black shrink-0 ml-1"
                          style={{ color, filter: isDarkMode ? 'brightness(1.35) saturate(1.1)' : 'brightness(0.65)' }}
                        >
                          {Math.round(tx.amount).toLocaleString('th-TH')}
                        </span>
                      </div>
                    );
                  })}

                  {/* Divider between income and expense items */}
                  {data.incItems?.length > 0 && data.items?.length > 0 && (
                    <div className={`w-full h-px my-0.5 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`} />
                  )}

                  {/* Top 5 */}
                  {data.items.slice(0, 5).map(tx => {
                    const color = tx._catObj?.color || '#94a3b8';
                    return (
                      <div key={tx.id} className="flex items-center gap-1 overflow-hidden" title={`${tx.description} — ${formatMoney(tx.amount)} ฿`}>
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span
                          className="truncate text-[11px] md:text-xs font-medium leading-tight flex-1 min-w-0"
                          style={{ color, filter: isDarkMode ? 'brightness(1.35) saturate(1.1)' : 'brightness(0.65)' }}
                        >
                          {tx.description || tx.category}
                        </span>
                        <span
                          className="text-[10px] md:text-[11px] font-black shrink-0 ml-1"
                          style={{ color, filter: isDarkMode ? 'brightness(1.35) saturate(1.1)' : 'brightness(0.65)' }}
                        >
                          {Math.round(tx.amount).toLocaleString('th-TH')}
                        </span>
                      </div>
                    );
                  })}

                  {data.items.length > 5 && (
                    <span className={`text-[11px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      +{data.items.length - 5} รายการ
                    </span>
                  )}
                  {data.incItems?.length > 2 && (
                    <span className={`text-[11px] font-bold ${isDarkMode ? 'text-emerald-700' : 'text-emerald-400'}`}>
                      +{data.incItems.length - 2} รายรับ
                    </span>
                  )}
                </div>

                {/* Hover overlay */}
                <div className={`absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none ${isDarkMode ? 'bg-slate-900/50' : 'bg-white/50'}`}>
                  <div className="bg-[#00509E] text-white p-2 rounded-full shadow-lg scale-90 group-hover:scale-100 transition-transform duration-150">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Type Summary */}
      <div className={`${surface} rounded-2xl border ${border} shadow-sm p-3 flex flex-wrap gap-2 items-center`}>
        <span className={`text-xs font-bold mr-1 ${textMuted}`}>สรุปเดือนนี้:</span>
        {dayTypeConfig.map(dt => {
          const count = dayTypeCounts[dt.id] || 0;
          if (count === 0) return null;
          return (
            <div
              key={dt.id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold"
              style={{
                backgroundColor: `rgba(${hexToRgb(dt.color)}, ${isDarkMode ? 0.15 : 0.08})`,
                borderColor: `rgba(${hexToRgb(dt.color)}, ${isDarkMode ? 0.3 : 0.2})`,
                color: dt.color,
                filter: isDarkMode ? 'brightness(1.3)' : 'brightness(0.7)',
              }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dt.color, filter: 'none' }} />
              <span style={{ filter: 'inherit' }}>{dt.label} ({count})</span>
            </div>
          );
        })}
        <div className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
          {daysInMonth} วัน
        </div>
      </div>

    {/* Day Detail Modal */}
    {selectedDate && (
      <DayDetailModal
        dateStr={selectedDate}
        transactions={transactions}
        categories={categories}
        isDarkMode={isDarkMode}
        onClose={() => setSelectedDate(null)}
        onSave={async (item) => { await onSaveTransaction(item); }}
        onDelete={(id) => { handleDeleteTransaction(id); }}
        paymentMethods={paymentMethods}
      />
    )}
    </div>
  );
}