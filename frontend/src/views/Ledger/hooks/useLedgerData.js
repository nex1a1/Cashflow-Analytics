import { useMemo, useState, useEffect } from 'react';

function compareByAmount(a, b, direction) {
  const valA = Number.parseFloat(a.amount) || 0;
  const valB = Number.parseFloat(b.amount) || 0;
  if (valA === valB) return 0;
  return direction === 'asc' ? valA - valB : valB - valA;
}

function compareByCategory(a, b, direction) {
  const valA = a.category || '';
  const valB = b.category || '';
  if (valA === valB) return 0;
  const res = valA.localeCompare(valB);
  return direction === 'asc' ? res : -res;
}

function compareByDate(a, b, sortConfig) {
  const valA = a.date.split('/').reverse().join('');
  const valB = b.date.split('/').reverse().join('');
  if (valA === valB) return 0;
  const res = valA.localeCompare(valB);
  const dir = sortConfig.key === 'date' ? sortConfig.direction : 'asc';
  return dir === 'asc' ? res : -res;
}

function compareByGroup(a, b, direction, categories = [], cashflowGroups = []) {
  let nameA = a.group_name;
  let nameB = b.group_name;
  let orderA = 999;
  let orderB = 999;

  if (!nameA || !nameB) {
    const catA = categories.find(c => c.id === a.category_id || c.name === a.category);
    const catB = categories.find(c => c.id === b.category_id || c.name === b.category);
    const grpIdA = catA?.cashflow_group_id || catA?.cashflowGroup;
    const grpIdB = catB?.cashflow_group_id || catB?.cashflowGroup;
    const grpA = cashflowGroups.find(g => g.id === grpIdA);
    const grpB = cashflowGroups.find(g => g.id === grpIdB);
    nameA = nameA || grpA?.name || '';
    nameB = nameB || grpB?.name || '';
    orderA = grpA?.order_index ?? 999;
    orderB = grpB?.order_index ?? 999;
  } else {
    const grpA = cashflowGroups.find(g => g.name === nameA);
    const grpB = cashflowGroups.find(g => g.name === nameB);
    orderA = grpA?.order_index ?? 999;
    orderB = grpB?.order_index ?? 999;
  }

  if (orderA !== orderB) {
    return direction === 'asc' ? orderA - orderB : orderB - orderA;
  }
  const res = nameA.localeCompare(nameB);
  return direction === 'asc' ? res : -res;
}

function comparePrimary(a, b, sortConfig, categories, cashflowGroups) {
  if (sortConfig.key === 'amount') return compareByAmount(a, b, sortConfig.direction);
  if (sortConfig.key === 'category') return compareByCategory(a, b, sortConfig.direction);
  if (sortConfig.key === 'group') return compareByGroup(a, b, sortConfig.direction, categories, cashflowGroups);
  return compareByDate(a, b, sortConfig);
}

function compareHierarchyOrder(a, b, groupOrderMap, catOrderMap) {
  const groupAOrder = groupOrderMap[a.cashflow_group_id] ?? 999;
  const groupBOrder = groupOrderMap[b.cashflow_group_id] ?? 999;
  if (groupAOrder !== groupBOrder) return groupAOrder - groupBOrder;

  const catAOrder = catOrderMap[a.category_id] ?? 999;
  const catBOrder = catOrderMap[b.category_id] ?? 999;
  if (catAOrder !== catBOrder) return catAOrder - catBOrder;

  const amtA = Number.parseFloat(a.amount) || 0;
  const amtB = Number.parseFloat(b.amount) || 0;
  return amtB - amtA;
}

function compareTransactions(a, b, sortConfig, groupOrderMap, catOrderMap, categories, cashflowGroups) {
  const primaryDiff = comparePrimary(a, b, sortConfig, categories, cashflowGroups);
  if (primaryDiff !== 0) return primaryDiff;
  return compareHierarchyOrder(a, b, groupOrderMap, catOrderMap);
}

export function useLedgerData(displayTransactions, filterPeriod, searchQuery, filters = {}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });

  // Map for fast lookup of order_index
  const catOrderMap = useMemo(() => {
    const map = {};
    (filters.categories || []).forEach(c => { map[c.id] = c.order_index || 0; });
    return map;
  }, [filters.categories]);

  const groupOrderMap = useMemo(() => {
    const map = {};
    (filters.cashflowGroups || []).forEach(g => { map[g.id] = g.order_index || 0; });
    return map;
  }, [filters.cashflowGroups]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const sortedTransactions = useMemo(() => {
    return [...displayTransactions].sort((a, b) =>
      compareTransactions(a, b, sortConfig, groupOrderMap, catOrderMap, filters.categories, filters.cashflowGroups)
    );
  }, [displayTransactions, sortConfig, catOrderMap, groupOrderMap, filters.categories, filters.cashflowGroups]);

  const pages = useMemo(() => {
    const result = [];
    let curPage = [];
    const TARGET = 50;
    const groups = [];
    let curGroup = [], curDate = null;

    if (sortConfig.key && sortConfig.key !== 'date') {
      for (let i = 0; i < sortedTransactions.length; i += TARGET) {
        result.push(sortedTransactions.slice(i, i + TARGET));
      }
      return result;
    }

    sortedTransactions.forEach(t => {
      if (t.date !== curDate) {
        if (curGroup.length > 0) groups.push(curGroup);
        curGroup = [t]; curDate = t.date;
      } else curGroup.push(t);
    });
    if (curGroup.length > 0) groups.push(curGroup);
    groups.forEach(grp => {
      if (curPage.length + grp.length > TARGET && curPage.length > 0) { result.push(curPage); curPage = [...grp]; }
      else curPage.push(...grp);
    });
    if (curPage.length > 0) result.push(curPage);
    return result;
  }, [sortedTransactions, sortConfig]);

  const dateBands = useMemo(() => {
    const bands = {};
    let currentBand = 0;
    let lastDate = null;
    sortedTransactions.forEach(t => {
      if (t.date !== lastDate) { currentBand = 1 - currentBand; lastDate = t.date; }
      bands[t.id] = currentBand;
    });
    return bands;
  }, [sortedTransactions]);

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
    dateBands,
    isDateSorted: !sortConfig.key || sortConfig.key === 'date'
  };
}