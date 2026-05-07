import { useMemo } from 'react';
import { PlusCircle } from 'lucide-react';
import { formatMoney, hexToRgb } from '../../../utils/formatters';
import { useTheme } from '../../../context/ThemeContext';

const formatValue = (val) => {
  return val.toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

export default function CalendarDayCell({ 
  day, data, dateStr, isToday, isWeekend, 
  dayTypeConfig, dayTypes, handleDayTypeChange, onSelectDate
}) {
  const { isDarkMode } = useTheme();
  const defType = useMemo(() => {
    return isWeekend ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
  }, [isWeekend, dayTypeConfig]);

  const curType = dayTypes[dateStr] || defType;
  const typeConf = dayTypeConfig.find(dt => dt.id === curType) || dayTypeConfig[0];

  const cellBg = useMemo(() => {
    if (isToday) return isDarkMode ? 'bg-blue-950' : 'bg-blue-50';
    if (isWeekend && !(data.inc > 0 || data.exp > 0)) return isDarkMode ? 'bg-slate-800/80' : 'bg-slate-50';
    return isDarkMode ? 'bg-slate-800' : 'bg-white';
  }, [isToday, isWeekend, data, isDarkMode]);

  const hiddenExpItems = data.items.slice(4);
  const hiddenIncItems = data.incItems?.slice(1) || [];
  const hasHidden = hiddenExpItems.length > 0 || hiddenIncItems.length > 0;

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

        {hasHidden && (
          <div className="mt-auto pt-1 flex justify-between">
             {hiddenExpItems.length > 0 && <span className={`text-[11px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>+{hiddenExpItems.length} จ่าย</span>}
             {hiddenIncItems.length > 0 && <span className={`text-[11px] font-bold text-right flex-1 ${isDarkMode ? 'text-emerald-700' : 'text-emerald-400'}`}>+{hiddenIncItems.length} รับ</span>}
          </div>
        )}
      </div>
    </div>
  );
}
