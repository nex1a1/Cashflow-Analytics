import React, { memo } from 'react';
import { Repeat } from 'lucide-react';
import { formatMoney } from '@/utils/formatters';
import { Shimmer, renderTopItemsOverlay } from '../helpers';
import { StrategicCardShell } from './StrategicCardShell';
import type { SubscriptionService, BreakdownEntry } from '../types';

interface SubscriptionCardProps {
  subscriptionTotal?: number;
  subscriptionPctOfIncome?: number | string;
  subscriptionPercentage?: number | string;
  subscriptionCount?: number;
  topSubscriptionServices?: SubscriptionService[];
  totalIncome?: number;
  showSkeleton?: boolean;
}

export const StrategicSubscriptionCard = memo(({
  subscriptionTotal = 0,
  subscriptionPctOfIncome = 0,
  subscriptionPercentage = 0,
  subscriptionCount = 0,
  topSubscriptionServices = [],
  totalIncome = 0,
  showSkeleton
}: SubscriptionCardProps) => {
  const subPctNum    = Number.parseFloat(String(subscriptionPctOfIncome)) || 0;
  const subExpPctNum = Number.parseFloat(String(subscriptionPercentage)) || 0;
  const isIncomeBased = totalIncome > 0;
  const displayPct    = isIncomeBased ? subPctNum : subExpPctNum;

  const isLeak     = isIncomeBased ? displayPct > 10 : displayPct > 15;
  const isModerate = isIncomeBased ? displayPct > 5  : displayPct > 8;

  let statusBadge = {
    label: 'SAFE',       cls: 'text-purple-400 border-purple-500/30 bg-purple-950/40',
    borderLeft: 'border-l-purple-500', barBg: 'bg-purple-500', colorText: 'text-purple-400'
  };
  if (isLeak) {
    statusBadge = {
      label: 'LEAK ALERT', cls: 'text-[#da291c] border-[#da291c]/30 bg-red-950/40',
      borderLeft: 'border-l-[#da291c]', barBg: 'bg-[#da291c]', colorText: 'text-[#da291c]'
    };
  } else if (isModerate) {
    statusBadge = {
      label: 'MODERATE',   cls: 'text-amber-400 border-amber-400/30 bg-amber-950/40',
      borderLeft: 'border-l-amber-500', barBg: 'bg-amber-500', colorText: 'text-amber-400'
    };
  }

  const barWidth = isIncomeBased
    ? Math.min(100, Math.max(displayPct > 0 ? 5 : 0, (displayPct / 10) * 100))
    : Math.min(100, Math.max(displayPct > 0 ? 5 : 0, (displayPct / 15) * 100));

  const services = [...(topSubscriptionServices ?? [])].slice(0, 4);
  const serviceEntries: BreakdownEntry[] = services.map((s, idx) => ({
    key: idx,
    icon: s.icon,
    label: s.name,
    amount: s.amount,
    pctLabel: subscriptionTotal > 0 ? `${((s.amount / subscriptionTotal) * 100).toFixed(0)}%` : '0%'
  }));

  return (
    <StrategicCardShell
      icon={Repeat}
      borderColorClass={statusBadge.borderLeft}
      hoverBgClass="hover:bg-[#1c1c1c]"
      label="บริการรายเดือน"
      badge={
        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 border ${statusBadge.cls}`}>
          {statusBadge.label}
        </span>
      }
      thresholdRow={!showSkeleton && (
        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 leading-none">
          <span>เกณฑ์แนะนำ</span>
          <span className="text-white font-bold">
            {isIncomeBased ? '< 5% ของรายรับ' : '< 8% ของรายจ่าย'}
          </span>
        </div>
      )}
      showOverlay={!showSkeleton}
      overlayTitle="เจาะลึกรายเดือน"
      overlayBadge={<span className={`font-extrabold text-[9px] border px-1.5 py-0.5 rounded-none leading-none whitespace-nowrap shrink-0 ${statusBadge.cls}`}>{subscriptionCount} รายการ</span>}
      overlayBody={(
        <div className="grid grid-cols-2 gap-[1px] bg-neutral-800/50 mt-1.5 flex-1">
          {renderTopItemsOverlay(serviceEntries, 'ไม่มีข้อมูลรายเดือน', Repeat, 'text-purple-400', 'ยอดรวมทั้งหมด', subscriptionTotal)}
        </div>
      )}
    >
      {showSkeleton ? (
        <Shimmer className="h-8 w-28 my-1" />
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <div className={`text-2xl xl:text-3xl font-black tabular-nums tracking-tight leading-none ${statusBadge.colorText}`}>
              {displayPct.toFixed(1)}%
            </div>
            <div className="text-xs font-mono font-bold text-neutral-400 tabular-nums">
              ฿{formatMoney(subscriptionTotal)}
            </div>
          </div>
          <div className="w-full h-1 rounded-none bg-neutral-900 border border-neutral-800/80 overflow-hidden relative">
            <div
              className={`h-full absolute left-0 top-0 transition-none ${showSkeleton ? 'bg-slate-700 animate-pulse' : statusBadge.barBg}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
      )}
    </StrategicCardShell>
  );
});

StrategicSubscriptionCard.displayName = 'StrategicSubscriptionCard';
