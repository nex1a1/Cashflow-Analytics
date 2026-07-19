// src/views/Dashboard/components/SummaryCards.jsx
import React, { memo } from 'react';
import { 
  Activity, Wallet, Target, Scale, UtensilsCrossed,
  TrendingUp, Zap, Layers, Home, Award, TrendingDown, Navigation
} from 'lucide-react';
import { useDashboardContext } from '../context/DashboardContext';
import { formatMoney } from '../../../utils/formatters';
import sharkLogo from '../../../assets/images/shark-white.svg';
import AnimatedNumber from '../../../components/ui/AnimatedNumber.jsx';

/**
 * Shared Shimmer for Hybrid Loading (Elite Flat HUD Style)
 */
const Shimmer = ({ className }) => (
  <div className={`rounded-none animate-pulse bg-neutral-800/80 ${className}`} />
);

/**
 * Shared Header for Summary Sections (Elite HUD Style)
 */
const SectionHeader = ({ icon: Icon, title }) => (
  <div className="px-4 py-2 flex items-center justify-between border-b border-[#2d2d2d] bg-[#121212]/80">
    <div className="flex items-center gap-2">
      <div className="w-[3px] h-3 bg-[#da291c] shrink-0" /> {/* Rosso Corsa racing line brand accent */}
      {Icon && <Icon className="w-3.5 h-3.5 text-neutral-400" />}
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-200">
        {title}
      </span>
    </div>
  </div>
);

/**
 * SECTION 1: FINANCIAL VITALS (Income, Expense, Cashflow, Savings)
 */
