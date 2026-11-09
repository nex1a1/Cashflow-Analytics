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
  actualDailySeries: number[];
  paceStatus: PaceStatus;
  eomStatus: EomStatus;
  /** Monthly bills seen in earlier months with no row yet this month: already inside fixedTotal. */
  pendingFixed: number;
  pendingFixedItems: { name: string; amount: number }[];
  /** Monthly income with no row yet this month: already inside maxAllowedExpense. */
  estimatedIncome: number;
  /** Spent on unusually big days, left out of the pace carried over the remaining days (still counted as spent). */
  oneOffExcluded: number;
  /** Expense that leaves the leftover target (BUDGET_RULES.surplus.min) of income. */
  targetExpense: number;
  /** How far the forecast is above targetExpense. */
  targetShortfall: number;
  /** Per-day spending that still reaches targetExpense. */
  safeToSpendForTarget: number;
  /** Month end if the remaining days cost what they did in the units before, or what they cost now; null without enough history. Not a probability. */
  projectedRange: { low: number; high: number } | null;
}

export interface GhostPacerStatus {
  code: 'LEAD' | 'TRAIL' | 'TIED';
  label: string;
  color: string;
  bg: string;
  border: string;
}

/** One category's share of the gap with last month, up to the same day. */
export interface GapDriver {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  current: number;
  previous: number;
  delta: number;
}

export interface GhostPacerDetails {
  hasData: boolean;
  /** False for a finished month: projectedExpense is then its real total. */
  isCurrentMonth: boolean;
  currentPeriod: string;
  prevPeriod: string;
  currentDay: number;
  lastDayOfMonth: number;
  currentDailySeries: number[];
  prevDailySeries: number[];
  benchmarkDailySeries: number[];
  currentSpendToDate: number;
  ghostSpendToDate: number;
  benchmarkSpendToDate: number;
  deltaVsGhost: number;
  deltaVsGhostPct: number;
  deltaVsBenchmark: number;
  deltaVsBenchmarkPct: number;
  projectedExpense: number;
  ghostTotalExpense: number;
  deltaEom: number;
  /** The biggest changes, either way; empty without a last month to compare with. */
  gapDrivers: GapDriver[];
  /** Every other category's change: with gapDrivers it adds up to deltaVsGhost. */
  gapOthers: number;
  /** Per-day spending that still ends under last month; null when there is nothing left to steer (finished month, last day, no last month). */
  beatGhostDaily: number | null;
  /** The pace the forecast carries over the remaining days. */
  dailyPace: number;
  paceStatus: GhostPacerStatus;
}

export interface SummaryAnalytics {
  // Vitals
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  savingsRate: number;
  totalSavings: number;
  datesInPeriod?: string[];
  /** Days of the period up to today (the whole period once it is over): the divisor of every per-day average. */
  elapsedDays?: number;
  prevTotals?: PrevTotals;
  periodLabel?: string;
  // Strategic
  /** All expense per day, rent included. */
  dailyAvg: number;
  /** Expense per day without the rent group: what the days themselves cost. */
  livingDailyAvg: number;
  foodPercentage: number | string;
  foodTotal: number;
  foodDailyAvg: number;
  foodPctOfIncome: number | string;
  foodWorkdayAvg: number;
  foodHolidayAvg: number;
  dailyWorkdayAvg: number;
  dailyHolidayAvg: number;
  maxFoodDayAmount: number;
  /** WANT spending in the period. */
  wantTotal: number;
  /** NEED spending in the period. */
  needTotal: number;
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
  ghostPacerDetails?: GhostPacerDetails;
  /** The same comparison without the rent group, whose pay day would otherwise swing the gap by the whole bill. */
  ghostPacerDetailsNoRent?: GhostPacerDetails;
  isSingleMonthView?: boolean;
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
  /**
   * `bg-*` of a left edge bar, only when the card is in trouble (a bar, not a border: the global border lock greys
   * every border). Omitted, the card has no coloured edge — the hero number already carries its colour.
   */
  edgeClass?: string;
  label: string;
  badge?: React.ReactNode;
  thresholdRow?: React.ReactNode;
  /** Title of the detail view that covers the card on hover / keyboard focus. */
  overlayTitle?: string;
  overlayBadge?: React.ReactNode;
  overlayBody?: React.ReactNode;
  showOverlay?: boolean;
  children: React.ReactNode;
}
