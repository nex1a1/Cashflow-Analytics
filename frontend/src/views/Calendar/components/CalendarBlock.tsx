import React from 'react';
import { Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import CalendarDayCell from './CalendarDayCell';
import { CALENDAR_HEAT_CHIP, CALENDAR_HEAT_STEPS } from '../utils/calendarHeat';
import { resolveDefaultDayTypeId, DAY_OF_WEEK_LABELS } from '../utils/calendarPeriodHelpers';
import { formatMoney, hexToRgb, THAI_MONTHS_SHORT } from '../../../utils/formatters';
import { parseDateStrToObj } from '../../../utils/dateHelpers';
import { localTodayIso } from '../../../utils/payCycle';
import { DayNote, DayType, TransactionDisplay } from '../../../types';
import { readable } from '@/constants/theme';

export interface CalendarBlockProps {
  /** ISO dates shown in order — a calendar month or a 25 → 24 pay cycle */
  dates: string[];
  title: string;
  firstDayOfMonth: number;
  suffixDaysCount: number;
  monthInc: number;
  monthExp: number;
  monthNet: number;
  /** ลงทุน/ออมสุทธิ (ซื้อ − ขาย) — อยู่ในคงเหลือ ไม่อยู่ในรายจ่าย */
  monthSav: number;
  calendarData: Record<number, {
    exp: number;
    inc: number;
    items: TransactionDisplay[];
    incItems: TransactionDisplay[];
  }>;
  dayTypes: Record<string, string>;
  dayNotes?: Record<string, DayNote>;
  dayTypeConfig: DayType[];
  dayTypeCounts: Record<string, number>;
  handleDayTypeChange: (dateStr: string, value: string) => void;
  onSelectDate: (dateStr: string) => void;
  handleOpenAddModal?: (dateStr?: string, type?: string) => void;
  excludedCategoryIds: Set<string>;
  toggleCategory: (catId: string) => void;
  maxDailyExpense: number;
}

const BLANK_CELL = 'min-h-[120px] 2xl:min-h-[145px] bg-surface bg-[radial-gradient(rgb(var(--accent)/0.06)_1px,transparent_1px)] bg-[size:10px_10px] opacity-40';

const CalendarBlock = React.memo(function CalendarBlock({
  dates,
  title,
  firstDayOfMonth,
  suffixDaysCount,
  monthInc,
  monthExp,
  monthNet,
  monthSav,
  calendarData,
  dayTypes,
  dayNotes,
  dayTypeConfig,
  dayTypeCounts,
  handleDayTypeChange,
  onSelectDate,
  handleOpenAddModal,
  excludedCategoryIds,
  toggleCategory,
  maxDailyExpense
}: CalendarBlockProps): React.ReactElement {
  const today = localTodayIso();
  const [stepMid, stepHigh, stepPeak] = CALENDAR_HEAT_STEPS.map(s => `฿${s.toLocaleString('en-US')}`);

  const prefixBlankKeys = ['b-sun', 'b-mon', 'b-tue', 'b-wed', 'b-thu', 'b-fri'].slice(0, firstDayOfMonth);
  const suffixBlankKeys = [
    's-mon', 's-tue', 's-wed', 's-thu', 's-fri', 's-sat', 's-sun',
    's-mon2', 's-tue2', 's-wed2', 's-thu2', 's-fri2', 's-sat2', 's-sun2'
  ].slice(0, suffixDaysCount);

  return (
    <div className="flex flex-col space-y-3.5 w-full">
      {/* 1. Header (Navigation & Stats Summary) */}
      <div className="bg-surface rounded-none border border-line p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-xl font-black flex items-center gap-2 tracking-wide text-ink-display">
            <CalendarIcon className="w-6 h-6 text-accent-ink" />
            {title}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {monthInc > 0 && (
              <span className="text-[12px] font-bold px-3 py-0.5 rounded-pill border tabular-nums tracking-tight bg-income/10 text-income border-income/30">
                ▲ ฿{formatMoney(monthInc)}
              </span>
            )}
            {monthExp > 0 && (
              <span className="text-[12px] font-bold px-3 py-0.5 rounded-pill border tabular-nums tracking-tight bg-expense/10 text-expense border-expense/30">
                ▼ ฿{formatMoney(monthExp)}
              </span>
            )}
            {(monthInc > 0 || monthExp > 0) && (
              <span className={`text-[12px] font-bold px-3 py-0.5 rounded-pill border tabular-nums tracking-tight ${monthNet >= 0 ? 'bg-income/10 text-income border-income/30' : 'bg-danger/10 text-danger border-danger/30'}`}>
                คงเหลือ ฿{formatMoney(monthNet)}
              </span>
            )}
            {monthSav !== 0 && (
              <span className="text-[12px] font-bold px-3 py-0.5 rounded-pill border tabular-nums tracking-tight bg-surface-elevated text-ink-soft border-line">
                ในนี้ลงทุน/ออม {monthSav < 0 ? '−' : ''}฿{formatMoney(Math.abs(monthSav))}
              </span>
            )}
            {excludedCategoryIds?.size > 0 && (
              <button
                onClick={() => toggleCategory?.('CLEAR_ALL')}
                className="flex items-center gap-1.5 px-3 py-0.5 text-[11px] font-black rounded-pill border border-warn/40 bg-warn/10 text-warn hover:bg-warn/20 transition-colors cursor-pointer"
                title="คลิกเพื่อแสดงทุกหมวดหมู่"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>ซ่อน {excludedCategoryIds.size} หมวดหมู่</span>
                <span className="underline ml-0.5">[แสดงทั้งหมด]</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Calendar Grid */}
      <div className="rounded-none border border-line overflow-hidden flex-1 flex flex-col">
        <div className="grid grid-cols-7 gap-[1px] bg-line border-b border-line">
          {DAY_OF_WEEK_LABELS.map((label, i) => (
            <div
              key={label}
              className={`py-2 text-center text-[13px] tracking-wider bg-surface ${
                i === 0 || i === 6 ? 'text-weekend font-black' : 'text-ink-soft font-bold'
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-[1px] bg-line flex-1">
          {prefixBlankKeys.map(blankKey => (
            <div key={blankKey} className={BLANK_CELL} />
          ))}

          {dates.map((dateStr, idx) => {
            const d = Number(dateStr.slice(8, 10));
            const isToday = dateStr === today;
            const dow = parseDateStrToObj(dateStr).getDay();
            // รอบข้ามเดือน: ติดชื่อเดือนที่ช่องแรกและวันที่ 1 ของเดือนถัดไป
            const crossesMonth = dates[0].slice(0, 7) !== dates[dates.length - 1].slice(0, 7);
            const dayLabel = crossesMonth && (idx === 0 || d === 1)
              ? `${d} ${THAI_MONTHS_SHORT[Number(dateStr.slice(5, 7)) - 1]}`
              : d;
            const isWeekend = dow === 0 || dow === 6;
            const defType = resolveDefaultDayTypeId(dayTypeConfig, isWeekend);
            const dayType = dayTypes[dateStr] || defType || '';
            // เส้นแบ่งเดือนแบบขั้นบันได: ขอบบนเมื่อช่องด้านบนเป็นคนละเดือน, ขอบซ้ายที่ต้นเดือน (ถ้าไม่ใช่คอลัมน์แรก)
            const month = dateStr.slice(0, 7);
            const monthEdgeTop = crossesMonth && idx >= 7 && dates[idx - 7].slice(0, 7) !== month;
            const monthEdgeLeft = crossesMonth && idx > 0 && (firstDayOfMonth + idx) % 7 !== 0
              && dates[idx - 1].slice(0, 7) !== month;
            const totalRows = Math.ceil((firstDayOfMonth + dates.length + suffixDaysCount) / 7);
            const popUp = Math.floor((firstDayOfMonth + idx) / 7) >= totalRows - 2;
            // popover กว้าง 260px แต่ช่องแคบกว่า: ศุกร์/เสาร์ชิดขวา ไม่ให้ล้นขอบตาราง
            const alignRight = (firstDayOfMonth + idx) % 7 >= 5;

            return (
              <CalendarDayCell
                key={dateStr}
                day={dayLabel}
                data={calendarData[d]}
                dateStr={dateStr}
                isToday={isToday}
                isWeekend={isWeekend}
                dayTypeConfig={dayTypeConfig}
                dayType={dayType}
                note={dayNotes?.[dateStr]?.text}
                noteIcon={dayNotes?.[dateStr]?.icon}
                handleDayTypeChange={handleDayTypeChange}
                onSelectDate={onSelectDate}
                handleOpenAddModal={handleOpenAddModal}
                monthEdgeTop={monthEdgeTop}
                monthEdgeLeft={monthEdgeLeft}
                popUp={popUp}
                alignRight={alignRight}
              />
            );
          })}

          {suffixBlankKeys.map(suffixKey => (
            <div key={suffixKey} className={BLANK_CELL} />
          ))}
        </div>
      </div>

      {/* 3. Summary Footer (Counts of Day Types) */}
      <div className="bg-surface rounded-none border border-line p-3 px-4 flex flex-wrap gap-2.5 items-center">
        <span className="text-[13px] font-bold mr-1 text-ink-muted">สรุป:</span>
        {dayTypeConfig.map(dt => {
          const count = dayTypeCounts[dt.id] || 0;
          if (count === 0) return null;
          return (
            <div
              key={dt.id}
              className="flex items-center gap-1.5 px-3 py-0.5 rounded-pill border text-[11px] font-black"
              style={{
                backgroundColor: `rgba(${hexToRgb(dt.color)}, 0.08)`,
                borderColor: `rgba(${hexToRgb(dt.color)}, 0.25)`,
                color: readable(dt.color || undefined),
              }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dt.color || undefined }} />
              <span>{dt.label} (<span className="tabular-nums tracking-tight">{count}</span>)</span>
            </div>
          );
        })}
        {maxDailyExpense > 0 && (
          <div className="ml-auto flex items-center gap-2 text-[11px] text-ink-muted" aria-label="ระดับการใช้จ่ายต่อวัน">
            <span>ใช้จ่าย:</span>
            {/* ป้ายเดียวกับยอดรวมของวันใน cell */}
            <div className="flex items-center gap-1 font-mono">
              <span title={`ต่ำกว่า ${stepMid}`} className="flex items-center px-1.5 py-0.5 rounded-pill border border-line bg-surface-elevated text-ink-muted text-[11px]">
                ปกติ
              </span>
              <span title={`${stepMid} ขึ้นไป`} className={`flex items-center px-1.5 py-0.5 rounded-pill text-[11px] ${CALENDAR_HEAT_CHIP[2]}`}>
                กลาง
              </span>
              <span title={`${stepHigh} ขึ้นไป`} className={`flex items-center px-1.5 py-0.5 rounded-pill text-[11px] ${CALENDAR_HEAT_CHIP[3]}`}>
                สูง
              </span>
              <span title={`${stepPeak} ขึ้นไป`} className={`flex items-center px-1.5 py-0.5 rounded-pill font-black text-[11px] ${CALENDAR_HEAT_CHIP[4]}`}>
                พีค
              </span>
            </div>
            <span className="tabular-nums text-ink-body font-mono">(สูงสุด ฿{formatMoney(maxDailyExpense)})</span>
          </div>
        )}
        <div className={`${maxDailyExpense > 0 ? '' : 'ml-auto '}text-[12px] font-black px-3 py-0.5 rounded-pill border bg-surface-elevated border-line text-ink-display tabular-nums tracking-tight`}>
          {dates.length} วัน
        </div>
      </div>
    </div>
  );
});

export default CalendarBlock;
