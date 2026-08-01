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
  hideWantExpenses,
  dashboardCategory = 'ALL', 
  chartGroupBy = 'monthly',
  topXLimit = 7,
  dayTypes,
  dayTypeConfig,
  isDarkMode,
  summaryData, // Added from useTransactionData
  excludeFuture = false
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
      rentSub: { rent: 0, electricity: 0, internet: 0, water: 0 },
      weekend: 0, weekday: 0,
      dayOfWeekMap: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    };

    const allocTotals = { need: 0, want: 0, savings: 0 };
    const allocGroupsMap = { need: [], want: [], savings: [] };
    const groupTotals = {};
    const groupCatsMap = {}; // Track categories within each group

    let dayIncomeMap = {}, dayExpenseMap = {};
    let uniqueMonthsSet = new Set();
    let cashflowMap = {};
    let catMapData = {}; // Keyed by category_id
    let dailyAllMap = {}, monthlyAllMap = {};
    let dailyCatMap = {}, monthlyCatMap = {}; // Keyed by [catId][date/month]
    let chartTotal = 0;
    let chartTx = [];
    let dailyAllocMap = { need: {}, want: {}, savings: {} };
    let monthlyAllocMap = { need: {}, want: {}, savings: {} };
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

    const activeFilters = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];
    
    // ─── SINGLE PASS AGGREGATION ──────────────────────────────────────────────
    transactions.forEach(t => {
      const isoDate = toISODate(t.date);
      if (!isoDate) return;

      const amt = parseFloat(t.amount) || 0;
      const catId = t.category_id || (catMapLookup[t.category]?.id) || 'unknown';
      const catObj = catMapLookup[catId] || { type: 'expense', cashflowGroup: fallbackExpId };
      
      const cGroupId = catObj.cashflowGroup;
      const groupObj = cashflowGroups?.find(g => g.id === cGroupId) || {};
      const groupType = groupObj.type || catObj.type || 'expense';
      const groupName = (groupObj.name || '').toLowerCase();
      
      const isInc = groupType === 'income';
      const isSav = groupType === 'savings';
      const isExp = !isInc && !isSav;

      // Smart Allocation Type: Transaction-level > Group default
      const aType = t.allocation_type || groupObj.allocation_type || (isInc ? 'savings' : 'want');
      const isNeed = aType === 'need';
      const isWant = aType === 'want';

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

        // Initialize cashflowMap for the month if it doesn't exist (Global)
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
          allocTotals.savings += amt;
          
          // Allocation Maps for Savings
          dailyAllocMap.savings[isoDate] = (dailyAllocMap.savings[isoDate] || 0) + amt;
          monthlyAllocMap.savings[ym] = (monthlyAllocMap.savings[ym] || 0) + amt;

          // Track individual savings groups for the 50/30/20 breakdown
          if (cGroup) {
            let groupEntry = allocGroupsMap.savings.find(g => g.id === cGroup);
            if (!groupEntry) {
              groupEntry = { id: cGroup, name: groupObj.name, icon: groupObj.icon, amount: 0, color: groupObj.color };
              allocGroupsMap.savings.push(groupEntry);
            }
            groupEntry.amount += amt;
          }
        } else {
          // --- EXPENSE LOGIC ---
          totals.expense += amt;
          cashflowMap[ym].totalExp += amt;
          dayExpenseMap[isoDate] = (dayExpenseMap[isoDate] || 0) + amt;
          
          // Semantic Grouping
          if (isRent) {
            totals.rent += amt;
            const cName = catObj.name;
            if (cName === 'ค่าเช่า/ค่าหอพัก') totals.rentSub.rent += amt;
            else if (cName === 'ค่าไฟ') totals.rentSub.electricity += amt;
            else if (cName === 'ค่าเน็ต') totals.rentSub.internet += amt;
            else if (cName === 'ค่าน้ำ') totals.rentSub.water += amt;
          }
          else if (isFood) totals.food += amt;

          if (isNeed) totals.fixed += amt;
          else totals.variable += amt;

          // Apply UI Filters for Chart/Proportion Breakdown
          const passFixedFilter = !hideFixedExpenses || !isNeed;
          const passWantFilter = !hideWantExpenses || !isWant;
          const passCategoryFilter = activeFilters.includes('ALL') || 
                                    (activeFilters.includes('FIXED') && isNeed) || 
                                    (activeFilters.includes('VARIABLE') && !isNeed) || 
                                    activeFilters.includes(catId) || 
                                    activeFilters.includes(catObj.name);

          if (passFixedFilter && passWantFilter && passCategoryFilter) {
            dailyAllMap[isoDate] = (dailyAllMap[isoDate] || 0) + amt;
            monthlyAllMap[ym] = (monthlyAllMap[ym] || 0) + amt;
            chartTotal += amt;
            chartTx.push(t);

            // Per-Category Breakdown (Filtered)
            catMapData[catId] = (catMapData[catId] || 0) + amt;

            // Per-Category Time Breakdown (Filtered)
            if (!dailyCatMap[catId]) dailyCatMap[catId] = {};
            dailyCatMap[catId][isoDate] = (dailyCatMap[catId][isoDate] || 0) + amt;
            if (!monthlyCatMap[catId]) monthlyCatMap[catId] = {};
            monthlyCatMap[catId][ym] = (monthlyCatMap[catId][ym] || 0) + amt;

            // Allocation Maps (Filtered)
            allocTotals[aType] = (allocTotals[aType] || 0) + amt;
            if (aType !== 'savings') {
              dailyAllocMap[aType][isoDate] = (dailyAllocMap[aType][isoDate] || 0) + amt;
              monthlyAllocMap[aType][ym] = (monthlyAllocMap[aType][ym] || 0) + amt;
            }

            // Track individual group totals within this allocation (Filtered)
            if (cGroup) {
              let groupEntry = allocGroupsMap[aType].find(g => g.id === cGroup);
              if (!groupEntry) {
                groupEntry = { id: cGroup, name: groupObj.name, icon: groupObj.icon, amount: 0, color: groupObj.color };
                allocGroupsMap[aType].push(groupEntry);
              }
              groupEntry.amount += amt;

              // Also update group totals for Group Mode (Filtered)
              groupTotals[cGroup] = (groupTotals[cGroup] || 0) + amt;
            }
          }
        }


        // Weekend/Weekday Logic
        if (isExp) {
          const dateObj = parseDateStrToObj(isoDate);
          const dow = dateObj.getDay();
          totals.dayOfWeekMap[dow] += amt;
          if (dow === 0 || dow === 6) totals.weekend += amt;
          else totals.weekday += amt;
        }

        // Forecasting Logic
        if (isCurrentMonth && isoDate <= todayStr && isExp) {
          expenseUpToToday += amt;
          if (!isNeed) variableUpToToday += amt;
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
    const sortedCats = Object.entries(catMapData)
          .filter(([catId]) => {
            const catObj = catMapLookup[catId] || {};
            const isNeedCat = catObj.allocation_type === 'need';

            
            if (activeFilters.includes('ALL')) return true;
            if (activeFilters.includes('FIXED') && isNeedCat) return true;
            if (activeFilters.includes('VARIABLE') && !isNeedCat) return true;
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
        percentage: chartTotal > 0 ? ((groupTotals[g.id] / chartTotal) * 100).toFixed(1) : 0,
        avgPerMonth: groupTotals[g.id] / numMonths,
        icon: g.icon,
        color: g.color || '#64748B',
        allocation_type: g.allocation_type,
        order_index: g.order_index || 999,
        categories: groupCatsMap[g.id] || []
      }))
      .sort((a, b) => (a.order_index - b.order_index) || (b.amount - a.amount));

    const groupChartData = {
      labels: sortedGroups.map(g => g.name),
      datasets: [{
        data: sortedGroups.map(g => g.amount),
        backgroundColor: sortedGroups.map(g => g.color),
        borderWidth: 2, borderColor: '#1e293b',
      }],
    };

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
        borderWidth: 2, borderColor: '#1e293b',
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
        borderWidth: 2, borderColor: '#1e293b',
      }],
    };

    const { chartData: mainChartData, chartType: mainChartType } = generateMainChartData({
      chartGroupBy, filterPeriod, sortedMonthsKeys, cashflowMap, 
      datesInPeriod, dailyAllMap, hideFixedExpenses, hideWantExpenses, isDarkMode,
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

    // ─── FORECASTING & DAILY METRICS ─────────────────────────────────────────
    let projectedExpense = 0, safeToSpend = 0, projectedSurplus = 0, showForecasting = false;
    let periodDays = datesInPeriod.length || 1;
    let effectiveDays = periodDays;
    let forecastingDetails = null;

    if (isCurrentMonth && datesInPeriod.length > 0) {
      showForecasting = true;
      const lastDayOfMonth = new Date(filterYear, filterMonth + 1, 0).getDate();
      const currentDay = Math.max(1, Math.min(new Date().getDate(), lastDayOfMonth));
      const remainingDays = Math.max(1, lastDayOfMonth - currentDay);
      
      // If excludeFuture is active in current month, average across days elapsed so far (currentDay)
      effectiveDays = excludeFuture ? currentDay : periodDays;
      
      const monthProgressPct = (currentDay / lastDayOfMonth) * 100;
      const variableRunRate = variableUpToToday / currentDay;
      const projectedVariableRemaining = variableRunRate * remainingDays;
      projectedExpense = totals.fixed + variableUpToToday + projectedVariableRemaining;
      projectedSurplus = totals.income - projectedExpense;
      const projectedSurplusPct = totals.income > 0 ? (projectedSurplus / totals.income) * 100 : 0;
      
      const remainingBudget = totals.income - totals.fixed - variableUpToToday;
      const daysToBudget = Math.max(1, lastDayOfMonth - currentDay + 1);
      safeToSpend = remainingBudget > 0 ? remainingBudget / daysToBudget : 0;

      // Pace analysis (Compare daily variable spending pace vs safe daily target)
      let paceStatus = { code: 'ON_TRACK', label: 'คุมงบได้ดี (On Track)', color: '#10b981', bg: 'bg-emerald-950/30' };
      if (projectedSurplus < 0) {
        paceStatus = { code: 'CRITICAL', label: 'เกินงบประมาณ (Critical)', color: '#da291c', bg: 'bg-red-950/40' };
      } else if (safeToSpend > 0 && variableRunRate > safeToSpend * 1.15) {
        paceStatus = { code: 'OVER_PACING', label: 'เร่งตัวเกินเป้า (High Pace)', color: '#f59e0b', bg: 'bg-amber-950/30' };
      } else if (safeToSpend > 0 && variableRunRate > safeToSpend) {
        paceStatus = { code: 'MODERATE', label: 'ทรงตัวใกล้เกณฑ์ (Moderate)', color: '#3b82f6', bg: 'bg-blue-950/30' };
      }

      // End of Month Financial Safety Grade
      let eomStatus = { code: 'EXCELLENT', label: 'โซนปลอดภัยสูง (Surplus Safe)', color: '#10b981', bg: 'bg-emerald-950/40', border: 'border-emerald-500' };
      if (projectedSurplus < 0) {
        eomStatus = { code: 'DEFICIT', label: 'ความเสี่ยงขาดดุล (Deficit Risk)', color: '#da291c', bg: 'bg-red-950/40', border: 'border-[#da291c]' };
      } else if (projectedSurplusPct < 5) {
        eomStatus = { code: 'TIGHT', label: 'โซนตึงตัว (Tight Buffer)', color: '#f59e0b', bg: 'bg-amber-950/40', border: 'border-amber-500' };
      } else if (projectedSurplusPct < 20) {
        eomStatus = { code: 'STABLE', label: 'โซนสมดุล (Stable)', color: '#3b82f6', bg: 'bg-blue-950/40', border: 'border-blue-500' };
      }

      // Break-even & Deficit Control Targets
      const maxAllowedExpense = totals.income;
      const requiredReduction = projectedExpense > totals.income ? projectedExpense - totals.income : 0;
      const requiredDailyReduction = variableRunRate > safeToSpend ? variableRunRate - safeToSpend : 0;

      forecastingDetails = {
        currentDay,
        lastDayOfMonth,
        remainingDays,
        monthProgressPct: Number(monthProgressPct.toFixed(1)),
        variableUpToToday,
        variableRunRate,
        projectedVariableRemaining,
        fixedTotal: totals.fixed,
        projectedExpense,
        projectedSurplus,
        projectedSurplusPct: Number(projectedSurplusPct.toFixed(1)),
        safeToSpend,
        actualDailyVariableAvg: variableRunRate,
        maxAllowedExpense,
        requiredReduction,
        requiredDailyReduction,
        paceStatus,
        eomStatus
      };
    }

    const adjustedDailyAvg = totals.expense / Math.max(1, effectiveDays);
    const adjustedFoodDailyAvg = totals.food / Math.max(1, effectiveDays);

    // ─── GLOBAL HEATMAP THRESHOLD ─────────────────────────────────────────────
    const globalValues = Object.values(globalDailySum).filter(v => v > 0).sort((a, b) => a - b);
    const globalMaxThreshold = globalValues.length > 0
      ? (globalValues[Math.floor(globalValues.length * 0.9)] || globalValues[globalValues.length - 1])
      : 100;

    // ─── DAY TYPE DISTRIBUTION ───────────────────────────────────────────────
    const dayTypeCounts = calculateDayTypeCounts(datesInPeriod, dayTypes, dayTypeConfig);

    return {
      isSingleMonthView, showForecasting, projectedExpense, safeToSpend, projectedSurplus, forecastingDetails,
      prevTotals, totalExpense: totals.expense, totalIncome: totals.income,
      totalSavings: totals.savings || 0, actualSavings, explicitSavings,
      netCashflow, savingsRate, chartTotal, numMonths, sortedCats,
      topTransactions: [...chartTx].sort((a, b) => b.amount - a.amount).slice(0, topXLimit),
      dailyAvg: adjustedDailyAvg,
      foodTotal: totals.food, foodDailyAvg: adjustedFoodDailyAvg,
      foodPercentage: totals.expense > 0 ? ((totals.food / totals.expense) * 100).toFixed(1) : 0,
      rentTotal: totals.rent, rentPercentage: totals.income > 0 ? ((totals.rent / totals.income) * 100).toFixed(1) : 0,
      rentSub: totals.rentSub,
      fixedTotal: totals.fixed, variableTotal: totals.variable,
      fixedPercentage: totals.expense > 0 ? ((totals.fixed / totals.expense) * 100).toFixed(1) : 0,
      variablePercentage: totals.expense > 0 ? ((totals.variable / totals.expense) * 100).toFixed(1) : 0,
      sparklineIncome, sparklineExpense, sparklineNet,
      weekendTotal: totals.weekend, weekdayTotal: totals.weekday,
      globalMaxThreshold, datesInPeriod, filterPeriod, dayTypeCounts,
      dailyAllMap, monthlyAllMap, dailyAllocMap, monthlyAllocMap,
      sortedMonthsKeys, monthlyCatMap, dailyCatMap,
      catChartData, mainChartData, mainChartType, sortedCashflow,
      sortedGroups, groupChartData,
      sortedAllocation, allocationChartData
    };
  }, [transactions, filterPeriod, categories, cashflowGroups, hideFixedExpenses, hideWantExpenses, dashboardCategory, chartGroupBy, topXLimit, dayTypes, dayTypeConfig, isDarkMode, summaryData, excludeFuture]);

  return analytics;
}
