// src/hooks/useAnalytics.js
import { useMemo } from 'react';
import { generateDatesForPeriod, isDateInFilter, parseDateStrToObj, toISODate } from '../utils/dateHelpers';
import { hexToRgb, formatMoney } from '../utils/formatters';
import { 
  createCategoryMap, 
  generateMainChartData, 
  calculateDayTypeCounts 
} from '../utils/analyticsHelpers';

function resolveTransactionContext(t, catMapLookup, cashflowGroups, fallbackExpId) {
  const amt = Number.parseFloat(t.amount) || 0;
  const catId = t.category_id || (catMapLookup[t.category]?.id) || 'unknown';
  const catObj = catMapLookup[catId] || { type: 'expense', cashflowGroup: fallbackExpId };
  
  const cGroupId = catObj.cashflowGroup;
  const groupObj = cashflowGroups?.find(g => g.id === cGroupId) || {};
  const groupType = groupObj.type || catObj.type || 'expense';
  const groupName = (groupObj.name || '').toLowerCase();
  
  const isInc = groupType === 'income';
  const isSav = groupType === 'savings';
  const isExp = !isInc && !isSav;

  const aType = t.allocation_type || groupObj.allocation_type || (isInc ? 'savings' : 'want');
  const isNeed = aType === 'need';
  const isWant = aType === 'want';

  return { amt, catId, catObj, cGroupId, groupObj, groupType, groupName, isInc, isSav, isExp, aType, isNeed, isWant };
}

function accumulateRentAndFoodTotals(amt, catName, isRent, isFood, totals) {
  if (isRent) {
    totals.rent += amt;
    if (catName === 'ค่าเช่า/ค่าหอพัก') totals.rentSub.rent += amt;
    else if (catName === 'ค่าไฟ') totals.rentSub.electricity += amt;
    else if (catName === 'ค่าเน็ต') totals.rentSub.internet += amt;
    else if (catName === 'ค่าน้ำ') totals.rentSub.water += amt;
  } else if (isFood) {
    totals.food += amt;
  }
}

function matchesDashboardFilter(catId, catName, isNeed, activeFilters) {
  if (activeFilters.includes('ALL')) return true;
  if (activeFilters.includes('FIXED') && isNeed) return true;
  if (activeFilters.includes('VARIABLE') && !isNeed) return true;
  if (activeFilters.includes(catId) || activeFilters.includes(catName)) return true;
  return false;
}

function accumulateFilteredExpense(t, txContext, ym, isoDate, state) {
  const { amt, catId, aType, isWant, cGroup, groupObj } = txContext;
  const {
    dailyAllMap, monthlyAllMap, chartTx, catMapData, wantCatMapData,
    dailyCatMap, monthlyCatMap, allocTotals, dailyAllocMap, monthlyAllocMap,
    allocGroupsMap, groupTotals,
  } = state;

  dailyAllMap[isoDate] = (dailyAllMap[isoDate] || 0) + amt;
  monthlyAllMap[ym] = (monthlyAllMap[ym] || 0) + amt;
  state.chartTotal += amt;
  chartTx.push(t);

  catMapData[catId] = (catMapData[catId] || 0) + amt;
  if (isWant) {
    wantCatMapData[catId] = (wantCatMapData[catId] || 0) + amt;
  }

  if (!dailyCatMap[catId]) dailyCatMap[catId] = {};
  dailyCatMap[catId][isoDate] = (dailyCatMap[catId][isoDate] || 0) + amt;
  if (!monthlyCatMap[catId]) monthlyCatMap[catId] = {};
  monthlyCatMap[catId][ym] = (monthlyCatMap[catId][ym] || 0) + amt;

  allocTotals[aType] = (allocTotals[aType] || 0) + amt;
  if (aType !== 'savings') {
    dailyAllocMap[aType][isoDate] = (dailyAllocMap[aType][isoDate] || 0) + amt;
    monthlyAllocMap[aType][ym] = (monthlyAllocMap[aType][ym] || 0) + amt;
  }

  if (cGroup) {
    let groupEntry = allocGroupsMap[aType]?.find(g => g.id === cGroup);
    if (!groupEntry) {
      groupEntry = { id: cGroup, name: groupObj.name, icon: groupObj.icon, amount: 0, color: groupObj.color };
      if (allocGroupsMap[aType]) allocGroupsMap[aType].push(groupEntry);
    }
    if (groupEntry) groupEntry.amount += amt;
    groupTotals[cGroup] = (groupTotals[cGroup] || 0) + amt;
  }
}

