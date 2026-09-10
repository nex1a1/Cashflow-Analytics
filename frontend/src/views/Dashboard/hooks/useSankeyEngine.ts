import { useMemo } from 'react';
import { formatMoney, hexToRgb } from '@/utils/formatters';
import { useDashboardContext } from '../context/DashboardContext';
import { toISODate, isDateInFilter } from '@/utils/dateHelpers';
import { TransactionDisplay, Category, CashflowGroup } from '@/types';

interface SankeyEngineProps {
  chartViewType: string;
  sankeySortMode: string;
  sankeyMode?: string;
}

// ─── Sankey layout invariants ───────────────────────────────────────────────
// `column` (0-4) is shared across every builder and must stay in lockstep with the
// 5-column layout mandated by CLAUDE.md (Income -> Total Cash -> Alloc/Expense -> Groups -> Categories).
// `priority` only has to be unique *within one render*: buildIncomeSankeyFlows always runs,
// paired with exactly one of buildAllocationSankeyFlows OR buildStandardSankeyFlows (sankeyMode
// picks one, never both) — so the ALLOC_* and STANDARD_* bands below may safely reuse the same
// numbers as each other, but must never collide with the INCOME band, which always coexists.
const SANKEY_COLUMN = {
  INCOME: 0,
  TOTAL_CASH: 1,
  ALLOCATION: 2,
  EXPENSE_MAIN: 2,
  CAT_ALLOC: 3,
  EXPENSE_GROUP: 3,
  CAT: 4,
} as const;

const SANKEY_PRIORITY = {
  INCOME_OVERSPENT: 900,
  TOTAL_CASH: 1000,
  ALLOC_NEED: 1400,
  STANDARD_SAVINGS: 1500,
  ALLOC_WANT: 1600,
  ALLOC_SAV: 1800,
  ALLOC_NEED_CATS_BASE: 2000,
  STANDARD_EXPENSE: 2000,
  ALLOC_WANT_CATS_BASE: 3000,
  STANDARD_EXPENSE_GROUPS_BASE: 3000,
  ALLOC_SAV_CATS_BASE: 4000,
  REMAINING: -1,
} as const;

function formatPercent(val: number, total: number, suffix = ''): string {
  if (!total || total <= 0) return '0.0' + suffix;
  const pct = (val / total) * 100;
  return (Number.isFinite(pct) ? pct.toFixed(1) : '0.0') + suffix;
}

function resolveTransactionAllocation(t: TransactionDisplay, group: CashflowGroup): string | null {
  if (group.type === 'savings') return 'savings';
  if (group.type === 'expense') {
    return t.allocation_type || group.allocation_type || 'want';
  }
  return null;
}

function recordCategoryAllocation(catAllocTotals: Record<string, any>, catId: string, alloc: string | null, amt: number) {
  if (!alloc || !['need', 'want', 'savings'].includes(alloc)) return;
  if (!catAllocTotals[catId]) {
    catAllocTotals[catId] = { need: 0, want: 0, savings: 0 };
  }
  catAllocTotals[catId][alloc] = (catAllocTotals[catId][alloc] || 0) + amt;
}

function processSankeyTransaction(t: any, { filterPeriod, categoryMap, groupMap, categoryTotals, catAllocTotals }: any) {
  if (t.is_deleted) return;
  const isoDate = toISODate(t.date);
  if (!isDateInFilter(isoDate, filterPeriod)) return;

  const amt = Number.parseFloat(t.amount) || 0;
  const cat = t.category_id ? categoryMap.get(t.category_id) : categoryMap.get(t.category);
  if (!cat || categoryTotals[cat.id] === undefined) return;

  categoryTotals[cat.id] += amt;

  if (!cat.cashflow_group_id && !(cat as any).cashflowGroup) return;
  const groupId = cat.cashflow_group_id || (cat as any).cashflowGroup;
  const group = groupMap[groupId];
  if (!group) return;

  const alloc = resolveTransactionAllocation(t, group);
  recordCategoryAllocation(catAllocTotals, cat.id, alloc, amt);
}

