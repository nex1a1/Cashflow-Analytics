import { useMemo } from 'react';
import { formatMoney, hexToRgb } from '../../../utils/formatters';
import { useDashboardContext } from '../context/DashboardContext';
import { toISODate, isDateInFilter } from '../../../utils/dateHelpers';

export function useSankeyEngine({ chartViewType, sankeySortMode, sankeyMode = 'standard' }) {
  const { transactions, analytics, categories, cashflowGroups, filterPeriod, dm } = useDashboardContext();

  return useMemo(() => {
    if (chartViewType !== 'sankey' || !analytics || !transactions) return null;
    const flows = [];

    const groupMap = cashflowGroups.reduce((acc, g) => { acc[g.id] = g; return acc; }, {});

    // Calculate category totals directly from transactions to include income, expenses, and savings correctly
    const categoryTotals = {};
    categories.forEach(cat => {
      categoryTotals[cat.id] = 0;
    });

    // Breakdown per category for allocation: catAllocTotals[catId] = { need: 0, want: 0, savings: 0 }
    const catAllocTotals = {};

    transactions.forEach(t => {
      if (t.is_deleted) return;
      const isoDate = toISODate(t.date);
      if (isDateInFilter(isoDate, filterPeriod)) {
        const amt = Number.parseFloat(t.amount) || 0;
        const catId = t.category_id || categories.find(c => c.name === t.category)?.id;
        if (catId && categoryTotals[catId] !== undefined) {
          categoryTotals[catId] += amt;

          // Track allocation per category
          const cat = categories.find(c => c.id === catId);
          if (cat && cat.cashflowGroup) {
            const g = groupMap[cat.cashflowGroup];
            if (g) {
              let alloc = t.allocation_type;
              if (g.type === 'savings') {
                alloc = 'savings';
              } else if (g.type === 'expense') {
                if (!alloc) alloc = g.allocation_type || 'want';
              }
              if (alloc && (alloc === 'need' || alloc === 'want' || alloc === 'savings')) {
                if (!catAllocTotals[catId]) catAllocTotals[catId] = { need: 0, want: 0, savings: 0 };
                catAllocTotals[catId][alloc] = (catAllocTotals[catId][alloc] || 0) + amt;
              }
            }
          }
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
    const labelRemaining = `Remaining Balance (${formatMoney(netSavings)})`;
    const labelOverspent = `Overspent (${formatMoney(deficitAmount)})`;

    // Safe percentage formatting helper to prevent RangeErrors (Infinity.toFixed) on division by zero
    const formatPercent = (val, total, suffix = '') => {
      if (!total || total <= 0) return '0.0' + suffix;
      const pct = (val / total) * 100;
      return (Number.isFinite(pct) ? pct.toFixed(1) : '0.0') + suffix;
    };

    const priority = {};
    const column = {};

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

    const COL_INCOME = 0;
    const COL_TOTAL = 1;

    priority[labelTotalCash] = 1000;
    column[labelTotalCash] = COL_TOTAL;
    priority[labelOverspent] = 900; 
    column[labelOverspent] = COL_INCOME;

    const incomes = sortedGroupTotals.filter(item => item.g.type === 'income');
    incomes.forEach((item, idx) => {
      const groupLabel = `${item.g.name} (${formatMoney(item.amount)})`;
      priority[groupLabel] = idx + 1;
      column[groupLabel] = COL_INCOME;
    });

    if (sankeyMode === 'allocation') {
      // --- ALLOCATION MODE (4-COL CLEAN FLOW: Income -> Cash -> Allocation Pillars -> Categories) ---
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
      // Fallback if savings came from group type without catAllocTotals breakdown
      if (totalAllocSav === 0 && totalSav > 0) totalAllocSav = totalSav;

      const labelNeed = `Need - จำเป็น (${formatMoney(totalNeed)})`;
      const labelWant = `Want - อยากได้ (${formatMoney(totalWant)})`;
      const labelSav = `Savings - เงินออม (${formatMoney(totalAllocSav)})`;

      // 2. Total Cash -> Allocation Pillars
      if (totalNeed > 0) {
        flows.push({
          from: labelTotalCash,
          to: labelNeed,
          flow: totalNeed,
          color: '#F43F5E', // Rose Crimson
          percent: formatPercent(totalNeed, totalInc, '% of Cash used')
        });
      }

      if (totalWant > 0) {
        flows.push({
          from: labelTotalCash,
          to: labelWant,
          flow: totalWant,
          color: '#0EA5E9', // Sky Cyan
          percent: formatPercent(totalWant, totalInc, '% of Cash used')
        });
      }

      if (totalAllocSav > 0) {
        flows.push({
          from: labelTotalCash,
          to: labelSav,
          flow: totalAllocSav,
          color: '#10B981', // Emerald green
          percent: formatPercent(totalAllocSav, totalInc, '% of Cash saved')
        });
      }

      if (isSurplus && netSavings > 0) {
        flows.push({
          from: labelTotalCash,
          to: labelRemaining,
          flow: netSavings,
          color: '#3B82F6', // Royal blue
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

      // 3. Direct Allocation Pillars -> Categories (EXPENSE & SAVINGS ONLY, EXCLUDING INCOME CATEGORIES)
      const categoriesWithData = categories
        .map(cat => {
          const g = groupMap[cat.cashflowGroup];
          const allocs = catAllocTotals[cat.id] || { need: 0, want: 0, savings: 0 };
          const catTotal = categoryTotals[cat.id] || 0;
          
          // Fallback: Default to 'want' if an expense category has total > 0 but no explicit allocation
          if (g?.type === 'expense' && catTotal > 0 && !allocs.need && !allocs.want && !allocs.savings) {
            allocs.want = catTotal;
          }

          return {
            ...cat,
            groupType: g?.type,
            catTotal,
            allocs
          };
        })
        .filter(cat => cat.catTotal > 0 && (cat.groupType === 'expense' || cat.groupType === 'savings'));

      // Separate categories by DOMINANT allocation to align nodes naturally with Col 2 pillars
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

      // Assign priorities: Need categories top (2000+), Want middle (3000+), Savings bottom (4000+)
      needCategories.forEach((cat, idx) => {
        const catLabel = `${cat.name} (${formatMoney(cat.catTotal)})`;
        priority[catLabel] = 2000 + idx;
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

      wantCategories.forEach((cat, idx) => {
        const catLabel = `${cat.name} (${formatMoney(cat.catTotal)})`;
        priority[catLabel] = 3000 + idx;
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

    } else {
      // --- STANDARD MODE (5-COL FLOW: Income -> Total Cash -> Expense/Savings -> Groups -> Categories) ---
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
          color: '#64748B', // Slate gray
          percent: formatPercent(totalExp, totalInc, '% of Cash used')
        });
      }

      if (totalSav > 0) {
        flows.push({
          from: labelTotalCash,
          to: labelTotalSav,
          flow: totalSav,
          color: '#10B981', // Emerald green
          percent: formatPercent(totalSav, totalInc, '% of Cash saved')
        });
      }

      if (isSurplus && netSavings > 0) {
        flows.push({
          from: labelTotalCash,
          to: labelRemaining,
          flow: netSavings,
          color: '#3B82F6', // Royal blue for Remaining Balance
          percent: formatPercent(netSavings, totalInc, '% เงินคงเหลือสุทธิ')
        });
      }

      priority[labelTotalExp] = 2000;
      column[labelTotalExp] = COL_EXP_MAIN;

      priority[labelTotalSav] = 1500;
      column[labelTotalSav] = COL_EXP_MAIN;

      priority[labelRemaining] = -1;
      column[labelRemaining] = COL_EXP_MAIN;

      // Expense Groups -> Categories
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

      // Savings Groups -> Categories
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

      const expenses = sortedGroupTotals.filter(item => item.g.type === 'expense' || item.g.type === 'savings');
      expenses.sort((a, b) => {
        if (a.g.type === 'savings' && b.g.type !== 'savings') return -1;
        if (a.g.type !== 'savings' && b.g.type === 'savings') return 1;
        if (sankeySortMode === 'index') return (a.orderIndex || 0) - (b.orderIndex || 0);
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
