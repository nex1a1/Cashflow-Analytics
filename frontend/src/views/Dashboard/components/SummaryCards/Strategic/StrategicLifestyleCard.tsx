import React, { memo } from 'react';
import { Zap } from 'lucide-react';
import { formatMoney } from '@/utils/formatters';
import { Shimmer, renderTopItemsOverlay } from '../helpers';
import { StrategicCardShell } from './StrategicCardShell';
import type { WantCategory, BreakdownEntry } from '../types';

interface LifestyleCardProps {
  lifestyleRatio: number;
  variableTotal: number;
  topWantCategories?: WantCategory[];
  showSkeleton?: boolean;
}

export const StrategicLifestyleCard = memo(({ lifestyleRatio, variableTotal, topWantCategories, showSkeleton }: LifestyleCardProps) => {
  const isOver = lifestyleRatio > 35;
  const categories = (topWantCategories ?? []).slice(0, 4);
  const categoryEntries: BreakdownEntry[] = categories.map(cat => ({
    key: cat.id,
    icon: cat.icon,
    iconColor: cat.color,
    label: cat.name,
    amount: cat.amount,
    pctLabel: `${cat.pctOfWant}%`
  }));

  return (
    <StrategicCardShell
      icon={Zap}
      borderColorClass={isOver ? 'border-l-[#da291c]' : 'border-l-amber-500'}
      label="ดัชนีฟุ่มเฟือย"
      badge={
        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 border ${
          isOver ? 'text-[#da291c] border-[#da291c]/40 bg-[#da291c]/10' : 'text-amber-400 border-amber-500/30 bg-amber-950/40'
        }`}>
          WANT RATIO
        </span>
      }
      thresholdRow={!showSkeleton && (
        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 leading-none">
          <span>เกณฑ์แนะนำ</span>
          <span className="text-white font-bold">&lt; 30% ของรายรับ</span>
        </div>
      )}
      showOverlay={!showSkeleton}
      overlayTitle="หมวดฟุ่มเฟือย Top 4"
      overlayBadge={<span className="text-amber-400 font-extrabold text-[9px] border border-amber-500/30 bg-amber-950/40 px-1.5 py-0.5 rounded-none leading-none whitespace-nowrap shrink-0">Top 4</span>}
      overlayBody={(
        <div className="grid grid-cols-2 gap-[1px] bg-neutral-800/50 mt-1.5 flex-1">
          {renderTopItemsOverlay(categoryEntries, 'ไม่มีข้อมูลฟุ่มเฟือย', Zap, 'text-amber-400', 'รวมฟุ่มเฟือยทั้งหมด', variableTotal)}
        </div>
      )}
    >
      {showSkeleton ? (
        <Shimmer className="h-8 w-28 my-1" />
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <div className={`text-2xl xl:text-3xl font-black tabular-nums tracking-tight leading-none ${isOver ? 'text-[#da291c]' : 'text-amber-400'}`}>
              {lifestyleRatio.toFixed(1)}%
            </div>
            <div className="text-xs font-mono font-bold text-neutral-400 tabular-nums">
              ฿{formatMoney(variableTotal)}
            </div>
          </div>
          <div className="w-full h-1 rounded-none bg-neutral-900 border border-neutral-800/80 overflow-hidden relative">
            <div
              className={`h-full absolute left-0 top-0 transition-none ${showSkeleton ? 'bg-slate-700 animate-pulse' : isOver ? 'bg-[#da291c]' : 'bg-amber-400'}`}
              style={{ width: showSkeleton ? '50%' : `${Math.min(100, lifestyleRatio)}%` }}
            />
          </div>
        </div>
      )}
    </StrategicCardShell>
  );
});

StrategicLifestyleCard.displayName = 'StrategicLifestyleCard';
