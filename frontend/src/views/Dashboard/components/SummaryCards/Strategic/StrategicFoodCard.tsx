import React, { memo } from 'react';
import { UtensilsCrossed, TrendingDown, Briefcase, Trophy } from 'lucide-react';
import { formatMoney } from '@/utils/formatters';
import { Shimmer, getFoodIncomeStatus } from '../helpers';
import { StrategicCardShell } from './StrategicCardShell';

interface FoodCardProps {
  foodDailyAvg: number;
  foodTotal: number;
  foodPercentage: number | string;
  foodPctOfIncome: number | string;
  foodWorkdayAvg: number;
  foodHolidayAvg: number;
  maxFoodDayAmount: number;
  showSkeleton?: boolean;
}

export const StrategicFoodCard = memo(({
  foodDailyAvg,
  foodTotal,
  foodPercentage,
  foodPctOfIncome,
  foodWorkdayAvg,
  foodHolidayAvg,
  maxFoodDayAmount,
  showSkeleton
}: FoodCardProps) => {
  const pctOfExpense = Number.parseFloat(String(foodPercentage)) || 0;
  const pctOfIncome  = Number.parseFloat(String(foodPctOfIncome)) || 0;
  const foodStatus   = getFoodIncomeStatus(pctOfIncome);
  const isOver       = pctOfExpense > 25;

  const barWidth = Math.min(100, (pctOfExpense / 25) * 100);

  return (
    <StrategicCardShell
      icon={UtensilsCrossed}
      borderColorClass={isOver ? 'border-l-[#da291c]' : 'border-l-orange-500'}
      hoverBgClass="hover:bg-[#1c1c1c]"
      label="ค่าอาหาร & สัดส่วน"
      badge={
        <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 border ${foodStatus.cls}`}>
          {pctOfExpense.toFixed(1)}% จ่ายรวม
        </span>
      }
      thresholdRow={!showSkeleton && (
        <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 leading-none">
          <span>เกณฑ์สัดส่วน</span>
          <span className="text-white font-bold">&lt; 25% ของรายจ่าย</span>
        </div>
      )}
      showOverlay={!showSkeleton}
      overlayTitle="เจาะลึกพฤติกรรมอาหาร"
      overlayBadge={
        <span className={`font-extrabold text-[11px] border px-1.5 py-0.5 rounded-none leading-none whitespace-nowrap shrink-0 ${foodStatus.cls}`}>
          {foodStatus.label}
        </span>
      }
      overlayBody={(
        <div className="grid grid-cols-2 gap-[1px] bg-neutral-800/50 mt-1.5 flex-1">
          {foodTotal === 0 ? (
            <div className="col-span-2 bg-[#181818] p-2 text-center text-[11px] text-neutral-400 flex items-center justify-center">
              ไม่มีข้อมูลค่าอาหารในงวดนี้
            </div>
          ) : (
          <>
          <div className="bg-[#181818] p-2 flex flex-col justify-center text-left">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-1.5 leading-none">
              <UtensilsCrossed size={13} className="shrink-0 text-orange-400" /> รวมค่าอาหาร
            </span>
            <span className="text-[13px] font-black text-white tabular-nums leading-tight mt-1">฿{formatMoney(foodTotal)}</span>
          </div>
          <div className="bg-[#181818] p-2 flex flex-col justify-center text-left">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-1.5 leading-none">
              <TrendingDown size={13} className="shrink-0 text-orange-400" /> สัดส่วนงบ
            </span>
            <span className="text-[13px] font-black text-white tabular-nums leading-tight mt-1">
              {pctOfExpense.toFixed(1)}% <span className="text-[11px] text-neutral-400 font-normal">({pctOfIncome.toFixed(1)}% รับ)</span>
            </span>
          </div>
          <div className="bg-[#181818] p-2 flex flex-col justify-center text-left">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-1.5 leading-none">
              <Briefcase size={13} className="shrink-0 text-neutral-400" /> วันทำงาน vs หยุด
            </span>
            <span className="text-[12px] font-black text-neutral-200 tabular-nums leading-tight mt-1">
              ฿{formatMoney(foodWorkdayAvg)} <span className="text-neutral-500 font-normal">/</span> ฿{formatMoney(foodHolidayAvg)}
            </span>
          </div>
          <div className="bg-[#181818] p-2 flex flex-col justify-center text-left">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-1.5 leading-none">
              <Trophy size={13} className="shrink-0 text-amber-400" /> พีคสูงสุดใน 1 วัน
            </span>
            <span className="text-[13px] font-black text-amber-400 tabular-nums leading-tight mt-1">฿{formatMoney(maxFoodDayAmount)}</span>
          </div>
          </>
          )}
        </div>
      )}
    >
      {showSkeleton ? (
        <Shimmer className="h-8 w-28 my-1" />
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <div className={`text-2xl xl:text-3xl font-black tabular-nums tracking-tight leading-none ${isOver ? 'text-[#da291c]' : 'text-orange-400'}`}>
              ฿{formatMoney(foodDailyAvg)}
              <span className="text-xs text-neutral-400 font-normal ml-1">/วัน</span>
            </div>
            <div className="text-xs font-mono font-bold text-neutral-400 tabular-nums">
              ฿{formatMoney(foodTotal)}
            </div>
          </div>
          <div className="w-full h-1 rounded-none bg-neutral-900 border border-neutral-800/80 overflow-hidden relative">
            <div
              className={`h-full absolute left-0 top-0 transition-none ${showSkeleton ? 'bg-slate-700 animate-pulse' : isOver ? 'bg-[#da291c]' : 'bg-orange-400'}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 leading-none">
            <span>ทำงาน ฿{formatMoney(foodWorkdayAvg)}</span>
            <span className="text-neutral-500">หยุด ฿{formatMoney(foodHolidayAvg)}</span>
          </div>
        </div>
      )}
    </StrategicCardShell>
  );
});

StrategicFoodCard.displayName = 'StrategicFoodCard';