const SummaryVitals = memo(({ analytics, showSkeleton }) => {
  const {
    totalIncome, totalExpense, netCashflow, savingsRate,
    datesInPeriod
  } = analytics;

  const periodDays = Math.max(1, datesInPeriod?.length || 1);
  const avgIncomePerDay = totalIncome / periodDays;
  const avgExpensePerDay = totalExpense / periodDays;
  
  const expensePercent = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;

  // Grade pill mapping using our vibrant semi-transparent badge style
  const getSavingsGradeInfo = (rate) => {
    if (rate >= 30) return { grade: 'A+', label: 'ELITE', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    if (rate >= 20) return { grade: 'A', label: 'STRONG', cls: 'bg-teal-500/10 text-teal-400 border-teal-500/20' };
    if (rate >= 15) return { grade: 'B', label: 'GOOD', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    if (rate >= 10) return { grade: 'C', label: 'FAIR', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
    if (rate >= 5)  return { grade: 'D', label: 'WEAK', cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
    return { grade: 'F', label: 'CRITICAL', cls: 'bg-[#da291c]/10 text-[#da291c] border-[#da291c]/20' };
  };

  const gradeInfo = getSavingsGradeInfo(savingsRate);

  return (
    <div className="flex flex-col">
      <SectionHeader icon={Activity} title="ตัวชี้วัดหลัก (Core Vitals)" />
      <div className="grid grid-cols-3 gap-[1px] bg-[#2d2d2d]">
        
        {/* INCOME CELL */}
        <div className="group relative overflow-hidden p-4 flex flex-col justify-between min-h-[110px] border-l-2 border-l-emerald-500 bg-[#181818] hover:bg-[#1d1d1d] transition-none">
          <div className="absolute -right-2 -bottom-2 opacity-[0.03] pointer-events-none w-16 h-16">
            <img src={sharkLogo} alt="" className="w-full h-full object-contain filter grayscale opacity-40" />
          </div>

          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-400">
              รายรับรวม
            </span>
          </div>

          <div className="mt-1">
            {showSkeleton ? (
              <Shimmer className="h-8 w-28 my-1" />
            ) : (
              <div className="text-2xl xl:text-3xl font-black text-emerald-400 tabular-nums tracking-tight leading-none">
                <AnimatedNumber value={totalIncome} />
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between z-10">
            {showSkeleton ? (
              <Shimmer className="h-4 w-24" />
            ) : (
              <span className="text-[10px] font-bold text-neutral-500 tabular-nums">
                เฉลี่ย ฿{formatMoney(avgIncomePerDay)} / วัน
              </span>
            )}
          </div>
        </div>

        {/* EXPENSE CELL */}
        <div className="group relative overflow-hidden p-4 flex flex-col justify-between min-h-[110px] border-l-2 border-l-[#da291c] bg-[#181818] hover:bg-[#1d1d1d] transition-none">
          <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-neutral-700">
            <Wallet size={72} />
          </div>

          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-400">
              รายจ่ายรวม
            </span>
            {!showSkeleton && (
              <div className="px-1.5 py-0.5 border border-rose-500/20 bg-rose-500/10 text-rose-400 rounded-none text-[9px] font-black uppercase tracking-widest">
                ใช้ไป {expensePercent}%
              </div>
            )}
          </div>

          <div className="mt-1">
            {showSkeleton ? (
              <Shimmer className="h-8 w-28 my-1" />
            ) : (
              <div className="text-2xl xl:text-3xl font-black text-rose-400 tabular-nums tracking-tight leading-none">
                <AnimatedNumber value={totalExpense} />
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between z-10">
            {showSkeleton ? (
              <Shimmer className="h-4 w-24" />
            ) : (
              <span className="text-[10px] font-bold text-neutral-500 tabular-nums">
                เฉลี่ย ฿{formatMoney(avgExpensePerDay)} / วัน
              </span>
            )}
          </div>
        </div>

        {/* CASHFLOW CELL */}
        <div className={`group relative overflow-hidden p-4 flex flex-col justify-between min-h-[110px] border-l-2 bg-[#181818] hover:bg-[#1d1d1d] transition-none ${
          netCashflow >= 0 ? 'border-l-yellow-500' : 'border-l-[#da291c]'
        }`}>
          <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-neutral-700">
            {netCashflow >= 0 ? <Navigation size={72} /> : <TrendingDown size={72} />}
          </div>

          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-400">
              กระแสเงินสดสุทธิ
            </span>
            {!showSkeleton && (
              <div className={`px-1.5 py-0.5 border flex items-center gap-1.5 rounded-none text-[9px] font-black uppercase tracking-widest ${gradeInfo.cls}`}>
                <span>ออม {savingsRate}%</span>
                <span className="opacity-30">|</span>
                <span className="font-extrabold">{gradeInfo.grade} {gradeInfo.label}</span>
              </div>
            )}
          </div>

          <div className="mt-1">
            {showSkeleton ? (
              <Shimmer className="h-8 w-28 my-1" />
            ) : (
              <div className={`text-2xl xl:text-3xl font-black tabular-nums tracking-tight leading-none ${
                netCashflow >= 0 ? 'text-yellow-400' : 'text-[#da291c]'
              }`}>
                <AnimatedNumber value={netCashflow} />
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between z-10">
            {showSkeleton ? (
              <Shimmer className="h-4 w-12" />
            ) : (
              <span className={`text-[10px] font-black tracking-[0.12em] uppercase ${
                netCashflow >= 0 ? 'text-yellow-500' : 'text-[#da291c]'
              }`}>
                {netCashflow >= 0 ? 'Surplus (ส่วนเกิน)' : 'Deficit (ติดลบ)'}
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
});

/**
 * SECTION 2: STRATEGIC & KEY METRICS (Commitment, Velocity, Food Metrics)
 */
const SummaryStrategic = memo(({ analytics, showSkeleton }) => {
  const {
    totalIncome, netCashflow,
    dailyAvg, foodPercentage, foodDailyAvg, variableTotal,
    rentPercentage, rentTotal, rentSub, datesInPeriod
  } = analytics;

  const periodDays = Math.max(1, datesInPeriod?.length || 1);
  const dailyVictory = netCashflow / periodDays;

  // Safely parse decimals to numbers for stable evaluation
  const rentPercentageNum = parseFloat(rentPercentage) || 0;

  // Lifestyle Ratio: (Wants / Total Income)
  const lifestyleRatio = totalIncome > 0 ? ((variableTotal / totalIncome) * 100) : 0;

  return (
    <div className="grid grid-cols-12 items-stretch gap-px bg-[#2d2d2d]">
      
      {/* Strategic Analysis */}
      <div className="col-span-7 flex flex-col">
        <SectionHeader icon={Target} title="วิเคราะห์กลยุทธ์ (Strategic Analysis)" />
        <div className="grid grid-cols-3 gap-[1px] bg-[#2d2d2d] flex-1">
          
          {/* RENT CARD */}
          <div className={`group relative overflow-hidden p-3.5 flex flex-col justify-between h-full min-h-[120px] bg-[#181818] hover:bg-[#1c1c1c] transition-none border-l-2 ${
            rentPercentageNum > 30 ? 'border-l-[#da291c]' : 'border-l-sky-500'
          }`}>
            <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-neutral-700">
              <Home size={72} />
            </div>

            {/* Original Content (Blurs and fades on hover) */}
            <div className="flex-1 flex flex-col justify-between w-full h-full transition-none group-hover:blur-[1.5px] group-hover:opacity-20">
              <span className="text-[9px] font-black uppercase tracking-[0.12em] text-neutral-400 mb-1">
                ภาระที่พักอาศัย (Rent Ratio)
              </span>
              
              <div className="mt-auto z-10">
                {showSkeleton ? (
                  <Shimmer className="h-6 w-16 my-1" />
                ) : (
                  <div className="flex items-baseline gap-1.5">
                    <div className={`text-lg font-black ${rentPercentageNum > 30 ? 'text-[#da291c]' : 'text-sky-400'}`}>
                      {rentPercentageNum.toFixed(1)}%
                    </div>
                    <div className="text-[10px] font-bold text-neutral-500 tabular-nums">
                      ฿{formatMoney(rentTotal)}
                    </div>
                  </div>
                )}
                
                <div className="w-full h-1 mt-2 rounded-none bg-neutral-900 border border-neutral-800/80 overflow-hidden relative">
                  <div 
                    className={`h-full absolute left-0 top-0 transition-none ${
                      showSkeleton ? 'bg-slate-700 animate-pulse' : (rentPercentageNum > 30 ? 'bg-[#da291c]' : 'bg-sky-500')
                    }`} 
                    style={{ width: showSkeleton ? '50%' : `${Math.min(100, rentPercentageNum)}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* Hover Breakdown Overlay */}
            {!showSkeleton && rentSub && (
              <div className="absolute inset-0 p-2.5 bg-[#181818]/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-none pointer-events-none z-20 flex flex-col justify-between">
                <div className="text-[8px] font-black uppercase tracking-wider text-neutral-400 border-b border-[#303030] pb-1 flex justify-between items-center shrink-0">
                  <span>รายละเอียดที่พัก</span>
                  <span className="text-sky-400 font-extrabold text-[7px] border border-sky-400/30 px-1 py-0.5 rounded-none leading-none">4 หมวด</span>
                </div>
                
                <div className="flex-1 grid grid-cols-2 gap-[1px] bg-neutral-800/50 mt-1.5 overflow-hidden">
                  <div className="bg-[#181818] p-1 flex flex-col justify-between text-left">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">🏢 ค่าเช่า</span>
                    <span className="text-[12px] font-black text-slate-200 tabular-nums">฿{formatMoney(rentSub.rent)}</span>
                  </div>
                  <div className="bg-[#181818] p-1 flex flex-col justify-between text-left">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">⚡ ค่าไฟ</span>
                    <span className="text-[12px] font-black text-slate-200 tabular-nums">฿{formatMoney(rentSub.electricity)}</span>
                  </div>
                  <div className="bg-[#181818] p-1 flex flex-col justify-between text-left">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">🌐 ค่าเน็ต</span>
                    <span className="text-[12px] font-black text-slate-200 tabular-nums">฿{formatMoney(rentSub.internet)}</span>
                  </div>
                  <div className="bg-[#181818] p-1 flex flex-col justify-between text-left">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">💧 ค่าน้ำ</span>
                    <span className="text-[12px] font-black text-slate-200 tabular-nums">฿{formatMoney(rentSub.water)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* WANT RATIO CARD */}
          <div className={`group relative overflow-hidden p-3.5 flex flex-col justify-between h-full min-h-[120px] bg-[#181818] hover:bg-[#1d1d1d] transition-none border-l-2 ${
            lifestyleRatio > 35 ? 'border-l-[#da291c]' : 'border-l-orange-500'
          }`}>
            <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-neutral-700">
              <Zap size={72} />
            </div>

            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-neutral-400 mb-1">
              ดัชนีฟุ่มเฟือย (Want Ratio)
            </span>
            
            <div className="mt-auto z-10">
              {showSkeleton ? (
                <Shimmer className="h-6 w-16 my-1" />
              ) : (
                <div className="flex items-baseline gap-1.5">
                  <div className={`text-lg font-black ${lifestyleRatio > 35 ? 'text-[#da291c]' : 'text-orange-400'}`}>
                    {lifestyleRatio.toFixed(1)}%
                  </div>
                  <div className="text-[10px] font-bold text-neutral-500 tabular-nums">
                    ฿{formatMoney(variableTotal)}
                  </div>
                </div>
              )}
              
              <div className="w-full h-1 mt-2 rounded-none bg-neutral-900 border border-neutral-800/80 overflow-hidden relative">
                <div 
                  className={`h-full absolute left-0 top-0 transition-none ${
                    showSkeleton ? 'bg-slate-700 animate-pulse' : 'bg-orange-500'
                  }`} 
                  style={{ width: showSkeleton ? '50%' : `${Math.min(100, lifestyleRatio)}%` }} 
                />
              </div>
            </div>
          </div>

          {/* VICTORY CARD */}
          <div className={`group relative overflow-hidden p-3.5 flex flex-col justify-between h-full min-h-[120px] bg-[#181818] hover:bg-[#1d1d1d] transition-none border-l-2 ${
            dailyVictory >= 0 ? 'border-l-lime-500' : 'border-l-[#da291c]'
          }`}>
            <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-neutral-700">
              <Award size={72} />
            </div>

            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-neutral-400 mb-1">
              เงินเหลือรายวัน (Victory)
            </span>
            
            <div className="mt-auto z-10">
              {showSkeleton ? (
                <Shimmer className="h-6 w-20" />
              ) : (
                <div className={`text-lg font-black tabular-nums leading-none ${
                  dailyVictory >= 0 ? 'text-lime-400' : 'text-[#da291c]'
                }`}>
                  ฿{formatMoney(dailyVictory)}
                </div>
              )}
              <div className="text-[9px] font-bold text-neutral-500 mt-2 leading-none">
                {dailyVictory >= 0 ? 'กำไรสะสมรายวัน' : 'ขาดทุนสะสมรายวัน'}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Key Metrics */}
      <div className="col-span-5 flex flex-col">
        <SectionHeader icon={Scale} title="ข้อมูลสำคัญ (Metrics)" />
        <div className="grid grid-cols-3 gap-[1px] bg-[#2d2d2d] flex-1">
          
          {/* FOOD RATIO CARD */}
          <div className="group relative overflow-hidden p-3.5 flex flex-col justify-between h-full bg-[#181818] hover:bg-[#1d1d1d] transition-none border-l-2 border-l-amber-500">
            <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-neutral-700">
              <UtensilsCrossed size={72} />
            </div>

            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-neutral-400 mb-1">
              สัดส่วนค่าอาหาร
            </span>
            
            <div className="mt-auto z-10">
              {showSkeleton ? (
                <Shimmer className="h-6 w-12" />
              ) : (
                <div className="text-lg font-black leading-none text-amber-400">
                  {foodPercentage}%
                </div>
              )}
              <div className="text-[9px] font-bold text-neutral-500 mt-2 leading-none">
                ของรายจ่ายรวม
              </div>
            </div>
          </div>

          {/* AVG FOOD DAILY CARD */}
          <div className="group relative overflow-hidden p-3.5 flex flex-col justify-between h-full bg-[#181818] hover:bg-[#1d1d1d] transition-none border-l-2 border-l-orange-400">
            <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-neutral-700">
              <UtensilsCrossed size={72} />
            </div>

            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-neutral-400 mb-1">
              กินเฉลี่ย/วัน
            </span>
            
            <div className="mt-auto z-10">
              {showSkeleton ? (
                <Shimmer className="h-6 w-16" />
              ) : (
                <div className="text-lg font-black tabular-nums leading-none text-orange-400">
                  ฿{formatMoney(foodDailyAvg)}
                </div>
              )}
              <div className="text-[9px] font-bold text-neutral-500 mt-2 leading-none">
                ค่าอาหารรายวัน
              </div>
            </div>
          </div>

          {/* AVG DAILY EXPENSE CARD */}
          <div className="group relative overflow-hidden p-3.5 flex flex-col justify-between h-full bg-[#181818] hover:bg-[#1d1d1d] transition-none border-l-2 border-l-[#da291c]">
            <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-neutral-700">
              <TrendingDown size={72} />
            </div>

            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-neutral-400 mb-1">
              รายจ่ายเฉลี่ย/วัน
            </span>
            
            <div className="mt-auto z-10">
              {showSkeleton ? (
                <Shimmer className="h-6 w-16" />
              ) : (
                <div className="text-lg font-black tabular-nums leading-none text-rose-400">
                  ฿{formatMoney(dailyAvg)}
                </div>
              )}
              <div className="text-[9px] font-bold text-neutral-500 mt-2 leading-none">
                เฉลี่ยรวมทุกวัน
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
});

/**
 * SECTION 3: FORECAST (Opt-in predictions)
 */
const SummaryForecasting = memo(({ analytics, showSkeleton }) => {
  const {
    showForecasting, projectedExpense, safeToSpend, projectedSurplus
  } = analytics;

  if (!showForecasting) return null;

  return (
    <div className="flex flex-col">
      <SectionHeader icon={TrendingUp} title="พยากรณ์สิ้นเดือน (Projection & Safe Zone)" />
      <div className="grid grid-cols-3 gap-[1px] bg-[#2d2d2d]">
        
        {/* Projected Expense */}
        <div className="group relative overflow-hidden p-4 flex items-center justify-between bg-indigo-950/20 hover:bg-indigo-950/30 transition-none border-l-2 border-l-indigo-500">
          <div className="z-10">
            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-neutral-400">
              พยากรณ์รายจ่ายเดือนนี้
            </span>
            {showSkeleton ? (
              <Shimmer className="h-6 w-24 mt-2" />
            ) : (
              <div className="text-xl font-black text-indigo-400 tabular-nums tracking-tight leading-none mt-2">
                <AnimatedNumber value={projectedExpense} />
              </div>
            )}
          </div>
          <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-indigo-500">
            <TrendingUp size={72} />
          </div>
        </div>

        {/* Safe to Spend */}
        <div className={`group relative overflow-hidden p-4 flex items-center justify-between transition-none border-l-2 ${
          safeToSpend > 300 
            ? 'bg-emerald-950/20 hover:bg-emerald-950/30 border-l-teal-500'
            : 'bg-red-950/20 hover:bg-red-950/30 border-l-[#da291c]'
        }`}>
          <div className="z-10">
            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-neutral-400">
              งบเหลือใช้จ่ายรายวัน (Safe to Spend)
            </span>
            {showSkeleton ? (
              <Shimmer className="h-6 w-24 mt-2" />
            ) : (
              <div className={`text-xl font-black tabular-nums tracking-tight leading-none mt-2 ${
                safeToSpend > 300 ? 'text-emerald-400' : 'text-[#da291c]'
              }`}>
                <AnimatedNumber value={safeToSpend} />
              </div>
            )}
          </div>
          <div className={`absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none ${
            safeToSpend > 300 ? 'text-teal-500' : 'text-[#da291c]'
          }`}>
            <Zap size={72} />
          </div>
        </div>

        {/* Projected Surplus */}
        <div className="group relative overflow-hidden p-4 flex items-center justify-between bg-purple-950/20 hover:bg-purple-950/30 transition-none border-l-2 border-l-purple-500">
          <div className="z-10">
            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-neutral-400">
              กระแสเงินสุทธิสดคาดการณ์
            </span>
            {showSkeleton ? (
              <Shimmer className="h-6 w-24 mt-2" />
            ) : (
              <div className="text-xl font-black text-purple-400 tabular-nums tracking-tight leading-none mt-2">
                <AnimatedNumber value={projectedSurplus} />
              </div>
            )}
          </div>
          <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-purple-500">
            <Layers size={72} />
          </div>
        </div>

      </div>
    </div>
  );
});

/**
 * SummaryCards - The mission control center for financial vitals.
 */
export default function SummaryCards() {
  const { analytics, showSkeleton } = useDashboardContext();

  if (!analytics) return null;

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 1. Core Vitals Card */}
      <div className="w-full flex flex-col rounded-none overflow-hidden border border-[#2d2d2d] bg-[#181818] shadow-sm">
        <SummaryVitals analytics={analytics} showSkeleton={showSkeleton} />
      </div>

      {/* 2. Strategic & Key Metrics Card */}
      <div className="w-full flex flex-col rounded-none overflow-hidden border border-[#2d2d2d] bg-[#181818] shadow-sm">
        <SummaryStrategic analytics={analytics} showSkeleton={showSkeleton} />
      </div>

      {/* 3. Forecasting Predictions Card */}
      {analytics.showForecasting && (
        <div className="w-full flex flex-col rounded-none overflow-hidden border border-[#2d2d2d] bg-[#181818] shadow-sm">
          <SummaryForecasting analytics={analytics} showSkeleton={showSkeleton} />
        </div>
      )}
    </div>
  );
}

