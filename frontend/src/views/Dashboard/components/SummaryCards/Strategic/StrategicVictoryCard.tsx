import React, { memo } from 'react';
import { Award, ArrowDownToLine, Lock, Target, PiggyBank } from 'lucide-react';
import { formatMoney } from '@/utils/formatters';
import { Shimmer, formatSignedMoney } from '../helpers';

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
    <div className={`relative flex flex-col md:flex-row items-stretch overflow-hidden bg-surface border-t border-line shrink-0 ${
      isPositive ? 'border-t-emerald-500' : 'border-t-danger'
    }`}>
      <div className="absolute -right-4 -bottom-4 opacity-[0.04] pointer-events-none text-neutral-700">
        <Award size={96} />
      </div>

      {/* Verdict: label + hero number — the bottom-line answer, not another equal-weight card */}
      <div className="relative z-10 flex flex-col justify-center gap-1.5 p-4 md:min-w-[280px] md:border-r border-line">
        <div className="flex items-center gap-2">
          <Award size={15} className={isPositive ? 'text-emerald-400 shrink-0' : 'text-danger shrink-0'} />
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400">
            เงินเหลือรายวัน — สรุปผล
          </span>
        </div>

        {showSkeleton ? (
          <Shimmer className="h-10 w-40 my-1" />
        ) : (
          <div className={`text-3xl xl:text-4xl font-black tabular-nums tracking-tight leading-none ${
            isPositive ? 'text-emerald-400' : 'text-danger'
          }`}>
            {formatSignedMoney(dailyVictory)}
          </div>
        )}

        {!showSkeleton && (
          <div className="text-[11px] font-mono text-neutral-400 leading-none">
            {isPositive ? 'กำไรสะสมสุทธิ/วัน' : 'ขาดทุนสะสมสุทธิ/วัน'} · เฉลี่ย {periodDays} วันในงวด
          </div>
        )}
      </div>

      {/* Breakdown behind the verdict — always visible, no hover required to read it */}
      {!showSkeleton && (
        <div className="relative z-10 flex-1 grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-neutral-800/50">
          <div className="bg-canvas p-3 flex flex-col justify-center text-left">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5 leading-none">
              <ArrowDownToLine size={13} className="shrink-0 text-emerald-400" /> รับ/วัน
            </span>
            <span className="text-[15px] font-black text-emerald-400 tabular-nums leading-tight mt-1">฿{formatMoney(dailyIncome)}</span>
          </div>
          <div className="bg-canvas p-3 flex flex-col justify-center text-left">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-1.5 leading-none">
              <Lock size={13} className="shrink-0 text-neutral-400" /> จำเป็น/วัน
            </span>
            <span className="text-[15px] font-black text-white tabular-nums leading-tight mt-1">฿{formatMoney(dailyFixed)}</span>
          </div>
          <div className="bg-canvas p-3 flex flex-col justify-center text-left">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-1.5 leading-none">
              <Target size={13} className="shrink-0 text-neutral-400" /> ตามใจ/วัน
            </span>
            <span className="text-[15px] font-black text-white tabular-nums leading-tight mt-1">฿{formatMoney(dailyVariable)}</span>
          </div>
          <div className="bg-canvas p-3 flex flex-col justify-center text-left">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5 leading-none">
              <PiggyBank size={13} className="shrink-0 text-emerald-400" /> ออม/วัน
            </span>
            <span className="text-[15px] font-black text-emerald-400 tabular-nums leading-tight mt-1">฿{formatMoney(dailySavings)}</span>
          </div>
        </div>
      )}
    </div>
  );
});

StrategicVictoryCard.displayName = 'StrategicVictoryCard';
