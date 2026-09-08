// src/views/Dashboard/components/ExpenseProportion/proportionHelpers.ts
import {
  AllocationItemData,
  GroupCategoryItemData,
  GroupItemData,
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
    if (sortMode === 'order-desc') {
      return (orderB - orderA) || (b.amount - a.amount);
    }
    return b.amount - a.amount;
  });
}

interface OuterCategoryWithGroup extends GroupCategoryItemData {
  groupIdx: number;
  groupColor: string;
}

/**
 * Generates Chart.js data object for the Doughnut chart.
 */
export function buildDoughnutChartData(
  activeItems: ProportionItem[],
  isGroupMode: boolean,
  hoveredIdx: number
) {
  if (isGroupMode) {
    const groupItems = activeItems as GroupItemData[];
    const outerCategories: OuterCategoryWithGroup[] = [];
    
    groupItems.forEach((group, gIdx) => {
      (group.categories || []).forEach((cat) => {
        outerCategories.push({
          ...cat,
          groupIdx: gIdx,
          groupColor: group.color,
        });
      });
    });

    const outerData = outerCategories.map(c => c.amount);
    const outerColors = outerCategories.map(c => {
      if (hoveredIdx === -1 || hoveredIdx === c.groupIdx) {
        return c.color || c.groupColor;
      }
      return `${c.color || c.groupColor}35`;
    });
    const outerBorders = outerCategories.map(c => (hoveredIdx === c.groupIdx ? '#da291c' : '#181818'));
    const outerBorderWidths = outerCategories.map(c => (hoveredIdx === c.groupIdx ? 2 : 1));

    const innerData = groupItems.map(g => g.amount);
    const innerColors = groupItems.map((g, idx) => {
      if (hoveredIdx === -1 || hoveredIdx === idx) {
        return g.color;
      }
      return `${g.color}40`;
    });
    const innerBorders = groupItems.map((_, idx) => (hoveredIdx === idx ? '#da291c' : '#181818'));
    const innerBorderWidths = groupItems.map((_, idx) => (hoveredIdx === idx ? 2 : 1));

    return {
      labels: [
        ...outerCategories.map(c => `${c.name} (${c.relativePercentage}%)`),
        ...groupItems.map(g => g.name),
      ],
      datasets: [
        {
          label: 'หมวดหมู่ย่อย (Outer)',
          data: outerData,
          backgroundColor: outerColors,
          borderColor: outerBorders,
          borderWidth: outerBorderWidths,
          spacing: 0,
          offset: 3,
          weight: 0.85,
        },
        {
          label: 'กลุ่มรายจ่าย (Inner)',
          data: innerData,
          backgroundColor: innerColors,
          borderColor: innerBorders,
          borderWidth: innerBorderWidths,
          spacing: 0,
          offset: 0,
          weight: 1.15,
        },
      ],
    };
  }

  return {
    labels: activeItems.map(i => i.name),
    datasets: [
      {
        label: 'สัดส่วนรายจ่าย',
        data: activeItems.map(i => i.amount),
        backgroundColor: activeItems.map((i, idx) => {
          if (hoveredIdx === -1 || hoveredIdx === idx) {
            return i.color;
          }
          return `${i.color}40`;
        }),
        borderWidth: activeItems.map((_, idx) => (hoveredIdx === idx ? 3 : 2)),
        borderColor: activeItems.map((_, idx) => {
          if (hoveredIdx === idx) return '#da291c';
          return '#303030';
        }),
      },
    ],
  };
}

/**
 * Maps a Chart.js element hover event to the corresponding item index in activeItems.
 */
export function resolveDoughnutHoverIndex(
  elements: Array<{ datasetIndex: number; index: number }>,
  isGroupMode: boolean,
  activeItems: ProportionItem[]
): number {
  if (!elements || elements.length === 0) return -1;
  const el = elements[0];
  if (isGroupMode && el.datasetIndex === 0) {
    let count = 0;
    const groupItems = activeItems as GroupItemData[];
    for (let gIdx = 0; gIdx < groupItems.length; gIdx++) {
      count += (groupItems[gIdx].categories || []).length;
      if (el.index < count) {
        return gIdx;
      }
    }
  }
  return el.index;
}
