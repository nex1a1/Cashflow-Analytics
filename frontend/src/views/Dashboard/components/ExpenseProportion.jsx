// src/views/Dashboard/components/ExpenseProportion.jsx
import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Doughnut } from 'react-chartjs-2';
import { PieChart, Inbox, ArrowDownWideNarrow, ListOrdered } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';
import { getDoughnutChartOptions } from '../../../utils/chartOptions';
import { useDashboardContext } from '../context/DashboardContext';

/**
 * Sub-component for individual category cell (Table-like HUD)
 */
const CatItem = React.memo(({ cat, dm, idx, isHovered, onHover }) => (
  <div 
    onMouseEnter={() => onHover(idx)}
    onMouseLeave={() => onHover(null)}
    className={`flex flex-col min-w-0 p-2 group cursor-default h-full border-l-2 transition-all ${
      isHovered 
        ? ('bg-slate-850 border-blue-500 scale-[1.02] shadow-md z-10')
        : ('bg-slate-950/45 hover:bg-slate-900/90 border-slate-850')
    }`}
    style={{ borderLeftColor: isHovered ? undefined : cat.color }}
  >
    <div className="flex justify-between items-start gap-1 mb-1">
      <span 
        className="text-[12px] font-black truncate flex items-center gap-1 min-w-0" 
        style={{ color: '#94a3b8' }}
        title={cat.name}
      >
        <span className="shrink-0 leading-none group-hover:scale-110 transition-transform" style={{ color: cat.color }}>{cat.icon}</span>
        <span className="truncate group-hover:text-blue-500 transition-colors uppercase tracking-tight">{cat.name}</span>
      </span>
      <div className="flex flex-col items-end shrink-0 leading-none">
        <span className="text-[10px] font-bold tabular-nums opacity-60 mb-0.5" style={{ color: '#cbd5e1' }}>
          {formatMoney(cat.amount)}
        </span>
        <span className="text-xs font-black tabular-nums" style={{ color: cat.color }}>{cat.percentage}%</span>
      </div>
    </div>
    
    <div className="mt-auto flex flex-col gap-1">
      <div className={`w-full rounded-full h-[4px] overflow-hidden ${'bg-slate-950'}`}>
        <div 
          className="h-full transition-all duration-1000" 
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

/**
 * Sub-component for Group cell (With Category breakdown)
 */
const GroupItem = React.memo(({ item, dm, idx, isHovered, onHover, isSingleMonthView }) => (
  <div 
    onMouseEnter={() => onHover(idx)}
    onMouseLeave={() => onHover(null)}
    className={`flex flex-col min-w-0 p-3 group cursor-default h-full border-l-2 transition-all ${
      isHovered 
        ? ('bg-slate-850 border-blue-500 scale-[1.02] shadow-md z-10')
        : ('bg-slate-950/45 hover:bg-slate-900/90 border-slate-850')
    }`}
    style={{ borderLeftColor: isHovered ? undefined : item.color }}
  >
    {/* ─── HEADER ─── */}
    <div className="flex justify-between items-start gap-2 mb-3">
      <div className="flex flex-col min-w-0 gap-1.5">
        <span className="text-[16px] font-black uppercase tracking-wider flex items-center gap-1.5 truncate" style={{ color: item.color }}>
          <span className="shrink-0 opacity-80 group-hover:scale-110 transition-transform">{item.icon || '📁'}</span>
          <span className="truncate group-hover:brightness-125 transition-all">{item.name}</span>
        </span>
        <div className="flex items-center gap-1.5">
          {!isSingleMonthView && (
            <span className={`text-[8.5px] font-bold tracking-widest uppercase ${'text-slate-400'}`}>
              เฉลี่ย  ฿{formatMoney(item.avgPerMonth)} / เดือน
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
        <span className={`text-[9px] font-bold tabular-nums opacity-60 ${'text-slate-300'}`}>
          ฿ {formatMoney(item.amount)}
        </span>
      </div>
    </div>
    
    {/* ─── PROGRESS BAR ─── */}
    <div className="mb-3">
      <div className={`w-full rounded-sm h-[6px] overflow-hidden relative ${'bg-slate-950'}`}>
        <div 
          className="h-full transition-all duration-1000 relative" 
          style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
        >
           {/* Premium Gradient Overlay */}
           <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
        </div>
      </div>
    </div>

    {/* ─── CONSTITUENT CATEGORIES ─── */}
    <div className={`flex-1 flex flex-col pt-2 border-t border-dashed ${'border-slate-700/60'}`}>
      <div className="flex flex-col gap-0.5 overflow-y-auto pr-1 custom-scrollbar h-[72px]">
        {(item.categories || []).map(c => (
          <div key={c.id} className="flex items-center justify-between gap-2 py-0.5 group/item">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[9px] shrink-0 opacity-70 group-hover/item:scale-110 transition-transform">{c.icon || '✨'}</span>
              <span className={`text-[9px] font-bold truncate ${'text-slate-400 group-hover/item:text-slate-200'} transition-colors`}>
                {c.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-[8.5px] font-bold tabular-nums ${'text-slate-500 group-hover/item:text-slate-400'} transition-colors`}>
                {formatMoney(c.amount)}
              </span>
              <span className={`text-[9px] font-black tabular-nums w-5 text-right ${'text-slate-300 group-hover/item:text-slate-100'} transition-colors`}>
                {c.relativePercentage}%
              </span>
            </div>
          </div>
        ))}
        {(!item.categories || item.categories.length === 0) && (
           <div className="flex-1 flex items-center justify-center py-1">
              <span className={`text-[8.5px] font-bold uppercase tracking-widest ${'text-slate-600'}`}>No Data</span>
           </div>
        )}
      </div>
    </div>
  </div>
));

/**
 * Sub-component for Allocation Ratio cell (Special UX)
 */
const AllocationItem = React.memo(({ item, dm, idx, isHovered, onHover }) => {
  const percentage = parseFloat(item.percentage) || 0;
  const diff = percentage - item.target;
  const isOver = item.id !== 'savings' && diff > 5;
  const isUnder = item.id === 'savings' && diff < -5;
  const isGood = !isOver && !isUnder;
  const isAlert = isOver || isUnder;

  return (
    <div 
      onMouseEnter={() => onHover(idx)}
      onMouseLeave={() => onHover(null)}
      className={`flex flex-col min-w-0 p-3 group cursor-default h-full border-l-2 transition-all ${
        isHovered 
          ? ('bg-slate-850 border-blue-500 scale-[1.02] shadow-md z-10')
          : ('bg-slate-950/45 hover:bg-slate-900/90 border-slate-850')
      }`}
      style={{ borderLeftColor: isHovered ? undefined : item.color }}
    >
      {/* ─── HEADER ─── */}
      <div className="flex justify-between items-start gap-2 mb-3">
        <div className="flex flex-col min-w-0 gap-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 truncate" style={{ color: item.color }}>
            <span className="shrink-0 opacity-80">{item.icon}</span>
            <span className="truncate">{item.name}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`text-[8px] font-bold tracking-widest uppercase ${'text-slate-400'}`}>
              Target {item.target}%
            </span>
            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${
              isGood ? ('bg-emerald-500/10 text-emerald-400') : 
              (isOver ? ('bg-red-500/10 text-red-400') : 
              ('bg-amber-500/10 text-amber-400'))
            }`}>
              {isGood ? 'Optimal' : (isOver ? 'Over Limit' : 'Below')}
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
          <span className={`text-[9px] font-bold tabular-nums opacity-60 ${'text-slate-300'}`}>
            ฿ {formatMoney(item.amount)}
          </span>
        </div>
      </div>
      
      {/* ─── PROGRESS BAR ─── */}
      <div className="mb-3">
        <div className={`w-full rounded-sm h-[6px] overflow-hidden relative ${'bg-slate-950'}`}>
          <div 
            className={`h-full transition-all duration-1000 relative ${isAlert ? 'animate-pulse' : ''}`} 
            style={{ width: `${percentage}%`, backgroundColor: item.color }}
          >
             {/* Premium Gradient Overlay */}
             <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
          </div>
          {/* Target Marker */}
          <div 
            className="absolute top-0 bottom-0 w-[2px] shadow-sm z-10" 
            style={{ left: `${item.target}%`, backgroundColor: '#fff', opacity: 0.8 }} 
          />
        </div>
      </div>

      {/* ─── CONSTITUENT GROUPS ─── */}
      <div className={`flex-1 flex flex-col pt-2 border-t border-dashed ${'border-slate-700/60'}`}>
        <div className="flex flex-col gap-0.5 overflow-y-auto pr-1 custom-scrollbar h-[72px]">
          {(item.groups || []).map(g => (
            <div key={g.id} className="flex items-center justify-between gap-2 py-0.5 group/item">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[9px] shrink-0 opacity-70 group-hover/item:scale-110 transition-transform">{g.icon || '✨'}</span>
                <span className={`text-[9px] font-bold truncate ${'text-slate-400 group-hover/item:text-slate-200'} transition-colors`}>
                  {g.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[8.5px] font-bold tabular-nums ${'text-slate-500 group-hover/item:text-slate-400'} transition-colors`}>
                  {formatMoney(g.amount)}
                </span>
                <span className={`text-[9px] font-black tabular-nums w-5 text-right ${'text-slate-300 group-hover/item:text-slate-100'} transition-colors`}>
                  {item.amount > 0 ? ((g.amount / item.amount) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>
          ))}

          {/* ─── NET SURPLUS (Remainder) ─── */}
          {item.id === 'savings' && (() => {
            const sumGroups = (item.groups || []).reduce((acc, g) => acc + g.amount, 0);
            const surplus = item.amount - sumGroups;
            if (surplus <= 10) return null; // Ignore tiny floating point diffs

            const surplusPercent = item.amount > 0 ? ((surplus / item.amount) * 100).toFixed(0) : 0;

            return (
              <div className={`flex items-center justify-between gap-2 py-1 mt-1 border-t border-dotted ${'border-slate-700/50'} group/item`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[9px] shrink-0 opacity-80 group-hover/item:scale-110 transition-transform">🌊</span>
                  <span className={`text-[9px] font-bold truncate ${'text-blue-400 group-hover/item:text-blue-300'} transition-colors`}>
                    Net Surplus (เหลือสุทธิ)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[8.5px] font-bold tabular-nums opacity-70 ${'text-blue-400 group-hover/item:text-blue-300'} transition-colors`}>
                    {formatMoney(surplus)}
                  </span>
                  <span className={`text-[9px] font-black tabular-nums w-5 text-right ${'text-blue-400 group-hover/item:text-blue-300'} transition-colors`}>
                    {surplusPercent}%
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
});

export default function ExpenseProportion() {
  const { analytics, dm, showSkeleton } = useDashboardContext();
  const [displayMode, setDisplayMode] = useState('category'); // 'category', 'group', or 'allocation'
  const [sortMode, setSortMode] = useState('amount'); // 'amount' or 'order'
  const [hoveredIdx, setHoveredIdx] = useState(null); // Track hovered item for visual highlighting

  const { 
    sortedCats = [], chartTotal = 0,
    sortedGroups = [], totalExpense = 0,
    sortedAllocation = [], totalIncome = 0
  } = analytics;

  // Select data based on mode
  const isGroupMode = displayMode === 'group';
  const isAllocationMode = displayMode === 'allocation';
  
  const changeDisplayMode = (mode) => {
    setDisplayMode(mode);
    setHoveredIdx(null); // Reset hovered item when changing tabs
  };

  const rawItems = useMemo(() => {
    if (isGroupMode) return sortedGroups;
    if (isAllocationMode) return sortedAllocation;
    return sortedCats;
  }, [isGroupMode, isAllocationMode, sortedGroups, sortedAllocation, sortedCats]);

  // Apply Dynamic Sorting (Skip for allocation mode as it has fixed needs/wants/savings order)
  const activeItems = useMemo(() => {
    const items = [...rawItems];
    if (isAllocationMode) return items; // Keep original order
    
    if (sortMode === 'amount') {
      return items.sort((a, b) => b.amount - a.amount);
    } else {
      // Sort by order_index, then by amount as fallback
      return items.sort((a, b) => (a.order_index - b.order_index) || (b.amount - a.amount));
    }
  }, [rawItems, sortMode, isAllocationMode]);

  // Sync Chart Data with Sorted Items
  const activeChartData = useMemo(() => {
    return {
      labels: activeItems.map(i => i.name),
      datasets: [{
        data: activeItems.map(i => i.amount),
        backgroundColor: activeItems.map((i, idx) => {
          if (hoveredIdx === null || hoveredIdx === idx) {
            return i.color;
          }
          // Elite styling: Fade out non-hovered segments
          return `${i.color}40`;
        }),
        borderWidth: activeItems.map((_, idx) => hoveredIdx === idx ? 3 : 2),
        borderColor: activeItems.map((_, idx) => {
          if (hoveredIdx === idx) return '#3b82f6';
          return '#1e293b';
        }),
      }],
    };
  }, [activeItems, dm, hoveredIdx]);

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
      cutout: '75%', 
      plugins: {
        ...baseOptions.plugins,
        tooltip: { enabled: false }
      }
    };
  }, [dm]);
  
  const cardClass = `rounded-sm border shadow-sm transition-all duration-300 flex flex-col w-full overflow-hidden ${
    'bg-slate-900 border-slate-800'
  }`;

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
      {/* ─── HEADER (Ultra Tighter) ─── */}
      <div className={`px-3 py-1.5 border-b flex items-center justify-between ${'bg-slate-950/40 border-slate-800/60'}`}>
        <div className="flex items-center gap-1.5">
          <PieChart className={`w-3 h-3 ${'text-blue-400'}`} />
          <span className={`text-[9px] font-black uppercase tracking-widest ${'text-slate-400'}`}>
            สัดส่วนรายจ่าย (Proportions)
          </span>

          {/* Mode Switcher */}
          <div className={`ml-4 flex items-center gap-[1px] p-[2px] rounded-sm border ${'bg-slate-950 border-slate-800/60'}`}>
            <button 
              onClick={() => changeDisplayMode('category')}
              className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter rounded-sm transition-all ${
                displayMode === 'category' 
                ? ('bg-blue-600 text-white shadow-sm') 
                : ('text-slate-500 hover:text-slate-300')
              }`}
            >
              รายหมวด
            </button>
            <button 
              onClick={() => changeDisplayMode('group')}
              className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter rounded-sm transition-all ${
                displayMode === 'group' 
                ? ('bg-blue-600 text-white shadow-sm') 
                : ('text-slate-500 hover:text-slate-300')
              }`}
            >
              ตามกลุ่ม
            </button>
            <button 
              onClick={() => changeDisplayMode('allocation')}
              className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter rounded-sm transition-all ${
                displayMode === 'allocation' 
                ? ('bg-blue-600 text-white shadow-sm') 
                : ('text-slate-500 hover:text-slate-300')
              }`}
            >
              สัดส่วน 50/30/20
            </button>
          </div>

          {/* Sort Switcher (Hidden in Allocation mode) */}
          {!isAllocationMode && (
            <div className={`ml-2 flex items-center gap-[1px] p-[2px] rounded-sm border ${'bg-slate-950 border-slate-800/60'}`}>
              <button 
                onClick={() => setSortMode('amount')}
                title="เรียงตามยอดเงิน (มากไปน้อย)"
                className={`px-1.5 py-0.5 rounded-sm transition-all ${
                  sortMode === 'amount' 
                  ? ('bg-amber-500/20 text-amber-400 shadow-sm') 
                  : ('text-slate-500 hover:text-slate-300')
                }`}
              >
                <ArrowDownWideNarrow className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setSortMode('order')}
                title="เรียงตามลำดับหมวดหมู่"
                className={`px-1.5 py-0.5 rounded-sm transition-all ${
                  sortMode === 'order' 
                  ? ('bg-blue-500/20 text-blue-400 shadow-sm') 
                  : ('text-slate-500 hover:text-slate-300')
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        <span className={`text-[9px] font-black px-1.5 rounded-full ${'bg-blue-500/10 text-blue-400'}`}>
          {showSkeleton ? '...' : `${itemCount} ${isAllocationMode ? 'ส่วน' : (isGroupMode ? 'กลุ่ม' : 'หมวดหมู่')}`}
        </span>
      </div>

      {/* ─── MONOLITHIC CONTENT ─── */}
      {showSkeleton ? (
        <div className="flex flex-row items-stretch h-32">
          <div className={`shrink-0 w-[133px] flex items-center justify-center border-r border-dashed border-slate-700/40 ${'bg-slate-900/30'}`}>
             <div className={`w-20 h-24 rounded-full animate-pulse ${'bg-slate-800'}`} />
          </div>
          <div className="flex-1 grid grid-cols-5 gap-[1px] bg-slate-700/20">
             {[...Array(5)].map((_, i) => (
                <div key={i} className={`p-2 animate-pulse ${'bg-slate-800/40'}`}>
                   <div className={`h-2 w-12 mb-2 rounded-sm ${'bg-slate-700'}`} />
                   <div className={`h-4 w-16 mb-2 rounded-sm ${'bg-slate-700'}`} />
                   <div className={`h-1 w-full rounded-sm ${'bg-slate-700'}`} />
                </div>
             ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-row items-stretch min-h-[140px]">

          {/* LEFT: CHART ANCHOR (No Padding) */}
          <div className={`shrink-0 flex flex-col items-center justify-center p-3 border-r border-dashed ${'border-slate-850 bg-slate-950/20'}`}>
            <div className="relative w-[140px] h-[140px]">
              <Doughnut data={activeChartData} options={options} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className={`text-[8px] font-black uppercase tracking-widest opacity-40 ${'text-slate-400'}`}>
                   {isAllocationMode ? 'Income' : 'Total'}
                 </span>
                 <span className={`text-[12px] font-black tabular-nums ${'text-slate-100'}`}>
                   {formatMoney(activeTotal)}
                 </span>
              </div>
            </div>
          </div>

          {/* RIGHT: TABLE-GRID HUD */}
          <div className={`flex-1 grid ${gridColsClass} gap-px ${'bg-slate-800/50'}`}>
             {activeItems.map((item, idx) => {
               const isHovered = hoveredIdx === idx;
               if (isAllocationMode) return <AllocationItem key={item.id || idx} item={item} dm={dm} idx={idx} isHovered={isHovered} onHover={setHoveredIdx} />;
               if (isGroupMode) return <GroupItem key={item.id || idx} item={item} dm={dm} idx={idx} isHovered={isHovered} onHover={setHoveredIdx} isSingleMonthView={analytics.isSingleMonthView} />;
               return <CatItem key={item.id || idx} cat={item} dm={dm} idx={idx} isHovered={isHovered} onHover={setHoveredIdx} />;
             })}
             {/* Fill empty cells to maintain grid borders if needed */}
             {![isAllocationMode, isGroupMode].some(Boolean) && [...Array((5 - (itemCount % 5)) % 5)].map((_, i) => (
                <div key={`empty-${i}`} className={`${'bg-slate-950/10'}`} />
              ))}
             {(isAllocationMode || isGroupMode) && [...Array((3 - (itemCount % 3)) % 3)].map((_, i) => (
                <div key={`empty-grid3-${i}`} className={`${'bg-slate-950/10'}`} />
              ))}
          </div>

        </div>
      )}
    </div>
  );
}
