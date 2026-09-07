// src/hooks/useAnalytics.js
import { useMemo } from 'react';
import { TransactionDisplay, Category, CashflowGroup, DayType } from '../types';
import { generateDatesForPeriod, isDateInFilter, parseDateStrToObj, toISODate } from '../utils/dateHelpers';
import { 
  createCategoryMap, 
  generateMainChartData, 
  calculateDayTypeCounts 
} from '../utils/analyticsHelpers';

function resolveTransactionContext(t: any, catMapLookup: Record<string, any>, cashflowGroups: CashflowGroup[], fallbackExpId: string) {
  const amt = Number.parseFloat(t.amount) || 0;
  const catId = t.category_id || (catMapLookup[t.category]?.id) || 'unknown';
  const catObj = catMapLookup[catId] || { type: 'expense', cashflowGroup: fallbackExpId };
  
  const cGroupId = catObj.cashflowGroup;
  const groupObj: any = cashflowGroups?.find((g: any) => g.id === cGroupId) || {};
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

function accumulateRentAndFoodTotals(amt: number, catName: string, isRent: boolean, isFood: boolean, totals: any) {
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

function accumulateSubscriptionTotals(t: any, amt: number, catName: string, catId: string, totals: any, isoDate: string) {
  totals.subscription += amt;
  totals.subscriptionCount += 1;
  const lowerCat = (catName || '').toLowerCase();
  if (lowerCat.includes('ซอฟต์แวร์') || lowerCat.includes('ai') || lowerCat.includes('software')) {
    totals.subscriptionSub.software += amt;
  } else if (lowerCat.includes('ช้อปปิ้ง') || lowerCat.includes('shopping') || lowerCat.includes('ส่งอาหาร')) {
    totals.subscriptionSub.shopping += amt;
  } else if (lowerCat.includes('บันเทิง') || lowerCat.includes('สตรีม') || lowerCat.includes('stream')) {
    totals.subscriptionSub.streaming += amt;
  } else {
    totals.subscriptionSub.other += amt;
  }
  totals.subscriptionItems.push({
    id: t.id,
    date: isoDate,
    description: (t.description || '').trim() || catName || 'บริการรายเดือน',
    amount: amt,
    categoryName: catName,
    categoryId: catId
  });
}

function matchesDashboardFilter(catId: string, catName: string, isNeed: boolean, activeFilters: string[]) {
  if (activeFilters.includes('ALL')) return true;
  if (activeFilters.includes('FIXED') && isNeed) return true;
  if (activeFilters.includes('VARIABLE') && !isNeed) return true;
  if (activeFilters.includes(catId) || activeFilters.includes(catName)) return true;
  return false;
}

function accumulateFilteredExpense(t: any, txContext: any, ym: string, isoDate: string, state: any) {
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
    let groupEntry = allocGroupsMap[aType]?.find((g: any) => g.id === cGroup);
    if (!groupEntry) {
      groupEntry = { id: cGroup, name: groupObj.name, icon: groupObj.icon, amount: 0, color: groupObj.color };
      if (allocGroupsMap[aType]) allocGroupsMap[aType].push(groupEntry);
    }
    if (groupEntry) groupEntry.amount += amt;
    groupTotals[cGroup] = (groupTotals[cGroup] || 0) + amt;
  }
}

function accumulateSavingsItem(amt: number, isoDate: string, ym: string, cGroup: string, groupObj: any, state: any) {
  state.totals.savings += amt;
  state.cashflowMap[ym].totalSav += amt;
  state.allocTotals.savings += amt;

  state.dailyAllocMap.savings[isoDate] = (state.dailyAllocMap.savings[isoDate] || 0) + amt;
  state.monthlyAllocMap.savings[ym] = (state.monthlyAllocMap.savings[ym] || 0) + amt;

  if (cGroup) {
    let groupEntry = state.allocGroupsMap.savings.find((g: any) => g.id === cGroup);
    if (!groupEntry) {
      groupEntry = { id: cGroup, name: groupObj.name, icon: groupObj.icon, amount: 0, color: groupObj.color };
      state.allocGroupsMap.savings.push(groupEntry);
    }
    groupEntry.amount += amt;
  }
}

function accumulateDayOfWeekStats(amt: number, isoDate: string, isFood: boolean, totals: any) {
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

function calculateSparklines({ useBackendTotals, summaryData, isSingleMonthView, datesInPeriod, dayIncomeMap, dayExpenseMap, sortedMonthsKeys, cashflowMap }: any) {
  const sparklineIncome: number[] = [];
  const sparklineExpense: number[] = [];
  const sparklineNet: number[] = [];

  if (useBackendTotals && summaryData.monthly && !isSingleMonthView) {
    summaryData.monthly.forEach((m: any) => {
      sparklineIncome.push(m.income);
      sparklineExpense.push(m.expense);
      sparklineNet.push(m.income - m.expense);
    });
  } else if (isSingleMonthView) {
    datesInPeriod.forEach((d: string) => {
      const inc = dayIncomeMap[d] || 0;
      const exp = dayExpenseMap[d] || 0;
      sparklineIncome.push(inc);
      sparklineExpense.push(exp);
      sparklineNet.push(inc - exp);
    });
  } else {
    sortedMonthsKeys.forEach((m: string) => {
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
}: any) {
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

function trackTrendAndGlobal({ isoDate, amt, isExp, isInc, startPrev, endPrev, globalDailySum, prevTotals }: any) {
  if (isExp) {
    globalDailySum[isoDate] = (globalDailySum[isoDate] || 0) + amt;
  }
  if (startPrev && isoDate >= startPrev && isoDate <= endPrev) {
    prevTotals.txCount = (prevTotals.txCount || 0) + 1;
    if (isInc) prevTotals.income += amt;
    else if (isExp) prevTotals.expense += amt;
  }
}

function trackForecastingUpToToday({ isoDate, amt, isExp, isNeed, isRent, isFood, isCurrentMonth, todayStr, forecastRef }: any) {
  if (isCurrentMonth && isoDate <= todayStr && isExp) {
    forecastRef.expenseUpToToday += amt;
    if (!isNeed) forecastRef.variableUpToToday += amt;
    if (isRent) forecastRef.rentUpToToday += amt;
    if (isFood) forecastRef.foodUpToToday += amt;
  }
}

function ensureCashflowMonth(cashflowMap: Record<string, any>, ym: string, cashflowGroups: CashflowGroup[]) {
  if (!cashflowMap[ym]) {
    const groups: Record<string, number> = {};
    for (const g of cashflowGroups) {
      groups[g.id] = 0;
    }
    cashflowMap[ym] = { monthStr: ym, totalExp: 0, income: 0, totalSav: 0, groups };
  }
}

function isFoodCategory(cGroupId: string | undefined, foodGroupId: string | undefined, groupName: string) {
  if (cGroupId && cGroupId === foodGroupId) return true;
  return groupName.includes('กิน') || groupName.includes('อาหาร') || groupName.includes('food');
}

function isRentCategory(cGroupId: string | undefined, rentGroupId: string | undefined, groupName: string) {
  if (cGroupId && cGroupId === rentGroupId) return true;
  return groupName.includes('หอ') || groupName.includes('ที่พัก') || groupName.includes('rent') || groupName.includes('เช่า');
}

function isSubscriptionCategory(cGroupId: string | undefined, subscriptionGroupId: string | undefined, groupName: string, catName: string = '') {
  if (cGroupId && cGroupId === subscriptionGroupId) return true;
  const lowerGroupName = (groupName || '').toLowerCase();
  const lowerCatName = (catName || '').toLowerCase();
  if (lowerGroupName.includes('บริการรายเดือน') || lowerGroupName.includes('subscription') || lowerGroupName.includes('รายเดือน')) return true;
  if (lowerCatName.includes('ซอฟต์แวร์') || lowerCatName.includes('สมาชิกช้อปปิ้ง') || lowerCatName.includes('สตรีมมิ่ง') || lowerCatName.includes('subscription')) return true;
  return false;
}

function resolveFallbackGroupId(cGroupId: string | undefined, isInc: boolean, isSav: boolean, fallbackIncId: string, fallbackSavId: string, fallbackExpId: string) {
  if (cGroupId) return cGroupId;
  if (isInc) return fallbackIncId;
  if (isSav) return fallbackSavId;
  return fallbackExpId;
}

function checkExpenseFilterPass(isNeed: boolean, isWant: boolean, hideFixedExpenses: boolean, hideWantExpenses: boolean, catId: string, catName: string, activeFilters: string[]) {
  if (hideFixedExpenses && isNeed) return false;
  if (hideWantExpenses && isWant) return false;
  return matchesDashboardFilter(catId, catName, isNeed, activeFilters);
}

function accumulateExpenseItem({ t, txContext, ym, isoDate, isFood, isRent, isSubscription, hideFixedExpenses, hideWantExpenses, activeFilters, totals, cashflowMap, dayExpenseMap, stateRef, cGroup }: any) {
  const { amt, catId, catObj, aType, isNeed, isWant, groupObj } = txContext;
  totals.expense += amt;
  cashflowMap[ym].totalExp += amt;
  dayExpenseMap[isoDate] = (dayExpenseMap[isoDate] || 0) + amt;
  
  accumulateRentAndFoodTotals(amt, catObj.name, isRent, isFood, totals);
  if (isSubscription) {
    accumulateSubscriptionTotals(t, amt, catObj.name, catId, totals, isoDate);
  }

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
  t, isoDate, txContext, filterPeriod, foodGroupId, rentGroupId, subscriptionGroupId,
  fallbackIncId, fallbackSavId, fallbackExpId, cashflowGroups,
  hideFixedExpenses, hideWantExpenses, activeFilters,
  uniqueMonthsSet, cashflowMap, dayIncomeMap, dayExpenseMap,
  stateRef, totals
}: any) {
  if (!isDateInFilter(isoDate, filterPeriod)) return null;

  const { amt, catObj, cGroupId, groupObj, groupName, isInc, isSav, isExp } = txContext;
  const ym = isoDate.substring(0, 7);
  uniqueMonthsSet.add(ym);

  ensureCashflowMonth(cashflowMap, ym, cashflowGroups);

  const cGroup = resolveFallbackGroupId(cGroupId, isInc, isSav, fallbackIncId, fallbackSavId, fallbackExpId);
  if (cashflowMap[ym].groups[cGroup] !== undefined) {
    cashflowMap[ym].groups[cGroup] += amt;
  }

  const isFood = isFoodCategory(cGroupId, foodGroupId, groupName);
  const isRent = isRentCategory(cGroupId, rentGroupId, groupName);
  const isSubscription = isSubscriptionCategory(cGroupId, subscriptionGroupId, groupName, catObj?.name);

  if (isInc) {
    totals.income += amt;
    cashflowMap[ym].income += amt;
    dayIncomeMap[isoDate] = (dayIncomeMap[isoDate] || 0) + amt;
  } else if (isSav) {
    accumulateSavingsItem(amt, isoDate, ym, cGroup, groupObj, stateRef);
  } else {
    accumulateExpenseItem({
      t, txContext, ym, isoDate, isFood, isRent, isSubscription,
      hideFixedExpenses, hideWantExpenses, activeFilters,
      totals, cashflowMap, dayExpenseMap, stateRef, cGroup
    });
  }

  if (isExp) {
    accumulateDayOfWeekStats(amt, isoDate, isFood, totals);
  }

  return { isFood, isRent, isSubscription };
}

function filterCategoriesByDashboard(categories: Category[], cashflowGroups: CashflowGroup[], activeFilters: string[]) {
  if (activeFilters.includes('ALL')) return categories;
  return categories.filter((c: any) => {
    const catGroupObj = cashflowGroups?.find((g: any) => g.id === c.cashflow_group_id) || {};
    const isNeedCat = (c.allocation_type || (catGroupObj as any).allocation_type) === 'need';
    const isWantCat = (c.allocation_type || (catGroupObj as any).allocation_type) === 'want';
    if (activeFilters.includes('FIXED') && isNeedCat) return true;
    if (activeFilters.includes('VARIABLE') && isWantCat) return true;
    return activeFilters.includes(c.id) || activeFilters.includes(c.name);
  });
}

function buildSortedCategories(catMapData: any, catMapLookup: any, chartTotal: number, filteredCats: any[]) {
  return Object.entries(catMapData)
    .map(([catId, amount]: [string, any]) => {
      const catObj = catMapLookup[catId] || { name: 'อื่นๆ', icon: '📦', color: '#94a3b8', order_index: 999 };
      return {
        id: catId,
        name: catObj.name,
        icon: catObj.icon || '📦',
        color: catObj.color || '#94a3b8',
        amount: Number(amount),
        percentage: chartTotal > 0 ? ((Number(amount) / chartTotal) * 100).toFixed(1) : '0.0',
        cashflow_group_id: catObj.cashflowGroup || catObj.cashflow_group_id,
        order_index: catObj.order_index ?? 999
      };
    })
    .filter((c: any) => filteredCats.some((fc: any) => fc.id === c.id))
    .sort((a: any, b: any) => b.amount - a.amount);
}

function buildGroupBreakdown(
  catMapData: Record<string, number>,
  catMapLookup: Record<string, any>,
  groupTotals: Record<string, number>,
  cashflowGroups: CashflowGroup[],
  numMonths: number,
  chartTotal: number
) {
  const groupCatsMap: Record<string, any[]> = {};
  Object.entries(catMapData).forEach(([catId, amount]) => {
    const catObj = catMapLookup[catId];
    if (catObj?.type !== 'expense') return;
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
    const total = groupTotals[gId] || 0;
    groupCatsMap[gId] = groupCatsMap[gId]
      .map((c: any) => ({
        ...c,
        relativePercentage: total > 0 ? ((c.amount / total) * 100).toFixed(0) : 0
      }))
      .sort((a: any, b: any) => (a.order_index - b.order_index) || (b.amount - a.amount));
  });

  const sortedGroups = cashflowGroups
    .filter((g: any) => g.type === 'expense' && (groupTotals[g.id] || 0) > 0)
    .map((g: any) => ({
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
    .sort((a: any, b: any) => (a.order_index - b.order_index) || (b.amount - a.amount));

  const groupChartData = {
    labels: sortedGroups.map((g: any) => g.name),
    datasets: [{
      data: sortedGroups.map((g: any) => g.amount),
      backgroundColor: sortedGroups.map((g: any) => g.color),
      borderWidth: 2, borderColor: '#1e293b',
    }],
  };

  return { sortedGroups, groupChartData };
}

function buildAllocationBreakdown(
  allocTotals: any,
  allocGroupsMap: Record<string, any[]>,
  totals: any,
  netCashflow: number
) {
  Object.keys(allocGroupsMap).forEach(key => {
    const total = allocTotals[key] || 0;
    allocGroupsMap[key] = allocGroupsMap[key]
      .map((g: any) => ({
        ...g,
        relativePercentage: total > 0 ? ((g.amount / total) * 100).toFixed(0) : 0
      }))
      .sort((a: any, b: any) => b.amount - a.amount);
  });

  const netSavingsActual = netCashflow;
  const allocationItems = [
    { id: 'needs', name: 'Needs (Essential)', amount: allocTotals.need, color: '#EF4444', icon: '🏠', target: 50, groups: allocGroupsMap.need },
    { id: 'wants', name: 'Wants (Lifestyle)', amount: allocTotals.want, color: '#F59E0B', icon: '🛍️', target: 30, groups: allocGroupsMap.want },
    { id: 'savings', name: 'Savings & Net', amount: Math.max(0, netSavingsActual), color: '#10B981', icon: '🏦', target: 20, groups: allocGroupsMap.savings }
  ];

  let allocationTotal = totals.income;
  if (totals.income <= 0) {
    allocationTotal = totals.expense + Math.max(0, netSavingsActual);
  }
  const sortedAllocation = allocationItems.map((item: any) => ({
    ...item,
    percentage: allocationTotal > 0 ? ((item.amount / allocationTotal) * 100).toFixed(1) : 0
  }));

  const allocationChartData = {
    labels: sortedAllocation.map((i: any) => i.name),
    datasets: [{
      data: sortedAllocation.map((i: any) => i.amount),
      backgroundColor: sortedAllocation.map((i: any) => i.color),
      borderWidth: 2, borderColor: '#1e293b',
    }],
  };

  return { sortedAllocation, allocationChartData };
}

function calculateWorkdayAndHolidayStats(datesInPeriod: string[], totals: any) {
  let weekendDaysCount = 0;
  datesInPeriod.forEach((d: string) => {
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
      ? Math.max(...(Object.values(totals.foodDailyMap) as number[])) 
      : 0
  };
}

function calculateTopWantCategories(wantCatMapData: any, catMapLookup: any, variableTotal: number) {
  return Object.entries(wantCatMapData)
    .map(([catId, amount]: [string, any]) => {
      const catObj = catMapLookup[catId] || { name: 'อื่นๆ', icon: '🛍️', color: '#f59e0b' };
      return {
        id: catId,
        name: catObj.name,
        icon: catObj.icon || '🛍️',
        color: catObj.color || '#f59e0b',
        amount: Number(amount),
        allocation_type: 'want',
        pctOfWant: variableTotal > 0 ? ((Number(amount) / variableTotal) * 100).toFixed(0) : '0'
      };
    })
    .filter((c: any) => c.amount > 0)
    .sort((a: any, b: any) => b.amount - a.amount)
    .slice(0, 4);
}

function calculateTopSubscriptionServices(subscriptionItems: any[], catMapLookup: any) {
  const map: Record<string, any> = {};
  (subscriptionItems || []).forEach((item: any) => {
    const key = (item.description || item.categoryName || 'บริการรายเดือน').trim();
    if (!map[key]) {
      let icon = '🔄';
      const lowerKey = key.toLowerCase();
      const catObj = catMapLookup[item.categoryId];
      if (catObj?.icon) {
        icon = catObj.icon;
      } else if (lowerKey.includes('ai') || lowerKey.includes('gpt') || lowerKey.includes('gemini') || lowerKey.includes('claude') || lowerKey.includes('bot')) {
        icon = '🤖';
      } else if (lowerKey.includes('netflix') || lowerKey.includes('youtube') || lowerKey.includes('spotify') || lowerKey.includes('disney')) {
        icon = '🍿';
      } else if (lowerKey.includes('shopee') || lowerKey.includes('lazada') || lowerKey.includes('lineman') || lowerKey.includes('grab')) {
        icon = '🛍️';
      }

      map[key] = {
        name: key,
        amount: 0,
        count: 0,
        icon,
        categoryName: item.categoryName
      };
    }
    map[key].amount += item.amount;
    map[key].count += 1;
  });

  return (Object.values(map) as any[])
    .filter((s: any) => s.amount > 0)
    .sort((a: any, b: any) => b.amount - a.amount)
    .slice(0, 4);
}

function resolveCashflowGroups(cashflowGroups: CashflowGroup[]) {
  const groups = cashflowGroups || [];
  const fallbackIncId = groups.find((g: any) => g.type === 'income')?.id || 'cg_bonus';
  const fallbackSavId = groups.find((g: any) => g.type === 'savings')?.id || 'cg_savings';
  const fallbackExpId = groups.find((g: any) => g.type === 'expense')?.id || 'cg_variable';

  const foodKeywords = ['อาหาร', 'food', 'กิน'];
  const rentKeywords = ['หอ', 'ที่พัก', 'rent', 'เช่า'];
  const subscriptionKeywords = ['บริการรายเดือน', 'รายเดือน', 'subscription'];

  const matchesKeyword = (name: string, keywords: string[]) => {
    const lower = (name || '').toLowerCase();
    return keywords.some((k: string) => lower.includes(k));
  };

  const foodGroup = groups.find((g: any) => matchesKeyword(g.name, foodKeywords));
  const rentGroup = groups.find((g: any) => matchesKeyword(g.name, rentKeywords));
  const subscriptionGroup = groups.find((g: any) => matchesKeyword(g.name, subscriptionKeywords));

  return {
    fallbackIncId,
    fallbackSavId,
    fallbackExpId,
    foodGroupId: foodGroup?.id,
    rentGroupId: rentGroup?.id,
    subscriptionGroupId: subscriptionGroup?.id,
  };
}

function calculatePeriodWindow(filterPeriod: string, datesInPeriod: string[]) {
  let startPrev: string | null = null;
  let endPrev: string | null = null;
  let periodLabel = 'PoP';

  if (filterPeriod === 'ALL' || !datesInPeriod || datesInPeriod.length === 0) {
    periodLabel = 'ALL';
  } else if (/^\d{4}-\d{2}$/.test(filterPeriod)) {
    // 1. Single Month: YYYY-MM -> MoM
    const [yStr, mStr] = filterPeriod.split('-');
    const y = Number.parseInt(yStr, 10);
    const m = Number.parseInt(mStr, 10);
    const prevDate = new Date(y, m - 2, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth();
    const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
    startPrev = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;
    endPrev = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    periodLabel = 'MoM';
  } else if (/^(\d{4})-Q([1-4])$/.test(filterPeriod)) {
    // 2. Quarter: YYYY-Q1 .. YYYY-Q4 -> QoQ
    const qMatch = filterPeriod.match(/^(\d{4})-Q([1-4])$/);
    if (qMatch) {
      const y = Number.parseInt(qMatch[1], 10);
      const q = Number.parseInt(qMatch[2], 10);
      let prevY = y;
      let prevQ = q - 1;
      if (prevQ < 1) {
        prevY = y - 1;
        prevQ = 4;
      }
      const startMonth = (prevQ - 1) * 3;
      const endMonth = startMonth + 2;
      const lastDay = new Date(prevY, endMonth + 1, 0).getDate();
      startPrev = `${prevY}-${String(startMonth + 1).padStart(2, '0')}-01`;
      endPrev = `${prevY}-${String(endMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      periodLabel = 'QoQ';
    }
  } else if (/^(\d{4})-H([1-2])$/.test(filterPeriod)) {
    // 3. Half-Year: YYYY-H1, YYYY-H2 -> HoH
    const hMatch = filterPeriod.match(/^(\d{4})-H([1-2])$/);
    if (hMatch) {
      const y = Number.parseInt(hMatch[1], 10);
      const h = Number.parseInt(hMatch[2], 10);
      let prevY = y;
      let prevH = h - 1;
      if (prevH < 1) {
        prevY = y - 1;
        prevH = 2;
      }
      if (prevH === 1) {
        startPrev = `${prevY}-01-01`;
        endPrev = `${prevY}-06-30`;
      } else {
        startPrev = `${prevY}-07-01`;
        endPrev = `${prevY}-12-31`;
      }
      periodLabel = 'HoH';
    }
  } else if (/^\d{4}$/.test(filterPeriod)) {
    // 4. Full Year: YYYY -> YoY
    const y = Number.parseInt(filterPeriod, 10);
    const prevY = y - 1;
    startPrev = `${prevY}-01-01`;
    endPrev = `${prevY}-12-31`;
    periodLabel = 'YoY';
  } else if (datesInPeriod.length > 0) {
    // 5. Custom Range or multi-month selection -> PoP
    const firstDate = new Date(datesInPeriod[0]);
    const lastDate = new Date(datesInPeriod[datesInPeriod.length - 1]);
    const durationMs = lastDate.getTime() - firstDate.getTime() + 86400000;
    const prevEnd = new Date(firstDate.getTime() - 86400000);
    const prevStart = new Date(prevEnd.getTime() - durationMs + 86400000);
    startPrev = prevStart.toISOString().split('T')[0];
    endPrev = prevEnd.toISOString().split('T')[0];
    periodLabel = 'PoP';
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
    periodLabel,
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
    subscription: 0, subscriptionCount: 0,
    subscriptionSub: { software: 0, shopping: 0, streaming: 0, other: 0 },
    subscriptionItems: [] as any[],
    rentSub: { rent: 0, electricity: 0, internet: 0, water: 0 },
    weekend: 0, weekday: 0,
    foodWeekend: 0, foodWeekday: 0, foodDailyMap: {} as Record<string, number>,
    dayOfWeekMap: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } as Record<number, number>
  };

  const allocTotals: Record<string, number> = { need: 0, want: 0, savings: 0 };
  const allocGroupsMap: Record<string, any[]> = { need: [], want: [], savings: [] };
  const groupTotals: Record<string, number> = {};
  const dayIncomeMap: Record<string, number> = {};
  const dayExpenseMap: Record<string, number> = {};
  const uniqueMonthsSet: Set<string> = new Set();
  const cashflowMap: Record<string, any> = {};
  const catMapData: Record<string, number> = {};
  const wantCatMapData: Record<string, number> = {};
  const dailyAllMap: Record<string, number> = {};
  const monthlyAllMap: Record<string, number> = {};
  const dailyCatMap: Record<string, Record<string, number>> = {};
  const monthlyCatMap: Record<string, Record<string, number>> = {};
  const dailyAllocMap: Record<string, Record<string, number>> = { need: {}, want: {}, savings: {} };
  const monthlyAllocMap: Record<string, Record<string, number>> = { need: {}, want: {}, savings: {} };
  const chartTx: any[] = [];
  const globalDailySum: Record<string, number> = {};
  const prevTotals = { income: 0, expense: 0, net: 0, txCount: 0 };
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
}: any) {
  const { fallbackIncId, fallbackSavId, fallbackExpId, foodGroupId, rentGroupId, subscriptionGroupId } = groupMeta;
  const { startPrev, endPrev, isCurrentMonth, todayStr } = windowMeta;
  const { globalDailySum, prevTotals, uniqueMonthsSet, cashflowMap, dayIncomeMap, dayExpenseMap, stateRef, totals, forecastRef } = state;

  transactions.forEach((t: any) => {
    const isoDate = toISODate(t.date);
    if (!isoDate) return;

    const txContext = resolveTransactionContext(t, catMapLookup, cashflowGroups, fallbackExpId);
    trackTrendAndGlobal({
      isoDate,
      amt: txContext.amt,
      isExp: txContext.isExp,
      isInc: txContext.isInc,
      startPrev,
      endPrev,
      globalDailySum,
      prevTotals,
    });

    const flags = processAnalyticsTx({
      t, isoDate, txContext, filterPeriod, foodGroupId, rentGroupId, subscriptionGroupId,
      fallbackIncId, fallbackSavId, fallbackExpId, cashflowGroups,
      hideFixedExpenses, hideWantExpenses, activeFilters,
      uniqueMonthsSet, cashflowMap, dayIncomeMap, dayExpenseMap,
      stateRef, totals
    });

    if (flags) {
      trackForecastingUpToToday({
        isoDate,
        amt: txContext.amt,
        isExp: txContext.isExp,
        isNeed: txContext.isNeed,
        isRent: flags.isRent,
        isFood: flags.isFood,
        isCurrentMonth,
        todayStr,
        forecastRef,
      });
    }
  });
}

function applyBackendSummaryTotals(totals: any, summaryData: any) {
  if (!summaryData?.summary) return;
  totals.income = summaryData.summary.income;
  totals.expense = summaryData.summary.expense;
  totals.savings = summaryData.summary.savings;
}

function applyBackendMonthlyCashflow(cashflowMap: any, summaryData: any) {
  if (!summaryData?.monthly) return;
  summaryData.monthly.forEach((m: any) => {
    cashflowMap[m.month] = { 
      monthStr: m.month, income: m.income, totalExp: m.expense, totalSav: m.savings, groups: m.groups || {} 
    };
  });
}

function calculateGlobalMaxThreshold(globalDailySum: Record<string, number>) {
  const globalValues = (Object.values(globalDailySum) as number[]).filter(v => v > 0).sort((a, b) => a - b);
  if (globalValues.length === 0) return 100;
  const p90Index = Math.floor(globalValues.length * 0.9);
  return globalValues[p90Index] || globalValues.at(-1);
}

function calculateSavingsMetrics(totals: any, uniqueMonthsSet: any) {
  const actualSavings = totals.income - totals.expense;
  const explicitSavings = totals.savings || 0;
  const numMonths = uniqueMonthsSet.size || 1;
  const savingsRate = totals.income > 0 ? Number.parseFloat(((actualSavings / totals.income) * 100).toFixed(1)) : 0;
  return { actualSavings, explicitSavings, numMonths, savingsRate };
}

function calculateFinancialPercentages(totals: any) {
  const hasExp = totals.expense > 0;
  const hasInc = totals.income > 0;
  return {
    foodPercentage: hasExp ? ((totals.food / totals.expense) * 100).toFixed(1) : 0,
    foodPctOfIncome: hasInc ? ((totals.food / totals.income) * 100).toFixed(1) : 0,
    rentPercentage: hasInc ? ((totals.rent / totals.income) * 100).toFixed(1) : 0,
    fixedPercentage: hasExp ? ((totals.fixed / totals.expense) * 100).toFixed(1) : 0,
    variablePercentage: hasExp ? ((totals.variable / totals.expense) * 100).toFixed(1) : 0,
    subscriptionPercentage: hasExp ? ((totals.subscription / totals.expense) * 100).toFixed(1) : 0,
    subscriptionPctOfIncome: hasInc ? ((totals.subscription / totals.income) * 100).toFixed(1) : 0,
  };
}

export interface UseAnalyticsProps {
  transactions?: TransactionDisplay[];
  categories?: Category[];
  cashflowGroups?: CashflowGroup[];
  filterPeriod: string;
  hideFixedExpenses?: boolean;
  hideWantExpenses?: boolean;
  dashboardCategory?: string | string[];
  chartGroupBy?: string;
  topXLimit?: number;
  dayTypes?: Record<string, string>;
  dayTypeConfig?: DayType[];
  isDarkMode?: boolean;
  summaryData?: any;
  excludeFuture?: boolean;
}

export default function useAnalytics({
  transactions = [],
  categories = [],
  cashflowGroups = [], 
  filterPeriod,
  hideFixedExpenses = false,
  hideWantExpenses = false,
  dashboardCategory = 'ALL', 
  chartGroupBy = 'monthly',
  topXLimit = 7,
  dayTypes,
  dayTypeConfig,
  isDarkMode = true,
  summaryData,
  excludeFuture = false
}: UseAnalyticsProps) {
  // ── Phase 1: Core Transaction Aggregation ──────────────────────────
  // Heaviest computation — only re-runs when data or filter criteria change
  const coreAggregation = useMemo(() => {
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

    const sortedCashflow = (Object.values(cashflowMap) as any[]).sort((a: any, b: any) => a.monthStr.localeCompare(b.monthStr));
    const sortedMonthsKeys = sortedCashflow.map((c: any) => c.monthStr);

    const globalMaxThreshold = calculateGlobalMaxThreshold(state.globalDailySum);
    const dayTypeCounts = calculateDayTypeCounts(datesInPeriod, dayTypes || {}, dayTypeConfig || []);
    const {
      foodWorkdayAvg,
      foodHolidayAvg,
      dailyWorkdayAvg,
      dailyHolidayAvg,
      maxFoodDayAmount,
    } = calculateWorkdayAndHolidayStats(datesInPeriod, totals);

    const topWantCategories = calculateTopWantCategories(state.wantCatMapData, catMapLookup, totals.variable);
    const topSubscriptionServices = calculateTopSubscriptionServices(totals.subscriptionItems, catMapLookup);
    const pcts = calculateFinancialPercentages(totals);

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

    return {
      catMapLookup, windowMeta, datesInPeriod, state, totals, prevTotals,
      netCashflow, actualSavings, explicitSavings, savingsRate, numMonths, chartTotal,
      sortedCats, sortedGroups, groupChartData, sortedAllocation, allocationChartData,
      sortedCashflow, sortedMonthsKeys, cashflowMap,
      globalMaxThreshold, dayTypeCounts,
      foodWorkdayAvg, foodHolidayAvg, dailyWorkdayAvg, dailyHolidayAvg, maxFoodDayAmount,
      topWantCategories, topSubscriptionServices, pcts,
      showForecasting, forecastingDetails, projectedExpense, safeToSpend, projectedSurplus,
      adjustedDailyAvg, adjustedFoodDailyAvg,
      useBackendTotals,
    };
  }, [transactions, filterPeriod, categories, cashflowGroups, hideFixedExpenses, hideWantExpenses, dashboardCategory, dayTypes, dayTypeConfig, summaryData, excludeFuture]);

  // ── Phase 2: Chart & Sparkline Generation ─────────────────────────
  // Re-runs only when chart display settings change (chartGroupBy, topXLimit, isDarkMode)
  const chartAndPresentation = useMemo(() => {
    const {
      catMapLookup, windowMeta, datesInPeriod, state, sortedCats,
      sortedMonthsKeys, cashflowMap, useBackendTotals,
    } = coreAggregation;

    const catChartData = {
      labels: sortedCats.map((c: any) => c.name),
      datasets: [{
        data: sortedCats.map((c: any) => c.amount),
        backgroundColor: sortedCats.map((c: any) => c.color),
        borderWidth: 2, borderColor: '#1e293b',
      }],
    };

    const { chartData: mainChartData, chartType: mainChartType } = generateMainChartData({
      chartGroupBy: chartGroupBy as any, filterPeriod, sortedMonthsKeys, cashflowMap,
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

    const topTransactions = [...state.chartTx].sort((a: any, b: any) => b.amount - a.amount).slice(0, topXLimit);

    return { catChartData, mainChartData, mainChartType, sparklineIncome, sparklineExpense, sparklineNet, topTransactions };
  }, [coreAggregation, chartGroupBy, topXLimit, isDarkMode, filterPeriod, hideFixedExpenses, hideWantExpenses, dashboardCategory, summaryData]);

  // ── Phase 3: Final Analytics Assembly ─────────────────────────────
  const analytics = useMemo(() => {
    const core = coreAggregation;
    const charts = chartAndPresentation;

    return {
      periodLabel: core.windowMeta.periodLabel,
      isSingleMonthView: core.windowMeta.isSingleMonthView,
      showForecasting: core.showForecasting, projectedExpense: core.projectedExpense,
      safeToSpend: core.safeToSpend, projectedSurplus: core.projectedSurplus,
      forecastingDetails: core.forecastingDetails,
      prevTotals: core.prevTotals, totalExpense: core.totals.expense, totalIncome: core.totals.income,
      totalSavings: core.totals.savings || 0, actualSavings: core.actualSavings, explicitSavings: core.explicitSavings,
      netCashflow: core.netCashflow, savingsRate: core.savingsRate, chartTotal: core.chartTotal, numMonths: core.numMonths,
      sortedCats: core.sortedCats,
      topTransactions: charts.topTransactions,
      dailyAvg: core.adjustedDailyAvg,
      foodTotal: core.totals.food, foodDailyAvg: core.adjustedFoodDailyAvg,
      foodPercentage: core.pcts.foodPercentage,
      foodPctOfIncome: core.pcts.foodPctOfIncome,
      foodWorkdayAvg: core.foodWorkdayAvg, foodHolidayAvg: core.foodHolidayAvg,
      dailyWorkdayAvg: core.dailyWorkdayAvg, dailyHolidayAvg: core.dailyHolidayAvg,
      maxFoodDayAmount: core.maxFoodDayAmount,
      topWantCategories: core.topWantCategories,
      subscriptionTotal: core.totals.subscription,
      subscriptionCount: core.totals.subscriptionCount,
      subscriptionPercentage: core.pcts.subscriptionPercentage,
      subscriptionPctOfIncome: core.pcts.subscriptionPctOfIncome,
      subscriptionSub: core.totals.subscriptionSub,
      subscriptionItems: core.totals.subscriptionItems,
      topSubscriptionServices: core.topSubscriptionServices,
      rentTotal: core.totals.rent,
      rentPercentage: core.pcts.rentPercentage,
      rentSub: core.totals.rentSub,
      fixedTotal: core.totals.fixed, variableTotal: core.totals.variable,
      fixedPercentage: core.pcts.fixedPercentage,
      variablePercentage: core.pcts.variablePercentage,
      sparklineIncome: charts.sparklineIncome, sparklineExpense: charts.sparklineExpense, sparklineNet: charts.sparklineNet,
      weekendTotal: core.totals.weekend, weekdayTotal: core.totals.weekday,
      globalMaxThreshold: core.globalMaxThreshold, datesInPeriod: core.datesInPeriod, filterPeriod, dayTypeCounts: core.dayTypeCounts,
      dailyAllMap: core.state.dailyAllMap, monthlyAllMap: core.state.monthlyAllMap,
      dailyAllocMap: core.state.dailyAllocMap, monthlyAllocMap: core.state.monthlyAllocMap,
      sortedMonthsKeys: core.sortedMonthsKeys, monthlyCatMap: core.state.monthlyCatMap, dailyCatMap: core.state.dailyCatMap,
      catChartData: charts.catChartData, mainChartData: charts.mainChartData, mainChartType: charts.mainChartType,
      sortedCashflow: core.sortedCashflow,
      sortedGroups: core.sortedGroups, groupChartData: core.groupChartData,
      sortedAllocation: core.sortedAllocation, allocationChartData: core.allocationChartData
    };
  }, [coreAggregation, chartAndPresentation, filterPeriod]);

  return analytics;
}
