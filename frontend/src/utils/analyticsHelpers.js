// src/utils/analyticsHelpers.js
import { isDateInFilter, parseDateStrToObj, generateDatesForPeriod } from './dateHelpers';
import { getThaiMonth, hexToRgb, formatMoney } from './formatters';

/**
 * Creates a map of category names to category objects for fast lookup.
 */
export const createCategoryMap = (categories) => 
  categories.reduce((acc, cat) => { acc[cat.name] = cat; return acc; }, {});

/**
 * Groups and aggregates transaction data into a cashflow map by month.
 */
export const generateCashflowMap = (transactions, filterPeriod, catMap, cashflowGroups) => {
  const filteredTx = transactions.filter(t => isDateInFilter(t.date, filterPeriod));
  const uniqueMonthsSet = new Set();
  const cashflowMap = {};
  const dayIncomeMap = {};
  const dayExpenseMap = {};
  
  let totals = {
    income: 0,
    expense: 0,
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
    const amt = parseFloat(item.amount) || 0;
    const catObj = catMap[item.category] || { type: 'expense', cashflowGroup: 'cg_variable', isFixed: false };
    const isInc = catObj.type === 'income';
    const cGroup = catObj.cashflowGroup || (isInc ? 'cg_bonus' : 'cg_variable');
    const isFixed = catObj.isFixed || false;

    if (!item.date) return;
    const parts = item.date.split('/');
    if (parts.length !== 3) return;

    const ym = `${parts[2]}-${parts[1]}`;
    uniqueMonthsSet.add(ym);

    if (!cashflowMap[ym]) {
      cashflowMap[ym] = { monthStr: ym, totalExp: 0, income: 0, groups: {} };
      cashflowGroups.forEach(g => { cashflowMap[ym].groups[g.id] = 0; });
    }

    cashflowMap[ym].groups[cGroup] = (cashflowMap[ym].groups[cGroup] || 0) + amt;

    if (isInc) {
      totals.income += amt;
      cashflowMap[ym].income += amt;
      dayIncomeMap[item.date] = (dayIncomeMap[item.date] || 0) + amt;
    } else {
      totals.expense += amt;
      cashflowMap[ym].totalExp += amt;
      dayExpenseMap[item.date] = (dayExpenseMap[item.date] || 0) + amt;
      
      const dateObj = parseDateStrToObj(item.date);
      const dayOfWeek = dateObj.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) totals.weekend += amt; 
      else totals.weekday += amt;
      
      totals.dayOfWeekMap[dayOfWeek] += amt;

      if (cGroup === 'cg_rent' || cGroup === 'rent') totals.rent += amt;   
      else if (cGroup === 'cg_food' || cGroup === 'food') totals.food += amt;   
      else if (cGroup === 'cg_it' || cGroup === 'it') totals.it += amt;     
      else if (cGroup === 'cg_invest' || cGroup === 'invest') totals.invest += amt; 

      if (isFixed) totals.fixed += amt; 
      else totals.variable += amt;
    }
  });

  return { cashflowMap, dayIncomeMap, dayExpenseMap, uniqueMonthsSet, totals, filteredTx };
};

/**
 * Calculates category breakdown and mapping for charts.
 */
