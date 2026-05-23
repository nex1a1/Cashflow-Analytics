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
          <div key={g.id} className="min-w-[210px] flex-1">
            <div 
              className="group flex items-center gap-3 px-3 py-2 border-2 transition-all duration-300 bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700 rounded-none relative overflow-hidden shadow-sm"
              style={{ borderLeftColor: g.color || '#64748b' }}
            >
              {/* Subtle background glow of group color */}
              <div 
                className="absolute inset-0 opacity-[0.015] transition-opacity duration-300 group-hover:opacity-[0.04]"
                style={{ backgroundColor: g.color }}
              />
              
              {/* Group icon with subtle background */}
              <div 
                className="w-7 h-7 flex items-center justify-center text-sm rounded-none border border-slate-805 shrink-0 transition-transform group-hover:scale-105"
                style={{ 
                  backgroundColor: `${g.color || '#64748b'}20`, 
                  color: g.color || '#94a3b8',
                  borderColor: `${g.color || '#64748b'}30`
                }}
              >
                {g.icon || (g.type === 'income' ? '💰' : '📉')}
              </div>
              
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider truncate text-slate-400">
                    {g.name}
                  </span>
                  <span 
                    className="text-[8px] font-black uppercase tracking-widest px-1 py-0.2 rounded-none border"
                    style={{ 
                      backgroundColor: `${g.color || '#64748b'}15`, 
                      color: g.color || '#94a3b8', 
                      borderColor: `${g.color || '#64748b'}30` 
                    }}
                  >
                    {g.type === 'income' ? 'IN' : 'OUT'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-0.5 min-w-0 font-mono">
                  <span className="text-xs font-black tabular-nums tracking-tight text-slate-100">
                    ฿{formatMoney(total)}
                  </span>
                  {uniqueMonths > 1 && (
                    <span className="text-[8.5px] font-bold text-slate-500 truncate ml-1">
                      ฿{formatMoney(total / uniqueMonths)}/ด.
                    </span>
                  )}
                </div>
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