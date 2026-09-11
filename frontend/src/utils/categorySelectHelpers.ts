// frontend/src/utils/categorySelectHelpers.ts
import { Category, CashflowGroup, GroupType, TransactionDisplay } from '../types';

export interface GroupedCategoryList {
  id: string;
  name: string;
  order: number;
  color?: string | null;
  icon?: string | null;
  categories: Category[];
}

export interface FilterCategoriesOptions {
  categories: Category[];
  cashflowGroups?: CashflowGroup[];
  type?: GroupType | string;
  searchQuery?: string;
  selectedGroupId?: string | null;
}

/**
 * Filter and group categories by CashflowGroup with support for:
 * 1. Type filtering (income / expense / savings)
 * 2. Search query matching category name or group name
 * 3. Specific cashflow group filtering (Group Filter Ribbon)
 */
export function filterAndGroupCategories({
  categories = [],
  cashflowGroups = [],
  type,
  searchQuery = '',
  selectedGroupId = null
}: FilterCategoriesOptions): GroupedCategoryList[] {
  // 1. Group lookup map
  const groupLookup = cashflowGroups.reduce<Record<string, CashflowGroup>>((acc, g) => {
    acc[g.id] = g;
    return acc;
  }, {});

  // 2. Type filtering
  let relevant = categories;
  if (type && type !== 'all') {
    relevant = relevant.filter(c => c.type === type);
  }

  // 3. Cashflow group filtering (Ribbon chip)
  if (selectedGroupId && selectedGroupId !== 'ALL') {
    relevant = relevant.filter(c => {
      const gId = c.cashflowGroup || c.cashflow_group_id || 'other';
      return gId === selectedGroupId;
    });
  }

  // 4. Search query filtering
  const q = searchQuery.trim().toLowerCase();
  if (q) {
    relevant = relevant.filter(c => {
      const gId = c.cashflowGroup || c.cashflow_group_id || 'other';
      const gName = groupLookup[gId]?.name?.toLowerCase() || '';
      const cName = (c.name || '').toLowerCase();
      return cName.includes(q) || gName.includes(q);
    });
  }

  // 5. Group by cashflow group
  const groups: Record<string, GroupedCategoryList> = {};
  relevant.forEach(c => {
    const gId = c.cashflowGroup || c.cashflow_group_id || 'other';
    const gObj = groupLookup[gId];
    const gName = gObj?.name || 'ทั่วไป / อื่นๆ';
    const gOrder = gObj?.order_index ?? 999;
    const gColor = gObj?.color ?? null;
    const gIcon = gObj?.icon ?? null;

    if (!groups[gId]) {
      groups[gId] = {
        id: gId,
        name: gName,
        order: gOrder,
        color: gColor,
        icon: gIcon,
        categories: []
      };
    }
    groups[gId].categories.push(c);
  });

  // 6. Sort groups by order_index and categories by order_index
  return Object.values(groups)
    .sort((a, b) => a.order - b.order)
    .map(g => ({
      ...g,
      categories: [...g.categories].sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999))
    }));
}

/**
 * Derives top frequent categories for a given type from recent transactions
 */
export function getTopCategoriesFromTransactions(
  transactions: TransactionDisplay[] = [],
  categories: Category[] = [],
  type: GroupType | string = 'expense',
  limit: number = 6
): Category[] {
  const catMap = categories.reduce<Record<string, Category>>((acc, c) => {
    acc[c.id] = c;
    acc[c.name] = c;
    return acc;
  }, {});

  const counts: Record<string, number> = {};
  transactions.forEach(t => {
    const cat = (t.category_id && catMap[t.category_id]) || (t.category && catMap[t.category]);
    if (cat && (!type || cat.type === type)) {
      counts[cat.id] = (counts[cat.id] || 0) + 1;
    }
  });

  const sortedCatIds = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  const result: Category[] = [];
  for (const id of sortedCatIds) {
    if (catMap[id] && !result.some(c => c.id === id)) {
      result.push(catMap[id]);
      if (result.length >= limit) break;
    }
  }

  return result;
}
