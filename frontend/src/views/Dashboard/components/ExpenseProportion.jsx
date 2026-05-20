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
const CatItem = React.memo(({ cat, dm, idx }) => (
  <div 
    className={`flex flex-col min-w-0 p-2 group cursor-default h-full border-l-2 ${dm ? 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/50' : 'bg-slate-50 hover:bg-slate-100 border-slate-100'} transition-all`}
    style={{ borderLeftColor: cat.color }}
  >
    <div className="flex justify-between items-start gap-1 mb-1">
      <span 
        className="text-[10px] font-black truncate flex items-center gap-1 min-w-0" 
        style={{ color: dm ? '#94a3b8' : '#64748b' }}
        title={cat.name}
      >
        <span className="shrink-0 leading-none group-hover:scale-110 transition-transform" style={{ color: cat.color }}>{cat.icon}</span>
        <span className="truncate group-hover:text-blue-500 transition-colors uppercase tracking-tight">{cat.name}</span>
      </span>
      <div className="flex flex-col items-end shrink-0 leading-none">
        <span className="text-[9px] font-bold tabular-nums opacity-60 mb-0.5" style={{ color: dm ? '#cbd5e1' : '#475569' }}>
          {formatMoney(cat.amount)}
        </span>
        <span className="text-xs font-black tabular-nums" style={{ color: cat.color }}>{cat.percentage}%</span>
      </div>
    </div>
    
    <div className="mt-auto flex flex-col gap-1">
      <div className={`w-full rounded-full h-[4px] overflow-hidden ${dm ? 'bg-slate-700/40' : 'bg-slate-100'}`}>
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
const GroupItem = React.memo(({ item, dm, isSingleMonthView }) => (
  <div 
    className={`flex flex-col min-w-0 p-3 group cursor-default h-full border-l-2 ${dm ? 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/50' : 'bg-slate-50 hover:bg-slate-100 border-slate-100'} transition-all`}
    style={{ borderLeftColor: item.color }}
  >
    {/* ─── HEADER ─── */}
    <div className="flex justify-between items-start gap-2 mb-3">
      <div className="flex flex-col min-w-0 gap-1.5">
        <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 truncate" style={{ color: item.color }}>
          <span className="shrink-0 opacity-80 group-hover:scale-110 transition-transform">{item.icon || '📁'}</span>
          <span className="truncate group-hover:brightness-125 transition-all">{item.name}</span>
        </span>
        <div className="flex items-center gap-1.5">
          {!isSingleMonthView && (
            <span className={`text-[8.5px] font-bold tracking-widest uppercase ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
              AVG. ฿{formatMoney(item.avgPerMonth)} / MO
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
        <span className={`text-[9px] font-bold tabular-nums opacity-60 ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
          ฿ {formatMoney(item.amount)}
        </span>
      </div>
    </div>
    
    {/* ─── PROGRESS BAR ─── */}
    <div className="mb-3">
      <div className={`w-full rounded-sm h-[6px] overflow-hidden relative ${dm ? 'bg-slate-900/60' : 'bg-slate-200'}`}>
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
    <div className={`flex-1 flex flex-col pt-2 border-t border-dashed ${dm ? 'border-slate-700/60' : 'border-slate-200'}`}>
      <div className="flex flex-col gap-0.5 overflow-y-auto pr-1 custom-scrollbar h-[72px]">
        {(item.categories || []).map(c => (
          <div key={c.id} className="flex items-center justify-between gap-2 py-0.5 group/item">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[9px] shrink-0 opacity-70 group-hover/item:scale-110 transition-transform">{c.icon || '✨'}</span>
              <span className={`text-[9px] font-bold truncate ${dm ? 'text-slate-400 group-hover/item:text-slate-200' : 'text-slate-500 group-hover/item:text-slate-800'} transition-colors`}>
                {c.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-[8.5px] font-bold tabular-nums ${dm ? 'text-slate-500 group-hover/item:text-slate-400' : 'text-slate-400 group-hover/item:text-slate-500'} transition-colors`}>
                {formatMoney(c.amount)}
              </span>
              <span className={`text-[9px] font-black tabular-nums w-5 text-right ${dm ? 'text-slate-300 group-hover/item:text-slate-100' : 'text-slate-600 group-hover/item:text-slate-900'} transition-colors`}>
                {c.relativePercentage}%
              </span>
            </div>
          </div>
        ))}
        {(!item.categories || item.categories.length === 0) && (
           <div className="flex-1 flex items-center justify-center py-1">
              <span className={`text-[8.5px] font-bold uppercase tracking-widest ${dm ? 'text-slate-600' : 'text-slate-300'}`}>No Data</span>
           </div>
        )}
      </div>
    </div>
  </div>
));

/**
 * Sub-component for Allocation Ratio cell (Special UX)
 */
const AllocationItem = React.memo(({ item, dm }) => {
  const diff = item.percentage - item.target;
  const isOver = item.id !== 'savings' && diff > 5;
  const isUnder = item.id === 'savings' && diff < -5;
  const isGood = !isOver && !isUnder;

  return (
    <div 
      className={`flex flex-col min-w-0 p-3 group cursor-default h-full border-l-2 ${dm ? 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/50' : 'bg-slate-50 hover:bg-slate-100 border-slate-100'} transition-all`}
      style={{ borderLeftColor: item.color }}
    >
      {/* ─── HEADER ─── */}
      <div className="flex justify-between items-start gap-2 mb-3">
        <div className="flex flex-col min-w-0 gap-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 truncate" style={{ color: item.color }}>
            <span className="shrink-0 opacity-80">{item.icon}</span>
            <span className="truncate">{item.name}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`text-[8px] font-bold tracking-widest uppercase ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
              Target {item.target}%
            </span>
            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${
              isGood ? (dm ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : 
              (isOver ? (dm ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600') : 
              (dm ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'))
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
          <span className={`text-[9px] font-bold tabular-nums opacity-60 ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
            ฿ {formatMoney(item.amount)}
          </span>
        </div>
      </div>
      
      {/* ─── PROGRESS BAR ─── */}
      <div className="mb-3">
        <div className={`w-full rounded-sm h-[6px] overflow-hidden relative ${dm ? 'bg-slate-900/60' : 'bg-slate-200'}`}>
          <div 
            className="h-full transition-all duration-1000 relative" 
            style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
          >
             {/* Premium Gradient Overlay */}
             <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
          </div>
          {/* Target Marker */}
          <div 
            className="absolute top-0 bottom-0 w-[2px] shadow-sm z-10" 
            style={{ left: `${item.target}%`, backgroundColor: dm ? '#fff' : '#000', opacity: 0.8 }} 
          />
        </div>
      </div>

      {/* ─── CONSTITUENT GROUPS ─── */}
      <div className={`flex-1 flex flex-col pt-2 border-t border-dashed ${dm ? 'border-slate-700/60' : 'border-slate-200'}`}>
        <div className="flex flex-col gap-0.5 overflow-y-auto pr-1 custom-scrollbar h-[72px]">
          {(item.groups || []).map(g => (
            <div key={g.id} className="flex items-center justify-between gap-2 py-0.5 group/item">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[9px] shrink-0 opacity-70 group-hover/item:scale-110 transition-transform">{g.icon || '✨'}</span>
                <span className={`text-[9px] font-bold truncate ${dm ? 'text-slate-400 group-hover/item:text-slate-200' : 'text-slate-500 group-hover/item:text-slate-800'} transition-colors`}>
                  {g.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[8.5px] font-bold tabular-nums ${dm ? 'text-slate-500 group-hover/item:text-slate-400' : 'text-slate-400 group-hover/item:text-slate-500'} transition-colors`}>
                  {formatMoney(g.amount)}
                </span>
                <span className={`text-[9px] font-black tabular-nums w-5 text-right ${dm ? 'text-slate-300 group-hover/item:text-slate-100' : 'text-slate-600 group-hover/item:text-slate-900'} transition-colors`}>
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
              <div className={`flex items-center justify-between gap-2 py-1 mt-1 border-t border-dotted ${dm ? 'border-slate-700/50' : 'border-slate-300'} group/item`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[9px] shrink-0 opacity-80 group-hover/item:scale-110 transition-transform">🌊</span>
                  <span className={`text-[9px] font-bold truncate ${dm ? 'text-blue-400 group-hover/item:text-blue-300' : 'text-blue-600 group-hover/item:text-blue-700'} transition-colors`}>
                    Net Surplus (เหลือสุทธิ)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[8.5px] font-bold tabular-nums opacity-70 ${dm ? 'text-blue-400 group-hover/item:text-blue-300' : 'text-blue-600 group-hover/item:text-blue-700'} transition-colors`}>
                    {formatMoney(surplus)}
                  </span>
                  <span className={`text-[9px] font-black tabular-nums w-5 text-right ${dm ? 'text-blue-400 group-hover/item:text-blue-300' : 'text-blue-600 group-hover/item:text-blue-700'} transition-colors`}>
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

  const { 
    sortedCats = [], chartTotal = 0,
    sortedGroups = [], totalExpense = 0,
    sortedAllocation = [], totalIncome = 0
  } = analytics;

  // Select data based on mode
  const isGroupMode = displayMode === 'group';
  const isAllocationMode = displayMode === 'allocation';
  
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
        backgroundColor: activeItems.map(i => i.color),
        borderWidth: 2, 
        borderColor: dm ? '#1e293b' : '#ffffff',
      }],
    };
  }, [activeItems, dm]);

  const activeTotal = useMemo(() => {
    if (isGroupMode) return totalExpense;
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
    dm ? 'bg-[#111827] border-slate-700/50' : 'bg-slate-50 border-slate-200'
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
      <div className={`px-3 py-1 border-b flex items-center justify-between ${dm ? 'bg-slate-800/90 border-slate-700/50' : 'bg-slate-50 border-slate-100'}`}>
        <div className="flex items-center gap-1.5">
          <PieChart className={`w-3 h-3 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} />
          <span className={`text-[9px] font-black uppercase tracking-widest ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
            สัดส่วนรายจ่าย (Proportions)
          </span>

          {/* Mode Switcher */}
          <div className={`ml-4 flex items-center gap-[1px] p-[2px] rounded-sm ${dm ? 'bg-slate-900/60' : 'bg-slate-200/50'}`}>
            <button 
              onClick={() => setDisplayMode('category')}
              className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter rounded-sm transition-all ${
                displayMode === 'category' 
                ? (dm ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-blue-700 shadow-sm') 
                : (dm ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
              }`}
            >
              รายหมวด
            </button>
            <button 
              onClick={() => setDisplayMode('group')}
              className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter rounded-sm transition-all ${
                displayMode === 'group' 
                ? (dm ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-blue-700 shadow-sm') 
                : (dm ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
              }`}
            >
              ตามกลุ่ม
            </button>
            <button 
              onClick={() => setDisplayMode('allocation')}
              className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter rounded-sm transition-all ${
                displayMode === 'allocation' 
                ? (dm ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-blue-700 shadow-sm') 
                : (dm ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
              }`}
            >
              สัดส่วน 50/30/20
            </button>
          </div>

          {/* Sort Switcher (Hidden in Allocation mode) */}
          {!isAllocationMode && (
            <div className={`ml-2 flex items-center gap-[1px] p-[2px] rounded-sm ${dm ? 'bg-slate-900/60' : 'bg-slate-200/50'}`}>
              <button 
                onClick={() => setSortMode('amount')}
                title="เรียงตามยอดเงิน (มากไปน้อย)"
                className={`px-1.5 py-0.5 rounded-sm transition-all ${
                  sortMode === 'amount' 
                  ? (dm ? 'bg-amber-500/20 text-amber-400 shadow-sm' : 'bg-white text-amber-600 shadow-sm') 
                  : (dm ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
                }`}
              >
                <ArrowDownWideNarrow className="w-2.5 h-2.5" />
              </button>
              <button 
                onClick={() => setSortMode('order')}
                title="เรียงตามลำดับหมวดหมู่"
                className={`px-1.5 py-0.5 rounded-sm transition-all ${
                  sortMode === 'order' 
                  ? (dm ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm') 
                  : (dm ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
                }`}
              >
                <ListOrdered className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
        <span className={`text-[9px] font-black px-1.5 rounded-full ${dm ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
          {showSkeleton ? '...' : `${itemCount} ${isAllocationMode ? 'ส่วน' : (isGroupMode ? 'กลุ่ม' : 'หมวดหมู่')}`}
        </span>
      </div>

      {/* ─── MONOLITHIC CONTENT ─── */}
      {showSkeleton ? (
        <div className="flex flex-row items-stretch h-32">
          <div className={`shrink-0 w-[133px] flex items-center justify-center border-r border-dashed border-slate-700/40 ${dm ? 'bg-slate-900/30' : 'bg-slate-50/50'}`}>
             <div className={`w-20 h-24 rounded-full animate-pulse ${dm ? 'bg-slate-800' : 'bg-slate-200'}`} />
          </div>
          <div className="flex-1 grid grid-cols-5 gap-[1px] bg-slate-700/20">
             {[...Array(5)].map((_, i) => (
               <div key={i} className={`p-2 animate-pulse ${dm ? 'bg-slate-800/40' : 'bg-slate-50'}`}>
                  <div className={`h-2 w-12 mb-2 rounded-sm ${dm ? 'bg-slate-700' : 'bg-slate-100'}`} />
                  <div className={`h-4 w-16 mb-2 rounded-sm ${dm ? 'bg-slate-700' : 'bg-slate-100'}`} />
                  <div className={`h-1 w-full rounded-sm ${dm ? 'bg-slate-700' : 'bg-slate-100'}`} />
               </div>
             ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-row items-stretch min-h-[140px]">

          {/* LEFT: CHART ANCHOR (No Padding) */}
          <div className={`shrink-0 flex flex-col items-center justify-center p-3 border-r border-dashed border-slate-700/40 ${dm ? 'bg-slate-900/30' : 'bg-slate-50/50'}`}>
            <div className="relative w-[140px] h-[140px]">
              <Doughnut data={activeChartData} options={options} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className={`text-[8px] font-black uppercase tracking-widest opacity-40 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                   {isAllocationMode ? 'Income' : 'Total'}
                 </span>
                 <span className={`text-[12px] font-black tabular-nums ${dm ? 'text-slate-100' : 'text-slate-900'}`}>
                   {formatMoney(activeTotal)}
                 </span>
              </div>
            </div>
          </div>

          {/* RIGHT: TABLE-GRID HUD */}
          <div className={`flex-1 grid ${gridColsClass} gap-[1px] bg-slate-700/20`}>
             {activeItems.map((item, idx) => {
               if (isAllocationMode) return <AllocationItem key={item.id || idx} item={item} dm={dm} />;
               if (isGroupMode) return <GroupItem key={item.id || idx} item={item} dm={dm} isSingleMonthView={analytics.isSingleMonthView} />;
               return <CatItem key={item.id || idx} cat={item} dm={dm} idx={idx} />;
             })}
             {/* Fill empty cells to maintain grid borders if needed */}
             {![isAllocationMode, isGroupMode].some(Boolean) && [...Array((5 - (itemCount % 5)) % 5)].map((_, i) => (
               <div key={`empty-${i}`} className={`${dm ? 'bg-slate-800/20' : 'bg-slate-50/30'}`} />
             ))}
             {(isAllocationMode || isGroupMode) && [...Array((3 - (itemCount % 3)) % 3)].map((_, i) => (
               <div key={`empty-grid3-${i}`} className={`${dm ? 'bg-slate-800/20' : 'bg-slate-50/30'}`} />
             ))}
          </div>

        </div>
      )}
    </div>
  );
}
