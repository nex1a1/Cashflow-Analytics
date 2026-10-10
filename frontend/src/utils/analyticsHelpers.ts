// src/utils/analyticsHelpers.ts
import { parseDateStrToObj } from './dateHelpers';
import { getThaiMonth, hexToRgb } from './formatters';
import { Category, DayType } from '../types';
import { isSingleUnitPeriod } from './payCycle';
import { resolveDefaultDayTypeId } from '../views/Calendar/utils/calendarPeriodHelpers';

import { tc } from '@/constants/theme';
/**
 * Creates a map of category names to category objects for fast lookup.
 */
export const createCategoryMap = (categories: Category[]): Record<string, Category> => 
  categories.reduce((acc: Record<string, Category>, cat: Category) => { 
    acc[cat.name] = cat; 
    acc[cat.id] = cat; 
    return acc; 
  }, {});

export interface CashflowMonthData {
  monthStr: string;
  totalExp: number;
  income: number;
  totalSav: number;
  groups: Record<string, number>;
}

interface MainChartDataParams {
  chartGroupBy: 'daily' | 'monthly';
  filterPeriod: string;
  sortedMonthsKeys: string[];
  cashflowMap: Record<string, CashflowMonthData>;
  datesInPeriod: string[];
  dailyAllMap: Record<string, number>;
  hideFixedExpenses: boolean;
  hideWantExpenses: boolean;
  dashboardCategory: string | string[];
  monthlyAllMap: Record<string, number>;
  monthlyCatMap: Record<string, Record<string, number>>;
  dailyCatMap: Record<string, Record<string, number>>;
  catMap: Record<string, Category>;
}

function getAllDatasetStyle(hideFixedExpenses: boolean, hideWantExpenses: boolean) {
  if (hideFixedExpenses) {
    return {
      label: 'รายจ่ายตามใจ (บาท)',
      borderColor: tc('expense'),
      backgroundColor: tc('expense', 0.1),
    };
  }
  if (hideWantExpenses) {
    return {
      label: 'รายจ่ายจำเป็น (บาท)',
      borderColor: tc('alloc-need'),
      backgroundColor: tc('alloc-need', 0.1),
    };
  }
  return {
    label: 'รายจ่ายรวมทั้งหมด (บาท)',
    borderColor: tc('expense'),
    backgroundColor: tc('expense', 0.1),
  };
}

function buildAllCategoryDataset(params: {
  activeCatsCount: number;
  showMonthly: boolean;
  isSingleMonthView: boolean;
  sortedMonthsKeys: string[];
  datesInPeriod: string[];
  monthlyAllMap: Record<string, number>;
  dailyAllMap: Record<string, number>;
  hideFixedExpenses: boolean;
  hideWantExpenses: boolean;
}) {
  const {
    activeCatsCount,
    showMonthly,
    isSingleMonthView,
    sortedMonthsKeys,
    datesInPeriod,
    monthlyAllMap,
    dailyAllMap,
    hideFixedExpenses,
    hideWantExpenses,
  } = params;

  const style = getAllDatasetStyle(hideFixedExpenses, hideWantExpenses);
  const data = showMonthly
    ? sortedMonthsKeys.map(m => monthlyAllMap[m] || 0)
    : datesInPeriod.map(d => dailyAllMap[d] || 0);

  return {
    label: style.label,
    data,
    borderColor: style.borderColor,
    backgroundColor: style.backgroundColor,
    borderWidth: activeCatsCount > 1 ? 3 : 2,
    borderDash: activeCatsCount > 1 ? [5, 5] : [],
    fill: activeCatsCount === 1,
    tension: 0.3,
    pointRadius: isSingleMonthView ? 3 : 0,
    pointHitRadius: 10,
  };
}

function buildSpecificCategoryDataset(
  catName: string,
  params: {
    activeCatsCount: number;
    showMonthly: boolean;
    isSingleMonthView: boolean;
    sortedMonthsKeys: string[];
    datesInPeriod: string[];
    monthlyCatMap: Record<string, Record<string, number>>;
    dailyCatMap: Record<string, Record<string, number>>;
    catMap: Record<string, Category>;
  }
) {
  const {
    activeCatsCount,
    showMonthly,
    isSingleMonthView,
    sortedMonthsKeys,
    datesInPeriod,
    monthlyCatMap,
    dailyCatMap,
    catMap,
  } = params;

  const catObj: Partial<Category> = catMap[catName] || {};
  const catId = catObj.id || catName;
  const catColor = catObj.color || tc('ink-muted');

  const data = showMonthly
    ? sortedMonthsKeys.map(m => monthlyCatMap[catId]?.[m] || 0)
    : datesInPeriod.map(d => dailyCatMap[catId]?.[d] || 0);

  const pointRadius = (isSingleMonthView || showMonthly) ? 3 : 0;

  return {
    label: catName,
    data,
    borderColor: catColor,
    backgroundColor: `rgba(${hexToRgb(catColor)}, 0.1)`,
    borderWidth: 2,
    fill: activeCatsCount === 1,
    tension: 0.3,
    pointRadius,
    pointHitRadius: 10,
  };
}

const buildCategoryDataset = (
  catName: string,
  params: {
    activeCatsCount: number;
    showMonthly: boolean;
    isSingleMonthView: boolean;
    sortedMonthsKeys: string[];
    datesInPeriod: string[];
    monthlyAllMap: Record<string, number>;
    dailyAllMap: Record<string, number>;
    monthlyCatMap: Record<string, Record<string, number>>;
    dailyCatMap: Record<string, Record<string, number>>;
    hideFixedExpenses: boolean;
    hideWantExpenses: boolean;
    catMap: Record<string, Category>;
  }
) => {
  if (catName === 'ALL') {
    return buildAllCategoryDataset(params);
  }
  return buildSpecificCategoryDataset(catName, params);
};

