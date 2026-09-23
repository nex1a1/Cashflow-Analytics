// src/views/Dashboard/components/CashflowTable/types.ts
import React from 'react';
import type { DashboardAnalyticsResult } from '../../context/DashboardContext';
import { CashflowGroup, Category } from '@/types';

export interface MonthRow {
  monthStr: string;
  groups: Record<string, number>;
}

/** Alias — DashboardAnalyticsResult carries sortedCashflow / numMonths / monthlyCatMap via its index signature */
export type Analytics = DashboardAnalyticsResult;

export interface HoveredGroupState {
  active: boolean;
  x: number;
  y: number;
  type?: 'group' | 'category';
  group: CashflowGroup;
  category?: Category;
  activeCats?: Category[];
}

export type MonthlyMap = Record<string, Record<string, number>>;

// ─── Calculation helper param types ────────────────────────────────────────────

export interface AdjustedGroupValueParams {
  groupId: string;
  row: MonthRow;
  excludedCategories: Set<string>;
  categories: Category[];
  filteredGroupMap: MonthlyMap;
  filteredCatMap: MonthlyMap;
  analytics: Analytics;
}

export interface AdjustedTotalParams {
  groups: CashflowGroup[];
  row: MonthRow | null;
  excludedGroups: Set<string>;
  excludedCategories: Set<string>;
  categories: Category[];
  filteredGroupMap: MonthlyMap;
  filteredCatMap: MonthlyMap;
  analytics: Analytics;
}

export interface ActiveMonthGroupTotalParams {
  groupId: string;
  activeMonths: MonthRow[];
  categories: Category[];
  excludedCategories: Set<string>;
  filteredGroupMap: MonthlyMap;
  filteredCatMap: MonthlyMap;
  analytics: Analytics;
}

// ─── Shared prop types ─────────────────────────────────────────────────────────

export interface BorderClasses {
  thinBorder: string;
  boundaryBorder: string;
  boxBorder: string;
}

export interface CommonTableProps extends BorderClasses {
  activeIncomeGroups: CashflowGroup[];
  activeExpenseGroups: CashflowGroup[];
  expandedGroups: Set<string>;
  toggleGroup: (groupId: string) => void;
  getActiveCatsForGroup: (groupId: string) => Category[];
  analytics: Analytics;
  dm: boolean | undefined;
  handleMouseEnter: (e: React.MouseEvent<HTMLElement>, group: CashflowGroup) => void;
  handleCategoryMouseEnter?: (e: React.MouseEvent<HTMLElement>, group: CashflowGroup, category: Category) => void;
  handleMouseLeave: () => void;
  hoveredCol: string | null;
  setHoveredCol: (col: string | null) => void;
  excludedMonths: Set<string>;
  toggleMonth: (monthStr: string) => void;
  excludedGroups: Set<string>;
  toggleGroupExclusion: (groupId: string) => void;
  excludedCategories: Set<string>;
  toggleCategoryExclusion: (catId: string) => void;
  categories: Category[];
  filteredCatMap: MonthlyMap;
  filteredGroupMap: MonthlyMap;
  isCycleMode: boolean;
}

export interface HeaderProps extends Omit<CommonTableProps, 'excludedMonths' | 'toggleMonth'> {
  // no additional props needed
}

export interface GroupCellsProps extends BorderClasses {
  g: CashflowGroup;
  idx: number;
  isLastGroup: boolean;
  isIncome: boolean;
  expandedGroups: Set<string>;
  getActiveCatsForGroup: (groupId: string) => Category[];
  row: MonthRow;
  excludedGroups: Set<string>;
  excludedCategories: Set<string>;
  categories: Category[];
  filteredGroupMap: MonthlyMap;
  filteredCatMap: MonthlyMap;
  analytics: Analytics;
  hoveredCol: string | null;
  setHoveredCol: (col: string | null) => void;
  isRowHovered: boolean;
  dm: boolean | undefined;
  isExcluded: boolean;
}

export interface SummaryTrendCellProps {
  isExcluded: boolean;
  isTrendHovered: boolean;
  isRowHovered: boolean;
  thinBorder: string;
  currentAdjustedExpense: number;
  prevAdjustedExpense: number;
  onHover: (col: string | null) => void;
}

export interface SummaryNetCellProps {
  isExcluded: boolean;
  isNetHovered: boolean;
  isRowHovered: boolean;
  thinBorder: string;
  netAmount: number;
  onHover: (col: string | null) => void;
}

export interface SummaryPctLeftCellProps {
  isExcluded: boolean;
  isPctLeftHovered: boolean;
  isRowHovered: boolean;
  thinBorder: string;
  currentAdjustedIncome: number;
  netAmount: number;
  onHover: (col: string | null) => void;
}

export interface SummaryPctSpentCellProps {
  isExcluded: boolean;
  isPctSpentHovered: boolean;
  isRowHovered: boolean;
  thinBorder: string;
  currentAdjustedIncome: number;
  currentAdjustedExpense: number;
  onHover: (col: string | null) => void;
}

export interface RowSummaryCellsProps {
  currentAdjustedIncome: number;
  currentAdjustedExpense: number;
  prevAdjustedExpense: number;
  isExcluded: boolean;
  isRowHovered: boolean;
  hoveredCol: string | null;
  setHoveredCol: (col: string | null) => void;
  thinBorder: string;
}

export interface RowProps extends CommonTableProps {
  row: MonthRow;
  isRowHovered: boolean;
  setHoveredRow: (monthStr: string | null) => void;
  isExcluded: boolean;
  isPartial: boolean;
}

export interface FooterProps extends Omit<CommonTableProps, 'toggleMonth' | 'toggleGroupExclusion' | 'toggleCategoryExclusion' | 'handleMouseEnter' | 'handleMouseLeave'> {
  // no additional props
}

export interface FilterToolbarProps {
  isFilterBarOpen: boolean;
  setIsFilterBarOpen: (updater: (prev: boolean) => boolean) => void;
  excludedAllocations: Set<string>;
  toggleAllocationFilter: (allocType: string) => void;
  resetFilters: () => void;
  totalExcludedCount: number;
}
