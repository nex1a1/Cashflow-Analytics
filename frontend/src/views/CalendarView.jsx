// src/components/CalendarView.jsx
import { useMemo, useState } from 'react';
import DayDetailModal from '../components/DayDetailModal.jsx';
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
  const gapColor = isDarkMode ? 'bg-slate-700' : 'bg-slate-100';

  if (isReadOnlyView) {
    return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6">
        <div className={`flex flex-col items-center justify-center py-20 rounded-sm border-2 border-dashed h-[60vh] transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
          <CalendarDays className={`w-14 h-14 mb-3 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
          <p className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>ไม่สามารถแสดงปฏิทินได้</p>
          <p className={`text-sm px-6 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            กรุณาเปลี่ยนจาก <strong>{getFilterLabel(filterPeriod)}</strong> เป็น{' '}
            <strong className={isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}>รายเดือน</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6 space-y-3 max-w-screen-2xl mx-auto w-full">

      {/* Header */}
      <div className={`${surface} rounded-sm border ${border} shadow-sm p-3 md:p-4`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className={`text-xl font-black flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
              <CalendarIcon className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`} />
              {thaiMonths[m]} {y}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {monthInc > 0 && (
                <span className={`text-[12px] font-bold px-2 py-0.5 rounded-sm border ${isDarkMode ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800/50' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  ▲ {formatMoney(monthInc)} ฿
                </span>
              )}
              {monthExp > 0 && (
                <span className={`text-[12px] font-bold px-2 py-0.5 rounded-sm border ${isDarkMode ? 'bg-red-900/40 text-red-400 border-red-800/50' : 'bg-red-50 text-red-600 border-red-200'}`}>
                  ▼ {formatMoney(monthExp)} ฿
                </span>
              )}
              {(monthInc > 0 || monthExp > 0) && (
                <span className={`text-[12px] font-bold px-2 py-0.5 rounded-sm border ${monthNet >= 0 ? (isDarkMode ? 'bg-blue-900/40 text-blue-400 border-blue-800/50' : 'bg-blue-50 text-[#00509E] border-blue-200') : (isDarkMode ? 'bg-orange-900/40 text-orange-400 border-orange-800/50' : 'bg-orange-50 text-orange-600 border-orange-200')}`}>
                  คงเหลือ {formatMoney(monthNet)} ฿
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={prevMonth} disabled={!hasPrev} className={`p-1.5 rounded-sm border transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${isDarkMode ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-600'}`}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goToLatest} className={`px-3 py-1.5 rounded-sm border text-[12px] font-bold transition-all active:scale-95 ${isDarkMode ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-600'}`}>
              เดือนปัจจุบัน
            </button>
            <button onClick={nextMonth} disabled={!hasNext} className={`p-1.5 rounded-sm border transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${isDarkMode ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-600'}`}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className={`rounded-sm border ${border} shadow-sm overflow-hidden flex-1 flex flex-col`}>
        <div className={`grid grid-cols-7 ${surfaceAlt} border-b ${border}`}>
          {DAYS_LABEL.map((label, i) => (
            <div key={label} className={`py-2 text-center text-[15px] font-bold tracking-wide ${WEEKEND_IDX.includes(i) ? (isDarkMode ? 'text-red-400' : 'text-red-500') : textMuted}`}>
              {label}
            </div>
          ))}
        </div>

        <div className={`grid grid-cols-7 gap-[1px] ${gapColor} flex-1`}>
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className={`min-h-[120px] 2xl:min-h-[140px] ${surfaceAlt}`} />
          ))}

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
            else if (isWeekend && !hasData) cellBg = isDarkMode ? 'bg-slate-800/80' : 'bg-slate-50';

            return (
              <div
                key={d}
                className={`min-h-[120px] 2xl:min-h-[140px] flex flex-col relative group transition-colors duration-150 ${cellBg}`}
              >
                {isToday && (
                  <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-[#00509E] opacity-50 z-20" />
                )}

                <div className={`flex items-center justify-between px-1.5 py-1 shrink-0 border-b z-30 relative ${isDarkMode ? 'border-slate-700/60 bg-slate-800/80' : 'border-slate-100 bg-white'}`}>
                  <span className={`text-[15px] font-black leading-none w-6 h-6 flex items-center justify-center rounded-sm shrink-0 ${
                    isToday
                      ? 'bg-[#00509E] text-white'
                      : isWeekend
                        ? (isDarkMode ? 'text-red-400 bg-red-900/20' : 'text-red-500 bg-red-50')
                        : (isDarkMode ? 'text-slate-200' : 'text-slate-700')
                  }`}>
                    {d}
                  </span>

                  <select
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

                <div 
                  onClick={() => setSelectedDate(dateStr)}
                  className={`flex flex-col flex-grow gap-1 p-1.5 overflow-hidden cursor-pointer z-10 ${!isToday && (isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-blue-50/40')}`}
                >
                  <div className="flex justify-between items-baseline mb-0.5">
                     {data.exp > 0 ? (
                      <div className={`text-[13px] font-black leading-none ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                        {Math.round(data.exp).toLocaleString('th-TH')}
                      </div>
                     ) : <div/>}
                     {data.inc > 0 && (
                      <div className={`text-[13px] font-bold leading-none ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        +{Math.round(data.inc).toLocaleString('th-TH')}
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
                        <span className="text-[12px] font-bold shrink-0 ml-1 opacity-70" style={{ color }}>{Math.round(tx.amount).toLocaleString('th-TH')}</span>
                      </div>
                    );
                  })}

                  {(data.items.length > 4 || data.incItems?.length > 1) && (
                    <div className="mt-auto pt-1 flex justify-between">
                       {data.items.length > 4 && <span className={`text-[11px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>+{data.items.length - 4} จ่าย</span>}
                       {data.incItems?.length > 1 && <span className={`text-[11px] font-bold text-right flex-1 ${isDarkMode ? 'text-emerald-700' : 'text-emerald-400'}`}>+{data.incItems.length - 1} รับ</span>}
                    </div>
                  )}

                  <div className={`absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none ${isDarkMode ? 'bg-slate-900/20' : 'bg-blue-50/30'}`}>
                    <div className="bg-[#00509E] text-white p-1.5 rounded-sm shadow-sm scale-90 group-hover:scale-100 transition-transform duration-150">
                      <PlusCircle className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Footer */}
      <div className={`${surface} rounded-sm border ${border} shadow-sm p-2 px-3 flex flex-wrap gap-2 items-center`}>
        <span className={`text-[13px] font-bold mr-1 ${textMuted}`}>สรุป:</span>
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