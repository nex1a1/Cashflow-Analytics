// src/utils/analyticsHelpers.ts
import { isDateInFilter, parseDateStrToObj } from './dateHelpers';
import { getThaiMonth, hexToRgb, formatMoney } from './formatters';

/**
 * Creates a map of category names to category objects for fast lookup.
 */
export const createCategoryMap = (categories: any[]): Record<string, any> => 
  categories.reduce((acc: any, cat: any) => { 
    acc[cat.name] = cat; 
    acc[cat.id] = cat; 
    return acc; 
  }, {});

export interface CashflowTotals {
  income: number;
  expense: number;
  savings: number;
  weekend: number;
  weekday: number;
  food: number;
  fixed: number;
  variable: number;
  rent: number;
  it: number;
  invest: number;
  dayOfWeekMap: Record<number, number>;
}

export interface CashflowMonthData {
  monthStr: string;
  totalExp: number;
  income: number;
  totalSav: number;
  groups: Record<string, number>;
}

export const extractYearMonth = (dateStr: string): string | null => {
  if (!dateStr) return null;
  let y: string, m: string;
  if (dateStr.includes('-')) {
    [y, m] = dateStr.split('-');
  } else {
    const parts = dateStr.split('/');
    if (parts.length < 3) return null;
    [y, m] = [parts[2], parts[1]];
  }
  return (y && m) ? `${y}-${m.padStart(2, '0')}` : null;
};

const accumulateExpenseTotals = (
  amt: number,
  itemDate: string,
  groupName: string,
  isFixed: boolean,
  totals: CashflowTotals
) => {
  totals.expense += amt;
  const dateObj = parseDateStrToObj(itemDate);
  const dayOfWeek = dateObj.getDay();

  if (dayOfWeek === 0 || dayOfWeek === 6) totals.weekend += amt;
  else totals.weekday += amt;

  totals.dayOfWeekMap[dayOfWeek] += amt;

  const isRent = groupName.includes('หอ') || groupName.includes('ที่พัก') || groupName.includes('rent') || groupName.includes('เช่า');
  const isFood = groupName.includes('กิน') || groupName.includes('อาหาร') || groupName.includes('food');
  const isIT   = groupName.includes('คอม') || groupName.includes('ไอที') || groupName.includes('it');
  const isInv  = groupName.includes('ลงทุน') || groupName.includes('ออม') || groupName.includes('invest');

  if (isRent) totals.rent += amt;
  else if (isFood) totals.food += amt;
  else if (isIT) totals.it += amt;
  else if (isInv) totals.invest += amt;

  if (isFixed) totals.fixed += amt;
  else totals.variable += amt;
};

const resolveCashflowContext = (item: any, catMap: Record<string, any>, cashflowGroups: any[]) => {
  const catObj = catMap[item.category] || { type: 'expense', cashflowGroup: null, allocation_type: 'want' };
  const cGroupId = catObj.cashflowGroup || catObj.cashflow_group_id;
  const groupObj = cashflowGroups?.find(g => g.id === cGroupId) || {};
  const groupType = groupObj.type || catObj.type || 'expense';
  const groupName = (groupObj.name || '').toLowerCase();

  const isInc = groupType === 'income';
  const isSav = groupType === 'savings';

  const fallbackIncId = cashflowGroups?.find(g => g.type === 'income')?.id || 'cg_bonus';
  const fallbackSavId = cashflowGroups?.find(g => g.type === 'savings')?.id || 'cg_savings';
  const fallbackExpId = cashflowGroups?.find(g => g.type === 'expense')?.id || 'cg_variable';

  let cGroup = cGroupId;
  if (!cGroup) {
    if (isInc) cGroup = fallbackIncId;
    else if (isSav) cGroup = fallbackSavId;
    else cGroup = fallbackExpId;
  }
  const isFixed = (item.allocation_type || groupObj.allocation_type || catObj.allocation_type) === 'need';

  return { isInc, isSav, cGroup, isFixed, groupName };
};

/**
 * Groups and aggregates transaction data into a cashflow map by month.
 */
