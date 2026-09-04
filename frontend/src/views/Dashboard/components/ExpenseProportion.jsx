// src/views/Dashboard/components/ExpenseProportion.jsx
import React, { useMemo, useState, useCallback } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { PieChart, Inbox, ArrowDownWideNarrow, ListOrdered, EyeOff, Sparkles, RotateCcw } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';
import { getDoughnutChartOptions } from '../../../utils/chartOptions';
import { useDashboardContext } from '../context/DashboardContext';

/**
 * Sub-component for individual category cell (Table-like HUD)
 */
const CatItem = React.memo(({ cat, idx, isHovered, onHover }) => (
  <div 
    onMouseEnter={() => onHover(idx)}
    onMouseLeave={() => onHover(-1)}
    className={`flex flex-col min-w-0 p-2 group cursor-default h-full border-l-2 ${
      isHovered 
        ? 'bg-[#303030]/90 border-[#da291c] shadow-md z-10'
        : 'bg-[#181818]/45 hover:bg-[#303030]/90 border-[#303030]'
    }`}
    style={{ borderLeftColor: isHovered ? undefined : cat.color }}
  >
    <div className="flex justify-between items-start gap-1 mb-1">
      <span 
        className="text-[12px] font-black truncate flex items-center gap-1 min-w-0" 
        style={{ color: '#94a3b8' }}
        title={cat.name}
      >
        <span className="shrink-0 leading-none" style={{ color: cat.color }}>{cat.icon}</span>
        <span className="truncate group-hover:text-[#da291c] uppercase tracking-tight">{cat.name}</span>
      </span>
      <div className="flex flex-col items-end shrink-0 leading-none">
        <span className="text-[10px] font-bold tabular-nums opacity-60 mb-0.5" style={{ color: '#cbd5e1' }}>
          {formatMoney(cat.amount)}
        </span>
        <span className="text-xs font-black tabular-nums" style={{ color: cat.color }}>{cat.percentage}%</span>
      </div>
    </div>
    
    <div className="mt-auto flex flex-col gap-1">
      <div className="w-full rounded-none h-[4px] overflow-hidden bg-[#181818]">
        <div 
          className="h-full" 
          style={{ 
            width: `${cat.percentage}%`, 
            backgroundColor: cat.color, 
            opacity: 0.9
          }} 
        />
      </div>
    </div>
  </div>
));

CatItem.displayName = 'CatItem';

/**
 * Sub-component for Group cell (With Category breakdown)
 */