const buildMainChartXLabels = (
  showMonthly: boolean,
  isSingleMonthView: boolean,
  sortedMonthsKeys: string[],
  datesInPeriod: string[]
): string[] => {
  if (showMonthly) {
    return sortedMonthsKeys.map(m => getThaiMonth(m));
  }
  if (isSingleMonthView) {
    return datesInPeriod.map(d => {
      const parts = d.split('-');
      return parts.length === 3 ? `วันที่ ${parts[2]}` : d;
    });
  }
  return datesInPeriod.map(d => {
    const parts = d.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
  });
};

const buildMonthlyComboChartData = (
  xLabels: string[],
  sortedMonthsKeys: string[],
  cashflowMap: Record<string, CashflowMonthData>
) => ({
  labels: xLabels,
  datasets: [
    { type: 'line', label: 'Cashflow', data: sortedMonthsKeys.map(m => (cashflowMap[m]?.income || 0) - (cashflowMap[m]?.totalExp || 0)), borderColor: tc('ink-display'), backgroundColor: tc('ink-display'), borderWidth: 4, pointRadius: 5, pointBackgroundColor: tc('ink-display'), pointBorderWidth: 2 },
    { type: 'bar', label: 'รายรับ', data: sortedMonthsKeys.map(m => cashflowMap[m]?.income || 0), backgroundColor: tc('income'), borderColor: tc('income'), borderRadius: 0 },
    { type: 'bar', label: 'รายจ่ายรวม', data: sortedMonthsKeys.map(m => cashflowMap[m]?.totalExp || 0), backgroundColor: tc('accent'), borderColor: tc('accent'), borderRadius: 0 },
  ],
});

const buildDailyComboChartData = (
  xLabels: string[],
  datesInPeriod: string[],
  dailyAllMap: Record<string, number>,
  hideFixedExpenses: boolean,
  hideWantExpenses: boolean
) => {
  let barLabel = 'รายจ่ายจริง';
  let barBg = tc('accent');
  let barBorder = tc('accent');
  if (hideFixedExpenses) {
    barLabel = 'รายจ่ายตามใจ';
    barBg = tc('warn');
    barBorder = tc('warn');
  } else if (hideWantExpenses) {
    barLabel = 'รายจ่ายจำเป็น';
    barBg = tc('ink-body');
    barBorder = tc('ink-body');
  }

  return {
    labels: xLabels,
    datasets: [
      {
        type: 'bar',
        label: barLabel,
        data: datesInPeriod.map(d => dailyAllMap[d] || 0),
        backgroundColor: barBg,
        borderColor: barBorder,
        borderWidth: 2,
        borderRadius: 0,
        order: 1
      }
    ]
  };
};

/**
 * Generates datasets for the main dashboard chart (Combo or Line).
 */
export const generateMainChartData = ({
  chartGroupBy, filterPeriod, sortedMonthsKeys, cashflowMap, 
  datesInPeriod, dailyAllMap, hideFixedExpenses, hideWantExpenses,
  dashboardCategory, monthlyAllMap, monthlyCatMap, dailyCatMap, catMap
}: MainChartDataParams) => {
  const isSingleMonthView = isSingleUnitPeriod(filterPeriod);
  const showMonthly = !isSingleMonthView && chartGroupBy === 'monthly';
  const activeCats = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];
  const isOnlyAll = activeCats.length === 1 && activeCats[0] === 'ALL';

  const xLabels = buildMainChartXLabels(showMonthly, isSingleMonthView, sortedMonthsKeys, datesInPeriod);

  if (showMonthly && isOnlyAll && !hideFixedExpenses && !hideWantExpenses) {
    return {
      chartType: 'combo',
      chartData: buildMonthlyComboChartData(xLabels, sortedMonthsKeys, cashflowMap),
    };
  }

  if (!showMonthly && isOnlyAll) {
    return {
      // A single expense-only series is not a Cashflow "analysis" (no income/net context) —
      // tag it distinctly from the true multi-series combo so the title never over-promises.
      chartType: 'daily-expense',
      chartData: buildDailyComboChartData(xLabels, datesInPeriod, dailyAllMap, hideFixedExpenses, hideWantExpenses),
    };
  }

  const datasets = activeCats.map(catName =>
    buildCategoryDataset(catName, {
      activeCatsCount: activeCats.length,
      showMonthly,
      isSingleMonthView,
      sortedMonthsKeys,
      datesInPeriod,
      monthlyAllMap,
      dailyAllMap,
      monthlyCatMap,
      dailyCatMap,
      hideFixedExpenses,
      hideWantExpenses,
      catMap,
    })
  );

  return {
    chartType: 'line',
    chartData: { labels: xLabels, datasets }
  };
};

/**
 * Calculates day type distribution for the activity timeline.
 */
export const calculateDayTypeCounts = (
  datesInPeriod: string[],
  dayTypes: Record<string, string>,
  dayTypeConfig: DayType[]
): Record<string, number> => {
  const dayTypeCounts: Record<string, number> = {};
  dayTypeConfig.forEach(dt => { dayTypeCounts[dt.id] = 0; });
  
  datesInPeriod.forEach(dateStr => { // YYYY-MM-DD (generateDatesForPeriod)
    const dayOfWeek = parseDateStrToObj(dateStr).getDay();
    // same rule as the calendar / day modal (by name code, so re-ordering day types in Settings can't flip it)
    const currentType = dayTypes[dateStr] || resolveDefaultDayTypeId(dayTypeConfig, dayOfWeek === 0 || dayOfWeek === 6);
    if (currentType) dayTypeCounts[currentType] = (dayTypeCounts[currentType] || 0) + 1;
  });

  return dayTypeCounts;
};
