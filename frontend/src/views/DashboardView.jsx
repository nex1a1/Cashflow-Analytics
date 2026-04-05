// src/views/DashboardView.jsx
import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Bar, Doughnut, Line, Chart } from 'react-chartjs-2';
import {
  Wallet, Coins, PiggyBank, Flame, Home, Scale,
  CalendarClock, TrendingUp, PieChart, FileSpreadsheet,
  Filter, AlertCircle, Inbox, UtensilsCrossed, ChevronDown,
  BarChart, Layers // เพิ่มไอคอนใหม่
} from 'lucide-react';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import Sparkline from '../components/ui/Sparkline';
import { formatMoney, getThaiMonth } from '../utils/formatters';
import PropTypes from 'prop-types';
import {
  getComboChartOptions,
  getBarChartOptions,
  getLineChartOptions,
  getDoughnutChartOptions,
} from '../utils/chartOptions';

const D = ({ isDarkMode: d, light, dark }) => d ? dark : light;

export default function DashboardView({
  transactions, categories, filterPeriod, getFilterLabel,
  hideFixedExpenses, setHideFixedExpenses, dashboardCategory, setDashboardCategory,
  chartGroupBy, setChartGroupBy,
  analytics, dayTypeConfig, isDarkMode: dm, dayTypes, topXLimit, setTopXLimit,
}) {
  const [activityTooltip, setActivityTooltip] = useState(null);
  const [showCatMenu, setShowCatMenu] = useState(false); 
  
  // ⭐️ เพิ่ม State สำหรับเลือกประเภทกราฟ (line, bar, stacked)
  const [chartViewType, setChartViewType] = useState('bar'); 
  
  const [showTrendLines, setShowTrendLines] = useState(false);
  const [isSmoothLine, setIsSmoothLine] = useState(true);

  const datesInPeriod = analytics.datesInPeriod || [];
  const periodDays = Math.max(1, datesInPeriod.length);
  const avgIncome = analytics.totalIncome / periodDays;
  const avgExpense = analytics.totalExpense / periodDays;

  // ⭐️ กรอง Dataset และสร้างรูปแบบข้อมูลตามกราฟที่ผู้ใช้เลือก (เส้น/แท่ง/แจกแจง)
  const displayChartData = useMemo(() => {
    if (!analytics.mainChartData) return null;
    
    const isSingleMonthView = !!filterPeriod.match(/^\d{4}-\d{2}$/);
    const showMonthly = !isSingleMonthView && chartGroupBy === 'monthly';
    const xLabels = analytics.mainChartData.labels;

    // --- 1. กรณีผู้ใช้เลือกดูกราฟ "แจกแจง (Stacked)" ---
    if (chartViewType === 'stacked') {
      const datasets = [];
      const activeCats = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];
      
      // ถ้ากำลังดู "รวมทั้งหมด" ให้ดึงหมวดหมู่รายจ่ายทุกอันมาแยกชั้นให้เลย
      let catsToRender = activeCats;
      if (activeCats.includes('ALL')) {
        catsToRender = categories.filter(c => c.type === 'expense' && (!hideFixedExpenses || !c.isFixed)).map(c => c.name);
      }

      catsToRender.forEach(catName => {
        const catObj = categories.find(c => c.name === catName) || {};
        const catColor = catObj.color || '#64748B';
        
        datasets.push({
          type: 'bar',
          label: catName,
          data: showMonthly
            ? analytics.sortedMonthsKeys.map(m => analytics.monthlyCatMap[catName]?.[m] || 0)
            : analytics.datesInPeriod.map(d => analytics.dailyCatMap[catName]?.[d] || 0),
          backgroundColor: catColor, // ใช้สีทึบเพื่อความชัดเจนของชั้น
          borderColor: dm ? '#1e293b' : '#ffffff',
          borderWidth: 1,
          borderRadius: 0, // แท่งแบบซ้อนไม่ควรขอบมนด้านใน
        });
      });

      // ถ้าเปิดเส้นเทรนด์ไว้ ก็นำมาแสดงซ้อนบน Stacked Bar ด้วย
      if (showTrendLines && !showMonthly) {
        const mtdDataset = analytics.mainChartData.datasets.find(ds => ds.label && ds.label.includes('เฉลี่ยสะสม'));
        const avgDataset = analytics.mainChartData.datasets.find(ds => ds.label && ds.label.includes('เฉลี่ยทั้งเดือน'));
        if (mtdDataset) datasets.push({...mtdDataset, type: 'line', tension: isSmoothLine ? 0.4 : 0, borderWidth: 4});
        if (avgDataset) datasets.push({...avgDataset, type: 'line', borderWidth: 2});
      }

      return { labels: xLabels, datasets };
    }

    // --- 2. กรณีผู้ใช้เลือกกราฟ "เส้น" หรือ "แท่งธรรมดา" ---
    let filteredDatasets = [...analytics.mainChartData.datasets];

    // ซ่อนเส้นเทรนด์
    if (analytics.mainChartType === 'combo' && !showTrendLines) {
      filteredDatasets = filteredDatasets.filter(ds => ds.type !== 'line' || ds.label === 'Cashflow');
    }

    const processedDatasets = filteredDatasets.map(ds => {
      // ยกเว้นพวกเส้นเทรนด์ ให้คงสภาพเป็นเส้นเสมอ
      const isTrendLine = ds.label && (ds.label.includes('เฉลี่ยสะสม') || ds.label.includes('เฉลี่ยทั้งเดือน') || ds.label === 'Cashflow');
      if (isTrendLine) {
        return { 
          ...ds, 
          type: 'line', 
          tension: isSmoothLine ? 0.4 : 0,
          borderWidth: ds.label.includes('เฉลี่ยทั้งเดือน') ? 2 : 4, // ⭐️ เส้นหลัก (Cashflow, MTD) หนา 4
        };
      }

      const newType = chartViewType === 'line' ? 'line' : 'bar';
      
      // สีพื้นหลังและสีเส้น
      let bgColor = ds.backgroundColor;
      let borderColor = ds.borderColor || ds.backgroundColor; // ⭐️ ต้องมี borderColor ไม่งั้นเส้นจะบางมาก

      // ถ้าเป็นกราฟแท่ง (Bar) ให้ปรับสีให้ทึบ
      if (chartViewType === 'bar') {
        if (ds.borderColor && !ds.backgroundColor?.includes('0.6')) { 
             bgColor = ds.borderColor;
        } else if (ds.backgroundColor?.includes('rgba')) {
             bgColor = borderColor; 
        }
      }

      // ⭐️ ปรับความหนาของเส้น (Line width)
      let bWidth = 0;
      if (chartViewType === 'line') {
         bWidth = (Array.isArray(dashboardCategory) && dashboardCategory.length > 1 && !dashboardCategory.includes('ALL')) ? 3 : 4; 
      }

      return { 
        ...ds, 
        type: newType, 
        tension: isSmoothLine ? 0.4 : 0,
        backgroundColor: chartViewType === 'line' ? ds.backgroundColor : bgColor,
        borderColor: borderColor,
        borderWidth: bWidth,
        borderRadius: 4,
        pointRadius: chartViewType === 'line' ? 4 : 0, // ⭐️ เพิ่มขนาดจุดให้ชัดเจนขึ้นเมื่อเป็นกราฟเส้น
        pointBackgroundColor: borderColor,
        pointBorderWidth: 2,
        pointBorderColor: dm ? '#1e293b' : '#ffffff', // ขอบของจุดให้กลืนกับพื้นหลังแอป
      };
    });

    return {
      ...analytics.mainChartData,
      datasets: processedDatasets
    };
  }, [analytics, filterPeriod, chartGroupBy, chartViewType, showTrendLines, isSmoothLine, dashboardCategory, categories, hideFixedExpenses, dm]);

  const handleTooltipEnter = (e, displayDate, typeConfig) => {
    const r = e.currentTarget.getBoundingClientRect();
    setActivityTooltip({ x: r.left + r.width / 2, y: r.top, date: displayDate, label: typeConfig?.label || '', color: typeConfig?.color || '#cbd5e1' });
  };
  const handleTooltipLeave = () => setActivityTooltip(null);

  const card = `rounded-sm border shadow-sm transition-colors ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;
  const cardHd = `font-bold text-sm flex items-center gap-2 ${dm ? 'text-slate-200' : 'text-slate-800'}`;
  const divider = `border-b mb-3 pb-3 ${dm ? 'border-slate-700' : 'border-slate-100'}`;
  const muted = `text-xs font-bold ${dm ? 'text-slate-400' : 'text-slate-500'}`;

  if (transactions.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center text-slate-400 py-32 rounded-sm border-2 border-dashed ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <Inbox className="w-16 h-16 mb-4 text-slate-300 animate-bounce" style={{ animationDuration: '2s' }} />
        <p className="text-lg font-bold text-slate-500">ยังไม่มีข้อมูลสำหรับการวิเคราะห์</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-screen-2xl mx-auto w-full pb-10 flex flex-col gap-4">

      {/* ══════════════════════════════════════════════════════════
          ROW 1 — SUMMARY BAR
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_250px_minmax(0,1.1fr)] xl:grid-cols-[minmax(0,1.4fr)_260px_minmax(0,1.2fr)] gap-4 items-stretch">
        <div className={`${card} p-4 flex flex-col justify-between gap-4 min-w-0`}>
          <div className="grid grid-cols-3 gap-3 flex-1">
            <div className={`relative overflow-hidden flex flex-col justify-between p-3.5 rounded-xl border transition-all ${dm ? 'bg-gradient-to-br from-emerald-900/50 to-slate-900/80 border-emerald-800/50' : 'bg-gradient-to-br from-emerald-50/80 to-white border-emerald-200 shadow-sm'}`}>
              <Coins className={`absolute -right-2 -bottom-2 w-20 h-20 -rotate-12 pointer-events-none ${dm ? 'text-emerald-400 opacity-[0.04]' : 'text-emerald-600 opacity-10'}`} />
              <div className="relative z-10 flex flex-col gap-1">
                <span className={`text-[11px] font-bold whitespace-nowrap flex items-center gap-1.5 ${dm ? 'text-emerald-400' : 'text-emerald-700'}`}><div className={`p-1 rounded-md shrink-0 ${dm ? 'bg-emerald-500/20' : 'bg-emerald-100 text-emerald-700'}`}><Coins className="w-3.5 h-3.5" /></div>รายรับ</span>
                <span className={`text-xl lg:text-2xl font-black mt-1 leading-none truncate ${dm ? 'text-emerald-300' : 'text-emerald-800'}`}>{formatMoney(analytics.totalIncome)}</span>
                <span className={`text-[10px] font-semibold truncate ${dm ? 'text-emerald-500' : 'text-emerald-600/80'}`}>เฉลี่ย {formatMoney(avgIncome)}/วัน</span>
              </div>
              <div className="relative z-10 mt-3 flex justify-end"><div className="opacity-90"><Sparkline data={analytics.sparklineIncome} color="#10B981" width={80} height={24} /></div></div>
            </div>
            <div className={`relative overflow-hidden flex flex-col justify-between p-3.5 rounded-xl border transition-all ${dm ? 'bg-gradient-to-br from-red-900/50 to-slate-900/80 border-red-800/50' : 'bg-gradient-to-br from-red-50/80 to-white border-red-200 shadow-sm'}`}>
              <Wallet className={`absolute -right-2 -bottom-2 w-20 h-20 rotate-12 pointer-events-none ${dm ? 'text-red-400 opacity-[0.04]' : 'text-red-600 opacity-10'}`} />
              <div className="relative z-10 flex flex-col gap-1">
                <span className={`text-[11px] font-bold whitespace-nowrap flex items-center gap-1.5 ${dm ? 'text-red-400' : 'text-red-700'}`}><div className={`p-1 rounded-md shrink-0 ${dm ? 'bg-red-500/20' : 'bg-red-100 text-red-700'}`}><Wallet className="w-3.5 h-3.5" /></div>รายจ่าย</span>
                <span className={`text-xl lg:text-2xl font-black mt-1 leading-none truncate ${dm ? 'text-red-300' : 'text-red-800'}`}>{formatMoney(analytics.totalExpense)}</span>
                <span className={`text-[10px] font-semibold truncate ${dm ? 'text-red-500' : 'text-red-600/80'}`}>เฉลี่ย {formatMoney(avgExpense)}/วัน</span>
              </div>
              <div className="relative z-10 mt-3 flex justify-end"><div className="opacity-90"><Sparkline data={analytics.sparklineExpense} color="#EF4444" width={80} height={24} /></div></div>
            </div>
            <div className={`relative overflow-hidden flex flex-col justify-between p-3.5 rounded-xl border transition-all ${analytics.netCashflow >= 0 ? (dm ? 'bg-gradient-to-br from-blue-900/50 to-slate-900/80 border-blue-800/50' : 'bg-gradient-to-br from-blue-50/80 to-white border-blue-200 shadow-sm') : (dm ? 'bg-gradient-to-br from-orange-900/50 to-slate-900/80 border-orange-800/50' : 'bg-gradient-to-br from-orange-50/80 to-white border-orange-200 shadow-sm')}`}>
              <PiggyBank className={`absolute -right-2 -bottom-2 w-20 h-20 rotate-6 pointer-events-none ${analytics.netCashflow >= 0 ? (dm ? 'text-blue-400 opacity-[0.04]' : 'text-[#00509E] opacity-[0.08]') : (dm ? 'text-orange-400 opacity-[0.04]' : 'text-orange-600 opacity-[0.08]')}`} />
              <div className="relative z-10 flex flex-col gap-1">
                <span className={`text-[11px] font-bold whitespace-nowrap flex items-center gap-1.5 ${analytics.netCashflow >= 0 ? (dm ? 'text-blue-400' : 'text-blue-700') : (dm ? 'text-orange-400' : 'text-orange-700')}`}><div className={`p-1 rounded-md shrink-0 ${analytics.netCashflow >= 0 ? (dm ? 'bg-blue-500/20' : 'bg-blue-100 text-blue-700') : (dm ? 'bg-orange-500/20' : 'bg-orange-100 text-orange-700')}`}><PiggyBank className="w-3.5 h-3.5" /></div>คงเหลือ</span>
                <span className={`text-xl lg:text-2xl font-black mt-1 leading-none truncate ${analytics.netCashflow >= 0 ? (dm ? 'text-blue-300' : 'text-[#00509E]') : (dm ? 'text-orange-300' : 'text-orange-700')}`}>{formatMoney(analytics.netCashflow)}</span>
              </div>
              <div className="relative z-10 mt-3 flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className={`whitespace-nowrap ${dm ? 'text-slate-400' : 'text-slate-500'}`}>สัดส่วนการออม</span>
                  <span className={analytics.netCashflow >= 0 ? (dm ? 'text-blue-400' : 'text-blue-700') : (dm ? 'text-orange-400' : 'text-orange-700')}>{analytics.totalIncome > 0 ? `${analytics.savingsRate}%` : '0%'}</span>
                </div>
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${dm ? 'bg-slate-900/80' : 'bg-slate-200'}`}>
                  <div className={`h-full rounded-full transition-all duration-1000 ${analytics.netCashflow >= 0 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(100, Math.max(0, analytics.totalIncome > 0 ? analytics.savingsRate : 0))}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className={`rounded-sm px-3 py-2 ${dm ? 'bg-slate-900/60' : 'bg-slate-50'}`}>
            <div className="flex justify-between items-center mb-1.5 gap-2">
              <span className={`text-[10px] font-bold whitespace-nowrap flex items-center gap-1 ${dm ? 'text-slate-400' : 'text-slate-500'}`}><Scale className="w-3 h-3 text-purple-500" /> โครงสร้างรายจ่าย</span>
              <div className="flex gap-3 shrink-0">
                <span className={`text-[10px] font-bold whitespace-nowrap ${dm ? 'text-purple-400' : 'text-purple-600'}`}>คงที่ {analytics.fixedPercentage}%</span>
                <span className={`text-[10px] font-bold whitespace-nowrap ${dm ? 'text-pink-400' : 'text-pink-600'}`}>ผันแปร {analytics.variablePercentage}%</span>
              </div>
            </div>
            <div className={`w-full rounded-sm h-2 flex overflow-hidden ${dm ? 'bg-slate-700' : 'bg-slate-200'}`}>
              <div className="bg-purple-500 h-2 transition-all duration-500" style={{ width: `${analytics.fixedPercentage}%` }} />
              <div className="bg-pink-400 h-2 transition-all duration-500" style={{ width: `${analytics.variablePercentage}%` }} />
            </div>
          </div>
        </div>

        <div className={`${card} p-4 flex flex-col gap-3 min-w-0`}>
          <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>ตัวชี้วัดสำคัญ</p>
          <div className={`relative overflow-hidden flex flex-col justify-center gap-2 px-3.5 py-3 rounded-xl border transition-all flex-1 ${dm ? 'bg-gradient-to-br from-amber-900/40 to-slate-900/80 border-amber-800/50' : 'bg-gradient-to-br from-amber-50/80 to-white border-amber-200 shadow-sm'}`}>
             <Flame className={`absolute -right-2 -bottom-2 w-16 h-16 pointer-events-none ${dm ? 'text-amber-500 opacity-10' : 'text-amber-500 opacity-[0.06]'}`} />
             <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="flex items-center gap-2.5 min-w-0">
                   <div className={`p-1.5 rounded-lg shrink-0 ${dm ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'}`}><Flame className="w-4 h-4" /></div>
                   <span className={`text-[11px] font-bold whitespace-nowrap ${dm ? 'text-slate-300' : 'text-slate-600'}`}>เผาผลาญ/วัน</span>
                </div>
                <span className={`text-base font-black truncate shrink-0 ${dm ? 'text-amber-400' : 'text-amber-600'}`}>{formatMoney(analytics.dailyAvg)}</span>
             </div>
          </div>
          <div className={`relative overflow-hidden flex flex-col justify-center gap-2 px-3.5 py-3 rounded-xl border transition-all flex-1 ${dm ? 'bg-gradient-to-br from-orange-900/40 to-slate-900/80 border-orange-800/50' : 'bg-gradient-to-br from-orange-50/80 to-white border-orange-200 shadow-sm'}`}>
             <UtensilsCrossed className={`absolute -right-2 -bottom-2 w-16 h-16 pointer-events-none ${dm ? 'text-orange-500 opacity-10' : 'text-orange-500 opacity-[0.06]'}`} />
             <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="flex items-center gap-2.5 min-w-0">
                   <div className={`p-1.5 rounded-lg shrink-0 ${dm ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}><UtensilsCrossed className="w-4 h-4" /></div>
                   <div className="flex flex-col min-w-0">
                     <span className={`text-[11px] font-bold whitespace-nowrap ${dm ? 'text-slate-300' : 'text-slate-600'}`}>ค่ากิน/วัน</span>
                     <span className={`text-[9px] font-semibold whitespace-nowrap ${dm ? 'text-orange-400/80' : 'text-orange-500'}`}>สัดส่วน {analytics.foodPercentage}%</span>
                   </div>
                </div>
                <span className={`text-base font-black truncate shrink-0 ${dm ? 'text-orange-400' : 'text-orange-600'}`}>{formatMoney(analytics.foodDailyAvg)}</span>
             </div>
             <div className={`w-full h-1.5 rounded-full overflow-hidden mt-0.5 relative z-10 ${dm ? 'bg-slate-800' : 'bg-orange-100'}`}><div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: `${analytics.foodPercentage}%` }} /></div>
          </div>
          <div className={`relative overflow-hidden flex flex-col justify-center gap-2 px-3.5 py-3 rounded-xl border transition-all flex-1 ${dm ? 'bg-gradient-to-br from-blue-900/40 to-slate-900/80 border-blue-800/50' : 'bg-gradient-to-br from-blue-50/80 to-white border-blue-200 shadow-sm'}`}>
             <Home className={`absolute -right-2 -bottom-2 w-16 h-16 pointer-events-none ${dm ? 'text-blue-500 opacity-10' : 'text-blue-500 opacity-[0.06]'}`} />
             <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="flex items-center gap-2.5 min-w-0">
                   <div className={`p-1.5 rounded-lg shrink-0 ${dm ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}><Home className="w-4 h-4" /></div>
                   <div className="flex flex-col min-w-0">
                     <span className={`text-[11px] font-bold whitespace-nowrap ${dm ? 'text-slate-300' : 'text-slate-600'}`}>ค่าที่พัก</span>
                     <span className={`text-[9px] font-semibold whitespace-nowrap ${dm ? 'text-blue-400/80' : 'text-blue-500'}`}>สัดส่วน {analytics.rentPercentage}%</span>
                   </div>
                </div>
                <span className={`text-base font-black truncate shrink-0 ${dm ? 'text-blue-400' : 'text-blue-600'}`}>{formatMoney(analytics.rentTotal)}</span>
             </div>
             <div className={`w-full h-1.5 rounded-full overflow-hidden mt-0.5 relative z-10 ${dm ? 'bg-slate-800' : 'bg-blue-100'}`}><div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${analytics.rentPercentage}%` }} /></div>
          </div>
        </div>

        {(() => {
          const catCount = analytics.sortedCats.length;
          const CatList = ({ cols = 1, data = analytics.sortedCats }) => (
            <div className="grid gap-x-4 gap-y-1.5 w-full" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {data.map((cat, idx) => {
                const catDef = categories.find(c => c.name === cat.name);
                const pColor = catDef?.color || '#D81A21';
                return (
                  <div key={idx} className="flex flex-col min-w-0">
                    <div className="flex justify-between items-baseline gap-1 mb-0.5">
                      <span className={`text-[11px] font-bold truncate flex items-center gap-1 ${dm ? 'text-slate-300' : 'text-slate-700'}`} title={cat.name}><span className="shrink-0">{catDef?.icon}</span><span className="truncate">{cat.name}</span></span>
                      <div className="flex items-baseline gap-1 shrink-0"><span className="text-[10px] font-bold" style={{ color: pColor }}>{cat.percentage}%</span><span className={`text-[11px] font-black ${dm ? 'text-slate-100' : 'text-slate-900'}`}>{formatMoney(cat.amount)}</span></div>
                    </div>
                    <div className={`w-full rounded-sm h-[3px] overflow-hidden ${dm ? 'bg-slate-700' : 'bg-slate-100'}`}><div className="h-[3px] rounded-sm" style={{ width: `${cat.percentage}%`, backgroundColor: pColor, opacity: Math.max(0.55, 1 - idx * 0.04) }} /></div>
                  </div>
                );
              })}
            </div>
          );

          if (catCount <= 6) return (
            <div className={`${card} p-4 flex gap-4 items-center min-w-0`}>
              <div className="relative shrink-0" style={{ width: 120, height: 120 }}><Doughnut data={analytics.catChartData} options={{ ...getDoughnutChartOptions(dm), maintainAspectRatio: false }} /></div>
              <div className="flex-1 min-w-0"><CatList cols={1} /></div>
            </div>
          );

          if (catCount >= 7 && catCount <= 12) return (
            <div className={`${card} p-4 flex flex-col gap-3 min-w-0`}>
              <div className="flex gap-4 items-center">
                <div className="relative shrink-0" style={{ width: 110, height: 110 }}><Doughnut data={analytics.catChartData} options={{ ...getDoughnutChartOptions(dm), maintainAspectRatio: false }} /></div>
                <div className="flex-1 min-w-0 grid gap-x-3 gap-y-1.5" style={{ gridTemplateColumns: '1fr' }}><CatList cols={1} data={analytics.sortedCats.slice(0, 4)} /></div>
              </div>
              {analytics.sortedCats.length > 4 && <div className={`pt-2 border-t ${dm ? 'border-slate-700' : 'border-slate-100'}`}><CatList cols={2} data={analytics.sortedCats.slice(4)} /></div>}
            </div>
          );

          return (
            <div className={`${card} p-4 min-w-0`}>
              <div className={`flex items-center gap-2 mb-3 pb-2.5 border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}><PieChart className={`w-3.5 h-3.5 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} /><span className={`text-xs font-bold whitespace-nowrap ${dm ? 'text-slate-300' : 'text-slate-600'}`}>สัดส่วนรายจ่าย ({catCount} หมวด)</span></div>
              <CatList cols={2} />
            </div>
          );
        })()}
      </div>

      {/* ══════════════════════════════════════════════════════════
          ROW 2 — MAIN CHART (wide) + TOP X (narrow sidebar)
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4 items-stretch">

        {/* ── Main Chart ── */}
        <div className={`${card} p-5 flex flex-col min-h-0`}>
          <div className={`flex items-center justify-between gap-3 ${divider} flex-wrap relative z-20`}>
            <h3 className={cardHd}>
              <TrendingUp className={`w-4 h-4 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} />
              {analytics.mainChartType === 'combo' && analytics.mainChartData?.datasets?.some(ds => ds.label && ds.label.includes('เฉลี่ยสะสม')) && showTrendLines
                ? 'เทรนด์รายจ่ายรายวัน (MTD Average)'
                : analytics.mainChartType === 'combo' ? 'วิเคราะห์กระแสเงินสด' 
                : analytics.mainChartType === 'bar' ? 'เทรนด์เปรียบเทียบ' : 'รายจ่ายรายวัน'}
            </h3>
            
            <div className="flex items-center gap-2 flex-wrap">
              {!filterPeriod.match(/^\d{4}-\d{2}$/) && (
                <div className={`flex p-0.5 rounded-md border shadow-sm ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                  <button onClick={() => setChartGroupBy('monthly')} className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${chartGroupBy === 'monthly' ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>รายเดือน</button>
                  <button onClick={() => setChartGroupBy('daily')} className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${chartGroupBy === 'daily' ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>รายวัน</button>
                </div>
              )}

              {/* ⭐️ เมนูใหม่: รูปแบบกราฟ (เส้น / แท่ง / แจกแจง) ⭐️ */}
              <div className={`flex p-0.5 rounded-md border shadow-sm ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                <button 
                  onClick={() => setChartViewType('line')} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${chartViewType === 'line' ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                >
                  <TrendingUp className="w-3.5 h-3.5" /> เส้น
                </button>
                <button 
                  onClick={() => setChartViewType('bar')} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${chartViewType === 'bar' ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                >
                  <BarChart className="w-3.5 h-3.5" /> แท่ง
                </button>
                <button 
                  onClick={() => setChartViewType('stacked')} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${chartViewType === 'stacked' ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                >
                  <Layers className="w-3.5 h-3.5" /> แจกแจง
                </button>
              </div>

              {/* --- แสดงปุ่มโค้ง/ตรง เฉพาะตอนเลือกกราฟเส้น --- */}
              {chartViewType === 'line' && (
                <div className={`flex p-0.5 rounded-md border shadow-sm ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                  <button 
                    onClick={() => setIsSmoothLine(false)} 
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${!isSmoothLine ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-opacity ${!isSmoothLine ? 'opacity-100' : 'opacity-60'}`}>
                      <polyline points="3 17 9 10 14 15 21 6" />
                    </svg>
                    เส้นตรง
                  </button>
                  <button 
                    onClick={() => setIsSmoothLine(true)} 
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${isSmoothLine ? (dm ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#00509E] shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-opacity ${isSmoothLine ? 'opacity-100' : 'opacity-60'}`}>
                      <path d="M3 17c3-6 4-7 6-7s4 5 6 5 4-8 6-9" />
                    </svg>
                    เส้นโค้ง
                  </button>
                </div>
              )}

              {/* --- ปุ่มตัวกรองแบบใหม่ --- */}
              <div className="relative">
                <button
                  onClick={() => setShowCatMenu(!showCatMenu)}
                  className={`px-3 py-1.5 border rounded-md shadow-sm text-[11px] font-bold outline-none flex items-center gap-1.5 transition-all ${showCatMenu ? (dm ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#00509E] border-[#00509E] text-white') : (dm ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50')}`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  ตัวกรองแสดงผล {Array.isArray(dashboardCategory) && !dashboardCategory.includes('ALL') ? <span className={`px-1.5 rounded-full text-[9px] ${dm ? 'bg-slate-900 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>{dashboardCategory.length}</span> : ''}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCatMenu ? 'rotate-180' : ''}`} />
                </button>

                {showCatMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowCatMenu(false)} />
                    <div className={`absolute right-0 top-full mt-2 w-[320px] sm:w-[340px] max-w-[90vw] rounded-xl shadow-2xl border z-40 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200 ${dm ? 'bg-slate-800 border-slate-700 shadow-slate-900/50' : 'bg-white border-slate-200 shadow-slate-300/50'}`}>
                      
                      <div className={`p-4 border-b flex flex-col gap-4 rounded-t-xl ${dm ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        
                        {/* 1. Toggle: แสดงเส้นเทรนด์ MTD */}
                        <label className="flex items-center justify-between cursor-pointer group">
                          <div className="flex flex-col pr-3">
                            <span className={`text-xs font-bold transition-colors ${dm ? 'text-slate-200 group-hover:text-amber-400' : 'text-slate-800 group-hover:text-amber-600'}`}>แสดงเส้นเทรนด์ (MTD Average)</span>
                            <span className={`text-[10px] mt-0.5 leading-tight ${dm ? 'text-slate-400' : 'text-slate-500'}`}>ดูแนวโน้มค่าเฉลี่ยสะสมว่าประหยัดขึ้น หรือใช้เยอะขึ้นเมื่อเทียบกับต้นเดือน</span>
                          </div>
                          <div className="relative flex items-center shrink-0">
                            <input type="checkbox" className="sr-only" checked={showTrendLines} onChange={() => setShowTrendLines(!showTrendLines)} />
                            <div className={`block w-9 h-5 rounded-full transition-colors duration-300 ${showTrendLines ? 'bg-amber-500' : (dm ? 'bg-slate-600' : 'bg-slate-300')}`} />
                            <div className={`absolute left-[2px] top-[2px] bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${showTrendLines ? 'translate-x-4' : ''}`} />
                          </div>
                        </label>

                        {/* 2. Toggle: ซ่อนรายจ่ายคงที่ */}
                        <label className="flex items-center justify-between cursor-pointer group">
                          <div className="flex flex-col pr-3">
                            <span className={`text-xs font-bold transition-colors ${dm ? 'text-slate-200 group-hover:text-blue-400' : 'text-slate-800 group-hover:text-[#00509E]'}`}>ซ่อนรายจ่ายคงที่ (Fixed Expenses)</span>
                            <span className={`text-[10px] mt-0.5 leading-tight ${dm ? 'text-slate-400' : 'text-slate-500'}`}>ตัดภาระคงที่ออกจากกราฟเส้นและวงแหวน</span>
                          </div>
                          <div className="relative flex items-center shrink-0">
                            <input type="checkbox" className="sr-only" checked={hideFixedExpenses} onChange={() => setHideFixedExpenses(!hideFixedExpenses)} />
                            <div className={`block w-9 h-5 rounded-full transition-colors duration-300 ${hideFixedExpenses ? (dm ? 'bg-blue-500' : 'bg-[#00509E]') : (dm ? 'bg-slate-600' : 'bg-slate-300')}`} />
                            <div className={`absolute left-[2px] top-[2px] bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${hideFixedExpenses ? 'translate-x-4' : ''}`} />
                          </div>
                        </label>

                      </div>
                      
                      <div className={`p-4 flex flex-col gap-3 rounded-b-xl ${dm ? 'bg-slate-800' : 'bg-white'}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${dm ? 'text-slate-500' : 'text-slate-400'}`}>เปรียบเทียบหมวดหมู่ (Multi-line)</span>
                        
                        {(() => {
                          const activeCats = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];
                          const toggleCategory = (catName) => {
                            if (catName === 'ALL') { setDashboardCategory(['ALL']); } 
                            else {
                              let newCats = activeCats.filter(c => c !== 'ALL');
                              if (newCats.includes(catName)) newCats = newCats.filter(c => c !== catName);
                              else newCats.push(catName);
                              if (newCats.length === 0) newCats = ['ALL'];
                              setDashboardCategory(newCats);
                            }
                          };

                          const selectAllVariable = () => {
                            const variableCats = categories.filter(c => c.type === 'expense' && !c.isFixed).map(c => c.name);
                            setDashboardCategory(variableCats.length > 0 ? variableCats : ['ALL']);
                          };

                          return (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <button 
                                  onClick={() => setDashboardCategory(['ALL'])}
                                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-bold transition-all border ${activeCats.includes('ALL') && activeCats.length === 1 ? (dm ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-blue-50 border-blue-200 text-[#00509E]') : (dm ? 'bg-slate-900/50 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}`}
                                >
                                  📊 เส้นรวมทั้งหมด
                                </button>
                                <button 
                                  onClick={selectAllVariable}
                                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-bold transition-all border ${dm ? 'bg-amber-900/20 border-amber-700/50 text-amber-400 hover:bg-amber-900/40' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'}`}
                                >
                                  🔄 เทียบหมวดผันแปร
                                </button>
                              </div>

                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {categories.filter(c => c.type === 'expense').map(c => {
                                  const isActive = activeCats.includes(c.name);
                                  return (
                                    <button 
                                      key={c.id}
                                      onClick={() => toggleCategory(c.name)}
                                      className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all border`}
                                      style={{ 
                                        backgroundColor: isActive ? c.color : (dm ? '#0f172a' : '#ffffff'),
                                        borderColor: isActive ? c.color : (dm ? '#334155' : '#e2e8f0'),
                                        color: isActive ? '#ffffff' : (dm ? '#cbd5e1' : '#475569')
                                      }}
                                    >
                                      <span className="opacity-90">{c.icon}</span> {c.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          );
                        })()}
                      </div>

                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="relative w-full flex-1 min-h-[350px]">
            <div className="absolute inset-0">
              {(() => {
                const hasMultipleLines = displayChartData?.datasets?.length > 1;
                
                // ⭐️ ตั้งค่า Option ของ Chart ตามประเภทที่เลือก
                let optionsToUse;
                if (chartViewType === 'stacked') {
                   // โหมดแจกแจง
                   optionsToUse = JSON.parse(JSON.stringify(getBarChartOptions(dm, true)));
                   if (optionsToUse.scales?.x) optionsToUse.scales.x.stacked = true;
                   if (optionsToUse.scales?.y) optionsToUse.scales.y.stacked = true;
                   if (optionsToUse.plugins?.tooltip) {
                      optionsToUse.plugins.tooltip.mode = 'index'; // ชี้แท่งเดียวโชว์ข้อมูลทุกชั้น
                      optionsToUse.plugins.tooltip.intersect = false;
                   }
                } else if (analytics.mainChartType === 'combo' && chartViewType === 'bar') {
                   // โหมดเดิม ถ้าดูกราฟรายเดือนรวมแบบแท่ง
                   optionsToUse = JSON.parse(JSON.stringify(getComboChartOptions(dm)));
                } else if (chartViewType === 'line') {
                   // โหมดเส้น
                   optionsToUse = JSON.parse(JSON.stringify(getLineChartOptions(dm, hasMultipleLines)));
                } else {
                   // โหมดแท่งธรรมดา
                   optionsToUse = JSON.parse(JSON.stringify(getBarChartOptions(dm, hasMultipleLines)));
                }

                // เลือก Component Type ให้ตรงกัน
                const renderChartType = (analytics.mainChartType === 'combo' && chartViewType === 'bar') ? 'bar' 
                                      : chartViewType === 'line' ? 'line' : 'bar';
                
                return <Chart type={renderChartType} data={displayChartData} options={{...optionsToUse, maintainAspectRatio: false}} />;
              })()}
            </div>
          </div>
        </div>

        {/* ── Top X Transactions ── */}
        <div className={`${card} p-4`}>
          <div className={`flex items-center justify-between ${divider}`}>
            <h3 className={cardHd}>
              <AlertCircle className="w-4 h-4 text-[#D81A21]" />
              TOP&nbsp;
              <select
                value={topXLimit} onChange={(e) => setTopXLimit(Number(e.target.value))}
                className={`px-1 py-0.5 text-sm font-black rounded-sm border outline-none cursor-pointer appearance-none ${dm ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-100 border-slate-300 text-[#D81A21]'}`}
              >
                {[5, 7, 10, 15].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              &nbsp;รายจ่าย
            </h3>
          </div>
          <div className="flex flex-col gap-2">
            {analytics.topTransactions.map((tx, idx) => {
              const catDef = categories.find(c => c.name === tx.category);
              return (
                <div key={tx.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-sm border transition-colors hover:shadow-sm ${dm ? 'bg-slate-900/40 hover:bg-slate-700 border-slate-700' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'}`}>
                  <span className={`text-[11px] font-black w-4 text-center shrink-0 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{idx + 1}</span>
                  <div className="flex-1 overflow-hidden">
                    <p className={`text-xs font-bold truncate leading-tight mb-0.5 ${dm ? 'text-slate-200' : 'text-slate-800'}`} title={tx.description}>{tx.description}</p>
                    <span className="text-[9px] font-bold px-1.5 py-[1px] rounded-sm border text-white inline-block max-w-full truncate" style={{ backgroundColor: catDef?.color || '#64748B', borderColor: catDef?.color || '#64748B' }}>
                      {catDef?.icon} {tx.category}
                    </span>
                  </div>
                  <span className="text-xs font-black text-[#D81A21] whitespace-nowrap shrink-0">{formatMoney(tx.amount)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          ROW 3 — ACTIVITY TIMELINE
      ══════════════════════════════════════════════════════════ */}
      {Object.keys(analytics.dayTypeCounts).length > 0 && (
        <div className={`${card} p-4`}>
          <div className={`flex items-center justify-between ${divider} gap-4 flex-wrap`}>
            <h3 className={cardHd}>
              <CalendarClock className={`w-4 h-4 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} />
              ไทม์ไลน์กิจกรรม
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
              {/* แสดงจำนวนวันของแต่ละประเภท */}
              {dayTypeConfig.map(dt => {
                const count = analytics.dayTypeCounts[dt.id] || 0;
                return (
                  <div key={dt.id} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: dt.color }} />
                    <span className={muted}>
                      {dt.label} <span className="opacity-75">({count})</span>
                    </span>
                  </div>
                );
              })}
              <div className={`ml-1 pl-3 border-l ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                <span className={muted}>รวม {datesInPeriod.length} วัน</span>
              </div>
            </div>
          </div>
          <div className={`border rounded-sm ${dm ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            {datesInPeriod.length === 0
              ? <div className="text-center text-slate-400 py-6 text-sm">ไม่มีข้อมูล</div>
              : (
                <div className="overflow-x-auto pb-3 pt-3 px-3 flex justify-center" style={{ scrollbarWidth: 'thin' }}>
                  <div className="flex w-max gap-x-[3px] mx-auto">
                    <div className="flex flex-col gap-[3px] shrink-0 sticky left-0 z-20 pr-2 border-r"
                      style={{ backgroundColor: dm ? '#1e293b' : '#f8fafc', borderColor: dm ? '#334155' : '#e2e8f0' }}>
                      <div className="h-4" />
                      {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map((day, i) => (
                        <div key={day} className={`h-3.5 flex items-center justify-end text-[9px] font-bold ${i === 0 || i === 6 ? (dm ? 'text-red-400' : 'text-red-500') : (dm ? 'text-slate-500' : 'text-slate-400')}`}>{day}</div>
                      ))}
                    </div>
                    {(() => {
                      const weeks = [];
                      let cur = Array(7).fill(null);
                      let monthLabel = null;
                      const mo = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                      datesInPeriod.forEach((ds, i) => {
                        const [d, m, y] = ds.split('/');
                        const dow = new Date(y, +m - 1, d).getDay();
                        if (d === '01' || i === 0) monthLabel = `${mo[+m - 1]} ${y.slice(2)}`;
                        cur[dow] = ds;
                        if (dow === 6 || i === datesInPeriod.length - 1) {
                          weeks.push({ days: [...cur], monthLabel });
                          cur = Array(7).fill(null);
                          monthLabel = null;
                        }
                      });
                      return weeks.map((wk, wi) => (
                        <div key={wi} className="flex flex-col gap-[3px] shrink-0">
                          <div className="h-4 relative flex items-end pb-1">
                            {wk.monthLabel && (
                              <div className="absolute left-0 bottom-0.5 flex items-end">
                                <div className={`w-[2px] h-3 mr-0.5 rounded-sm ${dm ? 'bg-slate-600' : 'bg-slate-300'}`} />
                                <span className={`text-[9px] font-bold leading-none ${dm ? 'text-slate-300' : 'text-slate-500'}`}>{wk.monthLabel}</span>
                              </div>
                            )}
                          </div>
                          {wk.days.map((ds, di) => {
                            if (!ds) return <div key={`e-${wi}-${di}`} className="w-3.5 h-3.5 bg-transparent" />;
                            const [d, m, y] = ds.split('/');
                            const dow = new Date(y, +m - 1, d).getDay();
                            const def = (dow === 0 || dow === 6) ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
                            const tc = dayTypeConfig.find(t => t.id === (dayTypes[ds] || def)) || dayTypeConfig[0];
                            const mo2 = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                            const disp = `${['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][dow]} ${+d} ${mo2[+m - 1]} ${y.slice(2)}`;
                            const today = +d === new Date().getDate() && +m - 1 === new Date().getMonth() && +y === new Date().getFullYear();
                            return (
                              <div key={ds} className="relative"
                                onMouseEnter={(e) => handleTooltipEnter(e, disp, tc)}
                                onMouseLeave={handleTooltipLeave}>
                                <div
                                  className={`w-3.5 h-3.5 rounded-sm cursor-pointer transition-all duration-150 ${today ? 'ring-2 ring-slate-800 dark:ring-slate-300 scale-125 z-10' : 'hover:scale-125 hover:z-10 opacity-90 hover:opacity-100'}`}
                                  style={{ backgroundColor: tc?.color || '#cbd5e1' }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ROW 4 — CASHFLOW TABLE
      ══════════════════════════════════════════════════════════ */}
      {analytics.numMonths > 0 && (
        <div className={`${card} overflow-hidden`}>
          <div className={`px-5 py-3 border-b flex items-center gap-2 ${dm ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <FileSpreadsheet className={`w-4 h-4 ${dm ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <h3 className={`font-bold text-sm ${dm ? 'text-slate-200' : 'text-slate-800'}`}>ตารางสรุปกระแสเงินสด</h3>
          </div>
          <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
            <table className="w-full text-right text-sm whitespace-nowrap">
              <thead className={`border-b-2 ${dm ? 'border-slate-600 bg-slate-800/95' : 'border-slate-300 bg-slate-100/95'}`}>
                <tr>
                  {[
                    { label: 'ช่วงเวลา', cls: `text-center sticky left-0 z-10 ${dm ? 'text-slate-200 bg-slate-900' : 'text-slate-800 bg-slate-200'}` },
                    { label: 'เงินเดือน', cls: dm ? 'text-emerald-400' : 'text-emerald-700' },
                    { label: 'โบนัส', cls: dm ? 'text-emerald-400' : 'text-emerald-700' },
                    { label: 'ค่าหอ', cls: dm ? 'text-slate-300' : 'text-slate-700' },
                    { label: 'หนี้สิน', cls: dm ? 'text-purple-400' : 'text-purple-700' },
                    { label: 'ค่ากิน', cls: dm ? 'text-slate-300' : 'text-slate-700' },
                    { label: 'ผันแปร', cls: dm ? 'text-slate-300' : 'text-slate-700' },
                    { label: 'ลงทุน', cls: dm ? 'text-slate-300' : 'text-slate-700' },
                    { label: 'ไอที', cls: dm ? 'text-slate-300' : 'text-slate-700' },
                    { label: 'ยอดจ่ายสุทธิ', cls: `border-l-2 font-black ${dm ? 'text-red-400 border-slate-600' : 'text-red-800 border-slate-300'}` },
                    { label: 'เงินคงเหลือ', cls: `font-black ${dm ? 'text-blue-400' : 'text-[#00509E]'}` },
                    { label: '% ออม', cls: `font-black text-center ${dm ? 'text-emerald-400' : 'text-emerald-600'}` },
                  ].map(({ label, cls }) => (
                    <th key={label} className={`px-4 py-2.5 font-bold ${cls}`}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${dm ? 'divide-slate-700/50' : 'divide-slate-200'}`}>
                {analytics.sortedCashflow.map((row, index, array) => {
                  
                  const prevMonth = array[index - 1];
                  let expMoM = null;
                  if (prevMonth && prevMonth.totalExp > 0) {
                    const diff = row.totalExp - prevMonth.totalExp;
                    const percent = (diff / prevMonth.totalExp) * 100;
                    expMoM = (
                      <span className={`text-[10px] ml-1.5 ${percent > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {percent > 0 ? '↑' : '↓'} {Math.abs(percent).toFixed(1)}%
                      </span>
                    );
                  }

                  const savingsRateNum = row.income > 0 ? ((row.income - row.totalExp) / row.income * 100) : 0;
                  const isNegSave = savingsRateNum < 0;
                  const saveColor = isNegSave 
                    ? (dm ? 'text-red-400' : 'text-red-600') 
                    : (dm ? 'text-emerald-400' : 'text-emerald-600');

                  return (
                    <tr key={row.monthStr} className="group transition-colors">
                      <td className={`px-4 py-2 font-bold text-center sticky left-0 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors ${dm ? 'bg-slate-800 border-slate-700 text-slate-200 group-hover:bg-slate-700' : 'bg-white border-slate-100 text-slate-700 group-hover:bg-slate-50'}`}>{getThaiMonth(row.monthStr)}</td>
                      <td className={`px-4 py-2 font-medium ${dm ? 'text-emerald-400 group-hover:bg-slate-800' : 'text-emerald-700 group-hover:bg-slate-50'}`}>{row.salary > 0 ? formatMoney(row.salary) : '-'}</td>
                      <td className={`px-4 py-2 font-medium ${dm ? 'text-emerald-400 group-hover:bg-slate-800' : 'text-emerald-700 group-hover:bg-slate-50'}`}>{row.bonus > 0 ? formatMoney(row.bonus) : '-'}</td>
                      <td className={`px-4 py-2 font-medium ${dm ? 'text-slate-300 group-hover:bg-slate-800' : 'text-slate-700 group-hover:bg-slate-50'}`}>{row.rent > 0 ? formatMoney(row.rent) : '-'}</td>
                      <td className={`px-4 py-2 font-medium ${dm ? 'text-purple-400 group-hover:bg-slate-800' : 'text-purple-700 group-hover:bg-slate-50'}`}>{row.subs > 0 ? formatMoney(row.subs) : '-'}</td>
                      <td className={`px-4 py-2 font-medium ${dm ? 'text-slate-300 group-hover:bg-slate-800' : 'text-slate-700 group-hover:bg-slate-50'}`}>{row.food > 0 ? formatMoney(row.food) : '-'}</td>
                      <td className={`px-4 py-2 font-medium ${dm ? 'text-slate-300 group-hover:bg-slate-800' : 'text-slate-700 group-hover:bg-slate-50'}`}>{row.variable > 0 ? formatMoney(row.variable) : '-'}</td>
                      <td className={`px-4 py-2 font-medium ${dm ? 'text-slate-300 group-hover:bg-slate-800' : 'text-slate-700 group-hover:bg-slate-50'}`}>{row.invest > 0 ? formatMoney(row.invest) : '-'}</td>
                      <td className={`px-4 py-2 font-medium ${dm ? 'text-slate-300 group-hover:bg-slate-800' : 'text-slate-700 group-hover:bg-slate-50'}`}>{row.it > 0 ? formatMoney(row.it) : '-'}</td>
                      <td className={`px-4 py-2 font-bold border-l-2 ${dm ? 'text-red-400 border-slate-700 group-hover:bg-slate-800' : 'text-red-700 border-slate-200 group-hover:bg-slate-50'}`}>
                        <div className="flex items-center justify-end">
                          {formatMoney(row.totalExp)}
                          {expMoM}
                        </div>
                      </td>
                      <td className={`px-4 py-2 font-black ${dm ? 'text-blue-400 group-hover:bg-slate-800' : 'text-[#00509E] group-hover:bg-slate-50'}`}>{formatMoney(row.income - row.totalExp)}</td>
                      <td className={`px-4 py-2 font-black text-center ${saveColor} ${dm ? 'group-hover:bg-slate-800' : 'group-hover:bg-slate-50'}`}>
                        {savingsRateNum.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className={`font-bold border-t-2 ${dm ? 'bg-slate-900 border-slate-600 text-slate-200' : 'bg-slate-800 border-slate-900 text-white'}`}>
                <tr>
                  <td className="px-4 py-2.5 text-center sticky left-0 z-10 bg-inherit border-r border-transparent">รวมทั้งหมด</td>
                  <td className={`px-4 py-2.5 ${dm ? 'text-emerald-400' : 'text-emerald-300'}`}>{formatMoney(analytics.sortedCashflow.reduce((s, r) => s + r.salary, 0))}</td>
                  <td className={`px-4 py-2.5 ${dm ? 'text-emerald-400' : 'text-emerald-300'}`}>{formatMoney(analytics.sortedCashflow.reduce((s, r) => s + r.bonus, 0))}</td>
                  <td className="px-4 py-2.5">{formatMoney(analytics.sortedCashflow.reduce((s, r) => s + r.rent, 0))}</td>
                  <td className={`px-4 py-2.5 ${dm ? 'text-purple-400' : 'text-purple-300'}`}>{formatMoney(analytics.sortedCashflow.reduce((s, r) => s + r.subs, 0))}</td>
                  <td className="px-4 py-2.5">{formatMoney(analytics.sortedCashflow.reduce((s, r) => s + r.food, 0))}</td>
                  <td className="px-4 py-2.5">{formatMoney(analytics.sortedCashflow.reduce((s, r) => s + r.variable, 0))}</td>
                  <td className="px-4 py-2.5">{formatMoney(analytics.sortedCashflow.reduce((s, r) => s + r.invest, 0))}</td>
                  <td className="px-4 py-2.5">{formatMoney(analytics.sortedCashflow.reduce((s, r) => s + r.it, 0))}</td>
                  <td className={`px-4 py-2.5 border-l-2 ${dm ? 'text-red-400 border-slate-600' : 'text-red-300 border-slate-700'}`}>{formatMoney(analytics.totalExpense)}</td>
                  <td className={`px-4 py-2.5 ${dm ? 'text-blue-400' : 'text-blue-300'}`}>{formatMoney(analytics.netCashflow)}</td>
                  <td className={`px-4 py-2.5 text-center ${analytics.savingsRate < 0 ? (dm ? 'text-red-400' : 'text-red-400') : (dm ? 'text-emerald-400' : 'text-emerald-300')}`}>
                    {analytics.totalIncome > 0 ? `${analytics.savingsRate}%` : '0%'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tooltip portal */}
      {activityTooltip && typeof window !== 'undefined' && ReactDOM.createPortal(
        <div
          style={{ position: 'fixed', left: activityTooltip.x, top: activityTooltip.y, transform: 'translateX(-50%) translateY(calc(-100% - 8px))', zIndex: 99999, pointerEvents: 'none' }}
          className="bg-slate-800 text-white text-center rounded-sm py-1 px-2 text-[11px] font-medium shadow-xl w-max min-w-[90px]"
        >
          <div className="text-slate-400 font-normal text-[10px]">{activityTooltip.date}</div>
          <div className="font-bold mt-0.5" style={{ color: activityTooltip.color }}>{activityTooltip.label}</div>
          <div style={{ borderTopColor: '#1e293b' }} className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent" />
        </div>,
        document.body
      )}
    </div>
  );
}

DashboardView.propTypes = {
  transactions:         PropTypes.array.isRequired,
  categories:           PropTypes.array.isRequired,
  filterPeriod:         PropTypes.string.isRequired,
  getFilterLabel:       PropTypes.func.isRequired,
  hideFixedExpenses:    PropTypes.bool.isRequired,
  setHideFixedExpenses: PropTypes.func.isRequired,
  dashboardCategory:    PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
  setDashboardCategory: PropTypes.func.isRequired,
  chartGroupBy:         PropTypes.string.isRequired,
  setChartGroupBy:      PropTypes.func.isRequired,
  topXLimit:            PropTypes.number.isRequired,
  setTopXLimit:         PropTypes.func.isRequired,
  analytics:            PropTypes.object.isRequired,
  dayTypeConfig:        PropTypes.array.isRequired,
  dayTypes:             PropTypes.object.isRequired,
  isDarkMode:           PropTypes.bool.isRequired,
};