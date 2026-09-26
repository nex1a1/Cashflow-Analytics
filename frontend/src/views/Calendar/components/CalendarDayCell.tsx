import React, { memo } from 'react';
import { PlusCircle, Banknote, X } from 'lucide-react';
import { useMenu } from '@/hooks/useMenu';
import { PAY_DAY } from '@/utils/payCycle';
import { formatMoney, formatAmount } from '../../../utils/formatters';
import { DayType, TransactionDisplay } from '../../../types';
import DayTypeSelect from '@/components/shared/DayTypeSelect';

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
  maxDailyExpense?: number;
  /** โหมดรอบเงินเดือน: วาดเส้นแบ่งเดือนที่ขอบบน / ซ้ายของช่อง */
  monthEdgeTop?: boolean;
  monthEdgeLeft?: boolean;
  /** bottom rows open the "+N" list upward so the grid's overflow doesn't clip it */
  popUp?: boolean;
}

/**
 * Tactical Heat Steps for Calendar Day Cells:
 * Level 0: 0 THB (Clean canvas / surface)
 * Level 1: Normal daily baseline (< 250 THB and < 8% of month's max) -> Clean, un-tinted
 * Level 2: Moderate spend (>= 250 THB or >= 8% of max) -> Warm Amber (rgba(245, 158, 11, 0.10))
 * Level 3: High spend (>= 600 THB or >= 25% of max) -> Thruster Coral (rgba(240, 106, 83, 0.20))
 * Level 4: Peak spend (>= 1,500 THB and >= 60% of max, or >= 3,000 THB) -> Thunderbolt Crimson (rgba(194, 43, 67, 0.32))
 */
export const CALENDAR_HEAT_COLORS: Record<number, string> = {
  0: 'transparent',
  1: 'transparent',
  2: 'rgba(245, 158, 11, 0.14)',
  3: 'rgba(240, 106, 83, 0.22)',
  4: 'rgba(194, 43, 67, 0.32)',
};

/**
 * Tactical Top-Fade Gradients for Calendar Day Cells:
 * Solves the "Dark Mode Tint Trap" by giving vivid illumination at the top (header & amount)
 * that smoothly dissolves into pure dark canvas at the bottom, keeping transaction text 100% crisp.
 */
export const CALENDAR_HEAT_GRADIENTS: Record<number, string> = {
  0: 'none',
  1: 'none',
  2: 'linear-gradient(180deg, rgba(245, 158, 11, 0.16) 0%, rgba(245, 158, 11, 0.05) 45%, transparent 80%)',
  3: 'linear-gradient(180deg, rgba(240, 106, 83, 0.24) 0%, rgba(240, 106, 83, 0.07) 50%, transparent 85%)',
  4: 'linear-gradient(180deg, rgba(194, 43, 67, 0.34) 0%, rgba(194, 43, 67, 0.10) 55%, transparent 90%)',
};

export const getCalendarHeatLevel = (exp: number, max: number): number => {
  if (!exp || exp <= 0) return 0;
  const ratio = max > 0 ? exp / max : 0;
  if ((ratio >= 0.6 && exp >= 1500) || exp >= 3000) return 4;
  if ((ratio >= 0.25 && exp >= 600) || exp >= 1000) return 3;
  if ((ratio >= 0.08 && exp >= 250) || exp >= 300) return 2;
  return 1;
};

export const getCalendarHeatStyle = (level: number): React.CSSProperties | undefined => {
  if (level <= 1) return undefined;
  const gradient = CALENDAR_HEAT_GRADIENTS[level];
  return gradient && gradient !== 'none' ? { backgroundImage: gradient } : undefined;
};

/** Backward-compatible helper */
export const burnAlpha = (exp: number, max: number): number => {
  const level = getCalendarHeatLevel(exp, max);
  if (level <= 1) return 0;
  if (level === 2) return 0.10;
  if (level === 3) return 0.20;
  return 0.32;
};

