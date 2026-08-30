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
      return `bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border-amber-300 shadow-sm`;
    }
    if (rank === 1) {
      return `bg-slate-200 text-slate-950 border-slate-300 shadow-sm`;
    }
    if (rank === 2) {
      return `bg-orange-700/80 text-orange-100 border-orange-500/50 shadow-sm`;
    }
    return `bg-slate-800/80 text-slate-400 border-slate-700`;
  };

  const getCardBorderClass = () => {
    if (!isDarkMode) {
      if (index === 0) return 'border-amber-400/60 hover:border-amber-400 bg-amber-50/30 hover:bg-amber-50/50 shadow-sm';
      if (index === 1) return 'border-slate-200 hover:border-slate-300 bg-slate-50/30 hover:bg-slate-50/50 shadow-sm';
      if (index === 2) return 'border-orange-400/60 hover:border-orange-400 bg-orange-50/30 hover:bg-orange-50/50 shadow-sm';
      return 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 shadow-sm';
    }
    // Dark Mode card styles: more subtle backgrounds to prevent visual distraction
    if (index === 0) return 'border-amber-500/20 hover:border-amber-500/40 bg-amber-950/10 hover:bg-amber-950/20';
    if (index === 1) return 'border-[#303030] hover:border-[#da291c]/40 bg-[#303030]/40 hover:bg-[#303030]/60';
    if (index === 2) return 'border-orange-500/25 hover:border-orange-500/45 bg-orange-950/10 hover:bg-orange-950/20';
    return 'border-[#303030]/50 hover:border-[#303030] bg-[#181818]/30 hover:bg-[#181818]/70';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      className={`relative flex items-start gap-3.5 p-3.5 rounded-none border transition-all overflow-hidden group shadow-sm ${getCardBorderClass()}`}
    >
      {/* Premium Visual Progress Bar Backdrop (toned down opacity in Dark Mode for perfect subtlety) */}
      <div className="absolute inset-y-0 left-0 right-0 overflow-hidden pointer-events-none z-0">
        <div 
          className="h-full bg-gradient-to-r from-red-500/5 to-red-500/10 dark:from-red-500/[0.015] dark:to-red-500/[0.05] transition-all duration-1000 ease-out group-hover:from-red-500/8 group-hover:to-red-500/15 group-hover:dark:from-red-500/[0.03] group-hover:dark:to-red-500/[0.08]"
          style={{ width: `${relativeWidth}%` }}
        />
        {/* Flat solid tip for the progress bar */}
        <div 
          className="absolute top-0 bottom-0 w-[1.5px] bg-red-500/30 dark:bg-red-500/20 transition-all duration-1000"
          style={{ left: `${relativeWidth}%` }}
        />
      </div>

      {/* Rank Badge */}
      <div className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-none text-[11px] font-black border shrink-0 mt-0.5 ${getRankStyle(index)}`}>
        {index + 1}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 min-w-0 flex flex-col gap-2">
        <p className={`text-xs font-bold leading-snug line-clamp-2 break-all ${'text-slate-200'}`} title={tx.description}>
          {tx.description}
        </p>
        
        {/* Tags Row */}
        <div className="flex items-center gap-2 flex-wrap overflow-hidden">
          {/* Category Tag */}
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-none text-white bg-opacity-20 border border-opacity-30 truncate" 
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
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-none border shrink-0 ${
              'bg-[#181818] border-[#303030] text-slate-400 group-hover:border-[#303030]'
            }`}>
              <Calendar className="w-2.5 h-2.5" /> {getSmartDate(tx.date)}
            </span>
          )}
        </div>
      </div>

      {/* Price Block */}
      <div className="relative z-10 shrink-0 flex flex-col items-end justify-start min-w-[95px] pt-0.5">
        <span className={`text-sm font-black tabular-nums whitespace-nowrap text-[#da291c]`}>
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
    hideWantExpenses,
    categories, 
    topXLimit, 
    setTopXLimit,
    dm,
    showSkeleton
  } = useDashboardContext();
  
  const cardStyles = `rounded-none border shadow-sm transition-colors h-full flex flex-col ${'bg-[#181818] border-[#303030]'}`;
  const headerStyles = `font-bold text-sm flex items-center gap-2 ${'text-slate-200'}`;
  const dividerStyles = `border-b mb-3 pb-3 ${'border-[#303030]/60'}`;

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
        const aType = tx.allocation_type || (catDef ? catDef.allocation_type : null) || 'want';
        return aType !== 'need';
      });
    }

    // Want/Lifestyle Expenses Filter
    if (hideWantExpenses) {
      filtered = filtered.filter(tx => {
        const catDef = getCat(tx);
        const aType = tx.allocation_type || (catDef ? catDef.allocation_type : null) || 'want';
        return aType !== 'want';
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
  }, [transactions, categories, hideFixedExpenses, hideWantExpenses, dashboardCategory, topXLimit, filterPeriod]);

  return (
    <div className={cardStyles}>
      {/* ─── HEADER (Editorial Style) ─── */}
      <div className="px-4 py-2 border-b flex items-center justify-between bg-[#121212]/80 border-[#2d2d2d] w-full gap-2">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-3 bg-[#da291c] shrink-0" /> {/* Rosso Corsa racing line brand accent */}
          <TrendingDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-200">
            TOP
          </span>
          <div className="relative group shrink-0">
            <select
              value={topXLimit} 
              onChange={(e) => setTopXLimit(Number(e.target.value))}
              disabled={showSkeleton}
              className={`pl-2 pr-6 py-0.5 text-xs font-black rounded-none border outline-none cursor-pointer appearance-none transition-colors ${
                'bg-[#181818] border-[#303030] text-white hover:border-[#da291c] focus:border-[#da291c]'
              }`}
            >
              {[5, 7, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <ChevronDown className={`w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 ${'text-white'}`} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-200">รายจ่าย</span>
        </div>

        {/* Real-time sum indicator pill (Border is now rounded-none) */}
        {!showSkeleton && displayTransactions.length > 0 && (
          <div className={`px-2 py-0.5 rounded-none border text-[9px] font-black tracking-wider flex items-center gap-1 shrink-0 ${
            'bg-[#303030]/50 border-[#303030]/80 text-slate-400'
          }`}>
            <span className="opacity-60">ยอดรวมกลุ่มนี้:</span>
            <span className="text-[#da291c]">{formatMoney(topSum)}</span>
          </div>
        )}
      </div>
      
      <div className="p-4 flex-1 flex flex-col min-h-0">
        
        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-[300px]">
          {showSkeleton ? (
            <div className="flex flex-col gap-2">
              {[...Array(topXLimit || 7)].map((_, i) => (
                <div key={i} className={`h-16 w-full rounded-none border animate-pulse ${'bg-[#303030]/40 border-[#303030]/50'}`} />
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
                  <div className={`p-4 rounded-full mb-3 ${'bg-[#303030]/30'}`}>
                    <AlertCircle className={`w-8 h-8 opacity-20 ${'text-slate-400'}`} />
                  </div>
                  <p className={`text-sm font-bold opacity-60 ${'text-slate-400'}`}>
                    ไม่มีรายการรายจ่ายที่ตรงตามเงื่อนไข
                  </p>
                  <p className="text-[10px] mt-1 opacity-40">ลองปรับการตั้งค่า Filter หรือเลือกช่วงเวลาอื่น</p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
