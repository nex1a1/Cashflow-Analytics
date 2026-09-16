// src/views/Dashboard/components/CashflowTable/useFilteredMaps.ts
import { useMemo } from 'react';
import { CashflowGroup, Category, TransactionDisplay } from '@/types';
import { Analytics, MonthlyMap, MonthRow } from './types';

interface UseFilteredMapsParams {
  transactions: TransactionDisplay[];
  categories: Category[];
  cashflowGroups: CashflowGroup[];
  excludedAllocations: Set<string>;
  analytics: Analytics | undefined;
}

/** Transaction-level allocation aggregation engine — recomputes per-category/per-group monthly
 *  totals directly from raw transactions whenever a NEED/WANT/SAVINGS allocation is excluded,
 *  since analytics.monthlyCatMap has no concept of allocation filtering. */
export function useFilteredMaps({
  transactions,
  categories,
  cashflowGroups,
  excludedAllocations,
  analytics,
}: UseFilteredMapsParams): { filteredCatMap: MonthlyMap; filteredGroupMap: MonthlyMap } {
  return useMemo<{ filteredCatMap: MonthlyMap; filteredGroupMap: MonthlyMap }>(() => {
    const catMap: MonthlyMap = {};
    const groupMap: MonthlyMap = {};

    if (excludedAllocations.size === 0) return { filteredCatMap: catMap, filteredGroupMap: groupMap };

    const allMonths: string[] = (analytics?.sortedCashflow || []).map((r: MonthRow) => r.monthStr);
    categories.forEach((c) => {
      catMap[c.id] = {};
      allMonths.forEach((ym: string) => { catMap[c.id][ym] = 0; });
    });
    cashflowGroups.forEach((g) => {
      groupMap[g.id] = {};
      allMonths.forEach((ym: string) => { groupMap[g.id][ym] = 0; });
    });

    if (!transactions || transactions.length === 0) return { filteredCatMap: catMap, filteredGroupMap: groupMap };

    const catLookup: Record<string, Category> = {};
    categories.forEach((c) => {
      catLookup[c.id] = c;
      catLookup[String(c.id)] = c;
    });

    const groupLookup: Record<string, CashflowGroup> = {};
    cashflowGroups.forEach((g) => {
      groupLookup[g.id] = g;
      groupLookup[String(g.id)] = g;
    });

    transactions.forEach((t) => {
      if ((t as { is_deleted?: boolean }).is_deleted) return;

      const catId = (t as { category_id?: string; categoryId?: string }).category_id ??
        (t as { categoryId?: string }).categoryId;
      if (!catId) return;
      const catObj = catLookup[catId];
      const groupId = catObj?.cashflowGroup ?? catObj?.cashflow_group_id;
      if (!groupId) return;
      const groupObj = groupLookup[groupId];
      const isIncome = groupObj?.type === 'income';

      // Allocation filters apply ONLY to expenses, not income
      if (!isIncome) {
        const tAlloc: string =
          (t as { allocation_type?: string }).allocation_type ??
          (t as { allocationType?: string }).allocationType ??
          catObj?.allocation_type ??
          groupObj?.allocation_type ??
          'want';
        if (excludedAllocations.has(tAlloc)) return;
      }

      const dateStr = (t as { date?: string }).date;
      if (!dateStr) return;
      const ym = dateStr.substring(0, 7);
      const amt = (t as { amount?: number }).amount || 0;

      if (catMap[catId]?.[ym] !== undefined) catMap[catId][ym] += amt;
      if (groupId && groupMap[groupId]?.[ym] !== undefined) groupMap[groupId][ym] += amt;
    });

    return { filteredCatMap: catMap, filteredGroupMap: groupMap };
  }, [transactions, categories, cashflowGroups, excludedAllocations, analytics?.sortedCashflow]);
}
