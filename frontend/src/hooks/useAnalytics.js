// src/hooks/useAnalytics.js
import { useMemo } from 'react';
import { isDateInFilter, generateDatesForPeriod, parseDateStrToObj } from '../utils/dateHelpers';
import { getThaiMonth, hexToRgb, formatMoney } from '../utils/formatters';

export default function useAnalytics({
  transactions,
  categories,
  filterPeriod,
  hideFixedExpenses,
  dashboardCategory = 'ALL', // จะถูกจัดการให้เป็น Array ด้านใน
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

    let catMap = {};
    let dailyAllMap = {}, monthlyAllMap = {};
    let dailyCatMap = {}, monthlyCatMap = {};
    
    // เตรียมข้อมูล Array ของหมวดหมู่ที่ถูกเลือกมาวาดกราฟ
    const activeCats = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];

    chartTx.forEach(item => {
      if (!item.date) return;
      const amt = parseFloat(item.amount) || 0;
      const parts = item.date.split('/');
      const ym = parts.length === 3 ? `${parts[2]}-${parts[1]}` : null;

      // สำหรับวงแหวน (CatMap)
      catMap[item.category] = (catMap[item.category] || 0) + amt;

      // ข้อมูลผลรวมรายวัน/เดือน สำหรับกราฟ (เส้น ALL)
      dailyAllMap[item.date] = (dailyAllMap[item.date] || 0) + amt;
      if (ym) monthlyAllMap[ym] = (monthlyAllMap[ym] || 0) + amt;

      // ข้อมูลแยกรายหมวดหมู่ (สำหรับเส้น Multi-line และ Stacked Bar)
      if (!dailyCatMap[item.category]) dailyCatMap[item.category] = {};
      dailyCatMap[item.category][item.date] = (dailyCatMap[item.category][item.date] || 0) + amt;

      if (ym) {
        if (!monthlyCatMap[item.category]) monthlyCatMap[item.category] = {};
        monthlyCatMap[item.category][ym] = (monthlyCatMap[item.category][ym] || 0) + amt;
      }
    });

    const chartTotal = chartTx.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const sortedCats = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(c => ({
        name: c[0], amount: c[1],
        percentage: chartTotal > 0 ? ((c[1] / chartTotal) * 100).toFixed(1) : 0,
        avgPerMonth: c[1] / numMonths,
      }));

    const datesInPeriodForAvg = generateDatesForPeriod(filterPeriod, transactions);
    const periodDays = datesInPeriodForAvg.length || 1;
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
    let mainChartData = null, mainChartType = 'line';
    const isSingleMonthView = !!filterPeriod.match(/^\d{4}-\d{2}$/);
    const sortedCashflow = Object.values(cashflowMap).sort((a, b) => a.monthStr.localeCompare(b.monthStr));
    const sparklineIncome = [], sparklineExpense = [], sparklineNet = [];
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
    const sortedMonthsKeys = Object.keys(cashflowMap).sort();
    
    // แกน X สำหรับกราฟ
    const xLabels = showMonthly 
      ? sortedMonthsKeys.map(m => getThaiMonth(m))
      : isSingleMonthView 
        ? datesInPeriod.map(d => `วันที่ ${d.split('/')[0]}`)
        : datesInPeriod.map(d => `${d.split('/')[0]}/${d.split('/')[1]}`);

    const isOnlyAll = activeCats.length === 1 && activeCats[0] === 'ALL';

    if (showMonthly && isOnlyAll && !hideFixedExpenses) {
      mainChartType = 'combo';
      mainChartData = {
        labels: xLabels,
        datasets: [
          { type: 'line', label: 'Cashflow', data: sortedMonthsKeys.map(m => cashflowMap[m].income - cashflowMap[m].totalExp), borderColor: '#00509E', backgroundColor: '#00509E', borderWidth: 4, tension: 0.3, pointRadius: 5, pointBackgroundColor: '#ffffff', pointBorderWidth: 2 },
          { type: 'bar', label: 'รายรับ', data: sortedMonthsKeys.map(m => cashflowMap[m].income), backgroundColor: '#10B981', borderColor: '#10B981', borderRadius: 4 },
          { type: 'bar', label: 'รายจ่ายรวม', data: sortedMonthsKeys.map(m => cashflowMap[m].totalExp), backgroundColor: '#EF4444', borderColor: '#EF4444', borderRadius: 4 },
        ],
      };
    } else if (!showMonthly && isOnlyAll) {
      // มุมมองรายวัน (Bar + MTD Average + เส้นค่าเฉลี่ยรวม)
      mainChartType = 'combo';
      
      // คำนวณ MTD (Month-to-Date) Average
      let runningSum = 0;
      const mtdAvgData = datesInPeriod.map((d, index) => {
          runningSum += (dailyAllMap[d] || 0);
          return runningSum / (index + 1); // หารด้วยจำนวนวันที่ผ่านมาตั้งแต่ต้นเดือน
      });

      const currentTotal = datesInPeriod.reduce((sum, d) => sum + (dailyAllMap[d] || 0), 0);
      const currentDailyAvg = datesInPeriod.length > 0 ? currentTotal / datesInPeriod.length : 0;

      mainChartData = {
        labels: xLabels,
        datasets: [
          {
            type: 'line',
            label: 'เฉลี่ยสะสม (MTD)',
            data: mtdAvgData,
            borderColor: '#F59E0B',
            backgroundColor: 'transparent',
            borderWidth: 4,
            tension: 0.4,
            pointRadius: 0,
            pointHitRadius: 10,
            order: 1
          },
          {
            type: 'line',
            label: `เฉลี่ยทั้งเดือน ${formatMoney(currentDailyAvg)}/วัน`,
            data: datesInPeriod.map(() => currentDailyAvg),
            borderColor: isDarkMode ? '#94a3b8' : '#64748b',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHitRadius: 0,
            order: 2
          },
          {
            type: 'bar',
            label: hideFixedExpenses ? 'รายจ่ายไลฟ์สไตล์' : 'รายจ่ายจริง',
            data: datesInPeriod.map(d => dailyAllMap[d] || 0),
            backgroundColor: hideFixedExpenses ? (isDarkMode ? 'rgba(216,26,33,0.6)' : 'rgba(216,26,33,0.4)') : (isDarkMode ? 'rgba(239,68,68,0.6)' : 'rgba(239,68,68,0.4)'),
            borderColor: hideFixedExpenses ? '#D81A21' : '#EF4444',
            borderWidth: 2,
            borderRadius: 4,
            order: 3
          }
        ]
      };
    } else {
      mainChartType = 'line';
      const datasets = [];

      activeCats.forEach(catName => {
        if (catName === 'ALL') {
          datasets.push({
            label: hideFixedExpenses ? 'รายจ่ายไลฟ์สไตล์ (บาท)' : 'รายจ่ายรวมทั้งหมด (บาท)',
            data: showMonthly 
                ? sortedMonthsKeys.map(m => monthlyAllMap[m] || 0)
                : datesInPeriod.map(d => dailyAllMap[d] || 0),
            borderColor: hideFixedExpenses ? '#D81A21' : '#EF4444',
            backgroundColor: hideFixedExpenses ? 'rgba(216,26,33,0.1)' : 'rgba(239,68,68,0.1)',
            borderWidth: activeCats.length > 1 ? 3 : 2,
            borderDash: activeCats.length > 1 ? [5, 5] : [],
            fill: activeCats.length === 1,
            tension: 0.3, pointRadius: isSingleMonthView ? 3 : 0, pointHitRadius: 10,
          });
        } else {
          const catObj = categories.find(c => c.name === catName) || {};
          const catColor = catObj.color || '#64748B';
          const rgb = hexToRgb(catColor);
          datasets.push({
            label: catName, 
            data: showMonthly
                ? sortedMonthsKeys.map(m => monthlyCatMap[catName]?.[m] || 0)
                : datesInPeriod.map(d => dailyCatMap[catName]?.[d] || 0),
            borderColor: catColor,
            backgroundColor: rgb ? `rgba(${rgb}, 0.1)` : 'transparent',
            borderWidth: 2,
            fill: activeCats.length === 1,
            tension: 0.3, pointRadius: isSingleMonthView || showMonthly ? 3 : 0, pointHitRadius: 10,
          });
        }
      });
      mainChartData = { labels: xLabels, datasets };
    }

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
      topTransactions: [...chartTx].sort((a, b) => b.amount - a.amount).slice(0, topXLimit),
      dailyAvg, uniqueDays: datesInPeriod.length,
      catChartData, mainChartData, mainChartType,
      foodTotal, foodDailyAvg, foodPercentage,
      rentTotal, rentPercentage,
      fixedTotal, variableTotal, fixedPercentage, variablePercentage,
      emergencyFundTarget: (totalExpense / numMonths) * 6,
      sortedCashflow,
      sparklineIncome, sparklineExpense, sparklineNet,
      dayTypeCounts, datesInPeriod,
      weekendTotal, weekdayTotal, dayOfWeekMap,
      dailyCatMap, monthlyCatMap, dailyAllMap, monthlyAllMap, sortedMonthsKeys
    };
}, [transactions, filterPeriod, categories, hideFixedExpenses, dashboardCategory, chartGroupBy, topXLimit, dayTypes, dayTypeConfig, isDarkMode]);

  return analytics;
}