export const generateCashflowMap = (
  transactions: any[],
  filterPeriod: string,
  catMap: Record<string, any>,
  cashflowGroups: any[]
) => {
  const filteredTx = transactions.filter(t => isDateInFilter(t.date, filterPeriod));
  const uniqueMonthsSet = new Set<string>();
  const cashflowMap: Record<string, CashflowMonthData> = {};
  const dayIncomeMap: Record<string, number> = {};
  const dayExpenseMap: Record<string, number> = {};
  
  const totals: CashflowTotals = {
    income: 0,
    expense: 0,
    savings: 0,
    weekend: 0,
    weekday: 0,
    food: 0,
    fixed: 0,
    variable: 0,
    rent: 0,
    it: 0,
    invest: 0,
    dayOfWeekMap: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  };

  filteredTx.forEach(item => {
    if (!item.date) return;
    const ym = extractYearMonth(item.date);
    if (!ym) return;

    const amt = Number.parseFloat(item.amount) || 0;
    const { isInc, isSav, cGroup, isFixed, groupName } = resolveCashflowContext(item, catMap, cashflowGroups);

    uniqueMonthsSet.add(ym);

    if (!cashflowMap[ym]) {
      cashflowMap[ym] = { monthStr: ym, totalExp: 0, income: 0, totalSav: 0, groups: {} };
      cashflowGroups.forEach(g => { cashflowMap[ym].groups[g.id] = 0; });
    }

    if (cashflowMap[ym].groups[cGroup] !== undefined) {
      cashflowMap[ym].groups[cGroup] += amt;
    }

    if (isInc) {
      totals.income += amt;
      cashflowMap[ym].income += amt;
      dayIncomeMap[item.date] = (dayIncomeMap[item.date] || 0) + amt;
    } else if (isSav) {
      totals.savings += amt;
      cashflowMap[ym].totalSav += amt;
    } else {
      cashflowMap[ym].totalExp += amt;
      dayExpenseMap[item.date] = (dayExpenseMap[item.date] || 0) + amt;
      accumulateExpenseTotals(amt, item.date, groupName, isFixed, totals);
    }
  });

  return { cashflowMap, dayIncomeMap, dayExpenseMap, uniqueMonthsSet, totals, filteredTx };
};

const accumulateCategoryItem = (item: any, catMap: Record<string, any>, stats: any) => {
  if (!item.date) return;
  const amt = Number.parseFloat(item.amount) || 0;
  const catId = item.category_id || (catMap[item.category]?.id) || 'unknown';
  const ym = extractYearMonth(item.date);

  stats.catMapData[catId] = (stats.catMapData[catId] || 0) + amt;
  stats.dailyAllMap[item.date] = (stats.dailyAllMap[item.date] || 0) + amt;
  if (ym) stats.monthlyAllMap[ym] = (stats.monthlyAllMap[ym] || 0) + amt;

  if (!stats.dailyCatMap[catId]) stats.dailyCatMap[catId] = {};
  stats.dailyCatMap[catId][item.date] = (stats.dailyCatMap[catId][item.date] || 0) + amt;

  if (ym) {
    if (!stats.monthlyCatMap[catId]) stats.monthlyCatMap[catId] = {};
    stats.monthlyCatMap[catId][ym] = (stats.monthlyCatMap[catId][ym] || 0) + amt;
  }
  stats.chartTotal += amt;
};

/**
 * Calculates category breakdown and mapping for charts.
 */
export const calculateCategoryStats = (
  transactions: any[],
  categories: any[],
  filterPeriod: string,
  dashboardCategory: string | string[],
  hideFixedExpenses: boolean,
  catMap: Record<string, any>
) => {
  const filteredTx = transactions.filter(t => isDateInFilter(t.date, filterPeriod));
  const chartTx = filteredTx.filter(t => {
    const catObj = catMap[t.category_id] || catMap[t.category] || { type: 'expense' };
    if (catObj.type === 'income') return false;
    if (hideFixedExpenses && (t.allocation_type || catObj.allocation_type) === 'need') return false;
    return true;
  });

  const stats = {
    catMapData: {} as Record<string, number>,
    dailyAllMap: {} as Record<string, number>,
    monthlyAllMap: {} as Record<string, number>,
    dailyCatMap: {} as Record<string, Record<string, number>>,
    monthlyCatMap: {} as Record<string, Record<string, number>>,
    chartTotal: 0
  };

  chartTx.forEach(item => {
    accumulateCategoryItem(item, catMap, stats);
  });

  return { ...stats, chartTx };
};

interface MainChartDataParams {
  chartGroupBy: 'daily' | 'monthly';
  filterPeriod: string;
  sortedMonthsKeys: string[];
  cashflowMap: Record<string, CashflowMonthData>;
  datesInPeriod: string[];
  dailyAllMap: Record<string, number>;
  hideFixedExpenses: boolean;
  hideWantExpenses: boolean;
  isDarkMode: boolean;
  dashboardCategory: string | string[];
  monthlyAllMap: Record<string, number>;
  monthlyCatMap: Record<string, Record<string, number>>;
  dailyCatMap: Record<string, Record<string, number>>;
  catMap: Record<string, any>;
}

