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

    // --- Previous Period Calculation for Trends ---
    let prevTotals = { income: 0, expense: 0, net: 0 };
    if (filterPeriod !== 'ALL') {
      const datesInCurrent = generateDatesForPeriod(filterPeriod, transactions);
      if (datesInCurrent.length > 0) {
        const firstDate = new Date(datesInCurrent[0]);
        const lastDate = new Date(datesInCurrent[datesInCurrent.length - 1]);
        const durationMs = lastDate.getTime() - firstDate.getTime() + (24 * 60 * 60 * 1000);
        
        const prevEnd = new Date(firstDate.getTime() - (24 * 60 * 60 * 1000));
        const prevStart = new Date(prevEnd.getTime() - durationMs + (24 * 60 * 60 * 1000));
        
        const startStr = prevStart.toISOString().split('T')[0];
        const endStr = prevEnd.toISOString().split('T')[0];
        
        transactions.forEach(t => {
          if (t.date >= startStr && t.date <= endStr) {
            const amt = parseFloat(t.amount) || 0;
            const catObj = catMapLookup[t.category_id] || catMapLookup[t.category] || { type: 'expense' };
            if (catObj.type === 'income') prevTotals.income += amt;
            else prevTotals.expense += amt;
          }
        });
        prevTotals.net = prevTotals.income - prevTotals.expense;
      }
    }

    const netCashflow = totals.income - totals.expense;
    const actualSavings = (totals.savings || 0) + Math.max(0, netCashflow); 
    const numMonths = uniqueMonthsSet.size || 1;
    const savingsRate = totals.income > 0 ? ((actualSavings / totals.income) * 100).toFixed(1) : 0;

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
      .map(([catId, amount]) => {
        const catObj = catMapLookup[catId] || { name: 'Unknown', id: catId };
        return {
          id: catId,
          name: catObj.name,
          amount: amount,
          percentage: chartTotal > 0 ? ((amount / chartTotal) * 100).toFixed(1) : 0,
          avgPerMonth: amount / numMonths,
          icon: catObj.icon,
          color: catObj.color || '#64748B'
        };
      });

    const datesInPeriod = generateDatesForPeriod(filterPeriod, transactions);
    const periodDays = datesInPeriod.length || 1;
    const dailyAvg = totals.expense / periodDays;

    const catChartData = {
      labels: sortedCats.map(c => c.name),
      datasets: [{
        data: sortedCats.map(c => c.amount),
        backgroundColor: sortedCats.map(c => c.color),
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

    // 8. Forecasting & Run Rate & Adjusted Daily Averages
    let projectedExpense = 0;
    let safeToSpend = 0;
    let showForecasting = false;
    let adjustedDailyAvg = dailyAvg;
    let adjustedFoodDailyAvg = totals.food / periodDays;
    let currentDay = periodDays;
    
    if (isSingleMonthView && datesInPeriod.length > 0) {
      const parts = filterPeriod.split('-');
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1;
      
      const today = new Date();
      const isCurrentMonth = today.getFullYear() === y && today.getMonth() === m;
      
      if (isCurrentMonth) {
        showForecasting = true;
        const lastDayOfMonth = new Date(y, m + 1, 0).getDate();
        currentDay = Math.max(1, Math.min(today.getDate(), lastDayOfMonth));
        const remainingDays = Math.max(1, lastDayOfMonth - currentDay); 
        
        const todayStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        let expenseUpToToday = 0;
        let variableUpToToday = 0;
        let foodUpToToday = 0;
        
        transactions.forEach(item => {
          if (!item.date || !item.date.startsWith(filterPeriod)) return;
          if (item.date <= todayStr) {
            const amt = parseFloat(item.amount) || 0;
            const catObj = catMapLookup[item.category];
            const isExpense = catObj ? catObj.type === 'expense' : true;
            
            if (isExpense) {
              expenseUpToToday += amt;
              const isFixed = catObj ? catObj.isFixed : false;
              if (!isFixed) variableUpToToday += amt;
              
              const cGroupId = catObj ? catObj.cashflowGroup : null;
              const groupObj = cashflowGroups?.find(g => g.id === cGroupId) || {};
              const groupName = (groupObj.name || '').toLowerCase();
              const cGroup = cGroupId || 'cg_variable';
              
              if (cGroup === 'cg_food' || cGroup === 'food' || groupName.includes('กิน') || groupName.includes('อาหาร') || groupName.includes('food')) {
                foodUpToToday += amt;
              }
            }
          }
        });

        // 1. ปรับค่าเฉลี่ยรายวัน ให้หารด้วยวันที่ผ่านมาถึงวันนี้
        adjustedDailyAvg = expenseUpToToday / currentDay;
        adjustedFoodDailyAvg = foodUpToToday / currentDay;

        // 2. Projected Expense: ค่าคงที่ทั้งหมด + ค่าผันแปรถึงวันนี้ + (อัตราผันแปรต่อวัน * วันที่เหลือ)
        const variableRunRate = variableUpToToday / currentDay;
        projectedExpense = totals.fixed + variableUpToToday + (variableRunRate * remainingDays);
        
        // 3. Safe to spend: (รายรับทั้งหมด - คงที่ทั้งหมด - ผันแปรที่ใช้ไปแล้ว) / วันที่เหลือให้ใช้
        const remainingBudget = totals.income - totals.fixed - variableUpToToday;
        const daysToBudget = Math.max(1, lastDayOfMonth - currentDay + 1);
        safeToSpend = remainingBudget > 0 ? remainingBudget / daysToBudget : 0;
      }
    }

    // 9. Smart Insights & Anomalies (CPA-Level Advice)
    const smartInsights = [];
    
    // 1. Liquidity & Savings Analysis
    if (totals.income > 0) {
      if (totals.expense > totals.income) {
        smartInsights.push({ type: 'error', icon: '🚨', message: `สภาพคล่องติดลบ: คุณดึงเงินเก็บมาใช้แล้ว ${formatMoney(totals.expense - totals.income)} บาท แนะนำให้เบรกรายจ่ายผันแปรทันที` });
      } else if (savingsRate >= 20) {
        smartInsights.push({ type: 'success', icon: '🏆', message: `วินัยการเงินยอดเยี่ยม: คุณออมเงินได้ ${savingsRate}% (เกินเกณฑ์มาตรฐาน 20%) รักษาระดับนี้ไว้เพื่ออิสรภาพทางการเงิน` });
      } else if (savingsRate < 10) {
        smartInsights.push({ type: 'warning', icon: '⚠️', message: `สัดส่วนการออมต่ำ: คุณออมได้เพียง ${savingsRate}% แนะนำให้หักเงินออมก่อนใช้จ่าย (Pay Yourself First) อย่างน้อย 10%` });
      }
    }

    // 2. Fixed Obligation Ratio (ภาระคงที่เทียบกับรายได้)
    if (totals.income > 0) {
      const fixedRatio = (totals.fixed / totals.income) * 100;
      if (fixedRatio > 50) {
        smartInsights.push({ type: 'warning', icon: '⚖️', message: `ความเสี่ยงเชิงโครงสร้าง: ภาระค่าใช้จ่ายคงที่ของคุณสูงถึง ${fixedRatio.toFixed(1)}% ของรายได้ ทำให้ความยืดหยุ่นทางการเงินต่ำ` });
      }
    }

    // 3. Burn Rate & Pacing (Current Month Only)
    if (showForecasting && projectedExpense > totals.income && totals.income > 0) {
      smartInsights.push({ type: 'error', icon: '🔥', message: `อัตราการเผาผลาญ (Burn Rate) สูงเกินไป: หากใช้จ่ายด้วยความเร็วเท่าเดิม สิ้นเดือนนี้คุณจะติดลบ ${formatMoney(projectedExpense - totals.income)} บาท` });
    } else if (showForecasting && safeToSpend > 0 && safeToSpend < 300) {
       smartInsights.push({ type: 'warning', icon: '⏳', message: `งบตึงตัว: คุณมี Safe-to-Spend เหลือเพียง ${formatMoney(safeToSpend)} บาท/วัน ควรหลีกเลี่ยงการสร้างหนี้ก้อนใหม่ในเดือนนี้` });
    }

    // 4. Weekend Lifestyle Trap
    if (totals.expense > 0) {
      const weekendRatio = (totals.weekend / totals.expense) * 100;
      // วันหยุดมีแค่ 2 วันจาก 7 วัน (ประมาณ 28%) ถ้าใช้จ่ายวันหยุดเกิน 40% ถือว่าเยอะ
      if (weekendRatio > 40) {
         smartInsights.push({ type: 'info', icon: '🏝️', message: `ข้อสังเกต: รายจ่ายช่วงวันหยุดของคุณสูงถึง ${weekendRatio.toFixed(1)}% ของทั้งหมด ระวังกับดัก Weekend Lifestyle (การให้รางวัลตัวเองมากเกินไป)` });
      }
    }

    // 5. Cost Driver Analysis (Top Category)
    if (sortedCats.length > 0 && sortedCats[0].amount > 0) {
      const topCat = sortedCats[0];
      if (topCat.percentage > 30) {
        smartInsights.push({ type: 'anomaly', icon: '📊', message: `Cost Driver: ค่าใช้จ่ายส่วนใหญ่จมไปกับ '${topCat.name}' (${topCat.percentage}%) หากต้องการลดรายจ่าย ให้เริ่มประเมินจากหมวดหมู่นี้ก่อน` });
      }
    }

    // 6. Emergency Fund Reminder (Show occasionally if viewing ALL or multiple months)
    if (!isSingleMonthView && totals.expense > 0 && numMonths >= 3) {
       const target = (totals.expense / numMonths) * 6;
       smartInsights.push({ type: 'info', icon: '🛡️', message: `เป้าหมายความมั่นคง: จากค่าเฉลี่ยการใช้จ่าย คุณควรมีเงินสำรองฉุกเฉินก้อนแรกที่ ${formatMoney(target)} บาท (สำหรับ 6 เดือน)` });
    }

    // 8. Zero-Expense Days
    if (isSingleMonthView && datesInPeriod.length > 0) {
      const daysWithExpense = new Set(chartTx.map(t => t.date)).size;
      const passedDays = showForecasting ? currentDay : periodDays;
      const zeroDays = passedDays - daysWithExpense;
      if (zeroDays >= 3) {
         smartInsights.push({ type: 'success', icon: '🌟', message: `วินัยการคุมเงิน: เดือนนี้คุณมีวันที่ "ไม่ใช้เงินเลย" (Zero-Expense Day) ถึง ${zeroDays} วัน ถือว่าทำได้ดีมาก!` });
      }
    }

    return {
      isSingleMonthView,
      showForecasting,
      projectedExpense,
      safeToSpend,
      smartInsights,
      prevTotals, // Added previous period totals
      totalExpense: totals.expense, 
      totalIncome: totals.income, 
      totalSavings: totals.savings || 0,
      actualSavings,
      netCashflow, 
      savingsRate, 
      chartTotal, 
      numMonths,
      sortedCats,
      topTransactions: [...chartTx].sort((a, b) => b.amount - a.amount).slice(0, topXLimit),
      dailyAvg: adjustedDailyAvg,
      fullMonthDailyAvg: dailyAvg,
      uniqueDays: datesInPeriod.length,
      catChartData, 
      mainChartData, 
      mainChartType,
      foodTotal: totals.food, 
      foodDailyAvg: adjustedFoodDailyAvg,  
      fullMonthFoodAvg: totals.food / periodDays,
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
      filterPeriod,
      dayTypeCounts, 
      dailyAllMap,
      sortedMonthsKeys,
      monthlyCatMap,
      dailyCatMap
    };
  }, [transactions, filterPeriod, categories, cashflowGroups, hideFixedExpenses, dashboardCategory, chartGroupBy, topXLimit, dayTypes, dayTypeConfig, isDarkMode]);

  return analytics;
}