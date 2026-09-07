// frontend/src/types/index.ts
import React from 'react';

export type Satang = number;
export type Baht = number;

export type AllocationType = 'need' | 'want' | 'savings';
export type GroupType = 'income' | 'expense' | 'savings';

export interface TransactionDisplay {
  id: string;
  date: string; // YYYY-MM-DD
  category: string;
  category_id?: string;
  description: string;
  amount: number; // Baht (decimal)
  group_type?: GroupType;
  allocation_type?: AllocationType | null;
  _catObj?: Category;
}

export interface TransactionPayload {
  id?: string;
  date: string;
  description?: string;
  amount: number; // Satang or Baht depending on context
  amountBaht?: number;
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
  highlight_bg?: number | boolean;
  highlightBg?: boolean;
  isDefault?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  type?: GroupType;
  order_index?: number;
  cashflow_group_id?: string | null;
  cashflowGroup?: string | null;
  allocation_type?: AllocationType | null;
}

export interface DayType {
  id: string;
  name?: string;
  label: string;
  color?: string | null;
  order_index?: number;
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
  [key: string]: any;
}

export interface BackupFileInfo {
  name: string;
  size: number;
  createdAt: string | Date;
}

export interface GroupedPeriodOption {
  months: Set<string>;
  quarters: Set<string>;
  halves: Set<string>;
}

export interface GroupedOptions {
  yearsMap: Record<string, GroupedPeriodOption>;
  sortedYears: string[];
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastState {
  id: number;
  message: string;
  type: ToastType;
}

export interface ToastContextValue {
  toast: ToastState | null;
  showToast: (message: string, type?: ToastType) => void;
}

// ─── Phase 3 Context Interfaces ───

export interface QuickAddFormData {
  type: string;
  date: string;
  category: string;
  description: string;
  amount: string;
}

export interface AppUIContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hideFixedExpenses: boolean;
  setHideFixedExpenses: React.Dispatch<React.SetStateAction<boolean>>;
  hideWantExpenses: boolean;
  setHideWantExpenses: React.Dispatch<React.SetStateAction<boolean>>;
  dashboardCategory: string[];
  setDashboardCategory: React.Dispatch<React.SetStateAction<string[]>>;
  chartGroupBy: string;
  setChartGroupBy: React.Dispatch<React.SetStateAction<string>>;
  topXLimit: number;
  setTopXLimit: React.Dispatch<React.SetStateAction<number>>;
  showAddModal: boolean;
  setShowAddModal: (show: boolean) => void;
  showExportModal: boolean;
  setShowExportModal: (show: boolean) => void;
  showImportGuide: boolean;
  setShowImportGuide: (show: boolean) => void;
  addForm: QuickAddFormData;
  setAddForm: React.Dispatch<React.SetStateAction<QuickAddFormData>>;
  handleOpenAddModal: (dateStr?: string, type?: string) => void;
}

export interface AppDataContextValue {
  transactions: TransactionDisplay[];
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  cashflowGroups: CashflowGroup[];
  setCashflowGroups: React.Dispatch<React.SetStateAction<CashflowGroup[]>>;
  dayTypes: Record<string, string>;
  setDayTypes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  dayTypeConfig: DayType[];
  setDayTypeConfig: React.Dispatch<React.SetStateAction<DayType[]>>;
  frequentItems: FrequentItem[];
  summaryData: any;
  dbStatus: string;
  isProcessing: boolean;
  isCsvProcessing: boolean;
  importPreview: any;
  setImportPreview: (preview: any) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  masterPeriods: string[];
  // CRUD Actions
  refreshData: () => Promise<void>;
  loadPeriodData: (period: string) => Promise<void>;
  handleSaveTransaction: (tx: any) => Promise<any>;
  handleUpdateTransaction: (id: string, field: string, value: any) => Promise<void>;
  handleDeleteTransaction: (id: string) => Promise<any>;
  handleDeleteMonth: (month: string) => Promise<boolean>;
  handleDeleteAllData: (opts?: any) => Promise<void>;
  handleSaveBatch: (items: any[]) => Promise<void>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  confirmImport: (opts?: any) => Promise<void>;
  handleCategoryChange: (catId: string, field: string, value: any) => Promise<void>;
  handleDeleteCategory: (id: string) => Promise<void>;
  handleAddCategory: (type?: string) => Promise<any>;
  handleMoveCategory: (id: string, direction: string) => Promise<void>;
  handleDayTypeChange: (dateStr: string, type: string) => Promise<void>;
  handleDayTypeConfigChange: (id: string, field: string, value: any) => Promise<void>;
  handleAddDayType: () => Promise<void>;
  handleDeleteDayType: (id: string) => Promise<void>;
  handleMoveDayType: (id: string, direction: 'UP' | 'DOWN') => Promise<void>;
  handleUpdateCashflowGroup: (group: any) => Promise<void>;
  handleAddCashflowGroup: () => Promise<void>;
  handleDeleteCashflowGroup: (id: string) => Promise<void>;
  handleMoveCashflowGroup: (id: string, direction: 'UP' | 'DOWN') => Promise<void>;
}

export interface AppFilterContextValue {
  filterPeriod: string;
  setFilterPeriod: (period: string) => void;
  excludeFuture: boolean;
  handleToggleExcludeFuture: () => void;
  masterPeriods: string[];
  groupedOptions: GroupedOptions;
  rawAvailableMonths: string[];
  isReadOnlyView: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isFilterActive: boolean;
  clearFilters: () => void;
  displayTransactions: TransactionDisplay[];
  dashboardTransactions: TransactionDisplay[];
  analytics: any;
  allDatesInPeriod: string[];
  availableDatesInPeriod: string[];
  advancedFilterCategory: string | string[];
  setAdvancedFilterCategory: (category: string | string[]) => void;
  advancedFilterGroup: string;
  setAdvancedFilterGroup: (group: string) => void;
  advancedFilterDate: string;
  setAdvancedFilterDate: (date: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  allocationFilter: string;
  setAllocationFilter: (alloc: string) => void;
  minAmount: string;
  setMinAmount: (amount: string) => void;
  maxAmount: string;
  setMaxAmount: (amount: string) => void;
  dayTypeFilter: string;
  setDayTypeFilter: (filter: string) => void;
  activeCashflowGroupIds: Set<string>;
  activeCategoryNames: Set<string>;
  getFilterLabel: (period?: string) => string;
}
