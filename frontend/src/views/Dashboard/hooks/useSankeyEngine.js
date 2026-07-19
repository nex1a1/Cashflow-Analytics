import { useMemo } from 'react';
import { formatMoney, hexToRgb } from '../../../utils/formatters';
import { useDashboardContext } from '../context/DashboardContext';
import { toISODate, isDateInFilter } from '../../../utils/dateHelpers';

export function useSankeyEngine({ chartViewType, sankeySortMode }) {
  const { transactions, analytics, categories, cashflowGroups, filterPeriod, dm } = useDashboardContext();

  return useMemo(() => {
    if (chartViewType !== 'sankey' || !analytics || !transactions) return null;
    const flows = [];

    // Calculate category totals directly from transactions to include income, expenses, and savings correctly
    const categoryTotals = {};
    categories.forEach(cat => {
      categoryTotals[cat.id] = 0;
    });

    transactions.forEach(t => {
      if (t.is_deleted) return;
      const isoDate = toISODate(t.date);
      if (isDateInFilter(isoDate, filterPeriod)) {
        const amt = parseFloat(t.amount) || 0;
        const catId = t.category_id || categories.find(c => c.name === t.category)?.id;
        if (catId && categoryTotals[catId] !== undefined) {
          categoryTotals[catId] += amt;
        }
      }
    });

    const groupTotals = {};
    categories.forEach(cat => {
      const total = categoryTotals[cat.id];
      if (total > 0 && cat.cashflowGroup) {
        if (!groupTotals[cat.cashflowGroup]) groupTotals[cat.cashflowGroup] = 0;
        groupTotals[cat.cashflowGroup] += total;
      }
    });

    const groupMap = cashflowGroups.reduce((acc, g) => { acc[g.id] = g; return acc; }, {});
    let totalInc = 0;
    let totalExp = 0;
    let totalSav = 0;
    
    const sortedGroupTotals = Object.entries(groupTotals)
      .map(([groupId, amount]) => ({ groupId, amount, g: groupMap[groupId] }))
      .filter(item => item.g)
      .sort((a, b) => {
        if (a.g.type === 'income' && b.g.type !== 'income') return -1;
        if (a.g.type !== 'income' && b.g.type === 'income') return 1;
        if (sankeySortMode === 'index') return (a.g.orderIndex || 0) - (b.g.orderIndex || 0);
        return b.amount - a.amount;
      });

    sortedGroupTotals.forEach(item => {
      if (item.g.type === 'income') totalInc += item.amount;
      else if (item.g.type === 'expense') totalExp += item.amount;
      else if (item.g.type === 'savings') totalSav += item.amount;
    });

    const netSavings = totalInc - totalExp - totalSav;
    const isSurplus = totalInc >= (totalExp + totalSav);
    const deficitAmount = isSurplus ? 0 : (totalExp + totalSav - totalInc);

    const labelTotalCash = `Total Cash (${formatMoney(totalInc)})`;
    const labelTotalExp = `Expense (${formatMoney(totalExp)})`;
    const labelTotalSav = `Savings (${formatMoney(totalSav)})`;
    const labelRemaining = `Remaining Balance (${formatMoney(netSavings)})`;
    const labelOverspent = `Overspent (${formatMoney(deficitAmount)})`;

    // Safe percentage formatting helper to prevent RangeErrors (Infinity.toFixed) on division by zero
    const formatPercent = (val, total, suffix = '') => {
      if (!total || total <= 0) return '0.0' + suffix;
      const pct = (val / total) * 100;
      return (isFinite(pct) ? pct.toFixed(1) : '0.0') + suffix;
    };

    // 1. Income Groups -> Total Cash
    sortedGroupTotals.filter(item => item.g.type === 'income').forEach(({ groupId, amount, g }) => {
      const groupLabel = `${g.name} (${formatMoney(amount)})`;
      flows.push({
        from: groupLabel,
        to: labelTotalCash,
        flow: amount,
        color: g.color,
        percent: formatPercent(amount, totalInc, '% of Total')
      });
    });

    // 1.1 Overspent -> Total Cash (in case of deficit)
    if (!isSurplus && deficitAmount > 0) {
      flows.push({
        from: labelOverspent,
        to: labelTotalCash,
        flow: deficitAmount,
        color: '#da291c', // Rosso Corsa accent for overspent/deficit
        percent: 'Deficit'
      });
    }

    // 2. Total Cash -> Total Expense
    if (totalExp > 0) {
      flows.push({
        from: labelTotalCash,
        to: labelTotalExp,
        flow: totalExp,
        color: '#64748B', // Slate gray
        percent: formatPercent(totalExp, totalInc, '% of Cash used')
      });
    }

    // 3. Total Cash -> Total Savings
    if (totalSav > 0) {
      flows.push({
        from: labelTotalCash,
        to: labelTotalSav,
        flow: totalSav,
        color: '#10B981', // Emerald green
        percent: formatPercent(totalSav, totalInc, '% of Cash saved')
      });
    }

    // 3.1 Total Cash -> Remaining Balance
    if (isSurplus && netSavings > 0) {
      flows.push({
        from: labelTotalCash,
        to: labelRemaining,
        flow: netSavings,
        color: '#3B82F6', // Royal blue for Remaining Balance
        percent: formatPercent(netSavings, totalInc, '% เงินคงเหลือสุทธิ')
      });
    }

    // 4. Total Expense -> Expense Groups -> Categories
    sortedGroupTotals.filter(item => item.g.type === 'expense').forEach(({ groupId, amount, g }) => {
      const groupLabel = `${g.name} (${formatMoney(amount)})`;
      flows.push({
        from: labelTotalExp,
        to: groupLabel,
        flow: amount,
        color: g.color,
        percent: formatPercent(amount, totalExp, '% of Outflow')
      });

      const groupCategories = categories.filter(c => c.cashflowGroup === groupId)
        .map(cat => ({ ...cat, catTotal: categoryTotals[cat.id] }))
        .filter(c => c.catTotal > 0)
        .sort((a, b) => {
          if (sankeySortMode === 'index') return (a.orderIndex || 0) - (b.orderIndex || 0);
          return b.catTotal - a.catTotal;
        });

      groupCategories.forEach(cat => {
        const catLabel = `${cat.name} (${formatMoney(cat.catTotal)})`;
        flows.push({
          from: groupLabel,
          to: catLabel,
          flow: cat.catTotal,
          color: cat.color,
          percent: formatPercent(cat.catTotal, amount, `% of ${g.name}`)
        });
      });
    });

    // 4.1 Total Savings -> Savings Groups -> Categories
    sortedGroupTotals.filter(item => item.g.type === 'savings').forEach(({ groupId, amount, g }) => {
      const groupLabel = `${g.name} (${formatMoney(amount)})`;
      flows.push({
        from: labelTotalSav,
        to: groupLabel,
        flow: amount,
        color: g.color,
        percent: formatPercent(amount, totalSav, '% of Savings')
      });

      const groupCategories = categories.filter(c => c.cashflowGroup === groupId)
        .map(cat => ({ ...cat, catTotal: categoryTotals[cat.id] }))
        .filter(c => c.catTotal > 0)
        .sort((a, b) => {
          if (sankeySortMode === 'index') return (a.orderIndex || 0) - (b.orderIndex || 0);
          return b.catTotal - a.catTotal;
        });

      groupCategories.forEach(cat => {
        const catLabel = `${cat.name} (${formatMoney(cat.catTotal)})`;
        flows.push({
          from: groupLabel,
          to: catLabel,
          flow: cat.catTotal,
          color: cat.color,
          percent: formatPercent(cat.catTotal, amount, `% of ${g.name}`)
        });
      });
    });

    const priority = {};
    const column = {};
    const COL_INCOME = 0;
    const COL_TOTAL = 1;
    const COL_EXP_MAIN = 2; 
    const COL_EXP_GROUP = 3;
    const COL_CAT = 4;

    priority[labelTotalCash] = 1000;
    column[labelTotalCash] = COL_TOTAL;

    priority[labelTotalExp] = 2000;
    column[labelTotalExp] = COL_EXP_MAIN;

    priority[labelTotalSav] = 1500;
    column[labelTotalSav] = COL_EXP_MAIN;

    priority[labelRemaining] = -1;
    column[labelRemaining] = COL_EXP_MAIN;

    priority[labelOverspent] = 900; 
    column[labelOverspent] = COL_INCOME;

    const incomes = sortedGroupTotals.filter(item => item.g.type === 'income');
    incomes.forEach((item, idx) => {
      const groupLabel = `${item.g.name} (${formatMoney(item.amount)})`;
      priority[groupLabel] = idx + 1;
      column[groupLabel] = COL_INCOME;
    });

    const expenses = sortedGroupTotals.filter(item => item.g.type === 'expense' || item.g.type === 'savings');
    expenses.sort((a, b) => {
      if (a.g.type === 'savings' && b.g.type !== 'savings') return -1;
      if (a.g.type !== 'savings' && b.g.type === 'savings') return 1;
      if (sankeySortMode === 'index') return (a.g.orderIndex || 0) - (b.g.orderIndex || 0);
      return b.amount - a.amount;
    });

    let expensePriorityBase = 3000;
    expenses.forEach((item, gIdx) => {
      const groupLabel = `${item.g.name} (${formatMoney(item.amount)})`;
      priority[groupLabel] = expensePriorityBase + gIdx;
      column[groupLabel] = COL_EXP_GROUP;

      const cats = categories.filter(c => c.cashflowGroup === item.groupId)
        .map(cat => ({ ...cat, catTotal: categoryTotals[cat.id] }))
        .filter(c => c.catTotal > 0)
        .sort((a, b) => {
          if (sankeySortMode === 'index') return (a.orderIndex || 0) - (b.orderIndex || 0);
          return b.catTotal - a.catTotal;
        });

      cats.forEach((cat, cIdx) => {
        const catLabel = `${cat.name} (${formatMoney(cat.catTotal)})`;
        priority[catLabel] = expensePriorityBase + (gIdx * 100) + cIdx + 1;
        column[catLabel] = COL_CAT;
      });
    });

    return {
      datasets: [{
        data: flows,
        priority,
        column,
        colorFrom: (c) => {
          const color = c.dataset?.data?.[c.dataIndex]?.color || '#475569';
          return `rgba(${hexToRgb(color)}, 0.45)`;
        },
        colorTo: (c) => {
          const color = c.dataset?.data?.[c.dataIndex]?.color || '#475569';
          return `rgba(${hexToRgb(color)}, 0.45)`;
        },
        hoverColorFrom: (c) => {
          const color = c.dataset?.data?.[c.dataIndex]?.color || '#475569';
          return `rgba(${hexToRgb(color)}, 0.9)`;
        },
        hoverColorTo: (c) => {
          const color = c.dataset?.data?.[c.dataIndex]?.color || '#475569';
          return `rgba(${hexToRgb(color)}, 0.9)`;
        },
        colorMode: 'gradient',
        size: 'max',
        labels: {
          color: '#FFFFFF',
          font: { family: "'Inter', 'Bai Jamjuree', sans-serif", size: 10, weight: 'bold' },
          display: true
        },
        nodeWidth: 15,
        nodePadding: 22,
      }]
    };
  }, [chartViewType, analytics, transactions, categories, cashflowGroups, filterPeriod, sankeySortMode]);
}
