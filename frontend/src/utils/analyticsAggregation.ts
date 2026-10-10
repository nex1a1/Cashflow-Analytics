// Pure dashboard aggregation: one pass over the transactions → every total, map and breakdown useAnalytics returns.
import { TransactionDisplay, Category, CashflowGroup, DayType } from '../types';
import { generateDatesForPeriod, isDateInFilter, parseDateStrToObj } from './dateHelpers';
import { createCategoryMap, calculateDayTypeCounts, CashflowMonthData } from './analyticsHelpers';
import { calculateGhostPacerData } from './ghostPacerHelpers';
import { BUDGET_RULES, WARN_AT } from '../views/Dashboard/components/SummaryCards/helpers';
import { calculateAllocationEvolution } from './allocationEvolutionHelpers';
import { isCyclePeriod, stripCycle, monthKeyOf, cycleRange, shiftMonth, localTodayIso } from './payCycle';
import { tc, ALLOCATION_COLORS } from '@/constants/theme';

/** Backend `/analytics/summary` answer (calendar-month grouped). */
export interface AnalyticsSummary {
  summary?: { income: number; expense: number; savings: number };
  monthly?: Array<{ month: string; income: number; expense: number; savings: number; groups?: Record<string, number> }>;
}

type CatLookup = Record<string, Category>;
type CashflowMap = Record<string, CashflowMonthData>;

interface AllocGroupEntry {
  id: string;
  name?: string;
  icon?: string | null;
  color?: string | null;
  amount: number;
  relativePercentage?: string | number;
}

interface SubscriptionItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  categoryName?: string;
  categoryId: string;
}

type TxContext = ReturnType<typeof resolveTransactionContext>;
type AnalyticsState = ReturnType<typeof createInitialAnalyticsState>;
type Totals = AnalyticsState['totals'];
type StateRef = AnalyticsState['stateRef'];
type GroupMeta = ReturnType<typeof resolveCashflowGroups>;

interface AggregationOptions {
  filterPeriod: string;
  cashflowGroups: CashflowGroup[];
  groupMeta: GroupMeta;
  hideFixedExpenses: boolean;
  hideWantExpenses: boolean;
  activeFilters: string[];
}

function resolveTransactionContext(t: TransactionDisplay, catMapLookup: CatLookup, cashflowGroups: CashflowGroup[], fallbackExpId: string) {
  const amt = Number.parseFloat(String(t.amount)) || 0;
  const catId = t.category_id || (catMapLookup[t.category]?.id) || 'unknown';
  const catObj: Partial<Category> = catMapLookup[catId] || { type: 'expense', cashflowGroup: fallbackExpId };

  const cGroupId = catObj.cashflowGroup;
  const groupObj: Partial<CashflowGroup> = cashflowGroups?.find(g => g.id === cGroupId) || {};
  const groupType = groupObj.type || catObj.type || 'expense';
  const groupName = (groupObj.name || '').toLowerCase();

  const isInc = groupType === 'income';
  const isSav = groupType === 'savings';
  const isExp = !isInc && !isSav;

  const aType: string = t.allocation_type || groupObj.allocation_type || (isInc ? 'savings' : 'want');
  const isNeed = aType === 'need';
  const isWant = aType === 'want';

  return { amt, catId, catObj, cGroupId, groupObj, groupType, groupName, isInc, isSav, isExp, aType, isNeed, isWant };
}

