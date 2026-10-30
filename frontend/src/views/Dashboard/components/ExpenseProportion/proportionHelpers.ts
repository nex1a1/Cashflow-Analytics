// src/views/Dashboard/components/ExpenseProportion/proportionHelpers.ts
import {
  AllocationItemData,
  ProportionItem,
  SortMode,
} from './types';

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

