import { useMemo } from 'react';
import { formatMoney, hexToRgb } from '../../../utils/formatters';
import { useDashboardContext } from '../context/DashboardContext';
import { toISODate, isDateInFilter } from '../../../utils/dateHelpers';

function formatPercent(val, total, suffix = '') {
  if (!total || total <= 0) return '0.0' + suffix;
  const pct = (val / total) * 100;
  return (Number.isFinite(pct) ? pct.toFixed(1) : '0.0') + suffix;
}

function resolveTransactionAllocation(t, group) {
  if (group.type === 'savings') return 'savings';
  if (group.type === 'expense') {
    return t.allocation_type || group.allocation_type || 'want';
  }
  return null;
}

function recordCategoryAllocation(catAllocTotals, catId, alloc, amt) {
  if (!alloc || !['need', 'want', 'savings'].includes(alloc)) return;
  if (!catAllocTotals[catId]) {
    catAllocTotals[catId] = { need: 0, want: 0, savings: 0 };
  }
  catAllocTotals[catId][alloc] = (catAllocTotals[catId][alloc] || 0) + amt;
}

function processSankeyTransaction(t, { filterPeriod, categoryMap, groupMap, categoryTotals, catAllocTotals }) {
  if (t.is_deleted) return;
  const isoDate = toISODate(t.date);
  if (!isDateInFilter(isoDate, filterPeriod)) return;

  const amt = Number.parseFloat(t.amount) || 0;
  const cat = t.category_id ? categoryMap.get(t.category_id) : categoryMap.get(t.category);
  if (!cat || categoryTotals[cat.id] === undefined) return;

  categoryTotals[cat.id] += amt;

  if (!cat.cashflowGroup) return;
  const group = groupMap[cat.cashflowGroup];
  if (!group) return;

  const alloc = resolveTransactionAllocation(t, group);
  recordCategoryAllocation(catAllocTotals, cat.id, alloc, amt);
}

function buildIncomeSankeyFlows({
  sortedGroupTotals, totalInc, deficitAmount, isSurplus,
  labelTotalCash, labelOverspent, flows, priority, column
}) {
  const COL_INCOME = 0;
  const COL_TOTAL = 1;

  priority[labelTotalCash] = 1000;
  column[labelTotalCash] = COL_TOTAL;
  priority[labelOverspent] = 900; 
  column[labelOverspent] = COL_INCOME;

  sortedGroupTotals.filter(item => item.g.type === 'income').forEach(({ amount, g }, idx) => {
    const groupLabel = `${g.name} (${formatMoney(amount)})`;
    flows.push({
      from: groupLabel,
      to: labelTotalCash,
      flow: amount,
      color: g.color,
      percent: formatPercent(amount, totalInc, '% of Total')
    });
    priority[groupLabel] = idx + 1;
    column[groupLabel] = COL_INCOME;
  });

  if (!isSurplus && deficitAmount > 0) {
    flows.push({
      from: labelOverspent,
      to: labelTotalCash,
      flow: deficitAmount,
      color: '#da291c',
      percent: 'Deficit'
    });
  }
}

