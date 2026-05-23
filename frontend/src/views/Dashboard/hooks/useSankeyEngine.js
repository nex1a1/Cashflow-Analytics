import { useMemo } from 'react';
import { formatMoney } from '../../../utils/formatters';
import { useDashboardContext } from '../context/DashboardContext';

export function useSankeyEngine({ chartViewType, sankeySortMode }) {
  const { analytics, categories, cashflowGroups, filterPeriod, chartGroupBy, dm } = useDashboardContext();

  return useMemo(() => {
    if (chartViewType !== 'sankey' || !analytics) return null;
    const flows = [];
    const isSingleMonthView = !!filterPeriod.match(/^\d{4}-\d{2}$/);
    const showMonthly = !isSingleMonthView && chartGroupBy === 'monthly';

    const groupTotals = {};
    categories.forEach(cat => {
      const total = showMonthly
        ? analytics.sortedMonthsKeys?.reduce((sum, m) => sum + (analytics.monthlyCatMap?.[cat.id]?.[m] || 0), 0)
        : analytics.datesInPeriod?.reduce((sum, d) => sum + (analytics.dailyCatMap?.[cat.id]?.[d] || 0), 0);
      if (total > 0) {
        if (!groupTotals[cat.cashflowGroup]) groupTotals[cat.cashflowGroup] = 0;
        groupTotals[cat.cashflowGroup] += total;
      }
    });

    const groupMap = cashflowGroups.reduce((acc, g) => { acc[g.id] = g; return acc; }, {});
    let totalInc = 0;
    let totalExp = 0;
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
      else if (item.g.type === 'expense' || item.g.type === 'savings') totalExp += item.amount;
    });

    const labelTotalCash = `Total Cash (${formatMoney(totalInc)})`;
    const labelTotalExp = `Expense (${formatMoney(totalExp)})`;
    const labelRemaining = `Remaining Balance (${formatMoney(totalInc - totalExp)})`;

    // 1. Income Groups -> Total Cash
    sortedGroupTotals.filter(item => item.g.type === 'income').forEach(({ groupId, amount, g }) => {
      const groupLabel = `${g.name} (${formatMoney(amount)})`;
      flows.push({
        from: groupLabel,
        to: labelTotalCash,
        flow: amount,
        color: g.color,
        percent: ((amount / totalInc) * 100).toFixed(1) + '% of Total'
      });
    });

    // 2. Total Cash -> Total Expense
    if (totalInc > 0 && totalExp > 0) {
      const flowToExpense = Math.min(totalInc, totalExp);
      flows.push({
        from: labelTotalCash,
        to: labelTotalExp,
        flow: flowToExpense,
        color: '#64748B',
        percent: ((flowToExpense / totalInc) * 100).toFixed(1) + '% of Cash used'
      });
    }

    // 3. Total Cash -> Remaining Balance
    const netSavings = totalInc - totalExp;
    if (netSavings > 0) {
      flows.push({
        from: labelTotalCash,
        to: labelRemaining,
        flow: netSavings,
        color: '#10B981',
        percent: ((netSavings / totalInc) * 100).toFixed(1) + '% เงินไม่ได้ใช้จ่าย'
      });
    } else if (netSavings < 0) {
      const debtLabel = `Overspent (${formatMoney(Math.abs(netSavings))})`;
      flows.push({
        from: debtLabel,
        to: labelTotalExp,
        flow: Math.abs(netSavings),
        color: '#EF4444',
        percent: 'Deficit'
      });
    }

    // 4. Total Expense -> Expense/Savings Groups -> Categories
    sortedGroupTotals.filter(item => item.g.type === 'expense' || item.g.type === 'savings').forEach(({ groupId, amount, g }) => {
      const groupLabel = `${g.name} (${formatMoney(amount)})`;
      flows.push({
        from: labelTotalExp,
        to: groupLabel,
        flow: amount,
        color: g.color,
        percent: ((amount / totalExp) * 100).toFixed(1) + '% of Outflow'
      });

      const groupCategories = categories.filter(c => c.cashflowGroup === groupId)
        .map(cat => {
          const catTotal = showMonthly
            ? analytics.sortedMonthsKeys?.reduce((sum, m) => sum + (analytics.monthlyCatMap?.[cat.id]?.[m] || 0), 0)
            : analytics.datesInPeriod?.reduce((sum, d) => sum + (analytics.dailyCatMap?.[cat.id]?.[d] || 0), 0);
          return { ...cat, catTotal };
        })
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
          percent: ((cat.catTotal / amount) * 100).toFixed(1) + `% of ${g.name}`
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

    priority[labelRemaining] = -1;
    column[labelRemaining] = COL_EXP_MAIN;

    priority[labelTotalCash] = 1000;
    column[labelTotalCash] = COL_TOTAL;

    priority[labelTotalExp] = 2000;
    column[labelTotalExp] = COL_EXP_MAIN;

    const overspentLabel = `Overspent (${formatMoney(Math.abs(totalInc - totalExp))})`;
    priority[overspentLabel] = 900; 
    column[overspentLabel] = COL_INCOME;

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
        .map(cat => {
          const catTotal = showMonthly
            ? analytics.sortedMonthsKeys?.reduce((sum, m) => sum + (analytics.monthlyCatMap?.[cat.id]?.[m] || 0), 0)
            : analytics.datesInPeriod?.reduce((sum, d) => sum + (analytics.dailyCatMap?.[cat.id]?.[d] || 0), 0);
          return { ...cat, catTotal };
        })
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
        colorFrom: (c) => c.dataset?.data?.[c.dataIndex]?.color || ('#475569'),
        colorTo: (c) => c.dataset?.data?.[c.dataIndex]?.color || ('#475569'),
        colorMode: 'gradient',
        size: 'max',
        labels: {
          color: '#FFFFFF',
          font: { family: "'Inter', 'IBM Plex Sans Thai Looped', sans-serif", size: 10, weight: 'bold' },
          display: true
        },
        nodeWidth: 15,
        nodePadding: 22,
      }]
    };
  }, [chartViewType, analytics, categories, cashflowGroups, filterPeriod, chartGroupBy, dm, sankeySortMode]);
}
