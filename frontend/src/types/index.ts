// frontend/src/types/index.ts

export type AllocationType = 'need' | 'want' | 'savings';
export type GroupType = 'income' | 'expense' | 'savings';

export interface TransactionDisplay {
  id: string;
  date: string; // YYYY-MM-DD
  category: string;
  category_id: string;
  description: string;
  amount: number; // Baht (decimal)
  group_type: GroupType;
  allocation_type: AllocationType | null;
}

export interface TransactionPayload {
  id?: string;
  date: string;
  description?: string;
  amount: number;
  category?: string;
  category_id?: string;
  allocation_type?: AllocationType | null;
  dayNote?: string;
}

export interface FrequentItem {
  categoryId: string;
  categoryName: string;
  description: string;
  amount: number; // Baht
  allocation_type: AllocationType | null;
  count: number;
  lastDate: string;
}

export interface CashflowGroup {
  id: string;
  name: string;
  type: GroupType;
  allocation_type: AllocationType;
  order_index: number;
  color?: string | null;
  icon?: string | null;
  highlight_bg: number;
}

export interface Category {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  order_index: number;
  cashflow_group_id: string;
}

export interface DayType {
  id: string;
  name: string;
  label: string;
  color?: string | null;
  order_index: number;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  day_type_id: string;
  note?: string | null;
}

export interface AnalyticsSummary {
  income: number;
  expense: number;
  savings: number;
}

export interface AnalyticsCategoryBreakdown {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: string;
  amount: number;
}

export interface AnalyticsMonthlyAggregation {
  month: string;
  income: number;
  expense: number;
  savings: number;
  groups: Record<string, number>;
}

export interface AnalyticsWorkLife {
  name: string;
  label: string;
  count: number;
  avg_expense: number;
}

export interface DashboardAnalytics {
  summary: AnalyticsSummary;
  categories: AnalyticsCategoryBreakdown[];
  monthly: AnalyticsMonthlyAggregation[];
  workLife: AnalyticsWorkLife[];
}

export interface BackupFileInfo {
  name: string;
  size: number;
  createdAt: string | Date;
}
