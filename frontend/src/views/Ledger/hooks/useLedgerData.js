import { useMemo, useState, useEffect } from 'react';

export function useLedgerData(displayTransactions, filterPeriod, searchQuery, filters = {}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const sortedTransactions = useMemo(() => {
    if (!sortConfig.key) return displayTransactions;
    return [...displayTransactions].sort((a, b) => {
      let valA, valB;
      if (sortConfig.key === 'amount') {
        valA = parseFloat(a.amount) || 0;
        valB = parseFloat(b.amount) || 0;
      } else if (sortConfig.key === 'category') {
        valA = a.category || '';
        valB = b.category || '';
      } else if (sortConfig.key === 'date') {
        valA = a.date.split('/').reverse().join('');
        valB = b.date.split('/').reverse().join('');
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [displayTransactions, sortConfig]);

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
    filters.advancedFilterDate, filters.typeFilter, 
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