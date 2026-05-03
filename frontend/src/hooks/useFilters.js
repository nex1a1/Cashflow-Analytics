// src/hooks/useFilters.js
import { useState, useEffect, useMemo } from 'react';
import { isDateInFilter, parseDateStrToObj, generateDatesForPeriod } from '../utils/dateHelpers';

export default function useFilters({ transactions, categories }) {
  // ── Period ───────────────────────────────────────────────────
  const [filterPeriod, setFilterPeriod] = useState('ALL');

  // ── Advanced filters (LedgerView) ───────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [advancedFilterCategory, setAdvancedFilterCategory] = useState('ALL');
  const [advancedFilterGroup, setAdvancedFilterGroup] = useState('ALL');
  const [advancedFilterDate, setAdvancedFilterDate] = useState('ALL');

  // reset วันที่เมื่อเปลี่ยน period
  useEffect(() => { setAdvancedFilterDate('ALL'); }, [filterPeriod]);

  // ── Period picker options ────────────────────────────────────
  const groupedOptions = useMemo(() => {
    const yearsMap = {};
    transactions.forEach(t => {
      if (!t.date) return;
      const parts = t.date.split('/');
      if (parts.length !== 3) return;
      const m = parseInt(parts[1], 10);
      const y = parts[2];
      if (!yearsMap[y]) yearsMap[y] = { months: new Set(), quarters: new Set(), halves: new Set() };
      yearsMap[y].months.add(`${y}-${parts[1]}`);
      if (m >= 1  && m <= 3)  yearsMap[y].quarters.add(`${y}-Q1`);
      if (m >= 4  && m <= 6)  yearsMap[y].quarters.add(`${y}-Q2`);
      if (m >= 7  && m <= 9)  yearsMap[y].quarters.add(`${y}-Q3`);
      if (m >= 10 && m <= 12) yearsMap[y].quarters.add(`${y}-Q4`);
      if (m >= 1  && m <= 6)  yearsMap[y].halves.add(`${y}-H1`);
      if (m >= 7  && m <= 12) yearsMap[y].halves.add(`${y}-H2`);
    });
    return { yearsMap, sortedYears: Object.keys(yearsMap).sort().reverse() };
  }, [transactions]);

  // ── เดือนที่มีข้อมูล (ใช้ใน CalendarView + auto-set period) ──
  const rawAvailableMonths = useMemo(() => {
    const m = new Set();
    transactions.forEach(t => {
      if (!t.date) return;
      const p = t.date.split('/');
      if (p.length === 3) m.add(`${p[2]}-${p[1]}`);
    });
    return Array.from(m).sort().reverse();
  }, [transactions]);

  // auto-set เดือนล่าสุดเมื่อโหลดข้อมูลครั้งแรก
  useEffect(() => {
    if (filterPeriod === 'ALL' && rawAvailableMonths.length > 0) {
      setFilterPeriod(rawAvailableMonths[0]);
    }
  }, [rawAvailableMonths]);

  // ── Derived booleans ─────────────────────────────────────────
  // true = เลือกดูหลายเดือน (ไม่ใช่เดือนเดียว) → LedgerView read-only
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
        const cat = categories.find(c => c.name === t.category);
        if (cat?.cashflowGroup) ids.add(cat.cashflowGroup);
      });
    return ids;
  }, [transactions, filterPeriod, categories]);

  // ── displayTransactions: filtered list สำหรับ LedgerView ────
  const displayTransactions = useMemo(() => {
    let filtered = transactions.filter(t => isDateInFilter(t.date, filterPeriod));

    if (advancedFilterDate !== 'ALL') {
      filtered = filtered.filter(t => t.date === advancedFilterDate);
    }

    if (advancedFilterCategory !== 'ALL') {
      filtered = filtered.filter(t => t.category === advancedFilterCategory);
    }

    if (advancedFilterGroup !== 'ALL') {
      filtered = filtered.filter(t => {
        const cat = categories.find(c => c.name === t.category)
          ?? { type: 'expense', cashflowGroup: 'cg_variable', isFixed: false };
        switch (advancedFilterGroup) {
          case 'INCOME':   return cat.type === 'income';
          case 'EXPENSE':  return cat.type === 'expense';
          case 'FIXED':    return cat.isFixed;
          case 'VARIABLE': return cat.type === 'expense' && !cat.isFixed;
          default:         
            return cat.cashflowGroup === advancedFilterGroup;
        }
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        (t.description || '').toLowerCase().includes(q) ||
        (t.category    || '').toLowerCase().includes(q),
      );
    }

    return filtered;
  }, [transactions, filterPeriod, searchQuery, advancedFilterCategory, advancedFilterGroup, advancedFilterDate, categories]);

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
    // computed
    availableDatesInPeriod,
    allDatesInPeriod,
    displayTransactions,
    activeCashflowGroupIds,
  };
}