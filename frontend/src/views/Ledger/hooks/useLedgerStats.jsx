import React, { useMemo } from 'react';

function resolveGroupPct(isIncome, isSavings, total, sumInc, sumExp) {
  if (isIncome || isSavings) {
    return sumInc > 0 ? ((total / sumInc) * 100).toFixed(1) : '0.0';
  }
  return sumExp > 0 ? ((total / sumExp) * 100).toFixed(1) : '0.0';
}

function resolveCardTheme(g, isIncome, isSavings) {
  if (isIncome) {
    return {
      activeBorderColor: 'border-[#10b981]',
      activeBgColor: 'bg-[#121c12]/95',
      activeGlowColor: 'rgba(16,185,129,0.15)',
      defaultColor: '#10b981',
      amtColor: 'text-emerald-400',
      amtSign: '+',
      badgeText: 'IN',
      pulseColor: '[#10b981]',
      borderColorActive: '#10b981/40',
      iconFallback: '💰'
    };
  }
  if (isSavings) {
    return {
      activeBorderColor: 'border-[#f59e0b]',
      activeBgColor: 'bg-[#1c1912]/95',
      activeGlowColor: 'rgba(245,158,11,0.15)',
      defaultColor: '#f59e0b',
      amtColor: 'text-amber-400',
      amtSign: '±',
      badgeText: 'SAVE',
      pulseColor: '[#f59e0b]',
      borderColorActive: '#f59e0b/40',
      iconFallback: '💼'
    };
  }
  return {
    activeBorderColor: 'border-[#da291c]',
    activeBgColor: 'bg-[#1c1212]/95',
    activeGlowColor: 'rgba(218,41,28,0.15)',
    defaultColor: g.color || '#64748b',
    amtColor: 'text-red-400',
    amtSign: '-',
    badgeText: 'OUT',
    pulseColor: '[#da291c]',
    borderColorActive: '#da291c/40',
    iconFallback: '📉'
  };
}

const LedgerStatCategoryRow = ({ cat, total, defaultColor, formatMoney }) => {
  const relativePct = total > 0 ? Math.round((cat.amount / total) * 100) : 0;
  const catColor = cat.color || defaultColor;

  return (
    <div className="flex items-center justify-between gap-2 w-full font-bold transition-all duration-75">
      <span className="truncate flex items-center gap-2 min-w-0">
        <span 
          className="w-[21px] h-[21px] flex items-center justify-center shrink-0 text-[11px] rounded-none border"
          style={{ 
            backgroundColor: `${catColor}15`, 
            borderColor: `${catColor}30` 
          }}
        >
          {cat.icon || '✨'}
        </span>
        <span 
          className="truncate uppercase tracking-tight text-[11px] font-black"
          style={{ color: catColor }}
        >
          {cat.name}
        </span>
      </span>
      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10.5px]">
        <span 
          className="font-bold opacity-80 text-[10px]"
          style={{ color: catColor }}
        >
          {relativePct}%
        </span>
        <span className="font-extrabold" style={{ color: catColor }}>฿{formatMoney(cat.amount)}</span>
      </div>
    </div>
  );
};

