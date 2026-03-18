// src/hooks/useAnalytics.js
import { useMemo } from 'react';
import { isDateInFilter, generateDatesForPeriod, parseDateStrToObj } from '../utils/dateHelpers';
import { getThaiMonth, hexToRgb } from '../utils/formatters';

export default function useAnalytics({
  transactions,
  categories,
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
    const filteredTx = transactions.filter(t => isDateInFilter(t.date, filterPeriod));
    let totalExpense = 0, totalIncome = 0, weekendTotal = 0, weekdayTotal = 0;
    let foodTotal = 0, fixedTotal = 0, variableTotal = 0, rentTotal = 0, itTotal = 0, investTotal = 0;
    let dayOfWeekMap = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
    let uniqueMonthsSet = new Set(), cashflowMap = {};
    let dayIncomeMap = {}, dayExpenseMap = {};

    filteredTx.forEach(item => {
      const amt = parseFloat(item.amount) || 0;
      const catObj = categories.find(c => c.name === item.category)
        || { type: 'expense', cashflowGroup: 'variable', isFixed: false, color: '#64748B' };
      const isInc = catObj.type === 'income';
      const cGroup = catObj.cashflowGroup || 'variable';
      const isFixed = catObj.isFixed || false;

      if (!item.date) return;
      const parts = item.date.split('/');
      if (parts.length !== 3) return;

      const ym = `${parts[2]}-${parts[1]}`;
      uniqueMonthsSet.add(ym);

      if (!cashflowMap[ym]) cashflowMap[ym] = {
        monthStr: ym, salary: 0, bonus: 0, rent: 0, food: 0,
        invest: 0, it: 0, subs: 0, variable: 0, totalExp: 0, income: 0,
      };

      if (isInc) {
        totalIncome += amt;
        cashflowMap[ym].income += amt;
        dayIncomeMap[item.date] = (dayIncomeMap[item.date] || 0) + amt;
        if (cGroup === 'salary') cashflowMap[ym].salary += amt;
        else cashflowMap[ym].bonus += amt;
      } else {
        totalExpense += amt;
        cashflowMap[ym].totalExp += amt;
        dayExpenseMap[item.date] = (dayExpenseMap[item.date] || 0) + amt;
        const dayOfWeek = parseDateStrToObj(item.date).getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) weekendTotal += amt;
        else weekdayTotal += amt;
        dayOfWeekMap[dayOfWeek] += amt;

        if (cGroup === 'rent')        { rentTotal += amt;   cashflowMap[ym].rent += amt; }
        else if (cGroup === 'food')   { foodTotal += amt;   cashflowMap[ym].food += amt; }
        else if (cGroup === 'it')     { itTotal += amt;     cashflowMap[ym].it += amt; }
        else if (cGroup === 'invest') { investTotal += amt; cashflowMap[ym].invest += amt; }
        else if (cGroup === 'subs')   { cashflowMap[ym].subs += amt; }
        else                          { cashflowMap[ym].variable += amt; }

        if (isFixed) fixedTotal += amt; else variableTotal += amt;
      }
    });

    const netCashflow = totalIncome - totalExpense;
    const numMonths = uniqueMonthsSet.size || 1;
    const savingsRate = totalIncome > 0 ? ((netCashflow / totalIncome) * 100).toFixed(1) : 0;

    const chartTx = filteredTx.filter(t => {
      const catObj = categories.find(c => c.name === t.category) || { type: 'expense', isFixed: false };
      if (catObj.type === 'income') return false;
      if (hideFixedExpenses && catObj.isFixed) return false;
      return true;
    });

    let catMap = {}, dayMap = {}, monthGroupMap = {};
    
    // 1. วงแหวน (CatMap) เอาข้อมูลทั้งหมด (chartTx)
    chartTx.forEach(item => {
      if (!item.date) return;
      const amt = parseFloat(item.amount) || 0;
      catMap[item.category] = (catMap[item.category] || 0) + amt;
    });

    // 2. กราฟเทรนด์และ Top7 (TrendTx) จะถูกกรองตามหมวดหมู่ที่เลือก
    const trendTx = dashboardCategory === 'ALL' 
        ? chartTx 
        : chartTx.filter(t => t.category === dashboardCategory);

    trendTx.forEach(item => {
      if (!item.date) return;
      const amt = parseFloat(item.amount) || 0;
      dayMap[item.date] = (dayMap[item.date] || 0) + amt;
      const parts = item.date.split('/');
      if (parts.length === 3)
        monthGroupMap[`${parts[2]}-${parts[1]}`] = (monthGroupMap[`${parts[2]}-${parts[1]}`] || 0) + amt;
    });

    const chartTotal = chartTx.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const sortedCats = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(c => ({
        name: c[0], amount: c[1],
        percentage: chartTotal > 0 ? ((c[1] / chartTotal) * 100).toFixed(1) : 0,
        avgPerMonth: c[1] / numMonths,
      }));

    const uniqueDays = Object.keys(dayMap).length || 1;
    const datesInPeriodForAvg = generateDatesForPeriod(filterPeriod, transactions);
    const periodDays = datesInPeriodForAvg.length || uniqueDays;
    const dailyAvg = totalExpense / periodDays;

    const foodDailyAvg = foodTotal / periodDays;
    const foodPercentage = totalExpense > 0 ? ((foodTotal / totalExpense) * 100).toFixed(1) : 0;
    const rentPercentage = totalIncome > 0 ? ((rentTotal / totalIncome) * 100).toFixed(1) : 0;
    const fixedPercentage = totalExpense > 0 ? ((fixedTotal / totalExpense) * 100).toFixed(1) : 0;
    const variablePercentage = totalExpense > 0 ? ((variableTotal / totalExpense) * 100).toFixed(1) : 0;

    const catChartData = {
      labels: sortedCats.map(c => c.name),
      datasets: [{
        data: sortedCats.map(c => c.amount),
        backgroundColor: sortedCats.map(c => {
          const catDef = categories.find(cat => cat.name === c.name);
          return catDef?.color || '#64748B';
        }),
        borderWidth: 2,
        borderColor: isDarkMode ? '#1e293b' : '#ffffff',
      }],
    };

    // --- Main Chart ---
    let mainChartData = null, mainChartType = 'bar';
    const isSingleMonthView = !!filterPeriod.match(/^\d{4}-\d{2}$/);
    const sortedCashflow = Object.values(cashflowMap)
      .sort((a, b) => a.monthStr.localeCompare(b.monthStr));
    const sparklineIncome = [], sparklineExpense = [], sparklineNet = [];

    // ดึงลิสต์วันที่ทั้งหมดในช่วงที่เลือกมาเตรียมไว้
    const datesInPeriod = generateDatesForPeriod(filterPeriod, transactions);

    if (!isSingleMonthView) {
      const sortedMonths = Object.keys(cashflowMap).sort();
      sortedMonths.forEach(m => {
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

    const showMonthly = !isSingleMonthView && chartGroupBy === 'monthly';

    if (showMonthly) {
      const sortedMonths = Object.keys(cashflowMap).sort();
      if (!hideFixedExpenses && dashboardCategory === 'ALL') {
        mainChartType = 'combo';
        mainChartData = {
          labels: sortedMonths.map(m => getThaiMonth(m)),
          datasets: [
            { type: 'line', label: 'Cashflow', data: sortedMonths.map(m => cashflowMap[m].income - cashflowMap[m].totalExp), borderColor: '#00509E', backgroundColor: '#00509E', borderWidth: 3, tension: 0.3, pointRadius: 4, pointBackgroundColor: '#ffffff', pointBorderWidth: 2 },
            { type: 'bar', label: 'รายรับ', data: sortedMonths.map(m => cashflowMap[m].income), backgroundColor: '#10B981', borderRadius: 4 },
            { type: 'bar', label: 'รายจ่ายรวม', data: sortedMonths.map(m => cashflowMap[m].totalExp), backgroundColor: '#EF4444', borderRadius: 4 },
          ],
        };
      } else {
        mainChartType = 'line';
        const catColor = dashboardCategory === 'ALL' ? '#D81A21' : (categories.find(c=>c.name===dashboardCategory)?.color || '#D81A21');
        const bgColor = dashboardCategory === 'ALL' ? 'rgba(216,26,33,0.1)' : `rgba(${hexToRgb(catColor)}, 0.1)`;
        mainChartData = {
          labels: sortedMonths.map(m => getThaiMonth(m)),
          datasets: [{ 
              label: dashboardCategory === 'ALL' ? (hideFixedExpenses ? 'รายจ่ายไลฟ์สไตล์ (บาท)' : 'รายจ่ายรวม (บาท)') : `รายจ่ายหมวด ${dashboardCategory} (บาท)`, 
              data: sortedMonths.map(m => monthGroupMap[m] || 0), 
              borderColor: catColor,
              backgroundColor: bgColor,
              borderWidth: 2, fill: true, tension: 0.3, pointRadius: 4,
              pointBackgroundColor: catColor,
          }],
        };
      }
    } else {
      mainChartType = 'line';
      const dailyData = datesInPeriod.map(d => dayMap[d] || 0);

      const catColor = dashboardCategory === 'ALL' ? (hideFixedExpenses ? '#D81A21' : '#EF4444') : (categories.find(c=>c.name===dashboardCategory)?.color || '#EF4444');
      const bgColor = dashboardCategory === 'ALL' ? (hideFixedExpenses ? 'rgba(216,26,33,0.1)' : 'rgba(239,68,68,0.1)') : `rgba(${hexToRgb(catColor)}, 0.1)`;

      const xLabels = isSingleMonthView 
          ? datesInPeriod.map(d => `วันที่ ${d.split('/')[0]}`)
          : datesInPeriod.map(d => `${d.split('/')[0]}/${d.split('/')[1]}`);

      mainChartData = {
        labels: xLabels,
        datasets: [{
          label: dashboardCategory === 'ALL' ? (hideFixedExpenses ? 'รายจ่ายไลฟ์สไตล์ (บาท)' : 'ยอดใช้จ่ายรายวัน (บาท)') : `ยอดใช้จ่ายหมวด ${dashboardCategory} (บาท)`,
          data: dailyData,
          borderColor: catColor,
          backgroundColor: bgColor,
          borderWidth: 2, fill: true, tension: 0.3, 
          pointRadius: isSingleMonthView ? 3 : 0, 
          pointHitRadius: 10,
          pointBackgroundColor: catColor,
        }],
      };
    }

    // --- Day Type Counts ---
    const dayTypeCounts = {};
    dayTypeConfig.forEach(dt => { dayTypeCounts[dt.id] = 0; });
    datesInPeriod.forEach(dateStr => {
      const [d, m, currY] = dateStr.split('/');
      const dayOfWeek = new Date(currY, parseInt(m) - 1, d).getDay();
      const defaultType = (dayOfWeek === 0 || dayOfWeek === 6)
        ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id)
        : dayTypeConfig[0]?.id;
      const currentType = dayTypes[dateStr] || defaultType;
      if (currentType && dayTypeCounts[currentType] !== undefined)
        dayTypeCounts[currentType]++;
      else if (currentType)
        dayTypeCounts[currentType] = 1;
    });

    return {
      totalExpense, totalIncome, netCashflow, savingsRate, chartTotal, numMonths,
      sortedCats,
      topTransactions: [...trendTx].sort((a, b) => b.amount - a.amount).slice(0, topXLimit),
      dailyAvg, uniqueDays,
      catChartData, mainChartData, mainChartType,
      foodTotal, foodDailyAvg, foodPercentage,
      rentTotal, rentPercentage,
      fixedTotal, variableTotal, fixedPercentage, variablePercentage,
      emergencyFundTarget: (totalExpense / numMonths) * 6,
      sortedCashflow,
      sparklineIncome, sparklineExpense, sparklineNet,
      dayTypeCounts, datesInPeriod,
      weekendTotal, weekdayTotal, dayOfWeekMap,
    };
}, [transactions, filterPeriod, categories, hideFixedExpenses, dashboardCategory, chartGroupBy, topXLimit, dayTypes, dayTypeConfig, isDarkMode]);

  return analytics;
}