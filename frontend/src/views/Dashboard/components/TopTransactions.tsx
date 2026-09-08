// src/views/Dashboard/components/TopTransactions.tsx
import React, { useMemo, memo } from 'react';
import { AlertCircle, Calendar, ChevronDown, TrendingDown } from 'lucide-react';
import { formatMoney } from '@/utils/formatters';
import { isDateInFilter, parseDateStrToObj } from '@/utils/dateHelpers';
import { useDashboardContext } from '../context/DashboardContext';
import { TransactionDisplay, Category } from '@/types';

// --- Helpers ---
const getSmartDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = parseDateStrToObj(dateStr);
  target.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - target.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'วันนี้';
  if (diffDays === 1) return 'เมื่อวาน';
  if (diffDays === -1) return 'พรุ่งนี้';
  if (diffDays > 1 && diffDays <= 7) return `${diffDays} วันที่แล้ว`;

  // Format as DD/MM/YY
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y ? y.slice(2) : ''}`;
};

interface TransactionItemProps {
  tx: TransactionDisplay;
  index: number;
  catDef?: Category;
  maxAmount: number;
}

const getRankStyle = (rank: number) => {
  if (rank === 0) {
    return 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border-amber-300 shadow-sm';
  }
  if (rank === 1) {
    return 'bg-slate-200 text-slate-950 border-slate-300 shadow-sm';
  }
  if (rank === 2) {
    return 'bg-orange-700/80 text-orange-100 border-orange-500/50 shadow-sm';
  }
  return 'bg-slate-800/80 text-slate-400 border-slate-700';
};

const getCardBorderClass = (rank: number) => {
  if (rank === 0) return 'border-amber-500/25 hover:border-amber-500/50 bg-amber-950/15 hover:bg-amber-950/25';
  if (rank === 1) return 'border-slate-400/25 hover:border-slate-400/50 bg-slate-500/[0.05] hover:bg-slate-500/[0.12]';
  if (rank === 2) return 'border-orange-500/25 hover:border-orange-500/50 bg-orange-950/15 hover:bg-orange-950/25';
  return 'border-[#303030]/60 hover:border-[#404040] bg-[#181818]/40 hover:bg-[#181818]/80';
};

const TransactionItem = memo(({ tx, index, catDef, maxAmount }: TransactionItemProps) => {
  // Use scale-adjusted ratio with a minimum baseline width of 4% for visual balance
  const amountNum = typeof tx.amount === 'string' ? Number.parseFloat(tx.amount) : tx.amount;
  const rawRatio = maxAmount > 0 ? Math.abs(amountNum) / maxAmount : 0;
  const relativeWidth = rawRatio > 0 ? 4 + rawRatio * 96 : 0;

  return (
    <div
      className={`relative flex items-start gap-3.5 p-3.5 rounded-none border overflow-hidden group shadow-sm ${getCardBorderClass(index)}`}
    >
      {/* Visual Progress Bar Backdrop (High-contrast Rosso Corsa with sharp tip) */}
      <div className="absolute inset-y-0 left-0 right-0 overflow-hidden pointer-events-none z-0">
        <div 
          className="h-full bg-gradient-to-r from-[#da291c]/[0.06] to-[#da291c]/[0.14] group-hover:from-[#da291c]/[0.10] group-hover:to-[#da291c]/[0.20]"
          style={{ width: `${relativeWidth}%` }}
        />
        {/* Flat solid tip for the progress bar */}
        <div 
          className="absolute top-0 bottom-0 w-[2px] bg-[#da291c]/40 group-hover:bg-[#da291c]/60"
          style={{ left: `${relativeWidth}%` }}
        />
      </div>

      {/* Rank Badge */}
      <div className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-none text-[11px] font-black border shrink-0 mt-0.5 ${getRankStyle(index)}`}>
        {index + 1}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 min-w-0 flex flex-col gap-2">
        <p className="text-xs font-bold leading-snug line-clamp-2 break-all text-slate-200" title={tx.description}>
          {tx.description}
        </p>
        
        {/* Tags Row */}
        <div className="flex items-center gap-2 flex-wrap overflow-hidden">
          {/* Category Tag */}
          <span 
            className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-none truncate" 
            style={{ 
              color: catDef?.color || '#64748B', 
              backgroundColor: `${catDef?.color || '#64748B'}28`, 
              borderColor: `${catDef?.color || '#64748B'}40`,
              borderWidth: '1px'
            }}
            title={catDef?.name || tx.category}
          >
            <span className="text-[12px] shrink-0">{catDef?.icon || '📌'}</span>
            <span className="truncate">{catDef?.name || tx.category}</span>
          </span>
          
          {/* Date Tag */}
          {tx.date && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-none border shrink-0 bg-[#181818] border-[#303030] text-slate-400 group-hover:border-[#404040]">
              <Calendar className="w-2.5 h-2.5" /> {getSmartDate(tx.date)}
            </span>
          )}
        </div>
      </div>

      {/* Price Block */}
      <div className="relative z-10 shrink-0 flex flex-col items-end justify-start min-w-[95px] pt-0.5">
        <span className="text-sm font-black tabular-nums whitespace-nowrap text-[#da291c]">
          {formatMoney(Math.abs(amountNum))}
        </span>
      </div>
    </div>
  );
});

