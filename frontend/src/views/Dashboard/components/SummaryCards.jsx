// src/views/Dashboard/components/SummaryCards.jsx
import React from 'react';
import { 
  Activity, Wallet, Anchor, Crosshair, Navigation, ShieldCheck,
  Target, Scale, UtensilsCrossed,
  TrendingUp, Zap, Layers,
  Home, Award, TrendingDown
} from 'lucide-react';
import { useDashboardContext } from '../context/DashboardContext';
import { formatMoney } from '../../../utils/formatters';
import sharkLogo from '../../../assets/images/shark-white.svg';
import sharkBlack from '../../../assets/images/shark-black.svg';
import AnimatedNumber from '../../../components/ui/AnimatedNumber.jsx';

/**
 * Shared Shimmer for Hybrid Loading
 */
const Shimmer = ({ className, dm }) => (
  <div className={`rounded-sm animate-pulse ${dm ? 'bg-slate-800' : 'bg-slate-200'} ${className}`} />
);

/**
 * Shared Header for Summary Sections (Elite HUD Style)
 */
const SectionHeader = ({ icon: Icon, title, dm }) => (
  <div className={`px-3 py-1.5 flex items-center justify-between border-b transition-colors ${
    dm 
      ? 'bg-slate-950/45 border-slate-800/60' 
      : 'bg-slate-50 border-slate-100'
  }`}>
    <div className="flex items-center gap-2">
      <Icon className={`w-3.5 h-3.5 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} />
      <span className={`text-[10px] font-black uppercase tracking-widest ${
        dm ? 'text-slate-400' : 'text-slate-600'
      }`}>
        {title}
      </span>
    </div>
  </div>
);

/**
 * SECTION 1: FINANCIAL VITALS (Income, Expense, Cashflow, Savings) - Custom flat HUD
 */
const SummaryVitals = ({ analytics, dm, showSkeleton }) => {
  const {
    totalIncome, totalExpense, netCashflow, savingsRate,
    fixedTotal, variableTotal, datesInPeriod
  } = analytics;

  const periodDays = Math.max(1, datesInPeriod?.length || 1);
  const avgIncomePerDay = totalIncome / periodDays;
  const avgExpensePerDay = totalExpense / periodDays;
  
  const expensePercent = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;

  // Neutral label colors to establish high-contrast hierarchy
  const labelColorClass = dm ? 'text-slate-400' : 'text-slate-550';
  const mutedTextColorClass = dm ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className={`flex flex-col border-b border-dashed ${dm ? 'border-slate-800/80' : 'border-slate-200'}`}>
      <SectionHeader icon={Activity} title="ตัวชี้วัดหลัก" dm={dm} />
      <div className={`grid grid-cols-3 gap-px p-px ${dm ? 'bg-slate-800/60' : 'bg-slate-200/60'}`}>
        
        {/* INCOME CELL (Green/Teal theme) */}
        <div className={`group relative overflow-hidden p-3.5 flex flex-col justify-between min-h-[96px] border-l-2 border-l-emerald-500 transition-all duration-300 ${
          dm 
            ? 'bg-slate-900 hover:bg-slate-900/90 group-hover:bg-gradient-to-br group-hover:from-emerald-500/[0.03]' 
            : 'bg-white hover:bg-slate-50/50 group-hover:bg-gradient-to-br group-hover:from-emerald-50/[0.02]'
        }`}>
          {/* Shark Logo Watermark */}
          <div className="absolute -right-2 -bottom-2 opacity-[0.03] dark:opacity-[0.05] transition-transform duration-500 group-hover:scale-125 group-hover:rotate-6 pointer-events-none w-16 h-16">
            <img src={dm ? sharkLogo : sharkBlack} alt="" className="w-full h-full object-contain filter grayscale opacity-60" />
          </div>

          <div className="flex justify-between items-center mb-1">
            <span className={`text-[10px] font-black uppercase tracking-wider ${labelColorClass}`}>
              รายรับรวม
            </span>
          </div>

          <div className="mt-0.5">
            {showSkeleton ? (
              <Shimmer className="h-7 w-28 my-1" dm={dm} />
            ) : (
              <div className={`text-xl xl:text-2xl font-black tabular-nums tracking-tight leading-none ${dm ? 'text-emerald-400' : 'text-emerald-600'}`}>
                <AnimatedNumber value={totalIncome} />
              </div>
            )}
          </div>

          <div className="mt-1 flex items-center justify-between">
            {showSkeleton ? (
              <Shimmer className="h-3.5 w-24" dm={dm} />
            ) : (
              <span className={`text-[10px] font-bold opacity-80 tabular-nums ${mutedTextColorClass}`}>
                เฉลี่ย ฿{formatMoney(avgIncomePerDay)}/วัน
              </span>
            )}
          </div>
        </div>

        {/* EXPENSE CELL (Rose Red theme representing burn outflow) */}
        <div className={`group relative overflow-hidden p-3.5 flex flex-col justify-between min-h-[96px] border-l-2 border-l-rose-500 transition-all duration-300 ${
          dm 
            ? 'bg-slate-900 hover:bg-slate-900/90 group-hover:bg-gradient-to-br group-hover:from-rose-500/[0.03]' 
            : 'bg-white hover:bg-slate-50/50 group-hover:bg-gradient-to-br group-hover:from-rose-50/[0.02]'
        }`}>
          {/* Wallet Watermark */}
          <div className={`absolute -right-3 -bottom-3 opacity-[0.03] dark:opacity-[0.05] transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12 pointer-events-none ${
            dm ? 'text-rose-455' : 'text-rose-700'
          }`}>
            <Wallet size={72} />
          </div>

          <div className="flex justify-between items-center mb-1">
            <span className={`text-[10px] font-black uppercase tracking-wider ${labelColorClass}`}>
              รายจ่ายรวม
            </span>
            {!showSkeleton && (
              <div className={`px-1.5 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-widest ${
                dm ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-700 border border-rose-105'
              }`}>
                ใช้ไป {expensePercent}%
              </div>
            )}
          </div>

          <div className="mt-0.5">
            {showSkeleton ? (
              <Shimmer className="h-7 w-28 my-1" dm={dm} />
            ) : (
              <div className={`text-xl xl:text-2xl font-black tabular-nums tracking-tight leading-none ${dm ? 'text-rose-400' : 'text-rose-600'}`}>
                <AnimatedNumber value={totalExpense} />
              </div>
            )}
          </div>

          <div className="mt-1 flex items-center justify-between">
            {showSkeleton ? (
              <Shimmer className="h-3.5 w-24" dm={dm} />
            ) : (
              <span className={`text-[10px] font-bold opacity-80 tabular-nums ${mutedTextColorClass}`}>
                เฉลี่ย ฿{formatMoney(avgExpensePerDay)}/วัน
              </span>
            )}
          </div>
        </div>

        {/* CASHFLOW CELL (Gold/Yellow surplus theme) */}
        <div className={`group relative overflow-hidden p-3.5 flex flex-col justify-between min-h-[96px] border-l-2 transition-all duration-300 ${
          netCashflow >= 0 
            ? 'border-l-yellow-500' 
            : 'border-l-rose-500'
        } ${
          dm 
            ? `bg-slate-900 hover:bg-slate-900/90 group-hover:bg-gradient-to-br ${netCashflow >= 0 ? 'group-hover:from-yellow-500/[0.03]' : 'group-hover:from-rose-500/[0.03]'}` 
            : `bg-white hover:bg-slate-50/50 group-hover:bg-gradient-to-br ${netCashflow >= 0 ? 'group-hover:from-yellow-50/[0.02]' : 'group-hover:from-rose-50/[0.02]'}`
        }`}>
          {/* Navigation/Down Watermark */}
          <div className={`absolute -right-3 -bottom-3 opacity-[0.03] dark:opacity-[0.05] transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12 pointer-events-none ${
            netCashflow >= 0 
              ? (dm ? 'text-yellow-405' : 'text-yellow-700') 
              : (dm ? 'text-rose-405' : 'text-rose-700')
          }`}>
            {netCashflow >= 0 ? <Navigation size={72} /> : <TrendingDown size={72} />}
          </div>

          <div className="flex justify-between items-center mb-1">
            <span className={`text-[10px] font-black uppercase tracking-wider ${labelColorClass}`}>
              กระแสเงินสดสุทธิ
            </span>
            {!showSkeleton && (
              <div className={`px-1.5 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border ${
                savingsRate >= 20 
                  ? (dm ? 'bg-yellow-500/10 text-yellow-450 border-yellow-500/20' : 'bg-yellow-50 text-yellow-750 border-yellow-100') 
                  : (dm ? 'bg-amber-500/10 text-amber-450 border-amber-500/20' : 'bg-amber-50 text-amber-755 border-amber-100')
              }`}>
                <span>ออม {savingsRate}%</span>
                <span className="opacity-40">|</span>
                <span className="font-extrabold">{savingsRate >= 20 ? 'A+' : (savingsRate >= 10 ? 'B' : (savingsRate > 0 ? 'C' : 'F'))}</span>
              </div>
            )}
          </div>

          <div className="mt-0.5">
            {showSkeleton ? (
              <Shimmer className="h-7 w-28 my-1" dm={dm} />
            ) : (
              <div className={`text-xl xl:text-2xl font-black tabular-nums tracking-tight leading-none ${
                netCashflow >= 0 
                  ? (dm ? 'text-yellow-400' : 'text-yellow-600') 
                  : (dm ? 'text-rose-400' : 'text-rose-700')
              }`}>
                <AnimatedNumber value={netCashflow} />
              </div>
            )}
          </div>

          <div className="mt-1 flex items-center justify-between">
            {showSkeleton ? (
              <Shimmer className="h-3.5 w-12" dm={dm} />
            ) : (
              <span className={`text-[10px] font-black tracking-wide uppercase ${
                netCashflow >= 0 
                  ? (dm ? 'text-yellow-450' : 'text-yellow-700') 
                  : (dm ? 'text-rose-455' : 'text-rose-700')
              }`}>
                {netCashflow >= 0 ? 'Surplus' : 'Deficit'}
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

/**
 * SECTION 2: STRATEGIC & KEY METRICS (Commitment, Velocity, Food Metrics)
 */
const SummaryStrategic = ({ analytics, dm, showSkeleton }) => {
  const {
    totalIncome, netCashflow,
    dailyAvg, foodPercentage, foodDailyAvg, fixedTotal, variableTotal,
    rentPercentage, datesInPeriod
  } = analytics;

  const periodDays = Math.max(1, datesInPeriod?.length || 1);
  const dailyVictory = netCashflow / periodDays;

  // Lifestyle Ratio: (Wants / Total Income)
  const lifestyleRatio = totalIncome > 0 ? ((variableTotal / totalIncome) * 100) : 0;

  // Neutral label colors to avoid repetitive color blocks
  const labelColorClass = dm ? 'text-slate-400' : 'text-slate-550';
  const mutedTextColorClass = dm ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className="grid grid-cols-12 items-stretch">
      {/* Strategic Analysis */}
      <div className={`col-span-7 flex flex-col border-r border-dashed ${dm ? 'border-slate-800/80' : 'border-slate-200'}`}>
        <SectionHeader icon={Target} title="วิเคราะห์กลยุทธ์" dm={dm} />
        <div className={`grid grid-cols-3 gap-px p-px flex-1 ${dm ? 'bg-slate-800/60' : 'bg-slate-200/60'}`}>
          
          {/* RENT (Sky Blue) */}
          <div className={`group relative overflow-hidden p-3 flex flex-col justify-between h-full transition-all duration-300 ${
            dm ? 'bg-slate-900 hover:bg-slate-900/90' : 'bg-white hover:bg-slate-50/50'
          } ${rentPercentage > 30 ? 'border-l-2 border-l-rose-500' : 'border-l-2 border-l-sky-500'}`}>
            <div className={`absolute -right-3 -bottom-3 opacity-[0.03] dark:opacity-[0.05] transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12 pointer-events-none ${
              rentPercentage > 30 ? 'text-rose-500' : 'text-sky-500'
            }`}>
              <Home size={72} />
            </div>

            <span className={`text-[9px] font-black uppercase tracking-wider ${labelColorClass} mb-1`}>
              ภาระที่พักอาศัย (RENT)
            </span>
            
            <div className="mt-auto z-10">
              {showSkeleton ? (
                <Shimmer className="h-6 w-16 my-1" dm={dm} />
              ) : (
                <div className="flex items-baseline gap-1.5">
                  <div className={`text-lg font-black ${rentPercentage > 30 ? (dm ? 'text-rose-455' : 'text-rose-700') : (dm ? 'text-sky-400' : 'text-sky-600')}`}>
                    {rentPercentage}%
                  </div>
                  <div className={`text-[10px] font-bold opacity-60 tabular-nums ${mutedTextColorClass}`}>
                    ฿{formatMoney(analytics.rentTotal)}
                  </div>
                </div>
              )}
              
              <div className={`w-full h-1 mt-1.5 rounded-full ${dm ? 'bg-slate-850' : 'bg-slate-100'} overflow-hidden relative`}>
                <div 
                  className={`h-full absolute left-0 top-0 transition-all duration-1000 ${
                    showSkeleton ? 'bg-slate-500 animate-pulse' : (rentPercentage > 30 ? 'bg-rose-500' : 'bg-sky-500')
                  }`} 
                  style={{ width: showSkeleton ? '50%' : `${Math.min(100, rentPercentage)}%` }} 
                />
              </div>
            </div>
          </div>

          {/* WANT RATIO (Orange) */}
          <div className={`group relative overflow-hidden p-3 flex flex-col justify-between h-full transition-all duration-300 ${
            dm ? 'bg-slate-900 hover:bg-slate-900/90' : 'bg-white hover:bg-slate-50/50'
          } ${lifestyleRatio > 35 ? 'border-l-2 border-l-rose-500' : 'border-l-2 border-l-orange-500'}`}>
            <div className={`absolute -right-3 -bottom-3 opacity-[0.03] dark:opacity-[0.05] transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12 pointer-events-none ${
              lifestyleRatio > 35 ? 'text-rose-500' : 'text-orange-500'
            }`}>
              <Zap size={72} />
            </div>

            <span className={`text-[9px] font-black uppercase tracking-wider ${labelColorClass} mb-1`}>
              ดัชนีการใช้ชีวิต (WANT RATIO)
            </span>
            
            <div className="mt-auto z-10">
              {showSkeleton ? (
                <Shimmer className="h-6 w-16 my-1" dm={dm} />
              ) : (
                <div className="flex items-baseline gap-1.5">
                  <div className={`text-lg font-black ${lifestyleRatio > 35 ? (dm ? 'text-rose-455' : 'text-rose-700') : (dm ? 'text-orange-400' : 'text-orange-605')}`}>
                    {lifestyleRatio.toFixed(1)}%
                  </div>
                  <div className={`text-[10px] font-bold opacity-60 tabular-nums ${mutedTextColorClass}`}>
                    ฿{formatMoney(variableTotal)}
                  </div>
                </div>
              )}
              
              <div className={`w-full h-1 mt-1.5 rounded-full ${dm ? 'bg-slate-850' : 'bg-slate-100'} overflow-hidden relative`}>
                <div 
                  className={`h-full absolute left-0 top-0 transition-all duration-1000 ${
                    showSkeleton ? 'bg-slate-500 animate-pulse' : 'bg-orange-500'
                  }`} 
                  style={{ width: showSkeleton ? '50%' : `${Math.min(100, lifestyleRatio)}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Victory (Lime Green represents distinct victory) */}
          <div className={`group relative overflow-hidden p-3 flex flex-col justify-between h-full transition-all duration-300 ${
            dm ? 'bg-slate-900 hover:bg-slate-900/90' : 'bg-white hover:bg-slate-50/50'
          } ${dailyVictory >= 0 ? 'border-l-2 border-l-lime-500' : 'border-l-2 border-l-rose-500'}`}>
            <div className={`absolute -right-3 -bottom-3 opacity-[0.03] dark:opacity-[0.05] transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12 pointer-events-none ${
              dailyVictory >= 0 ? 'text-lime-500' : 'text-rose-500'
            }`}>
              <Award size={72} />
            </div>

            <span className={`text-[9px] font-black uppercase tracking-wider ${labelColorClass} mb-1`}>
              เงินคงเหลือรายวัน (Victory)
            </span>
            
            <div className="mt-auto z-10">
              {showSkeleton ? (
                <Shimmer className="h-6 w-20" dm={dm} />
              ) : (
                <div className={`text-lg font-black tabular-nums leading-none ${
                  dailyVictory >= 0 ? (dm ? 'text-lime-400' : 'text-lime-600') : (dm ? 'text-rose-400' : 'text-rose-700')
                }`}>
                  ฿{formatMoney(dailyVictory)}
                </div>
              )}
              <div className={`text-[9px] font-bold opacity-60 mt-1.5 leading-none ${mutedTextColorClass}`}>
                {dailyVictory >= 0 ? 'กำไรสะสมรายวัน' : 'ขาดทุนสะสมรายวัน'}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Key Metrics */}
      <div className="col-span-5 flex flex-col">
        <SectionHeader icon={Scale} title="ข้อมูลสำคัญ" dm={dm} />
        <div className={`grid grid-cols-3 gap-px p-px flex-1 ${dm ? 'bg-slate-800/60' : 'bg-slate-200/60'}`}>
          
          {/* Food Ratio (Amber/Yellow) */}
          <div className={`group relative overflow-hidden p-3 flex flex-col justify-between h-full transition-all duration-300 ${
            dm ? 'bg-slate-900 hover:bg-slate-900/90' : 'bg-white hover:bg-slate-50/50'
          } border-l-2 border-l-amber-500`}>
            <div className={`absolute -right-3 -bottom-3 opacity-[0.03] dark:opacity-[0.05] transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12 pointer-events-none ${
              dm ? 'text-amber-400' : 'text-amber-700'
            }`}>
              <UtensilsCrossed size={72} />
            </div>

            <span className={`text-[9px] font-black uppercase tracking-wider ${labelColorClass} mb-1`}>
              สัดส่วนค่าอาหาร
            </span>
            
            <div className="mt-auto z-10">
              {showSkeleton ? (
                <Shimmer className="h-6 w-12" dm={dm} />
              ) : (
                <div className={`text-lg font-black leading-none ${dm ? 'text-amber-400' : 'text-amber-600'}`}>
                  {foodPercentage}%
                </div>
              )}
              <div className={`text-[9px] font-bold opacity-60 mt-1.5 leading-none ${mutedTextColorClass}`}>
                ของรายจ่ายทั้งหมด
              </div>
            </div>
          </div>

          {/* Average Food Daily (Orange/Peach) */}
          <div className={`group relative overflow-hidden p-3 flex flex-col justify-between h-full transition-all duration-300 ${
            dm ? 'bg-slate-900 hover:bg-slate-900/90' : 'bg-white hover:bg-slate-50/50'
          } border-l-2 border-l-orange-400`}>
            <div className={`absolute -right-3 -bottom-3 opacity-[0.03] dark:opacity-[0.05] transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12 pointer-events-none ${
              dm ? 'text-orange-450' : 'text-orange-700'
            }`}>
              <UtensilsCrossed size={72} />
            </div>

            <span className={`text-[9px] font-black uppercase tracking-wider ${labelColorClass} mb-1`}>
              กินเฉลี่ย/วัน
            </span>
            
            <div className="mt-auto z-10">
              {showSkeleton ? (
                <Shimmer className="h-6 w-16" dm={dm} />
              ) : (
                <div className={`text-lg font-black tabular-nums leading-none ${dm ? 'text-orange-400' : 'text-orange-600'}`}>
                  ฿{formatMoney(foodDailyAvg)}
                </div>
              )}
              <div className={`text-[9px] font-bold opacity-60 mt-1.5 leading-none ${mutedTextColorClass}`}>
                ค่าอาหารรายวัน
              </div>
            </div>
          </div>

          {/* Average Daily Expense (Pink/Fuchsia burn representation) */}
          <div className={`group relative overflow-hidden p-3 flex flex-col justify-between h-full transition-all duration-300 ${
            dm ? 'bg-slate-900 hover:bg-slate-900/90' : 'bg-white hover:bg-slate-50/50'
          } border-l-2 border-l-pink-500`}>
            <div className={`absolute -right-3 -bottom-3 opacity-[0.03] dark:opacity-[0.05] transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12 pointer-events-none ${
              dm ? 'text-pink-455' : 'text-pink-700'
            }`}>
              <TrendingDown size={72} />
            </div>

            <span className={`text-[9px] font-black uppercase tracking-wider ${labelColorClass} mb-1`}>
              รายจ่ายเฉลี่ย/วัน
            </span>
            
            <div className="mt-auto z-10">
              {showSkeleton ? (
                <Shimmer className="h-6 w-16" dm={dm} />
              ) : (
                <div className={`text-lg font-black tabular-nums leading-none ${dm ? 'text-pink-400' : 'text-pink-600'}`}>
                  ฿{formatMoney(dailyAvg)}
                </div>
              )}
              <div className={`text-[9px] font-bold opacity-60 mt-1.5 leading-none ${mutedTextColorClass}`}>
                รายจ่ายเฉลี่ยรวม
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

