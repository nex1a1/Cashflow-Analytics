// src/views/Calendar/utils/calendarPeriodHelpers.js

export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_SHORT_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const DAY_OF_WEEK_LABELS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
export const DAY_OF_WEEK_FULL_LABELS = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];

/**
 * Parses and returns active month objects for any filter period string
 */
export function getMonthsForPeriod(filterPeriod, transactions = []) {
  // All Time: extract all active months from transactions
  if (!filterPeriod || filterPeriod === 'ALL') {
    const monthSet = new Set();
    transactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        const ym = t.date.substring(0, 7);
        if (ym.match(/^\d{4}-\d{2}$/)) monthSet.add(ym);
      }
    });
    const sorted = Array.from(monthSet).sort();
    if (sorted.length === 0) {
      const now = new Date();
      sorted.push(`${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`);
    }
    return sorted.map(ym => {
      const [y, m] = ym.split('-');
      const mIdx = parseInt(m, 10) - 1;
      return {
        monthStr: ym,
        year: parseInt(y, 10),
        monthIndex: mIdx,
        monthLabel: `${THAI_MONTHS[mIdx]} ${y}`,
        shortLabel: `${THAI_SHORT_MONTHS[mIdx]} ${y.slice(-2)}`
      };
    });
  }

  // Full Year e.g. "2026"
  if (filterPeriod.match(/^\d{4}$/)) {
    const y = parseInt(filterPeriod, 10);
    return Array.from({ length: 12 }, (_, i) => {
      const mNum = (i + 1).toString().padStart(2, '0');
      return {
        monthStr: `${y}-${mNum}`,
        year: y,
        monthIndex: i,
        monthLabel: `${THAI_MONTHS[i]} ${y}`,
        shortLabel: THAI_SHORT_MONTHS[i]
      };
    });
  }

  // Half-Year e.g. "2026-H1", "2026-H2"
  if (filterPeriod.match(/^\d{4}-H[12]$/)) {
    const [yStr, hStr] = filterPeriod.split('-');
    const y = parseInt(yStr, 10);
    const startM = hStr === 'H1' ? 0 : 6;
    return Array.from({ length: 6 }, (_, idx) => {
      const i = startM + idx;
      const mNum = (i + 1).toString().padStart(2, '0');
      return {
        monthStr: `${y}-${mNum}`,
        year: y,
        monthIndex: i,
        monthLabel: `${THAI_MONTHS[i]} ${y}`,
        shortLabel: THAI_SHORT_MONTHS[i]
      };
    });
  }

  // Quarter e.g. "2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4"
  if (filterPeriod.match(/^\d{4}-Q[1-4]$/)) {
    const [yStr, qStr] = filterPeriod.split('-Q');
    const y = parseInt(yStr, 10);
    const q = parseInt(qStr, 10);
    const startM = (q - 1) * 3;
    return Array.from({ length: 3 }, (_, idx) => {
      const i = startM + idx;
      const mNum = (i + 1).toString().padStart(2, '0');
      return {
        monthStr: `${y}-${mNum}`,
        year: y,
        monthIndex: i,
        monthLabel: `${THAI_MONTHS[i]} ${y}`,
        shortLabel: THAI_SHORT_MONTHS[i]
      };
    });
  }

  // Multi-select e.g. "2026-01,2026-03,2026-07"
  if (filterPeriod.includes(',')) {
    const months = filterPeriod.split(',').filter(Boolean).sort();
    return months.map(ym => {
      const [y, m] = ym.split('-');
      const mIdx = parseInt(m, 10) - 1;
      return {
        monthStr: ym,
        year: parseInt(y, 10),
        monthIndex: mIdx,
        monthLabel: `${THAI_MONTHS[mIdx]} ${y}`,
        shortLabel: `${THAI_SHORT_MONTHS[mIdx]} ${y.slice(-2)}`
      };
    });
  }

  // Range e.g. "2026-02_2026-05"
  if (filterPeriod.includes('_')) {
    const [startYM, endYM] = filterPeriod.split('_');
    const [sy, sm] = startYM.split('-').map(Number);
    const [ey, em] = endYM.split('-').map(Number);
    const result = [];
    let curY = sy;
    let curM = sm;
    while (curY < ey || (curY === ey && curM <= em)) {
      const mNum = curM.toString().padStart(2, '0');
      const ym = `${curY}-${mNum}`;
      const mIdx = curM - 1;
      result.push({
        monthStr: ym,
        year: curY,
        monthIndex: mIdx,
        monthLabel: `${THAI_MONTHS[mIdx]} ${curY}`,
        shortLabel: `${THAI_SHORT_MONTHS[mIdx]} ${String(curY).slice(-2)}`
      });
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }
    return result;
  }

  return [];
}

