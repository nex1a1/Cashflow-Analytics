import { useMemo, memo } from 'react';
import { PlusCircle } from 'lucide-react';
import { formatMoney, hexToRgb } from '../../../utils/formatters';

const formatValue = (val) => {
  return val.toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

const CalendarDayCell = memo(function CalendarDayCell({ 
  day, data, dateStr, isToday, isWeekend, 
  dayTypeConfig, dayType, handleDayTypeChange, onSelectDate,
  maxDailyExpense = 0
}) {
  const isDarkMode = true;

  const typeConf = useMemo(() => {
    return dayTypeConfig.find(dt => dt.id === dayType) || dayTypeConfig[0];
  }, [dayType, dayTypeConfig]);

  const burnIntensity = useMemo(() => {
    if (!maxDailyExpense || maxDailyExpense <= 0 || !data.exp || data.exp <= 0) return 0;
    return data.exp / maxDailyExpense;
  }, [data.exp, maxDailyExpense]);

  const cellBg = useMemo(() => {
    if (isToday) return 'bg-red-950/10 ring-1 ring-inset ring-[#da291c]/50 z-20';
    if (burnIntensity >= 0.75) {
      // Peak Burn Tier: Rosso Corsa glow with top highlight
      return 'bg-[#221313] border-t-2 !border-t-[#da291c]';
    }
    if (burnIntensity >= 0.40) {
      // Medium Burn Tier: Warm amber tint with subtle top highlight
      return 'bg-[#1e1915] border-t !border-t-amber-500/40';
    }
    if (isWeekend && !(data.inc > 0 || data.exp > 0)) return 'bg-[#121212]';
    return 'bg-[#181818]';
  }, [isToday, isWeekend, data, burnIntensity]);

  const displayedInc = useMemo(() => data.incItems?.slice(0, 1) || [], [data.incItems]);
  const hiddenIncItems = useMemo(() => data.incItems?.slice(1) || [], [data.incItems]);

  const maxExp = useMemo(() => (displayedInc.length > 0 ? 3 : 4), [displayedInc]);
  const displayedExp = useMemo(() => data.items.slice(0, maxExp), [data.items, maxExp]);
  const hiddenExpItems = useMemo(() => data.items.slice(maxExp), [data.items, maxExp]);

  return (
    <div 
      className={`min-h-[120px] 2xl:min-h-[145px] flex flex-col relative group select-none border-b border-[#2d2d2d]/30 ${cellBg} hover:bg-[#1d1d1d] transition-none`}
    >
      {isToday && (
        <>
          <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-[#da291c] opacity-45 z-20" />
          <div className="absolute top-0 inset-x-0 h-[2.5px] pointer-events-none z-30 bg-[#da291c]" />
        </>
      )}

      {/* Header ของแต่ละวัน (วันที่ + ตัวเลือกประเภทวัน) */}
      <div className="flex items-center justify-between px-2 py-1.5 shrink-0 border-b z-30 relative border-[#2d2d2d]/30 bg-[#121212]">
        <button
          type="button"
          onClick={() => onSelectDate(dateStr)}
          aria-label={`เลือกวันที่ ${day} ${dateStr}`}
          className="flex items-center gap-1.5 cursor-pointer bg-transparent border-0 p-0 text-left"
        >
          <span className={`text-[12px] font-black leading-none w-5 h-5 flex items-center justify-center rounded-none shrink-0 tabular-nums font-mono ${
            isToday
              ? 'bg-[#da291c] text-white font-black'
              : isWeekend
                ? 'text-red-400 bg-red-950/30 font-bold'
                : 'text-slate-200 bg-[#1a1a1a] font-bold'
          }`}>
            {day}
          </span>
          <PlusCircle className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 pointer-events-none text-[#da291c]" />
        </button>

        <select
          onClick={(e) => e.stopPropagation()} 
          value={dayType}
          onChange={e => handleDayTypeChange(dateStr, e.target.value)}
          className="day-type-badge text-[10px] font-black px-1.5 py-0.5 rounded-none cursor-pointer outline-none appearance-none text-center border transition-none"
          style={{
            backgroundColor: `rgba(${hexToRgb(typeConf?.color)}, 0.08)`,
            borderColor: `rgba(${hexToRgb(typeConf?.color)}, 0.25)`,
            color: typeConf?.color || '#64748b',
          }}
        >
          {dayTypeConfig.map(dt => (
            <option key={dt.id} value={dt.id} style={{ backgroundColor: '#181818', color: '#ffffff' }}>
              {dt.label}
            </option>
          ))}
        </select>
      </div>

      {/* ส่วนแสดงรายการธุรกรรม */}
      <button 
        type="button"
        onClick={() => onSelectDate(dateStr)}
        aria-label={`ดูรายการวันที่ ${day} ${dateStr}`}
        className="flex flex-col flex-grow gap-1 p-2 overflow-hidden z-10 text-left w-full cursor-pointer bg-transparent border-0 font-normal select-none"
      >
        {(data.exp > 0 || data.inc > 0) && (
          <div className="flex justify-between items-center mb-0.5 text-[11px] font-black border-b border-[#2d2d2d]/20 pb-0.5">
             {data.exp > 0 ? (
              <span className="text-red-400 tabular-nums font-mono flex items-center gap-1">
                {formatValue(data.exp)} ฿
                {hiddenExpItems.length > 0 && (
                  <span 
                    className="text-[9px] px-1 py-0.2 rounded-none font-black tracking-normal border tabular-nums font-mono shrink-0 select-none"
                    style={{
                      backgroundColor: 'rgba(218, 41, 28, 0.08)',
                      borderColor: 'rgba(218, 41, 28, 0.25)',
                      color: '#f87171',
                    }}
                    title={`มีรายการจ่ายซ่อนอยู่อีก ${hiddenExpItems.length} รายการ`}
                  >
                    +{hiddenExpItems.length}
                  </span>
                )}
              </span>
             ) : <span />}
             {data.inc > 0 && (
              <span className="text-emerald-400 tabular-nums font-mono flex items-center gap-1">
                {hiddenIncItems.length > 0 && (
                  <span 
                    className="text-[9px] px-1 py-0.2 rounded-none font-black tracking-normal border tabular-nums font-mono shrink-0 select-none"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                      borderColor: 'rgba(16, 185, 129, 0.25)',
                      color: '#34d399',
                    }}
                    title={`มีรายรับซ่อนอยู่อีก ${hiddenIncItems.length} รายการ`}
                  >
                    +{hiddenIncItems.length}
                  </span>
                )}
                +{formatValue(data.inc)} ฿
              </span>
            )}
          </div>
        )}

        {/* Render Income Transaction */}
        {displayedInc.map(tx => {
          const color = tx._catObj?.color || '#10b981';
          return (
            <div 
              key={tx.id} 
              className="flex items-center gap-1.5 overflow-hidden text-[11px] leading-tight py-0.5 group/tx" 
              title={`${tx.description} — ${formatMoney(tx.amount)} ฿`}
            >
              <div className="w-[2.5px] h-3 rounded-none shrink-0" style={{ backgroundColor: color }} />
              <span className="truncate font-medium text-slate-200 flex-1 group-hover/tx:text-white transition-none">
                {tx.description || tx.category}
              </span>
              <span className="font-bold shrink-0 ml-1 text-emerald-400 tabular-nums font-mono">
                +{formatValue(tx.amount)}
              </span>
            </div>
          );
        })}

        {/* Render Expense Transactions */}
        {displayedExp.map(tx => {
          const color = tx._catObj?.color || '#cbd5e1';
          return (
            <div 
              key={tx.id} 
              className="flex items-center gap-1.5 overflow-hidden text-[11px] leading-tight py-0.5 group/tx" 
              title={`${tx.description} — ${formatMoney(tx.amount)} ฿`}
            >
              <div className="w-[2.5px] h-3 rounded-none shrink-0" style={{ backgroundColor: color }} />
              <span className="truncate font-medium text-slate-300 flex-1 group-hover/tx:text-white transition-none">
                {tx.description || tx.category}
              </span>
              <span className="font-bold shrink-0 ml-1 text-red-400 tabular-nums font-mono">
                {formatValue(tx.amount)}
              </span>
            </div>
          );
        })}
      </button>
    </div>
  );
});

export default CalendarDayCell;