function accumulateSavingsItem(amt, isoDate, ym, cGroup, groupObj, state) {
  state.totals.savings += amt;
  state.cashflowMap[ym].totalSav += amt;
  state.allocTotals.savings += amt;

  state.dailyAllocMap.savings[isoDate] = (state.dailyAllocMap.savings[isoDate] || 0) + amt;
  state.monthlyAllocMap.savings[ym] = (state.monthlyAllocMap.savings[ym] || 0) + amt;

  if (cGroup) {
    let groupEntry = state.allocGroupsMap.savings.find(g => g.id === cGroup);
    if (!groupEntry) {
      groupEntry = { id: cGroup, name: groupObj.name, icon: groupObj.icon, amount: 0, color: groupObj.color };
      state.allocGroupsMap.savings.push(groupEntry);
    }
    groupEntry.amount += amt;
  }
}

function accumulateDayOfWeekStats(amt, isoDate, isFood, totals) {
  const dateObj = parseDateStrToObj(isoDate);
  const dow = dateObj.getDay();
  totals.dayOfWeekMap[dow] += amt;
  if (dow === 0 || dow === 6) {
    totals.weekend += amt;
    if (isFood) totals.foodWeekend += amt;
  } else {
    totals.weekday += amt;
    if (isFood) totals.foodWeekday += amt;
  }
  if (isFood) {
    totals.foodDailyMap[isoDate] = (totals.foodDailyMap[isoDate] || 0) + amt;
  }
}

function calculateSparklines({ useBackendTotals, summaryData, isSingleMonthView, datesInPeriod, dayIncomeMap, dayExpenseMap, sortedMonthsKeys, cashflowMap }) {
  const sparklineIncome = [];
  const sparklineExpense = [];
  const sparklineNet = [];

  if (useBackendTotals && summaryData.monthly && !isSingleMonthView) {
    summaryData.monthly.forEach(m => {
      sparklineIncome.push(m.income);
      sparklineExpense.push(m.expense);
      sparklineNet.push(m.income - m.expense);
    });
  } else if (isSingleMonthView) {
    datesInPeriod.forEach(d => {
      const inc = dayIncomeMap[d] || 0;
      const exp = dayExpenseMap[d] || 0;
      sparklineIncome.push(inc);
      sparklineExpense.push(exp);
      sparklineNet.push(inc - exp);
    });
  } else {
    sortedMonthsKeys.forEach(m => {
      const inc = cashflowMap[m].income;
      const exp = cashflowMap[m].totalExp;
      sparklineIncome.push(inc);
      sparklineExpense.push(exp);
      sparklineNet.push(inc - exp);
    });
  }
  return { sparklineIncome, sparklineExpense, sparklineNet };
}

