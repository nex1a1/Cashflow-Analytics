import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import StatCard from '../../../components/shared/StatCard';

export function useLedgerStats(displayTransactions, categories, cashflowGroups, formatMoney, dm) {
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

  // ─── Logic: Aggregate Data by Cashflow Groups ───
  const groupSums = useMemo(() => {
    const sums = {};
    displayTransactions.forEach(t => {
      const cat = categories.find(c => c.name === t.category);
      if (cat) {
        const groupId = cat.cashflow_group_id || cat.cashflowGroup;
        if (groupId) {
          sums[groupId] = (sums[groupId] || 0) + (parseFloat(t.amount) || 0);
        }
      }
    });
    return sums;
  }, [displayTransactions, categories]);

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

  const activeGroupCards = useMemo(() => {
    return cashflowGroups
      .filter(g => groupSums[g.id] > 0)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'income' ? -1 : 1;
        return (a.order_index || 0) - (b.order_index || 0);
      })
      .map(g => {
        const total = groupSums[g.id];
        return (
          <div key={g.id} className="w-[145px] shrink-0">
            <div 
              className="group flex flex-col gap-1.5 p-2 border-2 bg-[#121212] hover:bg-[#1c1c1c] border-[#303030] hover:border-[#3e3e3e] rounded-none relative overflow-hidden shadow-sm"
              style={{ borderLeftColor: g.color || '#64748b' }}
            >
              {/* Subtle background glow of group color */}
              <div 
                className="absolute inset-0 opacity-[0.015] group-hover:opacity-[0.04]"
                style={{ backgroundColor: g.color }}
              />
              
              {/* Row 1: Icon + Name (left) & Badge (right) */}
              <div className="flex items-center justify-between gap-1 w-full min-w-0 z-10">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div 
                    className="w-[21px] h-[21px] flex items-center justify-center text-xs rounded-none border border-[#303030] shrink-0"
                    style={{ 
                      backgroundColor: `${g.color || '#64748b'}20`, 
                      color: g.color || '#94a3b8',
                      borderColor: `${g.color || '#64748b'}30`
                    }}
                  >
                    {g.icon || (g.type === 'income' ? '💰' : '📉')}
                  </div>
                  <span 
                    className="text-[9.5px] font-black uppercase tracking-wider truncate text-[#cbd5e1] leading-none"
                    title={g.name}
                  >
                    {g.name}
                  </span>
                </div>
                <span 
                  className="text-[7.5px] font-black uppercase tracking-widest px-1 py-0.2 rounded-none border shrink-0 leading-none"
                  style={{ 
                    backgroundColor: `${g.color || '#64748b'}15`, 
                    color: g.color || '#94a3b8', 
                    borderColor: `${g.color || '#64748b'}30` 
                  }}
                >
                  {g.type === 'income' ? 'IN' : 'OUT'}
                </span>
              </div>
              
              {/* Row 2 & 3: Amounts */}
              <div className="flex flex-col min-w-0 font-mono z-10">
                <span 
                  className="text-xs font-black tabular-nums tracking-tight text-white truncate"
                  title={`฿${formatMoney(total)}`}
                >
                  ฿{formatMoney(total)}
                </span>
                {uniqueMonths > 1 && (
                  <span 
                    className="text-[8.5px] font-bold text-[#888888] truncate mt-0.5"
                    title={`฿${formatMoney(total / uniqueMonths)}/เดือน`}
                  >
                    ฿{formatMoney(total / uniqueMonths)}/ด.
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      });
  }, [cashflowGroups, groupSums, uniqueMonths, formatMoney, dm]);

  return {
    sumInc,
    sumExp,
    net,
    savingsRate,
    activeGroupCards,
    getSubValue,
    catTypeMap
  };
}