// src/hooks/useAnalytics.js
import { useMemo } from 'react';
import { generateDatesForPeriod, isDateInFilter, parseDateStrToObj, toISODate } from '../utils/dateHelpers';
import { hexToRgb, formatMoney } from '../utils/formatters';
import { 
  createCategoryMap, 
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
  summaryData // Added from useTransactionData
}) {
  const analytics = useMemo(() => {
    // 1. Setup Maps
    const catMapLookup = createCategoryMap(categories);
    const useBackendTotals = !!summaryData;

    // 1b. Dynamic Group Resolution (Handle UUIDs)
    const incomeGroups = cashflowGroups?.filter(g => g.type === 'income') || [];
    const savingsGroups = cashflowGroups?.filter(g => g.type === 'savings') || [];
    const expenseGroups = cashflowGroups?.filter(g => g.type === 'expense') || [];

    // Fallback IDs for categorizing uncategorized items
    const fallbackIncId = incomeGroups[0]?.id || 'cg_bonus';
    const fallbackSavId = savingsGroups[0]?.id || 'cg_savings';
    const fallbackExpId = expenseGroups[0]?.id || 'cg_variable';

    const foodGroup = cashflowGroups?.find(g => 
      (g.name || '').toLowerCase().includes('อาหาร') || 
      (g.name || '').toLowerCase().includes('food') ||
      (g.name || '').toLowerCase().includes('กิน')
    );
    const rentGroup = cashflowGroups?.find(g => 
      (g.name || '').toLowerCase().includes('หอ') || 
      (g.name || '').toLowerCase().includes('ที่พัก') || 
      (g.name || '').toLowerCase().includes('rent') ||
      (g.name || '').toLowerCase().includes('เช่า')
    );
    const foodGroupId = foodGroup?.id;
    const rentGroupId = rentGroup?.id;

    // 2. Variables for Aggregation
    let totals = {
      income: 0, expense: 0, savings: 0,
      fixed: 0, variable: 0, food: 0, rent: 0,
      weekend: 0, weekday: 0,
      dayOfWeekMap: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    };

    let dayIncomeMap = {}, dayExpenseMap = {};
    let uniqueMonthsSet = new Set();
    let cashflowMap = {};
    let catMapData = {}; // Keyed by category_id
    let dailyAllMap = {}, monthlyAllMap = {};
    let dailyCatMap = {}, monthlyCatMap = {}; // Keyed by [catId][date/month]
    let chartTotal = 0;
    let chartTx = [];
    let globalDailySum = {};
    let prevTotals = { income: 0, expense: 0, net: 0 };

    // --- Time Window Setup ---
    const datesInPeriod = generateDatesForPeriod(filterPeriod, transactions);
    const isSingleMonthView = !!filterPeriod.match(/^\d{4}-\d{2}$/);
    
    // Trend Range Setup
    let startPrev = null, endPrev = null;
    if (filterPeriod !== 'ALL' && datesInPeriod.length > 0) {
      const firstDate = new Date(datesInPeriod[0]);
      const lastDate = new Date(datesInPeriod[datesInPeriod.length - 1]);
      const durationMs = lastDate.getTime() - firstDate.getTime() + (24 * 60 * 60 * 1000);
      const prevEnd = new Date(firstDate.getTime() - (24 * 60 * 60 * 1000));
      const prevStart = new Date(prevEnd.getTime() - durationMs + (24 * 60 * 60 * 1000));
      startPrev = prevStart.toISOString().split('T')[0];
      endPrev = prevEnd.toISOString().split('T')[0];
    }

    // Current Month / Forecasting Setup
    let todayStr = '', filterYear = 0, filterMonth = 0, isCurrentMonth = false;
    if (isSingleMonthView) {
      const parts = filterPeriod.split('-');
      filterYear = parseInt(parts[0]);
      filterMonth = parseInt(parts[1]) - 1;
      const today = new Date();
      isCurrentMonth = today.getFullYear() === filterYear && today.getMonth() === filterMonth;
      todayStr = today.toISOString().split('T')[0];
    }

    // Variables for Forecasting
    let expenseUpToToday = 0, variableUpToToday = 0, foodUpToToday = 0;

    // ─── SINGLE PASS AGGREGATION ──────────────────────────────────────────────
    transactions.forEach(t => {
      const isoDate = toISODate(t.date);
      if (!isoDate) return;

      const amt = parseFloat(t.amount) || 0;
      const catId = t.category_id || (catMapLookup[t.category]?.id) || 'unknown';
      const catObj = catMapLookup[catId] || { type: 'expense', cashflowGroup: fallbackExpId, isFixed: false };
      
      const cGroupId = catObj.cashflowGroup;
      const groupObj = cashflowGroups?.find(g => g.id === cGroupId) || {};
      const groupType = groupObj.type || catObj.type || 'expense';
      const groupName = (groupObj.name || '').toLowerCase();
      
      const isInc = groupType === 'income';
      const isSav = groupType === 'savings';
      const isExp = !isInc && !isSav;
      const isFixed = catObj.isFixed || false;

      // a) Global Stats (for Heatmap)
      if (isExp) {
        globalDailySum[isoDate] = (globalDailySum[isoDate] || 0) + amt;
      }

      // b) Trend Calculation (Previous Period)
      if (startPrev && isoDate >= startPrev && isoDate <= endPrev) {
        if (isInc) prevTotals.income += amt;
        else if (isExp) prevTotals.expense += amt;
      }

      // c) Main Period Filter
      if (isDateInFilter(isoDate, filterPeriod)) {
        // Month Key
        const ym = isoDate.substring(0, 7);
        uniqueMonthsSet.add(ym);

        // Initialize cashflowMap for the month if it doesn't exist
        if (!cashflowMap[ym]) {
          cashflowMap[ym] = { 
            monthStr: ym, totalExp: 0, income: 0, totalSav: 0, groups: {} 
          };
          cashflowGroups.forEach(g => { cashflowMap[ym].groups[g.id] = 0; });
        }

        const cGroup = cGroupId || (isInc ? fallbackIncId : (isSav ? fallbackSavId : fallbackExpId));
        if (cashflowMap[ym].groups[cGroup] !== undefined) {
          cashflowMap[ym].groups[cGroup] += amt;
        }

        const isFood = cGroupId === foodGroupId || groupName.includes('กิน') || groupName.includes('อาหาร') || groupName.includes('food');
        const isRent = cGroupId === rentGroupId || groupName.includes('หอ') || groupName.includes('ที่พัก') || groupName.includes('rent') || groupName.includes('เช่า');

        // Totals
        if (isInc) {
          totals.income += amt;
          cashflowMap[ym].income += amt;
          dayIncomeMap[isoDate] = (dayIncomeMap[isoDate] || 0) + amt;
        } else if (isSav) {
          totals.savings += amt;
          cashflowMap[ym].totalSav += amt;
        } else {
          totals.expense += amt;
          cashflowMap[ym].totalExp += amt;
          dayExpenseMap[isoDate] = (dayExpenseMap[isoDate] || 0) + amt;
          
          if (isFixed) totals.fixed += amt;
          else totals.variable += amt;

          // Semantic Grouping
          if (isRent) totals.rent += amt;
          else if (isFood) totals.food += amt;

          // Per-Category Breakdown (Always count for local sortedCats calculation)
          catMapData[catId] = (catMapData[catId] || 0) + amt;

          // Daily/Monthly Breakdown for Charts & Specific Analytics
          const passFixedFilter = !hideFixedExpenses || !isFixed;
          
          let passCategoryFilter = false;
          const activeFilters = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];
          
          if (passFixedFilter && (activeFilters.includes('ALL') || (activeFilters.includes('FIXED') && isFixed) || (activeFilters.includes('VARIABLE') && !isFixed) || activeFilters.includes(catId) || activeFilters.includes(catObj.name))) {
            dailyAllMap[isoDate] = (dailyAllMap[isoDate] || 0) + amt;
            monthlyAllMap[ym] = (monthlyAllMap[ym] || 0) + amt;
            chartTotal += amt;
            chartTx.push(t);
          }
        }

        // Per-Category Time Breakdown (Track for BOTH Income and Expense)
        if (!dailyCatMap[catId]) dailyCatMap[catId] = {};
        dailyCatMap[catId][isoDate] = (dailyCatMap[catId][isoDate] || 0) + amt;
        if (!monthlyCatMap[catId]) monthlyCatMap[catId] = {};
        monthlyCatMap[catId][ym] = (monthlyCatMap[catId][ym] || 0) + amt;

        // Weekend/Weekday Logic
        if (isExp) {
          const dateObj = parseDateStrToObj(isoDate);
          const dow = dateObj.getDay();
          totals.dayOfWeekMap[dow] += amt;
          if (dow === 0 || dow === 6) totals.weekend += amt;
          else totals.weekday += amt;
        }

        // Forecasting Logic (Accumulate up to today)
        if (isCurrentMonth && isoDate <= todayStr && isExp) {
          expenseUpToToday += amt;
          if (!isFixed) variableUpToToday += amt;
          if (isFood) foodUpToToday += amt;
        }
      }
    });

    prevTotals.net = prevTotals.income - prevTotals.expense;

    // ─── POST-LOOP OPTIMIZATION (Use Backend Data if available) ────────────────
    if (useBackendTotals && summaryData.summary) {
      totals.income = summaryData.summary.income;
      totals.expense = summaryData.summary.expense;
      totals.savings = summaryData.summary.savings;
    }

    const netCashflow = totals.income - totals.expense;
    const actualSavings = netCashflow;
    const explicitSavings = totals.savings || 0;
    const numMonths = uniqueMonthsSet.size || 1;
    const savingsRate = totals.income > 0 ? parseFloat(((actualSavings / totals.income) * 100).toFixed(1)) : 0;

    // ─── CATEGORY BREAKDOWN ───────────────────────────────────────────────────
    const activeFilters = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];
    
    const sortedCats = useBackendTotals && summaryData.categories 
      ? summaryData.categories
          .filter(c => {
            if (c.type !== 'expense') return false;
            const catMeta = catMapLookup[c.id] || { isFixed: false };
            if (hideFixedExpenses && catMeta.isFixed) return false;
            
            if (activeFilters.includes('ALL')) return true;
            if (activeFilters.includes('FIXED') && catMeta.isFixed) return true;
            if (activeFilters.includes('VARIABLE') && !catMeta.isFixed) return true;
            return activeFilters.includes(c.id) || activeFilters.includes(c.name) || activeFilters.includes(catMeta.name);
          })
          .map(c => {
            const catMeta = catMapLookup[c.id] || {};
            return {
              ...c,
              percentage: chartTotal > 0 ? ((c.amount / chartTotal) * 100).toFixed(1) : 0,
              avgPerMonth: c.amount / (summaryData.monthly?.length || 1),
              order_index: catMeta.order_index || 999
            };
          })
      : Object.entries(catMapData)
          .filter(([catId]) => {
            const catObj = catMapLookup[catId] || { isFixed: false };
            if (hideFixedExpenses && catObj.isFixed) return false;
            
            if (activeFilters.includes('ALL')) return true;
            if (activeFilters.includes('FIXED') && catObj.isFixed) return true;
            if (activeFilters.includes('VARIABLE') && !catObj.isFixed) return true;
            return activeFilters.includes(catId) || activeFilters.includes(catObj.name);
          })
          .sort((a, b) => b[1] - a[1])
          .map(([catId, amount]) => {
            const catObj = catMapLookup[catId] || { name: 'Unknown', id: catId };
            return {
              id: catId,
              name: catObj.name,
              amount: amount,
              percentage: chartTotal > 0 ? ((amount / chartTotal) * 100).toFixed(1) : 0,
              avgPerMonth: amount / numMonths,
              icon: catObj.icon,
              color: catObj.color || '#64748B',
              order_index: catObj.order_index || 999
            };
          });

    // ─── GROUP BREAKDOWN (CashflowTable Mode) ─────────────────────────────────
    const groupTotals = {};
    const groupCatsMap = {}; // Track categories within each group
    const groupChartTotal = { expense: 0 };
    
    // Aggregate from monthly data (already filtered by period)
    Object.values(cashflowMap).forEach(m => {
      Object.entries(m.groups).forEach(([groupId, amount]) => {
        const groupObj = cashflowGroups.find(g => g.id === groupId);
        if (!groupObj || groupObj.type !== 'expense') return; // Only expense for proportion
        
        groupTotals[groupId] = (groupTotals[groupId] || 0) + amount;
        groupChartTotal.expense += amount;
      });
    });

    // Link categories to their respective groups using the catMapData aggregated in main loop
    Object.entries(catMapData).forEach(([catId, amount]) => {
      const catObj = catMapLookup[catId];
      if (!catObj || catObj.type !== 'expense') return;
      const gId = catObj.cashflowGroup;
      if (!gId || groupTotals[gId] === undefined) return;

      if (!groupCatsMap[gId]) groupCatsMap[gId] = [];
      groupCatsMap[gId].push({
        id: catId,
        name: catObj.name,
        amount: amount,
        icon: catObj.icon,
        color: catObj.color,
        order_index: catObj.order_index || 999
      });
    });

    // Sort categories within each group and calc relative %
    Object.keys(groupCatsMap).forEach(gId => {
      const total = groupTotals[gId];
      groupCatsMap[gId] = groupCatsMap[gId]
        .map(c => ({
          ...c,
          relativePercentage: total > 0 ? ((c.amount / total) * 100).toFixed(0) : 0
        }))
        .sort((a, b) => (a.order_index - b.order_index) || (b.amount - a.amount));
    });

    const sortedGroups = cashflowGroups
      .filter(g => g.type === 'expense' && groupTotals[g.id] > 0)
      .map(g => ({
        id: g.id,
        name: g.name,
        amount: groupTotals[g.id],
        percentage: groupChartTotal.expense > 0 ? ((groupTotals[g.id] / groupChartTotal.expense) * 100).toFixed(1) : 0,
        avgPerMonth: groupTotals[g.id] / numMonths,
        icon: g.icon,
        color: g.color || '#64748B',
        order_index: g.order_index || 999,
        categories: groupCatsMap[g.id] || []
      }))
      .sort((a, b) => (a.order_index - b.order_index) || (b.amount - a.amount));

    const groupChartData = {
      labels: sortedGroups.map(g => g.name),
      datasets: [{
        data: sortedGroups.map(g => g.amount),
        backgroundColor: sortedGroups.map(g => g.color),
        borderWidth: 2, borderColor: isDarkMode ? '#1e293b' : '#ffffff',
      }],
    };

    // ─── ALLOCATION BREAKDOWN (Ratio 50/30/20 Mode) ───────────────────────────
    const allocTotals = { need: 0, want: 0, savings: 0 };
    const allocGroupsMap = { need: [], want: [], savings: [] };
    
    // Aggregate by allocation_type of each group across the selected period
    Object.values(cashflowMap).forEach(m => {
      Object.entries(m.groups).forEach(([groupId, amount]) => {
        if (amount <= 0) return;
        const groupObj = cashflowGroups.find(g => g.id === groupId);
        if (!groupObj) return;
        
        if (groupObj.type === 'expense' || groupObj.type === 'savings') {
          const aType = groupObj.allocation_type || 'want';
          allocTotals[aType] += amount;
          
          // Track individual group totals within this allocation
          let groupEntry = allocGroupsMap[aType].find(g => g.id === groupId);
          if (!groupEntry) {
            groupEntry = { id: groupId, name: groupObj.name, icon: groupObj.icon, amount: 0, color: groupObj.color };
            allocGroupsMap[aType].push(groupEntry);
          }
          groupEntry.amount += amount;
        }
      });
    });

    // Calculate relative percentages for sub-groups
    Object.keys(allocGroupsMap).forEach(key => {
      const total = allocTotals[key];
      allocGroupsMap[key] = allocGroupsMap[key]
        .map(g => ({
          ...g,
          relativePercentage: total > 0 ? ((g.amount / total) * 100).toFixed(0) : 0
        }))
        .sort((a, b) => b.amount - a.amount);
    });

    const netSavingsActual = netCashflow; // Total remaining after ALL expenses
    const allocationItems = [
      { id: 'needs', name: 'Needs (Essential)', amount: allocTotals.need, color: '#EF4444', icon: '🏠', target: 50, groups: allocGroupsMap.need },
      { id: 'wants', name: 'Wants (Lifestyle)', amount: allocTotals.want, color: '#F59E0B', icon: '🛍️', target: 30, groups: allocGroupsMap.want },
      { id: 'savings', name: 'Savings & Net', amount: Math.max(0, netSavingsActual), color: '#10B981', icon: '🏦', target: 20, groups: allocGroupsMap.savings }
    ];

    const allocationTotal = totals.income > 0 ? totals.income : (totals.expense + (netSavingsActual > 0 ? netSavingsActual : 0));
    const sortedAllocation = allocationItems.map(item => ({
      ...item,
      percentage: allocationTotal > 0 ? ((item.amount / allocationTotal) * 100).toFixed(1) : 0
    }));

    const allocationChartData = {
      labels: sortedAllocation.map(i => i.name),
      datasets: [{
        data: sortedAllocation.map(i => i.amount),
        backgroundColor: sortedAllocation.map(i => i.color),
        borderWidth: 2, borderColor: isDarkMode ? '#1e293b' : '#ffffff',
      }],
    };

    // ─── CHART DATA & SORTED CASHFLOW ────────────────────────────────────────
    if (useBackendTotals && summaryData.monthly) {
      summaryData.monthly.forEach(m => {
        cashflowMap[m.month] = { 
          monthStr: m.month, income: m.income, totalExp: m.expense, totalSav: m.savings, groups: m.groups || {} 
        };
      });
    }

    const sortedCashflow = Object.values(cashflowMap).sort((a, b) => a.monthStr.localeCompare(b.monthStr));
    const sortedMonthsKeys = sortedCashflow.map(c => c.monthStr);

    const catChartData = {
      labels: sortedCats.map(c => c.name),
      datasets: [{
        data: sortedCats.map(c => c.amount),
        backgroundColor: sortedCats.map(c => c.color),
        borderWidth: 2, borderColor: isDarkMode ? '#1e293b' : '#ffffff',
      }],
    };

    const { chartData: mainChartData, chartType: mainChartType } = generateMainChartData({
      chartGroupBy, filterPeriod, sortedMonthsKeys, cashflowMap, 
      datesInPeriod, dailyAllMap, hideFixedExpenses, isDarkMode,
      dashboardCategory, monthlyAllMap, monthlyCatMap, dailyCatMap, catMap: catMapLookup
    });

    // ─── SPARKLINES ───────────────────────────────────────────────────────────
    const sparklineIncome = [], sparklineExpense = [], sparklineNet = [];
    if (useBackendTotals && summaryData.monthly && !isSingleMonthView) {
      summaryData.monthly.forEach(m => {
        sparklineIncome.push(m.income);
        sparklineExpense.push(m.expense);
        sparklineNet.push(m.income - m.expense);
      });
    } else if (isSingleMonthView) {
      datesInPeriod.forEach(d => {
        sparklineIncome.push(dayIncomeMap[d] || 0);
        sparklineExpense.push(dayExpenseMap[d] || 0);
        sparklineNet.push((dayIncomeMap[d] || 0) - (dayExpenseMap[d] || 0));
      });
    } else {
      sortedMonthsKeys.forEach(m => {
        sparklineIncome.push(cashflowMap[m].income);
        sparklineExpense.push(cashflowMap[m].totalExp);
        sparklineNet.push(cashflowMap[m].income - cashflowMap[m].totalExp);
      });
    }

    // ─── FORECASTING ─────────────────────────────────────────────────────────
    let projectedExpense = 0, safeToSpend = 0, projectedSurplus = 0, showForecasting = false;
    let periodDays = datesInPeriod.length || 1;
    let adjustedDailyAvg = totals.expense / periodDays;
    let adjustedFoodDailyAvg = totals.food / periodDays;

    if (isCurrentMonth && datesInPeriod.length > 0) {
      showForecasting = true;
      const lastDayOfMonth = new Date(filterYear, filterMonth + 1, 0).getDate();
      const currentDay = Math.max(1, Math.min(new Date().getDate(), lastDayOfMonth));
      const remainingDays = Math.max(1, lastDayOfMonth - currentDay);
      
      adjustedDailyAvg = expenseUpToToday / currentDay;
      adjustedFoodDailyAvg = foodUpToToday / currentDay;
      
      const variableRunRate = variableUpToToday / currentDay;
      projectedExpense = totals.fixed + variableUpToToday + (variableRunRate * remainingDays);
      projectedSurplus = totals.income - projectedExpense;
      
      const remainingBudget = totals.income - totals.fixed - variableUpToToday;
      const daysToBudget = Math.max(1, lastDayOfMonth - currentDay + 1);
      safeToSpend = remainingBudget > 0 ? remainingBudget / daysToBudget : 0;
    }

    // ─── GLOBAL HEATMAP THRESHOLD ─────────────────────────────────────────────
    const globalValues = Object.values(globalDailySum).filter(v => v > 0).sort((a, b) => a - b);
    const globalMaxThreshold = globalValues.length > 0
      ? (globalValues[Math.floor(globalValues.length * 0.9)] || globalValues[globalValues.length - 1])
      : 100;

    // ─── DAY TYPE DISTRIBUTION ───────────────────────────────────────────────
    const dayTypeCounts = calculateDayTypeCounts(datesInPeriod, dayTypes, dayTypeConfig);

    // ─── SMART INSIGHTS ──────────────────────────────────────────────────────
    const smartInsights = [];
    if (totals.income > 0) {
      if (totals.expense > totals.income) smartInsights.push({ type: 'error', icon: '🚨', message: `สภาพคล่องติดลบ: คุณดึงเงินเก็บมาใช้แล้ว ${formatMoney(totals.expense - totals.income)} บาท` });
      else if (savingsRate >= 20) smartInsights.push({ type: 'success', icon: '🏆', message: `วินัยการเงินยอดเยี่ยม: คุณออมเงินได้ ${savingsRate}%` });
      else if (savingsRate < 10) smartInsights.push({ type: 'warning', icon: '⚠️', message: `สัดส่วนการออมต่ำ: คุณออมได้เพียง ${savingsRate}%` });
    }

    return {
      isSingleMonthView, showForecasting, projectedExpense, safeToSpend, projectedSurplus, smartInsights,
      prevTotals, totalExpense: totals.expense, totalIncome: totals.income,
      totalSavings: totals.savings || 0, actualSavings, explicitSavings,
      netCashflow, savingsRate, chartTotal, numMonths, sortedCats,
      topTransactions: [...chartTx].sort((a, b) => b.amount - a.amount).slice(0, topXLimit),
      dailyAvg: adjustedDailyAvg,
      foodTotal: totals.food, foodDailyAvg: adjustedFoodDailyAvg,
      foodPercentage: totals.expense > 0 ? ((totals.food / totals.expense) * 100).toFixed(1) : 0,
      rentTotal: totals.rent, rentPercentage: totals.income > 0 ? ((totals.rent / totals.income) * 100).toFixed(1) : 0,
      fixedTotal: totals.fixed, variableTotal: totals.variable,
      fixedPercentage: totals.expense > 0 ? ((totals.fixed / totals.expense) * 100).toFixed(1) : 0,
      variablePercentage: totals.expense > 0 ? ((totals.variable / totals.expense) * 100).toFixed(1) : 0,
      sparklineIncome, sparklineExpense, sparklineNet,
      weekendTotal: totals.weekend, weekdayTotal: totals.weekday,
      globalMaxThreshold, datesInPeriod, filterPeriod, dayTypeCounts,
      dailyAllMap, sortedMonthsKeys, monthlyCatMap, dailyCatMap,
      catChartData, mainChartData, mainChartType, sortedCashflow,
      sortedGroups, groupChartData,
      sortedAllocation, allocationChartData
    };
  }, [transactions, filterPeriod, categories, cashflowGroups, hideFixedExpenses, dashboardCategory, chartGroupBy, topXLimit, dayTypes, dayTypeConfig, isDarkMode, summaryData]);

  return analytics;
}
