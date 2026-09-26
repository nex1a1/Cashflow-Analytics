import React from 'react';
import { EyeOff, MapPin, AlertCircle, AlertTriangle, Waves } from 'lucide-react';
import { formatMoney } from '../../../../utils/formatters';
import { AllocationGroupItemData, AllocationItemProps } from './types';
import CategoryGlyph from '../../../../components/shared/CategoryGlyph';

import { tc, readable } from '@/constants/theme';
/**
 * Sub-component for Allocation Ratio cell (50/30/20 Special UX - Scrollbar-Free)
 */
export const AllocationItem = React.memo<AllocationItemProps>(({
  item,
  idx,
  isHovered,
  onHover,
  activeTotal = 0,
  excludedGroupIds = [],
  onToggleGroup,
}) => {
  const percentage = typeof item.percentage === 'number'
    ? item.percentage
    : Number.parseFloat(String(item.percentage)) || 0;
  const targetAmount = activeTotal * (item.target / 100);
  
  const isSavings = item.id === 'savings';
  const isNeedsOrWants = !isSavings;

  // Quota / Variance calculation in Baht
  let varianceAmount = 0;
  let isGood = false;
  let isOver = false;
  let isUnder = false;

  if (isNeedsOrWants) {
    varianceAmount = targetAmount - item.amount;
    isOver = varianceAmount < 0;
    isGood = !isOver;
  } else {
    varianceAmount = item.amount - targetAmount;
    isUnder = varianceAmount < 0;
    isGood = !isUnder;
  }

  const groups = item.groups || [];
  const activeGroups = groups.filter((g: AllocationGroupItemData) => !excludedGroupIds.includes(g.id));

  let varianceBadgeCls = 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40';
  if (!isGood) {
    if (isOver) {
      varianceBadgeCls = 'bg-danger/20 text-red-300 border border-danger/50';
    } else {
      varianceBadgeCls = 'bg-amber-500/20 text-amber-300 border border-amber-500/50';
    }
  }

  let varianceText = '';
  if (isNeedsOrWants) {
    varianceText = varianceAmount >= 0 
      ? `+฿${formatMoney(varianceAmount)} ในโควตา` 
      : `-฿${formatMoney(Math.abs(varianceAmount))} เกินโควตา`;
  } else {
    varianceText = varianceAmount >= 0 
      ? `+฿${formatMoney(varianceAmount)} เกินเป้าออม` 
      : `ขาดอีก ฿${formatMoney(Math.abs(varianceAmount))}`;
  }

  // Track is a fixed, honest 0-100% linear scale — fill width always equals the real percentage.
  // (Previously rescaled against a synthetic max so the bar looked "fuller" than reality; that
  // misrepresented actual spend, so the pin is clamped only for label legibility, not the track itself.)
  const clampedPct = Math.min(100, percentage);
  const targetPinPos = Math.min(98, Math.max(2, item.target));
  const actualSpentPos = clampedPct;

  const isOverBudget = isNeedsOrWants && percentage > item.target;
  const isUnderSavings = isSavings && percentage < item.target;

  const withinBudgetPct = isOverBudget ? Math.min(item.target, 100) : actualSpentPos;
  const overBudgetPct = isOverBudget ? (actualSpentPos - Math.min(item.target, 100)) : 0;
  const savingsDeficitPct = isUnderSavings ? (Math.min(item.target, 100) - actualSpentPos) : 0;

  // Pin badge alignment
  let pinTranslateClass = "-translate-x-1/2 items-center";
  let arrowAlignClass = "justify-center";
  if (targetPinPos >= 85) {
    pinTranslateClass = "-translate-x-full items-end";
    arrowAlignClass = "justify-end pr-1";
  } else if (targetPinPos <= 15) {
    pinTranslateClass = "translate-x-0 items-start";
    arrowAlignClass = "justify-start pl-1";
  }

  let cumulativePct = 0;

  return (
    <div
      onMouseEnter={() => onHover(idx)}
      onMouseLeave={() => onHover(-1)}
      onFocus={() => onHover(idx)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) onHover(-1);
      }}
      role="group"
      aria-label={`${item.name}: ${item.percentage}% (เป้า ${item.target}%) — ${varianceText}`}
      className={`flex flex-col min-w-0 p-3 group cursor-default h-full border-l-2 ${
        isHovered
          ? 'bg-surface-elevated/90 border-accent z-10'
          : 'bg-canvas/45 hover:bg-surface-elevated/90 border-line'
      }`}
      style={{ borderLeftColor: isHovered ? undefined : item.color }}
    >
      {/* ─── HEADER ─── */}
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="flex flex-col min-w-0 gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[15px] font-black uppercase tracking-wider flex items-center gap-1.5 truncate" style={{ color: readable(item.color) }}>
              <CategoryGlyph icon={item.icon} color={item.color} size={17} className="shrink-0 opacity-80" />
              <span className="truncate">{item.name}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold tracking-wide uppercase text-slate-300">
              เป้า {item.target}% (฿{formatMoney(targetAmount)})
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-end shrink-0 gap-0.5">
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-black tabular-nums leading-none tracking-tight" style={{ color: readable(item.color) }}>
              {item.percentage}
            </span>
            <span className="text-xs font-black" style={{ color: readable(item.color) }}>%</span>
          </div>
          <span className="text-[11px] font-bold tabular-nums text-slate-300">
            ฿ {formatMoney(item.amount)}
          </span>
        </div>
      </div>

      {/* ─── QUOTA VARIANCE BADGE ─── */}
      <div className="mb-2">
        <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${varianceBadgeCls}`}>
          {varianceText}
        </span>
      </div>
      
      {/* ─── MULTI-SEGMENT STACKED PROGRESS BAR + LABELED TARGET PIN ABOVE BAR ─── */}
      <div className="mb-2.5">
        {activeGroups.length > 0 ? (
          <div className="flex flex-col w-full relative">
            {/* ─── DEDICATED PIN TRACK (ABOVE BAR - z-10) ─── */}
            <div className="h-5 relative w-full pointer-events-none mb-0.5 z-10">
              <div 
                className={`absolute bottom-0 flex flex-col z-10 ${pinTranslateClass}`}
                style={{ left: `${targetPinPos}%` }}
              >
                <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-none uppercase tracking-wider whitespace-nowrap flex items-center gap-1 ${
                  isOverBudget
                    ? 'bg-danger-active text-white border border-white'
                    : 'bg-canvas text-amber-300 border border-amber-400/80'
                }`}>
                  <MapPin size={11} className="shrink-0" />
                  <span>{isOverBudget ? `LIMIT ${item.target}%` : `เป้า ${item.target}%`}</span>
                </span>
                <div className={`w-full flex ${arrowAlignClass}`}>
                  <span 
                    className={`text-[11px] leading-none -mt-0.5 font-bold ${
                      isOverBudget ? 'text-danger' : 'text-amber-400'
                    }`}
                  >
                    ▼
                  </span>
                </div>
              </div>
            </div>

            {/* ─── CLEAN PROGRESS BAR ─── */}
            <div className="w-full rounded-none h-[10px] flex gap-[1px] bg-canvas p-[1px] border border-line/60 relative z-30">
              {/* WITHIN-BUDGET GROUP SEGMENTS */}
              <div className="h-full flex gap-[1px] min-w-0" style={{ width: `${withinBudgetPct}%` }}>
                {activeGroups.map((g: AllocationGroupItemData, gIdx: number) => {
                  const relPct = item.amount > 0 ? (g.amount / item.amount) * 100 : 0;
                  if (relPct <= 0) return null;
                  const startPct = cumulativePct;
                  cumulativePct += relPct;

                  let alignClass = "left-1/2 -translate-x-1/2";
                  if (startPct > 65 || gIdx === activeGroups.length - 1) {
                    alignClass = "right-0 translate-x-0";
                  } else if (startPct < 20 || gIdx === 0) {
                    alignClass = "left-0 translate-x-0";
                  }

                  return (
                    <div 
                      key={g.id} 
                      className="h-full relative group/seg transition-all duration-150 hover:brightness-125 cursor-pointer" 
                      style={{ 
                        width: `${relPct}%`, 
                        backgroundColor: g.color || item.color 
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/15" />
                      
                      {/* Segment Hover Tooltip */}
                      <div className={`absolute bottom-full ${alignClass} mb-2 hidden group-hover/seg:flex flex-col whitespace-nowrap px-2.5 py-1.5 bg-surface border border-line rounded-none z-[50] text-[11px] pointer-events-none`}>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.color || item.color }} />
                          <span className="font-bold text-slate-200 flex items-center gap-1"><CategoryGlyph icon={g.icon} color={g.color} size={14} /> {g.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                          <span className="text-slate-400">฿{formatMoney(g.amount)}</span>
                          <span className="font-black text-danger">
                            {relPct.toFixed(0)}% ของส่วนนี้
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* OVER-BUDGET RED ALERT ZONE */}
              {overBudgetPct > 0 && (
                <div
                  className="h-full bg-gradient-to-r from-danger to-danger relative group/over cursor-pointer"
                  style={{ width: `${overBudgetPct}%` }}
                >
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(0,0,0,0.3)_3px,rgba(0,0,0,0.3)_6px)]" />

                  {/* Over-budget Hover Tooltip */}
                  <div className="absolute bottom-full right-0 mb-2 hidden group-hover/over:flex flex-col whitespace-nowrap px-2.5 py-1.5 bg-surface border border-accent rounded-none z-[50] text-[11px] pointer-events-none">
                    <div className="flex items-center gap-1 text-danger font-black">
                      <AlertCircle size={13} className="shrink-0" />
                      <span>เกินโควตา +{(percentage - item.target).toFixed(1)}%</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      ส่วนที่เกิน: ฿{formatMoney(Math.abs(varianceAmount))}
                    </div>
                  </div>
                </div>
              )}

              {/* SAVINGS DEFICIT BUFFER */}
              {savingsDeficitPct > 0 && (
                <div 
                  className="h-full bg-amber-500/10 border-r border-dashed border-amber-500/40 relative group/under cursor-pointer"
                  style={{ width: `${savingsDeficitPct}%` }}
                >
                  <div className="absolute bottom-full right-0 mb-2 hidden group-hover/under:flex flex-col whitespace-nowrap px-2.5 py-1.5 bg-surface border border-amber-500/50 rounded-none z-[50] text-[11px] pointer-events-none">
                    <div className="flex items-center gap-1 text-amber-400 font-black">
                      <AlertTriangle size={13} className="shrink-0" />
                      <span>ขาดอีก {(item.target - percentage).toFixed(1)}%</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      ยอดออมที่ขาด: ฿{formatMoney(Math.abs(varianceAmount))}
                    </div>
                  </div>
                </div>
              )}

              {/* VERTICAL TICK LINE AT TARGET PIN POSITION */}
              <div 
                className="absolute top-0 bottom-0 w-[2px] z-30 pointer-events-none" 
                style={{
                  left: targetPinPos >= 99.5 ? 'calc(100% - 2px)' : `${targetPinPos}%`,
                  backgroundColor: isOverBudget ? tc('danger') : '#fbbf24'
                }}
              />
            </div>
          </div>
        ) : (
          <div className="w-full rounded-none h-[10px] opacity-30" style={{ backgroundColor: item.color }} />
        )}
      </div>

      {/* ─── CONSTITUENT GROUPS ─── */}
      <div className="flex-1 flex flex-col min-w-0 pt-1.5 border-t border-dashed border-line/60 gap-0.5 justify-start">
        {groups.map((g: AllocationGroupItemData) => {
          const isExcluded = excludedGroupIds.includes(g.id);
          const relPct = item.amount > 0 && !isExcluded ? ((g.amount / item.amount) * 100).toFixed(0) : 0;

          return (
            <button 
              type="button"
              key={g.id} 
              onClick={() => onToggleGroup?.(g.id)}
              className={`w-full flex items-center justify-between gap-2 py-1 px-1.5 min-w-0 group/item cursor-pointer select-none transition-none rounded-none text-left bg-transparent border-0 font-normal outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
                isExcluded 
                  ? 'bg-neutral-900/60 opacity-40 hover:opacity-75' 
                  : 'hover:bg-surface-elevated'
              }`}
              title={isExcluded ? 'คลิกเพื่อเปิดหมวดหมู่นี้กลับมา' : 'คลิกเพื่อทดลองปิดหมวดหมู่นี้'}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span 
                  className="w-1.5 h-1.5 rounded-full shrink-0" 
                  style={{ backgroundColor: isExcluded ? tc('ink-muted') : (g.color || item.color) }} 
                />
                <CategoryGlyph icon={g.icon} color={g.color} size={12} className="shrink-0 opacity-70" />
                <span className={`text-[11px] font-bold truncate ${
                  isExcluded ? 'line-through text-slate-500' : 'text-slate-300 group-hover/item:text-slate-100'
                }`}>
                  {g.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[11px] font-bold tabular-nums ${
                  isExcluded ? 'line-through text-slate-600' : 'text-slate-400 group-hover/item:text-slate-300'
                }`}>
                  {formatMoney(g.amount)}
                </span>
                <span className="text-[11px] font-black tabular-nums w-8 text-right">
                  {isExcluded ? (
                    <EyeOff className="w-3 h-3 text-ink-muted inline" aria-label="ยกเว้นจากการคำนวณ" />
                  ) : (
                    <span className="text-slate-200 group-hover/item:text-white">{relPct}%</span>
                  )}
                </span>
              </div>
            </button>
          );
        })}

        {/* ─── NET SURPLUS (Remainder) ─── */}
        {isSavings && (() => {
          const sumGroups = activeGroups.reduce((acc: number, g: AllocationGroupItemData) => acc + g.amount, 0);
          const surplus = item.amount - sumGroups;
          if (surplus <= 10) return null;

          const surplusPercent = item.amount > 0 ? ((surplus / item.amount) * 100).toFixed(0) : 0;

          return (
            <div className="flex items-center justify-between gap-2 py-1 px-1.5 mt-1 border-t border-dotted border-line/50 min-w-0 group/item">
              <div className="flex items-center gap-1.5 min-w-0">
                <Waves size={13} className="shrink-0 opacity-80 text-emerald-400" />
                <span className="text-[11px] font-bold truncate text-emerald-400 group-hover/item:text-emerald-300">
                  Net Surplus (เหลือสุทธิ)
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-bold tabular-nums text-emerald-400 group-hover/item:text-emerald-300">
                  {formatMoney(surplus)}
                </span>
                <span className="text-[11px] font-black tabular-nums w-8 text-right text-emerald-400 group-hover/item:text-emerald-300">
                  {surplusPercent}%
                </span>
              </div>
            </div>
          );
        })()}

        {groups.length === 0 && !isSavings && (
          <div className="flex-1 flex items-center justify-center py-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">ไม่มีข้อมูล</span>
          </div>
        )}
      </div>
    </div>
  );
});

AllocationItem.displayName = 'AllocationItem';
export default AllocationItem;