/**
 * Calculates CPA Savings Grade (A, B, C, D, F) based on Savings Rate %
 */
export function getCPAGrade(savingsRate) {
  if (savingsRate >= 40) return { grade: 'A+', text: 'ยอดเยี่ยม (Elite)', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)' };
  if (savingsRate >= 30) return { grade: 'A', text: 'ดีเยี่ยม (Excellent)', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)' };
  if (savingsRate >= 20) return { grade: 'B', text: 'มาตรฐานดี (Good)', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)' };
  if (savingsRate >= 10) return { grade: 'C', text: 'พอใช้ (Moderate)', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' };
  if (savingsRate > 0) return { grade: 'D', text: 'ควรระวัง (Low)', color: '#F97316', bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.3)' };
  return { grade: 'F', text: 'ติดลบ/ไม่มีเงินออม', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)' };
}

/**
 * Determines Heatmap Level 0 to 6 based on amount and maximum threshold
 */
export function getHeatmapLevel(amount, maxThreshold) {
  if (!amount || amount <= 0) return 0;
  if (!maxThreshold || maxThreshold <= 0) return 1;
  const ratio = amount / maxThreshold;
  if (ratio <= 0.15) return 1;
  if (ratio <= 0.30) return 2;
  if (ratio <= 0.50) return 3;
  if (ratio <= 0.70) return 4;
  if (ratio <= 0.85) return 5;
  return 6;
}

/**
 * Primary calculation engine for Period Metrics and Multi-Month Matrix
 */
export function calculatePeriodMetrics({
  monthsList,
  transactions,
  categories,
  cashflowGroups = [],
  dayTypes = {},
  dayTypeConfig = []
}) {
  const validMonthSet = new Set(monthsList.map(m => m.monthStr));

  // 1. Group transactions belonging strictly to the selected period
  const periodTransactions = transactions.filter(t => {
    if (!t.date || t.date.length < 7) return false;
    const ym = t.date.substring(0, 7);
    return validMonthSet.has(ym);
  });

  // Daily map: dateStr -> { income: number, expense: number, txs: array }
  const dailyMap = new Map();
  let totalInflow = 0;
  let totalOutflow = 0;

  // Month matrices map: monthStr -> monthly stats
  const monthlyMatrices = monthsList.map(item => {
    const [yStr, mStr] = item.monthStr.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDayOfMonth = new Date(y, m, 1).getDay();

    return {
      ...item,
      income: 0,
      expense: 0,
      txCount: 0,
      daysInMonth,
      firstDayOfMonth,
      dailyExpenses: {},
      dailyIncomes: {},
      dailyCounts: {},
      maxDailyExpense: 0
    };
  });

  const monthLookup = new Map(monthlyMatrices.map(m => [m.monthStr, m]));

  periodTransactions.forEach(t => {
    const ym = t.date.substring(0, 7);
    const dStr = t.date;
    const catObj = categories.find(c => c.id === t.category_id || c.name === t.category);
    const amt = parseFloat(t.amount) || 0;
    const isInc = catObj?.type === 'income';

    if (!dailyMap.has(dStr)) {
      dailyMap.set(dStr, { income: 0, expense: 0, txs: [] });
    }
    const dayRecord = dailyMap.get(dStr);

    const mObj = monthLookup.get(ym);
    const dayNum = parseInt(dStr.split('-')[2], 10);

    if (isInc) {
      dayRecord.income += amt;
      totalInflow += amt;
      if (mObj) {
        mObj.income += amt;
        mObj.dailyIncomes[dayNum] = (mObj.dailyIncomes[dayNum] || 0) + amt;
      }
    } else {
      dayRecord.expense += amt;
      totalOutflow += amt;
      if (mObj) {
        mObj.expense += amt;
        mObj.dailyExpenses[dayNum] = (mObj.dailyExpenses[dayNum] || 0) + amt;
        if (mObj.dailyExpenses[dayNum] > mObj.maxDailyExpense) {
          mObj.maxDailyExpense = mObj.dailyExpenses[dayNum];
        }
      }
    }

    dayRecord.txs.push({ ...t, _catObj: catObj });
    if (mObj) {
      mObj.txCount += 1;
      mObj.dailyCounts[dayNum] = (mObj.dailyCounts[dayNum] || 0) + 1;
    }
  });

  // Calculate total days count and peak day across the period
  let totalPeriodDays = 0;
  let zeroSpendDaysCount = 0;
  let peakDate = null;
  let peakExpenseAmount = 0;
  let peakTxs = [];

  monthlyMatrices.forEach(mObj => {
    totalPeriodDays += mObj.daysInMonth;
    const net = mObj.income - mObj.expense;
    mObj.net = net;
    mObj.isSurplus = net >= 0;
    mObj.savingsRate = mObj.income > 0 ? Math.max(0, Math.round((net / mObj.income) * 100)) : 0;

    // Mini heatmap generation
    const miniHeatmap = [];
    for (let d = 1; d <= mObj.daysInMonth; d++) {
      const exp = mObj.dailyExpenses[d] || 0;
      const inc = mObj.dailyIncomes[d] || 0;
      const count = mObj.dailyCounts[d] || 0;
      const dateStr = `${mObj.monthStr}-${d.toString().padStart(2, '0')}`;
      const dayOfWeek = new Date(mObj.year, mObj.monthIndex, d).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (exp === 0) {
        zeroSpendDaysCount++;
      }
      if (exp > peakExpenseAmount) {
        peakExpenseAmount = exp;
        peakDate = dateStr;
        peakTxs = dailyMap.get(dateStr)?.txs || [];
      }

      miniHeatmap.push({
        day: d,
        dateStr,
        expense: exp,
        income: inc,
        txCount: count,
        level: getHeatmapLevel(exp, mObj.maxDailyExpense),
        isWeekend,
        dayOfWeek
      });
    }
    mObj.miniHeatmap = miniHeatmap;
  });

  const periodNet = totalInflow - totalOutflow;
  const savingsRate = totalInflow > 0 ? Math.max(0, Math.round((periodNet / totalInflow) * 100)) : 0;
  const averageDailyBurn = totalPeriodDays > 0 ? Math.round(totalOutflow / totalPeriodDays) : 0;
  const zeroSpendPct = totalPeriodDays > 0 ? Math.round((zeroSpendDaysCount / totalPeriodDays) * 100) : 0;

  return {
    monthlyMatrices,
    displayMonths: monthlyMatrices.filter(m => m.txCount > 0 || m.income > 0 || m.expense > 0),
    totalPeriodDays,
    periodIncome: totalInflow,
    periodExpense: totalOutflow,
    periodNet,
    savingsRate,
    cpaGrade: getCPAGrade(savingsRate),
    averageDailyBurn,
    zeroSpendDaysCount,
    zeroSpendPct,
    peakSpendDay: {
      date: peakDate,
      amount: peakExpenseAmount,
      transactions: peakTxs
    },
    totalTxCount: periodTransactions.length
  };
}

/**
 * Identifies if a given day-type object or string is work-related (Work, OT, Company Act, Shift)
 */
export function isWorkDayType(dt) {
  if (!dt) return false;
  const name = (dt.name || '').toLowerCase();
  const label = (dt.label || '').toLowerCase();
  const id = (dt.id || '').toLowerCase();

  // Explicit code / name / id identifiers
  if (name === 'workday' || name === 'work' || name === 'ot' || name === 'company_act') return true;
  if (id === 'workday' || id === 'work' || id === 'ot') return true;

  // Keyword matches in label (Thai / English)
  if (label.includes('ทำงาน') || label.includes('ot') || label.includes('โอที') || label.includes('กะ')) return true;
  if (label.includes('กิจกรรม บ') || label.includes('กิจกรรมบริษัท') || label.includes('สัมมนา')) return true;

  return false;
}

/**
 * Calculates Day-of-Week and Work vs Rest Day Correlations
 */
export function calculateTemporalInsights({
  monthsList,
  transactions,
  categories,
  dayTypes = {},
  dayTypeConfig = []
}) {
  const validMonthSet = new Set(monthsList.map(m => m.monthStr));

  // Initialize Day-of-Week accumulators (0: Sunday .. 6: Saturday)
  const dayOfWeekStats = Array.from({ length: 7 }, (_, dow) => ({
    dow,
    label: DAY_OF_WEEK_LABELS[dow],
    fullLabel: DAY_OF_WEEK_FULL_LABELS[dow],
    totalExpense: 0,
    totalIncome: 0,
    dayOccurrences: 0,
    txCount: 0
  }));

  // Initialize Month Cycle parts: Early (1-10), Mid (11-20), Late (21+)
  const monthCycleStats = {
    early: { label: 'ต้นเดือน (1-10)', days: 0, totalExpense: 0, txCount: 0 },
    mid: { label: 'กลางเดือน (11-20)', days: 0, totalExpense: 0, txCount: 0 },
    late: { label: 'ปลายเดือน (21-สิ้นเดือน)', days: 0, totalExpense: 0, txCount: 0 }
  };

  // Day type map: day_type_id -> stats
  const dayTypeMap = {};
  dayTypeConfig.forEach(dt => {
    dayTypeMap[dt.id] = {
      id: dt.id,
      name: dt.name,
      label: dt.label,
      color: dt.color,
      daysCount: 0,
      totalExpense: 0,
      txCount: 0
    };
  });

  // Default day types if config is not populated yet
  if (Object.keys(dayTypeMap).length === 0) {
    dayTypeMap['work'] = { id: 'work', name: 'work', label: 'วันทำงาน', color: '#3B82F6', daysCount: 0, totalExpense: 0, txCount: 0 };
    dayTypeMap['weekend'] = { id: 'weekend', name: 'weekend', label: 'วันหยุดเสาร์-อาทิตย์', color: '#10B981', daysCount: 0, totalExpense: 0, txCount: 0 };
  }

  // Count calendar days distribution for every month in period
  monthsList.forEach(item => {
    const [yStr, mStr] = item.monthStr.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${item.monthStr}-${d.toString().padStart(2, '0')}`;
      const dow = new Date(y, m, d).getDay();
      const isWeekend = dow === 0 || dow === 6;

      // 1. Day of week occurrences
      dayOfWeekStats[dow].dayOccurrences += 1;

      // 2. Month cycle days
      if (d <= 10) monthCycleStats.early.days += 1;
      else if (d <= 20) monthCycleStats.mid.days += 1;
      else monthCycleStats.late.days += 1;

      // 3. Day type mapping
      const defaultTypeId = isWeekend ? (dayTypeConfig[1]?.id || 'weekend') : (dayTypeConfig[0]?.id || 'work');
      const assignedTypeId = dayTypes[dateStr] || defaultTypeId;

      if (!dayTypeMap[assignedTypeId]) {
        dayTypeMap[assignedTypeId] = {
          id: assignedTypeId,
          name: assignedTypeId,
          label: assignedTypeId,
          color: '#94a3b8',
          daysCount: 0,
          totalExpense: 0,
          txCount: 0
        };
      }
      dayTypeMap[assignedTypeId].daysCount += 1;
    }
  });

  // Tally expenses into day-of-week, cycle, and day-type
  let totalPeriodExpense = 0;

  transactions.forEach(t => {
    if (!t.date || t.date.length < 7) return;
    const ym = t.date.substring(0, 7);
    if (!validMonthSet.has(ym)) return;

    const catObj = categories.find(c => c.id === t.category_id || c.name === t.category);
    if (catObj?.type === 'income') return; // only track expenses for burn analytics

    const amt = parseFloat(t.amount) || 0;
    totalPeriodExpense += amt;

    const [yStr, mStr, dStr] = t.date.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    const d = parseInt(dStr, 10);
    const dow = new Date(y, m, d).getDay();
    const isWeekend = dow === 0 || dow === 6;

    // Day of week
    dayOfWeekStats[dow].totalExpense += amt;
    dayOfWeekStats[dow].txCount += 1;

    // Month cycle
    if (d <= 10) {
      monthCycleStats.early.totalExpense += amt;
      monthCycleStats.early.txCount += 1;
    } else if (d <= 20) {
      monthCycleStats.mid.totalExpense += amt;
      monthCycleStats.mid.txCount += 1;
    } else {
      monthCycleStats.late.totalExpense += amt;
      monthCycleStats.late.txCount += 1;
    }

    // Day type
    const defaultTypeId = isWeekend ? (dayTypeConfig[1]?.id || 'weekend') : (dayTypeConfig[0]?.id || 'work');
    const assignedTypeId = dayTypes[t.date] || defaultTypeId;
    if (dayTypeMap[assignedTypeId]) {
      dayTypeMap[assignedTypeId].totalExpense += amt;
      dayTypeMap[assignedTypeId].txCount += 1;
    }
  });

  // Calculate Averages and percentages
  dayOfWeekStats.forEach(d => {
    d.avgExpense = d.dayOccurrences > 0 ? Math.round(d.totalExpense / d.dayOccurrences) : 0;
    d.pctOfTotal = totalPeriodExpense > 0 ? Math.round((d.totalExpense / totalPeriodExpense) * 100) : 0;
  });

  const maxDowAvg = Math.max(...dayOfWeekStats.map(d => d.avgExpense), 1);
  dayOfWeekStats.forEach(d => {
    d.relativeBarRatio = Math.round((d.avgExpense / maxDowAvg) * 100);
  });

  // Calculate day-type metrics
  const activeDayTypes = Object.values(dayTypeMap)
    .filter(dt => dt.daysCount > 0)
    .map(dt => ({
      ...dt,
      avgExpense: dt.daysCount > 0 ? Math.round(dt.totalExpense / dt.daysCount) : 0,
      pctOfTotal: totalPeriodExpense > 0 ? Math.round((dt.totalExpense / totalPeriodExpense) * 100) : 0
    }))
    .sort((a, b) => b.totalExpense - a.totalExpense);

  // Work vs Rest Day Summary (Accurately group all work-related and rest-related day types)
  const workDayTypes = activeDayTypes.filter(isWorkDayType);
  const restDayTypes = activeDayTypes.filter(dt => !isWorkDayType(dt));

  const workTotalDays = workDayTypes.reduce((acc, dt) => acc + dt.daysCount, 0);
  const workTotalExpense = workDayTypes.reduce((acc, dt) => acc + dt.totalExpense, 0);
  const workAvgExpense = workTotalDays > 0 ? Math.round(workTotalExpense / workTotalDays) : 0;

  const restTotalDays = restDayTypes.reduce((acc, dt) => acc + dt.daysCount, 0);
  const restTotalExpense = restDayTypes.reduce((acc, dt) => acc + dt.totalExpense, 0);
  const restAvgExpense = restTotalDays > 0 ? Math.round(restTotalExpense / restTotalDays) : 0;

  const ratio = workAvgExpense > 0
    ? (restAvgExpense / workAvgExpense).toFixed(1)
    : (restAvgExpense > 0 ? '∞' : '1.0');

  // Month cycle ratios
  Object.values(monthCycleStats).forEach(c => {
    c.avgExpense = c.days > 0 ? Math.round(c.totalExpense / c.days) : 0;
    c.pctOfTotal = totalPeriodExpense > 0 ? Math.round((c.totalExpense / totalPeriodExpense) * 100) : 0;
  });

  return {
    dayOfWeekStats,
    activeDayTypes,
    workVsRest: {
      workDays: workTotalDays,
      workTotalExpense: workTotalExpense,
      workAvgExpense: workAvgExpense,
      restDays: restTotalDays,
      restTotalExpense: restTotalExpense,
      restAvgExpense: restAvgExpense,
      ratio,
      workDayTypes,
      restDayTypes
    },
    monthCycleStats
  };
}

/**
 * Calculates Need / Want / Savings Allocation Breakdown for the period
 */
export function calculateAllocationBreakdown({
  monthsList,
  transactions,
  categories,
  cashflowGroups = []
}) {
  const validMonthSet = new Set(monthsList.map(m => m.monthStr));
  let needTotal = 0;
  let wantTotal = 0;
  let savingsGroupTotal = 0;
  let incomeTotal = 0;
  let expenseTotal = 0;

  const catSums = {};

  transactions.forEach(t => {
    if (!t.date || t.date.length < 7) return;
    const ym = t.date.substring(0, 7);
    if (!validMonthSet.has(ym)) return;

    const amt = parseFloat(t.amount) || 0;
    const catObj = categories.find(c => c.id === t.category_id || c.name === t.category);
    const catId = catObj ? catObj.id : (t.category_id || t.category || 'other');

    if (catObj?.type === 'income') {
      incomeTotal += amt;
      return;
    }

    expenseTotal += amt;

    const groupObj = catObj ? cashflowGroups.find(g => g.id === catObj.cashflowGroup) : null;
    const aType = t.allocation_type || (groupObj?.type === 'savings' ? 'savings' : (groupObj?.allocation_type || 'want'));

    const key = `${catId}__${aType}`;
    if (!catSums[key]) {
      catSums[key] = {
        id: key,
        categoryId: catId,
        name: catObj ? catObj.name : (t.category || 'อื่นๆ'),
        icon: catObj?.icon || '📌',
        color: catObj?.color || groupObj?.color || '#94a3b8',
        allocation: aType,
        total: 0
      };
    }
    catSums[key].total += amt;

    if (aType === 'need') needTotal += amt;
    else if (aType === 'want') wantTotal += amt;
    else if (aType === 'savings') savingsGroupTotal += amt;
  });

  const netCashflow = incomeTotal - expenseTotal;
  const netSurplus = Math.max(0, netCashflow);
  const totalSavings = savingsGroupTotal + netSurplus;
  const grandTotal = needTotal + wantTotal + totalSavings;

  const needPct = grandTotal > 0 ? Math.round((needTotal / grandTotal) * 100) : 0;
  const wantPct = grandTotal > 0 ? Math.round((wantTotal / grandTotal) * 100) : 0;
  const savingsPct = grandTotal > 0 ? Math.max(0, 100 - needPct - wantPct) : 0;

  const allCatList = Object.values(catSums).sort((a, b) => b.total - a.total);
  const topNeedCats = allCatList.filter(c => c.allocation === 'need').slice(0, 3);
  const topWantCats = allCatList.filter(c => c.allocation === 'want').slice(0, 3);

  // Ranked categories with percentage of total allocation
  const rankedCategories = allCatList.slice(0, 7).map(c => {
    const groupTotal = c.allocation === 'need' ? needTotal : (c.allocation === 'want' ? wantTotal : (savingsGroupTotal > 0 ? savingsGroupTotal : totalSavings));
    const pctOfGroup = groupTotal > 0 ? Math.round((c.total / groupTotal) * 100) : 0;
    const pctOfGrand = grandTotal > 0 ? Math.round((c.total / grandTotal) * 100) : 0;
    return {
      ...c,
      pctOfGroup,
      pctOfGrand
    };
  });

  return {
    needTotal,
    wantTotal,
    savingsTotal: totalSavings,
    savingsGroupTotal,
    netSurplus,
    grandTotal,
    needPct,
    wantPct,
    savingsPct,
    topNeedCats,
    topWantCats,
    rankedCategories,
    benchmarks: {
      needDelta: needPct - 50,
      wantDelta: wantPct - 30,
      savingsDelta: savingsPct - 20
    }
  };
}

/**
 * Checks if a transaction is Rent / Dormitory / Fixed housing
 */
export function isRentTransaction(t, categories = [], cashflowGroups = []) {
  const catObj = categories.find(c => c.id === t.category_id || c.name === t.category);
  const groupObj = catObj ? cashflowGroups.find(g => g.id === catObj.cashflowGroup) : null;

  const desc = (t.description || '').toLowerCase();
  const catName = (catObj?.name || t.category || '').toLowerCase();
  const groupName = (groupObj?.name || '').toLowerCase();

  const rentKeywords = ['หอ', 'ค่าหอ', 'ค่าเช่า', 'เช่าห้อง', 'เช่าบ้าน', 'หอพัก', 'ที่พัก', 'rent', 'dorm', 'condo', 'คอนโด', 'ห้องพัก'];
  return rentKeywords.some(kw => desc.includes(kw) || catName.includes(kw) || groupName.includes(kw));
}

/**
 * Ranks Top Outlier Spend Days in the period with transaction previews
 */
export function calculatePeakOutliers({
  monthsList,
  transactions,
  categories,
  cashflowGroups = [],
  dayTypes = {},
  dayTypeConfig = [],
  limit = 6,
  excludeRent = true
}) {
  const validMonthSet = new Set(monthsList.map(m => m.monthStr));
  const dailyMap = {};
  let rentTransactionsCount = 0;

  transactions.forEach(t => {
    if (!t.date || t.date.length < 10) return;
    const ym = t.date.substring(0, 7);
    if (!validMonthSet.has(ym)) return;

    const catObj = categories.find(c => c.id === t.category_id || c.name === t.category);
    if (catObj?.type === 'income') return;

    const isRent = isRentTransaction(t, categories, cashflowGroups);
    if (isRent) {
      rentTransactionsCount++;
      if (excludeRent) return; // skip rent transactions when filter is active
    }

    const amt = parseFloat(t.amount) || 0;
    if (!dailyMap[t.date]) {
      dailyMap[t.date] = {
        dateStr: t.date,
        totalExpense: 0,
        transactions: []
      };
    }
    dailyMap[t.date].totalExpense += amt;
    dailyMap[t.date].transactions.push({ ...t, _catObj: catObj });
  });

  const sortedDays = Object.values(dailyMap)
    .filter(d => d.totalExpense > 0)
    .sort((a, b) => b.totalExpense - a.totalExpense)
    .slice(0, limit);

  const formattedOutliers = sortedDays.map(item => {
    const [yStr, mStr, dStr] = item.dateStr.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    const d = parseInt(dStr, 10);
    const dow = new Date(y, m, d).getDay();
    const isWeekend = dow === 0 || dow === 6;

    const defaultTypeId = isWeekend ? (dayTypeConfig[1]?.id || 'weekend') : (dayTypeConfig[0]?.id || 'work');
    const assignedTypeId = dayTypes[item.dateStr] || defaultTypeId;
    const matchedDayType = dayTypeConfig.find(dt => dt.id === assignedTypeId) || {
      id: assignedTypeId,
      label: assignedTypeId === 'work' ? 'วันทำงาน' : 'วันหยุด',
      color: assignedTypeId === 'work' ? '#3B82F6' : '#10B981'
    };

    // Sort item's transactions highest amount first
    item.transactions.sort((a, b) => b.amount - a.amount);
    const topItem = item.transactions[0];

    return {
      ...item,
      dayOfWeek: DAY_OF_WEEK_FULL_LABELS[dow],
      formattedDate: `${d} ${THAI_SHORT_MONTHS[m]} ${y}`,
      dayType: matchedDayType,
      topItemTitle: topItem?.description || topItem?._catObj?.name || 'รายการหลัก',
      topItemAmount: topItem?.amount || 0
    };
  });

  return {
    outliers: formattedOutliers,
    rentTransactionsCount
  };
}
