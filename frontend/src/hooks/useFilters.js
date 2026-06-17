// src/hooks/useFilters.js
import { useState, useEffect, useMemo, useRef } from 'react';
import { isDateInFilter, parseDateStrToObj, generateDatesForPeriod } from '../utils/dateHelpers';
import { transactionService } from '../services/api';

export default function useFilters({ transactions, categories, masterPeriods = [] }) {
  // ── Period ───────────────────────────────────────────────────
  const [filterPeriod, setFilterPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  // ── Advanced filters (LedgerView) ───────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [advancedFilterCategory, setAdvancedFilterCategory] = useState('ALL');
  const [advancedFilterGroup, setAdvancedFilterGroup] = useState('ALL');
  const [advancedFilterDate, setAdvancedFilterDate] = useState('ALL');
  
  // NEW filters
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, INCOME, EXPENSE
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [dayTypeFilter, setDayTypeFilter] = useState('ALL'); // ALL, WEEKDAY, WEEKEND
  const [allocationFilter, setAllocationFilter] = useState('ALL'); // ALL, need, want, savings

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // State to hold FTS5 search results from database
  const [searchResults, setSearchResults] = useState([]);

  // Fetch FTS5 search results from backend when debouncedSearch is active
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([]);
      return;
    }
    
    let active = true;
    transactionService.search(debouncedSearch.trim())
      .then(results => {
        if (active) {
          setSearchResults(results);
        }
      })
      .catch(err => {
        console.error('Failed to search using FTS5:', err);
      });
      
    return () => {
      active = false;
    };
  }, [debouncedSearch]);

  // reset filters when period changes
  useEffect(() => { 
    setAdvancedFilterDate('ALL'); 
  }, [filterPeriod]);

  const clearFilters = () => {
    setSearchQuery('');
    setAdvancedFilterCategory('ALL');
    setAdvancedFilterGroup('ALL');
    setAdvancedFilterDate('ALL');
    setTypeFilter('ALL');
    setAllocationFilter('ALL');
    setMinAmount('');
    setMaxAmount('');
    setDayTypeFilter('ALL');
  };

  // ── Period picker options (Using Master List from DB) ────────
  const groupedOptions = useMemo(() => {
    const yearsMap = {};
    masterPeriods.forEach(periodStr => { // periodStr is YYYY-MM
      const [y, mStr] = periodStr.split('-');
      const m = parseInt(mStr, 10);
      
      if (!yearsMap[y]) yearsMap[y] = { months: new Set(), quarters: new Set(), halves: new Set() };
      yearsMap[y].months.add(periodStr);
      if (m >= 1  && m <= 3)  yearsMap[y].quarters.add(`${y}-Q1`);
      if (m >= 4  && m <= 6)  yearsMap[y].quarters.add(`${y}-Q2`);
      if (m >= 7  && m <= 9)  yearsMap[y].quarters.add(`${y}-Q3`);
      if (m >= 10 && m <= 12) yearsMap[y].quarters.add(`${y}-Q4`);
      if (m >= 1  && m <= 6)  yearsMap[y].halves.add(`${y}-H1`);
      if (m >= 7  && m <= 12) yearsMap[y].halves.add(`${y}-H2`);
    });
    return { yearsMap, sortedYears: Object.keys(yearsMap).sort().reverse() };
  }, [masterPeriods]);

  // ── เดือนที่มีข้อมูล (Master List) ──
  const rawAvailableMonths = useMemo(() => {
    return [...masterPeriods].sort().reverse();
  }, [masterPeriods]);

  // ── Derived booleans ─────────────────────────────────────────
  // true = เลือกดูหลายเดือน (ไม่ใช่เดือนเดียว) → Enforced only in components that require single-month context (like Calendar)
  const isReadOnlyView = !filterPeriod.match(/^\d{4}-\d{2}$/);

  // ── Dates ที่มีใน period ปัจจุบัน (ใช้ใน LedgerView filter) ──
  const availableDatesInPeriod = useMemo(() => {
    const dates = new Set(
      transactions
        .filter(t => isDateInFilter(t.date, filterPeriod))
        .map(t => t.date),
    );
    return Array.from(dates).sort((a, b) => parseDateStrToObj(a) - parseDateStrToObj(b));
  }, [transactions, filterPeriod]);

  // ── All Dates ใน period (ใช้ใน Horizontal Ledger เพื่อโชว์วันที่ไม่มีรายการ) ──
  const allDatesInPeriod = useMemo(() => {
    return generateDatesForPeriod(filterPeriod, transactions);
  }, [transactions, filterPeriod]);

  // ── Cashflow group IDs ที่มีข้อมูลจริงใน period ปัจจุบัน ────
  // ใช้ใน LedgerView เพื่อซ่อน option ที่ไม่มีรายการ
  const activeCashflowGroupIds = useMemo(() => {
    const ids = new Set();
    transactions
      .filter(t => isDateInFilter(t.date, filterPeriod))
      .forEach(t => {
        const cat = categories.find(c => c.id === t.category_id) || categories.find(c => c.name === t.category);
        if (cat?.cashflowGroup) ids.add(cat.cashflowGroup);
      });
    return ids;
  }, [transactions, filterPeriod, categories]);

  // ── Category names ที่มีข้อมูลจริงใน period ปัจจุบัน ────
  // ใช้ใน LedgerView เพื่อซ่อน option ที่ไม่มีรายการ
  const activeCategoryNames = useMemo(() => {
    const names = new Set();
    transactions
      .filter(t => isDateInFilter(t.date, filterPeriod))
      .forEach(t => {
        const cat = categories.find(c => c.id === t.category_id) || categories.find(c => c.name === t.category);
        if (cat) {
          names.add(cat.name);
        } else if (t.category) {
          names.add(t.category);
        }
      });
    return names;
  }, [transactions, filterPeriod, categories]);

  // ── displayTransactions: filtered list สำหรับ LedgerView ────
  const displayTransactions = useMemo(() => {
    // Start with FTS5 search results if search query is active, otherwise use all transactions
    const baseTransactions = debouncedSearch.trim() ? searchResults : transactions;
    let filtered = baseTransactions.filter(t => isDateInFilter(t.date, filterPeriod));

    // Helper: Find accurate category object even during optimistic updates
    const getCat = (t) => categories.find(c => c.id === t.category_id) || categories.find(c => c.name === t.category);

    // 1. Type Filter (Income/Expense/Savings)
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(t => {
        const cat = getCat(t);
        if (typeFilter === 'INCOME') return cat?.type === 'income';
        if (typeFilter === 'EXPENSE') return cat?.type === 'expense';
        if (typeFilter === 'SAVINGS') return cat?.type === 'savings';
        return true;
      });
    }

    // 2. Date Filter
    if (advancedFilterDate !== 'ALL') {
      filtered = filtered.filter(t => t.date === advancedFilterDate);
    }

    // 3. Category Filter
    if (advancedFilterCategory !== 'ALL') {
      filtered = filtered.filter(t => {
        const cat = getCat(t);
        return (cat?.name || t.category) === advancedFilterCategory;
      });
    }

    // 4. Group Filter (Strictly Custom Group IDs)
    if (advancedFilterGroup !== 'ALL') {
      filtered = filtered.filter(t => {
        const cat = getCat(t);
        return cat?.cashflowGroup === advancedFilterGroup;
      });
    }

    // 5. Amount Range Filter
    const min = parseFloat(minAmount);
    const max = parseFloat(maxAmount);
    if (!isNaN(min)) filtered = filtered.filter(t => Math.abs(t.amount) >= min);
    if (!isNaN(max)) filtered = filtered.filter(t => Math.abs(t.amount) <= max);

    // 6. Day Type (Weekend/Weekday) Filter
    if (dayTypeFilter !== 'ALL') {
      filtered = filtered.filter(t => {
        const day = new Date(t.date).getDay();
        const isWeekend = (day === 0 || day === 6);
        return dayTypeFilter === 'WEEKEND' ? isWeekend : !isWeekend;
      });
    }

    // 6.5 Allocation Filter (Need/Want/Savings)
    if (allocationFilter !== 'ALL') {
      filtered = filtered.filter(t => {
        const cat = getCat(t);
        if (cat?.type === 'income') return false; // Income transactions do not have Need/Want/Save allocation types in UI
        const aType = t.allocation_type || 'want';
        return aType === allocationFilter;
      });
    }

    return filtered;
  }, [transactions, searchResults, filterPeriod, debouncedSearch, advancedFilterCategory, advancedFilterGroup, advancedFilterDate, typeFilter, allocationFilter, minAmount, maxAmount, dayTypeFilter, categories]);

  const isFilterActive = searchQuery || 
    advancedFilterDate !== 'ALL' || 
    advancedFilterGroup !== 'ALL' || 
    advancedFilterCategory !== 'ALL' || 
    typeFilter !== 'ALL' || 
    allocationFilter !== 'ALL' || 
    minAmount || 
    maxAmount || 
    dayTypeFilter !== 'ALL';

  return {
    // period
    filterPeriod,
    setFilterPeriod,
    groupedOptions,
    rawAvailableMonths,
    isReadOnlyView,
    // advanced filters
    searchQuery,          setSearchQuery,
    advancedFilterCategory, setAdvancedFilterCategory,
    advancedFilterGroup,    setAdvancedFilterGroup,
    advancedFilterDate,     setAdvancedFilterDate,
    typeFilter,             setTypeFilter,
    allocationFilter,       setAllocationFilter,
    minAmount,              setMinAmount,
    maxAmount,              setMaxAmount,
    dayTypeFilter,          setDayTypeFilter,
    // computed
    availableDatesInPeriod,
    allDatesInPeriod,
    displayTransactions,
    activeCashflowGroupIds,
    activeCategoryNames,
    isFilterActive,
    clearFilters
  };
}
