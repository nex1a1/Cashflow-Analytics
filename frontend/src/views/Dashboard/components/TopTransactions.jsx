// src/views/Dashboard/components/TopTransactions.jsx
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { AlertCircle, Calendar } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';
import { isDateInFilter } from '../../../utils/dateHelpers';
import { useTheme } from '../../../context/ThemeContext';

export default function TopTransactions({
  transactions,
  filterPeriod,
  dashboardCategory,
  hideFixedExpenses,
  analytics, 
  categories, 
  topXLimit, 
  setTopXLimit
}) {
  const { isDarkMode: dm } = useTheme();
  
  const card = `rounded-sm border shadow-sm transition-colors h-full ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;
  const cardHd = `font-bold text-sm flex items-center gap-2 ${dm ? 'text-slate-200' : 'text-slate-800'}`;
  const divider = `border-b mb-3 pb-3 ${dm ? 'border-slate-700' : 'border-slate-100'}`;

  // Helper สำหรับทำสีอันดับ 1, 2, 3
  const getRankBadge = (rank) => {
    if (rank === 1) return `bg-amber-500/20 text-amber-500 border-amber-500/30`;
    if (rank === 2) return `bg-slate-300/20 text-slate-300 border-slate-300/30`;
    if (rank === 3) return `bg-orange-700/20 text-orange-400 border-orange-700/30`;
    return dm ? `bg-slate-800 text-slate-500 border-slate-700` : `bg-slate-100 text-slate-400 border-slate-200`;
  };

  const displayTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    let filtered = [...transactions];

    if (filterPeriod) {
      filtered = filtered.filter(tx => isDateInFilter(tx.date, filterPeriod));
    }

    filtered = filtered.filter(tx => {
      if (tx.type === 'expense') return true;
      if (tx.type === 'income') return false; 
      const catDef = categories?.find(c => c.name === tx.category);
      return catDef ? catDef.type === 'expense' : (tx.amount < 0);
    });

    if (hideFixedExpenses) {
      filtered = filtered.filter(tx => {
        const catDef = categories?.find(c => c.name === tx.category);
        return catDef ? !catDef.isFixed : true;
      });
    }

    if (dashboardCategory) {
      const activeCats = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];
      if (!activeCats.includes('ALL')) {
        filtered = filtered.filter(tx => activeCats.includes(tx.category));
      }
    }

    filtered.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    return filtered.slice(0, topXLimit || 7);
  }, [transactions, categories, hideFixedExpenses, dashboardCategory, topXLimit, filterPeriod]);

  if (!displayTransactions || displayTransactions.length === 0) {
    return (
      <div className={`${card} p-4 flex flex-col items-center justify-center text-center min-h-[150px]`}>
        <p className={`text-sm font-bold opacity-60 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
          ไม่มีรายการที่ตรงกับเงื่อนไขในเดือนนี้
        </p>
      </div>
    );
  }

  return (
    <div className={`${card} p-4 flex flex-col`}>
      <div className={`flex items-center justify-between ${divider}`}>
        <h3 className={cardHd}>
          <AlertCircle className="w-4 h-4 text-[#D81A21]" />
          TOP&nbsp;
          <select
            value={topXLimit} 
            onChange={(e) => setTopXLimit(Number(e.target.value))}
            className={`px-1 py-0.5 text-sm font-black rounded-sm border outline-none cursor-pointer appearance-none ${dm ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-100 border-slate-300 text-[#D81A21]'}`}
          >
            {[5, 7, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          &nbsp;รายจ่าย
        </h3>
      </div>
      
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {displayTransactions.map((tx, idx) => {
          const catDef = categories.find(c => c.name === tx.category);
          return (
            <div key={tx.id} className={`flex items-start gap-2 p-3 rounded-sm border transition-all hover:shadow-md ${dm ? 'bg-slate-900/40 hover:bg-slate-800 border-slate-700/50' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'}`}>
              
              {/* Rank Badge */}
              <div className={`flex items-center justify-center w-5 h-5 rounded-sm text-[10.5px] font-black border shrink-0 mt-0.5 ${getRankBadge(idx + 1)}`}>
                {idx + 1}
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <p className={`text-xs font-bold leading-relaxed line-clamp-2 break-all ${dm ? 'text-slate-200' : 'text-slate-900'}`} title={tx.description}>
                  {tx.description}
                </p>
                
                {/* Tags (หมวดหมู่ และ วันที่) */}
                <div className="flex items-center gap-1.5 flex-wrap overflow-hidden">
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-sm text-white bg-opacity-20 border border-opacity-30 truncate max-w-full" 
                        style={{ color: catDef?.color || '#64748B', backgroundColor: `${catDef?.color || '#64748B'}33`, borderColor: `${catDef?.color || '#64748B'}4D` }}
                        title={tx.category}>
                    {catDef?.icon} <span className="truncate">{tx.category}</span>
                  </span>
                  {tx.date && (
                    <span className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-sm border shrink-0 ${dm ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
                      <Calendar className="w-2.5 h-2.5" /> {tx.date}
                    </span>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="shrink-0 flex items-start justify-end min-w-[80px] pt-0.5">
                <span className="text-sm font-black text-[#D81A21] tabular-nums whitespace-nowrap">
                  {formatMoney(Math.abs(tx.amount))}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

TopTransactions.propTypes = {
  transactions: PropTypes.array,
  filterPeriod: PropTypes.string,
  dashboardCategory: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  hideFixedExpenses: PropTypes.bool,
  analytics: PropTypes.object,
  categories: PropTypes.array.isRequired,
  topXLimit: PropTypes.number.isRequired,
  setTopXLimit: PropTypes.func.isRequired,
};