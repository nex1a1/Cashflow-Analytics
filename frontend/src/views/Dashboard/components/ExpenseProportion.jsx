// src/views/Dashboard/components/ExpenseProportion.jsx
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Doughnut } from 'react-chartjs-2';
import { PieChart, Inbox } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';
import { getDoughnutChartOptions } from '../../../utils/chartOptions';
import { useTheme } from '../../../context/ThemeContext';

/**
 * Sub-component for individual category row (Tight & High-Density)
 */
const CatItem = ({ cat, dm, idx, isCompact = false }) => (
  <div className="flex flex-col min-w-0 group cursor-default">
    {/* บรรทัดบน: ไอคอนและชื่อหมวดหมู่ */}
    <div className="flex justify-between items-baseline gap-2 mb-0.5">
      <span 
        className={`${isCompact ? 'text-[10px]' : 'text-xs'} font-bold flex items-center gap-1.5 ${dm ? 'text-slate-300' : 'text-slate-600'} min-w-0`} 
        title={cat.name}
      >
        <span className="shrink-0 opacity-80 leading-none group-hover:scale-110 transition-transform">{cat.icon}</span>
        <span className="truncate group-hover:text-blue-500 transition-colors">{cat.name}</span>
      </span>
      {/* ถ้าไม่ใช่ Compact (คือ Top 4) ให้โชว์ตัวเลขข้างบน */}
      {!isCompact && (
        <div className="flex items-baseline justify-end gap-3 shrink-0">
          <span className="text-[10px] font-bold tabular-nums" style={{ color: cat.color }}>{cat.percentage}%</span>
          <span className={`text-[11px] font-black tabular-nums text-right w-[65px] ${dm ? 'text-slate-100' : 'text-slate-900'}`}>
            {formatMoney(cat.amount)}
          </span>
        </div>
      )}
    </div>
    
    {/* บรรทัดล่าง: เส้น Progress Bar และ ตัวเลข (ถ้าเป็นโหมด Compact) */}
    <div className="flex items-center gap-2">
      <div className={`flex-1 rounded-full h-[3px] overflow-hidden ${dm ? 'bg-slate-700/40' : 'bg-slate-100'}`}>
        <div 
          className="h-full rounded-full transition-all duration-1000" 
          style={{ 
            width: `${cat.percentage}%`, 
            backgroundColor: cat.color, 
            opacity: Math.max(0.45, 1 - idx * 0.05) 
          }} 
        />
      </div>
      {/* ถ้าเป็น Compact ให้โชว์ตัวเลข % และ ยอดเงิน ข้างๆ เส้น Bar แทนเพื่อประหยัดที่ */}
      {isCompact && (
        <div className="flex items-baseline gap-1.5 shrink-0">
          <span className="text-[9px] font-bold tabular-nums" style={{ color: cat.color }}>{cat.percentage}%</span>
          <span className={`text-[9px] font-black tabular-nums ${dm ? 'text-slate-300' : 'text-slate-700'}`}>
            {formatMoney(cat.amount)}
          </span>
        </div>
      )}
    </div>
  </div>
);

export default function ExpenseProportion({ analytics }) {
  const { isDarkMode: dm } = useTheme();
  const { sortedCats = [], catChartData = { labels: [], datasets: [] }, totalExpense = 0 } = analytics;
  const catCount = sortedCats.length;

  const options = useMemo(() => {
    const baseOptions = getDoughnutChartOptions(dm);
    return {
      ...baseOptions,
      cutout: '80%', 
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

  const topCats = sortedCats.slice(0, 4);
  const remainingCats = sortedCats.slice(4);

  return (
    <div className={cardClass}>
      <div className={`px-3 py-2 border-b flex items-center justify-between ${dm ? 'border-slate-700 bg-slate-800/80' : 'border-slate-100 bg-slate-50/50'}`}>
        <div className="flex items-center gap-2">
          <PieChart className={`w-3.5 h-3.5 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} />
          <span className={`text-[10px] font-black uppercase tracking-widest ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
            สัดส่วนรายจ่าย (Proportions)
          </span>
        </div>
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${dm ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
          {catCount} หมวด
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-3">
        
        <div className="flex gap-5 items-center shrink-0">
          <div className="relative w-[90px] h-[90px] shrink-0">
            <Doughnut data={catChartData} options={options} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className={`text-xs font-black tabular-nums ${dm ? 'text-slate-100' : 'text-slate-900'}`}>{formatMoney(totalExpense).split('.')[0]}</span>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0 py-0.5">
            {topCats.map((cat, idx) => (
              <CatItem key={cat.id || idx} cat={cat} dm={dm} idx={idx} />
            ))}
          </div>
        </div>

        {remainingCats.length > 0 && (
          <div className={`pt-2 border-t border-dashed ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2">
              {remainingCats.map((cat, idx) => (
                <CatItem key={cat.id || idx} cat={cat} dm={dm} idx={idx + 4} isCompact={true} />
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