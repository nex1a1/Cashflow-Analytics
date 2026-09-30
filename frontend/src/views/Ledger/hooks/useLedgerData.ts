import { useMemo, useState, useEffect } from 'react';
import { TransactionDisplay, Category, CashflowGroup } from '../../../types';

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface FilterOptions {
  categories?: Category[];
  cashflowGroups?: CashflowGroup[];
  advancedFilterCategory?: string | string[];
  advancedFilterGroup?: string;
  advancedFilterDate?: string;
  typeFilter?: string;
  allocationFilter?: string;
  minAmount?: string;
  maxAmount?: string;
  dayTypeFilter?: string;
}

function compareByAmount(a: TransactionDisplay, b: TransactionDisplay, direction: 'asc' | 'desc') {
  const valA = Number.parseFloat(a.amount as any) || 0;
  const valB = Number.parseFloat(b.amount as any) || 0;
  if (valA === valB) return 0;
  return direction === 'asc' ? valA - valB : valB - valA;
}

function compareByCategory(a: TransactionDisplay, b: TransactionDisplay, direction: 'asc' | 'desc') {
  const valA = a.category || '';
  const valB = b.category || '';
  if (valA === valB) return 0;
  const res = valA.localeCompare(valB);
  return direction === 'asc' ? res : -res;
}

export function normalizeDateForSort(d: string): string {
  if (!d) return '';
  if (d.includes('-')) return d.replace(/-/g, '');
  const parts = d.split('/');
  if (parts.length === 3) return `${parts[2]}${parts[1]}${parts[0]}`;
  return d;
}

function compareByDate(a: TransactionDisplay, b: TransactionDisplay, sortConfig: SortConfig) {
  const valA = normalizeDateForSort(a.date);
  const valB = normalizeDateForSort(b.date);
  if (valA === valB) return 0;
  const res = valA.localeCompare(valB);
  const dir = sortConfig.key === 'date' ? sortConfig.direction : 'asc';
  return dir === 'asc' ? res : -res;
}

interface CategoryGroupMeta {
  groupName: string;
  orderIndex: number;
}

function comparePrimary(a: TransactionDisplay, b: TransactionDisplay, sortConfig: SortConfig, catGroupLookup: Record<string, CategoryGroupMeta>) {
  if (sortConfig.key === 'amount') return compareByAmount(a, b, sortConfig.direction);
  if (sortConfig.key === 'category') return compareByCategory(a, b, sortConfig.direction);
  return compareByDate(a, b, sortConfig);
}

function compareHierarchyOrder(a: TransactionDisplay, b: TransactionDisplay, groupOrderMap: Record<string, number>, catOrderMap: Record<string, number>, catGroupLookup: Record<string, CategoryGroupMeta>) {
  const groupAOrder = groupOrderMap[(a as any).cashflow_group_id] ?? (a.category_id ? catGroupLookup[a.category_id]?.orderIndex : undefined) ?? 999;
  const groupBOrder = groupOrderMap[(b as any).cashflow_group_id] ?? (b.category_id ? catGroupLookup[b.category_id]?.orderIndex : undefined) ?? 999;
  if (groupAOrder !== groupBOrder) return groupAOrder - groupBOrder;

  const catAOrder = (a.category_id ? catOrderMap[a.category_id] : undefined) ?? 999;
  const catBOrder = (b.category_id ? catOrderMap[b.category_id] : undefined) ?? 999;
  if (catAOrder !== catBOrder) return catAOrder - catBOrder;

  const amtA = Number.parseFloat(a.amount as any) || 0;
  const amtB = Number.parseFloat(b.amount as any) || 0;
  return amtB - amtA;
}

export function compareTransactions(a: TransactionDisplay, b: TransactionDisplay, sortConfig: SortConfig, groupOrderMap: Record<string, number>, catOrderMap: Record<string, number>, catGroupLookup: Record<string, CategoryGroupMeta>) {
  const primaryDiff = comparePrimary(a, b, sortConfig, catGroupLookup);
  if (primaryDiff !== 0) return primaryDiff;
  return compareHierarchyOrder(a, b, groupOrderMap, catOrderMap, catGroupLookup);
}

