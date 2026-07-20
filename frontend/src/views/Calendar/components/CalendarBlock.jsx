import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import CalendarDayCell from './CalendarDayCell';

const formatValue = (val) => {
  return val.toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

export default function CalendarBlock({
  y,
  m,
  daysInMonth,
  firstDayOfMonth,
  suffixDaysCount,
  monthInc,
  monthExp,
  monthNet,
  prevMonth,
  nextMonth,
  goToCurrentMonth,
  calendarData,
  dayTypes,
  dayTypeConfig,
  dayTypeCounts,
  handleDayTypeChange,
  onSelectDate,
  hexToRgb
}) {
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const DAYS_LABEL = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const WEEKEND_IDX = [0, 6];
  const today = new Date();

  return (
    <div className="flex flex-col space-y-3.5 w-full">
      {/* 1. Header (Navigation & Stats Summary) */}
      <div className="bg-[#181818] rounded-none border border-[#2d2d2d] p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black flex items-center gap-2 tracking-wide text-slate-100">
              <CalendarIcon className="w-5 h-5 text-[#da291c]" />
              {thaiMonths[m]} {y}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {monthInc > 0 && (
                <span className="text-[12px] font-bold px-2.5 py-0.5 rounded-none border tabular-nums font-mono bg-emerald-950/40 text-emerald-400 border-emerald-800/40">
                  ▲ {formatValue(monthInc)} ฿
                </span>
              )}
              {monthExp > 0 && (
                <span className="text-[12px] font-bold px-2.5 py-0.5 rounded-none border tabular-nums font-mono bg-red-950/40 text-red-400 border-red-800/40">
                  ▼ {formatValue(monthExp)} ฿
                </span>
              )}
              {(monthInc > 0 || monthExp > 0) && (
                <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded-none border tabular-nums font-mono ${monthNet >= 0 ? 'bg-yellow-500/10 text-yellow-450 border-yellow-500/20' : 'bg-rose-500/10 text-rose-450 border-rose-500/20'}`}>
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

      {/* 2. Calendar Grid */}
      <div className="rounded-none border border-[#2d2d2d] overflow-hidden flex-1 flex flex-col">
        <div className="grid grid-cols-7 gap-[1px] bg-[#2d2d2d] border-b border-[#2d2d2d]">
          {DAYS_LABEL.map((label, i) => (
            <div 
              key={label} 
              className={`py-2 text-center text-[14px] font-black tracking-wider bg-[#121212] ${
                WEEKEND_IDX.includes(i) ? 'text-red-400' : 'text-slate-400'
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-[1px] bg-[#2d2d2d] flex-1">
          {Array(firstDayOfMonth).fill(null).map((_, i) => (
            <div 
              key={`blank-${i}`} 
              className="min-h-[120px] 2xl:min-h-[140px] bg-[#121212] bg-[radial-gradient(rgba(218,41,28,0.06)_1px,transparent_1px)] bg-[size:10px_10px] opacity-40" 
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
                onSelectDate={onSelectDate}
              />
            );
          })}

          {Array.from({ length: suffixDaysCount }).map((_, i) => (
            <div 
              key={`suffix-blank-${i}`} 
              className="min-h-[120px] 2xl:min-h-[140px] bg-[#121212] bg-[radial-gradient(rgba(218,41,28,0.06)_1px,transparent_1px)] bg-[size:10px_10px] opacity-40" 
            />
          ))}
        </div>
      </div>

      {/* 3. Summary Footer (Counts of Day Types) */}
      <div className="bg-[#181818] rounded-none border border-[#2d2d2d] p-3 px-4 flex flex-wrap gap-2.5 items-center">
        <span className="text-[13px] font-bold mr-1 text-slate-400">สรุป:</span>
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
