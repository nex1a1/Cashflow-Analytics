import React, { memo } from 'react';
import { Award, ArrowDownToLine, Lock, Target, PiggyBank } from 'lucide-react';
import { formatMoney } from '@/utils/formatters';
import { Shimmer, formatSignedMoney } from '../helpers';
import { StrategicCardShell } from './StrategicCardShell';

interface VictoryCardProps {
  dailyVictory: number;
  periodDays: number;
  dailyIncome: number;
  dailyFixed: number;
  dailyVariable: number;
  dailySavings: number;
  showSkeleton?: boolean;
}

export const StrategicVictoryCard = memo(({
  dailyVictory,
  periodDays,
  dailyIncome,
  dailyFixed,
  dailyVariable,
  dailySavings,
  showSkeleton
}: VictoryCardProps) => {
  const isPositive = dailyVictory >= 0;
  return (
    <StrategicCardShell
      icon={Award}
      borderColorClass={isPositive ? 'border-l-emerald-500' : 'border-l-[#da291c]'}
      label="เงินเหลือรายวัน"
      badge={
        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 border ${
          isPositive ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40' : 'text-[#da291c] border-[#da291c]/30 bg-red-950/40'
        }`}>
          {isPositive ? 'VICTORY' : 'DEFICIT'}
        </span>
      }
      thresholdRow={!showSkeleton && (
        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 leading-none">
          <span>ระยะเวลาคำนวณ</span>
          <span className="text-white font-bold">{periodDays} วันในงวด</span>
        </div>
      )}
      showOverlay={!showSkeleton}
      overlayTitle="โครงสร้างรายวัน"
      overlayBadge={
        <span className={`font-extrabold text-[9px] border px-1.5 py-0.5 rounded-none leading-none whitespace-nowrap shrink-0 ${
          isPositive ? 'text-emerald-400 border-emerald-400/30' : 'text-[#da291c] border-[#da291c]/30'
        }`}>เฉลี่ย {periodDays} วัน</span>
      }
      overlayBody={(
        <div className="grid grid-cols-2 gap-[1px] bg-neutral-800/50 mt-1.5 flex-1">
          <div className="bg-[#181818] p-2 flex flex-col justify-center text-left">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5 leading-none">
              <ArrowDownToLine size={13} className="shrink-0 text-emerald-400" /> รับ/วัน
            </span>
            <span className="text-[13px] font-black text-emerald-400 tabular-nums leading-tight mt-1">฿{formatMoney(dailyIncome)}</span>
          </div>
          <div className="bg-[#181818] p-2 flex flex-col justify-center text-left">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-1.5 leading-none">
              <Lock size={13} className="shrink-0 text-neutral-400" /> จำเป็น/วัน
            </span>
            <span className="text-[13px] font-black text-white tabular-nums leading-tight mt-1">฿{formatMoney(dailyFixed)}</span>
          </div>
          <div className="bg-[#181818] p-2 flex flex-col justify-center text-left">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-1.5 leading-none">
              <Target size={13} className="shrink-0 text-neutral-400" /> ตามใจ/วัน
            </span>
            <span className="text-[13px] font-black text-white tabular-nums leading-tight mt-1">฿{formatMoney(dailyVariable)}</span>
          </div>
          <div className="bg-[#181818] p-2 flex flex-col justify-center text-left">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5 leading-none">
              <PiggyBank size={13} className="shrink-0 text-emerald-400" /> ออม/วัน
            </span>
            <span className="text-[13px] font-black text-emerald-400 tabular-nums leading-tight mt-1">฿{formatMoney(dailySavings)}</span>
          </div>
        </div>
      )}
    >
      {showSkeleton ? (
        <Shimmer className="h-8 w-28 my-1" />
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className={`text-2xl xl:text-3xl font-black tabular-nums tracking-tight leading-none ${isPositive ? 'text-emerald-400' : 'text-[#da291c]'}`}>
            {formatSignedMoney(dailyVictory)}
          </div>
          <div className="text-[10px] font-mono text-neutral-400 leading-none flex items-center justify-between">
            <span>{isPositive ? 'กำไรสะสมสุทธิ/วัน' : 'ขาดทุนสะสมสุทธิ/วัน'}</span>
            <span className="text-neutral-500">ออม ฿{formatMoney(dailySavings)}/ว</span>
          </div>
        </div>
      )}
    </StrategicCardShell>
  );
});

StrategicVictoryCard.displayName = 'StrategicVictoryCard';
