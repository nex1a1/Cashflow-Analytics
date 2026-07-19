import React, { useMemo } from 'react';

export function useLedgerStats(displayTransactions, categories, cashflowGroups, formatMoney, dm, advancedFilterGroup, setAdvancedFilterGroup) {
  const catTypeMap = useMemo(() => {
    const map = {};
    categories.forEach(c => map[c.name] = c.type);
    return map;
  }, [categories]);

  const { sumInc, sumExp } = useMemo(() => {
    let inc = 0, exp = 0;
    displayTransactions.forEach(t => {
      const type = catTypeMap[t.category];
      const amt = parseFloat(t.amount) || 0;
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
      const cat = categories.find(c => c.name === t.category);
      if (cat) {
        const groupId = cat.cashflow_group_id || cat.cashflowGroup;
        if (groupId && breakdowns[groupId]) {
          const amt = parseFloat(t.amount) || 0;
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

  const getSubValue = (total, isGroup = false, groupType = 'expense') => {
    if (uniqueMonths > 1) {
      return `เฉลี่ย ${formatMoney(total / uniqueMonths)} / เดือน`;
    }
    if (isGroup) {
      return groupType === 'income' ? 'รายรับ (Income)' : 'รายจ่าย (Expense)';
    }
    return null;
  };

  const renderCard = (g) => {
    const breakdown = groupBreakdowns[g.id];
    const total = breakdown?.total || 0;
    const txCount = breakdown?.txCount || 0;

    const isIncome = g.type === 'income';
    const isSavings = g.type === 'savings' || g.name.includes('ลงทุน') || g.name.includes('ออม');

    let pctOfTotal = 0;
    if (isIncome) {
      pctOfTotal = sumInc > 0 ? ((total / sumInc) * 100).toFixed(1) : '0.0';
    } else if (isSavings) {
      pctOfTotal = sumInc > 0 ? ((total / sumInc) * 100).toFixed(1) : '0.0';
    } else {
      pctOfTotal = sumExp > 0 ? ((total / sumExp) * 100).toFixed(1) : '0.0';
    }

    const sortedCats = Object.values(breakdown?.categories || {})
      .filter(c => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const isActive = advancedFilterGroup === g.id;

    const handleCardClick = () => {
      if (setAdvancedFilterGroup) {
        setAdvancedFilterGroup(isActive ? 'ALL' : g.id);
      }
    };
    
    let activeBorderColor = 'border-[#da291c]';
    let activeBgColor = 'bg-[#1c1212]/95';
    let activeGlowColor = 'rgba(218,41,28,0.15)';
    
    if (isIncome) {
      activeBorderColor = 'border-[#10b981]';
      activeBgColor = 'bg-[#121c12]/95';
      activeGlowColor = 'rgba(16,185,129,0.15)';
    } else if (isSavings) {
      activeBorderColor = 'border-[#f59e0b]';
      activeBgColor = 'bg-[#1c1912]/95';
      activeGlowColor = 'rgba(245,158,11,0.15)';
    }

    const defaultColor = isIncome ? '#10b981' : (isSavings ? '#f59e0b' : (g.color || '#64748b'));

    return (
      <div key={g.id} className="w-[235px] shrink-0 flex flex-col">
        <div 
          onClick={handleCardClick}
          className={`group flex flex-col flex-1 gap-2.5 p-3.5 border-2 rounded-none relative overflow-hidden shadow-sm cursor-pointer select-none transition-all duration-150 ${
            isActive 
              ? `${activeBgColor} ${activeBorderColor} shadow-[0_0_12px_${activeGlowColor}] z-10` 
              : 'bg-[#121212] hover:bg-[#1a1a1a] border-[#303030] hover:border-[#444444]'
          }`}
          style={{ borderLeftColor: isActive ? undefined : defaultColor }}
        >
          {/* Subtle background glow of group color */}
          <div 
            className="absolute inset-0 opacity-[0.015] group-hover:opacity-[0.04]"
            style={{ backgroundColor: g.color || defaultColor }}
          />
          
          {/* Row 1: Icon + Name (left) & Badge (right) */}
          <div className="flex items-center justify-between gap-2 w-full min-w-0 z-10">
            <div className="flex items-center gap-2 min-w-0">
              <div 
                className="w-[26px] h-[26px] flex items-center justify-center text-[14px] rounded-none border shrink-0"
                style={{ 
                  backgroundColor: `${g.color || defaultColor}20`, 
                  color: g.color || defaultColor,
                  borderColor: isActive ? (isIncome ? '#10b981/40' : (isSavings ? '#f59e0b/40' : '#da291c/40')) : `${g.color || defaultColor}30`
                }}
              >
                {g.icon || (isIncome ? '💰' : (isSavings ? '💼' : '📉'))}
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
                <span className={`w-1.5 h-1.5 rounded-none bg-${isIncome ? '[#10b981]' : (isSavings ? '[#f59e0b]' : '[#da291c]')} animate-pulse shrink-0`} />
              )}
              <span 
                className="text-[9.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-none border shrink-0 leading-none"
                style={{ 
                  backgroundColor: `${g.color || defaultColor}15`, 
                  color: g.color || defaultColor, 
                  borderColor: `${g.color || defaultColor}30` 
                }}
              >
                {isIncome ? 'IN' : (isSavings ? 'SAVE' : 'OUT')}
              </span>
            </div>
          </div>
          
          {/* Row 2: Amounts */}
          <div className="flex flex-col min-w-0 font-mono z-10">
            <div className="flex items-baseline justify-between gap-1">
              <span 
                className={`text-[17px] font-black tabular-nums tracking-tight truncate ${
                  isActive ? 'text-white' : 'text-slate-100'
                }`}
                title={`฿${formatMoney(total)}`}
              >
                ฿{formatMoney(total)}
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
              {sortedCats.map(cat => {
                const relativePct = total > 0 ? Math.round((cat.amount / total) * 100) : 0;
                const catColor = cat.color || defaultColor;
                return (
                  <div key={cat.id} className="flex items-center justify-between gap-2 w-full font-bold transition-all duration-75">
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
                      <span className="text-white font-extrabold">฿{formatMoney(cat.amount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const isSavingsGroup = (g) => g.type === 'savings' || g.name.includes('ลงทุน') || g.name.includes('ออม');
  const isIncomeGroup = (g) => g.type === 'income';
  const isExpenseGroup = (g) => !isIncomeGroup(g) && !isSavingsGroup(g);

  const activeIncomeCards = useMemo(() => {
    return cashflowGroups
      .filter(g => isIncomeGroup(g) && (groupBreakdowns[g.id]?.total || 0) > 0)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map(g => renderCard(g));
  }, [cashflowGroups, groupBreakdowns, uniqueMonths, formatMoney, dm, sumInc, sumExp, advancedFilterGroup, setAdvancedFilterGroup]);

  const activeSavingsCards = useMemo(() => {
    return cashflowGroups
      .filter(g => isSavingsGroup(g) && (groupBreakdowns[g.id]?.total || 0) > 0)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map(g => renderCard(g));
  }, [cashflowGroups, groupBreakdowns, uniqueMonths, formatMoney, dm, sumInc, sumExp, advancedFilterGroup, setAdvancedFilterGroup]);

  const activeExpenseCards = useMemo(() => {
    return cashflowGroups
      .filter(g => isExpenseGroup(g) && (groupBreakdowns[g.id]?.total || 0) > 0)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map(g => renderCard(g));
  }, [cashflowGroups, groupBreakdowns, uniqueMonths, formatMoney, dm, sumInc, sumExp, advancedFilterGroup, setAdvancedFilterGroup]);

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
