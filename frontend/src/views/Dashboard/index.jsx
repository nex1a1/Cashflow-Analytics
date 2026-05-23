// src/views/Dashboard/index.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Inbox } from 'lucide-react';
import { DashboardProvider } from './context/DashboardContext';
import DashboardSkeleton from './components/DashboardSkeleton';

// Components
import SummaryCards from './components/SummaryCards';
import ExpenseProportion from './components/ExpenseProportion';
import MainChart from './components/MainChart';
import TopTransactions from './components/TopTransactions';
import ActivityTimeline from './components/ActivityTimeline';
import CashflowTable from './components/CashflowTable';

export default function DashboardView(props) {
  const dm = true;
  const { transactions, analytics, isLoading } = props;
  
  // ── Logic: Smooth Loading Transition ───────────────────────
  const [showSkeleton, setShowSkeleton] = useState(isLoading);

  useEffect(() => {
    if (isLoading) {
      setShowSkeleton(true);
    } else {
      const timer = setTimeout(() => setShowSkeleton(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Case 1: Initial Boot (No data object at all) -> Full Page Skeleton
  if (showSkeleton && !analytics) {
    return <DashboardSkeleton />;
  }

  // Case 2: Truly Empty State (Not loading and no transactions)
  if (transactions.length === 0 && !showSkeleton) {
    return (
      <div className={`flex flex-col items-center justify-center text-slate-400 py-32 rounded-sm border-2 border-dashed ${'bg-slate-800 border-slate-700'}`}>
        <Inbox className="w-16 h-16 mb-4 text-slate-300 animate-bounce" style={{ animationDuration: '2s' }} />
        <p className="text-lg font-bold text-slate-500">ยังไม่มีข้อมูลสำหรับการวิเคราะห์</p>
      </div>
    );
  }

  return (
    <DashboardProvider value={{ ...props, showSkeleton }}>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full pb-10 flex flex-col gap-4">

        {/* ══════════════════════════════════════════════════════════
            ROW 1 — SUMMARY COMMAND CENTER + EXPENSE PROPORTION
        ══════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-4 w-full">
          <SummaryCards />
          <ExpenseProportion />
        </div>
        {/* ══════════════════════════════════════════════════════════
            ROW 2 — MAIN CHART (wide) + TOP X (narrow sidebar)
        ══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4 items-stretch">
          <MainChart />
          <TopTransactions />
        </div>

        {/* ══════════════════════════════════════════════════════════
            ROW 3 — ACTIVITY TIMELINE
        ══════════════════════════════════════════════════════════ */}
        <ActivityTimeline />

        {/* ══════════════════════════════════════════════════════════
            ROW 4 — CASHFLOW TABLE
        ══════════════════════════════════════════════════════════ */}
        <CashflowTable />

      </div>
    </DashboardProvider>
  );
}

DashboardView.propTypes = {
  transactions:         PropTypes.array.isRequired,
  categories:           PropTypes.array.isRequired,
  filterPeriod:         PropTypes.string.isRequired,
  getFilterLabel:       PropTypes.func.isRequired,
  hideFixedExpenses:    PropTypes.bool.isRequired,
  setHideFixedExpenses: PropTypes.func.isRequired,
  dashboardCategory:    PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
  setDashboardCategory: PropTypes.func.isRequired,
  chartGroupBy:         PropTypes.string.isRequired,
  setChartGroupBy:      PropTypes.func.isRequired,
  topXLimit:            PropTypes.number.isRequired,
  setTopXLimit:         PropTypes.func.isRequired,
  analytics:            PropTypes.object.isRequired,
  isLoading:            PropTypes.bool.isRequired,
  dayTypeConfig:        PropTypes.array.isRequired,
  dayTypes:             PropTypes.object.isRequired,
};