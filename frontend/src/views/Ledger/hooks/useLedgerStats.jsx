import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import StatCard from '../components/Shared/StatCard';

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
          <div key={g.id} className="min-w-[240px] flex-1">
            <StatCard 
              variant="compact"
              icon={g.icon || (g.type === 'income' ? '💰' : '📉')} 
              label={g.name}
              value={formatMoney(total)}
              subValue={getSubValue(total, true, g.type)}
              color={{ 
                bg: dm ? `${g.color || '#64748b'}40` : `${g.color || '#64748b'}20`, 
                text: dm ? (g.color || '#94a3b8') : (g.color || '#334155'),
                border: dm ? `${g.color || '#64748b'}60` : `${g.color || '#64748b'}40`
              }}
            />
          </div>
        );
      });
  }, [cashflowGroups, groupSums, uniqueMonths, formatMoney, dm]);

  return {
    sumInc,
    sumExp,
    net,
    activeGroupCards,
    getSubValue,
    catTypeMap
  };
}