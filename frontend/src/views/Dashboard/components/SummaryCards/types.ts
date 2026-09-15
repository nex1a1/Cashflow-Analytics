// src/views/Dashboard/components/SummaryCards/types.ts
import { LucideIcon } from 'lucide-react';

export interface PrevTotals {
  income: number;
  expense: number;
  txCount: number;
}

export interface RentSub {
  rent: number;
  electricity: number;
  internet: number;
  water: number;
}

export interface SubscriptionService {
  name: string;
  icon?: string;
  amount: number;
}

export interface WantCategory {
  id: string | number;
  name: string;
  icon: string;
  color?: string;
  amount: number;
  pctOfWant: number;
}

export interface PaceStatus {
  label: string;
  color: string;
  bg: string;
}

export interface EomStatus {
  label: string;
  color: string;
  bg: string;
  border: string;
}

export interface ForecastingDetails {
  currentDay: number;
  lastDayOfMonth: number;
  remainingDays: number;
  monthProgressPct: number;
  fixedTotal: number;
  variableUpToToday: number;
  projectedVariableRemaining: number;
  actualDailyVariableAvg: number;
  projectedSurplusPct: number;
  maxAllowedExpense: number;
  requiredReduction: number;
  requiredDailyReduction: number;
  paceStatus: PaceStatus;
  eomStatus: EomStatus;
}

export interface SummaryAnalytics {
  // Vitals
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  savingsRate: number;
  totalSavings: number;
  datesInPeriod?: string[];
  prevTotals?: PrevTotals;
  periodLabel?: string;
  // Strategic
  dailyAvg: number;
  foodPercentage: number | string;
  foodTotal: number;
  foodDailyAvg: number;
  foodPctOfIncome: number | string;
  foodWorkdayAvg: number;
  foodHolidayAvg: number;
  dailyWorkdayAvg: number;
  dailyHolidayAvg: number;
  maxFoodDayAmount: number;
  variableTotal: number;
  fixedTotal: number;
  topWantCategories?: WantCategory[];
  rentPercentage: number | string;
  rentTotal: number;
  rentSub?: RentSub;
  subscriptionTotal: number;
  subscriptionPctOfIncome: number | string;
  subscriptionPercentage: number | string;
  subscriptionCount: number;
  subscriptionSub?: Record<string, number>;
  topSubscriptionServices?: SubscriptionService[];
  // Forecasting
  showForecasting?: boolean;
  projectedExpense: number;
  safeToSpend: number;
  projectedSurplus: number;
  forecastingDetails?: ForecastingDetails;
}

export interface BreakdownEntry {
  key: string | number;
  icon?: string;
  iconColor?: string;
  label: string;
  amount: number;
  pctLabel: string;
}

export interface StrategicCardShellProps {
  icon: LucideIcon;
  borderColorClass: string;
  hoverBgClass?: string;
  label: string;
  badge?: React.ReactNode;
  thresholdRow?: React.ReactNode;
  overlayTitle?: string;
  overlayBadge?: React.ReactNode;
  overlayBody?: React.ReactNode;
  showOverlay?: boolean;
  children: React.ReactNode;
}
