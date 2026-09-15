import React, { memo } from 'react';
import { Home, Building2, Zap, Globe, Droplets } from 'lucide-react';
import { formatMoney } from '@/utils/formatters';
import { Shimmer } from '../helpers';
import { StrategicCardShell } from './StrategicCardShell';
import type { RentSub } from '../types';

interface RentCardProps {
  rentPercentageNum: number;
  rentTotal: number;
  rentSub?: RentSub;
  showSkeleton?: boolean;
}

export const StrategicRentCard = memo(({ rentPercentageNum, rentTotal, rentSub, showSkeleton }: RentCardProps) => {
  const isOver = rentPercentageNum > 30;
  let rentBarBg = 'bg-sky-400';
  if (showSkeleton)   rentBarBg = 'bg-slate-700 animate-pulse';
  else if (isOver)    rentBarBg = 'bg-[#da291c]';

  return (
    <StrategicCardShell
      icon={Home}
      borderColorClass={isOver ? 'border-l-[#da291c]' : 'border-l-sky-500'}
      hoverBgClass="hover:bg-[#1c1c1c]"
      label="ภาระที่พักอาศัย"
      badge={
        <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 border ${
          isOver ? 'text-[#da291c] border-[#da291c]/40 bg-[#da291c]/10' : 'text-sky-400 border-sky-500/30 bg-sky-950/40'
        }`}>
          RENT RATIO
        </span>
      }
      thresholdRow={!showSkeleton && (
        <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 leading-none">
          <span>เกณฑ์แนะนำ</span>
          <span className="text-white font-bold">&lt; 30% ของรายรับ</span>
        </div>
      )}
      showOverlay={!showSkeleton}
      overlayTitle="รายละเอียดที่พัก"
      overlayBadge={<span className="text-sky-400 font-extrabold text-[11px] border border-sky-500/30 bg-sky-950/40 px-1.5 py-0.5 rounded-none leading-none whitespace-nowrap shrink-0">4 หมวด</span>}
      overlayBody={rentSub && (
        <div className="grid grid-cols-2 gap-[1px] bg-neutral-800/50 mt-1.5 flex-1">
          {rentSub.rent === 0 && rentSub.electricity === 0 && rentSub.internet === 0 && rentSub.water === 0 ? (
            <div className="col-span-2 bg-[#181818] p-2 text-center text-[11px] text-neutral-400 flex items-center justify-center">
              ไม่มีข้อมูลที่พักอาศัยในงวดนี้
            </div>
          ) : (
          <>
          <div className="bg-[#181818] p-2 flex flex-col justify-center text-left">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-1.5 leading-none">
              <Building2 size={13} className="shrink-0 text-sky-400" /> ค่าเช่า
            </span>
            <span className="text-[13px] font-black text-white tabular-nums leading-tight mt-1">฿{formatMoney(rentSub.rent)}</span>
          </div>
          <div className="bg-[#181818] p-2 flex flex-col justify-center text-left">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-1.5 leading-none">
              <Zap size={13} className="shrink-0 text-amber-400" /> ค่าไฟ
            </span>
            <span className="text-[13px] font-black text-white tabular-nums leading-tight mt-1">฿{formatMoney(rentSub.electricity)}</span>
          </div>
          <div className="bg-[#181818] p-2 flex flex-col justify-center text-left">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-1.5 leading-none">
              <Globe size={13} className="shrink-0 text-indigo-400" /> ค่าเน็ต
            </span>
            <span className="text-[13px] font-black text-white tabular-nums leading-tight mt-1">฿{formatMoney(rentSub.internet)}</span>
          </div>
          <div className="bg-[#181818] p-2 flex flex-col justify-center text-left">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-1.5 leading-none">
              <Droplets size={13} className="shrink-0 text-cyan-400" /> ค่าน้ำ
            </span>
            <span className="text-[13px] font-black text-white tabular-nums leading-tight mt-1">฿{formatMoney(rentSub.water)}</span>
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
            <div className={`text-2xl xl:text-3xl font-black tabular-nums tracking-tight leading-none ${isOver ? 'text-[#da291c]' : 'text-sky-400'}`}>
              {rentPercentageNum.toFixed(1)}%
              <span className="text-xs text-neutral-400 font-normal ml-1">ของรายรับ</span>
            </div>
            <div className="text-xs font-mono font-bold text-neutral-400 tabular-nums">
              ฿{formatMoney(rentTotal)}
            </div>
          </div>
          <div className="w-full h-1 rounded-none bg-neutral-900 border border-neutral-800/80 overflow-hidden relative">
            <div
              className={`h-full absolute left-0 top-0 transition-none ${rentBarBg}`}
              style={{ width: `${Math.min(100, rentPercentageNum)}%` }}
            />
          </div>
        </div>
      )}
    </StrategicCardShell>
  );
});

StrategicRentCard.displayName = 'StrategicRentCard';
