// src/views/Dashboard/components/TopTransactions.jsx
import React, { useMemo } from 'react';
import { AlertCircle, Calendar, ChevronDown, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatMoney } from '../../../utils/formatters';
import { isDateInFilter } from '../../../utils/dateHelpers';
import { useDashboardContext } from '../context/DashboardContext';

// --- Sub-components ---

// --- Helpers ---
const getSmartDate = (dateStr) => {
  if (!dateStr) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  
  const diffTime = today - target;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'วันนี้';
  if (diffDays === 1) return 'เมื่อวาน';
  if (diffDays > 1 && diffDays <= 7) return `${diffDays} วันที่แล้ว`;
  
  // Format as DD/MM/YY
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y.slice(2)}`;
};

const TransactionItem = ({ tx, index, catDef, isDarkMode, maxAmount }) => {
  const isTop3 = index < 3;
  const relativeWidth = maxAmount > 0 ? (Math.abs(tx.amount) / maxAmount) * 100 : 0;
  
  const getRankStyle = (rank) => {
    if (rank === 0) return `bg-amber-500/20 text-amber-500 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]`;
    if (rank === 1) return `bg-slate-300/20 text-slate-300 border-slate-300/40 shadow-[0_0_10px_rgba(203,213,225,0.1)]`;
    if (rank === 2) return `bg-orange-700/20 text-orange-400 border-orange-700/40 shadow-[0_0_10px_rgba(194,65,12,0.1)]`;
    return isDarkMode ? `bg-slate-800 text-slate-500 border-slate-700` : `bg-slate-100 text-slate-400 border-slate-200`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.01, x: 4 }}
      className={`relative flex items-start gap-3 p-3 rounded-sm border transition-all overflow-hidden group ${
        isDarkMode 
          ? 'bg-slate-900/40 hover:bg-slate-800/60 border-slate-700/50 hover:border-slate-600' 
          : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Subtle Progress Line at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-200/20 dark:bg-slate-700/30 overflow-hidden pointer-events-none">
        <div 
          className="h-full bg-red-500/10 dark:bg-red-400/20 transition-all duration-1000 ease-out group-hover:bg-red-500/20"
          style={{ width: `${relativeWidth}%` }}
        />
      </div>

      {/* Rank Badge */}
      <div className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-sm text-[11px] font-black border shrink-0 mt-0.5 ${getRankStyle(index)}`}>
        {index + 1}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 min-w-0 flex flex-col gap-1.5">
        <p className={`text-xs font-bold leading-snug line-clamp-2 break-all ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`} title={tx.description}>
          {tx.description}
        </p>
        
        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap overflow-hidden">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-sm text-white bg-opacity-20 border border-opacity-30 truncate" 
                style={{ 
                  color: catDef?.color || '#64748B', 
                  backgroundColor: `${catDef?.color || '#64748B'}33`, 
                  borderColor: `${catDef?.color || '#64748B'}4D` 
                }}
                title={catDef?.name || tx.category}>
            <span className="text-[12px]">{catDef?.icon || '📌'}</span>
            <span className="truncate">{catDef?.name || tx.category}</span>
          </span>
          {tx.date && (
            <span className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-sm border shrink-0 ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
            }`}>
              <Calendar className="w-2.5 h-2.5" /> {getSmartDate(tx.date)}
            </span>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="relative z-10 shrink-0 flex items-start justify-end min-w-[90px] pt-1">
        <span className={`text-sm font-black tabular-nums whitespace-nowrap transition-transform group-hover:scale-110 origin-right ${isTop3 ? 'text-[#D81A21]' : 'opacity-80 text-[#D81A21]'}`}>
          {formatMoney(Math.abs(tx.amount))}
        </span>
      </div>
    </motion.div>
  );
};

// --- Main Component ---

