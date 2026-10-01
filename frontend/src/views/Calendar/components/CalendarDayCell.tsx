import React, { memo } from 'react';
import { PlusCircle, Banknote, X } from 'lucide-react';
import { useMenu } from '@/hooks/useMenu';
import { PAY_DAY, PAY_DAY_START } from '@/utils/payCycle';
import { formatMoney, formatAmount } from '../../../utils/formatters';
import { DayType, TransactionDisplay } from '../../../types';
import DayTypeSelect from '@/components/shared/DayTypeSelect';
import { CALENDAR_HEAT_CHIP, CALENDAR_HEAT_COLORS, getCalendarHeatLevel } from '../utils/calendarHeat';

import { tc } from '@/constants/theme';
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
  /** โหมดรอบเงินเดือน: วาดเส้นแบ่งเดือนที่ขอบบน / ซ้ายของช่อง */
  monthEdgeTop?: boolean;
  monthEdgeLeft?: boolean;
  /** bottom rows open the "+N" list upward so the grid's overflow doesn't clip it */
  popUp?: boolean;
  /** คอลัมน์ท้ายสัปดาห์: popover ชิดขอบขวาของช่อง ไม่ให้ล้นออกนอกตารางแล้วโดนตัดยอดเงิน */
  alignRight?: boolean;
}