function accumulateRentAndFoodTotals(amt: number, catName: string | undefined, isRent: boolean, isFood: boolean, totals: Totals) {
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

function accumulateSubscriptionTotals(t: TransactionDisplay, amt: number, catName: string | undefined, catId: string, totals: Totals, isoDate: string) {
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

// dashboardCategory is ['ALL'] or a list of category ids / names (MainChart category filter)
function matchesDashboardFilter(catId: string, catName: string | undefined, activeFilters: string[]) {
  return activeFilters.includes('ALL') || activeFilters.includes(catId) || (catName !== undefined && activeFilters.includes(catName));
}

type FilteredExpenseCtx = Pick<TxContext, 'amt' | 'catId' | 'aType' | 'isWant' | 'groupObj'> & { cGroup: string };

function accumulateFilteredExpense(txContext: FilteredExpenseCtx, ym: string, isoDate: string, state: StateRef) {
  const { amt, catId, aType, isWant, cGroup, groupObj } = txContext;
  const {
    dailyAllMap, monthlyAllMap, catMapData, wantCatMapData,
    dailyCatMap, monthlyCatMap, allocTotals, dailyAllocMap, monthlyAllocMap,
    allocGroupsMap, groupTotals,
  } = state;

  dailyAllMap[isoDate] = (dailyAllMap[isoDate] || 0) + amt;
  monthlyAllMap[ym] = (monthlyAllMap[ym] || 0) + amt;
  state.chartTotal += amt;

  catMapData[catId] = (catMapData[catId] || 0) + amt;
  if (isWant) {
    wantCatMapData[catId] = (wantCatMapData[catId] || 0) + amt;
  }

  if (!dailyCatMap[catId]) dailyCatMap[catId] = {};
  dailyCatMap[catId][isoDate] = (dailyCatMap[catId][isoDate] || 0) + amt;
  if (!monthlyCatMap[catId]) monthlyCatMap[catId] = {};
  monthlyCatMap[catId][ym] = (monthlyCatMap[catId][ym] || 0) + amt;

  allocTotals[aType] = (allocTotals[aType] || 0) + amt;
  if (dailyAllocMap[aType]) {
    dailyAllocMap[aType][isoDate] = (dailyAllocMap[aType][isoDate] || 0) + amt;
  }
  if (monthlyAllocMap[aType]) {
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

function accumulateSavingsItem(amt: number, isoDate: string, ym: string, cGroup: string, groupObj: Partial<CashflowGroup>, state: StateRef) {
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

function accumulateDayOfWeekStats(amt: number, isoDate: string, isFood: boolean, totals: Totals) {
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

function calculateForecastingDetails({
  isCurrentMonth,
  datesInPeriod,
  totals,
  expenseUpToToday,
  rentUpToToday,
  dailySumMap,
}: {
  isCurrentMonth: boolean;
  datesInPeriod: string[];
  totals: Totals;
  expenseUpToToday: number;
  rentUpToToday: number;
  dailySumMap: Record<string, number>;
}) {
  if (!isCurrentMonth || datesInPeriod.length === 0) {
    return { showForecasting: false, effectiveDays: datesInPeriod.length || 1, forecastingDetails: null, projectedExpense: 0, safeToSpend: 0, projectedSurplus: 0 };
  }

  // day N = N-th day of the month / pay cycle (datesInPeriod is the full unit for single-month views)
  const lastDayOfMonth = datesInPeriod.length;
  const currentDay = Math.max(1, datesInPeriod.indexOf(localTodayIso()) + 1);
  const remainingDays = Math.max(0, lastDayOfMonth - currentDay); // 0 on the last day: today is already counted in the run rate
  const effectiveDays = datesInPeriod.length || 1;
  const monthProgressPct = (currentDay / lastDayOfMonth) * 100;

  const fixedCommitment = totals.rent;
  const dailyLivingUpToToday = Math.max(0, expenseUpToToday - rentUpToToday);
  const dailyLivingRunRate = dailyLivingUpToToday / currentDay;
  const projectedLivingRemaining = dailyLivingRunRate * remainingDays;

  // Real per-day cumulative spend (day 1 -> today), sourced from actual transactions rather
  // than an interpolated shape — the trajectory chart plots what actually happened.
  const actualDailySeries: number[] = [];
  let runningSpend = 0;
  for (const iso of datesInPeriod.slice(0, currentDay)) {
    runningSpend += (dailySumMap && dailySumMap[iso]) || 0;
    actualDailySeries.push(runningSpend);
  }
  const projectedExpense = fixedCommitment + dailyLivingUpToToday + projectedLivingRemaining;
  const projectedSurplus = totals.income - projectedExpense;
  const projectedSurplusPct = totals.income > 0 ? (projectedSurplus / totals.income) * 100 : 0;

  const remainingBudget = totals.income - fixedCommitment - dailyLivingUpToToday;
  const daysToBudget = Math.max(1, remainingDays); // never divide by 0
  const safeToSpend = remainingBudget > 0 ? remainingBudget / daysToBudget : 0;

  // Warn before the deficit: at this pace, does the month still end with the leftover target (BUDGET_RULES, same as the grade)?
  // ("rate > safe-to-spend" is the same condition as "projected deficit", so it could never warn early.)
  const target = BUDGET_RULES.surplus.min;
  let paceStatus = { code: 'ON_TRACK', label: 'คุมงบได้ดี', color: tc('income'), bg: 'bg-emerald-950/30' };
  if (projectedSurplus < 0) {
    paceStatus = { code: 'CRITICAL', label: 'เกินงบประมาณ', color: tc('danger'), bg: 'bg-danger/10' };
  } else if (projectedSurplusPct < target) {
    paceStatus = { code: 'OVER_PACING', label: 'ใช้เร็วเกินแผน', color: tc('warn'), bg: 'bg-amber-950/30' };
  } else if (projectedSurplusPct < target / WARN_AT) {
    paceStatus = { code: 'MODERATE', label: 'ใกล้เพดาน', color: tc('info'), bg: 'bg-blue-950/30' };
  }

  let eomStatus = { code: 'EXCELLENT', label: 'เหลือเงินมาก', color: tc('income'), bg: 'bg-emerald-950/40', border: 'border-emerald-500' };
  if (projectedSurplus < 0) {
    eomStatus = { code: 'DEFICIT', label: 'เสี่ยงติดลบ', color: tc('danger'), bg: 'bg-danger/10', border: 'border-danger' };
  } else if (projectedSurplusPct < target) {
    eomStatus = { code: 'TIGHT', label: 'เหลือน้อย', color: tc('warn'), bg: 'bg-amber-950/40', border: 'border-amber-500' };
  } else if (projectedSurplusPct < 20) {
    eomStatus = { code: 'STABLE', label: 'พอดีตัว', color: tc('info'), bg: 'bg-blue-950/40', border: 'border-blue-500' };
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
    actualDailySeries,
    paceStatus,
    eomStatus
  };

  return { showForecasting: true, effectiveDays, forecastingDetails, projectedExpense, safeToSpend, projectedSurplus };
}

function trackTrendAndGlobal(isoDate: string, txContext: TxContext, startPrev: string | null, endPrev: string | null, state: AnalyticsState) {
  const { amt, isExp, isInc } = txContext;
  const { globalDailySum, prevTotals } = state;
  if (isExp) {
    globalDailySum[isoDate] = (globalDailySum[isoDate] || 0) + amt;
  }
  if (startPrev && endPrev && isoDate >= startPrev && isoDate <= endPrev) {
    prevTotals.txCount = (prevTotals.txCount || 0) + 1;
    if (isInc) prevTotals.income += amt;
    else if (isExp) prevTotals.expense += amt;
  }
}

function trackForecastingUpToToday(
  isoDate: string, txContext: TxContext, isRent: boolean, isFood: boolean,
  isCurrentMonth: boolean, todayStr: string, forecastRef: AnalyticsState['forecastRef'],
) {
  const { amt, isExp, isNeed } = txContext;
  if (isCurrentMonth && isoDate <= todayStr && isExp) {
    forecastRef.expenseUpToToday += amt;
    if (!isNeed) forecastRef.variableUpToToday += amt;
    if (isRent) forecastRef.rentUpToToday += amt;
    if (isFood) forecastRef.foodUpToToday += amt;
  }
}

function ensureCashflowMonth(cashflowMap: CashflowMap, ym: string, cashflowGroups: CashflowGroup[]) {
  if (!cashflowMap[ym]) {
    const groups: Record<string, number> = {};
    for (const g of cashflowGroups) {
      groups[g.id] = 0;
    }
    cashflowMap[ym] = { monthStr: ym, totalExp: 0, income: 0, totalSav: 0, groups };
  }
}

type GroupId = string | null | undefined;

function isFoodCategory(cGroupId: GroupId, foodGroupId: string | undefined, groupName: string) {
  if (cGroupId && cGroupId === foodGroupId) return true;
  return groupName.includes('กิน') || groupName.includes('อาหาร') || groupName.includes('food');
}

function isRentCategory(cGroupId: GroupId, rentGroupId: string | undefined, groupName: string) {
  if (cGroupId && cGroupId === rentGroupId) return true;
  return groupName.includes('หอ') || groupName.includes('ที่พัก') || groupName.includes('rent') || groupName.includes('เช่า');
}

function isSubscriptionCategory(cGroupId: GroupId, subscriptionGroupId: string | undefined, groupName: string, catName: string = '') {
  if (cGroupId && cGroupId === subscriptionGroupId) return true;
  const lowerGroupName = (groupName || '').toLowerCase();
  const lowerCatName = (catName || '').toLowerCase();
  if (lowerGroupName.includes('บริการรายเดือน') || lowerGroupName.includes('subscription') || lowerGroupName.includes('รายเดือน')) return true;
  if (lowerCatName.includes('ซอฟต์แวร์') || lowerCatName.includes('สมาชิกช้อปปิ้ง') || lowerCatName.includes('สตรีมมิ่ง') || lowerCatName.includes('subscription')) return true;
  return false;
}

function resolveFallbackGroupId(cGroupId: GroupId, isInc: boolean, isSav: boolean, groupMeta: GroupMeta) {
  if (cGroupId) return cGroupId;
  if (isInc) return groupMeta.fallbackIncId;
  if (isSav) return groupMeta.fallbackSavId;
  return groupMeta.fallbackExpId;
}

function checkExpenseFilterPass(isNeed: boolean, isWant: boolean, catId: string, catName: string | undefined, opts: AggregationOptions) {
  if (opts.hideFixedExpenses && isNeed) return false;
  if (opts.hideWantExpenses && isWant) return false;
  return matchesDashboardFilter(catId, catName, opts.activeFilters);
}

function accumulateExpenseItem(
  t: TransactionDisplay, txContext: TxContext, ym: string, isoDate: string, cGroup: string,
  flags: { isFood: boolean; isRent: boolean; isSubscription: boolean },
  opts: AggregationOptions, state: AnalyticsState,
) {
  const { amt, catId, catObj, aType, isNeed, isWant, groupObj } = txContext;
  const { totals, cashflowMap, dayExpenseMap, stateRef } = state;
  totals.expense += amt;
  cashflowMap[ym].totalExp += amt;
  dayExpenseMap[isoDate] = (dayExpenseMap[isoDate] || 0) + amt;

  accumulateRentAndFoodTotals(amt, catObj.name, flags.isRent, flags.isFood, totals);
  if (flags.isSubscription) {
    accumulateSubscriptionTotals(t, amt, catObj.name, catId, totals, isoDate);
  }

  if (isNeed) {
    totals.fixed += amt;
  } else if (isWant) {
    totals.variable += amt;
  }

  if (checkExpenseFilterPass(isNeed, isWant, catId, catObj.name, opts)) {
    accumulateFilteredExpense({ amt, catId, aType, isWant, cGroup, groupObj }, ym, isoDate, stateRef);
  }
}

function processAnalyticsTx(t: TransactionDisplay, isoDate: string, txContext: TxContext, opts: AggregationOptions, state: AnalyticsState) {
  if (!isDateInFilter(isoDate, opts.filterPeriod)) return null;

  const { amt, catObj, cGroupId, groupObj, groupName, isInc, isSav, isExp } = txContext;
  const { groupMeta } = opts;
  const { totals, cashflowMap, dayIncomeMap } = state;
  const ym = monthKeyOf(isoDate, opts.filterPeriod);
  state.uniqueMonthsSet.add(ym);

  ensureCashflowMonth(cashflowMap, ym, opts.cashflowGroups);

  const cGroup = resolveFallbackGroupId(cGroupId, isInc, isSav, groupMeta);
  if (cashflowMap[ym].groups[cGroup] !== undefined) {
    cashflowMap[ym].groups[cGroup] += amt;
  }

  const isFood = isFoodCategory(cGroupId, groupMeta.foodGroupId, groupName);
  const isRent = isRentCategory(cGroupId, groupMeta.rentGroupId, groupName);
  const isSubscription = isSubscriptionCategory(cGroupId, groupMeta.subscriptionGroupId, groupName, catObj?.name);

  if (isInc) {
    totals.income += amt;
    cashflowMap[ym].income += amt;
    dayIncomeMap[isoDate] = (dayIncomeMap[isoDate] || 0) + amt;
  } else if (isSav) {
    accumulateSavingsItem(amt, isoDate, ym, cGroup, groupObj, state.stateRef);
  } else {
    accumulateExpenseItem(t, txContext, ym, isoDate, cGroup, { isFood, isRent, isSubscription }, opts, state);
  }

  if (isExp) {
    accumulateDayOfWeekStats(amt, isoDate, isFood, totals);
  }

  return { isFood, isRent, isSubscription };
}

// catMapData already holds only rows that passed the dashboard filter; rows of a deleted category are left out
function buildSortedCategories(catMapData: Record<string, number>, catMapLookup: CatLookup, chartTotal: number, categories: Category[]) {
  return Object.entries(catMapData)
    .map(([catId, amount]) => {
      const catObj: Partial<Category> = catMapLookup[catId] || { name: 'อื่นๆ', icon: 'package', color: tc('ink-body'), order_index: 999 };
      return {
        id: catId,
        name: catObj.name,
        icon: catObj.icon || 'package',
        color: catObj.color || tc('ink-body'),
        amount: Number(amount),
        percentage: chartTotal > 0 ? ((Number(amount) / chartTotal) * 100).toFixed(1) : '0.0',
        cashflow_group_id: catObj.cashflowGroup || catObj.cashflow_group_id,
        order_index: catObj.order_index ?? 999
      };
    })
    .filter(c => categories.some(fc => fc.id === c.id))
    .sort((a, b) => b.amount - a.amount);
}

interface GroupCategoryEntry {
  id: string;
  name: string;
  amount: number;
  icon?: string | null;
  color?: string | null;
  order_index: number;
  relativePercentage?: string | number;
}

function buildGroupBreakdown(
  catMapData: Record<string, number>,
  catMapLookup: CatLookup,
  groupTotals: Record<string, number>,
  cashflowGroups: CashflowGroup[],
  numMonths: number,
  chartTotal: number
) {
  const groupCatsMap: Record<string, GroupCategoryEntry[]> = {};
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
      .map(c => ({
        ...c,
        relativePercentage: total > 0 ? ((c.amount / total) * 100).toFixed(0) : 0
      }))
      .sort((a, b) => (a.order_index - b.order_index) || (b.amount - a.amount));
  });

  const sortedGroups = cashflowGroups
    .filter(g => g.type === 'expense' && (groupTotals[g.id] || 0) > 0)
    .map(g => ({
      id: g.id,
      name: g.name,
      amount: groupTotals[g.id],
      percentage: chartTotal > 0 ? ((groupTotals[g.id] / chartTotal) * 100).toFixed(1) : 0,
      avgPerMonth: groupTotals[g.id] / numMonths,
      icon: g.icon,
      color: g.color || tc('ink-muted'),
      allocation_type: g.allocation_type,
      order_index: g.order_index || 999,
      categories: groupCatsMap[g.id] || []
    }))
    .sort((a, b) => (a.order_index - b.order_index) || (b.amount - a.amount));

  return { sortedGroups };
}

function buildAllocationBreakdown(
  allocTotals: Record<string, number>,
  allocGroupsMap: Record<string, AllocGroupEntry[]>,
  totals: Totals,
  netCashflow: number
) {
  Object.keys(allocGroupsMap).forEach(key => {
    const total = allocTotals[key] || 0;
    allocGroupsMap[key] = allocGroupsMap[key]
      .map(g => ({
        ...g,
        relativePercentage: total > 0 ? ((g.amount / total) * 100).toFixed(0) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  });

  const explicitSavings = allocTotals.savings || 0;
  // netCashflow = income − expense still contains the money that was invested (savings is its own group type,
  // not an expense), so only what is left after the savings rows is "unspent" — otherwise it is counted twice
  const unspentSurplus = Math.max(0, netCashflow - (totals.savings || 0));
  const totalSavingsActual = explicitSavings + unspentSurplus;

  const allocationItems = [
    { id: 'needs', name: 'NEED', amount: allocTotals.need, color: ALLOCATION_COLORS.need, icon: 'home', target: 50, groups: allocGroupsMap.need },
    { id: 'wants', name: 'WANT', amount: allocTotals.want, color: ALLOCATION_COLORS.want, icon: 'shopping-bag', target: 30, groups: allocGroupsMap.want },
    { id: 'savings', name: 'SAVE', amount: Math.max(0, totalSavingsActual), color: ALLOCATION_COLORS.savings, icon: 'landmark', target: 20, groups: allocGroupsMap.savings }
  ];

  let allocationTotal = totals.income;
  const totalAllocated = allocTotals.need + allocTotals.want + totalSavingsActual;
  if (totals.income <= 0 || totals.income < totalAllocated) {
    allocationTotal = totalAllocated;
  }
  const sortedAllocation = allocationItems.map(item => ({
    ...item,
    percentage: allocationTotal > 0 ? ((item.amount / allocationTotal) * 100).toFixed(1) : 0
  }));

  return { sortedAllocation };
}

function calculateWorkdayAndHolidayStats(datesInPeriod: string[], totals: Totals) {
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

function calculateTopWantCategories(wantCatMapData: Record<string, number>, catMapLookup: CatLookup, variableTotal: number) {
  return Object.entries(wantCatMapData)
    .map(([catId, amount]) => {
      const catObj: Partial<Category> = catMapLookup[catId] || { name: 'อื่นๆ', icon: 'shopping-bag', color: tc('warn') };
      return {
        id: catId,
        name: catObj.name,
        icon: catObj.icon || 'shopping-bag',
        color: catObj.color || tc('warn'),
        amount: Number(amount),
        allocation_type: 'want',
        pctOfWant: variableTotal > 0 ? ((Number(amount) / variableTotal) * 100).toFixed(0) : '0'
      };
    })
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);
}

interface SubscriptionService {
  name: string;
  amount: number;
  count: number;
  icon: string;
  categoryName?: string;
}

function calculateTopSubscriptionServices(subscriptionItems: SubscriptionItem[], catMapLookup: CatLookup) {
  const map: Record<string, SubscriptionService> = {};
  (subscriptionItems || []).forEach(item => {
    const key = (item.description || item.categoryName || 'บริการรายเดือน').trim();
    if (!map[key]) {
      let icon = 'repeat';
      const lowerKey = key.toLowerCase();
      const catObj = catMapLookup[item.categoryId];
      if (catObj?.icon) {
        icon = catObj.icon;
      } else if (lowerKey.includes('ai') || lowerKey.includes('gpt') || lowerKey.includes('gemini') || lowerKey.includes('claude') || lowerKey.includes('bot')) {
        icon = 'bot';
      } else if (lowerKey.includes('netflix') || lowerKey.includes('youtube') || lowerKey.includes('spotify') || lowerKey.includes('disney')) {
        icon = 'popcorn';
      } else if (lowerKey.includes('shopee') || lowerKey.includes('lazada') || lowerKey.includes('lineman') || lowerKey.includes('grab')) {
        icon = 'shopping-bag';
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

  return Object.values(map)
    .filter(s => s.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);
}

function resolveCashflowGroups(cashflowGroups: CashflowGroup[]) {
  const groups = cashflowGroups || [];
  const fallbackIncId = groups.find(g => g.type === 'income')?.id || 'cg_bonus';
  const fallbackSavId = groups.find(g => g.type === 'savings')?.id || 'cg_savings';
  const fallbackExpId = groups.find(g => g.type === 'expense')?.id || 'cg_variable';

  const foodKeywords = ['อาหาร', 'food', 'กิน'];
  const rentKeywords = ['หอ', 'ที่พัก', 'rent', 'เช่า'];
  const subscriptionKeywords = ['บริการรายเดือน', 'รายเดือน', 'subscription'];

  const matchesKeyword = (name: string, keywords: string[]) => {
    const lower = (name || '').toLowerCase();
    return keywords.some(k => lower.includes(k));
  };

  const foodGroup = groups.find(g => matchesKeyword(g.name, foodKeywords));
  const rentGroup = groups.find(g => matchesKeyword(g.name, rentKeywords));
  const subscriptionGroup = groups.find(g => matchesKeyword(g.name, subscriptionKeywords));

  return {
    fallbackIncId,
    fallbackSavId,
    fallbackExpId,
    foodGroupId: foodGroup?.id,
    rentGroupId: rentGroup?.id,
    subscriptionGroupId: subscriptionGroup?.id,
  };
}

function calculatePeriodWindow(period: string, datesInPeriod: string[]) {
  let startPrev: string | null = null;
  let endPrev: string | null = null;
  let periodLabel = 'PoP';
  // โหมดรอบ: ตรรกะ shape เดิมใช้กับ period ที่ตัด "cycle:" ออก; รอบเดี่ยวเทียบรอบก่อนหน้า, ช่วงรอบตกไป PoP ด้านล่าง
  const isCycle = isCyclePeriod(period);
  const filterPeriod = stripCycle(period);

  if (filterPeriod === 'ALL' || !datesInPeriod || datesInPeriod.length === 0) {
    periodLabel = 'ALL';
  } else if (isCycle && /^\d{4}-\d{2}$/.test(filterPeriod)) {
    ({ start: startPrev, end: endPrev } = cycleRange(shiftMonth(filterPeriod, -1)));
    periodLabel = 'MoM';
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
  let isCurrentMonth = false;

  if (isSingleMonthView) {
    todayStr = localTodayIso();
    isCurrentMonth = datesInPeriod.includes(todayStr); // today inside this month / pay cycle
  }

  return {
    startPrev,
    endPrev,
    periodLabel,
    isSingleMonthView,
    todayStr,
    isCurrentMonth,
  };
}

function createInitialAnalyticsState() {
  const totals = {
    income: 0, expense: 0, savings: 0,
    fixed: 0, variable: 0, food: 0, rent: 0,
    subscription: 0, subscriptionCount: 0,
    subscriptionSub: { software: 0, shopping: 0, streaming: 0, other: 0 },
    subscriptionItems: [] as SubscriptionItem[],
    rentSub: { rent: 0, electricity: 0, internet: 0, water: 0 },
    weekend: 0, weekday: 0,
    foodWeekend: 0, foodWeekday: 0, foodDailyMap: {} as Record<string, number>,
    dayOfWeekMap: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } as Record<number, number>
  };

  const allocTotals: Record<string, number> = { need: 0, want: 0, savings: 0 };
  const allocGroupsMap: Record<string, AllocGroupEntry[]> = { need: [], want: [], savings: [] };
  const groupTotals: Record<string, number> = {};
  const dayIncomeMap: Record<string, number> = {};
  const dayExpenseMap: Record<string, number> = {};
  const uniqueMonthsSet: Set<string> = new Set();
  const cashflowMap: CashflowMap = {};
  const catMapData: Record<string, number> = {};
  const wantCatMapData: Record<string, number> = {};
  const dailyAllMap: Record<string, number> = {};
  const monthlyAllMap: Record<string, number> = {};
  const dailyCatMap: Record<string, Record<string, number>> = {};
  const monthlyCatMap: Record<string, Record<string, number>> = {};
  const dailyAllocMap: Record<string, Record<string, number>> = { need: {}, want: {}, savings: {} };
  const monthlyAllocMap: Record<string, Record<string, number>> = { need: {}, want: {}, savings: {} };
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
    globalDailySum,
    prevTotals,
    forecastRef,
    stateRef
  };
}

function executeTransactionAggregation(
  transactions: TransactionDisplay[],
  catMapLookup: CatLookup,
  windowMeta: ReturnType<typeof calculatePeriodWindow>,
  opts: AggregationOptions,
  state: AnalyticsState,
) {
  const { startPrev, endPrev, isCurrentMonth, todayStr } = windowMeta;

  transactions.forEach(t => {
    const isoDate = t.date;
    if (!isoDate) return;

    const txContext = resolveTransactionContext(t, catMapLookup, opts.cashflowGroups, opts.groupMeta.fallbackExpId);
    trackTrendAndGlobal(isoDate, txContext, startPrev, endPrev, state);

    const flags = processAnalyticsTx(t, isoDate, txContext, opts, state);
    if (flags) {
      trackForecastingUpToToday(isoDate, txContext, flags.isRent, flags.isFood, isCurrentMonth, todayStr, state.forecastRef);
    }
  });
}

function applyBackendSummaryTotals(totals: Totals, summaryData: AnalyticsSummary | null | undefined) {
  if (!summaryData?.summary) return;
  totals.income = summaryData.summary.income;
  totals.expense = summaryData.summary.expense;
  totals.savings = summaryData.summary.savings;
}

function applyBackendMonthlyCashflow(cashflowMap: CashflowMap, summaryData: AnalyticsSummary | null | undefined) {
  if (!summaryData?.monthly) return;
  summaryData.monthly.forEach(m => {
    cashflowMap[m.month] = {
      monthStr: m.month, income: m.income, totalExp: m.expense, totalSav: m.savings, groups: m.groups || {}
    };
  });
}

function calculateGlobalMaxThreshold(globalDailySum: Record<string, number>) {
  const globalValues = Object.values(globalDailySum).filter(v => v > 0).sort((a, b) => a - b);
  if (globalValues.length === 0) return 100;
  const p90Index = Math.floor(globalValues.length * 0.9);
  return globalValues[p90Index] || globalValues[globalValues.length - 1];
}

function calculateSavingsMetrics(totals: Totals, uniqueMonthsSet: Set<string>) {
  const actualSavings = totals.income - totals.expense;
  const numMonths = uniqueMonthsSet.size || 1;
  const savingsRate = totals.income > 0 ? Number.parseFloat(((actualSavings / totals.income) * 100).toFixed(1)) : 0;
  return { numMonths, savingsRate };
}

function calculateFinancialPercentages(totals: Totals) {
  const hasExp = totals.expense > 0;
  const hasInc = totals.income > 0;
  return {
    foodPercentage: hasExp ? ((totals.food / totals.expense) * 100).toFixed(1) : 0,
    foodPctOfIncome: hasInc ? ((totals.food / totals.income) * 100).toFixed(1) : 0,
    rentPercentage: hasInc ? ((totals.rent / totals.income) * 100).toFixed(1) : 0,
    subscriptionPercentage: hasExp ? ((totals.subscription / totals.expense) * 100).toFixed(1) : 0,
    subscriptionPctOfIncome: hasInc ? ((totals.subscription / totals.income) * 100).toFixed(1) : 0,
  };
}

export interface CoreAnalyticsInput {
  transactions: TransactionDisplay[];
  categories: Category[];
  cashflowGroups: CashflowGroup[];
  filterPeriod: string;
  hideFixedExpenses: boolean;
  hideWantExpenses: boolean;
  dashboardCategory: string | string[];
  dayTypes?: Record<string, string>;
  dayTypeConfig?: DayType[];
  summaryData?: AnalyticsSummary | null;
}

/** Everything the dashboard derives from the loaded transactions (no chart data — see generateMainChartData). */
export function computeCoreAnalytics({
  transactions, categories, cashflowGroups, filterPeriod,
  hideFixedExpenses, hideWantExpenses, dashboardCategory,
  dayTypes, dayTypeConfig, summaryData,
}: CoreAnalyticsInput) {
  const catMapLookup = createCategoryMap(categories);
  // backend summary is grouped by calendar month — pay-cycle periods are aggregated client-side only.
  // A comma list ("2026-08,2026-10") has no date bounds, so the loader fetched the WHOLE database: its summary
  // is not the summary of the chosen months either.
  const useBackendTotals = Boolean(summaryData) && !isCyclePeriod(filterPeriod) && !filterPeriod.includes(',');
  const groupMeta = resolveCashflowGroups(cashflowGroups);

  const datesInPeriod = generateDatesForPeriod(filterPeriod, transactions);
  const windowMeta = calculatePeriodWindow(filterPeriod, datesInPeriod);
  const activeFilters = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];

  const state = createInitialAnalyticsState();

  executeTransactionAggregation(transactions, catMapLookup, windowMeta, {
    filterPeriod, cashflowGroups, groupMeta, hideFixedExpenses, hideWantExpenses, activeFilters,
  }, state);

  const { totals, cashflowMap, prevTotals, forecastRef, stateRef, uniqueMonthsSet } = state;
  const { expenseUpToToday, rentUpToToday } = forecastRef;
  const chartTotal = stateRef.chartTotal;
  prevTotals.net = prevTotals.income - prevTotals.expense;

  if (useBackendTotals && !windowMeta.isSingleMonthView) {
    applyBackendSummaryTotals(totals, summaryData);
  }

  const netCashflow = totals.income - totals.expense;
  const { numMonths, savingsRate } = calculateSavingsMetrics(totals, uniqueMonthsSet);

  const sortedCats = buildSortedCategories(state.catMapData, catMapLookup, chartTotal, categories);

  const { sortedGroups } = buildGroupBreakdown(state.catMapData, catMapLookup, state.groupTotals, cashflowGroups, numMonths, chartTotal);
  const { sortedAllocation } = buildAllocationBreakdown(state.allocTotals, state.allocGroupsMap, totals, netCashflow);

  if (useBackendTotals && !windowMeta.isSingleMonthView) {
    applyBackendMonthlyCashflow(cashflowMap, summaryData);
  }

  const sortedCashflow = Object.values(cashflowMap).sort((a, b) => a.monthStr.localeCompare(b.monthStr));
  const sortedMonthsKeys = sortedCashflow.map(c => c.monthStr);

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
    totals,
    expenseUpToToday,
    rentUpToToday,
    dailySumMap: state.globalDailySum,
  });

  const ghostPacerDetails = calculateGhostPacerData({
    globalDailySum: state.globalDailySum,
    filterPeriod,
    isCurrentMonth: windowMeta.isCurrentMonth,
    projectedExpense,
  });

  const monthlyIncomeMap: Record<string, number> = {};
  Object.entries(cashflowMap).forEach(([m, data]) => {
    monthlyIncomeMap[m] = data.income || 0;
  });

  const periodMonths = Array.from(new Set(datesInPeriod.map(d => monthKeyOf(d, filterPeriod))));

  const allocationEvolution = calculateAllocationEvolution(
    state.monthlyAllocMap,
    filterPeriod,
    periodMonths,
    monthlyIncomeMap
  );

  const adjustedDailyAvg = totals.expense / Math.max(1, effectiveDays);
  const adjustedFoodDailyAvg = totals.food / Math.max(1, effectiveDays);

  return {
    catMapLookup, windowMeta, datesInPeriod, state, totals, prevTotals,
    netCashflow, savingsRate, numMonths, chartTotal,
    sortedCats, sortedGroups, sortedAllocation,
    sortedCashflow, sortedMonthsKeys, cashflowMap,
    globalMaxThreshold, dayTypeCounts,
    foodWorkdayAvg, foodHolidayAvg, dailyWorkdayAvg, dailyHolidayAvg, maxFoodDayAmount,
    topWantCategories, topSubscriptionServices, pcts,
    showForecasting, forecastingDetails, projectedExpense, safeToSpend, projectedSurplus,
    ghostPacerDetails, allocationEvolution,
    adjustedDailyAvg, adjustedFoodDailyAvg,
    useBackendTotals,
  };
}