export default function TopTransactions() {
  const { 
    transactions, 
    filterPeriod, 
    dashboardCategory, 
    hideFixedExpenses, 
    categories, 
    topXLimit, 
    setTopXLimit,
    dm 
  } = useDashboardContext();
  
  const cardStyles = `rounded-sm border shadow-sm transition-colors h-full flex flex-col ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;
  const headerStyles = `font-bold text-sm flex items-center gap-2 ${dm ? 'text-slate-200' : 'text-slate-800'}`;
  const dividerStyles = `border-b mb-3 pb-3 ${dm ? 'border-slate-700' : 'border-slate-100'}`;

  const { displayTransactions, maxAmount } = useMemo(() => {
    if (!transactions || transactions.length === 0) return { displayTransactions: [], maxAmount: 0 };

    let filtered = [...transactions];

    // 1. Filter by Period
    if (filterPeriod) {
      filtered = filtered.filter(tx => isDateInFilter(tx.date, filterPeriod));
    }

    // 2. Filter only Expenses
    filtered = filtered.filter(tx => {
      if (tx.group_type) return tx.group_type === 'expense';
      if (tx.type === 'expense') return true;
      if (tx.type === 'income') return false; 
      const catDef = categories.find(c => c.id === tx.category_id || c.name === tx.category);
      return catDef ? catDef.type === 'expense' : (tx.amount < 0);
    });

    // 3. Filter Fixed
    if (hideFixedExpenses) {
      filtered = filtered.filter(tx => {
        const catDef = categories.find(c => c.id === tx.category_id || c.name === tx.category);
        return catDef ? !catDef.isFixed : true;
      });
    }

    // 4. Dashboard Category Filter
    if (dashboardCategory) {
      const activeCats = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];
      if (!activeCats.includes('ALL')) {
        filtered = filtered.filter(tx => activeCats.includes(tx.category_id) || activeCats.includes(tx.category));
      }
    }

    filtered.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    const results = filtered.slice(0, topXLimit || 7);
    const max = results.length > 0 ? Math.abs(results[0].amount) : 0;

    return { displayTransactions: results, maxAmount: max };
  }, [transactions, categories, hideFixedExpenses, dashboardCategory, topXLimit, filterPeriod]);

  return (
    <div className={`${cardStyles} p-4`}>
      <div className={`flex items-center justify-between ${dividerStyles}`}>
        <h3 className={headerStyles}>
          <TrendingDown className="w-4 h-4 text-[#D81A21]" />
          TOP
          <div className="relative group mx-1">
            <select
              value={topXLimit} 
              onChange={(e) => setTopXLimit(Number(e.target.value))}
              className={`pl-2 pr-6 py-0.5 text-xs font-black rounded-sm border outline-none cursor-pointer appearance-none transition-colors ${
                dm 
                  ? 'bg-slate-900 border-slate-700 text-white hover:border-slate-500' 
                  : 'bg-slate-100 border-slate-300 text-[#D81A21] hover:border-[#D81A21]/50'
              }`}
            >
              {[5, 7, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <ChevronDown className={`w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 ${dm ? 'text-white' : 'text-[#D81A21]'}`} />
          </div>
          รายจ่าย
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-[300px]">
        <AnimatePresence mode="popLayout">
          {displayTransactions.length > 0 ? (
            <div className="flex flex-col gap-2">
              {displayTransactions.map((tx, idx) => {
                const catDef = categories.find(c => c.id === tx.category_id || c.name === tx.category);
                return (
                  <TransactionItem 
                    key={tx.id} 
                    tx={tx} 
                    index={idx} 
                    catDef={catDef} 
                    isDarkMode={dm} 
                    maxAmount={maxAmount}
                  />
                );
              })}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-center py-10"
            >
              <div className={`p-4 rounded-full mb-3 ${dm ? 'bg-slate-700/30' : 'bg-slate-100'}`}>
                <AlertCircle className={`w-8 h-8 opacity-20 ${dm ? 'text-slate-400' : 'text-slate-500'}`} />
              </div>
              <p className={`text-sm font-bold opacity-60 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                ไม่มีรายการรายจ่ายที่ตรงตามเงื่อนไข
              </p>
              <p className="text-[10px] mt-1 opacity-40">ลองปรับการตั้งค่า Filter หรือเลือกช่วงเวลาอื่น</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