TransactionItem.displayName = 'TransactionItem';

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
    showSkeleton
  } = useDashboardContext();
  
  const cardStyles = 'rounded-none border shadow-sm h-full flex flex-col bg-[#181818] border-[#303030]';

  // Optimized useMemo with O(1) Map Lookups for Categories to maintain high performance
  const { displayTransactions, maxAmount, topSum, allFilteredExpenseSum, topPctOfTotal } = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { 
        displayTransactions: [], 
        maxAmount: 0, 
        topSum: 0, 
        allFilteredExpenseSum: 0, 
        topPctOfTotal: 0 
      };
    }

    // Pre-build O(1) lookup map for maximum efficiency
    const catMapById = new Map<string, Category>();
    const catMapByName = new Map<string, Category>();
    for (const c of categories) {
      catMapById.set(c.id, c);
      catMapByName.set(c.name, c);
    }

    const getCat = (tx: TransactionDisplay) => 
      (tx.category_id ? catMapById.get(tx.category_id) : undefined) || 
      (tx.category ? catMapByName.get(tx.category) : undefined);

    let filtered = [...transactions];
    
    // Date filter
    if (filterPeriod) {
      filtered = filtered.filter(tx => isDateInFilter(tx.date, filterPeriod));
    }
    
    // Type Filter: Only show Expenses
    filtered = filtered.filter(tx => {
      if (tx.group_type) return tx.group_type === 'expense';
      const catDef = getCat(tx);
      return catDef?.type === 'expense' || Number(tx.amount) < 0;
    });

    // Need/Fixed Expenses Filter
    if (hideFixedExpenses) {
      filtered = filtered.filter(tx => {
        const catDef = getCat(tx);
        const aType = tx.allocation_type || catDef?.allocation_type || 'want';
        return aType !== 'need';
      });
    }

    // Want/Lifestyle Expenses Filter
    if (hideWantExpenses) {
      filtered = filtered.filter(tx => {
        const catDef = getCat(tx);
        const aType = tx.allocation_type || catDef?.allocation_type || 'want';
        return aType !== 'want';
      });
    }

    // Category Filter
    if (dashboardCategory) {
      const activeCats = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];
      if (!activeCats.includes('ALL')) {
        filtered = filtered.filter(tx => {
          const catDef = getCat(tx);
          return (Boolean(tx.category_id) && activeCats.includes(tx.category_id!)) || 
                 activeCats.includes(tx.category) || 
                 Boolean(catDef && (activeCats.includes(catDef.id) || activeCats.includes(catDef.name)));
        });
      }
    }

    // Calculate total expenses for current filtered set (Financial Intelligence / Pareto)
    const allFilteredExpenseSum = filtered.reduce((acc, tx) => acc + Math.abs(Number(tx.amount)), 0);

    // Sort by descending absolute amount
    filtered.sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)));
    
    // Slice according to selected limit and attach pre-computed catDef
    const sliced = filtered.slice(0, topXLimit || 7);
    const results = sliced.map(tx => ({
      tx,
      catDef: getCat(tx)
    }));

    const max = results.length > 0 ? Math.abs(Number(results[0].tx.amount)) : 0;
    const sum = results.reduce((acc, item) => acc + Math.abs(Number(item.tx.amount)), 0);
    const topPct = allFilteredExpenseSum > 0 ? Math.round((sum / allFilteredExpenseSum) * 100) : 0;

    return { 
      displayTransactions: results, 
      maxAmount: max, 
      topSum: sum,
      allFilteredExpenseSum,
      topPctOfTotal: topPct
    };
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
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTopXLimit(Number(e.target.value))}
              disabled={showSkeleton}
              className="pl-2 pr-6 py-0.5 text-xs font-black rounded-none border outline-none cursor-pointer appearance-none transition-colors bg-[#181818] border-[#303030] text-white hover:border-[#da291c] focus:border-[#da291c]"
            >
              {[5, 7, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 text-white" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-200">รายจ่าย</span>
        </div>

        {/* Real-time sum & Pareto indicator pill */}
        {!showSkeleton && displayTransactions.length > 0 && (
          <div 
            className="px-2 py-0.5 rounded-none border text-[9px] font-black tracking-wider flex items-center gap-1.5 shrink-0 bg-[#242424] border-[#303030] text-neutral-300"
            title={`คิดเป็น ${topPctOfTotal}% ของรายจ่ายทั้งหมดตามเงื่อนไข (฿${formatMoney(allFilteredExpenseSum)})`}
          >
            <span className="text-neutral-400">ยอดรวม:</span>
            <span className="text-[#da291c] font-bold tabular-nums">{formatMoney(topSum)}</span>
            {allFilteredExpenseSum > 0 && (
              <span className="text-[8px] font-bold text-neutral-400 border-l border-neutral-700 pl-1.5 tabular-nums">
                {topPctOfTotal}%
              </span>
            )}
          </div>
        )}
      </div>
      
      <div className="p-4 flex-1 flex flex-col min-h-0">
        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-[300px]">
          {showSkeleton ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: topXLimit || 7 }).map((_, idx) => (
                <div key={`top-skel-${idx}`} className="h-16 w-full rounded-none border animate-pulse bg-[#303030]/40 border-[#303030]/50" />
              ))}
            </div>
          ) : (
            displayTransactions.length > 0 ? (
              <div className="flex flex-col gap-2">
                {displayTransactions.map(({ tx, catDef }, idx) => (
                  <TransactionItem 
                    key={tx.id} 
                    tx={tx} 
                    index={idx} 
                    catDef={catDef} 
                    maxAmount={maxAmount}
                  />
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-10">
                <div className="p-4 rounded-none border border-[#303030]/60 mb-3 bg-[#181818]/60">
                  <AlertCircle className="w-8 h-8 opacity-25 text-neutral-400" />
                </div>
                <p className="text-sm font-bold text-neutral-400">
                  ไม่มีรายการรายจ่ายที่ตรงตามเงื่อนไข
                </p>
                <p className="text-[10px] mt-1 text-neutral-500">ลองปรับการตั้งค่า Filter หรือเลือกช่วงเวลาอื่น</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
