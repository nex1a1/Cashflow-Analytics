// src/views/Dashboard/components/MainChart/helpers.ts
import { LegendDataset } from './types';

import { tc } from '@/constants/theme';
// ==========================================
// TITLE & CONTRAST HELPERS
// ==========================================

export function getMainChartTitle(chartViewType: string, mainChartType?: string, isBreakdown?: boolean): string {
  if (chartViewType === 'sankey') {
    return 'โครงสร้างกระแสเงินสด';
  }
  if (chartViewType === 'multiples') {
    return 'เทรนด์รายหมวด';
  }
  if (isBreakdown) {
    return 'แจกแจงรายจ่ายตามหมวดหมู่';
  }
  // Only the true 3-series (Income + Expense + Net Cashflow) view earns the "analysis" title —
  // a single expense-only series ('daily-expense') has no income/net context to analyze.
  if (mainChartType === 'combo') {
    return 'วิเคราะห์กระแสเงินสด';
  }
  if (mainChartType === 'daily-expense') {
    return 'รายจ่ายรายวัน';
  }
  if (mainChartType === 'bar') {
    return 'เทรนด์เปรียบเทียบ';
  }
  return 'เปรียบเทียบรายจ่ายตามหมวดหมู่';
}

export interface ChartViewOption {
  id: string;
  label: string;
  disabled?: boolean;
  title?: string;
}

export const ALL_CHART_VIEWS = [
  { id: 'line', label: 'เส้น' },
  { id: 'bar', label: 'แท่ง' },
  { id: 'sankey', label: 'Sankey' },
  { id: 'multiples', label: 'Sparkline' },
] as const;

export function getAvailableChartViews(isSingleMonth: boolean): ChartViewOption[] {
  return ALL_CHART_VIEWS.map(v => {
    if (v.id === 'multiples' && isSingleMonth) {
      return {
        ...v,
        disabled: true,
        title: 'ต้องเลือกช่วงเวลามากกว่า 1 เดือน เพื่อดู Sparkline',
      };
    }
    return { ...v, disabled: false };
  });
}

export const getContrastTextColor = (hexColor: string | null | undefined): string => {
  if (!hexColor) return '#ffffff';
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return '#ffffff';
  const r = Number.parseInt(hex.substring(0, 2), 16);
  const g = Number.parseInt(hex.substring(2, 4), 16);
  const b = Number.parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 145 ? tc('surface') : '#ffffff';
};

// ==========================================
// LEGEND HELPERS
// ==========================================

export function updateActiveCategories(catName: string, activeCats: string[], allCatNames: string[]): string[] {
  const base = activeCats.includes('ALL') ? [...allCatNames] : [...activeCats];
  const next = base.includes(catName) ? base.filter(c => c !== catName) : [...base, catName];
  return (next.length === 0 || next.length === allCatNames.length) ? ['ALL'] : next;
}

export function getDatasetIndicatorStyle(ds: LegendDataset) {
  const isLine = ds.type === 'line';
  return {
    width: isLine ? 16 : 10,
    height: isLine ? 3 : 10,
    backgroundColor: isLine
      ? (ds.borderColor || ds.backgroundColor || tc('ink-muted'))
      : (ds.backgroundColor || ds.borderColor || tc('ink-muted')),
  };
}
