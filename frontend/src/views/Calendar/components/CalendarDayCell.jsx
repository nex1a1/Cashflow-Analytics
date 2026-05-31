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
  dayTypeConfig, dayTypes, handleDayTypeChange, onSelectDate
}) {
  const isDarkMode = true;
  const defType = useMemo(() => {
    return isWeekend ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
  }, [isWeekend, dayTypeConfig]);

  const curType = dayTypes[dateStr] || defType;
  const typeConf = dayTypeConfig.find(dt => dt.id === curType) || dayTypeConfig[0];

  const cellBg = useMemo(() => {
    if (isToday) return 'bg-red-950/20 ring-1 ring-inset ring-[#da291c]/60 z-20';
    if (isWeekend && !(data.inc > 0 || data.exp > 0)) return 'bg-[#121212]/70';
    return 'bg-[#181818]';
  }, [isToday, isWeekend, data, isDarkMode]);

  const hiddenExpItems = data.items.slice(4);
  const hiddenIncItems = data.incItems?.slice(1) || [];
  const hasHidden = hiddenExpItems.length > 0 || hiddenIncItems.length > 0;

  return (
    <div 
      onClick={() => onSelectDate(dateStr)}
      className={`min-h-[120px] 2xl:min-h-[140px] flex flex-col relative group group/cell cursor-pointer select-none ${cellBg} ${
        isToday 
          ? 'hover:bg-red-950/30 hover:shadow-[0_4px_25px_rgba(218,41,28,0.15)]' 
          : 'hover:bg-[#1c1c1c]/90 hover:shadow-[0_8px_30px_rgba(0,0,0,0.95)]'
      }`}
    >
      {isToday && (
        <>
          <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-[#da291c] opacity-50 z-20" />
          <div className="absolute top-0 inset-x-0 h-[3px] pointer-events-none z-30 bg-gradient-to-r from-[#da291c] via-[#b01e0a] to-[#fff200]" />
        </>
      )}

      {/* Header ของแต่ละวัน (วันที่ + ตัวเลือกประเภทวัน) */}
      <div className="flex items-center justify-between px-1.5 py-1 shrink-0 border-b z-30 relative transition-colors duration-200 border-[#303030]/60 bg-[#121212]/40 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <span className={`text-[14px] font-black leading-none w-6 h-6 flex items-center justify-center rounded-none shrink-0 ${
            isToday
              ? 'bg-[#da291c] text-white shadow-sm'
              : isWeekend
                ? ('text-red-400 bg-red-950/20')
                : 'text-slate-200 bg-[#121212]/30'
          }`}>
            {day}
          </span>
          <PlusCircle className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 pointer-events-none ${'text-[#da291c]'}`} />
        </div>

        <select
          onClick={(e) => e.stopPropagation()} 
          value={curType}
          onChange={e => handleDayTypeChange(dateStr, e.target.value)}
          className="day-type-badge text-[11px] font-bold px-1.5 py-0.5 rounded-none cursor-pointer outline-none appearance-none text-center border shadow-sm"
          style={{
            backgroundColor: `rgba(${hexToRgb(typeConf?.color)}, ${isDarkMode ? 0.18 : 0.05})`,
            borderColor: `rgba(${hexToRgb(typeConf?.color)}, ${isDarkMode ? 0.4 : 0.2})`,
            color: typeConf?.color || '#64748b',
          }}
        >
          {dayTypeConfig.map(dt => (
            <option key={dt.id} value={dt.id} style={{ backgroundColor: '#1c1c1c', color: '#ffffff' }}>
              {dt.label}
            </option>
          ))}
        </select>
      </div>

      {/* ส่วนแสดงรายการธุรกรรม */}
      <div 
        className="flex flex-col flex-grow gap-1 p-1.5 overflow-hidden z-10"
      >
        <div className="flex justify-between items-baseline mb-0.5">
           {data.exp > 0 ? (
            <div className={`text-[13px] font-black leading-none ${'text-red-400'}`}>
              {formatValue(data.exp)}
            </div>
           ) : <div/>}
           {data.inc > 0 && (
            <div className={`text-[13px] font-bold leading-none ${'text-emerald-400'}`}>
              +{formatValue(data.inc)}
            </div>
          )}
        </div>

        {data.incItems?.slice(0, 1).map(tx => {
          const color = tx._catObj?.color || '#10b981';
          return (
            <div key={tx.id} className="flex items-center gap-1 overflow-hidden opacity-90" title={`${tx.description} — ${formatMoney(tx.amount)} ฿`}>
              <div className="w-1.5 h-1.5 rounded-none shrink-0" style={{ backgroundColor: color }} />
              <span className="truncate text-[12px] font-semibold leading-tight flex-1" style={{ color }}>{tx.description || tx.category}</span>
            </div>
          );
        })}

        {data.items.slice(0, 4).map(tx => {
          const color = tx._catObj?.color || '#94a3b8';
          return (
            <div key={tx.id} className="flex items-center gap-1 overflow-hidden" title={`${tx.description} — ${formatMoney(tx.amount)} ฿`}>
              <div className="w-1.5 h-1.5 rounded-none shrink-0" style={{ backgroundColor: color }} />
              <span className="truncate text-[12px] font-semibold leading-tight flex-1" style={{ color }}>{tx.description || tx.category}</span>
              <span className="text-[12px] font-bold shrink-0 ml-1 opacity-70" style={{ color }}>
                {formatValue(tx.amount)}
              </span>
            </div>
          );
        })}

        {hasHidden && (
          <div className="mt-auto pt-1 flex justify-between">
             {hiddenExpItems.length > 0 && <span className={`text-[11px] font-bold ${'text-slate-500'}`}>+{hiddenExpItems.length} จ่าย</span>}
             {hiddenIncItems.length > 0 && <span className={`text-[11px] font-bold text-right flex-1 ${'text-emerald-700'}`}>+{hiddenIncItems.length} รับ</span>}
          </div>
        )}
      </div>
    </div>
  );
});

export default CalendarDayCell;
