// src/views/Dashboard/index.tsx
import React, { useMemo } from 'react';
import { Inbox } from 'lucide-react';
import { DashboardProvider, DashboardContextValue } from './context/DashboardContext';
import DashboardSkeleton from './components/DashboardSkeleton';

// Components
import SummaryCards from './components/SummaryCards';
import ExpenseProportion from './components/ExpenseProportion';
import MainChart from './components/MainChart';
import TopTransactions from './components/TopTransactions';
import ActivityTimeline from './components/ActivityTimeline';
import CashflowTable from './components/CashflowTable';
import { TransactionDisplay, Category, CashflowGroup, DayType } from '../../types';

export interface DashboardViewProps {
  transactions: TransactionDisplay[];
  categories: Category[];
  cashflowGroups?: CashflowGroup[];
  filterPeriod: string;
  getFilterLabel: (period?: string) => string;
  hideFixedExpenses: boolean;
  setHideFixedExpenses: (val: any) => void;
  hideWantExpenses: boolean;
  setHideWantExpenses: (val: any) => void;
  dashboardCategory: string | string[];
  setDashboardCategory: (val: any) => void;
  chartGroupBy: string;
  setChartGroupBy: (val: any) => void;
  topXLimit: number;
  setTopXLimit: (val: any) => void;
  analytics: Record<string, any>;
  isLoading: boolean;
  dayTypeConfig: DayType[];
  dayTypes: Record<string, any>;
}

export default function DashboardView(props: DashboardViewProps) {
  const { transactions, analytics, isLoading } = props;
  
  // ── Logic: Smooth Loading Transition (Cold boot vs filter changes) ──
  const isInitialBoot = isLoading && (!transactions || transactions.length === 0);
  const showSkeleton = isLoading;

  // Memoize the context value to avoid recreating it on every single render
  const dashboardContextValue = useMemo(() => ({
    ...props,
    showSkeleton
  }), [
    props.transactions,
    props.categories,
    props.cashflowGroups,
    props.filterPeriod,
    props.getFilterLabel,
    props.hideFixedExpenses,
    props.setHideFixedExpenses,
    props.hideWantExpenses,
    props.setHideWantExpenses,
    props.dashboardCategory,
    props.setDashboardCategory,
    props.chartGroupBy,
    props.setChartGroupBy,
    props.topXLimit,
    props.setTopXLimit,
    props.analytics,
    props.isLoading,
    props.dayTypeConfig,
    props.dayTypes,
    showSkeleton
  ]);

  // Case 1: Initial Boot (No transactions loaded yet) -> Full Page Skeleton
  if (isInitialBoot) {
    return <DashboardSkeleton />;
  }

  // Case 2: Truly Empty State (Not loading and no transactions)
  if (transactions.length === 0 && !isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center text-slate-400 py-32 rounded-sm border-2 border-dashed ${'bg-slate-800 border-slate-700'}`}>
        <Inbox className="w-16 h-16 mb-4 text-slate-300 animate-bounce" style={{ animationDuration: '2s' }} />
        <p className="text-lg font-bold text-slate-500">ยังไม่มีข้อมูลสำหรับการวิเคราะห์</p>
      </div>
    );
  }

  return (
    <DashboardProvider value={dashboardContextValue}>
      <div className="w-full pb-10 flex flex-col gap-4">

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