export const calculateCategoryStats = (transactions, categories, filterPeriod, dashboardCategory, hideFixedExpenses, catMap) => {
  const filteredTx = transactions.filter(t => isDateInFilter(t.date, filterPeriod));
  const chartTx = filteredTx.filter(t => {
    const catObj = catMap[t.category] || { type: 'expense' };
    if (catObj.type === 'income') return false;
    if (hideFixedExpenses && catObj.isFixed) return false;
    return true;
  });

  const stats = {
    catMapData: {},
    dailyAllMap: {},
    monthlyAllMap: {},
    dailyCatMap: {},
    monthlyCatMap: {},
    chartTotal: 0
  };

  chartTx.forEach(item => {
    if (!item.date) return;
    const amt = parseFloat(item.amount) || 0;
    const parts = item.date.split('/');
    const ym = parts.length === 3 ? `${parts[2]}-${parts[1]}` : null;

    stats.catMapData[item.category] = (stats.catMapData[item.category] || 0) + amt;
    stats.dailyAllMap[item.date] = (stats.dailyAllMap[item.date] || 0) + amt;
    if (ym) stats.monthlyAllMap[ym] = (stats.monthlyAllMap[ym] || 0) + amt;

    if (!stats.dailyCatMap[item.category]) stats.dailyCatMap[item.category] = {};
    stats.dailyCatMap[item.category][item.date] = (stats.dailyCatMap[item.category][item.date] || 0) + amt;

    if (ym) {
      if (!stats.monthlyCatMap[item.category]) stats.monthlyCatMap[item.category] = {};
      stats.monthlyCatMap[item.category][ym] = (stats.monthlyCatMap[item.category][ym] || 0) + amt;
    }
    stats.chartTotal += amt;
  });

  return { ...stats, chartTx };
};

/**
 * Generates datasets for the main dashboard chart (Combo or Line).
 */