function calculateForecastingDetails({
  isCurrentMonth,
  datesInPeriod,
  filterYear,
  filterMonth,
  excludeFuture,
  totals,
  expenseUpToToday,
  rentUpToToday,
}) {
  if (!isCurrentMonth || datesInPeriod.length === 0) {
    return { showForecasting: false, effectiveDays: datesInPeriod.length || 1, forecastingDetails: null, projectedExpense: 0, safeToSpend: 0, projectedSurplus: 0 };
  }

  const periodDays = datesInPeriod.length || 1;
  const lastDayOfMonth = new Date(filterYear, filterMonth + 1, 0).getDate();
  const currentDay = Math.max(1, Math.min(new Date().getDate(), lastDayOfMonth));
  const remainingDays = Math.max(1, lastDayOfMonth - currentDay);
  const effectiveDays = excludeFuture ? currentDay : periodDays;
  const monthProgressPct = (currentDay / lastDayOfMonth) * 100;

  const fixedCommitment = totals.rent;
  const dailyLivingUpToToday = Math.max(0, expenseUpToToday - rentUpToToday);
  const dailyLivingRunRate = dailyLivingUpToToday / currentDay;
  const projectedLivingRemaining = dailyLivingRunRate * remainingDays;

  const projectedExpense = fixedCommitment + dailyLivingUpToToday + projectedLivingRemaining;
  const projectedSurplus = totals.income - projectedExpense;
  const projectedSurplusPct = totals.income > 0 ? (projectedSurplus / totals.income) * 100 : 0;

  const remainingBudget = totals.income - fixedCommitment - dailyLivingUpToToday;
  const daysToBudget = Math.max(1, lastDayOfMonth - currentDay + 1);
  const safeToSpend = remainingBudget > 0 ? remainingBudget / daysToBudget : 0;

  let paceStatus = { code: 'ON_TRACK', label: 'คุมงบได้ดี (On Track)', color: '#10b981', bg: 'bg-emerald-950/30' };
  if (projectedSurplus < 0) {
    paceStatus = { code: 'CRITICAL', label: 'เกินงบประมาณ (Critical)', color: '#da291c', bg: 'bg-red-950/40' };
  } else if (safeToSpend > 0 && dailyLivingRunRate > safeToSpend * 1.15) {
    paceStatus = { code: 'OVER_PACING', label: 'เร่งตัวเกินเป้า (High Pace)', color: '#f59e0b', bg: 'bg-amber-950/30' };
  } else if (safeToSpend > 0 && dailyLivingRunRate > safeToSpend) {
    paceStatus = { code: 'MODERATE', label: 'ทรงตัวใกล้เกณฑ์ (Moderate)', color: '#3b82f6', bg: 'bg-blue-950/30' };
  }

  let eomStatus = { code: 'EXCELLENT', label: 'โซนปลอดภัยสูง (Surplus Safe)', color: '#10b981', bg: 'bg-emerald-950/40', border: 'border-emerald-500' };
  if (projectedSurplus < 0) {
    eomStatus = { code: 'DEFICIT', label: 'ความเสี่ยงขาดดุล (Deficit Risk)', color: '#da291c', bg: 'bg-red-950/40', border: 'border-[#da291c]' };
  } else if (projectedSurplusPct < 5) {
    eomStatus = { code: 'TIGHT', label: 'โซนตึงตัว (Tight Buffer)', color: '#f59e0b', bg: 'bg-amber-950/40', border: 'border-amber-500' };
  } else if (projectedSurplusPct < 20) {
    eomStatus = { code: 'STABLE', label: 'โซนสมดุล (Stable)', color: '#3b82f6', bg: 'bg-blue-950/40', border: 'border-blue-500' };
  }

  const maxAllowedExpense = totals.income;
  const requiredReduction = projectedExpense > totals.income ? projectedExpense - totals.income : 0;
  const requiredDailyReduction = dailyLivingRunRate > safeToSpend ? dailyLivingRunRate - safeToSpend : 0;

  const forecastingDetails = {
    currentDay,
    lastDayOfMonth,
    remainingDays,
    monthProgressPct: Number(monthProgressPct.toFixed(1)),
    variableUpToToday: dailyLivingUpToToday,
    variableRunRate: dailyLivingRunRate,
    projectedVariableRemaining: projectedLivingRemaining,
    fixedTotal: fixedCommitment,
    projectedExpense,
    projectedSurplus,
    projectedSurplusPct: Number(projectedSurplusPct.toFixed(1)),
    safeToSpend,
    actualDailyVariableAvg: dailyLivingRunRate,
    maxAllowedExpense,
    requiredReduction,
    requiredDailyReduction,
    paceStatus,
    eomStatus
  };

  return { showForecasting: true, effectiveDays, forecastingDetails, projectedExpense, safeToSpend, projectedSurplus };
}

function trackTrendAndGlobal(isoDate, amt, isExp, isInc, startPrev, endPrev, globalDailySum, prevTotals) {
  if (isExp) {
    globalDailySum[isoDate] = (globalDailySum[isoDate] || 0) + amt;
  }
  if (startPrev && isoDate >= startPrev && isoDate <= endPrev) {
    if (isInc) prevTotals.income += amt;
    else if (isExp) prevTotals.expense += amt;
  }
}

function trackForecastingUpToToday(isoDate, amt, isExp, isNeed, isRent, isFood, isCurrentMonth, todayStr, forecastRef) {
  if (isCurrentMonth && isoDate <= todayStr && isExp) {
    forecastRef.expenseUpToToday += amt;
    if (!isNeed) forecastRef.variableUpToToday += amt;
    if (isRent) forecastRef.rentUpToToday += amt;
    if (isFood) forecastRef.foodUpToToday += amt;
  }
}

function ensureCashflowMonth(cashflowMap, ym, cashflowGroups) {
  if (!cashflowMap[ym]) {
    const groups = {};
    for (const g of cashflowGroups) {
      groups[g.id] = 0;
    }
    cashflowMap[ym] = { monthStr: ym, totalExp: 0, income: 0, totalSav: 0, groups };
  }
}

function isFoodCategory(cGroupId, foodGroupId, groupName) {
  if (cGroupId && cGroupId === foodGroupId) return true;
  return groupName.includes('กิน') || groupName.includes('อาหาร') || groupName.includes('food');
}

function isRentCategory(cGroupId, rentGroupId, groupName) {
  if (cGroupId && cGroupId === rentGroupId) return true;
  return groupName.includes('หอ') || groupName.includes('ที่พัก') || groupName.includes('rent') || groupName.includes('เช่า');
}

