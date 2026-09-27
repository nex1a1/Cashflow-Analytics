import React, { createContext, useContext, ReactNode } from 'react';
import { TransactionDisplay, Category, CashflowGroup, DayType } from '@/types';

export interface DashboardAnalyticsResult {
  mainChartType?: string;
  mainChartData?: {
    labels: string[];
    datasets: any[];
  };
  sortedMonthsKeys?: string[];
  monthlyCatMap?: Record<string, Record<string, number>>;
  datesInPeriod?: string[];
  dailyCatMap?: Record<string, Record<string, number>>;
  [key: string]: any;
}

export interface DashboardContextValue {
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
  analytics: DashboardAnalyticsResult;
  isLoading: boolean;
  dayTypeConfig: DayType[];
  dayTypes: Record<string, any>;
  showSkeleton?: boolean;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export interface DashboardProviderProps {
  children: ReactNode;
  value: DashboardContextValue;
}

export const DashboardProvider = ({ children, value }: DashboardProviderProps) => {
  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboardContext = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardProvider');
  }
  return context;
};
