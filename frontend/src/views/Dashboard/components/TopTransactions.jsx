// src/views/Dashboard/components/TopTransactions.jsx
import React, { useMemo } from 'react';
import { AlertCircle, Calendar, ChevronDown, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatMoney } from '../../../utils/formatters';
import { isDateInFilter } from '../../../utils/dateHelpers';
import { useDashboardContext } from '../context/DashboardContext';

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
  // Use scale-adjusted ratio with a minimum baseline width of 4% for visual balance
  const rawRatio = maxAmount > 0 ? Math.abs(tx.amount) / maxAmount : 0;
  const relativeWidth = rawRatio > 0 ? 4 + rawRatio * 96 : 0;
  
  const getRankStyle = (rank) => {
    if (rank === 0) {
      return isDarkMode
        ? `bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]`
        : `bg-gradient-to-r from-amber-500 to-yellow-650 text-white border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]`;
    }
    if (rank === 1) {
      return isDarkMode
        ? `bg-slate-200 text-slate-950 border-slate-300 shadow-[0_0_12px_rgba(203,213,225,0.3)]`
        : `bg-gradient-to-r from-slate-300 to-slate-400 text-white border-slate-300 shadow-[0_0_10px_rgba(148,163,184,0.15)]`;
    }
    if (rank === 2) {
      return isDarkMode
        ? `bg-orange-700/80 text-orange-100 border-orange-500/50 shadow-[0_0_12px_rgba(234,88,12,0.3)]`
        : `bg-gradient-to-r from-amber-800 to-orange-600 text-white border-orange-500 shadow-[0_0_10px_rgba(194,65,12,0.15)]`;
    }
    return isDarkMode 
      ? `bg-slate-800/80 text-slate-400 border-slate-700` 
      : `bg-slate-100 text-slate-500 border-slate-200`;
  };

  const getCardBorderClass = () => {
    if (!isDarkMode) {
      if (index === 0) return 'border-amber-200/80 hover:border-amber-400 bg-amber-50/15';
      if (index === 1) return 'border-slate-200 hover:border-slate-400 bg-slate-50/15';
      if (index === 2) return 'border-orange-200 hover:border-orange-400 bg-orange-50/15';
      return 'border-slate-200 hover:border-slate-300 bg-white';
    }
    // Dark Mode card styles: more subtle backgrounds to prevent visual distraction
    if (index === 0) return 'border-amber-500/10 hover:border-amber-500/30 bg-amber-500/[0.02]';
    if (index === 1) return 'border-slate-700 hover:border-slate-600 bg-slate-400/[0.02]';
    if (index === 2) return 'border-orange-500/10 hover:border-orange-500/30 bg-orange-500/[0.02]';
    return 'border-slate-800/85 hover:border-slate-700 bg-slate-900/15';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ scale: 1.015, x: 5 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      className={`relative flex items-start gap-3.5 p-3.5 rounded-sm border transition-all overflow-hidden group shadow-sm ${getCardBorderClass()}`}
    >
      {/* Premium Visual Progress Bar Backdrop (toned down opacity in Dark Mode for perfect subtlety) */}
      <div className="absolute inset-y-0 left-0 right-0 overflow-hidden pointer-events-none z-0">
        <div 
          className="h-full bg-gradient-to-r from-red-500/5 to-red-500/10 dark:from-red-500/[0.015] dark:to-red-500/[0.05] transition-all duration-1000 ease-out group-hover:from-red-500/8 group-hover:to-red-500/15 group-hover:dark:from-red-500/[0.03] group-hover:dark:to-red-500/[0.08]"
          style={{ width: `${relativeWidth}%` }}
        />
        {/* Subtle glowing tip for the progress bar (subtle and organic) */}
        <div 
          className="absolute top-0 bottom-0 w-[2px] bg-red-500/25 dark:bg-red-500/15 blur-[0.5px] transition-all duration-1000"
          style={{ left: `${relativeWidth}%` }}
        />
      </div>

      {/* Rank Badge */}
      <div className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-sm text-[11px] font-black border shrink-0 mt-0.5 ${getRankStyle(index)}`}>
        {index + 1}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 min-w-0 flex flex-col gap-2">
        <p className={`text-xs font-bold leading-snug line-clamp-2 break-all ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`} title={tx.description}>
          {tx.description}
        </p>
        
        {/* Tags Row */}
        <div className="flex items-center gap-2 flex-wrap overflow-hidden">
          {/* Category Tag */}
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-sm text-white bg-opacity-20 border border-opacity-30 truncate" 
                style={{ 
                  color: catDef?.color || '#64748B', 
                  backgroundColor: `${catDef?.color || '#64748B'}28`, 
                  borderColor: `${catDef?.color || '#64748B'}40` 
                }}
                title={catDef?.name || tx.category}>
            <span className="text-[12px] shrink-0">{catDef?.icon || '📌'}</span>
            <span className="truncate">{catDef?.name || tx.category}</span>
          </span>
          
          {/* Date Tag */}
          {tx.date && (
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-sm border shrink-0 ${
              isDarkMode 
                ? 'bg-slate-900/60 border-slate-800 text-slate-400 group-hover:border-slate-700' 
                : 'bg-slate-50 border-slate-200 text-slate-500 group-hover:border-slate-300'
            }`}>
              <Calendar className="w-2.5 h-2.5" /> {getSmartDate(tx.date)}
            </span>
          )}
        </div>
      </div>

      {/* Price Block */}
      <div className="relative z-10 shrink-0 flex flex-col items-end justify-start min-w-[95px] pt-0.5">
        <span className={`text-sm font-black tabular-nums whitespace-nowrap transition-transform group-hover:scale-105 origin-right text-[#D81A21]`}>
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
    dm,
    showSkeleton
  } = useDashboardContext();
  
  const cardStyles = `rounded-sm border shadow-sm transition-colors h-full flex flex-col ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`;
  const headerStyles = `font-bold text-sm flex items-center gap-2 ${dm ? 'text-slate-200' : 'text-slate-800'}`;
  const dividerStyles = `border-b mb-3 pb-3 ${dm ? 'border-slate-700' : 'border-slate-100'}`;

  // Optimized useMemo with O(1) Map Lookups for Categories to maintain high performance
  const { displayTransactions, maxAmount, topSum } = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { displayTransactions: [], maxAmount: 0, topSum: 0 };
    }

    // Pre-build O(1) lookup map for maximum efficiency
    const catMap = {
      byId: new Map(),
      byName: new Map()
    };
    categories.forEach(c => {
      catMap.byId.set(c.id, c);
      catMap.byName.set(c.name, c);
    });

    const getCat = (tx) => catMap.byId.get(tx.category_id) || catMap.byName.get(tx.category);

    let filtered = [...transactions];
    
    // Date filter
    if (filterPeriod) {
      filtered = filtered.filter(tx => isDateInFilter(tx.date, filterPeriod));
    }
    
    // Type Filter: Only show Expenses
    filtered = filtered.filter(tx => {
      if (tx.group_type) return tx.group_type === 'expense';
      if (tx.type === 'expense') return true;
      if (tx.type === 'income') return false; 
      const catDef = getCat(tx);
      return catDef ? catDef.type === 'expense' : (tx.amount < 0);
    });

    // Need/Fixed Expenses Filter
    if (hideFixedExpenses) {
      filtered = filtered.filter(tx => {
        const catDef = getCat(tx);
        return catDef ? !catDef.isFixed : true;
      });
    }

    // Category Filter
    if (dashboardCategory) {
      const activeCats = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];
      if (!activeCats.includes('ALL')) {
        filtered = filtered.filter(tx => {
          const catDef = getCat(tx);
          return activeCats.includes(tx.category_id) || 
                 activeCats.includes(tx.category) || 
                 (catDef && (activeCats.includes(catDef.id) || activeCats.includes(catDef.name)));
        });
      }
    }

    // Sort by descending absolute amount
    filtered.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    
    // Slice according to selected limit
    const results = filtered.slice(0, topXLimit || 7);
    const max = results.length > 0 ? Math.abs(results[0].amount) : 0;
    const sum = results.reduce((acc, tx) => acc + Math.abs(tx.amount), 0);

    return { displayTransactions: results, maxAmount: max, topSum: sum };
  }, [transactions, categories, hideFixedExpenses, dashboardCategory, topXLimit, filterPeriod]);

  return (
    <div className={`${cardStyles} p-4`}>
      {/* Premium Header HUD */}
      <div className={`flex items-center justify-between gap-2 ${dividerStyles} flex-wrap`}>
        <h3 className={headerStyles}>
          <TrendingDown className="w-4 h-4 text-[#D81A21] shrink-0" />
          <span>TOP</span>
          <div className="relative group shrink-0">
            <select
              value={topXLimit} 
              onChange={(e) => setTopXLimit(Number(e.target.value))}
              disabled={showSkeleton}
              className={`pl-2 pr-6 py-0.5 text-xs font-black rounded-sm border outline-none cursor-pointer appearance-none transition-colors ${
                dm 
                  ? 'bg-slate-900 border-slate-700 text-white hover:border-slate-500 focus:border-red-500/50' 
                  : 'bg-slate-100 border-slate-300 text-[#D81A21] hover:border-[#D81A21]/50 focus:border-[#D81A21]'
              }`}
            >
              {[5, 7, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <ChevronDown className={`w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 ${dm ? 'text-white' : 'text-[#D81A21]'}`} />
          </div>
          <span>รายจ่าย</span>
        </h3>

        {/* Real-time sum indicator pill (Border is now rounded-sm for consistency) */}
        {!showSkeleton && displayTransactions.length > 0 && (
          <div className={`px-2 py-0.5 rounded-sm border text-[9px] font-black tracking-wider flex items-center gap-1 shrink-0 ${
            dm 
              ? 'bg-slate-900/50 border-slate-700/80 text-slate-400' 
              : 'bg-slate-100 border-slate-200 text-slate-650'
          }`}>
            <span className="opacity-60">ยอดรวมกลุ่มนี้:</span>
            <span className="text-[#D81A21]">{formatMoney(topSum)}</span>
          </div>
        )}
      </div>
      
      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-[300px]">
        {showSkeleton ? (
          <div className="flex flex-col gap-2">
            {[...Array(topXLimit || 7)].map((_, i) => (
              <div key={i} className={`h-16 w-full rounded-sm border animate-pulse ${dm ? 'bg-slate-900/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`} />
            ))}
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