const PAGE_SIZE = 50;

/**
 * Splits sorted rows into pages of ~PAGE_SIZE. When sorted by date a day's rows are never split
 * across pages (a page may run over PAGE_SIZE for a busy day); other sorts cut at exactly PAGE_SIZE.
 */
export function paginateTransactions(sorted: TransactionDisplay[], sortKey: string, pageSize = PAGE_SIZE): TransactionDisplay[][] {
  const pages: TransactionDisplay[][] = [];
  if (sortKey && sortKey !== 'date') {
    for (let i = 0; i < sorted.length; i += pageSize) pages.push(sorted.slice(i, i + pageSize));
    return pages;
  }

  const days: TransactionDisplay[][] = [];
  sorted.forEach((t, i) => {
    if (i > 0 && t.date === sorted[i - 1].date) days[days.length - 1].push(t);
    else days.push([t]);
  });

  let page: TransactionDisplay[] = [];
  days.forEach(day => {
    if (page.length > 0 && page.length + day.length > pageSize) { pages.push(page); page = []; }
    page.push(...day);
  });
  if (page.length > 0) pages.push(page);
  return pages;
}

export function useLedgerData(displayTransactions: TransactionDisplay[], filterPeriod: string, searchQuery: string, filters: FilterOptions = {}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: 'asc' });

  // Map for fast lookup of order_index
  const catOrderMap = useMemo(() => {
    const map: Record<string, number> = {};
    (filters.categories || []).forEach(c => { map[c.id] = c.order_index || 0; });
    return map;
  }, [filters.categories]);

  const groupOrderMap = useMemo(() => {
    const map: Record<string, number> = {};
    (filters.cashflowGroups || []).forEach(g => { map[g.id] = g.order_index || 0; });
    return map;
  }, [filters.cashflowGroups]);

  const catGroupLookup = useMemo(() => {
    const map: Record<string, CategoryGroupMeta> = {};
    const groupDict: Record<string, CashflowGroup> = {};
    (filters.cashflowGroups || []).forEach(g => { groupDict[g.id] = g; });
    (filters.categories || []).forEach(c => {
      const gId = c.cashflow_group_id || (c as any).cashflowGroup;
      const grp = gId ? groupDict[gId] : undefined;
      const meta: CategoryGroupMeta = {
        groupName: grp?.name || '',
        orderIndex: grp?.order_index ?? 999
      };
      if (c.id) map[c.id] = meta;
      if (c.name) map[c.name] = meta;
    });
    return map;
  }, [filters.categories, filters.cashflowGroups]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const sortedTransactions = useMemo(() => {
    return [...displayTransactions].sort((a, b) =>
      compareTransactions(a, b, sortConfig, groupOrderMap, catOrderMap, catGroupLookup)
    );
  }, [displayTransactions, sortConfig, catOrderMap, groupOrderMap, catGroupLookup]);

  const pages = useMemo(
    () => paginateTransactions(sortedTransactions, sortConfig.key),
    [sortedTransactions, sortConfig.key]
  );

  useEffect(() => { 
    setCurrentPage(1); 
  }, [
    filterPeriod, searchQuery, sortConfig,
    filters.advancedFilterCategory, filters.advancedFilterGroup, 
    filters.advancedFilterDate, filters.typeFilter, filters.allocationFilter,
    filters.minAmount, filters.maxAmount, filters.dayTypeFilter
  ]);

  useEffect(() => { 
    if (pages.length > 0 && currentPage > pages.length) setCurrentPage(pages.length); 
  }, [pages.length, currentPage]);

  return {
    sortedTransactions,
    pages,
    currentPage,
    setCurrentPage,
    sortConfig,
    handleSort,
    isDateSorted: !sortConfig.key || sortConfig.key === 'date'
  };
}