const GroupItem = React.memo(({ item, idx, isHovered, onHover, isSingleMonthView, sortMode = 'amount-desc' }) => {
  const rawCategories = item.categories || [];

  const categories = useMemo(() => {
    const cats = [...rawCategories];
    return cats.sort((a, b) => {
      const orderA = a.order_index ?? 999;
      const orderB = b.order_index ?? 999;

      if (sortMode.startsWith('amount')) {
        return sortMode === 'amount-asc' ? (a.amount - b.amount) : (b.amount - a.amount);
      }
      if (sortMode.startsWith('order')) {
        return sortMode === 'order-desc' ? (orderB - orderA) : (orderA - orderB);
      }
      if (sortMode.startsWith('name')) {
        return sortMode === 'name-desc'
          ? (b.name || '').localeCompare(a.name || '', 'th')
          : (a.name || '').localeCompare(b.name || '', 'th');
      }
      return (orderA - orderB) || (b.amount - a.amount);
    });
  }, [rawCategories, sortMode]);

  return (
    <div 
      onMouseEnter={() => onHover(idx)}
      onMouseLeave={() => onHover(-1)}
      className={`flex flex-col min-w-0 p-3 group cursor-default h-full border-l-2 ${
        isHovered 
          ? 'bg-[#303030]/90 border-[#da291c] shadow-md z-10'
          : 'bg-[#181818]/45 hover:bg-[#303030]/90 border-[#303030]'
      }`}
      style={{ borderLeftColor: isHovered ? undefined : item.color }}
    >
      {/* ─── HEADER ─── */}
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="flex flex-col min-w-0 gap-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[15px] font-black uppercase tracking-wider flex items-center gap-1.5 truncate" style={{ color: item.color }}>
              <span className="shrink-0 opacity-80">{item.icon || '📁'}</span>
              <span className="truncate group-hover:brightness-125">{item.name}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {!isSingleMonthView && (
              <span className="text-[9.5px] font-bold tracking-wide uppercase text-slate-300">
                เฉลี่ย ฿{formatMoney(item.avgPerMonth)} / เดือน
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end shrink-0 gap-0.5">
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-black tabular-nums leading-none tracking-tight" style={{ color: item.color }}>
              {item.percentage}
            </span>
            <span className="text-xs font-black opacity-60" style={{ color: item.color }}>%</span>
          </div>
          <span className="text-[11px] font-black tabular-nums text-slate-200">
            ฿ {formatMoney(item.amount)}
          </span>
        </div>
      </div>
      
      {/* ─── STACKED SEGMENT PROGRESS BAR ─── */}
      <div className="mb-2.5">
        <div className="w-full rounded-none h-[7px] flex gap-[1px] bg-[#181818] p-[1px] border border-[#303030]/60 relative z-20">
          {categories.length > 0 ? (
            (() => {
              let cumulativePct = 0;
              return categories.map((c, cIdx) => {
                const relPct = Number.parseFloat(c.relativePercentage) || 0;
                if (relPct <= 0) return null;
                const startPct = cumulativePct;
                cumulativePct += relPct;

                // Smart tooltip alignment to prevent edge clipping
                let alignClass = "left-1/2 -translate-x-1/2";
                if (startPct > 65 || cIdx === categories.length - 1) {
                  alignClass = "right-0 translate-x-0";
                } else if (startPct < 20 || cIdx === 0) {
                  alignClass = "left-0 translate-x-0";
                }

                return (
                  <div 
                    key={c.id} 
                    className="h-full relative group/seg transition-all duration-150 hover:brightness-125 cursor-pointer" 
                    style={{ 
                      width: `${c.relativePercentage}%`, 
                      backgroundColor: c.color || item.color 
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/15" />
                    
                    {/* Segment Hover Popover Tooltip (Smart Aligned & High Elevation) */}
                    <div className={`absolute bottom-full ${alignClass} mb-2 hidden group-hover/seg:flex flex-col whitespace-nowrap px-2.5 py-1.5 bg-[#121212] border border-[#303030] shadow-2xl rounded-none z-50 text-[9px] pointer-events-none`}>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color || item.color }} />
                        <span className="font-bold text-slate-200">{c.icon || '✨'} {c.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[8.5px]">
                        <span className="text-slate-400">฿{formatMoney(c.amount)}</span>
                        <span className="font-black text-[#da291c]">{c.relativePercentage}% ของกลุ่ม</span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()
          ) : (
            <div className="h-full w-full opacity-30" style={{ backgroundColor: item.color }} />
          )}
        </div>
      </div>

      {/* ─── CONSTITUENT CATEGORIES (Fully Expanded - Crisp Typography) ─── */}
      <div className="flex-1 flex flex-col min-w-0 pt-1.5 border-t border-dashed border-[#303030]/60 gap-[2px] justify-start">
        {categories.map(c => (
          <div key={c.id} className="flex items-center justify-between gap-2 py-0.5 px-1 min-w-0 group/item hover:bg-[#282828] transition-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c.color || item.color }} />
              <span className="text-[11px] shrink-0 opacity-80">{c.icon || '✨'}</span>
              <span className="text-[11px] font-bold truncate text-slate-200 group-hover/item:text-white">
                {c.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10.5px] font-bold tabular-nums text-slate-300 group-hover/item:text-slate-100">
                {formatMoney(c.amount)}
              </span>
              <span className="text-[11px] font-black tabular-nums w-8 text-right text-slate-100 group-hover/item:text-white">
                {c.relativePercentage}%
              </span>
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-1">
            <span className="text-[9.5px] font-bold uppercase tracking-widest text-slate-600">No Data</span>
          </div>
        )}
      </div>
    </div>
  );
});

GroupItem.displayName = 'GroupItem';

/**
 * Sub-component for Allocation Ratio cell (Special UX)
 */
/**
 * Sub-component for Allocation Ratio cell (50/30/20 Special UX - Scrollbar-Free)
 */
const AllocationItem = React.memo(({ item, idx, isHovered, onHover, activeTotal = 0, excludedGroupIds = [], onToggleGroup }) => {
  const percentage = Number.parseFloat(item.percentage) || 0;
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
  const activeGroups = groups.filter(g => !excludedGroupIds.includes(g.id));

  return (
    <div 
      onMouseEnter={() => onHover(idx)}
      onMouseLeave={() => onHover(-1)}
      className={`flex flex-col min-w-0 p-3 group cursor-default h-full border-l-2 ${
        isHovered 
          ? 'bg-[#303030]/90 border-[#da291c] shadow-md z-10'
          : 'bg-[#181818]/45 hover:bg-[#303030]/90 border-[#303030]'
      }`}
      style={{ borderLeftColor: isHovered ? undefined : item.color }}
    >
      {/* ─── HEADER ─── */}
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="flex flex-col min-w-0 gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[15px] font-black uppercase tracking-wider flex items-center gap-1.5 truncate" style={{ color: item.color }}>
              <span className="shrink-0 opacity-80">{item.icon}</span>
              <span className="truncate">{item.name}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10.5px] font-bold tracking-wide uppercase text-slate-300">
              เป้า {item.target}% (฿{formatMoney(targetAmount)})
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-end shrink-0 gap-0.5">
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-black tabular-nums leading-none tracking-tight" style={{ color: item.color }}>
              {item.percentage}
            </span>
            <span className="text-xs font-black opacity-60" style={{ color: item.color }}>%</span>
          </div>
          <span className="text-[10px] font-bold tabular-nums text-slate-300">
            ฿ {formatMoney(item.amount)}
          </span>
        </div>
      </div>

      {/* ─── QUOTA VARIANCE BADGE ─── */}
      <div className="mb-2">
        <span className={`inline-flex items-center gap-1 text-[9.5px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
          isGood 
            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40' 
            : isOver 
              ? 'bg-red-500/20 text-red-300 border border-red-500/50'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
        }`}>
          {isNeedsOrWants ? (
            varianceAmount >= 0 
              ? `+฿${formatMoney(varianceAmount)} ในโควตา` 
              : `-฿${formatMoney(Math.abs(varianceAmount))} เกินโควตา`
          ) : (
            varianceAmount >= 0 
              ? `+฿${formatMoney(varianceAmount)} เกินเป้าออม` 
              : `ขาดอีก ฿${formatMoney(Math.abs(varianceAmount))}`
          )}
        </span>
      </div>
      
      {/* ─── MULTI-SEGMENT STACKED PROGRESS BAR + LABELED TARGET PIN ABOVE BAR ─── */}
      <div className="mb-2.5">
        {activeGroups.length > 0 ? (
          (() => {
            // Calculate scale relative to maxDisplay for exact 100% alignment
            const maxDisplay = Math.max(percentage, item.target);
            const targetPinPos = maxDisplay > 0 ? (item.target / maxDisplay) * 100 : item.target;
            const actualSpentPos = maxDisplay > 0 ? (percentage / maxDisplay) * 100 : 0;

            const isOverBudget = isNeedsOrWants && percentage > item.target;
            const isUnderSavings = isSavings && percentage < item.target;

            // Portion of actual spent that fits within target budget vs over budget
            const withinBudgetPct = isOverBudget ? targetPinPos : actualSpentPos;
            const overBudgetPct = isOverBudget ? (actualSpentPos - targetPinPos) : 0;
            const savingsDeficitPct = isUnderSavings ? (targetPinPos - actualSpentPos) : 0;

            // Smart badge alignment to prevent overflow at 0% or 100% edges
            let pinTranslateClass = "-translate-x-1/2 items-center";
            let arrowAlignClass = "justify-center";
            if (targetPinPos >= 90) {
              pinTranslateClass = "-translate-x-full items-end";
              arrowAlignClass = "justify-end pr-1";
            } else if (targetPinPos <= 10) {
              pinTranslateClass = "translate-x-0 items-start";
              arrowAlignClass = "justify-start pl-1";
            }

            let cumulativePct = 0;

            return (
              <div className="flex flex-col w-full relative">
                {/* ─── DEDICATED PIN TRACK (ABOVE BAR - z-10) ─── */}
                <div className="h-5 relative w-full pointer-events-none mb-0.5 z-10">
                  <div 
                    className={`absolute bottom-0 flex flex-col z-10 ${pinTranslateClass}`}
                    style={{ left: `${targetPinPos}%` }}
                  >
                    <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-none uppercase tracking-wider whitespace-nowrap shadow-xl ${
                      isOverBudget 
                        ? 'bg-[#da291c] text-white border border-white shadow-red-950' 
                        : 'bg-[#0d0d0d] text-amber-300 border border-amber-400/80 shadow-black'
                    }`}>
                      {isOverBudget ? `📍 LIMIT ${item.target}%` : `📍 เป้า ${item.target}%`}
                    </span>
                    <div className={`w-full flex ${arrowAlignClass}`}>
                      <span 
                        className={`text-[8px] leading-none -mt-0.5 font-bold ${
                          isOverBudget ? 'text-[#da291c]' : 'text-amber-400'
                        }`}
                      >
                        ▼
                      </span>
                    </div>
                  </div>
                </div>

                {/* ─── CLEAN PROGRESS BAR (z-30 so child tooltips z-50 stack above Pin badge) ─── */}
                <div className="w-full rounded-none h-[10px] flex gap-[1px] bg-[#181818] p-[1px] border border-[#303030]/60 relative z-30">
                  {/* WITHIN-BUDGET GROUP SEGMENTS */}
                  <div className="h-full flex gap-[1px] min-w-0" style={{ width: `${withinBudgetPct}%` }}>
                    {activeGroups.map((g, gIdx) => {
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
                          <div className={`absolute bottom-full ${alignClass} mb-2 hidden group-hover/seg:flex flex-col whitespace-nowrap px-2.5 py-1.5 bg-[#121212] border border-[#303030] shadow-2xl rounded-none z-50 text-[9px] pointer-events-none`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.color || item.color }} />
                              <span className="font-bold text-slate-200">{g.icon || '✨'} {g.name}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[8.5px]">
                              <span className="text-slate-400">฿{formatMoney(g.amount)}</span>
                              <span className="font-black text-[#da291c]">
                                {item.amount > 0 ? ((g.amount / item.amount) * 100).toFixed(0) : 0}% ของส่วนนี้
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* OVER-BUDGET RED ALERT ZONE (Rosso Corsa Red Warning Segment) */}
                  {overBudgetPct > 0 && (
                    <div 
                      className="h-full bg-gradient-to-r from-[#da291c] to-red-600 animate-pulse relative group/over cursor-pointer"
                      style={{ width: `${overBudgetPct}%` }}
                    >
                      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(0,0,0,0.3)_3px,rgba(0,0,0,0.3)_6px)]" />
                      
                      {/* Over-budget Hover Tooltip */}
                      <div className="absolute bottom-full right-0 mb-2 hidden group-hover/over:flex flex-col whitespace-nowrap px-2.5 py-1.5 bg-[#121212] border border-[#da291c] shadow-2xl rounded-none z-50 text-[9px] pointer-events-none">
                        <div className="flex items-center gap-1.5 text-red-400 font-black">
                          <span>🚨 เกินโควตา +{(percentage - item.target).toFixed(1)}%</span>
                        </div>
                        <div className="text-[8.5px] text-slate-300 mt-0.5">
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
                      <div className="absolute bottom-full right-0 mb-2 hidden group-hover/under:flex flex-col whitespace-nowrap px-2.5 py-1.5 bg-[#121212] border border-amber-500/50 shadow-2xl rounded-none z-50 text-[9px] pointer-events-none">
                        <div className="flex items-center gap-1.5 text-amber-400 font-black">
                          <span>⚠️ ขาดอีก {(item.target - percentage).toFixed(1)}%</span>
                        </div>
                        <div className="text-[8.5px] text-slate-300 mt-0.5">
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
                      backgroundColor: isOverBudget ? '#da291c' : '#fbbf24', 
                      boxShadow: isOverBudget ? '0 0 8px #da291c' : '0 0 6px #fbbf24'
                    }} 
                  />
                </div>
              </div>
            );
          })()
        ) : (
          <div className="w-full rounded-none h-[10px] opacity-30" style={{ backgroundColor: item.color }} />
        )}
      </div>

      {/* ─── CONSTITUENT GROUPS (Fully Expanded with What-If Interactive Toggle) ─── */}
      <div className="flex-1 flex flex-col min-w-0 pt-1.5 border-t border-dashed border-[#303030]/60 gap-0.5 justify-start">
        {groups.map(g => {
          const isExcluded = excludedGroupIds.includes(g.id);
          const relPct = item.amount > 0 && !isExcluded ? ((g.amount / item.amount) * 100).toFixed(0) : 0;

          return (
            <button 
              type="button"
              key={g.id} 
              onClick={() => onToggleGroup && onToggleGroup(g.id)}
              className={`w-full flex items-center justify-between gap-2 py-1 px-1.5 min-w-0 group/item cursor-pointer select-none transition-none rounded-none text-left bg-transparent border-0 font-normal ${
                isExcluded 
                  ? 'bg-neutral-900/60 opacity-40 hover:opacity-75' 
                  : 'hover:bg-[#282828]'
              }`}
              title={isExcluded ? 'คลิกเพื่อเปิดหมวดหมู่นี้กลับมา' : 'คลิกเพื่อทดลองปิดหมวดหมู่นี้'}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span 
                  className="w-1.5 h-1.5 rounded-full shrink-0" 
                  style={{ backgroundColor: isExcluded ? '#525252' : (g.color || item.color) }} 
                />
                <span className="text-[10px] shrink-0 opacity-70">{g.icon || '✨'}</span>
                <span className={`text-[10.5px] font-bold truncate ${
                  isExcluded ? 'line-through text-slate-500' : 'text-slate-300 group-hover/item:text-slate-100'
                }`}>
                  {g.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[10px] font-bold tabular-nums ${
                  isExcluded ? 'line-through text-slate-600' : 'text-slate-400 group-hover/item:text-slate-300'
                }`}>
                  {formatMoney(g.amount)}
                </span>
                <span className="text-[10.5px] font-black tabular-nums w-8 text-right">
                  {isExcluded ? (
                    <EyeOff className="w-3 h-3 text-red-400/80 inline" />
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
          const sumGroups = activeGroups.reduce((acc, g) => acc + g.amount, 0);
          const surplus = item.amount - sumGroups;
          if (surplus <= 10) return null;

          const surplusPercent = item.amount > 0 ? ((surplus / item.amount) * 100).toFixed(0) : 0;

          return (
            <div className="flex items-center justify-between gap-2 py-1 px-1.5 mt-1 border-t border-dotted border-[#303030]/50 min-w-0 group/item">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] shrink-0 opacity-80">🌊</span>
                <span className="text-[10.5px] font-bold truncate text-emerald-400 group-hover/item:text-emerald-300">
                  Net Surplus (เหลือสุทธิ)
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-bold tabular-nums text-emerald-400 group-hover/item:text-emerald-300">
                  {formatMoney(surplus)}
                </span>
                <span className="text-[10.5px] font-black tabular-nums w-8 text-right text-emerald-400 group-hover/item:text-emerald-300">
                  {surplusPercent}%
                </span>
              </div>
            </div>
          );
        })()}

        {groups.length === 0 && !isSavings && (
          <div className="flex-1 flex items-center justify-center py-1">
            <span className="text-[9.5px] font-bold uppercase tracking-widest text-slate-600">No Data</span>
          </div>
        )}
      </div>
    </div>
  );
});

AllocationItem.displayName = 'AllocationItem';

/**
 * ExpenseProportion - The visual dashboard component for representing expenditures.
 */
function ExpenseProportion() {
  const { analytics, dm, showSkeleton } = useDashboardContext();
  const [displayMode, setDisplayMode] = useState('category'); // 'category', 'group', or 'allocation'
  const [sortMode, setSortMode] = useState('amount-desc'); // 'amount-desc', 'amount-asc', 'order-asc', 'order-desc', 'name-asc', 'name-desc'
  const [hoveredIdx, setHoveredIdx] = useState(-1); // Track hovered item for visual highlighting (-1 for none)
  const [excludedGroupIds, setExcludedGroupIds] = useState([]); // Track excluded groups in What-If simulation mode

  const { 
    sortedCats = [], chartTotal = 0,
    sortedGroups = [], totalExpense = 0,
    sortedAllocation = [], totalIncome = 0
  } = analytics;

  // Select data based on mode
  const isGroupMode = displayMode === 'group';
  const isAllocationMode = displayMode === 'allocation';

  const toggleGroupExclusion = useCallback((groupId) => {
    setExcludedGroupIds(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  }, []);

  const resetExclusions = useCallback(() => {
    setExcludedGroupIds([]);
  }, []);
  
  const changeDisplayMode = (mode) => {
    setDisplayMode(mode);
    setHoveredIdx(-1); // Reset hovered item when changing tabs
    setExcludedGroupIds([]); // Reset simulation when switching tabs
  };

  // Recalculate allocation amounts and percentages for What-If simulation
  const { simulatedAllocation, totalReduced } = useMemo(() => {
    if (!isAllocationMode || excludedGroupIds.length === 0) {
      return { simulatedAllocation: sortedAllocation, totalReduced: 0 };
    }

    const excludedSet = new Set(excludedGroupIds);
    const needsItem = sortedAllocation.find(a => a.id === 'needs');
    const wantsItem = sortedAllocation.find(a => a.id === 'wants');
    const savingsItem = sortedAllocation.find(a => a.id === 'savings');

    const needsGroups = needsItem?.groups || [];
    const wantsGroups = wantsItem?.groups || [];
    const savingsGroups = savingsItem?.groups || [];

    const activeNeedsTotal = needsGroups.filter(g => !excludedSet.has(g.id)).reduce((sum, g) => sum + g.amount, 0);
    const activeWantsTotal = wantsGroups.filter(g => !excludedSet.has(g.id)).reduce((sum, g) => sum + g.amount, 0);
    const activeSavingsTotal = savingsGroups.filter(g => !excludedSet.has(g.id)).reduce((sum, g) => sum + g.amount, 0);

    const origNeedsTotal = needsItem?.amount || 0;
    const origWantsTotal = wantsItem?.amount || 0;

    const reducedSum = (origNeedsTotal - activeNeedsTotal) + (origWantsTotal - activeWantsTotal);

    const baseIncome = totalIncome || (totalExpense + Math.max(0, analytics.netCashflow || 0));
    const simNetSavings = Math.max(0, baseIncome - (activeNeedsTotal + activeWantsTotal));

    const updatedAllocation = sortedAllocation.map(item => {
      let simAmount = item.amount;
      if (item.id === 'needs') simAmount = activeNeedsTotal;
      if (item.id === 'wants') simAmount = activeWantsTotal;
      if (item.id === 'savings') simAmount = simNetSavings;

      const simPercentage = baseIncome > 0 ? ((simAmount / baseIncome) * 100).toFixed(1) : '0';

      return {
        ...item,
        amount: simAmount,
        percentage: simPercentage,
      };
    });

    return { simulatedAllocation: updatedAllocation, totalReduced: reducedSum };
  }, [isAllocationMode, excludedGroupIds, sortedAllocation, totalIncome, totalExpense, analytics.netCashflow]);

  const rawItems = useMemo(() => {
    if (isGroupMode) return sortedGroups;
    if (isAllocationMode) return simulatedAllocation;
    return sortedCats;
  }, [isGroupMode, isAllocationMode, sortedGroups, simulatedAllocation, sortedCats]);

  const handleSortToggle = useCallback((targetType) => {
    setSortMode(prev => {
      if (targetType === 'amount') {
        return prev === 'amount-desc' ? 'amount-asc' : 'amount-desc';
      }
      if (targetType === 'order') {
        return prev === 'order-asc' ? 'order-desc' : 'order-asc';
      }
      return 'amount-desc';
    });
  }, []);

  // Apply Dynamic Sorting (Skip for allocation mode as it has fixed needs/wants/savings order)
  const activeItems = useMemo(() => {
    const items = [...rawItems];
    if (isAllocationMode) return items; // Keep original order
    
    return items.sort((a, b) => {
      const orderA = a.order_index ?? 999;
      const orderB = b.order_index ?? 999;

      if (sortMode === 'amount-desc' || sortMode === 'amount') {
        return (b.amount - a.amount) || (orderA - orderB);
      }
      if (sortMode === 'amount-asc') {
        return (a.amount - b.amount) || (orderA - orderB);
      }
      if (sortMode === 'order-asc' || sortMode === 'order') {
        return (orderA - orderB) || (b.amount - a.amount);
      }
      if (sortMode === 'order-desc') {
        return (orderB - orderA) || (b.amount - a.amount);
      }
      if (sortMode === 'name-asc') {
        return (a.name || '').localeCompare(b.name || '', 'th') || (b.amount - a.amount);
      }
      if (sortMode === 'name-desc') {
        return (b.name || '').localeCompare(a.name || '', 'th') || (b.amount - a.amount);
      }
      return (b.amount - a.amount);
    });
  }, [rawItems, sortMode, isAllocationMode]);

  // Sync Chart Data with Sorted Items (Dual-Ring Donut Chart in Group Mode)
  const activeChartData = useMemo(() => {
    if (isGroupMode) {
      // DUAL-RING DONUT CHART:
      // Outer Ring (datasets[0]): Constituent Categories under each group
      // Inner Ring (datasets[1]): Cashflow Groups
      const outerCategories = [];
      activeItems.forEach((group, gIdx) => {
        (group.categories || []).forEach(cat => {
          outerCategories.push({
            ...cat,
            groupIdx: gIdx,
            groupColor: group.color
          });
        });
      });

      const outerData = outerCategories.map(c => c.amount);
      const outerColors = outerCategories.map(c => {
        if (hoveredIdx === -1 || hoveredIdx === c.groupIdx) {
          return c.color || c.groupColor;
        }
        return `${c.color || c.groupColor}35`; // Fade non-hovered categories
      });
      const outerBorders = outerCategories.map(c => (hoveredIdx === c.groupIdx ? '#da291c' : '#181818'));
      const outerBorderWidths = outerCategories.map(c => (hoveredIdx === c.groupIdx ? 2 : 1));

      const innerData = activeItems.map(g => g.amount);
      const innerColors = activeItems.map((g, idx) => {
        if (hoveredIdx === -1 || hoveredIdx === idx) {
          return g.color;
        }
        return `${g.color}40`; // Fade non-hovered inner groups
      });
      const innerBorders = activeItems.map((_, idx) => (hoveredIdx === idx ? '#da291c' : '#181818'));
      const innerBorderWidths = activeItems.map((_, idx) => (hoveredIdx === idx ? 2 : 1));

      return {
        labels: [...outerCategories.map(c => `${c.name} (${c.relativePercentage}%)`), ...activeItems.map(g => g.name)],
        datasets: [
          {
            label: 'หมวดหมู่ย่อย (Outer)',
            data: outerData,
            backgroundColor: outerColors,
            borderColor: outerBorders,
            borderWidth: outerBorderWidths,
            spacing: 0, // Continuous slices inside outer ring
            offset: 4, // Radial offset creates 4px empty space between Donut 1 & Donut 2
            weight: 0.85,
          },
          {
            label: 'กลุ่มรายจ่าย (Inner)',
            data: innerData,
            backgroundColor: innerColors,
            borderColor: innerBorders,
            borderWidth: innerBorderWidths,
            spacing: 0, // Continuous slices inside inner ring
            offset: 0,
            weight: 1.15,
          }
        ]
      };
    }

    return {
      labels: activeItems.map(i => i.name),
      datasets: [{
        data: activeItems.map(i => i.amount),
        backgroundColor: activeItems.map((i, idx) => {
          if (hoveredIdx === -1 || hoveredIdx === idx) {
            return i.color;
          }
          return `${i.color}40`;
        }),
        borderWidth: activeItems.map((_, idx) => hoveredIdx === idx ? 3 : 2),
        borderColor: activeItems.map((_, idx) => {
          if (hoveredIdx === idx) return '#da291c';
          return '#303030';
        }),
      }],
    };
  }, [activeItems, isGroupMode, hoveredIdx]);

  const activeTotal = useMemo(() => {
    if (isGroupMode) return chartTotal; // FIXED: use chartTotal (filtered) to match sorted groups
    if (isAllocationMode) {
      // Use income as the 100% base. 
      // If in "All" period and no explicit income target is set, income is still the denominator.
      return totalIncome || (totalExpense + Math.max(0, analytics.netCashflow || 0));
    }
    return chartTotal;
  }, [isGroupMode, isAllocationMode, totalExpense, totalIncome, analytics.netCashflow, chartTotal]);

  const gridColsClass = (isGroupMode || isAllocationMode) ? 'grid-cols-3' : 'grid-cols-5';

  const itemCount = activeItems.length;

  const options = useMemo(() => {
    const baseOptions = getDoughnutChartOptions(dm);
    return {
      ...baseOptions,
      cutout: isGroupMode ? '48%' : '75%', 
      onHover: (event, elements) => {
        if (elements && elements.length > 0) {
          const el = elements[0];
          if (isGroupMode && el.datasetIndex === 0) {
            let count = 0;
            for (let gIdx = 0; gIdx < activeItems.length; gIdx++) {
              count += (activeItems[gIdx].categories || []).length;
              if (el.index < count) {
                setHoveredIdx(gIdx);
                break;
              }
            }
          } else {
            setHoveredIdx(el.index);
          }
        } else {
          setHoveredIdx(-1);
        }
      },
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          enabled: true,
          backgroundColor: '#121212',
          titleColor: '#ffffff',
          bodyColor: '#cbd5e1',
          borderColor: '#da291c',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 0,
          displayColors: true,
          callbacks: {
            label: (ctx) => {
              const val = ctx.raw || 0;
              const pct = activeTotal > 0 ? ((val / activeTotal) * 100).toFixed(1) : 0;
              return ` ฿${formatMoney(val)} (${pct}%)`;
            }
          }
        }
      }
    };
  }, [dm, isGroupMode, activeItems, activeTotal]);
  
  const cardClass = "rounded-none border shadow-sm flex flex-col w-full bg-[#181818] border-[#303030] relative overflow-visible z-10";

  if (itemCount === 0 && !showSkeleton) {
    return (
      <div className={`${cardClass} p-10 items-center justify-center text-center opacity-60`}>
        <Inbox className="w-10 h-10 mb-2 opacity-20" />
        <p className="text-sm font-bold uppercase tracking-widest">No Expense Data</p>
      </div>
    );
  }

  return (
    <div className={cardClass}>
      {/* ─── HEADER (Editorial Style) ─── */}
      <div className="px-4 py-2 border-b flex items-center justify-between bg-[#121212]/80 border-[#2d2d2d]">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-[3px] h-3 bg-[#da291c] shrink-0" /> {/* Rosso Corsa racing line brand accent */}
          <PieChart className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-200">
            สัดส่วนรายจ่าย (Proportions)
          </span>

          {/* Mode Switcher */}
          <div className="ml-4 flex items-center gap-[1px] p-[2px] rounded-none border bg-[#181818] border-[#303030]/60">
            <button 
              onClick={() => changeDisplayMode('category')}
              className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter rounded-none transition-none ${
                displayMode === 'category' 
                ? 'bg-[#da291c] text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              รายหมวด
            </button>
            <button 
              onClick={() => changeDisplayMode('group')}
              className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter rounded-none transition-none ${
                displayMode === 'group' 
                ? 'bg-[#da291c] text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ตามกลุ่ม
            </button>
            <button 
              onClick={() => changeDisplayMode('allocation')}
              className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter rounded-none transition-none ${
                displayMode === 'allocation' 
                ? 'bg-[#da291c] text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              สัดส่วน 50/30/20
            </button>
          </div>

          {/* Sort Switcher (Hidden in Allocation mode) */}
          {!isAllocationMode && (
            <div className="ml-2 flex items-center gap-[1px] p-[2px] rounded-none border bg-[#181818] border-[#303030]/60">
              <button 
                onClick={() => handleSortToggle('amount')}
                title={sortMode.startsWith('amount') ? (sortMode === 'amount-desc' ? "เรียงตามยอดเงิน: มากไปน้อย (คลิกเพื่อสลับ)" : "เรียงตามยอดเงิน: น้อยไปมาก (คลิกเพื่อสลับ)") : "เรียงตามยอดเงิน"}
                className={`px-1.5 py-0.5 rounded-none transition-none flex items-center gap-0.5 text-[10px] font-bold ${
                  sortMode.startsWith('amount') 
                  ? 'bg-amber-500/20 text-amber-400 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowDownWideNarrow className={`w-3.5 h-3.5 transition-transform duration-100 ${sortMode === 'amount-asc' ? 'rotate-180' : ''}`} />
                {sortMode.startsWith('amount') && (
                  <span className="text-[9px] font-black">{sortMode === 'amount-asc' ? '↑' : '↓'}</span>
                )}
              </button>

              <button 
                onClick={() => handleSortToggle('order')}
                title={sortMode.startsWith('order') ? (sortMode === 'order-asc' ? "เรียงตามลำดับหมวดหมู่: น้อยไปมาก (คลิกเพื่อสลับ)" : "เรียงตามลำดับหมวดหมู่: มากไปน้อย (คลิกเพื่อสลับ)") : "เรียงตามลำดับหมวดหมู่"}
                className={`px-1.5 py-0.5 rounded-none transition-none flex items-center gap-0.5 text-[10px] font-bold ${
                  sortMode.startsWith('order') 
                  ? 'bg-[#da291c]/20 text-[#da291c] shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ListOrdered className={`w-3.5 h-3.5 transition-transform duration-100 ${sortMode === 'order-desc' ? 'rotate-180' : ''}`} />
                {sortMode.startsWith('order') && (
                  <span className="text-[9px] font-black">{sortMode === 'order-desc' ? '↓' : '↑'}</span>
                )}
              </button>
            </div>
          )}

          {/* What-If Simulation Active Badge & Reset Button */}
          {isAllocationMode && excludedGroupIds.length > 0 && (
            <div className="ml-2 flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/15 border border-amber-500/40 rounded-none text-[9.5px]">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="font-black text-amber-300 uppercase tracking-wider">
                จำลองลด {excludedGroupIds.length} หมวด (-฿{formatMoney(totalReduced)})
              </span>
              <button
                onClick={resetExclusions}
                className="ml-1 px-1.5 py-0.2 bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 font-bold rounded-none flex items-center gap-1 transition-none"
                title="คืนค่าหมวดหมู่ทั้งหมด"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>คืนค่า</span>
              </button>
            </div>
          )}
        </div>
        <span className="text-[9px] font-black px-1.5 rounded-full bg-[#da291c]/10 text-[#da291c]">
          {showSkeleton ? '...' : `${itemCount} ${isAllocationMode ? 'ส่วน' : (isGroupMode ? 'กลุ่ม' : 'หมวดหมู่')}`}
        </span>
      </div>

      {/* ─── MONOLITHIC CONTENT ─── */}
      {showSkeleton ? (
        <div className="flex flex-row items-stretch h-32">
          <div className="shrink-0 w-[133px] flex items-center justify-center border-r border-dashed border-[#303030]/40 bg-[#303030]/30">
             <div className="w-20 h-24 rounded-full animate-pulse bg-[#303030]" />
          </div>
          <div className="flex-1 grid grid-cols-5 gap-[1px] bg-[#303030]/20">
             {[...new Array(5)].map((_, i) => (
                <div key={i} className="p-2 animate-pulse bg-[#303030]/40">
                   <div className="h-2 w-12 mb-2 rounded-sm bg-[#303030]" />
                   <div className="h-4 w-16 mb-2 rounded-sm bg-[#303030]" />
                   <div className="h-1 w-full rounded-sm bg-[#303030]" />
                </div>
             ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-row items-stretch min-h-[140px]">

          {/* LEFT: CHART ANCHOR (No Padding) */}
          <div className="shrink-0 flex flex-col items-center justify-center p-3 border-r border-dashed border-[#303030] bg-[#181818]/20">
            <div className="relative w-[140px] h-[140px]">
              <Doughnut data={activeChartData} options={options} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-[8px] font-black uppercase tracking-widest opacity-40 text-slate-400">
                   {isAllocationMode ? 'Income' : 'Total'}
                 </span>
                 <span className="text-[12px] font-black tabular-nums text-slate-100">
                   {formatMoney(activeTotal)}
                 </span>
              </div>
            </div>
          </div>

          {/* RIGHT: TABLE-GRID HUD */}
          <div className={`flex-1 grid ${gridColsClass} gap-px bg-[#303030]/50`}>
             {activeItems.map((item, idx) => {
               const isHovered = hoveredIdx === idx;
               if (isAllocationMode) {
                 return (
                   <AllocationItem 
                     key={item.id || idx} 
                     item={item} 
                     idx={idx} 
                     isHovered={isHovered} 
                     onHover={setHoveredIdx} 
                     activeTotal={activeTotal} 
                     excludedGroupIds={excludedGroupIds}
                     onToggleGroup={toggleGroupExclusion}
                   />
                 );
               }
               if (isGroupMode) return <GroupItem key={item.id || idx} item={item} idx={idx} isHovered={isHovered} onHover={setHoveredIdx} isSingleMonthView={analytics.isSingleMonthView} sortMode={sortMode} />;
               return <CatItem key={item.id || idx} cat={item} idx={idx} isHovered={isHovered} onHover={setHoveredIdx} />;
             })}
             {/* Fill empty cells to maintain grid borders if needed */}
             {![isAllocationMode, isGroupMode].some(Boolean) && [...new Array((5 - (itemCount % 5)) % 5)].map((_, i) => (
                <div key={`empty-${i}`} className="bg-[#181818]/10" />
               ))}
             {(isAllocationMode || isGroupMode) && [...new Array((3 - (itemCount % 3)) % 3)].map((_, i) => (
                <div key={`empty-grid3-${i}`} className="bg-[#181818]/10" />
               ))}
          </div>

        </div>
      )}
    </div>
  );
}

export default React.memo(ExpenseProportion);
