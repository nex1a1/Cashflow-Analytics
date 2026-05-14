// src/views/Dashboard/components/ExpenseProportion.jsx
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Doughnut } from 'react-chartjs-2';
import { PieChart, Inbox } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';
import { getDoughnutChartOptions } from '../../../utils/chartOptions';
import { useDashboardContext } from '../context/DashboardContext';

/**
 * Sub-component for individual category cell (Table-like HUD)
 */
const CatItem = ({ cat, dm, idx }) => (
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
      <span className="text-sm font-black tabular-nums shrink-0 leading-none" style={{ color: cat.color }}>{cat.percentage}%</span>
    </div>
    
    <div className="mt-auto flex flex-col gap-1">
      <div className="flex justify-between items-baseline">
        <p className={`text-[11px] font-bold tabular-nums ${dm ? 'text-slate-200' : 'text-slate-900'}`}>
          {formatMoney(cat.amount).split('.')[0]}
        </p>
      </div>
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
);

export default function ExpenseProportion() {
  const { analytics, dm, showSkeleton } = useDashboardContext();
  const { sortedCats = [], catChartData = { labels: [], datasets: [] }, totalExpense = 0 } = analytics;
  const catCount = sortedCats.length;

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

  if (catCount === 0 && !showSkeleton) {
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
        </div>
        <span className={`text-[9px] font-black px-1.5 rounded-full ${dm ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
          {showSkeleton ? '...' : `${catCount} หมวดหมู่`}
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
        <div className="flex flex-row items-stretch">
          
          {/* LEFT: CHART ANCHOR (No Padding) */}
          <div className={`shrink-0 flex flex-col items-center justify-center p-3 border-r border-dashed border-slate-700/40 ${dm ? 'bg-slate-900/30' : 'bg-slate-50/50'}`}>
            <div className="relative w-[140px] h-[140px]">
              <Doughnut data={catChartData} options={options} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className={`text-[8px] font-black uppercase tracking-widest opacity-40 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Total</span>
                 <span className={`text-[12px] font-black tabular-nums ${dm ? 'text-slate-100' : 'text-slate-900'}`}>
                   {formatMoney(totalExpense).split('.')[0]}
                 </span>
              </div>
            </div>
          </div>

          {/* RIGHT: TABLE-GRID HUD */}
          <div className="flex-1 grid grid-cols-5 gap-[1px] bg-slate-700/20">
             {sortedCats.map((cat, idx) => (
               <CatItem key={cat.id || idx} cat={cat} dm={dm} idx={idx} />
             ))}
             {/* Fill empty cells to maintain grid borders if needed */}
             {[...Array((5 - (catCount % 5)) % 5)].map((_, i) => (
               <div key={`empty-${i}`} className={`${dm ? 'bg-slate-800/20' : 'bg-slate-50/30'}`} />
             ))}
          </div>

        </div>
      )}
    </div>
  );
}