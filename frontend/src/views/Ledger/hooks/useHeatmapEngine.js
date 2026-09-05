import { useMemo, useCallback } from 'react';

export const EXCLUDED_HEATMAP_CATEGORIES = ['ค่าเช่า/ค่าหอพัก', 'ค่าไฟ', 'ค่าเน็ต', 'ค่าน้ำ'];

const THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const DAY_NAMES = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];

export function useHeatmapEngine(displayTransactions, categories, allDates, options = {}) {
  const {
    selectedCategories = 'ALL',
    includeFixedCosts = false,
    allocationFilter = 'ALL',
    dayTypeFilter = 'ALL',
    hideZeroDays = false,
  } = options;

  const expenseTransactions = useMemo(() =>
    displayTransactions.filter(t => {
      const cat = categories.find(c => c.name === t.category || c.id === t.category_id);
      if (cat?.type !== 'expense') return false;
      const catName = cat?.name || t.category;

      // 1. Fixed costs filter
      const isExplicitlySelected = Array.isArray(selectedCategories) && selectedCategories.includes(catName);
      if (!includeFixedCosts && !isExplicitlySelected && EXCLUDED_HEATMAP_CATEGORIES.includes(catName)) {
        return false;
      }

      // 2. Category selection filter
      if (Array.isArray(selectedCategories) && selectedCategories.length > 0) {
        if (!selectedCategories.includes(catName)) return false;
      } else if (typeof selectedCategories === 'string' && selectedCategories !== 'ALL') {
        if (catName !== selectedCategories) return false;
      }

      // 3. Allocation filter (need / want)
      if (allocationFilter !== 'ALL') {
        const aType = t.allocation_type || cat?.allocation_type || 'want';
        if (aType !== allocationFilter) return false;
      }

      // 4. Day type filter (weekday / weekend)
      if (dayTypeFilter !== 'ALL') {
        let dow;
        if (t.date.includes('-')) {
          const [y, m, d] = t.date.split('-');
          dow = new Date(Number.parseInt(y, 10), Number.parseInt(m, 10) - 1, Number.parseInt(d, 10)).getDay();
        } else {
          const [d, m, y] = t.date.split('/');
          dow = new Date(Number.parseInt(y, 10), Number.parseInt(m, 10) - 1, Number.parseInt(d, 10)).getDay();
        }
        const isWeekend = (dow === 0 || dow === 6);
        if (dayTypeFilter === 'WEEKEND' && !isWeekend) return false;
        if (dayTypeFilter === 'WEEKDAY' && isWeekend) return false;
      }

      return true;
    }), [displayTransactions, categories, includeFixedCosts, selectedCategories, allocationFilter, dayTypeFilter]);

  const activeCategories = useMemo(() => {
    const usedCatNames = new Set(expenseTransactions.map(t => t.category));
    return categories.filter(c => 
      c.type === 'expense' && 
      usedCatNames.has(c.name) &&
      (includeFixedCosts || !EXCLUDED_HEATMAP_CATEGORIES.includes(c.name) || (Array.isArray(selectedCategories) && selectedCategories.includes(c.name)))
    );
  }, [categories, expenseTransactions, includeFixedCosts, selectedCategories]);

  const sortedDates = useMemo(() => {
    let dates;
    if (!allDates || allDates.length === 0) {
      dates = [...new Set(expenseTransactions.map(t => t.date))];
    } else {
      dates = [...allDates];
    }

    // Filter day type on dates
    if (dayTypeFilter !== 'ALL') {
      dates = dates.filter(dateStr => {
        let dow;
        if (dateStr.includes('-')) {
          const [y, m, d] = dateStr.split('-');
          dow = new Date(Number.parseInt(y, 10), Number.parseInt(m, 10) - 1, Number.parseInt(d, 10)).getDay();
        } else {
          const [d, m, y] = dateStr.split('/');
          dow = new Date(Number.parseInt(y, 10), Number.parseInt(m, 10) - 1, Number.parseInt(d, 10)).getDay();
        }
        const isWeekend = (dow === 0 || dow === 6);
        return dayTypeFilter === 'WEEKEND' ? isWeekend : !isWeekend;
      });
    }

    // Hide zero-spend days if enabled
    if (hideZeroDays) {
      const activeDateSet = new Set(expenseTransactions.map(t => t.date));
      dates = dates.filter(d => activeDateSet.has(d));
    }

    return dates.sort((a, b) => {
      const parse = d => d.includes('/') ? d.split('/').reverse().join('') : d.replace(/-/g, '');
      return parse(a).localeCompare(parse(b));
    });
  }, [allDates, expenseTransactions, dayTypeFilter, hideZeroDays]);

  const cellMap = useMemo(() => {
    const map = {};
    expenseTransactions.forEach(t => {
      if (!map[t.date]) map[t.date] = {};
      if (!map[t.date][t.category]) map[t.date][t.category] = [];
      map[t.date][t.category].push(t);
    });
    return map;
  }, [expenseTransactions]);

  const dailyTotal = useMemo(() => {
    const totals = {};
    sortedDates.forEach(date => {
      totals[date] = 0;
    });
    expenseTransactions.forEach(t => {
      if (totals[t.date] !== undefined) {
        totals[t.date] += Number.parseFloat(t.amount) || 0;
      }
    });
    return totals;
  }, [sortedDates, expenseTransactions]);

  const categoryTotal = useMemo(() => {
    const totals = {};
    activeCategories.forEach(cat => {
      totals[cat.name] = 0;
    });
    expenseTransactions.forEach(t => {
      if (totals[t.category] !== undefined) {
        totals[t.category] += Number.parseFloat(t.amount) || 0;
      }
    });
    return totals;
  }, [activeCategories, expenseTransactions]);

  const grandTotal = useMemo(() =>
    expenseTransactions.reduce((sum, t) => sum + (Number.parseFloat(t.amount) || 0), 0),
    [expenseTransactions]);

  const maxCellValue = useMemo(() => {
    let max = 0;
    sortedDates.forEach(date => {
      activeCategories.forEach(cat => {
        const items = cellMap[date]?.[cat.name] || [];
        const sum = items.reduce((s, t) => s + (Number.parseFloat(t.amount) || 0), 0);
        if (sum > max) max = sum;
      });
    });
    return max || 1;
  }, [sortedDates, activeCategories, cellMap]);

  const formatDate = useCallback((dateStr) => {
    let dayNum, monthIdx, yearNum;
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return { day: dateStr, month: '', dayName: '', isWeekend: false };
      yearNum  = Number.parseInt(parts[0], 10);
      monthIdx = Number.parseInt(parts[1], 10) - 1;
      dayNum   = Number.parseInt(parts[2], 10);
    } else {
      const parts = dateStr.split('/');
      if (parts.length !== 3) return { day: dateStr, month: '', dayName: '', isWeekend: false };
      dayNum   = Number.parseInt(parts[0], 10);
      monthIdx = Number.parseInt(parts[1], 10) - 1;
      yearNum  = Number.parseInt(parts[2], 10);
    }
    if (yearNum > 2500) yearNum -= 543;
    const dateObj = new Date(yearNum, monthIdx, dayNum);
    const dow     = dateObj.getDay();
    return { day: dayNum, month: THAI_MONTHS_SHORT[monthIdx] || '', dayName: DAY_NAMES[dow], isWeekend: dow === 0 || dow === 6 };
  }, []);

  return {
    expenseTransactions,
    activeCategories,
    sortedDates,
    cellMap,
    dailyTotal,
    categoryTotal,
    grandTotal,
    maxCellValue,
    formatDate
  };
}