const LedgerStatCard = ({
  g,
  breakdown,
  sumInc,
  sumExp,
  uniqueMonths,
  formatMoney,
  isActive,
  onCardClick
}) => {
  const total = breakdown?.total || 0;
  const txCount = breakdown?.txCount || 0;
  const isIncome = g.type === 'income';
  const isSavings = g.type === 'savings' || g.name.includes('ลงทุน') || g.name.includes('ออม');

  const pctOfTotal = resolveGroupPct(isIncome, isSavings, total, sumInc, sumExp);
  const theme = resolveCardTheme(g, isIncome, isSavings);

  const sortedCats = Object.values(breakdown?.categories || {})
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="w-[235px] shrink-0 flex flex-col">
      <button 
        type="button"
        onClick={onCardClick}
        className={`text-left group flex flex-col flex-1 gap-2.5 p-3.5 border-2 rounded-none relative overflow-hidden shadow-sm cursor-pointer select-none transition-all duration-150 ${
          isActive 
            ? `${theme.activeBgColor} ${theme.activeBorderColor} shadow-[0_0_12px_${theme.activeGlowColor}] z-10` 
            : 'bg-[#121212] hover:bg-[#1a1a1a] border-[#303030] hover:border-[#444444]'
        }`}
        style={{ borderLeftColor: isActive ? undefined : theme.defaultColor }}
      >
        <div 
          className="absolute inset-0 opacity-[0.015] group-hover:opacity-[0.04]"
          style={{ backgroundColor: g.color || theme.defaultColor }}
        />
        
        {/* Row 1: Icon + Name (left) & Badge (right) */}
        <div className="flex items-center justify-between gap-2 w-full min-w-0 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <div 
              className="w-[26px] h-[26px] flex items-center justify-center text-[14px] rounded-none border shrink-0"
              style={{ 
                backgroundColor: `${g.color || theme.defaultColor}20`, 
                color: g.color || theme.defaultColor,
                borderColor: isActive ? theme.borderColorActive : `${g.color || theme.defaultColor}30`
              }}
            >
              {g.icon || theme.iconFallback}
            </div>
            <span 
              className={`text-[12.5px] font-black uppercase tracking-wider truncate leading-none ${
                isActive ? 'text-white' : 'text-[#cbd5e1]'
              }`}
              title={g.name}
            >
              {g.name}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {isActive && (
              <span className={`w-1.5 h-1.5 rounded-none bg-${theme.pulseColor} animate-pulse shrink-0`} />
            )}
            <span 
              className="text-[9.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-none border shrink-0 leading-none"
              style={{ 
                backgroundColor: `${g.color || theme.defaultColor}15`, 
                color: g.color || theme.defaultColor, 
                borderColor: `${g.color || theme.defaultColor}30` 
              }}
            >
              {theme.badgeText}
            </span>
          </div>
        </div>
        
        {/* Row 2: Amounts */}
        <div className="flex flex-col min-w-0 font-mono z-10">
          <div className="flex items-baseline justify-between gap-1">
            <span 
              className={`text-[17px] font-black tabular-nums tracking-tight truncate ${theme.amtColor}`}
              title={`${theme.amtSign}฿${formatMoney(total)}`}
            >
              {theme.amtSign}฿{formatMoney(total)}
            </span>
            <span className="text-[11.5px] font-black text-neutral-400 tabular-nums">
              {pctOfTotal}%
            </span>
          </div>
          <div className="flex justify-between items-center text-[10.5px] text-[#888888] mt-0.5 font-bold">
            <span>{txCount} รายการ</span>
            {uniqueMonths > 1 && (
              <span 
                className="truncate ml-1"
                title={`฿${formatMoney(total / uniqueMonths)}/เดือน`}
              >
                ฿{formatMoney(total / uniqueMonths)}/ด.
              </span>
            )}
          </div>
        </div>

        {/* Row 3: Inline Category List (Always Visible) */}
        {sortedCats.length > 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-dashed border-[#2d2d2d] flex flex-col gap-2 z-10">
            {sortedCats.map(cat => (
              <LedgerStatCategoryRow
                key={cat.id}
                cat={cat}
                total={total}
                defaultColor={theme.defaultColor}
                formatMoney={formatMoney}
              />
            ))}
          </div>
        )}
      </button>
    </div>
  );
};

