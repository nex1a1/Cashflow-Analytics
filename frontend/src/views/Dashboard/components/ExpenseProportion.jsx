// src/views/Dashboard/components/ExpenseProportion.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { Doughnut } from 'react-chartjs-2';
import { PieChart } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';
import { getDoughnutChartOptions } from '../../../utils/chartOptions';
import { useTheme } from '../../../context/ThemeContext';

export default function ExpenseProportion({ analytics, categories }) {
  const { isDarkMode: dm } = useTheme();
  const card = `rounded-sm border shadow-sm transition-colors ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;
  
  const catCount = analytics.sortedCats.length;

  const CatList = ({ cols = 1, data = analytics.sortedCats }) => (
    <div className="grid gap-x-4 gap-y-1.5 w-full" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {data.map((cat, idx) => {
        const catDef = categories.find(c => c.name === cat.name);
        const pColor = catDef?.color || '#D81A21';
        return (
          <div key={idx} className="flex flex-col min-w-0">
            <div className="flex justify-between items-baseline gap-1 mb-0.5">
              <span className={`text-[11px] font-bold truncate flex items-center gap-1 ${dm ? 'text-slate-300' : 'text-slate-700'}`} title={cat.name}>
                <span className="shrink-0">{catDef?.icon}</span>
                <span className="truncate">{cat.name}</span>
              </span>
              <div className="flex items-baseline gap-1 shrink-0">
                <span className="text-[10px] font-bold" style={{ color: pColor }}>{cat.percentage}%</span>
                <span className={`text-[11px] font-black ${dm ? 'text-slate-100' : 'text-slate-900'}`}>{formatMoney(cat.amount)}</span>
              </div>
            </div>
            <div className={`w-full rounded-sm h-[3px] overflow-hidden ${dm ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div className="h-[3px] rounded-sm" style={{ width: `${cat.percentage}%`, backgroundColor: pColor, opacity: Math.max(0.55, 1 - idx * 0.04) }} />
            </div>
          </div>
        );
      })}
    </div>
  );

  if (catCount <= 6) return (
    <div className={`${card} p-4 flex gap-4 items-center min-w-0 h-full`}>
      <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
        <Doughnut data={analytics.catChartData} options={{ ...getDoughnutChartOptions(dm), maintainAspectRatio: false }} />
      </div>
      <div className="flex-1 min-w-0"><CatList cols={1} /></div>
    </div>
  );

  if (catCount >= 7 && catCount <= 12) return (
    <div className={`${card} p-4 flex flex-col gap-3 min-w-0 h-full`}>
      <div className="flex gap-4 items-center">
        <div className="relative shrink-0" style={{ width: 110, height: 110 }}>
          <Doughnut data={analytics.catChartData} options={{ ...getDoughnutChartOptions(dm), maintainAspectRatio: false }} />
        </div>
        <div className="flex-1 min-w-0 grid gap-x-3 gap-y-1.5" style={{ gridTemplateColumns: '1fr' }}>
          <CatList cols={1} data={analytics.sortedCats.slice(0, 4)} />
        </div>
      </div>
      {analytics.sortedCats.length > 4 && (
        <div className={`pt-2 border-t ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
          <CatList cols={2} data={analytics.sortedCats.slice(4)} />
        </div>
      )}
    </div>
  );

  return (
    <div className={`${card} p-4 min-w-0 h-full`}>
      <div className={`flex items-center gap-2 mb-3 pb-2.5 border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
        <PieChart className={`w-3.5 h-3.5 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} />
        <span className={`text-xs font-bold whitespace-nowrap ${dm ? 'text-slate-300' : 'text-slate-600'}`}>สัดส่วนรายจ่าย ({catCount} หมวด)</span>
      </div>
      <CatList cols={2} />
    </div>
  );
}

ExpenseProportion.propTypes = {
  analytics: PropTypes.object.isRequired,
  categories: PropTypes.array.isRequired,
};