function getAllDatasetStyle(hideFixedExpenses: boolean, hideWantExpenses: boolean) {
  if (hideFixedExpenses) {
    return {
      label: 'รายจ่ายไลฟ์สไตล์ (บาท)',
      borderColor: '#D81A21',
      backgroundColor: 'rgba(216,26,33,0.1)',
    };
  }
  if (hideWantExpenses) {
    return {
      label: 'รายจ่ายจำเป็น (บาท)',
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59,130,246,0.1)',
    };
  }
  return {
    label: 'รายจ่ายรวมทั้งหมด (บาท)',
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239,68,68,0.1)',
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
    catMap: Record<string, any>;
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

  const catObj = catMap[catName] || {};
  const catId = catObj.id || catName;
  const catColor = catObj.color || '#64748B';
  const rgb = hexToRgb(catColor);

  const data = showMonthly
    ? sortedMonthsKeys.map(m => monthlyCatMap[catId]?.[m] || 0)
    : datesInPeriod.map(d => dailyCatMap[catId]?.[d] || 0);

  const pointRadius = (isSingleMonthView || showMonthly) ? 3 : 0;

  return {
    label: catName,
    data,
    borderColor: catColor,
    backgroundColor: rgb ? `rgba(${rgb}, 0.1)` : 'transparent',
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
    catMap: Record<string, any>;
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
    { type: 'line', label: 'Cashflow', data: sortedMonthsKeys.map(m => (cashflowMap[m]?.income || 0) - (cashflowMap[m]?.totalExp || 0)), borderColor: '#38bdf8', backgroundColor: '#38bdf8', borderWidth: 4, tension: 0.3, pointRadius: 5, pointBackgroundColor: '#ffffff', pointBorderWidth: 2 },
    { type: 'bar', label: 'รายรับ', data: sortedMonthsKeys.map(m => cashflowMap[m]?.income || 0), backgroundColor: '#10B981', borderColor: '#10B981', borderRadius: 0 },
    { type: 'bar', label: 'รายจ่ายรวม', data: sortedMonthsKeys.map(m => cashflowMap[m]?.totalExp || 0), backgroundColor: '#EF4444', borderColor: '#EF4444', borderRadius: 0 },
  ],
});

const buildDailyComboChartData = (
  xLabels: string[],
  datesInPeriod: string[],
  dailyAllMap: Record<string, number>,
  hideFixedExpenses: boolean,
  hideWantExpenses: boolean
) => {
  let runningSum = 0;
  const mtdAvgData = datesInPeriod.map((d, index) => {
    runningSum += (dailyAllMap[d] || 0);
    return runningSum / (index + 1);
  });

  const currentTotal = datesInPeriod.reduce((sum, d) => sum + (dailyAllMap[d] || 0), 0);
  const currentDailyAvg = datesInPeriod.length > 0 ? currentTotal / datesInPeriod.length : 0;

  let barLabel = 'รายจ่ายจริง';
  let barBg = 'rgba(239,68,68,0.6)';
  let barBorder = '#EF4444';
  if (hideFixedExpenses) {
    barLabel = 'รายจ่ายไลฟ์สไตล์';
    barBg = 'rgba(216,26,33,0.6)';
    barBorder = '#D81A21';
  } else if (hideWantExpenses) {
    barLabel = 'รายจ่ายจำเป็น';
    barBg = 'rgba(59,130,246,0.6)';
    barBorder = '#3B82F6';
  }

  return {
    labels: xLabels,
    datasets: [
      {
        type: 'line', label: 'เฉลี่ยสะสม (MTD)', data: mtdAvgData, borderColor: '#F59E0B',
        backgroundColor: 'transparent', borderWidth: 4, tension: 0.4, pointRadius: 0, pointHitRadius: 10, order: 1
      },
      {
        type: 'line', label: `เฉลี่ยทั้งเดือน ${formatMoney(currentDailyAvg)}/วัน`, data: datesInPeriod.map(() => currentDailyAvg),
        borderColor: '#94a3b8', backgroundColor: 'transparent', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, pointHitRadius: 0, order: 2
      },
      {
        type: 'bar', label: barLabel, data: datesInPeriod.map(d => dailyAllMap[d] || 0),
        backgroundColor: barBg,
        borderColor: barBorder, borderWidth: 2, borderRadius: 0, order: 3
      }
    ]
  };
};

/**
 * Generates datasets for the main dashboard chart (Combo or Line).
 */
export const generateMainChartData = ({
  chartGroupBy, filterPeriod, sortedMonthsKeys, cashflowMap, 
  datesInPeriod, dailyAllMap, hideFixedExpenses, hideWantExpenses, isDarkMode,
  dashboardCategory, monthlyAllMap, monthlyCatMap, dailyCatMap, catMap
}: MainChartDataParams) => {
  const isSingleMonthView = Boolean(/^\d{4}-\d{2}$/.exec(filterPeriod));
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
      chartType: 'combo',
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
  dayTypeConfig: any[]
) => {
  const dayTypeCounts: Record<string, number> = {};
  dayTypeConfig.forEach(dt => { dayTypeCounts[dt.id] = 0; });
  
  datesInPeriod.forEach(dateStr => {
    let y: string, m: string, d: string;
    if (dateStr.includes('-')) {
      [y, m, d] = dateStr.split('-');
    } else {
      [d, m, y] = dateStr.split('/');
    }
    const dayOfWeek = new Date(Number.parseInt(y, 10), Number.parseInt(m, 10) - 1, Number.parseInt(d, 10)).getDay();
    const defaultType = (dayOfWeek === 0 || dayOfWeek === 6)
      ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id)
      : dayTypeConfig[0]?.id;
    const currentType = dayTypes[dateStr] || defaultType;
    if (currentType && dayTypeCounts[currentType] !== undefined) dayTypeCounts[currentType]++;
    else if (currentType) dayTypeCounts[currentType] = 1;
  });

  return dayTypeCounts;
};