export function useLedgerStats({
  displayTransactions = [],
  categories = [],
  cashflowGroups = [],
  formatMoney,
  advancedFilterGroup,
  setAdvancedFilterGroup,
  allDatesInPeriod = []
} = {}) {
  const catTypeMap = useMemo(() => {
    const map = {};
    categories.forEach(c => {
      map[c.id] = c.type;
      map[c.name] = c.type;
    });
    return map;
  }, [categories]);

  const { sumInc, sumExp } = useMemo(() => {
    let inc = 0, exp = 0;
    displayTransactions.forEach(t => {
      const type = catTypeMap[t.category_id] || catTypeMap[t.category];
      const amt = Number.parseFloat(t.amount) || 0;
      if (type === 'income') inc += amt;
      else exp += amt;
    });
    return { sumInc: inc, sumExp: exp };
  }, [displayTransactions, catTypeMap]);

  const net = sumInc - sumExp;
  const savingsRate = useMemo(() => {
    return sumInc > 0 ? Math.round((net / sumInc) * 100) : 0;
  }, [sumInc, net]);

  // ─── Logic: Aggregate Data by Cashflow Groups & Categories ───
  const groupBreakdowns = useMemo(() => {
    const breakdowns = {};
    
    // Pre-initialize breakdowns for all cashflowGroups
    cashflowGroups.forEach(g => {
      breakdowns[g.id] = {
        total: 0,
        txCount: 0,
        categories: {}
      };
    });

    displayTransactions.forEach(t => {
      const cat = categories.find(c => c.id === t.category_id) || categories.find(c => c.name === t.category);
      if (cat) {
        const groupId = cat.cashflow_group_id || cat.cashflowGroup;
        if (groupId && breakdowns[groupId]) {
          const amt = Number.parseFloat(t.amount) || 0;
          breakdowns[groupId].total += amt;
          breakdowns[groupId].txCount += 1;
          
          if (!breakdowns[groupId].categories[cat.id]) {
            breakdowns[groupId].categories[cat.id] = {
              id: cat.id,
              name: cat.name,
              icon: cat.icon,
              color: cat.color,
              amount: 0
            };
          }
          breakdowns[groupId].categories[cat.id].amount += amt;
        }
      }
    });

    return breakdowns;
  }, [displayTransactions, categories, cashflowGroups]);

  // Calculate Monthly Average if period is long
  const uniqueMonths = useMemo(() => {
    const months = new Set();
    displayTransactions.forEach(t => {
      const parts = t.date.split('/');
      if (parts.length === 3) months.add(`${parts[2]}-${parts[1]}`);
    });
    return months.size;
  }, [displayTransactions]);

  const periodDays = Math.max(1, allDatesInPeriod?.length || 1);

  const getSubValue = (total, isGroup = false, groupType = 'expense') => {
    if (uniqueMonths > 1) {
      return `เฉลี่ย ฿${formatMoney(total / uniqueMonths)} / เดือน`;
    }
    return `เฉลี่ย ฿${formatMoney(total / periodDays)} / วัน`;
  };

  const renderCard = (g) => (
    <LedgerStatCard
      key={g.id}
      g={g}
      breakdown={groupBreakdowns[g.id]}
      sumInc={sumInc}
      sumExp={sumExp}
      uniqueMonths={uniqueMonths}
      formatMoney={formatMoney}
      isActive={advancedFilterGroup === g.id}
      onCardClick={() => {
        if (setAdvancedFilterGroup) {
          setAdvancedFilterGroup(advancedFilterGroup === g.id ? 'ALL' : g.id);
        }
      }}
    />
  );

  const isSavingsGroup = (g) => g.type === 'savings' || g.name.includes('ลงทุน') || g.name.includes('ออม');
  const isIncomeGroup = (g) => g.type === 'income';
  const isExpenseGroup = (g) => !isIncomeGroup(g) && !isSavingsGroup(g);

  const activeIncomeCards = useMemo(() => {
    return cashflowGroups
      .filter(g => isIncomeGroup(g) && (groupBreakdowns[g.id]?.total || 0) > 0)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map(g => renderCard(g));
  }, [cashflowGroups, groupBreakdowns, uniqueMonths, formatMoney, sumInc, sumExp, advancedFilterGroup, setAdvancedFilterGroup]);

  const activeSavingsCards = useMemo(() => {
    return cashflowGroups
      .filter(g => isSavingsGroup(g) && (groupBreakdowns[g.id]?.total || 0) > 0)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map(g => renderCard(g));
  }, [cashflowGroups, groupBreakdowns, uniqueMonths, formatMoney, sumInc, sumExp, advancedFilterGroup, setAdvancedFilterGroup]);

  const activeExpenseCards = useMemo(() => {
    return cashflowGroups
      .filter(g => isExpenseGroup(g) && (groupBreakdowns[g.id]?.total || 0) > 0)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map(g => renderCard(g));
  }, [cashflowGroups, groupBreakdowns, uniqueMonths, formatMoney, sumInc, sumExp, advancedFilterGroup, setAdvancedFilterGroup]);

  return {
    sumInc,
    sumExp,
    net,
    savingsRate,
    activeIncomeCards,
    activeSavingsCards,
    activeExpenseCards,
    getSubValue,
    catTypeMap
  };
}