function buildAllocationSankeyFlows({
  catAllocTotals, totalSav, totalInc, netSavings, isSurplus,
  labelTotalCash, labelRemaining, flows, priority, column,
  categories, categoryTotals, groupMap, sankeySortMode
}) {
  const COL_ALLOCATION = 2;
  const COL_CAT_ALLOC = 3;

  let totalNeed = 0;
  let totalWant = 0;
  let totalAllocSav = 0;

  Object.values(catAllocTotals).forEach(allocs => {
    totalNeed += allocs.need || 0;
    totalWant += allocs.want || 0;
    totalAllocSav += allocs.savings || 0;
  });
  if (totalAllocSav === 0 && totalSav > 0) totalAllocSav = totalSav;

  const labelNeed = `Need - จำเป็น (${formatMoney(totalNeed)})`;
  const labelWant = `Want - อยากได้ (${formatMoney(totalWant)})`;
  const labelSav = `Savings - เงินออม (${formatMoney(totalAllocSav)})`;

  if (totalNeed > 0) {
    flows.push({
      from: labelTotalCash,
      to: labelNeed,
      flow: totalNeed,
      color: '#F43F5E',
      percent: formatPercent(totalNeed, totalInc, '% of Cash used')
    });
  }

  if (totalWant > 0) {
    flows.push({
      from: labelTotalCash,
      to: labelWant,
      flow: totalWant,
      color: '#0EA5E9',
      percent: formatPercent(totalWant, totalInc, '% of Cash used')
    });
  }

  if (totalAllocSav > 0) {
    flows.push({
      from: labelTotalCash,
      to: labelSav,
      flow: totalAllocSav,
      color: '#10B981',
      percent: formatPercent(totalAllocSav, totalInc, '% of Cash saved')
    });
  }

  if (isSurplus && netSavings > 0) {
    flows.push({
      from: labelTotalCash,
      to: labelRemaining,
      flow: netSavings,
      color: '#3B82F6',
      percent: formatPercent(netSavings, totalInc, '% เงินคงเหลือสุทธิ')
    });
  }

  priority[labelNeed] = 1400;
  column[labelNeed] = COL_ALLOCATION;
  priority[labelWant] = 1600;
  column[labelWant] = COL_ALLOCATION;
  priority[labelSav] = 1800;
  column[labelSav] = COL_ALLOCATION;
  priority[labelRemaining] = -1;
  column[labelRemaining] = COL_ALLOCATION;

  const categoriesWithData = categories
    .map(cat => {
      const g = groupMap[cat.cashflowGroup];
      const allocs = catAllocTotals[cat.id] || { need: 0, want: 0, savings: 0 };
      const catTotal = categoryTotals[cat.id] || 0;
      if (g?.type === 'expense' && catTotal > 0 && !allocs.need && !allocs.want && !allocs.savings) {
        allocs.want = catTotal;
      }
      return { ...cat, groupType: g?.type, catTotal, allocs };
    })
    .filter(cat => cat.catTotal > 0 && (cat.groupType === 'expense' || cat.groupType === 'savings'));

  const needCategories = categoriesWithData.filter(c => c.allocs.need >= c.allocs.want && c.allocs.need > 0);
  const wantCategories = categoriesWithData.filter(c => c.allocs.want > c.allocs.need && c.allocs.want > 0);
  const savCategories = categoriesWithData.filter(c => c.groupType === 'savings' || (c.allocs.savings > 0 && c.allocs.need === 0 && c.allocs.want === 0));

  const sortCatList = (list) => list.sort((a, b) => {
    if (sankeySortMode === 'index') return (a.orderIndex || 0) - (b.orderIndex || 0);
    return b.catTotal - a.catTotal;
  });

  sortCatList(needCategories);
  sortCatList(wantCategories);
  sortCatList(savCategories);

  const pushAllocCategoryFlows = (catList, basePriority) => {
    catList.forEach((cat, idx) => {
      const catLabel = `${cat.name} (${formatMoney(cat.catTotal)})`;
      priority[catLabel] = basePriority + idx;
      column[catLabel] = COL_CAT_ALLOC;

      const breakdown = {
        need: cat.allocs.need,
        want: cat.allocs.want,
        savings: cat.allocs.savings,
        total: cat.catTotal,
        catName: cat.name
      };

      if (cat.allocs.need > 0) {
        flows.push({
          from: labelNeed,
          to: catLabel,
          flow: cat.allocs.need,
          color: cat.color || '#F43F5E',
          percent: formatPercent(cat.allocs.need, totalNeed, '% of Need'),
          allocBreakdown: breakdown
        });
      }
      if (cat.allocs.want > 0) {
        flows.push({
          from: labelWant,
          to: catLabel,
          flow: cat.allocs.want,
          color: cat.color || '#0EA5E9',
          percent: formatPercent(cat.allocs.want, totalWant, '% of Want'),
          allocBreakdown: breakdown
        });
      }
    });
  };

  pushAllocCategoryFlows(needCategories, 2000);
  pushAllocCategoryFlows(wantCategories, 3000);

  savCategories.forEach((cat, idx) => {
    const catLabel = `${cat.name} (${formatMoney(cat.catTotal)})`;
    priority[catLabel] = 4000 + idx;
    column[catLabel] = COL_CAT_ALLOC;

    flows.push({
      from: labelSav,
      to: catLabel,
      flow: cat.catTotal,
      color: cat.color || '#10B981',
      percent: formatPercent(cat.catTotal, totalAllocSav, '% of Savings'),
      allocBreakdown: {
        need: cat.allocs.need,
        want: cat.allocs.want,
        savings: cat.allocs.savings,
        total: cat.catTotal,
        catName: cat.name
      }
    });
  });
}

