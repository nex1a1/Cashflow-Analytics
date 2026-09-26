// src/views/Dashboard/index.tsx
import React, { useMemo } from 'react';
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
      <div className="flex flex-col items-center justify-center gap-3 py-32 border border-line bg-surface text-center">
        <Inbox className="w-12 h-12 text-ink-muted" aria-hidden="true" />
        <p className="text-lg font-bold text-ink-display">ยังไม่มีข้อมูลสำหรับการวิเคราะห์</p>
        <p className="text-sm text-ink-body">เพิ่มรายการแรกด้วยปุ่ม "เพิ่มข้อมูลด่วน" ด้านบน หรือนำเข้าไฟล์ CSV จากเมนู "ข้อมูล"</p>
      </div>
    );
  }

  return (
    <DashboardProvider value={dashboardContextValue}>
      <div className="w-full pb-10 flex flex-col gap-4">

        <div className="flex flex-col gap-4 w-full">
          <SummaryCards />
          <ExpenseProportion />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4 items-stretch">
          <MainChart />
          <TopTransactions />
        </div>
        <ActivityTimeline />
        <CashflowTable />

      </div>
    </DashboardProvider>
  );
}
