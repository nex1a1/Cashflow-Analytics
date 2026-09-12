import { memo } from 'react';
import { PlusCircle } from 'lucide-react';
import { formatMoney, formatAmount, hexToRgb } from '../../../utils/formatters';
import { DayType, TransactionDisplay } from '../../../types';

export interface CalendarDayCellProps {
  day: number | string;
  data?: {
    exp: number;
    inc: number;
    items: TransactionDisplay[];
    incItems: TransactionDisplay[];
  };
  dateStr: string;
  isToday: boolean;
  isWeekend: boolean;
  dayTypeConfig: DayType[];
  dayType: string;
  handleDayTypeChange: (dateStr: string, value: string) => void;
  onSelectDate: (dateStr: string) => void;
  handleOpenAddModal?: (dateStr?: string, type?: string) => void;
  maxDailyExpense?: number;
}

const CalendarDayCell = memo(function CalendarDayCell({
  day, data, dateStr, isToday, isWeekend,
  dayTypeConfig, dayType, handleDayTypeChange, onSelectDate,
  handleOpenAddModal,
  maxDailyExpense = 0
}: CalendarDayCellProps): React.ReactElement {
  const cellData = data || { exp: 0, inc: 0, items: [], incItems: [] };
  const typeConf = dayTypeConfig.find(dt => dt.id === dayType) || dayTypeConfig[0];

  const burnIntensity = maxDailyExpense > 0 && cellData.exp > 0 ? cellData.exp / maxDailyExpense : 0;

  let cellBg = 'bg-[#181818]';
  if (isToday) {
    cellBg = 'bg-red-950/10 ring-1 ring-inset ring-[#da291c]/50 z-20';
  } else if (burnIntensity >= 0.75) {
    cellBg = 'bg-[#221313] border-t-2 !border-t-[#da291c]';
  } else if (burnIntensity >= 0.40) {
    cellBg = 'bg-[#1e1915] border-t !border-t-amber-500/40';
  } else if (isWeekend && !(cellData.inc > 0 || cellData.exp > 0)) {
    cellBg = 'bg-[#121212]';
  }

  const displayedInc = cellData.incItems.slice(0, 1);
  const hiddenIncCount = Math.max(0, cellData.incItems.length - 1);

  const maxExp = displayedInc.length > 0 ? 3 : 4;
  const displayedExp = cellData.items.slice(0, maxExp);
  const hiddenExpCount = Math.max(0, cellData.items.length - maxExp);

  let dayBadgeCls = 'text-slate-200 bg-[#1a1a1a] font-bold';
  if (isToday) {
    dayBadgeCls = 'bg-[#da291c] text-white font-black';
  } else if (isWeekend) {
    dayBadgeCls = 'text-red-400 bg-red-950/30 font-bold';
  }

  return (
    <div 
      onClick={() => onSelectDate(dateStr)}
      className={`min-h-[120px] 2xl:min-h-[145px] flex flex-col relative group select-none border-b border-[#2d2d2d]/30 ${cellBg} hover:bg-[#1d1d1d] cursor-pointer transition-none`}
    >
      {isToday && (
        <>
          <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-[#da291c] opacity-45 z-20" />
          <div className="absolute top-0 inset-x-0 h-[2.5px] pointer-events-none z-30 bg-[#da291c]" />
        </>
      )}

      {/* Header ของแต่ละวัน (วันที่ + ตัวเลือกประเภทวัน) */}
      <div className="flex items-center justify-between px-2 py-1.5 shrink-0 border-b z-30 relative border-[#2d2d2d]/30 bg-[#121212]">
        <div className="flex items-center gap-1.5">
          <span className={`text-[12px] font-black leading-none w-5 h-5 flex items-center justify-center rounded-none shrink-0 tabular-nums tracking-tight ${dayBadgeCls}`}>
            {day}
          </span>
          {handleOpenAddModal && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAddModal(dateStr);
              }}
              className="opacity-0 group-hover:opacity-100 text-[#da291c] hover:text-white transition-none cursor-pointer"
              title="เพิ่มรายการวันนี้"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        <select
          onClick={(e) => e.stopPropagation()} 
          value={dayType}
          onChange={e => {
            e.stopPropagation();
            handleDayTypeChange(dateStr, e.target.value);
          }}
          className="day-type-badge text-[10px] font-black px-1.5 py-0.5 rounded-none cursor-pointer outline-none appearance-none text-center border transition-none"
          style={{
            backgroundColor: `rgba(${hexToRgb(typeConf?.color)}, 0.08)`,
            borderColor: `rgba(${hexToRgb(typeConf?.color)}, 0.25)`,
            color: typeConf?.color || '#64748b',
          }}
          title="คลิกเพื่อเปลี่ยนประเภทวัน"
        >
          {dayTypeConfig.map(dt => (
            <option key={dt.id} value={dt.id} style={{ backgroundColor: '#181818', color: '#ffffff' }}>
              {dt.label}
            </option>
          ))}
        </select>
      </div>

      {/* ส่วนแสดงรายการธุรกรรม */}
      <div 
        className="flex flex-col flex-grow gap-1 p-2 overflow-hidden z-10 text-left w-full font-normal select-none"
      >
        {(cellData.exp > 0 || cellData.inc > 0) && (
          <div className="flex justify-between items-center mb-0.5 text-[11px] font-black border-b border-[#2d2d2d]/20 pb-0.5">
             {cellData.exp > 0 ? (
              <span className="text-red-400 tabular-nums tracking-tight flex items-center gap-1">
                {formatAmount(cellData.exp)} ฿
                {hiddenExpCount > 0 && (
                  <span 
                    className="text-[9px] px-1 py-0.2 rounded-none font-black tracking-normal border tabular-nums tracking-tight shrink-0 select-none"
                    style={{
                      backgroundColor: 'rgba(218, 41, 28, 0.08)',
                      borderColor: 'rgba(218, 41, 28, 0.25)',
                      color: '#f87171',
                    }}
                    title={`มีรายการจ่ายซ่อนอยู่อีก ${hiddenExpCount} รายการ`}
                  >
                    +{hiddenExpCount}
                  </span>
                )}
              </span>
             ) : <span />}
             {cellData.inc > 0 && (
              <span className="text-emerald-400 tabular-nums tracking-tight flex items-center gap-1">
                {hiddenIncCount > 0 && (
                  <span 
                    className="text-[9px] px-1 py-0.2 rounded-none font-black tracking-normal border tabular-nums tracking-tight shrink-0 select-none"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                      borderColor: 'rgba(16, 185, 129, 0.25)',
                      color: '#34d399',
                    }}
                    title={`มีรายรับซ่อนอยู่อีก ${hiddenIncCount} รายการ`}
                  >
                    +{hiddenIncCount}
                  </span>
                )}
                +{formatAmount(cellData.inc)} ฿
              </span>
            )}
          </div>
        )}

        {/* Render Income Transaction */}
        {displayedInc.map(tx => {
          const color = tx._catObj?.color || '#10b981';
          return (
            <div 
              key={`inc_${tx.id}`} 
              className="flex items-center gap-1.5 min-w-0 text-[11px] leading-tight py-0.5 group/tx" 
              title={`${tx.description} — ${formatMoney(tx.amount)} ฿`}
            >
              <div className="w-[3px] h-3.5 rounded-none shrink-0" style={{ backgroundColor: color }} />
              <span className="truncate font-medium text-slate-200 flex-1 group-hover/tx:text-white transition-none">
                {tx.description || tx.category}
              </span>
              <span className="font-bold shrink-0 ml-1 pr-0.5 text-emerald-400 tabular-nums tracking-tight">
                +{formatAmount(tx.amount)}
              </span>
            </div>
          );
        })}

        {/* Render Expense Transactions */}
        {displayedExp.map(tx => {
          const color = tx._catObj?.color || '#cbd5e1';
          return (
            <div 
              key={`exp_${tx.id}`} 
              className="flex items-center gap-1.5 min-w-0 text-[11px] leading-tight py-0.5 group/tx" 
              title={`${tx.description} — ${formatMoney(tx.amount)} ฿`}
            >
              <div className="w-[3px] h-3.5 rounded-none shrink-0" style={{ backgroundColor: color }} />
              <span className="truncate font-medium text-slate-300 flex-1 group-hover/tx:text-white transition-none">
                {tx.description || tx.category}
              </span>
              <span className="font-bold shrink-0 ml-1 pr-0.5 text-red-400 tabular-nums tracking-tight">
                {formatAmount(tx.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default CalendarDayCell;

