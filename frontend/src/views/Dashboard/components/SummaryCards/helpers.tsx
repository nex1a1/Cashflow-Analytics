// src/views/Dashboard/components/SummaryCards/helpers.tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { formatMoney } from '@/utils/formatters';
import CategoryGlyph from '@/components/shared/CategoryGlyph';
import { BreakdownEntry } from './types';

/**
 * Formats a signed monetary value with the sign BEFORE the ฿ symbol.
 * e.g. -1234 → "-฿1,234.00"  |  1234 → "฿1,234.00"
 */
export const formatSignedMoney = (value: number): string => {
  const abs = Math.abs(value);
  return value < 0 ? `-฿${formatMoney(abs)}` : `฿${formatMoney(abs)}`;
};

export const Shimmer = ({ className }: { className?: string }) => (
  <div className={`rounded-none animate-pulse bg-neutral-800/80 ${className || ''}`} />
);

export const SectionHeader = ({ icon: Icon, title }: { icon?: LucideIcon; title: string }) => (
  <div className="px-4 py-1.5 flex items-center justify-between border-b border-[#2d2d2d] bg-[#121212]/80">
    <div className="flex items-center gap-2">
      <div className="w-[3px] h-3 bg-[#da291c] shrink-0" />
      {Icon && <Icon className="w-3.5 h-3.5 text-neutral-400" />}
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-200">
        {title}
      </span>
    </div>
  </div>
);

export function getFoodIncomeStatus(pct: number) {
  const num = Number.parseFloat(String(pct)) || 0;
  if (num <= 20) return { label: 'สมดุลดี',      cls: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40' };
  if (num <= 30) return { label: 'ปานกลาง',      cls: 'text-amber-400 border-amber-500/30 bg-amber-950/40' };
  return            { label: 'สัดส่วนสูง',     cls: 'text-[#da291c] border-[#da291c]/30 bg-red-950/40' };
}

export function renderTopItemsOverlay(
  entries: BreakdownEntry[],
  emptyLabel: string,
  totalIcon: LucideIcon,
  totalIconColorClass: string,
  totalLabel: string,
  totalAmount: number
): React.ReactNode {
  if (entries.length === 0) {
    return (
      <div className="col-span-2 bg-[#181818] p-2 text-center text-[10px] text-neutral-400 flex items-center justify-center">
        {emptyLabel}
      </div>
    );
  }

  const cell = (wide: boolean, key: React.Key, icon: React.ReactNode, label: string, amount: number, pctLabel?: string) => (
    <div key={key} className={`bg-[#181818] p-2 flex text-left min-w-0 ${wide ? 'col-span-2 items-center justify-between' : 'flex-col justify-center'}`}>
      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide truncate flex items-center gap-1.5 leading-none">
        {icon} {label}
      </span>
      <div className={`flex items-baseline gap-1 leading-tight ${wide ? '' : 'mt-1'}`}>
        <span className="text-[13px] font-black text-white tabular-nums">฿{formatMoney(amount)}</span>
        {pctLabel && <span className="text-[9px] font-bold text-neutral-400">({pctLabel})</span>}
      </div>
    </div>
  );

  const TotalIcon = totalIcon;
  const totalCell = (wide: boolean, showPct: boolean) => cell(
    wide, 'total',
    <TotalIcon size={13} className={`shrink-0 ${totalIconColorClass}`} />,
    totalLabel, totalAmount, showPct ? '100%' : undefined
  );

  if (entries.length === 1) {
    const e = entries[0];
    return cell(true, e.key, <CategoryGlyph icon={e.icon} color={e.iconColor} size={13} />, e.label, e.amount, e.pctLabel);
  }

  const itemCells = entries.map(e => cell(false, e.key, <CategoryGlyph icon={e.icon} color={e.iconColor} size={13} />, e.label, e.amount, e.pctLabel));

  if (entries.length === 2) return <>{itemCells}{totalCell(true, false)}</>;
  if (entries.length === 3) return <>{itemCells}{totalCell(false, true)}</>;
  return itemCells;
}
