// src/hooks/useAnalytics.js
import { useMemo } from 'react';
import { generateDatesForPeriod } from '../utils/dateHelpers';
import { hexToRgb, formatMoney } from '../utils/formatters';
import { 
  createCategoryMap, 
  generateCashflowMap, 
  calculateCategoryStats, 
  generateMainChartData, 
  calculateDayTypeCounts 
} from '../utils/analyticsHelpers';

export default function useAnalytics({
  transactions,
  categories,
  cashflowGroups = [], 
  filterPeriod,
  hideFixedExpenses,
  dashboardCategory = 'ALL', 
  chartGroupBy = 'monthly',
  topXLimit = 7,
  dayTypes,
  dayTypeConfig,
  isDarkMode,
}) {
  const analytics = useMemo(() => {
    // 1. Setup Maps
    const catMapLookup = createCategoryMap(categories);

    // 2. Base Cashflow & Totals Calculation
    const { 
      cashflowMap, 
      dayIncomeMap, 
      dayExpenseMap, 
      uniqueMonthsSet, 
      totals, 
      filteredTx 
    } = generateCashflowMap(transactions, filterPeriod, catMapLookup, cashflowGroups);

    const netCashflow = totals.income - totals.expense;
    const numMonths = uniqueMonthsSet.size || 1;
    const savingsRate = totals.income > 0 ? ((netCashflow / totals.income) * 100).toFixed(1) : 0;

    // 3. Category & Chart Stats
    const { 
      catMapData, 
      dailyAllMap, 
      monthlyAllMap, 
      dailyCatMap, 
      monthlyCatMap, 
      chartTotal, 
      chartTx 
    } = calculateCategoryStats(transactions, categories, filterPeriod, dashboardCategory, hideFixedExpenses, catMapLookup);

    const sortedCats = Object.entries(catMapData)
      .sort((a, b) => b[1] - a[1])
      .map(c => ({
        name: c[0], 
        amount: c[1], 
        percentage: chartTotal > 0 ? ((c[1] / chartTotal) * 100).toFixed(1) : 0, 
        avgPerMonth: c[1] / numMonths,
      }));

    const datesInPeriod = generateDatesForPeriod(filterPeriod, transactions);
    const periodDays = datesInPeriod.length || 1;
    const dailyAvg = totals.expense / periodDays;

    const catChartData = {
      labels: sortedCats.map(c => c.name),
      datasets: [{
        data: sortedCats.map(c => c.amount),
        backgroundColor: sortedCats.map(c => catMapLookup[c.name]?.color || '#64748B'),
        borderWidth: 2, borderColor: isDarkMode ? '#1e293b' : '#ffffff',
      }],
    };

    // 4. Main Chart Data Generation
    const sortedMonthsKeys = Object.keys(cashflowMap).sort();
    const { chartData: mainChartData, chartType: mainChartType } = generateMainChartData({
      chartGroupBy, filterPeriod, sortedMonthsKeys, cashflowMap, 
      datesInPeriod, dailyAllMap, hideFixedExpenses, isDarkMode,
      dashboardCategory, monthlyAllMap, monthlyCatMap, dailyCatMap, catMap: catMapLookup
    });

    // 5. Sparklines
    const isSingleMonthView = !!filterPeriod.match(/^\d{4}-\d{2}$/);
    const sparklineIncome = [], sparklineExpense = [], sparklineNet = [];

    if (!isSingleMonthView) {
      sortedMonthsKeys.forEach(m => {
        sparklineIncome.push(cashflowMap[m].income);
        sparklineExpense.push(cashflowMap[m].totalExp);
        sparklineNet.push(cashflowMap[m].income - cashflowMap[m].totalExp);
      });
    } else {
      datesInPeriod.forEach(dateKey => {
        sparklineIncome.push(dayIncomeMap[dateKey] || 0);
        sparklineExpense.push(dayExpenseMap[dateKey] || 0);
        sparklineNet.push((dayIncomeMap[dateKey] || 0) - (dayExpenseMap[dateKey] || 0));
      });
    }

    // 6. Day Type Distribution
    const dayTypeCounts = calculateDayTypeCounts(datesInPeriod, dayTypes, dayTypeConfig);

    // 7. Global Threshold for Activity Heatmap
    const globalDailySum = {};
    transactions.forEach(item => {
      if (!item.date) return;
      const amt = parseFloat(item.amount) || 0;
      const catObj = catMapLookup[item.category];
      const isExpense = catObj ? catObj.type === 'expense' : true;
      if (isExpense) {
        globalDailySum[item.date] = (globalDailySum[item.date] || 0) + amt;
      }
    });
    
    const globalValues = Object.values(globalDailySum).filter(v => v > 0).sort((a, b) => a - b);
    const globalMaxThreshold = globalValues.length > 0
      ? (globalValues[Math.floor(globalValues.length * 0.9)] || globalValues[globalValues.length - 1])
      : 100;

    return {
      totalExpense: totals.expense, 
      totalIncome: totals.income, 
      netCashflow, 
      savingsRate, 
      chartTotal, 
      numMonths,
      sortedCats,
      topTransactions: [...chartTx].sort((a, b) => b.amount - a.amount).slice(0, topXLimit),
      dailyAvg, 
      uniqueDays: datesInPeriod.length,
      catChartData, 
      mainChartData, 
      mainChartType,
      foodTotal: totals.food, 
      foodDailyAvg: totals.food / periodDays, 
      foodPercentage: totals.expense > 0 ? ((totals.food / totals.expense) * 100).toFixed(1) : 0,
      rentTotal: totals.rent, 
      rentPercentage: totals.income > 0 ? ((totals.rent / totals.income) * 100).toFixed(1) : 0,
      fixedTotal: totals.fixed, 
      variableTotal: totals.variable, 
      fixedPercentage: totals.expense > 0 ? ((totals.fixed / totals.expense) * 100).toFixed(1) : 0, 
      variablePercentage: totals.expense > 0 ? ((totals.variable / totals.expense) * 100).toFixed(1) : 0,
      emergencyFundTarget: (totals.expense / numMonths) * 6,
      sortedCashflow: Object.values(cashflowMap).sort((a, b) => a.monthStr.localeCompare(b.monthStr)), 
      sparklineIncome, 
      sparklineExpense, 
      sparklineNet,
      weekendTotal: totals.weekend, 
      weekdayTotal: totals.weekday, 
      dayOfWeekMap: totals.dayOfWeekMap,
      globalMaxThreshold,
      datesInPeriod,
      dayTypeCounts, 
      dailyAllMap,
      sortedMonthsKeys,
      monthlyCatMap,
      dailyCatMap
    };
  }, [transactions, filterPeriod, categories, cashflowGroups, hideFixedExpenses, dashboardCategory, chartGroupBy, topXLimit, dayTypes, dayTypeConfig, isDarkMode]);

  return analytics;
}