function resolveFallbackGroupId(cGroupId, isInc, isSav, fallbackIncId, fallbackSavId, fallbackExpId) {
  if (cGroupId) return cGroupId;
  if (isInc) return fallbackIncId;
  if (isSav) return fallbackSavId;
  return fallbackExpId;
}

function checkExpenseFilterPass(isNeed, isWant, hideFixedExpenses, hideWantExpenses, catId, catName, activeFilters) {
  if (hideFixedExpenses && isNeed) return false;
  if (hideWantExpenses && isWant) return false;
  return matchesDashboardFilter(catId, catName, isNeed, activeFilters);
}

function accumulateExpenseItem({ t, txContext, ym, isoDate, isFood, isRent, hideFixedExpenses, hideWantExpenses, activeFilters, totals, cashflowMap, dayExpenseMap, stateRef, cGroup }) {
  const { amt, catId, catObj, aType, isNeed, isWant, groupObj } = txContext;
  totals.expense += amt;
  cashflowMap[ym].totalExp += amt;
  dayExpenseMap[isoDate] = (dayExpenseMap[isoDate] || 0) + amt;
  
  accumulateRentAndFoodTotals(amt, catObj.name, isRent, isFood, totals);

  if (isNeed) {
    totals.fixed += amt;
  } else {
    totals.variable += amt;
  }

  if (checkExpenseFilterPass(isNeed, isWant, hideFixedExpenses, hideWantExpenses, catId, catObj.name, activeFilters)) {
    accumulateFilteredExpense(t, { amt, catId, aType, isWant, cGroup, groupObj }, ym, isoDate, stateRef);
  }
}

function processAnalyticsTx({
  t, isoDate, txContext, filterPeriod, foodGroupId, rentGroupId,
  fallbackIncId, fallbackSavId, fallbackExpId, cashflowGroups,
  hideFixedExpenses, hideWantExpenses, activeFilters,
  uniqueMonthsSet, cashflowMap, dayIncomeMap, dayExpenseMap,
  stateRef, totals
}) {
  if (!isDateInFilter(isoDate, filterPeriod)) return null;

  const { amt, cGroupId, groupObj, groupName, isInc, isSav, isExp } = txContext;
  const ym = isoDate.substring(0, 7);
  uniqueMonthsSet.add(ym);

  ensureCashflowMonth(cashflowMap, ym, cashflowGroups);

  const cGroup = resolveFallbackGroupId(cGroupId, isInc, isSav, fallbackIncId, fallbackSavId, fallbackExpId);
  if (cashflowMap[ym].groups[cGroup] !== undefined) {
    cashflowMap[ym].groups[cGroup] += amt;
  }

  const isFood = isFoodCategory(cGroupId, foodGroupId, groupName);
  const isRent = isRentCategory(cGroupId, rentGroupId, groupName);

  if (isInc) {
    totals.income += amt;
    cashflowMap[ym].income += amt;
    dayIncomeMap[isoDate] = (dayIncomeMap[isoDate] || 0) + amt;
  } else if (isSav) {
    accumulateSavingsItem(amt, isoDate, ym, cGroup, groupObj, stateRef);
  } else {
    accumulateExpenseItem({
      t, txContext, ym, isoDate, isFood, isRent,
      hideFixedExpenses, hideWantExpenses, activeFilters,
      totals, cashflowMap, dayExpenseMap, stateRef, cGroup
    });
  }

  if (isExp) {
    accumulateDayOfWeekStats(amt, isoDate, isFood, totals);
  }

  return { isFood, isRent };
}

function filterCategoriesByDashboard(categories, cashflowGroups, activeFilters) {
  if (activeFilters.includes('ALL')) return categories;
  return categories.filter(c => {
    const catGroupObj = cashflowGroups?.find(g => g.id === c.cashflow_group_id) || {};
    const isNeedCat = (c.allocation_type || catGroupObj.allocation_type) === 'need';
    const isWantCat = (c.allocation_type || catGroupObj.allocation_type) === 'want';
    if (activeFilters.includes('FIXED') && isNeedCat) return true;
    if (activeFilters.includes('VARIABLE') && isWantCat) return true;
    return activeFilters.includes(c.id) || activeFilters.includes(c.name);
  });
}

