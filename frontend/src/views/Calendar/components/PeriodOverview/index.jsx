// src/views/Calendar/components/PeriodOverview/index.jsx
import React, { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import PeriodExecutiveHUD from './PeriodExecutiveHUD';
import MultiMonthGrid from './MultiMonthGrid';
import TemporalInsights from './TemporalInsights';
import PeakOutlierDays from './PeakOutlierDays';
import {
  getMonthsForPeriod,
  calculatePeriodMetrics,
  calculateTemporalInsights,
  calculateAllocationBreakdown,
  calculatePeakOutliers
} from '../../utils/calendarPeriodHelpers';

export default function PeriodOverview({
  filterPeriod,
  setFilterPeriod,
  transactions,
  categories,
  cashflowGroups,
  dayTypes,
  dayTypeConfig,
  getFilterLabel,
  goToCurrentMonth,
  currentMonthStr,
  onSelectDate
}) {
  const [excludeRentOutliers, setExcludeRentOutliers] = useState(true);

  // 1. Compute active months list strictly for the period
  const monthsList = useMemo(() => {
    return getMonthsForPeriod(filterPeriod, transactions);
  }, [filterPeriod, transactions]);

  // 2. Compute Executive Period Metrics & Multi-Month Matrices
  const metrics = useMemo(() => {
    return calculatePeriodMetrics({
      monthsList,
      transactions,
      categories,
      cashflowGroups,
      dayTypes,
      dayTypeConfig
    });
  }, [monthsList, transactions, categories, cashflowGroups, dayTypes, dayTypeConfig]);

  // 3. Compute Temporal Distributions (Work vs Rest) & Food Stats
  const temporalData = useMemo(() => {
    return calculateTemporalInsights({
      monthsList,
      transactions,
      categories,
      cashflowGroups,
      dayTypes,
      dayTypeConfig
    });
  }, [monthsList, transactions, categories, cashflowGroups, dayTypes, dayTypeConfig]);

  // 4. Compute Need vs Want vs Savings Allocation Rhythm
  const allocationData = useMemo(() => {
    return calculateAllocationBreakdown({
      monthsList,
      transactions,
      categories,
      cashflowGroups
    });
  }, [monthsList, transactions, categories, cashflowGroups]);

  // 5. Compute Peak Spend Outlier Days
  const peakOutliersData = useMemo(() => {
    return calculatePeakOutliers({
      monthsList,
      transactions,
      categories,
      cashflowGroups,
      dayTypes,
      dayTypeConfig,
      limit: 5,
      excludeRent: excludeRentOutliers
    });
  }, [monthsList, transactions, categories, cashflowGroups, dayTypes, dayTypeConfig, excludeRentOutliers]);

  const filterLabel = getFilterLabel ? getFilterLabel(filterPeriod) : filterPeriod;
  const currentMonthLabel = getFilterLabel ? getFilterLabel(currentMonthStr) : currentMonthStr;

  return (
    <div className="flex flex-col space-y-4 w-full">
      {/* 1. Header Banner */}
      <div className="bg-[#181818] border border-[#2d2d2d] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <CalendarDays className="w-5 h-5 text-[#da291c]" />
            <h2 className="text-xl font-black text-slate-100 tracking-wide">
              ภาพรวมปฏิทิน: {filterLabel}
            </h2>
            <span className="text-[10px] font-black tracking-wider px-2 py-0.5 border border-[#da291c]/30 bg-[#da291c]/10 text-[#da291c] uppercase">
              PERIOD OVERVIEW
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 border border-slate-700 bg-slate-800 text-slate-300 font-mono">
              {metrics.displayMonths.length} เดือน
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            มิติเวลาและการเงิน (Temporal Financial Intelligence) สรุปพฤติกรรมการใช้จ่าย อัตราเผาเงิน และวันทำงาน vs วันพักผ่อน
          </p>
        </div>

        <button
          onClick={goToCurrentMonth}
          className="px-4 py-2 rounded-none text-xs font-bold bg-[#da291c] hover:bg-[#b01e0a] text-white transition-none flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto cursor-pointer"
          title="กดแป้นพิมพ์ 'T' เพื่อกลับสู่เดือนปัจจุบัน"
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>ไปเดือนปัจจุบัน ({currentMonthLabel})</span>
          <kbd className="hidden md:inline-block px-1 py-0.2 text-[9px] font-mono bg-black/40 border border-white/20 text-white rounded-none">
            T
          </kbd>
        </button>
      </div>

      {/* 2. Executive Temporal HUD (3 Metric Cards: Net/Savings, Daily Burn, Daily Food) */}
      <PeriodExecutiveHUD
        periodIncome={metrics.periodIncome}
        periodExpense={metrics.periodExpense}
        periodNet={metrics.periodNet}
        savingsRate={metrics.savingsRate}
        cpaGrade={metrics.cpaGrade}
        averageDailyBurn={metrics.averageDailyBurn}
        workVsRest={temporalData.workVsRest}
        foodStats={temporalData.foodStats}
      />

      {/* 3. Condensed Financial Matrix Table (Monthly Flow) */}
      <MultiMonthGrid
        displayMonths={metrics.displayMonths}
        currentMonthStr={currentMonthStr}
        setFilterPeriod={setFilterPeriod}
        onSelectDate={onSelectDate}
        goToCurrentMonth={goToCurrentMonth}
        filterPeriodLabel={filterLabel}
      />

      {/* 4. Temporal Work-Life & Allocation Rhythm (2-Col Side-by-Side) */}
      <TemporalInsights
        activeDayTypes={temporalData.activeDayTypes}
        workVsRest={temporalData.workVsRest}
        dayOfWeekStats={temporalData.dayOfWeekStats}
        allocationData={allocationData}
      />

      {/* 5. Peak Outlier Spend Days */}
      <PeakOutlierDays
        peakOutliers={peakOutliersData.outliers}
        rentTransactionsCount={peakOutliersData.rentTransactionsCount}
        excludeRent={excludeRentOutliers}
        setExcludeRent={setExcludeRentOutliers}
        onSelectDate={onSelectDate}
        setFilterPeriod={setFilterPeriod}
      />
    </div>
  );
}