const CalendarDayCell = memo(function CalendarDayCell({
  day, data, dateStr, isToday, isWeekend,
  dayTypeConfig, dayType, handleDayTypeChange, onSelectDate,
  handleOpenAddModal,
  maxDailyExpense = 0,
  monthEdgeTop = false,
  monthEdgeLeft = false,
  popUp = false
}: CalendarDayCellProps): React.ReactElement {
  const list = useMenu();
  const isPayDay = Number(dateStr.slice(8, 10)) === PAY_DAY;
  const cellData = data || { exp: 0, inc: 0, items: [], incItems: [] };

  // Tactical Heat Steps: level 1 is un-tinted to keep daily baseline clean; levels 2-4 highlight escalating spend
  const heatLevel = getCalendarHeatLevel(cellData.exp, maxDailyExpense);
  let cellBg = 'bg-canvas';
  if (isToday) cellBg = 'bg-canvas ring-1 ring-inset ring-accent/50 z-20';
  else if (isWeekend && heatLevel === 0 && cellData.inc === 0) cellBg = 'bg-surface';
  const heatStyle = getCalendarHeatStyle(heatLevel);

  const displayedInc = cellData.incItems.slice(0, 1);
  const hiddenIncCount = Math.max(0, cellData.incItems.length - 1);

  const maxExp = displayedInc.length > 0 ? 3 : 4;
  const displayedExp = cellData.items.slice(0, maxExp);
  const hiddenExpCount = Math.max(0, cellData.items.length - maxExp);

  let dayBadgeCls = 'text-slate-200 bg-canvas font-bold';
  if (isToday) {
    dayBadgeCls = 'bg-accent text-on-accent font-black';
  } else if (isWeekend) {
    dayBadgeCls = 'text-weekend bg-weekend/10 font-bold';
  }

  return (
    <div 
      ref={list.rootRef}
      onClick={() => onSelectDate(dateStr)}
      className={`min-h-[120px] 2xl:min-h-[145px] flex flex-col relative group select-none border-b border-line/30 ${cellBg} ${list.open ? 'z-50' : ''} cursor-pointer transition-none`}
      style={heatStyle}
    >
      <div className="absolute inset-0 pointer-events-none bg-surface-hover opacity-0 group-hover:opacity-60" />
      {isToday && (
        <>
          <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-accent opacity-45 z-20" />
          <div className="absolute top-0 inset-x-0 h-[2.5px] pointer-events-none z-30 bg-accent" />
        </>
      )}
      {!isToday && heatLevel === 4 && (
        <div className="absolute top-0 inset-x-0 h-[2.5px] pointer-events-none z-40 bg-accent" />
      )}

      {monthEdgeTop && (
        <div className="absolute -top-px -inset-x-px h-[2px] pointer-events-none z-40 bg-slate-400/35" />
      )}
      {monthEdgeLeft && (
        <div className="absolute -left-px -top-px -bottom-px w-[2px] pointer-events-none z-40 bg-slate-400/35" />
      )}

      {/* Header ของแต่ละวัน (วันที่ + ตัวเลือกประเภทวัน) */}
      <div className="flex items-center justify-between px-2 py-1.5 shrink-0 border-b z-30 relative border-line/30 bg-surface/75">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[12px] font-black leading-none min-w-[20px] px-0.5 whitespace-nowrap h-5 flex items-center justify-center rounded-sm shrink-0 tabular-nums tracking-tight ${dayBadgeCls}`}>
            {day}
          </span>
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
              className="opacity-0 group-hover:opacity-100 text-accent hover:text-white transition-none cursor-pointer"
              title="เพิ่มรายการวันนี้"
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
        className="flex flex-col flex-grow gap-1 p-2 overflow-hidden z-10 text-left w-full font-normal select-none"
      >
        {(cellData.exp > 0 || cellData.inc > 0) && (
          <div className="flex justify-between items-center mb-0.5 text-[11px] font-black border-b border-line/20 pb-0.5">
             {cellData.exp > 0 ? (
              <span className="text-expense tabular-nums tracking-tight flex items-center gap-1">
                {formatAmount(cellData.exp)} ฿
                {hiddenExpCount > 0 && <MoreButton count={hiddenExpCount} tone="expense" onOpen={() => list.setOpen(o => !o)} open={list.open} triggerRef={list.triggerRef} />}
              </span>
             ) : <span />}
             {cellData.inc > 0 && (
              <span className="text-emerald-400 tabular-nums tracking-tight flex items-center gap-1">
                {hiddenIncCount > 0 && <MoreButton count={hiddenIncCount} tone="income" onOpen={() => list.setOpen(o => !o)} open={list.open} triggerRef={hiddenExpCount > 0 ? undefined : list.triggerRef} />}
                +{formatAmount(cellData.inc)} ฿
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
              title={`${tx.description} — ${formatMoney(tx.amount)} ฿`}
            >
              <div className="w-[3px] h-3.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
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
          const color = tx._catObj?.color || tc('gray-300');
          return (
            <div 
              key={`exp_${tx.id}`} 
              className="flex items-center gap-1.5 min-w-0 text-[11px] leading-tight py-0.5 group/tx" 
              title={`${tx.description} — ${formatMoney(tx.amount)} ฿`}
            >
              <div className="w-[3px] h-3.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="truncate font-medium text-slate-300 flex-1 group-hover/tx:text-white transition-none">
                {tx.description || tx.category}
              </span>
              <span className="font-bold shrink-0 ml-1 pr-0.5 text-expense tabular-nums tracking-tight">
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
          className={`absolute left-0 w-[max(100%,260px)] z-50 bg-surface-elevated border border-line-strong shadow-[0_8px_24px_rgba(0,0,0,0.5)] cursor-default ${popUp ? 'bottom-0' : 'top-0'}`}
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
                <span className={`shrink-0 font-bold tabular-nums ${inc ? 'text-income' : 'text-expense'}`}>
                  {inc ? '+' : ''}{formatMoney(tx.amount)}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => { list.setOpen(false); onSelectDate(dateStr); }}
            className="w-full px-3 py-2 border-t border-line text-left text-xs font-bold text-accent hover:bg-surface-hover"
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
      aria-label={`ดูอีก ${count} ${tone === 'expense' ? 'รายการจ่าย' : 'รายรับ'}`}
      title="ดูรายการทั้งหมด"
      onClick={e => { e.stopPropagation(); onOpen(); }}
      className={`relative z-10 px-1.5 rounded-full border text-[11px] font-black tabular-nums shrink-0 ${
        tone === 'expense'
          ? 'text-expense bg-expense/10 border-expense/30 hover:bg-expense hover:text-on-accent'
          : 'text-income bg-income/10 border-income/30 hover:bg-income hover:text-on-accent'
      }`}
    >
      +{count}
    </button>
  );
}

export default CalendarDayCell;