function buildSortedCategories(catMapData, catMapLookup, chartTotal, filteredCats) {
  return Object.entries(catMapData)
    .map(([catId, amount]) => {
      const catObj = catMapLookup[catId] || { name: 'อื่นๆ', icon: '📦', color: '#94a3b8', order_index: 999 };
      return {
        id: catId,
        name: catObj.name,
        icon: catObj.icon || '📦',
        color: catObj.color || '#94a3b8',
        amount,
        percentage: chartTotal > 0 ? ((amount / chartTotal) * 100).toFixed(1) : 0,
        cashflow_group_id: catObj.cashflowGroup || catObj.cashflow_group_id,
        order_index: catObj.order_index ?? 999
      };
    })
    .filter(c => filteredCats.some(fc => fc.id === c.id))
    .sort((a, b) => b.amount - a.amount);
}

function buildGroupBreakdown(catMapData, catMapLookup, groupTotals, cashflowGroups, numMonths, chartTotal) {
  const groupCatsMap = {};
  Object.entries(catMapData).forEach(([catId, amount]) => {
    const catObj = catMapLookup[catId];
    if (!catObj || catObj.type !== 'expense') return;
    const gId = catObj.cashflowGroup;
    if (!gId || groupTotals[gId] === undefined) return;

    if (!groupCatsMap[gId]) groupCatsMap[gId] = [];
    groupCatsMap[gId].push({
      id: catId,
      name: catObj.name,
      amount,
      icon: catObj.icon,
      color: catObj.color,
      order_index: catObj.order_index || 999
    });
  });

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

  return { sortedGroups, groupChartData };
}