/**
 * SECTION 3: FORECAST (Opt-in predictions styled with glowing gradients and thicker indicators)
 */
const SummaryForecasting = ({ analytics, dm, showSkeleton }) => {
  const {
    showForecasting, projectedExpense, safeToSpend, projectedSurplus
  } = analytics;

  if (!showForecasting) return null;

  // Consistent neutral label colors
  const labelColorClass = dm ? 'text-slate-400' : 'text-slate-550';

  return (
    <div className={`flex flex-col border-t border-dashed ${dm ? 'border-slate-800/80' : 'border-slate-200'}`}>
      <SectionHeader icon={TrendingUp} title="พยากรณ์สิ้นเดือน" dm={dm} />
      <div className={`grid grid-cols-3 gap-px p-px ${dm ? 'bg-slate-800/60' : 'bg-slate-200/60'}`}>
        
        {/* Projected Expense (Indigo) */}
        <div className={`group relative overflow-hidden p-3.5 flex items-center justify-between transition-all duration-300 border-l-[3px] border-l-indigo-500 ${
          dm 
            ? 'bg-indigo-950/20 hover:bg-indigo-950/30 group-hover:bg-gradient-to-br group-hover:from-indigo-500/[0.08]' 
            : 'bg-indigo-50/25 hover:bg-indigo-50/50 group-hover:bg-gradient-to-br group-hover:from-indigo-500/[0.04]'
        }`}>
          <div className="z-10">
            <span className={`text-[9px] font-black uppercase tracking-wider ${labelColorClass}`}>
              รายจ่ายเดือนนี้ (พยากรณ์)
            </span>
            {showSkeleton ? (
              <Shimmer className="h-6 w-24 mt-1.5" dm={dm} />
            ) : (
              <div className={`text-xl font-black tabular-nums tracking-tight leading-none mt-1.5 ${dm ? 'text-indigo-400' : 'text-indigo-650'}`}>
                <AnimatedNumber value={projectedExpense} />
              </div>
            )}
          </div>
          <div className={`absolute -right-3 -bottom-3 opacity-[0.06] dark:opacity-[0.09] transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12 pointer-events-none ${
            dm ? 'text-indigo-450' : 'text-indigo-600'
          }`}>
            <TrendingUp size={76} />
          </div>
        </div>

        {/* Safe to Spend (Teal/Cyan) */}
        <div className={`group relative overflow-hidden p-3.5 flex items-center justify-between transition-all duration-300 ${
          safeToSpend > 300 
            ? (dm 
                ? 'bg-emerald-950/15 hover:bg-emerald-950/25 group-hover:bg-gradient-to-br group-hover:from-teal-500/[0.08]' 
                : 'bg-emerald-50/20 hover:bg-emerald-50/45 group-hover:bg-gradient-to-br group-hover:from-teal-500/[0.04]')
            : (dm 
                ? 'bg-rose-950/15 hover:bg-rose-950/25 group-hover:bg-gradient-to-br group-hover:from-rose-500/[0.08]' 
                : 'bg-rose-50/20 hover:bg-rose-50/45 group-hover:bg-gradient-to-br group-hover:from-rose-500/[0.04]')
        } ${safeToSpend > 300 ? 'border-l-[3px] border-l-teal-500' : 'border-l-[3px] border-l-rose-500'}`}>
          <div className="z-10">
            <span className={`text-[9px] font-black uppercase tracking-wider ${labelColorClass}`}>
              งบใช้จ่ายรายวัน (Safe)
            </span>
            {showSkeleton ? (
              <Shimmer className="h-6 w-24 mt-1.5" dm={dm} />
            ) : (
              <div className={`text-xl font-black tabular-nums tracking-tight leading-none mt-1.5 ${
                safeToSpend > 300 ? (dm ? 'text-teal-400' : 'text-teal-600') : (dm ? 'text-rose-400' : 'text-rose-600')
              }`}>
                <AnimatedNumber value={safeToSpend} />
              </div>
            )}
          </div>
          <div className={`absolute -right-3 -bottom-3 opacity-[0.06] dark:opacity-[0.09] transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12 pointer-events-none ${
            safeToSpend > 300 ? 'text-teal-450' : 'text-rose-455'
          }`}>
            <Zap size={76} />
          </div>
        </div>

        {/* Projected Surplus (Purple/Violet) */}
        <div className={`group relative overflow-hidden p-3.5 flex items-center justify-between transition-all duration-300 border-l-[3px] border-l-purple-500 ${
          dm 
            ? 'bg-purple-950/20 hover:bg-purple-950/30 group-hover:bg-gradient-to-br group-hover:from-purple-500/[0.08]' 
            : 'bg-purple-50/25 hover:bg-purple-50/50 group-hover:bg-gradient-to-br group-hover:from-purple-500/[0.04]'
        }`}>
          <div className="z-10">
            <span className={`text-[9px] font-black uppercase tracking-wider ${labelColorClass}`}>
              เงินเหลือรอจัดสรร (Surplus)
            </span>
            {showSkeleton ? (
              <Shimmer className="h-6 w-24 mt-1.5" dm={dm} />
            ) : (
              <div className={`text-xl font-black tabular-nums tracking-tight leading-none mt-1.5 ${dm ? 'text-purple-400' : 'text-purple-600'}`}>
                <AnimatedNumber value={projectedSurplus} />
              </div>
            )}
          </div>
          <div className={`absolute -right-3 -bottom-3 opacity-[0.06] dark:opacity-[0.09] transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12 pointer-events-none ${
            dm ? 'text-purple-450' : 'text-purple-600'
          }`}>
            <Layers size={76} />
          </div>
        </div>

      </div>
    </div>
  );
};

/**
 * SummaryCards - The mission control center for financial vitals.
 */
export default function SummaryCards() {
  const { analytics, dm, showSkeleton } = useDashboardContext();

  if (!analytics) return null;

  return (
    <div className={`w-full flex flex-col rounded-sm overflow-hidden border shadow-sm transition-colors ${
      dm ? 'bg-slate-900 border-slate-800/80' : 'bg-white border-slate-205'
    }`}>
      <SummaryVitals analytics={analytics} dm={dm} showSkeleton={showSkeleton} />
      <SummaryStrategic analytics={analytics} dm={dm} showSkeleton={showSkeleton} />
      <SummaryForecasting analytics={analytics} dm={dm} showSkeleton={showSkeleton} />
    </div>
  );
}
