// src/views/Calendar/components/PeriodOverview/index.jsx
import React, { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import PeriodExecutiveHUD from './PeriodExecutiveHUD';
import MultiMonthGrid from './MultiMonthGrid';
import TemporalInsights from './TemporalInsights';
import AllocationRhythm from './AllocationRhythm';
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

  // 3. Compute Temporal Distributions (Work vs Rest & Day-of-Week)
  const temporalData = useMemo(() => {
    return calculateTemporalInsights({
      monthsList,
      transactions,
      categories,
      dayTypes,
      dayTypeConfig
    });
  }, [monthsList, transactions, categories, dayTypes, dayTypeConfig]);

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
  const peakOutliers = useMemo(() => {
    return calculatePeakOutliers({
      monthsList,
      transactions,
      categories,
      dayTypes,
      dayTypeConfig,
      limit: 5
    });
  }, [monthsList, transactions, categories, dayTypes, dayTypeConfig]);

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
            <span className="text-[10px] font-bold px-2 py-0.5 border border-[#da291c]/30 bg-[#da291c]/10 text-[#da291c]">
              พบข้อมูล {metrics.displayMonths.length} เดือน
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            มิติเวลาและการเงิน (Temporal Financial Intelligence) สรุปพฤติกรรมการใช้จ่าย อัตราเผาเงิน และวันทำงาน vs วันพักผ่อน
          </p>
        </div>

        <button
          onClick={goToCurrentMonth}
          className="px-4 py-2 rounded-none text-xs font-bold bg-[#da291c] hover:bg-[#b01e0a] text-white transition-none flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>ไปเดือนปัจจุบัน ({currentMonthLabel})</span>
        </button>
      </div>

      {/* 2. Executive Temporal HUD (4 Metric Cards) */}
      <PeriodExecutiveHUD
        periodIncome={metrics.periodIncome}
        periodExpense={metrics.periodExpense}
        periodNet={metrics.periodNet}
        savingsRate={metrics.savingsRate}
        cpaGrade={metrics.cpaGrade}
        averageDailyBurn={metrics.averageDailyBurn}
        zeroSpendDaysCount={metrics.zeroSpendDaysCount}
        zeroSpendPct={metrics.zeroSpendPct}
        totalPeriodDays={metrics.totalPeriodDays}
        peakSpendDay={metrics.peakSpendDay}
        onSelectDate={onSelectDate}
      />

      {/* 3. Multi-Month Matrix & Mini Heatmaps Grid */}
      <MultiMonthGrid
        displayMonths={metrics.displayMonths}
        currentMonthStr={currentMonthStr}
        setFilterPeriod={setFilterPeriod}
        onSelectDate={onSelectDate}
        goToCurrentMonth={goToCurrentMonth}
        filterPeriodLabel={filterLabel}
      />

      {/* 4. Temporal Work-Life & Day-of-Week Insights */}
      <TemporalInsights
        dayOfWeekStats={temporalData.dayOfWeekStats}
        activeDayTypes={temporalData.activeDayTypes}
        workVsRest={temporalData.workVsRest}
        monthCycleStats={temporalData.monthCycleStats}
      />

      {/* 5. Allocation Rhythm Breakdown */}
      <AllocationRhythm
        allocationData={allocationData}
      />

      {/* 6. Peak Outlier Spend Days */}
      <PeakOutlierDays
        peakOutliers={peakOutliers}
        onSelectDate={onSelectDate}
      />
    </div>
  );
}
