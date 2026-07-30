import { useMemo, useState, useEffect } from 'react';

export function useLedgerData(displayTransactions, filterPeriod, searchQuery, filters = {}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

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
    return [...displayTransactions].sort((a, b) => {
      // 1. Primary Sort: Manual Selection or Date (Default)
      if (sortConfig.key === 'amount') {
        const valA = parseFloat(a.amount) || 0;
        const valB = parseFloat(b.amount) || 0;
        if (valA !== valB) return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      } else if (sortConfig.key === 'category') {
        const valA = a.category || '';
        const valB = b.category || '';
        if (valA !== valB) {
          const res = valA.localeCompare(valB);
          return sortConfig.direction === 'asc' ? res : -res;
        }
      } else {
        // Default Primary Sort: Date (YYYYMMDD) - Ascending (1 to 31)
        const valA = a.date.split('/').reverse().join('');
        const valB = b.date.split('/').reverse().join('');
        if (valA !== valB) {
          const res = valA.localeCompare(valB);
          const dir = (sortConfig.key === 'date') ? sortConfig.direction : 'asc';
          return dir === 'asc' ? res : -res;
        }
      }

      // 2. Secondary Sort: Group Order Index (from Settings)
      const groupAOrder = groupOrderMap[a.cashflow_group_id] ?? 999;
      const groupBOrder = groupOrderMap[b.cashflow_group_id] ?? 999;
      if (groupAOrder !== groupBOrder) return groupAOrder - groupBOrder;

      // 3. Tertiary Sort: Category Order Index (from Settings)
      const catAOrder = catOrderMap[a.category_id] ?? 999;
      const catBOrder = catOrderMap[b.category_id] ?? 999;
      if (catAOrder !== catBOrder) return catAOrder - catBOrder;

      // 4. Final Tie-breaker: Amount (Highest to Lowest)
      const amtA = parseFloat(a.amount) || 0;
      const amtB = parseFloat(b.amount) || 0;
      return amtB - amtA;
    });
  }, [displayTransactions, sortConfig, catOrderMap, groupOrderMap]);

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