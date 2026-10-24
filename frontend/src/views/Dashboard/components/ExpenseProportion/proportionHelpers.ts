// src/views/Dashboard/components/ExpenseProportion/proportionHelpers.ts
import {
  AllocationItemData,
  ProportionItem,
  SortMode,
} from './types';

import { tc } from '@/constants/theme';
import { withAlpha } from '../MainChart/futureZone';
/**
 * Recalculates 50/30/20 allocation items when groups are excluded in What-If simulation mode.
 */
export function calculateSimulatedAllocation(
  isAllocationMode: boolean,
  excludedGroupIds: string[],
  sortedAllocation: AllocationItemData[],
  totalIncome: number,
  totalExpense: number,
  netCashflow?: number
): { simulatedAllocation: AllocationItemData[]; totalReduced: number } {
  if (!isAllocationMode || excludedGroupIds.length === 0) {
    return { simulatedAllocation: sortedAllocation, totalReduced: 0 };
  }

  const excludedSet = new Set(excludedGroupIds);
  const needsItem = sortedAllocation.find(a => a.id === 'needs');
  const wantsItem = sortedAllocation.find(a => a.id === 'wants');

  const needsGroups = needsItem?.groups || [];
  const wantsGroups = wantsItem?.groups || [];

  const activeNeedsTotal = needsGroups
    .filter(g => !excludedSet.has(g.id))
    .reduce((sum, g) => sum + g.amount, 0);
  const activeWantsTotal = wantsGroups
    .filter(g => !excludedSet.has(g.id))
    .reduce((sum, g) => sum + g.amount, 0);

  const origNeedsTotal = needsItem?.amount || 0;
  const origWantsTotal = wantsItem?.amount || 0;

  const reducedSum = (origNeedsTotal - activeNeedsTotal) + (origWantsTotal - activeWantsTotal);
  const baseIncome = totalIncome || (totalExpense + Math.max(0, netCashflow || 0));
  const simNetSavings = Math.max(0, baseIncome - (activeNeedsTotal + activeWantsTotal));

  const updatedAllocation: AllocationItemData[] = sortedAllocation.map(item => {
    let simAmount = item.amount;
    if (item.id === 'needs') simAmount = activeNeedsTotal;
    if (item.id === 'wants') simAmount = activeWantsTotal;
    if (item.id === 'savings') simAmount = simNetSavings;

    const simPercentage = baseIncome > 0 ? ((simAmount / baseIncome) * 100).toFixed(1) : '0';

    return {
      ...item,
      amount: simAmount,
      percentage: simPercentage,
    };
  });

  return { simulatedAllocation: updatedAllocation, totalReduced: reducedSum };
}

/**
 * Sorts proportion items based on sortMode. If in allocation mode, order is preserved.
 */
export function sortProportionItems<T extends ProportionItem>(
  rawItems: T[],
  sortMode: SortMode,
  isAllocationMode: boolean
): T[] {
  const items = [...rawItems];
  if (isAllocationMode) return items;

  return items.sort((a, b) => {
    const orderA = a.order_index ?? 999;
    const orderB = b.order_index ?? 999;

    if (sortMode === 'amount-desc') {
      return (b.amount - a.amount) || (orderA - orderB);
    }
    if (sortMode === 'amount-asc') {
      return (a.amount - b.amount) || (orderA - orderB);
    }
    if (sortMode === 'order-asc') {
      return (orderA - orderB) || (b.amount - a.amount);
    }
    return (orderB - orderA) || (b.amount - a.amount); // order-desc
  });
}

/** plan (future-dated) part of one item, never more than the item itself */
export const planOf = (item: ProportionItem): number => Math.min(item.planAmount || 0, item.amount);

/** true when any active item carries plan money, so the doughnut draws each item as actual + plan arcs */
export const hasPlanSlices = (items: ProportionItem[]): boolean => items.some(i => planOf(i) > 0);

/**
 * Generates Chart.js data object for the Doughnut chart.
 * With plan money every item becomes two arcs (actual, plan) so slice index = item index * 2 (+1 for plan).
 */
export function buildDoughnutChartData(
  activeItems: ProportionItem[],
  hoveredIdx: number
) {
  const split = hasPlanSlices(activeItems);
  const dim = (idx: number) => hoveredIdx !== -1 && hoveredIdx !== idx;
  const solid = (i: ProportionItem, idx: number) => (dim(idx) ? `${i.color}40` : i.color);

  if (!split) {
    return {
      labels: activeItems.map(i => i.name),
      datasets: [
        {
          label: 'สัดส่วนรายจ่าย',
          data: activeItems.map(i => i.amount),
          backgroundColor: activeItems.map((i, idx) => solid(i, idx)),
          borderWidth: activeItems.map((_, idx) => (hoveredIdx === idx ? 3 : 2)),
          borderColor: activeItems.map((_, idx) => {
            if (hoveredIdx === idx) return tc('accent-ink');
            return tc('line');
          }),
        },
      ],
    };
  }

  const arcs = activeItems.flatMap((i, idx) => {
    const plan = planOf(i);
    return [
      { item: i, idx, value: i.amount - plan, color: solid(i, idx), isPlan: false },
      { item: i, idx, value: plan, // plain translucent fill: a hatch is too busy on a small arc (the cell bars keep the hatch)
      color: withAlpha(i.color, dim(idx) ? 0.1 : 0.32), isPlan: true },
    ];
  });
  return {
    labels: arcs.map(a => (a.isPlan ? `${a.item.name} (แผน)` : a.item.name)),
    datasets: [
      {
        label: 'สัดส่วนรายจ่าย',
        data: arcs.map(a => a.value),
        backgroundColor: arcs.map(a => a.color),
        // an empty arc must not leave a hairline of border behind
        borderWidth: arcs.map(a => (a.value <= 0 ? 0 : hoveredIdx === a.idx ? 3 : 2)),
        borderColor: arcs.map(a => (hoveredIdx === a.idx ? tc('accent-ink') : tc('line'))),
      },
    ],
  };
}

/**
 * Maps a Chart.js element hover event to the corresponding item index in activeItems.
 */
export function resolveDoughnutHoverIndex(
  elements: Array<{ datasetIndex: number; index: number }>,
  split = false
): number {
  if (!elements || elements.length === 0) return -1;
  return split ? Math.floor(elements[0].index / 2) : elements[0].index;
}