function buildStandardSankeyFlows({
  totalExp, totalSav, totalInc, netSavings, isSurplus,
  labelTotalCash, labelRemaining, flows, priority, column,
  sortedGroupTotals, categories, categoryTotals, sankeySortMode
}) {
  const COL_EXP_MAIN = 2; 
  const COL_EXP_GROUP = 3;
  const COL_CAT = 4;

  const labelTotalExp = `Expense (${formatMoney(totalExp)})`;
  const labelTotalSav = `Savings (${formatMoney(totalSav)})`;

  if (totalExp > 0) {
    flows.push({
      from: labelTotalCash,
      to: labelTotalExp,
      flow: totalExp,
      color: '#64748B',
      percent: formatPercent(totalExp, totalInc, '% of Cash used')
    });
  }

  if (totalSav > 0) {
    flows.push({
      from: labelTotalCash,
      to: labelTotalSav,
      flow: totalSav,
      color: '#10B981',
      percent: formatPercent(totalSav, totalInc, '% of Cash saved')
    });
  }

  if (isSurplus && netSavings > 0) {
    flows.push({
      from: labelTotalCash,
      to: labelRemaining,
      flow: netSavings,
      color: '#3B82F6',
      percent: formatPercent(netSavings, totalInc, '% เงินคงเหลือสุทธิ')
    });
  }

  priority[labelTotalExp] = 2000;
  column[labelTotalExp] = COL_EXP_MAIN;
  priority[labelTotalSav] = 1500;
  column[labelTotalSav] = COL_EXP_MAIN;
  priority[labelRemaining] = -1;
  column[labelRemaining] = COL_EXP_MAIN;

  const pushGroupAndCategoryFlows = (type, parentLabel, parentTotal, percentLabel) => {
    sortedGroupTotals.filter(item => item.g.type === type).forEach(({ groupId, amount, g }) => {
      const groupLabel = `${g.name} (${formatMoney(amount)})`;
      flows.push({
        from: parentLabel,
        to: groupLabel,
        flow: amount,
        color: g.color,
        percent: formatPercent(amount, parentTotal, percentLabel(g.name))
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
  };

  pushGroupAndCategoryFlows('expense', labelTotalExp, totalExp, () => '% of Outflow');
  pushGroupAndCategoryFlows('savings', labelTotalSav, totalSav, () => '% of Savings');

  const expenses = sortedGroupTotals.filter(item => item.g.type === 'expense' || item.g.type === 'savings');
  expenses.sort((a, b) => {
    if (a.g.type === 'savings' && b.g.type !== 'savings') return -1;
    if (a.g.type !== 'savings' && b.g.type === 'savings') return 1;
    if (sankeySortMode === 'index') return (a.orderIndex || 0) - (b.orderIndex || 0);
    return b.amount - a.amount;
  });

  const expensePriorityBase = 3000;
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
}

export function useSankeyEngine({ chartViewType, sankeySortMode, sankeyMode = 'standard' }) {
  const { transactions, analytics, categories, cashflowGroups, filterPeriod, dm } = useDashboardContext();

  return useMemo(() => {
    if (chartViewType !== 'sankey' || !analytics || !transactions) return null;
    const flows = [];

    const groupMap = cashflowGroups.reduce((acc, g) => { acc[g.id] = g; return acc; }, {});

    const categoryMap = new Map();
    const categoryTotals = {};
    categories.forEach(cat => {
      categoryMap.set(cat.id, cat);
      categoryMap.set(cat.name, cat);
      categoryTotals[cat.id] = 0;
    });

    const catAllocTotals = {};
    transactions.forEach(t => {
      processSankeyTransaction(t, { filterPeriod, categoryMap, groupMap, categoryTotals, catAllocTotals });
    });

    const groupTotals = {};
    categories.forEach(cat => {
      const total = categoryTotals[cat.id];
      if (total > 0 && cat.cashflowGroup) {
        if (!groupTotals[cat.cashflowGroup]) groupTotals[cat.cashflowGroup] = 0;
        groupTotals[cat.cashflowGroup] += total;
      }
    });

    let totalInc = 0;
    let totalExp = 0;
    let totalSav = 0;
    
    const sortedGroupTotals = Object.entries(groupTotals)
      .map(([groupId, amount]) => ({ groupId, amount, g: groupMap[groupId] }))
      .filter(item => item.g)
      .sort((a, b) => {
        if (a.g.type === 'income' && b.g.type !== 'income') return -1;
        if (a.g.type !== 'income' && b.g.type === 'income') return 1;
        if (sankeySortMode === 'index') return (a.orderIndex || 0) - (b.orderIndex || 0);
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
    const labelRemaining = `Remaining Balance (${formatMoney(netSavings)})`;
    const labelOverspent = `Overspent (${formatMoney(deficitAmount)})`;

    const priority = {};
    const column = {};

    buildIncomeSankeyFlows({
      sortedGroupTotals, totalInc, deficitAmount, isSurplus,
      labelTotalCash, labelOverspent, flows, priority, column
    });

    if (sankeyMode === 'allocation') {
      buildAllocationSankeyFlows({
        catAllocTotals, totalSav, totalInc, netSavings, isSurplus,
        labelTotalCash, labelRemaining, flows, priority, column,
        categories, categoryTotals, groupMap, sankeySortMode
      });
    } else {
      buildStandardSankeyFlows({
        totalExp, totalSav, totalInc, netSavings, isSurplus,
        labelTotalCash, labelRemaining, flows, priority, column,
        sortedGroupTotals, categories, categoryTotals, sankeySortMode
      });
    }

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
  }, [chartViewType, analytics, transactions, categories, cashflowGroups, filterPeriod, sankeySortMode, sankeyMode]);
}
