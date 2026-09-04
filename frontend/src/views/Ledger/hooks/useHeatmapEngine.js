import { useMemo, useCallback } from 'react';

export const EXCLUDED_HEATMAP_CATEGORIES = ['ค่าเช่า/ค่าหอพัก', 'ค่าไฟ', 'ค่าเน็ต', 'ค่าน้ำ'];

const THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const DAY_NAMES = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];

export function useHeatmapEngine(displayTransactions, categories, allDates) {
  const expenseTransactions = useMemo(() =>
    displayTransactions.filter(t => {
      if (EXCLUDED_HEATMAP_CATEGORIES.includes(t.category)) return false;
      const cat = categories.find(c => c.name === t.category);
      return cat?.type === 'expense';
    }), [displayTransactions, categories]);

  const activeCategories = useMemo(() => {
    const usedCatNames = new Set(expenseTransactions.map(t => t.category));
    return categories.filter(c => 
      c.type === 'expense' && 
      usedCatNames.has(c.name) &&
      !EXCLUDED_HEATMAP_CATEGORIES.includes(c.name)
    );
  }, [categories, expenseTransactions]);

  const sortedDates = useMemo(() => {
    if (!allDates || allDates.length === 0) {
      const dates = [...new Set(expenseTransactions.map(t => t.date))];
      return dates.sort((a, b) => {
        const parse = d => d.split('/').reverse().join('');
        return parse(a) - parse(b);
      });
    }
    return allDates;
  }, [allDates, expenseTransactions]);

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