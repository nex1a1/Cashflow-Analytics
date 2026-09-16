// src/views/Dashboard/components/MainChart/types.ts
import React from 'react';
import { Category } from '@/types';

export interface ChartGroupBySwitcherProps {
  chartGroupBy: string;
  setChartGroupBy: (v: string) => void;
}

export interface ViewTypeSwitcherProps {
  chartViewType: string;
  setChartViewType: (v: string) => void;
  setIsBreakdown: (v: boolean | ((prev: boolean) => boolean)) => void;
}

export interface SankeyControlsProps {
  sankeyMode: string;
  setSankeyMode: (v: string) => void;
  sankeySortMode: string;
  setSankeySortMode: (v: string) => void;
  showSkeleton?: boolean;
}

export interface MainChartHeaderProps {
  chartViewType: string;
  setChartViewType: (v: string) => void;
  chartGroupBy: string;
  setChartGroupBy: (v: string) => void;
  setIsBreakdown: (v: boolean | ((prev: boolean) => boolean)) => void;
  filterPeriod: string;
  mainChartType?: string;
  isBreakdown: boolean;
}

export interface MainChartCategorySelectorProps {
  dashboardCategory: string | string[];
  setDashboardCategory: (v: string[]) => void;
  categories: Category[];
  categoriesWithData: Set<string>;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}

export interface MainChartFilterMenuProps {
  showSkeleton?: boolean;
  showCatMenu: boolean;
  setShowCatMenu: (v: boolean | ((prev: boolean) => boolean)) => void;
  filterMenuRef: React.RefObject<HTMLDivElement>;
  dashboardCategory: string | string[];
  setDashboardCategory: (v: string[]) => void;
  categories: Category[];
  categoriesWithData: Set<string>;
  isLogScale: boolean;
  setIsLogScale: (v: boolean | ((prev: boolean) => boolean)) => void;
  hideFixedExpenses: boolean;
  setHideFixedExpenses: (v: boolean) => void;
  hideWantExpenses: boolean;
  setHideWantExpenses: (v: boolean) => void;
}

export interface BreakdownLegendItemProps {
  category: Category;
  isActive: boolean;
  onToggle: (catName: string) => void;
}

export interface BreakdownLegendProps {
  categories: Category[];
  categoriesWithData: Set<string>;
  dashboardCategory: string | string[];
  setDashboardCategory: (v: string[]) => void;
}

export interface LegendDataset {
  label?: string;
  type?: string;
  borderColor?: string;
  backgroundColor?: string;
  data?: number[];
  [key: string]: any;
}

export interface StandardLegendItemProps {
  dataset: LegendDataset;
  isHidden: boolean;
  onToggle: (label: string) => void;
}

export interface StandardLegendProps {
  legendDatasets: LegendDataset[];
  hiddenDatasets: string[];
  setHiddenDatasets: React.Dispatch<React.SetStateAction<string[]>>;
}

export interface MainChartLegendProps {
  legendDatasets: LegendDataset[];
  hiddenDatasets: string[];
  setHiddenDatasets: React.Dispatch<React.SetStateAction<string[]>>;
  isBreakdown: boolean;
  dashboardCategory: string | string[];
  setDashboardCategory: (v: string[]) => void;
  categories: Category[];
  categoriesWithData: Set<string>;
}

export interface ToolbarToggleSwitchProps {
  isActive: boolean;
  activeColor?: string;
}

export interface ToolbarViewModesProps {
  showSkeleton?: boolean;
  isBreakdown: boolean;
  setIsBreakdown: (v: boolean | ((prev: boolean) => boolean)) => void;
}

export interface ToolbarAllocationSelectorProps {
  showSkeleton?: boolean;
  hideFixedExpenses: boolean;
  setHideFixedExpenses: (v: boolean) => void;
  hideWantExpenses: boolean;
  setHideWantExpenses: (v: boolean) => void;
}

export interface ToolbarLineStyleSelectorProps {
  showSkeleton?: boolean;
  isSmoothLine: boolean;
  setIsSmoothLine: (v: boolean) => void;
}

export interface MainChartToolbarProps {
  chartViewType: string;
  mainChartType?: string;
  showSkeleton?: boolean;
  isBreakdown: boolean;
  setIsBreakdown: (v: boolean | ((prev: boolean) => boolean)) => void;
  isLogScale: boolean;
  setIsLogScale: (v: boolean | ((prev: boolean) => boolean)) => void;
  hideFixedExpenses: boolean;
  setHideFixedExpenses: (v: boolean) => void;
  hideWantExpenses: boolean;
  setHideWantExpenses: (v: boolean) => void;
  isSmoothLine: boolean;
  setIsSmoothLine: (v: boolean) => void;
  sankeyMode: string;
  setSankeyMode: (v: string) => void;
  sankeySortMode: string;
  setSankeySortMode: (v: string) => void;
  showCatMenu: boolean;
  setShowCatMenu: (v: boolean | ((prev: boolean) => boolean)) => void;
  filterMenuRef: React.RefObject<HTMLDivElement>;
  dashboardCategory: string | string[];
  setDashboardCategory: (v: string[]) => void;
  categories: Category[];
  categoriesWithData: Set<string>;
}
