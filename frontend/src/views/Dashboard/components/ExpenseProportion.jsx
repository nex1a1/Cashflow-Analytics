// src/views/Dashboard/components/ExpenseProportion.jsx
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Doughnut } from 'react-chartjs-2';
import { PieChart, Inbox } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';
import { getDoughnutChartOptions } from '../../../utils/chartOptions';
import { useTheme } from '../../../context/ThemeContext';

/**
 * Sub-component for individual category row
 */
const CatItem = ({ cat, dm, idx }) => (
  <div className="flex flex-col min-w-0 group cursor-default">
    <div className="flex justify-between items-baseline gap-1 mb-0.5">
      <span 
        className={`text-[10px] font-bold truncate flex items-center gap-1.5 ${dm ? 'text-slate-300' : 'text-slate-600'}`} 
        title={cat.name}
      >
        <span className="shrink-0 opacity-80 leading-none text-[10px] group-hover:scale-110 transition-transform">{cat.icon}</span>
        <span className="truncate group-hover:text-blue-500 transition-colors">{cat.name}</span>
      </span>
      <div className="flex items-baseline gap-1 shrink-0">
        <span className="text-[9px] font-bold" style={{ color: cat.color }}>{cat.percentage}%</span>
        <span className={`text-[10px] font-black ${dm ? 'text-slate-100' : 'text-slate-900'}`}>
          {formatMoney(cat.amount)}
        </span>
      </div>
    </div>
    <div className={`w-full rounded-full h-[3px] overflow-hidden ${dm ? 'bg-slate-700/40' : 'bg-slate-100'}`}>
      <div 
        className="h-full rounded-full transition-all duration-1000" 
        style={{ 
          width: `${cat.percentage}%`, 
          backgroundColor: cat.color, 
          opacity: Math.max(0.45, 1 - idx * 0.05) 
        }} 
      />
    </div>
  </div>
);

export default function ExpenseProportion({ analytics }) {
  const { isDarkMode: dm } = useTheme();
  const { sortedCats = [], catChartData = { labels: [], datasets: [] }, totalExpense = 0 } = analytics;
  const catCount = sortedCats.length;

  // Memoize chart options
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
  
  const cardClass = `rounded-sm border shadow-sm transition-all duration-300 flex flex-col h-full overflow-hidden ${
    dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  }`;

  if (catCount === 0) {
    return (
      <div className={`${cardClass} p-6 items-center justify-center text-center opacity-60`}>
        <Inbox className="w-8 h-8 mb-2 opacity-20" />
        <p className="text-sm font-medium">ไม่มีข้อมูลค่าใช้จ่าย</p>
      </div>
    );
  }

  // Split categories: Top 3 and the Rest
  const topCats = sortedCats.slice(0, 3);
  const remainingCats = sortedCats.slice(3);

  return (
    <div className={cardClass}>
      {/* ─── HEADER ─── */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${dm ? 'border-slate-700 bg-slate-800/80' : 'border-slate-100 bg-slate-50/50'}`}>
        <div className="flex items-center gap-2">
          <PieChart className={`w-3.5 h-3.5 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} />
          <span className={`text-[11px] font-black uppercase tracking-widest ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
            สัดส่วนรายจ่าย
          </span>
        </div>
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${dm ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
          {catCount} หมวด
        </span>
      </div>

      {/* ─── SCROLLABLE CONTENT AREA ─── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-5">
        
        {/* TOP SECTION: CHART | TOP 3 CATS */}
        <div className="flex gap-4 items-center shrink-0">
          <div className="relative w-[110px] h-[110px] shrink-0">
            <Doughnut data={catChartData} options={options} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className={`text-[7px] font-bold uppercase tracking-tighter opacity-40 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Total</span>
              <span className={`text-xs font-black ${dm ? 'text-slate-100' : 'text-slate-900'}`}>{formatMoney(totalExpense)}</span>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            {topCats.map((cat, idx) => (
              <CatItem key={cat.id || idx} cat={cat} dm={dm} idx={idx} />
            ))}
          </div>
        </div>

        {/* BOTTOM SECTION: GRID FOR REMAINING CATS */}
        {remainingCats.length > 0 && (
          <div className={`pt-4 border-t ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="grid grid-cols-2 gap-x-5 gap-y-3">
              {remainingCats.map((cat, idx) => (
                <CatItem key={cat.id || idx} cat={cat} dm={dm} idx={idx + 3} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

ExpenseProportion.propTypes = {
  analytics: PropTypes.shape({
    sortedCats: PropTypes.array.isRequired,
    catChartData: PropTypes.object.isRequired,
    totalExpense: PropTypes.number,
  }).isRequired,
};