function buildAllocationBreakdown(allocTotals, allocGroupsMap, totals, netCashflow) {
  Object.keys(allocGroupsMap).forEach(key => {
    const total = allocTotals[key];
    allocGroupsMap[key] = allocGroupsMap[key]
      .map(g => ({
        ...g,
        relativePercentage: total > 0 ? ((g.amount / total) * 100).toFixed(0) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  });

  const netSavingsActual = netCashflow;
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

  return { sortedAllocation, allocationChartData };
}

function calculateWorkdayAndHolidayStats(datesInPeriod, totals) {
  let weekendDaysCount = 0;
  datesInPeriod.forEach(d => {
    const dateObj = parseDateStrToObj(d);
    const dow = dateObj.getDay();
    if (dow === 0 || dow === 6) weekendDaysCount++;
  });
  const weekdayDaysCount = Math.max(1, datesInPeriod.length - weekendDaysCount);
  const validWeekendDays = Math.max(1, weekendDaysCount);

  return {
    foodWorkdayAvg: totals.foodWeekday / weekdayDaysCount,
    foodHolidayAvg: totals.foodWeekend / validWeekendDays,
    dailyWorkdayAvg: totals.weekday / weekdayDaysCount,
    dailyHolidayAvg: totals.weekend / validWeekendDays,
    maxFoodDayAmount: Object.keys(totals.foodDailyMap).length > 0 
      ? Math.max(...Object.values(totals.foodDailyMap)) 
      : 0
  };
}

function calculateTopWantCategories(wantCatMapData, catMapLookup, variableTotal) {
  return Object.entries(wantCatMapData)
    .map(([catId, amount]) => {
      const catObj = catMapLookup[catId] || { name: 'อื่นๆ', icon: '🛍️', color: '#f59e0b' };
      return {
        id: catId,
        name: catObj.name,
        icon: catObj.icon || '🛍️',
        color: catObj.color || '#f59e0b',
        amount,
        allocation_type: 'want',
        pctOfWant: variableTotal > 0 ? ((amount / variableTotal) * 100).toFixed(0) : 0
      };
    })
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);
}

function resolveCashflowGroups(cashflowGroups) {
  const groups = cashflowGroups || [];
  const incomeGroups = groups.filter(g => g.type === 'income');
  const savingsGroups = groups.filter(g => g.type === 'savings');
  const expenseGroups = groups.filter(g => g.type === 'expense');

  const fallbackIncId = incomeGroups[0]?.id || 'cg_bonus';
  const fallbackSavId = savingsGroups[0]?.id || 'cg_savings';
  const fallbackExpId = expenseGroups[0]?.id || 'cg_variable';

  const foodKeywords = ['อาหาร', 'food', 'กิน'];
  const rentKeywords = ['หอ', 'ที่พัก', 'rent', 'เช่า'];

  const matchesKeyword = (name, keywords) => {
    const lower = (name || '').toLowerCase();
    return keywords.some(k => lower.includes(k));
  };

  const foodGroup = groups.find(g => matchesKeyword(g.name, foodKeywords));
  const rentGroup = groups.find(g => matchesKeyword(g.name, rentKeywords));

  return {
    fallbackIncId,
    fallbackSavId,
    fallbackExpId,
    foodGroupId: foodGroup?.id,
    rentGroupId: rentGroup?.id,
  };
}

function calculatePeriodWindow(filterPeriod, datesInPeriod) {
  let startPrev = null;
  let endPrev = null;

  if (filterPeriod !== 'ALL' && datesInPeriod.length > 0) {
    const firstDate = new Date(datesInPeriod[0]);
    const lastDate = new Date(datesInPeriod[datesInPeriod.length - 1]);
    const durationMs = lastDate.getTime() - firstDate.getTime() + 86400000;
    const prevEnd = new Date(firstDate.getTime() - 86400000);
    const prevStart = new Date(prevEnd.getTime() - durationMs + 86400000);
    startPrev = prevStart.toISOString().split('T')[0];
    endPrev = prevEnd.toISOString().split('T')[0];
  }

  const isSingleMonthView = Boolean(filterPeriod.match(/^\d{4}-\d{2}$/));
  let todayStr = '';
  let filterYear = 0;
  let filterMonth = 0;
  let isCurrentMonth = false;

  if (isSingleMonthView) {
    const parts = filterPeriod.split('-');
    filterYear = Number.parseInt(parts[0], 10);
    filterMonth = Number.parseInt(parts[1], 10) - 1;
    const today = new Date();
    isCurrentMonth = today.getFullYear() === filterYear && today.getMonth() === filterMonth;
    todayStr = today.toISOString().split('T')[0];
  }

  return {
    startPrev,
    endPrev,
    isSingleMonthView,
    todayStr,
    filterYear,
    filterMonth,
    isCurrentMonth,
  };
}

function createInitialAnalyticsState() {
  const totals = {
    income: 0, expense: 0, savings: 0,
    fixed: 0, variable: 0, food: 0, rent: 0,
    rentSub: { rent: 0, electricity: 0, internet: 0, water: 0 },
    weekend: 0, weekday: 0,
    foodWeekend: 0, foodWeekday: 0, foodDailyMap: {},
    dayOfWeekMap: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  };

  const allocTotals = { need: 0, want: 0, savings: 0 };
  const allocGroupsMap = { need: [], want: [], savings: [] };
  const groupTotals = {};
  const dayIncomeMap = {};
  const dayExpenseMap = {};
  const uniqueMonthsSet = new Set();
  const cashflowMap = {};
  const catMapData = {};
  const wantCatMapData = {};
  const dailyAllMap = {};
  const monthlyAllMap = {};
  const dailyCatMap = {};
  const monthlyCatMap = {};
  const dailyAllocMap = { need: {}, want: {}, savings: {} };
  const monthlyAllocMap = { need: {}, want: {}, savings: {} };
  const chartTx = [];
  const globalDailySum = {};
  const prevTotals = { income: 0, expense: 0, net: 0 };
  const forecastRef = { expenseUpToToday: 0, variableUpToToday: 0, foodUpToToday: 0, rentUpToToday: 0 };

  const stateRef = {
    totals,
    allocTotals,
    allocGroupsMap,
    groupTotals,
    dailyAllMap,
    monthlyAllMap,
    chartTx,
    catMapData,
    wantCatMapData,
    dailyCatMap,
    monthlyCatMap,
    dailyAllocMap,
    monthlyAllocMap,
    cashflowMap,
    chartTotal: 0,
  };

  return {
    totals,
    allocTotals,
    allocGroupsMap,
    groupTotals,
    dayIncomeMap,
    dayExpenseMap,
    uniqueMonthsSet,
    cashflowMap,
    catMapData,
    wantCatMapData,
    dailyAllMap,
    monthlyAllMap,
    dailyCatMap,
    monthlyCatMap,
    dailyAllocMap,
    monthlyAllocMap,
    chartTx,
    globalDailySum,
    prevTotals,
    forecastRef,
    stateRef
  };
}

function executeTransactionAggregation({
  transactions,
  catMapLookup,
  cashflowGroups,
  groupMeta,
  windowMeta,
  filterPeriod,
  hideFixedExpenses,
  hideWantExpenses,
  activeFilters,
  state
}) {
  const { fallbackIncId, fallbackSavId, fallbackExpId, foodGroupId, rentGroupId } = groupMeta;
  const { startPrev, endPrev, isCurrentMonth, todayStr } = windowMeta;
  const { globalDailySum, prevTotals, uniqueMonthsSet, cashflowMap, dayIncomeMap, dayExpenseMap, stateRef, totals, forecastRef } = state;

  transactions.forEach(t => {
    const isoDate = toISODate(t.date);
    if (!isoDate) return;

    const txContext = resolveTransactionContext(t, catMapLookup, cashflowGroups, fallbackExpId);
    trackTrendAndGlobal(isoDate, txContext.amt, txContext.isExp, txContext.isInc, startPrev, endPrev, globalDailySum, prevTotals);

    const flags = processAnalyticsTx({
      t, isoDate, txContext, filterPeriod, foodGroupId, rentGroupId,
      fallbackIncId, fallbackSavId, fallbackExpId, cashflowGroups,
      hideFixedExpenses, hideWantExpenses, activeFilters,
      uniqueMonthsSet, cashflowMap, dayIncomeMap, dayExpenseMap,
      stateRef, totals
    });

    if (flags) {
      trackForecastingUpToToday(
        isoDate, txContext.amt, txContext.isExp, txContext.isNeed,
        flags.isRent, flags.isFood, isCurrentMonth, todayStr, forecastRef
      );
    }
  });
}

function applyBackendSummaryTotals(totals, summaryData) {
  if (!summaryData?.summary) return;
  totals.income = summaryData.summary.income;
  totals.expense = summaryData.summary.expense;
  totals.savings = summaryData.summary.savings;
}

function applyBackendMonthlyCashflow(cashflowMap, summaryData) {
  if (!summaryData?.monthly) return;
  summaryData.monthly.forEach(m => {
    cashflowMap[m.month] = { 
      monthStr: m.month, income: m.income, totalExp: m.expense, totalSav: m.savings, groups: m.groups || {} 
    };
  });
}

function calculateGlobalMaxThreshold(globalDailySum) {
  const globalValues = Object.values(globalDailySum).filter(v => v > 0).sort((a, b) => a - b);
  if (globalValues.length === 0) return 100;
  const p90Index = Math.floor(globalValues.length * 0.9);
  return globalValues[p90Index] || globalValues[globalValues.length - 1];
}

function calculateSavingsMetrics(totals, uniqueMonthsSet) {
  const actualSavings = totals.income - totals.expense;
  const explicitSavings = totals.savings || 0;
  const numMonths = uniqueMonthsSet.size || 1;
  const savingsRate = totals.income > 0 ? Number.parseFloat(((actualSavings / totals.income) * 100).toFixed(1)) : 0;
  return { actualSavings, explicitSavings, numMonths, savingsRate };
}

function calculateFinancialPercentages(totals) {
  const hasExp = totals.expense > 0;
  const hasInc = totals.income > 0;
  return {
    foodPercentage: hasExp ? ((totals.food / totals.expense) * 100).toFixed(1) : 0,
    foodPctOfIncome: hasInc ? ((totals.food / totals.income) * 100).toFixed(1) : 0,
    rentPercentage: hasInc ? ((totals.rent / totals.income) * 100).toFixed(1) : 0,
    fixedPercentage: hasExp ? ((totals.fixed / totals.expense) * 100).toFixed(1) : 0,
    variablePercentage: hasExp ? ((totals.variable / totals.expense) * 100).toFixed(1) : 0,
  };
}

export default function useAnalytics({
  transactions = [],
  categories = [],
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
    const catMapLookup = createCategoryMap(categories);
    const useBackendTotals = Boolean(summaryData);
    const groupMeta = resolveCashflowGroups(cashflowGroups);

    const datesInPeriod = generateDatesForPeriod(filterPeriod, transactions);
    const windowMeta = calculatePeriodWindow(filterPeriod, datesInPeriod);
    const activeFilters = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];

    const state = createInitialAnalyticsState();

    executeTransactionAggregation({
      transactions,
      catMapLookup,
      cashflowGroups,
      groupMeta,
      windowMeta,
      filterPeriod,
      hideFixedExpenses,
      hideWantExpenses,
      activeFilters,
      state
    });

    const { totals, cashflowMap, prevTotals, forecastRef, stateRef, uniqueMonthsSet } = state;
    const { expenseUpToToday, rentUpToToday } = forecastRef;
    const chartTotal = stateRef.chartTotal;
    prevTotals.net = prevTotals.income - prevTotals.expense;

    if (useBackendTotals) {
      applyBackendSummaryTotals(totals, summaryData);
    }

    const netCashflow = totals.income - totals.expense;
    const { actualSavings, explicitSavings, numMonths, savingsRate } = calculateSavingsMetrics(totals, uniqueMonthsSet);

    const filteredCats = filterCategoriesByDashboard(categories, cashflowGroups, activeFilters);
    const sortedCats = buildSortedCategories(state.catMapData, catMapLookup, chartTotal, filteredCats);

    const { sortedGroups, groupChartData } = buildGroupBreakdown(state.catMapData, catMapLookup, state.groupTotals, cashflowGroups, numMonths, chartTotal);
    const { sortedAllocation, allocationChartData } = buildAllocationBreakdown(state.allocTotals, state.allocGroupsMap, totals, netCashflow);

    if (useBackendTotals) {
      applyBackendMonthlyCashflow(cashflowMap, summaryData);
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
      datesInPeriod, dailyAllMap: state.dailyAllMap, hideFixedExpenses, hideWantExpenses, isDarkMode,
      dashboardCategory, monthlyAllMap: state.monthlyAllMap, monthlyCatMap: state.monthlyCatMap, dailyCatMap: state.dailyCatMap, catMap: catMapLookup
    });

    const { sparklineIncome, sparklineExpense, sparklineNet } = calculateSparklines({
      useBackendTotals,
      summaryData,
      isSingleMonthView: windowMeta.isSingleMonthView,
      datesInPeriod,
      dayIncomeMap: state.dayIncomeMap,
      dayExpenseMap: state.dayExpenseMap,
      sortedMonthsKeys,
      cashflowMap,
    });

    const {
      showForecasting,
      effectiveDays,
      forecastingDetails,
      projectedExpense,
      safeToSpend,
      projectedSurplus,
    } = calculateForecastingDetails({
      isCurrentMonth: windowMeta.isCurrentMonth,
      datesInPeriod,
      filterYear: windowMeta.filterYear,
      filterMonth: windowMeta.filterMonth,
      excludeFuture,
      totals,
      expenseUpToToday,
      rentUpToToday,
    });

    const adjustedDailyAvg = totals.expense / Math.max(1, effectiveDays);
    const adjustedFoodDailyAvg = totals.food / Math.max(1, effectiveDays);
    const globalMaxThreshold = calculateGlobalMaxThreshold(state.globalDailySum);

    const dayTypeCounts = calculateDayTypeCounts(datesInPeriod, dayTypes, dayTypeConfig);
    const {
      foodWorkdayAvg,
      foodHolidayAvg,
      dailyWorkdayAvg,
      dailyHolidayAvg,
      maxFoodDayAmount,
    } = calculateWorkdayAndHolidayStats(datesInPeriod, totals);

    const topWantCategories = calculateTopWantCategories(state.wantCatMapData, catMapLookup, totals.variable);
    const pcts = calculateFinancialPercentages(totals);

    return {
      isSingleMonthView: windowMeta.isSingleMonthView, showForecasting, projectedExpense, safeToSpend, projectedSurplus, forecastingDetails,
      prevTotals, totalExpense: totals.expense, totalIncome: totals.income,
      totalSavings: totals.savings || 0, actualSavings, explicitSavings,
      netCashflow, savingsRate, chartTotal, numMonths, sortedCats,
      topTransactions: [...state.chartTx].sort((a, b) => b.amount - a.amount).slice(0, topXLimit),
      dailyAvg: adjustedDailyAvg,
      foodTotal: totals.food, foodDailyAvg: adjustedFoodDailyAvg,
      foodPercentage: pcts.foodPercentage,
      foodPctOfIncome: pcts.foodPctOfIncome,
      foodWorkdayAvg, foodHolidayAvg, dailyWorkdayAvg, dailyHolidayAvg, maxFoodDayAmount,
      topWantCategories,
      rentTotal: totals.rent,
      rentPercentage: pcts.rentPercentage,
      rentSub: totals.rentSub,
      fixedTotal: totals.fixed, variableTotal: totals.variable,
      fixedPercentage: pcts.fixedPercentage,
      variablePercentage: pcts.variablePercentage,
      sparklineIncome, sparklineExpense, sparklineNet,
      weekendTotal: totals.weekend, weekdayTotal: totals.weekday,
      globalMaxThreshold, datesInPeriod, filterPeriod, dayTypeCounts,
      dailyAllMap: state.dailyAllMap, monthlyAllMap: state.monthlyAllMap, dailyAllocMap: state.dailyAllocMap, monthlyAllocMap: state.monthlyAllocMap,
      sortedMonthsKeys, monthlyCatMap: state.monthlyCatMap, dailyCatMap: state.dailyCatMap,
      catChartData, mainChartData, mainChartType, sortedCashflow,
      sortedGroups, groupChartData,
      sortedAllocation, allocationChartData
    };
  }, [transactions, filterPeriod, categories, cashflowGroups, hideFixedExpenses, hideWantExpenses, dashboardCategory, chartGroupBy, topXLimit, dayTypes, dayTypeConfig, isDarkMode, summaryData, excludeFuture]);

  return analytics;
}
