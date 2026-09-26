import React, { memo } from 'react';
import { TrendingDown, Briefcase, Palmtree, Lock, Target } from 'lucide-react';
import { formatMoney } from '@/utils/formatters';
import { Shimmer, formatSignedMoney } from '../helpers';
import { StrategicCardShell } from './StrategicCardShell';

interface DailyExpenseCardProps {
  dailyAvg: number;
  totalExpense: number;
  dailyWorkdayAvg: number;
  dailyHolidayAvg: number;
  dailyFixed: number;
  dailyVariable: number;
  showSkeleton?: boolean;
}

export const StrategicDailyExpenseCard = memo(({
  dailyAvg,
  totalExpense,
  dailyWorkdayAvg,
  dailyHolidayAvg,
  dailyFixed,
  dailyVariable,
  showSkeleton
}: DailyExpenseCardProps) => (
  <StrategicCardShell
    icon={TrendingDown}
    borderColorClass="border-l-expense"
    hoverBgClass="hover:bg-surface-hover"
    label="รายจ่ายเฉลี่ย/วัน"
    thresholdRow={!showSkeleton && (
      <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 leading-none">
        <span>ยอดจ่ายรวมงวด</span>
        <span className="text-white font-bold tabular-nums">฿{formatMoney(totalExpense)}</span>
      </div>
    )}
    showOverlay={!showSkeleton}
    overlayTitle="อัตราจ่ายรายวัน"
    overlayBadge={<span className="text-expense font-extrabold text-[11px] border border-expense/30 bg-expense/10 px-1.5 py-0.5 rounded-none leading-none whitespace-nowrap shrink-0">ทำงาน vs หยุด</span>}
    overlayBody={(
      <div className="grid grid-cols-2 gap-[1px] bg-neutral-800/50 mt-1.5 flex-1">
        <div className="bg-canvas p-2 flex flex-col justify-center text-left">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-1.5 leading-none">
            <Briefcase size={13} className="shrink-0 text-expense" /> วันทำงาน
          </span>
          <span className="text-[13px] font-black text-expense tabular-nums leading-tight mt-1">฿{formatMoney(dailyWorkdayAvg)}</span>
        </div>
        <div className="bg-canvas p-2 flex flex-col justify-center text-left">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-1.5 leading-none">
            <Palmtree size={13} className="shrink-0 text-expense" /> วันหยุด
          </span>
          <span className="text-[13px] font-black text-expense tabular-nums leading-tight mt-1">฿{formatMoney(dailyHolidayAvg)}</span>
        </div>
        <div className="bg-canvas p-2 flex flex-col justify-center text-left">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-1.5 leading-none">
            <Lock size={13} className="shrink-0 text-sky-400" /> จำเป็น/วัน
          </span>
          <span className="text-[13px] font-black text-neutral-300 tabular-nums leading-tight mt-1">฿{formatMoney(dailyFixed)}</span>
        </div>
        <div className="bg-canvas p-2 flex flex-col justify-center text-left">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-1.5 leading-none">
            <Target size={13} className="shrink-0 text-amber-400" /> ตามใจ/วัน
          </span>
          <span className="text-[13px] font-black text-amber-400 tabular-nums leading-tight mt-1">฿{formatMoney(dailyVariable)}</span>
        </div>
      </div>
    )}
  >
    {showSkeleton ? (
      <Shimmer className="h-8 w-28 my-1" />
    ) : (
      <div className="flex flex-col gap-1.5">
        <div className="text-2xl xl:text-3xl font-black tabular-nums tracking-tight leading-none text-expense">
          {formatSignedMoney(dailyAvg)}
        </div>
        <div className="text-[11px] font-mono text-neutral-400 leading-none flex items-center justify-between">
          <span>เฉลี่ยรวมทุกวัน</span>
          <span className="text-neutral-500">ทำงาน ฿{formatMoney(dailyWorkdayAvg)}</span>
        </div>
      </div>
    )}
  </StrategicCardShell>
));

StrategicDailyExpenseCard.displayName = 'StrategicDailyExpenseCard';