export const generateMainChartData = ({
  chartGroupBy, filterPeriod, sortedMonthsKeys, cashflowMap, 
  datesInPeriod, dailyAllMap, hideFixedExpenses, isDarkMode,
  dashboardCategory, monthlyAllMap, monthlyCatMap, dailyCatMap, catMap
}) => {
  const isSingleMonthView = !!filterPeriod.match(/^\d{4}-\d{2}$/);
  const showMonthly = !isSingleMonthView && chartGroupBy === 'monthly';
  const activeCats = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];
  const isOnlyAll = activeCats.length === 1 && activeCats[0] === 'ALL';

  const xLabels = showMonthly 
    ? sortedMonthsKeys.map(m => getThaiMonth(m))
    : isSingleMonthView 
      ? datesInPeriod.map(d => `วันที่ ${d.split('/')[0]}`)
      : datesInPeriod.map(d => `${d.split('/')[0]}/${d.split('/')[1]}`);

  let chartType = 'line';
  let chartData = null;

  if (showMonthly && isOnlyAll && !hideFixedExpenses) {
    chartType = 'combo';
    chartData = {
      labels: xLabels,
      datasets: [
        { type: 'line', label: 'Cashflow', data: sortedMonthsKeys.map(m => cashflowMap[m].income - cashflowMap[m].totalExp), borderColor: '#00509E', backgroundColor: '#00509E', borderWidth: 4, tension: 0.3, pointRadius: 5, pointBackgroundColor: '#ffffff', pointBorderWidth: 2 },
        { type: 'bar', label: 'รายรับ', data: sortedMonthsKeys.map(m => cashflowMap[m].income), backgroundColor: '#10B981', borderColor: '#10B981', borderRadius: 4 },
        { type: 'bar', label: 'รายจ่ายรวม', data: sortedMonthsKeys.map(m => cashflowMap[m].totalExp), backgroundColor: '#EF4444', borderColor: '#EF4444', borderRadius: 4 },
      ],
    };
  } else if (!showMonthly && isOnlyAll) {
    chartType = 'combo';
    let runningSum = 0;
    const mtdAvgData = datesInPeriod.map((d, index) => {
        runningSum += (dailyAllMap[d] || 0);
        return runningSum / (index + 1);
    });

    const currentTotal = datesInPeriod.reduce((sum, d) => sum + (dailyAllMap[d] || 0), 0);
    const currentDailyAvg = datesInPeriod.length > 0 ? currentTotal / datesInPeriod.length : 0;

    chartData = {
      labels: xLabels,
      datasets: [
        {
          type: 'line', label: 'เฉลี่ยสะสม (MTD)', data: mtdAvgData, borderColor: '#F59E0B',
          backgroundColor: 'transparent', borderWidth: 4, tension: 0.4, pointRadius: 0, pointHitRadius: 10, order: 1
        },
        {
          type: 'line', label: `เฉลี่ยทั้งเดือน ${formatMoney(currentDailyAvg)}/วัน`, data: datesInPeriod.map(() => currentDailyAvg),
          borderColor: isDarkMode ? '#94a3b8' : '#64748b', backgroundColor: 'transparent', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, pointHitRadius: 0, order: 2
        },
        {
          type: 'bar', label: hideFixedExpenses ? 'รายจ่ายไลฟ์สไตล์' : 'รายจ่ายจริง', data: datesInPeriod.map(d => dailyAllMap[d] || 0),
          backgroundColor: hideFixedExpenses ? (isDarkMode ? 'rgba(216,26,33,0.6)' : 'rgba(216,26,33,0.4)') : (isDarkMode ? 'rgba(239,68,68,0.6)' : 'rgba(239,68,68,0.4)'),
          borderColor: hideFixedExpenses ? '#D81A21' : '#EF4444', borderWidth: 2, borderRadius: 4, order: 3
        }
      ]
    };
  } else {
    chartType = 'line';
    const datasets = [];

    activeCats.forEach(catName => {
      if (catName === 'ALL') {
        datasets.push({
          label: hideFixedExpenses ? 'รายจ่ายไลฟ์สไตล์ (บาท)' : 'รายจ่ายรวมทั้งหมด (บาท)',
          data: showMonthly ? sortedMonthsKeys.map(m => monthlyAllMap[m] || 0) : datesInPeriod.map(d => dailyAllMap[d] || 0),
          borderColor: hideFixedExpenses ? '#D81A21' : '#EF4444',
          backgroundColor: hideFixedExpenses ? 'rgba(216,26,33,0.1)' : 'rgba(239,68,68,0.1)',
          borderWidth: activeCats.length > 1 ? 3 : 2, borderDash: activeCats.length > 1 ? [5, 5] : [], fill: activeCats.length === 1,
          tension: 0.3, pointRadius: isSingleMonthView ? 3 : 0, pointHitRadius: 10,
        });
      } else {
        const catObj = catMap[catName] || {};
        const catColor = catObj.color || '#64748B';
        const rgb = hexToRgb(catColor);
        datasets.push({
          label: catName, 
          data: showMonthly ? sortedMonthsKeys.map(m => monthlyCatMap[catName]?.[m] || 0) : datesInPeriod.map(d => dailyCatMap[catName]?.[d] || 0),
          borderColor: catColor, backgroundColor: rgb ? `rgba(${rgb}, 0.1)` : 'transparent', borderWidth: 2, fill: activeCats.length === 1,
          tension: 0.3, pointRadius: isSingleMonthView || showMonthly ? 3 : 0, pointHitRadius: 10,
        });
      }
    });
    chartData = { labels: xLabels, datasets };
  }

  return { chartData, chartType };
};

/**
 * Calculates day type distribution for the activity timeline.
 */
export const calculateDayTypeCounts = (datesInPeriod, dayTypes, dayTypeConfig) => {
  const dayTypeCounts = {};
  dayTypeConfig.forEach(dt => { dayTypeCounts[dt.id] = 0; });
  
  datesInPeriod.forEach(dateStr => {
    const [d, m, currY] = dateStr.split('/');
    const dayOfWeek = new Date(currY, parseInt(m) - 1, d).getDay();
    const defaultType = (dayOfWeek === 0 || dayOfWeek === 6)
      ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id)
      : dayTypeConfig[0]?.id;
    const currentType = dayTypes[dateStr] || defaultType;
    if (currentType && dayTypeCounts[currentType] !== undefined) dayTypeCounts[currentType]++;
    else if (currentType) dayTypeCounts[currentType] = 1;
  });

  return dayTypeCounts;
};