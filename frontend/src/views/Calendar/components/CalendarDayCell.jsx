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
  dayTypeConfig, dayType, handleDayTypeChange, onSelectDate
}) {
  const isDarkMode = true;

  const typeConf = useMemo(() => {
    return dayTypeConfig.find(dt => dt.id === dayType) || dayTypeConfig[0];
  }, [dayType, dayTypeConfig]);

  const cellBg = useMemo(() => {
    if (isToday) return 'bg-red-950/10 ring-1 ring-inset ring-[#da291c]/50 z-20';
    if (isWeekend && !(data.inc > 0 || data.exp > 0)) return 'bg-[#121212]/50';
    return 'bg-[#181818]';
  }, [isToday, isWeekend, data]);

  const hiddenExpItems = data.items.slice(3);
  const hiddenIncItems = data.incItems?.slice(1) || [];
  const hasHidden = hiddenExpItems.length > 0 || hiddenIncItems.length > 0;

  return (
    <div 
      onClick={() => onSelectDate(dateStr)}
      className={`min-h-[120px] 2xl:min-h-[145px] flex flex-col relative group cursor-pointer select-none border-b border-[#303030]/20 ${cellBg} hover:bg-[#1c1c1c] transition-colors duration-100`}
    >
      {isToday && (
        <>
          <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-[#da291c] opacity-45 z-20" />
          <div className="absolute top-0 inset-x-0 h-[2.5px] pointer-events-none z-30 bg-[#da291c]" />
        </>
      )}

      {/* Header ของแต่ละวัน (วันที่ + ตัวเลือกประเภทวัน) */}
      <div className="flex items-center justify-between px-2 py-1.5 shrink-0 border-b z-30 relative border-[#303030]/20 bg-[#121212]/30 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <span className={`text-[12px] font-black leading-none w-5 h-5 flex items-center justify-center rounded-none shrink-0 ${
            isToday
              ? 'bg-[#da291c] text-white shadow-sm font-black'
              : isWeekend
                ? 'text-red-400 bg-red-950/20 font-bold'
                : 'text-slate-200 bg-[#121212]/40 font-bold'
          }`}>
            {day}
          </span>
          <PlusCircle className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 pointer-events-none text-[#da291c]" />
        </div>

        <select
          onClick={(e) => e.stopPropagation()} 
          value={dayType}
          onChange={e => handleDayTypeChange(dateStr, e.target.value)}
          className="day-type-badge text-[10px] font-black px-1.5 py-0.5 rounded-none cursor-pointer outline-none appearance-none text-center border shadow-sm transition-all duration-100"
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
      <div className="flex flex-col flex-grow gap-1 p-2 overflow-hidden z-10">
        {(data.exp > 0 || data.inc > 0) && (
          <div className="flex justify-between items-center mb-0.5 text-[11px] font-black border-b border-[#303030]/10 pb-0.5">
             {data.exp > 0 ? (
              <span className="text-red-400">
                {formatValue(data.exp)} ฿
              </span>
             ) : <span />}
             {data.inc > 0 && (
              <span className="text-emerald-400">
                +{formatValue(data.inc)} ฿
              </span>
            )}
          </div>
        )}

        {/* Render Income Transaction */}
        {data.incItems?.slice(0, 1).map(tx => {
          const color = tx._catObj?.color || '#10b981';
          return (
            <div 
              key={tx.id} 
              className="flex items-center gap-1.5 overflow-hidden text-[11px] leading-tight py-0.5 group/tx" 
              title={`${tx.description} — ${formatMoney(tx.amount)} ฿`}
            >
              <div className="w-[2.5px] h-3 rounded-none shrink-0" style={{ backgroundColor: color }} />
              <span className="truncate font-medium text-slate-200 flex-1 group-hover/tx:text-white transition-colors duration-100">
                {tx.description || tx.category}
              </span>
              <span className="font-bold shrink-0 ml-1 text-emerald-400">
                +{formatValue(tx.amount)}
              </span>
            </div>
          );
        })}

        {/* Render Expense Transactions */}
        {data.items.slice(0, 3).map(tx => {
          const color = tx._catObj?.color || '#cbd5e1';
          return (
            <div 
              key={tx.id} 
              className="flex items-center gap-1.5 overflow-hidden text-[11px] leading-tight py-0.5 group/tx" 
              title={`${tx.description} — ${formatMoney(tx.amount)} ฿`}
            >
              <div className="w-[2.5px] h-3 rounded-none shrink-0" style={{ backgroundColor: color }} />
              <span className="truncate font-medium text-slate-350 flex-1 group-hover/tx:text-white transition-colors duration-100">
                {tx.description || tx.category}
              </span>
              <span className="font-bold shrink-0 ml-1 text-red-400">
                {formatValue(tx.amount)}
              </span>
            </div>
          );
        })}

        {hasHidden && (
          <div className="mt-auto pt-1 flex justify-between items-center text-[9px] font-black tracking-wider uppercase border-t border-[#303030]/20 bg-[#121212]/30 px-1 py-0.5 rounded-none">
             {hiddenExpItems.length > 0 && (
               <span className="text-red-400/80">
                 +{hiddenExpItems.length} EXP
               </span>
             )}
             {hiddenIncItems.length > 0 && (
               <span className="text-emerald-400/80 text-right flex-1">
                 +{hiddenIncItems.length} INC
               </span>
             )}
          </div>
        )}
      </div>
    </div>
  );
});

export default CalendarDayCell;

