// src/views/Dashboard/components/ExpenseProportion/GroupItem.tsx
import React, { useMemo } from 'react';
import { formatMoney } from '../../../../utils/formatters';
import { GroupCategoryItemData, GroupItemProps } from './types';

/**
 * Sub-component for Group cell (With Category breakdown)
 */
export const GroupItem = React.memo<GroupItemProps>(({
  item,
  idx,
  isHovered,
  onHover,
  isSingleMonthView,
  sortMode = 'amount-desc',
}) => {
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
            {!isSingleMonthView && item.avgPerMonth !== undefined && (
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
              return categories.map((c: GroupCategoryItemData, cIdx: number) => {
                const relPct = typeof c.relativePercentage === 'number' 
                  ? c.relativePercentage 
                  : Number.parseFloat(String(c.relativePercentage)) || 0;
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
                      width: `${relPct}%`, 
                      backgroundColor: c.color || item.color 
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/15" />
                    
                    {/* Segment Hover Popover Tooltip */}
                    <div className={`absolute bottom-full ${alignClass} mb-2 hidden group-hover/seg:flex flex-col whitespace-nowrap px-2.5 py-1.5 bg-[#121212] border border-[#303030] shadow-2xl rounded-none z-[50] text-[9px] pointer-events-none`}>
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

      {/* ─── CONSTITUENT CATEGORIES ─── */}
      <div className="flex-1 flex flex-col min-w-0 pt-1.5 border-t border-dashed border-[#303030]/60 gap-[2px] justify-start">
        {categories.map((c: GroupCategoryItemData) => (
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
export default GroupItem;
