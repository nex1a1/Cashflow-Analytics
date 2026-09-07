// src/hooks/useFilters.ts
import { useState, useEffect, useMemo } from 'react';
import { isDateInFilter, parseDateStrToObj, generateDatesForPeriod } from '../utils/dateHelpers';
import { transactionService } from '../services/api';
import { Category, GroupedOptions, GroupedPeriodOption, TransactionDisplay } from '../types';

export interface UseFiltersProps {
  transactions: TransactionDisplay[];
  categories: Category[];
  masterPeriods?: string[];
  excludeFuture?: boolean;
}

export default function useFilters({
  transactions,
  categories,
  masterPeriods = [],
  excludeFuture = false
}: UseFiltersProps) {
  // ── Period ───────────────────────────────────────────────────
  const [filterPeriod, setFilterPeriod] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  // ── Advanced filters (LedgerView) ───────────────────────────
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [advancedFilterCategory, setAdvancedFilterCategory] = useState<string | string[]>('ALL');
  const [advancedFilterGroup, setAdvancedFilterGroup] = useState<string>('ALL');
  const [advancedFilterDate, setAdvancedFilterDate] = useState<string>('ALL');

  // NEW filters
  const [typeFilter, setTypeFilter] = useState<string>('ALL'); // ALL, INCOME, EXPENSE
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [dayTypeFilter, setDayTypeFilter] = useState<string>('ALL'); // ALL, WEEKDAY, WEEKEND
  const [allocationFilter, setAllocationFilter] = useState<string>('ALL'); // ALL, need, want, savings

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // State to hold FTS5 search results from database
  const [searchResults, setSearchResults] = useState<TransactionDisplay[]>([]);

  // Fetch FTS5 search results from backend when debouncedSearch is active
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([]);
      return;
    }

    let active = true;
    transactionService
      .search(debouncedSearch.trim())
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

  // Sync searchResults when transactions state updates (e.g. inline edits)
  useEffect(() => {
    if (debouncedSearch.trim() && searchResults.length > 0) {
      setSearchResults(prevResults =>
        prevResults.map(r => {
          const updated = transactions.find(t => t.id === r.id);
          return updated || r;
        })
      );
    }
  }, [transactions, debouncedSearch, searchResults.length]);

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

  const filteredMasterPeriods = useMemo(() => {
    if (excludeFuture) {
      const d = new Date();
      const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return masterPeriods.filter(p => p <= currentMonthStr);
    }
    return masterPeriods;
  }, [masterPeriods, excludeFuture]);

  // ── Period picker options (Using Master List from DB) ────────
  const groupedOptions: GroupedOptions = useMemo(() => {
    const yearsMap: Record<string, GroupedPeriodOption> = {};
    filteredMasterPeriods.forEach(periodStr => {
      // periodStr is YYYY-MM
      const [y, mStr] = periodStr.split('-');
      const m = Number.parseInt(mStr, 10);

      if (!yearsMap[y]) yearsMap[y] = { months: new Set(), quarters: new Set(), halves: new Set() };
      yearsMap[y].months.add(periodStr);
      if (m >= 1 && m <= 3) yearsMap[y].quarters.add(`${y}-Q1`);
      if (m >= 4 && m <= 6) yearsMap[y].quarters.add(`${y}-Q2`);
      if (m >= 7 && m <= 9) yearsMap[y].quarters.add(`${y}-Q3`);
      if (m >= 10 && m <= 12) yearsMap[y].quarters.add(`${y}-Q4`);
      if (m >= 1 && m <= 6) yearsMap[y].halves.add(`${y}-H1`);
      if (m >= 7 && m <= 12) yearsMap[y].halves.add(`${y}-H2`);
    });
    return { yearsMap, sortedYears: Object.keys(yearsMap).sort((a, b) => b.localeCompare(a)) };
  }, [filteredMasterPeriods]);

  // ── เดือนที่มีข้อมูล (Master List) ──
  const rawAvailableMonths: string[] = useMemo(() => {
    return [...filteredMasterPeriods].sort((a, b) => b.localeCompare(a));
  }, [filteredMasterPeriods]);

  // ── Derived booleans ─────────────────────────────────────────
  const isReadOnlyView = !/^\d{4}-\d{2}$/.exec(filterPeriod);

  // ── Dates ที่มีใน period ปัจจุบัน (ใช้ใน LedgerView filter) ──
  const availableDatesInPeriod: string[] = useMemo(() => {
    const dates = new Set(
      transactions
        .filter(t => isDateInFilter(t.date, filterPeriod))
        .map(t => t.date)
    );
    return Array.from(dates).sort(
      (a, b) => (parseDateStrToObj(a)?.getTime() || 0) - (parseDateStrToObj(b)?.getTime() || 0)
    );
  }, [transactions, filterPeriod]);

  // ── All Dates ใน period (ใช้ใน Horizontal Ledger เพื่อโชว์วันที่ไม่มีรายการ) ──
  const allDatesInPeriod: string[] = useMemo(() => {
    return generateDatesForPeriod(filterPeriod, transactions);
  }, [transactions, filterPeriod]);

  // ── Cashflow group IDs ที่มีข้อมูลจริงใน period ปัจจุบัน ────
  const activeCashflowGroupIds: Set<string> = useMemo(() => {
    const ids = new Set<string>();
    transactions
      .filter(t => isDateInFilter(t.date, filterPeriod))
      .forEach(t => {
        const cat =
          categories.find(c => c.id === t.category_id) || categories.find(c => c.name === t.category);
        const gId = cat?.cashflowGroup || cat?.cashflow_group_id;
        if (gId) ids.add(gId);
      });
    return ids;
  }, [transactions, filterPeriod, categories]);

  // ── Category names ที่มีข้อมูลจริงใน period ปัจจุบัน ────
  const activeCategoryNames: Set<string> = useMemo(() => {
    const names = new Set<string>();
    transactions
      .filter(t => isDateInFilter(t.date, filterPeriod))
      .forEach(t => {
        const cat =
          categories.find(c => c.id === t.category_id) || categories.find(c => c.name === t.category);
        if (cat) {
          names.add(cat.name);
        } else if (t.category) {
          names.add(t.category);
        }
      });
    return names;
  }, [transactions, filterPeriod, categories]);

  // ── displayTransactions: filtered list สำหรับ LedgerView ────
  const displayTransactions: TransactionDisplay[] = useMemo(() => {
    const baseTransactions = debouncedSearch.trim() ? searchResults : transactions;
    let filtered = baseTransactions.filter(t => isDateInFilter(t.date, filterPeriod));

    const getCat = (t: TransactionDisplay) =>
      categories.find(c => c.id === t.category_id) || categories.find(c => c.name === t.category);

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
      if (advancedFilterDate === 'WEEKDAY') {
        filtered = filtered.filter(t => {
          const day = new Date(t.date).getDay();
          return day !== 0 && day !== 6;
        });
      } else if (advancedFilterDate === 'WEEKEND') {
        filtered = filtered.filter(t => {
          const day = new Date(t.date).getDay();
          return day === 0 || day === 6;
        });
      } else if (advancedFilterDate.includes(',')) {
        const dateSet = new Set(advancedFilterDate.split(','));
        filtered = filtered.filter(t => dateSet.has(t.date));
      } else if (advancedFilterDate.includes(':')) {
        const [start, end] = advancedFilterDate.split(':');
        filtered = filtered.filter(t => t.date >= start && t.date <= end);
      } else {
        filtered = filtered.filter(t => t.date === advancedFilterDate);
      }
    }

    // 3. Category Filter
    if (advancedFilterCategory !== 'ALL') {
      if (Array.isArray(advancedFilterCategory)) {
        if (advancedFilterCategory.length === 0) {
          filtered = [];
        } else {
          filtered = filtered.filter(t => {
            const cat = getCat(t);
            const catName = cat?.name || t.category;
            return advancedFilterCategory.includes(catName);
          });
        }
      } else {
        filtered = filtered.filter(t => {
          const cat = getCat(t);
          const catName = cat?.name || t.category;
          return catName === advancedFilterCategory;
        });
      }
    }

    // 4. Group Filter (Strictly Custom Group IDs)
    if (advancedFilterGroup !== 'ALL') {
      filtered = filtered.filter(t => {
        const cat = getCat(t);
        return (cat?.cashflowGroup || cat?.cashflow_group_id) === advancedFilterGroup;
      });
    }

    // 5. Amount Range Filter
    const min = Number.parseFloat(minAmount);
    const max = Number.parseFloat(maxAmount);
    if (!Number.isNaN(min)) filtered = filtered.filter(t => Math.abs(t.amount) >= min);
    if (!Number.isNaN(max)) filtered = filtered.filter(t => Math.abs(t.amount) <= max);

    // 6. Day Type (Weekend/Weekday) Filter
    if (dayTypeFilter !== 'ALL') {
      filtered = filtered.filter(t => {
        const day = new Date(t.date).getDay();
        const isWeekend = day === 0 || day === 6;
        return dayTypeFilter === 'WEEKEND' ? isWeekend : !isWeekend;
      });
    }

    // 6.5 Allocation Filter (Need/Want/Savings)
    if (allocationFilter !== 'ALL') {
      filtered = filtered.filter(t => {
        const cat = getCat(t);
        if (cat?.type === 'income') return false;
        const aType = t.allocation_type || cat?.allocation_type || 'want';
        return aType === allocationFilter;
      });
    }

    return filtered;
  }, [
    transactions,
    searchResults,
    filterPeriod,
    debouncedSearch,
    advancedFilterCategory,
    advancedFilterGroup,
    advancedFilterDate,
    typeFilter,
    allocationFilter,
    minAmount,
    maxAmount,
    dayTypeFilter,
    categories
  ]);

  const isCategoryActive = Array.isArray(advancedFilterCategory)
    ? advancedFilterCategory.length > 0
    : advancedFilterCategory !== 'ALL';

  const isFilterActive = Boolean(
    searchQuery ||
      advancedFilterDate !== 'ALL' ||
      advancedFilterGroup !== 'ALL' ||
      isCategoryActive ||
      typeFilter !== 'ALL' ||
      allocationFilter !== 'ALL' ||
      minAmount ||
      maxAmount ||
      dayTypeFilter !== 'ALL'
  );

  return {
    filterPeriod,
    setFilterPeriod,
    groupedOptions,
    rawAvailableMonths,
    isReadOnlyView,
    searchQuery,
    setSearchQuery,
    advancedFilterCategory,
    setAdvancedFilterCategory,
    advancedFilterGroup,
    setAdvancedFilterGroup,
    advancedFilterDate,
    setAdvancedFilterDate,
    typeFilter,
    setTypeFilter,
    allocationFilter,
    setAllocationFilter,
    minAmount,
    setMinAmount,
    maxAmount,
    setMaxAmount,
    dayTypeFilter,
    setDayTypeFilter,
    availableDatesInPeriod,
    allDatesInPeriod,
    displayTransactions,
    activeCashflowGroupIds,
    activeCategoryNames,
    isFilterActive,
    clearFilters
  };
}