function buildIncomeSankeyFlows({
  sortedGroupTotals, totalInc, deficitAmount, isSurplus,
  labelTotalCash, labelOverspent, flows, priority, column
}: any) {
  priority[labelTotalCash] = SANKEY_PRIORITY.TOTAL_CASH;
  column[labelTotalCash] = SANKEY_COLUMN.TOTAL_CASH;
  priority[labelOverspent] = SANKEY_PRIORITY.INCOME_OVERSPENT;
  column[labelOverspent] = SANKEY_COLUMN.INCOME;

  sortedGroupTotals.filter((item: any) => item.g.type === 'income').forEach(({ amount, g }: any, idx: number) => {
    const groupLabel = `${g.name} (${formatMoney(amount)})`;
    flows.push({
      from: groupLabel,
      to: labelTotalCash,
      flow: amount,
      color: g.color,
      percent: formatPercent(amount, totalInc, '% of Total')
    });
    priority[groupLabel] = idx + 1;
    column[groupLabel] = SANKEY_COLUMN.INCOME;
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
}: any) {
  let totalNeed = 0;
  let totalWant = 0;
  let totalAllocSav = 0;

  Object.values(catAllocTotals).forEach((allocs: any) => {
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

  priority[labelNeed] = SANKEY_PRIORITY.ALLOC_NEED;
  column[labelNeed] = SANKEY_COLUMN.ALLOCATION;
  priority[labelWant] = SANKEY_PRIORITY.ALLOC_WANT;
  column[labelWant] = SANKEY_COLUMN.ALLOCATION;
  priority[labelSav] = SANKEY_PRIORITY.ALLOC_SAV;
  column[labelSav] = SANKEY_COLUMN.ALLOCATION;
  priority[labelRemaining] = SANKEY_PRIORITY.REMAINING;
  column[labelRemaining] = SANKEY_COLUMN.ALLOCATION;

  const categoriesWithData = categories
    .map((cat: any) => {
      const groupId = cat.cashflow_group_id || cat.cashflowGroup;
      const g = groupMap[groupId];
      const allocs = catAllocTotals[cat.id] || { need: 0, want: 0, savings: 0 };
      const catTotal = categoryTotals[cat.id] || 0;
      if (g?.type === 'expense' && catTotal > 0 && !allocs.need && !allocs.want && !allocs.savings) {
        allocs.want = catTotal;
      }
      return { ...cat, groupType: g?.type, catTotal, allocs };
    })
    .filter((cat: any) => cat.catTotal > 0 && (cat.groupType === 'expense' || cat.groupType === 'savings'));

  const needCategories = categoriesWithData.filter((c: any) => c.allocs.need >= c.allocs.want && c.allocs.need > 0);
  const wantCategories = categoriesWithData.filter((c: any) => c.allocs.want > c.allocs.need && c.allocs.want > 0);
  const savCategories = categoriesWithData.filter((c: any) => c.groupType === 'savings' || (c.allocs.savings > 0 && c.allocs.need === 0 && c.allocs.want === 0));

  const sortCatList = (list: any[]) => list.sort((a, b) => {
    if (sankeySortMode === 'index') return (a.order_index || a.orderIndex || 0) - (b.order_index || b.orderIndex || 0);
    return b.catTotal - a.catTotal;
  });

  sortCatList(needCategories);
  sortCatList(wantCategories);
  sortCatList(savCategories);

  const pushAllocCategoryFlows = (catList: any[], basePriority: number) => {
    catList.forEach((cat, idx) => {
      const catLabel = `${cat.name} (${formatMoney(cat.catTotal)})`;
      priority[catLabel] = basePriority + idx;
      column[catLabel] = SANKEY_COLUMN.CAT_ALLOC;

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

  pushAllocCategoryFlows(needCategories, SANKEY_PRIORITY.ALLOC_NEED_CATS_BASE);
  pushAllocCategoryFlows(wantCategories, SANKEY_PRIORITY.ALLOC_WANT_CATS_BASE);

  savCategories.forEach((cat: any, idx: number) => {
    const catLabel = `${cat.name} (${formatMoney(cat.catTotal)})`;
    priority[catLabel] = SANKEY_PRIORITY.ALLOC_SAV_CATS_BASE + idx;
    column[catLabel] = SANKEY_COLUMN.CAT_ALLOC;

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
}: any) {
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

  priority[labelTotalExp] = SANKEY_PRIORITY.STANDARD_EXPENSE;
  column[labelTotalExp] = SANKEY_COLUMN.EXPENSE_MAIN;
  priority[labelTotalSav] = SANKEY_PRIORITY.STANDARD_SAVINGS;
  column[labelTotalSav] = SANKEY_COLUMN.EXPENSE_MAIN;
  priority[labelRemaining] = SANKEY_PRIORITY.REMAINING;
  column[labelRemaining] = SANKEY_COLUMN.EXPENSE_MAIN;

  const pushGroupAndCategoryFlows = (type: string, parentLabel: string, parentTotal: number, percentLabel: (name: string) => string) => {
    sortedGroupTotals.filter((item: any) => item.g.type === type).forEach(({ groupId, amount, g }: any) => {
      const groupLabel = `${g.name} (${formatMoney(amount)})`;
      flows.push({
        from: parentLabel,
        to: groupLabel,
        flow: amount,
        color: g.color,
        percent: formatPercent(amount, parentTotal, percentLabel(g.name))
      });

      const groupCategories = categories.filter((c: any) => (c.cashflow_group_id || c.cashflowGroup) === groupId)
        .map((cat: any) => ({ ...cat, catTotal: categoryTotals[cat.id] }))
        .filter((c: any) => c.catTotal > 0)
        .sort((a: any, b: any) => {
          if (sankeySortMode === 'index') return (a.order_index || a.orderIndex || 0) - (b.order_index || b.orderIndex || 0);
          return b.catTotal - a.catTotal;
        });

      groupCategories.forEach((cat: any) => {
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

  const expenses = sortedGroupTotals.filter((item: any) => item.g.type === 'expense' || item.g.type === 'savings');
  expenses.sort((a: any, b: any) => {
    if (a.g.type === 'savings' && b.g.type !== 'savings') return -1;
    if (a.g.type !== 'savings' && b.g.type === 'savings') return 1;
    if (sankeySortMode === 'index') return (a.orderIndex || 0) - (b.orderIndex || 0);
    return b.amount - a.amount;
  });

  const expensePriorityBase = SANKEY_PRIORITY.STANDARD_EXPENSE_GROUPS_BASE;
  expenses.forEach((item: any, gIdx: number) => {
    const groupLabel = `${item.g.name} (${formatMoney(item.amount)})`;
    priority[groupLabel] = expensePriorityBase + gIdx;
    column[groupLabel] = SANKEY_COLUMN.EXPENSE_GROUP;

    const cats = categories.filter((c: any) => (c.cashflow_group_id || c.cashflowGroup) === item.groupId)
      .map((cat: any) => ({ ...cat, catTotal: categoryTotals[cat.id] }))
      .filter((c: any) => c.catTotal > 0)
      .sort((a: any, b: any) => {
        if (sankeySortMode === 'index') return (a.order_index || a.orderIndex || 0) - (b.order_index || b.orderIndex || 0);
        return b.catTotal - a.catTotal;
      });

    cats.forEach((cat: any, cIdx: number) => {
      const catLabel = `${cat.name} (${formatMoney(cat.catTotal)})`;
      priority[catLabel] = expensePriorityBase + (gIdx * 100) + cIdx + 1;
      column[catLabel] = SANKEY_COLUMN.CAT;
    });
  });
}

export function useSankeyEngine({ chartViewType, sankeySortMode, sankeyMode = 'standard' }: SankeyEngineProps) {
  const { transactions, analytics, categories, cashflowGroups, filterPeriod } = useDashboardContext();

  return useMemo(() => {
    if (chartViewType !== 'sankey' || !analytics || !transactions || !cashflowGroups) return null;
    const flows: any[] = [];

    const groupMap = cashflowGroups.reduce((acc: any, g: any) => { acc[g.id] = g; return acc; }, {});

    const categoryMap = new Map();
    const categoryTotals: Record<string, number> = {};
    categories.forEach((cat: any) => {
      categoryMap.set(cat.id, cat);
      categoryMap.set(cat.name, cat);
      categoryTotals[cat.id] = 0;
    });

    const catAllocTotals: Record<string, any> = {};
    transactions.forEach(t => {
      processSankeyTransaction(t, { filterPeriod, categoryMap, groupMap, categoryTotals, catAllocTotals });
    });

    const groupTotals: Record<string, number> = {};
    categories.forEach((cat: any) => {
      const total = categoryTotals[cat.id];
      const groupId = cat.cashflow_group_id || cat.cashflowGroup;
      if (total > 0 && groupId) {
        if (!groupTotals[groupId]) groupTotals[groupId] = 0;
        groupTotals[groupId] += total;
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
        if (sankeySortMode === 'index') return ((a.g as any).order_index || (a.g as any).orderIndex || 0) - ((b.g as any).order_index || (b.g as any).orderIndex || 0);
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

    const priority: Record<string, number> = {};
    const column: Record<string, number> = {};

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
        colorFrom: (c: any) => {
          const color = c.dataset?.data?.[c.dataIndex]?.color || '#475569';
          return `rgba(${hexToRgb(color)}, 0.45)`;
        },
        colorTo: (c: any) => {
          const color = c.dataset?.data?.[c.dataIndex]?.color || '#475569';
          return `rgba(${hexToRgb(color)}, 0.45)`;
        },
        hoverColorFrom: (c: any) => {
          const color = c.dataset?.data?.[c.dataIndex]?.color || '#475569';
          return `rgba(${hexToRgb(color)}, 0.9)`;
        },
        hoverColorTo: (c: any) => {
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
