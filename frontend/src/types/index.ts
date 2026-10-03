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
  asset_id?: string | null; // หมวดลงทุน/ออม: สินทรัพย์ที่ซื้อ/ขาย
  units?: number | null;
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
  asset_id?: string | null;
  units?: number | null;
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
  allocation_type: AllocationType | null;
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
  isDefault?: boolean;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  day_type_id: string;
  note?: string | null;
  note_icon?: string | null;
}

/** โน้ตประจำวัน: icon = key ใน CATEGORY_ICON_MAP, '' = ใช้ไอคอนตั้งต้น (DEFAULT_NOTE_ICON) */
export interface DayNote {
  text: string;
  icon: string;
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
  /** เปิดฟอร์มจากหน้าพอร์ต: เลือกสินทรัพย์ + ซื้อ/ขาย ไว้ให้ */
  assetId?: string;
  side?: 'buy' | 'sell';
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
  /** เปิดฟอร์มบันทึกในหมวดลงทุน/ออม โดยเลือกสินทรัพย์และซื้อ/ขายไว้ให้ */
  handleOpenTradeModal: (assetId: string, side: 'buy' | 'sell') => void;
}

export interface AppDataContextValue {
  transactions: TransactionDisplay[];
  totalCount: number;
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
  handleUpdateTransaction: (id: string, field: string, value: any) => Promise<boolean>;
  handleDeleteTransaction: (id: string) => Promise<any>;
  handleDeleteMonth: (month: string) => Promise<boolean>;
  handleDeleteAllData: (opts?: any) => Promise<void>;
  handleSaveBatch: (items: any[]) => Promise<void>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  confirmImport: (opts?: any) => Promise<void>;
  handleCategoryChange: (catId: string, field: string, value: any) => Promise<boolean | void>;
  handleDeleteCategory: (id: string) => Promise<void>;
  handleAddCategory: (type?: string) => Promise<any>;
  handleMoveCategory: (id: string, direction: string) => Promise<void>;
  handleDayTypeChange: (dateStr: string, type: string) => Promise<void>;
  /** โน้ตประจำวัน (วันละ 1 อัน) — มีเฉพาะวันที่เคยจด; text '' = ลบโน้ต (ไอคอนหายตาม), คืน false เมื่อบันทึกไม่สำเร็จ (rollback แล้ว) */
  dayNotes: Record<string, DayNote>;
  handleDayNoteChange: (dateStr: string, text: string, icon: string) => Promise<boolean>;
  handleDayTypeConfigChange: (id: string, field: string, value: any) => Promise<boolean | void>;
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
  masterPeriods: string[];
  groupedOptions: GroupedOptions;
  rawAvailableMonths: string[];
  isReadOnlyView: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isFilterActive: boolean;
  clearFilters: () => void;
  displayTransactions: TransactionDisplay[];
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


// ─── Investment portfolio ───

export type AssetKind = 'gold_bar' | 'gold_ornament' | 'us_stock' | 'th_stock' | 'crypto' | 'fund' | 'other';

export interface PortfolioTrade {
  id: string;
  date: string;
  side: 'buy' | 'sell';
  units: number;
  amount: number; // Baht (absolute)
  pricePerUnit: number;
  description: string;
}

export interface PortfolioAsset {
  id: string;
  name: string;
  kind: AssetKind;
  symbol: string | null;
  unitLabel: string | null;
  autoPrice: boolean;
  units: number;
  cost: number;
  avgCostPerUnit: number | null;
  price: number | null;
  priceAt: string | null; // ISO
  priceSource: string | null;
  marketValue: number | null;
  unrealized: number | null;
  unrealizedPct: number | null;
  realized: number;
  oversold: boolean;
  trades: PortfolioTrade[];
}

export interface PortfolioSnapshot {
  date: string; // YYYY-MM-DD
  marketValue: number;
  cost: number;
}

export interface Portfolio {
  assets: PortfolioAsset[];
  totals: {
    /** ต้นทุนที่ถืออยู่ของสินทรัพย์ที่มีราคา (เทียบกับ marketValue ได้ตรงๆ) */
    cost: number;
    marketValue: number;
    unrealized: number;
    realized: number;
    /** เงินที่ซื้อสะสมทั้งหมด (ก่อนหักที่ขาย) — ฐานของ % ผลตอบแทนรวม */
    bought: number;
    unpricedCount: number;
    /** ต้นทุนของสินทรัพย์ที่ยังไม่มีราคา (ไม่รวมใน cost/marketValue) */
    unpricedCost: number;
    oldestPriceAt: string | null;
  };
  generalSavings: number;
  /** มูลค่าพอร์ตรายวันที่ระบบจดไว้ (เก่า → ใหม่) */
  history: PortfolioSnapshot[];
}

export interface AssetInput {
  id?: string;
  name: string;
  kind: AssetKind;
  symbol?: string | null;
  unit_label?: string | null;
}

export type PricePreview =
  | { ok: true; price: number; source: string }
  | { ok: false; manual?: boolean; error: string };

export interface PriceRefreshResult {
  assetId: string;
  ok: boolean;
  message?: string;
}