const CalendarDayCell = memo(function CalendarDayCell({
  day, data, dateStr, isToday, isWeekend,
  dayTypeConfig, dayType, handleDayTypeChange, onSelectDate,
  handleOpenAddModal,
  monthEdgeTop = false,
  monthEdgeLeft = false,
  popUp = false,
  alignRight = false
}: CalendarDayCellProps): React.ReactElement {
  const list = useMenu();
  const isPayDay = Number(dateStr.slice(8, 10)) === PAY_DAY && dateStr >= PAY_DAY_START;
  const cellData = data || { exp: 0, inc: 0, items: [], incItems: [] };

  // ระดับความแพงของวัน (เกณฑ์ ฿ ตายตัว ดู calendarHeat.ts) — ไม่ย้อมสีเมื่อ < 2
  const heat = getCalendarHeatLevel(cellData.exp);

  let cellBg = 'bg-canvas';
  if (isToday) {
    cellBg = 'bg-canvas ring-1 ring-inset ring-accent/50 z-20';
  } else if (isWeekend && !(cellData.inc > 0 || cellData.exp > 0)) {
    cellBg = 'bg-surface';
  }

  const displayedInc = cellData.incItems.slice(0, 1);
  const hiddenIncCount = Math.max(0, cellData.incItems.length - 1);

  const maxExp = displayedInc.length > 0 ? 3 : 4;
  const displayedExp = cellData.items.slice(0, maxExp);
  const hiddenExpCount = Math.max(0, cellData.items.length - maxExp);

  let dayBadgeCls = 'text-ink-display font-black';
  if (isToday) {
    dayBadgeCls = 'bg-accent text-on-accent font-black shadow-sm';
  } else if (isWeekend) {
    dayBadgeCls = 'text-weekend font-black';
  }

  return (
    <div
      ref={list.rootRef}
      onClick={() => onSelectDate(dateStr)}
      className={`min-w-0 min-h-[120px] 2xl:min-h-[145px] flex flex-col relative group select-none border-b border-line/30 ${cellBg} ${list.open ? 'z-50' : ''} hover:bg-surface-hover cursor-pointer transition-none`}
    >
      {heat >= 2 && (
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: CALENDAR_HEAT_COLORS[heat] }} />
      )}
      <div className="absolute inset-0 pointer-events-none bg-surface-hover opacity-0 group-hover:opacity-60" />
      {isToday && (
        <>
          <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-accent-ink opacity-45 z-20" />
          <div className="absolute top-0 inset-x-0 h-[2.5px] pointer-events-none z-30 bg-accent" />
        </>
      )}
      {!isToday && heat === 4 && (
        <div className="absolute top-0 inset-x-0 h-[2.5px] pointer-events-none z-40 bg-expense" />
      )}

      {monthEdgeTop && (
        <div className="absolute -top-px -inset-x-px h-[2px] pointer-events-none z-40 bg-ink-muted/40" />
      )}
      {monthEdgeLeft && (
        <div className="absolute -left-px -top-px -bottom-px w-[2px] pointer-events-none z-40 bg-ink-muted/40" />
      )}

      {/* Header ของแต่ละวัน (วันที่ + ตัวเลือกประเภทวัน) */}
      <div className="flex items-center justify-between px-2 py-1.5 shrink-0 border-b z-30 relative border-line/30 bg-surface/50">
        <div className="flex items-center gap-1.5 shrink-0">
          {/* ตัวเลขวันเป็นปุ่ม: ทางเข้ารายละเอียดวันสำหรับคีย์บอร์ด (ทั้งช่องยังคลิกได้ด้วยเมาส์) */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelectDate(dateStr); }}
            aria-label={`ดูรายละเอียดวันที่ ${day}`}
            aria-current={isToday ? 'date' : undefined}
            className={`text-[12px] leading-none min-w-[20px] px-1 whitespace-nowrap h-5 flex items-center justify-center rounded-sm shrink-0 tabular-nums tracking-tight cursor-pointer ${dayBadgeCls}`}
          >
            {day}
          </button>
          {isPayDay && (
            <span
              className="flex items-center justify-center w-5 h-5 text-income bg-income/10 rounded-sm shrink-0"
              title={`วันที่ ${PAY_DAY} วันเงินเดือนเข้า (เริ่มรอบใหม่)`}
              aria-label={`วันที่ ${PAY_DAY} วันเงินเดือนเข้า`}
            >
              <Banknote className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          )}
          {handleOpenAddModal && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAddModal(dateStr);
              }}
              className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-accent-ink hover:text-ink-display transition-none cursor-pointer"
              title="เพิ่มรายการวันนี้"
              aria-label={`เพิ่มรายการวันที่ ${day}`}
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        <DayTypeSelect
          value={dayType}
          onChange={(val) => handleDayTypeChange(dateStr, val)}
          dayTypeConfig={dayTypeConfig}
          dateStr={dateStr}
          size="xs"
        />
      </div>

      {/* ส่วนแสดงรายการธุรกรรม */}
      <div
        className="flex flex-col flex-grow gap-1 p-2 overflow-hidden z-10 text-left w-full min-w-0 font-normal select-none"
      >
        {(cellData.exp > 0 || cellData.inc > 0 || hiddenExpCount > 0) && (
          <div className="flex justify-between items-center mb-0.5 text-[11px] font-black border-b border-line/20 pb-0.5">
             {(cellData.exp > 0 || hiddenExpCount > 0) ? (
              <span className="tabular-nums tracking-tight flex items-center gap-1">
                {cellData.exp > 0 && (
                  <span className={`-ml-1.5 px-1.5 rounded-pill ${CALENDAR_HEAT_CHIP[heat]}`}>฿{formatAmount(cellData.exp)}</span>
                )}
                {hiddenExpCount > 0 && <MoreButton count={hiddenExpCount} tone="expense" onOpen={() => list.setOpen(o => !o)} open={list.open} triggerRef={list.triggerRef} />}
              </span>
             ) : <span />}
             {cellData.inc > 0 && (
              <span className="text-income tabular-nums tracking-tight flex items-center gap-1">
                {hiddenIncCount > 0 && <MoreButton count={hiddenIncCount} tone="income" onOpen={() => list.setOpen(o => !o)} open={list.open} triggerRef={hiddenExpCount > 0 ? undefined : list.triggerRef} />}
                +฿{formatAmount(cellData.inc)}
              </span>
            )}
          </div>
        )}

        {/* Render Income Transaction */}
        {displayedInc.map(tx => {
          const color = tx._catObj?.color || tc('income');
          return (
            <div
              key={`inc_${tx.id}`}
              className="flex items-center gap-1.5 min-w-0 text-[11px] leading-tight py-0.5 group/tx"
              title={`${tx.description} — ฿${formatMoney(tx.amount)}`}
            >
              <div className="w-[3px] h-3.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="truncate min-w-0 font-medium text-ink-soft flex-1 group-hover/tx:text-ink-display transition-none">
                {tx.description || tx.category}
              </span>
              <span className="font-bold shrink-0 ml-1 pr-0.5 text-income tabular-nums tracking-tight">
                +{formatAmount(tx.amount)}
              </span>
            </div>
          );
        })}

        {/* Render Expense Transactions (แถวลงทุน/ออมอยู่ในลิสต์ด้วย แต่ไม่รวมในยอดรายจ่าย — สีเขียวแยกให้เห็น) */}
        {displayedExp.map(tx => {
          const color = tx._catObj?.color || tc('ink-muted');
          return (
            <div
              key={`exp_${tx.id}`}
              className="flex items-center gap-1.5 min-w-0 text-[11px] leading-tight py-0.5 group/tx"
              title={`${tx.description} — ฿${formatMoney(tx.amount)}`}
            >
              <div className="w-[3px] h-3.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="truncate min-w-0 font-medium text-ink-soft flex-1 group-hover/tx:text-ink-display transition-none">
                {tx.description || tx.category}
              </span>
              <span className={`font-bold shrink-0 ml-1 pr-0.5 tabular-nums tracking-tight ${tx.group_type === 'savings' ? 'text-savings' : 'text-expense'}`}>
                {formatAmount(tx.amount)}
              </span>
            </div>
          );
        })}
      </div>

      {list.open && (
        <div
          role="dialog"
          aria-label={`รายการทั้งหมดวันที่ ${Number(dateStr.slice(8, 10))}`}
          onClick={e => e.stopPropagation()}
          className={`absolute w-[max(100%,260px)] z-50 bg-surface-elevated border border-line-strong shadow-[0_8px_24px_rgb(0_0_0/calc(0.5*var(--shadow-k)))] cursor-default ${alignRight ? 'right-0' : 'left-0'} ${popUp ? 'bottom-0' : 'top-0'}`}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-line">
            <span className="text-xs font-bold text-ink-display">
              {cellData.items.length + cellData.incItems.length} รายการ
            </span>
            <button type="button" onClick={() => list.setOpen(false)} aria-label="ปิด" className="p-1 text-ink-muted hover:text-ink-display">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <ul className="max-h-[240px] overflow-y-auto custom-scrollbar py-1">
            {[...cellData.incItems.map(tx => ({ tx, inc: true })), ...cellData.items.map(tx => ({ tx, inc: false }))].map(({ tx, inc }) => (
              <li key={`${inc ? 'i' : 'e'}_${tx.id}`} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                <span className="w-[3px] h-3.5 shrink-0" style={{ backgroundColor: tx._catObj?.color || tc(inc ? 'income' : 'gray-300') }} />
                <span className="flex-1 min-w-0 truncate text-ink-soft" title={tx.description || tx.category}>{tx.description || tx.category}</span>
                <span className={`shrink-0 font-bold tabular-nums ${inc || tx.group_type === 'savings' ? 'text-income' : 'text-expense'}`}>
                  {inc ? '+' : ''}{formatMoney(tx.amount)}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => { list.setOpen(false); onSelectDate(dateStr); }}
            className="w-full px-3 py-2 border-t border-line text-left text-xs font-bold text-accent-ink hover:bg-surface-hover"
          >
            เปิดรายละเอียดวันนี้
          </button>
        </div>
      )}
    </div>
  );
});

function MoreButton({ count, tone, open, onOpen, triggerRef }: {
  count: number;
  tone: 'expense' | 'income';
  open: boolean;
  onOpen: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement>;
}) {
  return (
    <button
      type="button"
      ref={triggerRef}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={`ดูอีก ${count} ${tone === 'expense' ? 'รายการ' : 'รายรับ'}`}
      title="ดูรายการทั้งหมด"
      onClick={e => { e.stopPropagation(); onOpen(); }}
      className={`relative z-10 px-1.5 rounded-pill border text-[11px] font-black tabular-nums shrink-0 ${
        tone === 'expense'
          ? 'text-expense bg-expense/10 border-expense/30 hover:bg-expense hover:text-canvas'
          : 'text-income bg-income/10 border-income/30 hover:bg-income hover:text-canvas'
      }`}
    >
      +{count}
    </button>
  );
}

export default CalendarDayCell;
