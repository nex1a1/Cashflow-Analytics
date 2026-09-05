// src/views/Dashboard/components/SummaryCards.jsx
import React, { memo } from 'react';
import { 
  Activity, Wallet, Target, Scale, UtensilsCrossed,
  TrendingUp, Zap, Layers, Home, Award, TrendingDown, Navigation,
  ShieldCheck, Gauge
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
function getFoodIncomeStatus(pct) {
  const num = Number.parseFloat(pct) || 0;
  if (num <= 20) {
    return { label: 'สมดุลดี', cls: 'text-emerald-400 border-emerald-400/30' };
  }
  if (num <= 30) {
    return { label: 'ปานกลาง', cls: 'text-amber-400 border-amber-400/30' };
  }
  return { label: 'สัดส่วนสูง', cls: 'text-rose-400 border-rose-400/30' };
}

const StrategicRentCard = memo(({ rentPercentageNum, rentTotal, rentSub, showSkeleton }) => {
  let rentBarBg = 'bg-sky-500';
  if (showSkeleton) {
    rentBarBg = 'bg-slate-700 animate-pulse';
  } else if (rentPercentageNum > 30) {
    rentBarBg = 'bg-[#da291c]';
  }

  return (
    <div className={`group relative overflow-hidden p-3.5 flex flex-col justify-between h-full min-h-[150px] bg-[#181818] hover:bg-[#1c1c1c] transition-none border-l-2 ${
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
        
        {!showSkeleton && (
          <div className="my-auto py-1 border-y border-neutral-800/60 flex items-center justify-between text-[9px] font-bold text-neutral-500">
            <span>เกณฑ์แนะนำ</span>
            <span className="text-sky-400 font-extrabold">&lt; 30% ของรายรับ</span>
          </div>
        )}
        
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
              className={`h-full absolute left-0 top-0 transition-none ${rentBarBg}`} 
              style={{ width: showSkeleton ? '50%' : `${Math.min(100, rentPercentageNum)}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Hover Breakdown Overlay */}
      {!showSkeleton && rentSub && (
      <div className="absolute inset-0 p-2 bg-[#181818]/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-none pointer-events-none z-20 flex flex-col justify-start">
        <div className="text-[9px] font-black uppercase tracking-wider text-neutral-400 border-b border-[#303030] pb-1 flex justify-between items-center shrink-0 gap-1">
          <span className="truncate">รายละเอียดที่พัก</span>
          <span className="text-sky-400 font-extrabold text-[8px] border border-sky-400/30 px-1.5 py-0.5 rounded-none leading-none whitespace-nowrap shrink-0">4 หมวด</span>
        </div>
        
        <div className="flex-1 grid grid-cols-2 gap-[1px] bg-neutral-800/50 mt-1 overflow-hidden">
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-sky-300 uppercase tracking-wide flex items-center gap-1">
              <span>🏢</span> ค่าเช่า
            </span>
            <span className="text-[13px] font-black text-sky-400 tabular-nums">฿{formatMoney(rentSub.rent)}</span>
          </div>
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1">
              <span>⚡</span> ค่าไฟ
            </span>
            <span className="text-[13px] font-black text-amber-400 tabular-nums">฿{formatMoney(rentSub.electricity)}</span>
          </div>
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wide flex items-center gap-1">
              <span>🌐</span> ค่าเน็ต
            </span>
            <span className="text-[13px] font-black text-indigo-400 tabular-nums">฿{formatMoney(rentSub.internet)}</span>
          </div>
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-cyan-300 uppercase tracking-wide flex items-center gap-1">
              <span>💧</span> ค่าน้ำ
            </span>
            <span className="text-[13px] font-black text-cyan-400 tabular-nums">฿{formatMoney(rentSub.water)}</span>
          </div>
        </div>
      </div>
    )}
  </div>
);
});

StrategicRentCard.displayName = 'StrategicRentCard';

const StrategicLifestyleCard = memo(({ lifestyleRatio, variableTotal, topWantCategories, showSkeleton }) => (
  <div className={`group relative overflow-hidden p-3.5 flex flex-col justify-between h-full min-h-[150px] bg-[#181818] hover:bg-[#1d1d1d] transition-none border-l-2 ${
    lifestyleRatio > 35 ? 'border-l-[#da291c]' : 'border-l-orange-500'
  }`}>
    <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-neutral-700">
      <Zap size={72} />
    </div>

    {/* Original Content (Blurs and fades on hover) */}
    <div className="flex-1 flex flex-col justify-between w-full h-full transition-none group-hover:blur-[1.5px] group-hover:opacity-20">
      <span className="text-[9px] font-black uppercase tracking-[0.12em] text-neutral-400 mb-1">
        ดัชนีฟุ่มเฟือย (Want Ratio)
      </span>
      
      {!showSkeleton && (
        <div className="my-auto py-1 border-y border-neutral-800/60 flex items-center justify-between text-[9px] font-bold text-neutral-500">
          <span>เกณฑ์แนะนำ</span>
          <span className="text-orange-400 font-extrabold">&lt; 30% ของรายรับ</span>
        </div>
      )}
      
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

    {/* Hover Breakdown Overlay */}
    {!showSkeleton && (
      <div className="absolute inset-0 p-2 bg-[#181818]/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-none pointer-events-none z-20 flex flex-col justify-start">
        <div className="text-[9px] font-black uppercase tracking-wider text-neutral-400 border-b border-[#303030] pb-1 flex justify-between items-center shrink-0 gap-1">
          <span className="truncate">หมวดฟุ่มเฟือย Top 4</span>
          <span className="text-orange-400 font-extrabold text-[8px] border border-orange-400/30 px-1.5 py-0.5 rounded-none leading-none whitespace-nowrap shrink-0">Top 4</span>
        </div>
        
        <div className="flex-1 grid grid-cols-2 gap-[1px] bg-neutral-800/50 mt-1 overflow-hidden">
          {topWantCategories && topWantCategories.length > 0 ? (
            topWantCategories.map(cat => (
              <div key={cat.id} className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
                <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-wide truncate flex items-center gap-1">
                  <span>{cat.icon}</span> {cat.name}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-[13px] font-black text-orange-400 tabular-nums">฿{formatMoney(cat.amount)}</span>
                  <span className="text-[9px] font-bold text-neutral-500">({cat.pctOfWant}%)</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 bg-[#181818] p-2 text-center text-[9px] text-neutral-500 flex items-center justify-center">
              ไม่มีข้อมูลฟุ่มเฟือย
            </div>
          )}
        </div>
      </div>
    )}
  </div>
));

StrategicLifestyleCard.displayName = 'StrategicLifestyleCard';

const StrategicVictoryCard = memo(({ dailyVictory, periodDays, dailyIncome, dailyFixed, dailyVariable, dailySavings, showSkeleton }) => (
  <div className={`group relative overflow-hidden p-3.5 flex flex-col justify-between h-full min-h-[150px] bg-[#181818] hover:bg-[#1d1d1d] transition-none border-l-2 ${
    dailyVictory >= 0 ? 'border-l-lime-500' : 'border-l-[#da291c]'
  }`}>
    <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-neutral-700">
      <Award size={72} />
    </div>

    {/* Original Content (Blurs and fades on hover) */}
    <div className="flex-1 flex flex-col justify-between w-full h-full transition-none group-hover:blur-[1.5px] group-hover:opacity-20">
      <span className="text-[9px] font-black uppercase tracking-[0.12em] text-neutral-400 mb-1">
        เงินเหลือรายวัน (Victory)
      </span>
      
      {!showSkeleton && (
        <div className="my-auto py-1 border-y border-neutral-800/60 flex items-center justify-between text-[9px] font-bold text-neutral-500">
          <span>ระยะเวลาคำนวณ</span>
          <span className="text-lime-400 font-extrabold">{periodDays} วันในงวด</span>
        </div>
      )}
      
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

    {/* Hover Breakdown Overlay */}
    {!showSkeleton && (
      <div className="absolute inset-0 p-2 bg-[#181818]/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-none pointer-events-none z-20 flex flex-col justify-start">
        <div className="text-[9px] font-black uppercase tracking-wider text-neutral-400 border-b border-[#303030] pb-1 flex justify-between items-center shrink-0 gap-1">
          <span className="truncate">โครงสร้างรายวัน</span>
          <span className={`font-extrabold text-[8px] border px-1.5 py-0.5 rounded-none leading-none whitespace-nowrap shrink-0 ${
            dailyVictory >= 0 ? 'text-lime-400 border-lime-400/30' : 'text-[#da291c] border-[#da291c]/30'
          }`}>เฉลี่ย {periodDays} วัน</span>
        </div>
        
        <div className="flex-1 grid grid-cols-2 gap-[1px] bg-neutral-800/50 mt-1 overflow-hidden">
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide">📥 รับ/วัน</span>
            <span className="text-[13px] font-black text-emerald-400 tabular-nums">฿{formatMoney(dailyIncome)}</span>
          </div>
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wide">🔒 จำเป็น/วัน</span>
            <span className="text-[13px] font-black text-rose-400 tabular-nums">฿{formatMoney(dailyFixed)}</span>
          </div>
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide">🎯 ตามใจ/วัน</span>
            <span className="text-[13px] font-black text-amber-400 tabular-nums">฿{formatMoney(dailyVariable)}</span>
          </div>
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-sky-400 uppercase tracking-wide">🏦 ออม/วัน</span>
            <span className="text-[13px] font-black text-sky-400 tabular-nums">฿{formatMoney(dailySavings)}</span>
          </div>
        </div>
      </div>
    )}
  </div>
));

StrategicVictoryCard.displayName = 'StrategicVictoryCard';

const StrategicFoodRatioCard = memo(({ foodPercentage, foodPctOfIncome, foodTotal, showSkeleton }) => {
  const foodStatus = getFoodIncomeStatus(foodPctOfIncome);

  return (
    <div className="group relative overflow-hidden p-3.5 flex flex-col justify-between h-full min-h-[150px] bg-[#181818] hover:bg-[#1d1d1d] transition-none border-l-2 border-l-amber-500">
      <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-neutral-700">
        <UtensilsCrossed size={72} />
      </div>

      {/* Original Content (Blurs and fades on hover) */}
      <div className="flex-1 flex flex-col justify-between w-full h-full transition-none group-hover:blur-[1.5px] group-hover:opacity-20">
        <span className="text-[9px] font-black uppercase tracking-[0.12em] text-neutral-400 mb-1">
          สัดส่วนค่าอาหาร
        </span>
        
        {!showSkeleton && (
          <div className="my-auto py-1 border-y border-neutral-800/60 flex items-center justify-between text-[9px] font-bold text-neutral-500">
            <span>เกณฑ์สัดส่วน</span>
            <span className="text-amber-400 font-extrabold">&lt; 25% ของรายจ่าย</span>
          </div>
        )}
        
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

      {/* Hover Breakdown Overlay */}
      {!showSkeleton && (
        <div className="absolute inset-0 p-2 bg-[#181818]/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-none pointer-events-none z-20 flex flex-col justify-start">
          <div className="text-[9px] font-black uppercase tracking-wider text-neutral-400 border-b border-[#303030] pb-1 flex justify-between items-center shrink-0 gap-1">
            <span className="truncate">เจาะลึกงบอาหาร</span>
            <span className={`font-extrabold text-[8px] border px-1.5 py-0.5 rounded-none leading-none whitespace-nowrap shrink-0 ${foodStatus.cls}`}>
              {foodStatus.label}
            </span>
          </div>
          
          <div className="flex-1 grid grid-cols-2 gap-[1px] bg-neutral-800/50 mt-1 overflow-hidden">
            <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide">📊 % รายรับ</span>
              <span className="text-[13px] font-black text-emerald-400 tabular-nums">{foodPctOfIncome}%</span>
            </div>
            <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
              <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wide">📉 % รายจ่าย</span>
              <span className="text-[13px] font-black text-rose-400 tabular-nums">{foodPercentage}%</span>
            </div>
            <div className="col-span-2 bg-[#181818] p-1.5 flex flex-col justify-center text-left">
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide">🍽️ รวมค่าอาหาร</span>
              <span className="text-[13px] font-black text-amber-400 tabular-nums">฿{formatMoney(foodTotal)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

StrategicFoodRatioCard.displayName = 'StrategicFoodRatioCard';

const StrategicFoodDailyCard = memo(({ foodDailyAvg, foodTotal, foodWorkdayAvg, foodHolidayAvg, maxFoodDayAmount, showSkeleton }) => (
  <div className="group relative overflow-hidden p-3.5 flex flex-col justify-between h-full min-h-[150px] bg-[#181818] hover:bg-[#1d1d1d] transition-none border-l-2 border-l-orange-400">
    <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-neutral-700">
      <UtensilsCrossed size={72} />
    </div>

    {/* Original Content (Blurs and fades on hover) */}
    <div className="flex-1 flex flex-col justify-between w-full h-full transition-none group-hover:blur-[1.5px] group-hover:opacity-20">
      <span className="text-[9px] font-black uppercase tracking-[0.12em] text-neutral-400 mb-1">
        กินเฉลี่ย/วัน
      </span>
      
      {!showSkeleton && (
        <div className="my-auto py-1 border-y border-neutral-800/60 flex items-center justify-between text-[9px] font-bold text-neutral-500">
          <span>งบกินรวม</span>
          <span className="text-orange-400 font-extrabold tabular-nums">฿{formatMoney(foodTotal)}</span>
        </div>
      )}
      
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

    {/* Hover Breakdown Overlay */}
    {!showSkeleton && (
      <div className="absolute inset-0 p-2 bg-[#181818]/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-none pointer-events-none z-20 flex flex-col justify-start">
        <div className="text-[9px] font-black uppercase tracking-wider text-neutral-400 border-b border-[#303030] pb-1 flex justify-between items-center shrink-0 gap-1">
          <span className="truncate">พฤติกรรมการกิน</span>
          <span className="text-orange-400 font-extrabold text-[8px] border border-orange-400/30 px-1.5 py-0.5 rounded-none leading-none whitespace-nowrap shrink-0">ทำงาน vs หยุด</span>
        </div>
        
        <div className="flex-1 grid grid-cols-2 gap-[1px] bg-neutral-800/50 mt-1 overflow-hidden">
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-sky-400 uppercase tracking-wide">💼 วันทำงาน</span>
            <span className="text-[13px] font-black text-sky-400 tabular-nums">฿{formatMoney(foodWorkdayAvg)}</span>
          </div>
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wide">🏖️ วันหยุด</span>
            <span className="text-[13px] font-black text-orange-400 tabular-nums">฿{formatMoney(foodHolidayAvg)}</span>
          </div>
          <div className="col-span-2 bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wide">🏆 พีคสูงสุดใน 1 วัน</span>
            <span className="text-[13px] font-black text-rose-400 tabular-nums">฿{formatMoney(maxFoodDayAmount)}</span>
          </div>
        </div>
      </div>
    )}
  </div>
));

StrategicFoodDailyCard.displayName = 'StrategicFoodDailyCard';

const StrategicDailyExpenseCard = memo(({ dailyAvg, totalExpense, dailyWorkdayAvg, dailyHolidayAvg, dailyFixed, dailyVariable, showSkeleton }) => (
  <div className="group relative overflow-hidden p-3.5 flex flex-col justify-between h-full min-h-[150px] bg-[#181818] hover:bg-[#1d1d1d] transition-none border-l-2 border-l-[#da291c]">
    <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-neutral-700">
      <TrendingDown size={72} />
    </div>

    {/* Original Content (Blurs and fades on hover) */}
    <div className="flex-1 flex flex-col justify-between w-full h-full transition-none group-hover:blur-[1.5px] group-hover:opacity-20">
      <span className="text-[9px] font-black uppercase tracking-[0.12em] text-neutral-400 mb-1">
        รายจ่ายเฉลี่ย/วัน
      </span>
      
      {!showSkeleton && (
        <div className="my-auto py-1 border-y border-neutral-800/60 flex items-center justify-between text-[9px] font-bold text-neutral-500">
          <span>ยอดจ่ายรวม</span>
          <span className="text-rose-400 font-extrabold tabular-nums">฿{formatMoney(totalExpense)}</span>
        </div>
      )}
      
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

    {/* Hover Breakdown Overlay */}
    {!showSkeleton && (
      <div className="absolute inset-0 p-2 bg-[#181818]/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-none pointer-events-none z-20 flex flex-col justify-start">
        <div className="text-[9px] font-black uppercase tracking-wider text-neutral-400 border-b border-[#303030] pb-1 flex justify-between items-center shrink-0 gap-1">
          <span className="truncate">อัตราจ่ายรายวัน</span>
          <span className="text-rose-400 font-extrabold text-[8px] border border-rose-400/30 px-1.5 py-0.5 rounded-none leading-none whitespace-nowrap shrink-0">ทำงาน vs หยุด</span>
        </div>
        
        <div className="flex-1 grid grid-cols-2 gap-[1px] bg-neutral-800/50 mt-1 overflow-hidden">
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-sky-400 uppercase tracking-wide">💼 วันทำงาน</span>
            <span className="text-[13px] font-black text-sky-400 tabular-nums">฿{formatMoney(dailyWorkdayAvg)}</span>
          </div>
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wide">🏖️ วันหยุด</span>
            <span className="text-[13px] font-black text-rose-400 tabular-nums">฿{formatMoney(dailyHolidayAvg)}</span>
          </div>
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">🔒 จำเป็น/วัน</span>
            <span className="text-[13px] font-black text-neutral-300 tabular-nums">฿{formatMoney(dailyFixed)}</span>
          </div>
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide">🎯 ตามใจ/วัน</span>
            <span className="text-[13px] font-black text-amber-400 tabular-nums">฿{formatMoney(dailyVariable)}</span>
          </div>
        </div>
      </div>
    )}
  </div>
));

StrategicDailyExpenseCard.displayName = 'StrategicDailyExpenseCard';

/**
 * SECTION 2: STRATEGIC & KEY METRICS (Commitment, Velocity, Food Metrics)
 */
const SummaryStrategic = memo(({ analytics, showSkeleton }) => {
  const {
    totalIncome, totalSavings, netCashflow,
    dailyAvg, foodPercentage, foodTotal, foodDailyAvg, foodPctOfIncome,
    foodWorkdayAvg, foodHolidayAvg, dailyWorkdayAvg, dailyHolidayAvg, maxFoodDayAmount,
    variableTotal, fixedTotal, topWantCategories,
    rentPercentage, rentTotal, rentSub, datesInPeriod
  } = analytics;

  const periodDays = Math.max(1, datesInPeriod?.length || 1);
  const totalExpense = fixedTotal + variableTotal;
  const dailyVictory = netCashflow / periodDays;
  const dailyIncome = totalIncome / periodDays;
  const dailyFixed = fixedTotal / periodDays;
  const dailyVariable = variableTotal / periodDays;
  const dailySavings = totalSavings / periodDays;

  // Safely parse decimals to numbers for stable evaluation
  const rentPercentageNum = Number.parseFloat(rentPercentage) || 0;

  // Lifestyle Ratio: (Wants / Total Income)
  const lifestyleRatio = totalIncome > 0 ? ((variableTotal / totalIncome) * 100) : 0;

  return (
    <div className="grid grid-cols-12 items-stretch gap-px bg-[#2d2d2d]">
      
      {/* Strategic Analysis */}
      <div className="col-span-7 flex flex-col">
        <SectionHeader icon={Target} title="วิเคราะห์กลยุทธ์ (Strategic Analysis)" />
        <div className="grid grid-cols-3 gap-[1px] bg-[#2d2d2d] flex-1">
          <StrategicRentCard
            rentPercentageNum={rentPercentageNum}
            rentTotal={rentTotal}
            rentSub={rentSub}
            showSkeleton={showSkeleton}
          />
          <StrategicLifestyleCard
            lifestyleRatio={lifestyleRatio}
            variableTotal={variableTotal}
            topWantCategories={topWantCategories}
            showSkeleton={showSkeleton}
          />
          <StrategicVictoryCard
            dailyVictory={dailyVictory}
            periodDays={periodDays}
            dailyIncome={dailyIncome}
            dailyFixed={dailyFixed}
            dailyVariable={dailyVariable}
            dailySavings={dailySavings}
            showSkeleton={showSkeleton}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="col-span-5 flex flex-col">
        <SectionHeader icon={Scale} title="ข้อมูลสำคัญ (Metrics)" />
        <div className="grid grid-cols-3 gap-[1px] bg-[#2d2d2d] flex-1">
          <StrategicFoodRatioCard
            foodPercentage={foodPercentage}
            foodPctOfIncome={foodPctOfIncome}
            foodTotal={foodTotal}
            showSkeleton={showSkeleton}
          />
          <StrategicFoodDailyCard
            foodDailyAvg={foodDailyAvg}
            foodTotal={foodTotal}
            foodWorkdayAvg={foodWorkdayAvg}
            foodHolidayAvg={foodHolidayAvg}
            maxFoodDayAmount={maxFoodDayAmount}
            showSkeleton={showSkeleton}
          />
          <StrategicDailyExpenseCard
            dailyAvg={dailyAvg}
            totalExpense={totalExpense}
            dailyWorkdayAvg={dailyWorkdayAvg}
            dailyHolidayAvg={dailyHolidayAvg}
            dailyFixed={dailyFixed}
            dailyVariable={dailyVariable}
            showSkeleton={showSkeleton}
          />
        </div>
      </div>

    </div>
  );
});

/**
 * SECTION 3: FORECAST (Opt-in predictions & Elite Safe Zone Center)
 */
const SummaryForecasting = memo(({ analytics, showSkeleton }) => {
  const {
    showForecasting, projectedExpense, safeToSpend, projectedSurplus, forecastingDetails
  } = analytics;

  if (!showForecasting) return null;

  const details = forecastingDetails || {};
  const currentDay = details.currentDay || 1;
  const lastDayOfMonth = details.lastDayOfMonth || 30;
  const remainingDays = details.remainingDays || 0;
  const monthProgressPct = details.monthProgressPct || 0;
  const fixedTotal = details.fixedTotal || 0;
  const variableUpToToday = details.variableUpToToday || 0;
  const projectedVariableRemaining = details.projectedVariableRemaining || 0;
  const actualDailyVariableAvg = details.actualDailyVariableAvg || 0;
  const projectedSurplusPct = details.projectedSurplusPct || 0;
  const maxAllowedExpense = details.maxAllowedExpense || 0;
  const requiredReduction = details.requiredReduction || 0;
  const requiredDailyReduction = details.requiredDailyReduction || 0;
  const paceStatus = details.paceStatus || { label: 'คุมงบได้ดี (On Track)', color: '#10b981', bg: 'bg-emerald-950/30' };
  const eomStatus = details.eomStatus || { label: 'โซนปลอดภัยสูง', color: '#10b981', bg: 'bg-emerald-950/40', border: 'border-emerald-500' };

  const headroom = safeToSpend - actualDailyVariableAvg;

  // Stacked Expense proportions
  const totalProj = Math.max(1, projectedExpense);
  const fixedPct = Math.min(100, Math.max(0, (fixedTotal / totalProj) * 100));
  const varSpentPct = Math.min(100, Math.max(0, (variableUpToToday / totalProj) * 100));
  const varRemPct = Math.min(100, Math.max(0, (projectedVariableRemaining / totalProj) * 100));

  // Daily Headroom pace ratio
  const safePaceRatio = safeToSpend > 0 ? Math.min(100, (actualDailyVariableAvg / safeToSpend) * 100) : 100;

  return (
    <div className="flex flex-col">
      {/* 1. Top Section Header with EOM Safety Grade */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#2d2d2d] bg-[#121212]/90">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-3.5 bg-[#da291c] shrink-0" />
          <TrendingUp className="w-4 h-4 text-neutral-300" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-neutral-100">
            พยากรณ์สิ้นเดือน (Projection & Safe Zone Center)
          </span>
        </div>
        <div className={`px-2.5 py-1 border text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 ${eomStatus.bg} ${eomStatus.border}`}
          style={{ color: eomStatus.color }}>
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>{eomStatus.label}</span>
        </div>
      </div>

      {/* 2. Burn-Rate & Calendar Pace Bar with Monthly Ceiling */}
      <div className="px-4 py-3 bg-[#151515] border-b border-[#2d2d2d] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-neutral-300 font-bold text-xs uppercase tracking-wider">
            <Gauge className="w-4 h-4 text-indigo-400" />
            <span>ความเร็วใช้จ่าย (Burn Pace):</span>
          </div>
          <span className="text-xs font-black uppercase px-2.5 py-0.5 border" style={{ backgroundColor: `${paceStatus.color}15`, color: paceStatus.color, borderColor: `${paceStatus.color}40` }}>
            {paceStatus.label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="text-xs text-neutral-300 font-mono bg-neutral-900 px-2 py-0.5 border border-neutral-800">
            เพดานงบรวมไม่ติดลบ: <span className="text-emerald-400 font-bold">฿{formatMoney(maxAllowedExpense)}</span>
          </div>
          <div className="text-xs text-neutral-300 font-mono">
            วันในเดือน: <span className="text-white font-bold">{currentDay}/{lastDayOfMonth}</span> ({monthProgressPct}%)
          </div>
          <div className="w-28 h-2 bg-neutral-800 rounded-none overflow-hidden relative border border-neutral-700/60">
            <div 
              className="h-full transition-all duration-300"
              style={{ 
                width: `${Math.min(100, monthProgressPct)}%`,
                backgroundColor: paceStatus.color 
              }} 
            />
          </div>
          <div className="text-xs text-neutral-300 font-mono">
            คงเหลือ <span className="text-neutral-100 font-bold">{remainingDays} วัน</span>
          </div>
        </div>
      </div>

      {/* 3. High-Density 3-Column HUD Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-[#2d2d2d]">
        
        {/* Card 1: พยากรณ์รายจ่ายเดือนนี้ (Projected Expense vs Monthly Ceiling) */}
        <div className="group relative overflow-hidden p-5 flex flex-col gap-4 bg-indigo-950/20 hover:bg-indigo-950/30 transition-none border-l-2 border-l-indigo-500">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-300">
                พยากรณ์รายจ่ายเดือนนี้
              </span>
              <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 border border-indigo-700/60">
                MONTHLY FORECAST
              </span>
            </div>
            {showSkeleton ? (
              <Shimmer className="h-8 w-32 mt-2" />
            ) : (
              <div>
                <div className="text-2xl lg:text-3xl font-black text-indigo-400 tabular-nums tracking-tight leading-none mt-2">
                  <AnimatedNumber value={projectedExpense} />
                </div>
                <div className="text-[11px] font-mono text-neutral-400 mt-1.5 flex items-center justify-between">
                  <span>เพดานงบทั้งเดือน (รายรับ):</span>
                  <span className="text-emerald-400 font-bold">฿{formatMoney(maxAllowedExpense)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Stacked Proportions Progress Bar */}
          <div className="space-y-1">
            <div className="h-1.5 w-full bg-neutral-800 flex overflow-hidden border border-indigo-900/40">
              <div style={{ width: `${fixedPct}%` }} className="bg-slate-400" title="Fixed" />
              <div style={{ width: `${varSpentPct}%` }} className="bg-indigo-500" title="Var Spent" />
              <div style={{ width: `${varRemPct}%` }} className="bg-indigo-800/80" title="Var Projected" />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-neutral-400">
              <span className="text-slate-300">ภาระคงที่ ({fixedPct.toFixed(0)}%)</span>
              <span className="text-indigo-300">จ่ายประจำวันแล้ว ({varSpentPct.toFixed(0)}%)</span>
              <span className="text-indigo-400">ประเมินรายวัน ({varRemPct.toFixed(0)}%)</span>
            </div>
          </div>

          {/* Math Breakdown: Exclusive home for expense components */}
          <div className="pt-3 border-t border-indigo-900/50 text-xs font-mono text-neutral-300 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">• ภาระคงที่/ที่พัก (Fixed/Rent):</span>
              <span className="text-white font-bold">฿{formatMoney(fixedTotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">• รายจ่ายประจำวันแล้ว ({currentDay} วัน):</span>
              <span className="text-white font-bold">฿{formatMoney(variableUpToToday)}</span>
            </div>
            <div className="flex justify-between items-center text-indigo-300">
              <span>• ประเมินรายวันคงเหลือ ({remainingDays} วัน):</span>
              <span className="font-bold">฿{formatMoney(projectedVariableRemaining)}</span>
            </div>
          </div>

          <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-indigo-500">
            <TrendingUp size={80} />
          </div>
        </div>

        {/* Card 2: งบเหลือใช้จ่ายรายวัน (Daily Spending Ceiling) */}
        <div className={`group relative overflow-hidden p-5 flex flex-col gap-4 transition-none border-l-2 ${
          safeToSpend > 300 
            ? 'bg-emerald-950/20 hover:bg-emerald-950/30 border-l-teal-500'
            : 'bg-red-950/20 hover:bg-red-950/30 border-l-[#da291c]'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-300">
                เพดานใช้วันละไม่เกิน (Safe to Spend)
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 border ${
                headroom >= 0 
                  ? 'text-teal-300 bg-teal-950/80 border-teal-700/60' 
                  : 'text-red-300 bg-red-950/80 border-red-700/60'
              }`}>
                {headroom >= 0 ? 'SAFE ZONE' : 'OVER PACED'}
              </span>
            </div>
            {showSkeleton ? (
              <Shimmer className="h-8 w-32 mt-2" />
            ) : (
              <div>
                <div className={`text-2xl lg:text-3xl font-black tabular-nums tracking-tight leading-none mt-2 ${
                  safeToSpend > 300 ? 'text-emerald-400' : 'text-[#da291c]'
                }`}>
                  <AnimatedNumber value={safeToSpend} />
                  <span className="text-sm text-neutral-400 ml-1 font-normal">/วัน</span>
                </div>
                <div className="text-[11px] font-mono text-neutral-400 mt-1.5">
                  เพดานงบรายวัน (รวมทุกหมวดประจำวัน) ห้ามเกินนี้
                </div>
              </div>
            )}
          </div>

          {/* Daily Headroom Gauge Bar */}
          <div className="space-y-1">
            <div className="h-1.5 w-full bg-neutral-800 overflow-hidden relative border border-neutral-700/60">
              <div 
                className={`h-full ${headroom >= 0 ? 'bg-teal-400' : 'bg-[#da291c]'}`}
                style={{ width: `${Math.min(100, safePaceRatio)}%` }} 
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-neutral-400">
              <span>อัตราใช้จริง: {safePaceRatio.toFixed(0)}% ของเพดาน</span>
              <span>อีก {remainingDays} วันที่เหลือ</span>
            </div>
          </div>

          {/* Math Breakdown: Exclusive home for daily pace & headroom */}
          <div className="pt-3 border-t border-neutral-800/80 text-xs font-mono text-neutral-300 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">• สปีดใช้จ่ายรายวันปัจจุบัน:</span>
              <span className="text-white font-bold">฿{formatMoney(actualDailyVariableAvg)}/วัน</span>
            </div>
            {headroom >= 0 ? (
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">• ส่วนต่างปลอดภัย (Headroom):</span>
                <span className="font-black text-emerald-400">+฿{formatMoney(headroom)}/วัน</span>
              </div>
            ) : (
              <div className="flex justify-between items-center text-amber-300 font-bold">
                <span>• ต้องปรับลดสปีดลงอีก:</span>
                <span>-฿{formatMoney(requiredDailyReduction)}/วัน</span>
              </div>
            )}
          </div>

          <div className={`absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none ${
            safeToSpend > 300 ? 'text-teal-500' : 'text-[#da291c]'
          }`}>
            <Zap size={80} />
          </div>
        </div>

        {/* Card 3: กระแสเงินสดสุทธิคาดการณ์ & เป้าหมายไม่ติดลบ (Projected Net Cashflow) */}
        <div className="group relative overflow-hidden p-5 flex flex-col gap-4 bg-purple-950/20 hover:bg-purple-950/30 transition-none border-l-2 border-l-purple-500">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-300">
                กระแสเงินสดสุทธิคาดการณ์
              </span>
              <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-950/80 px-2 py-0.5 border border-purple-700/60">
                EOM SURPLUS / DEFICIT
              </span>
            </div>
            {showSkeleton ? (
              <Shimmer className="h-8 w-32 mt-2" />
            ) : (
              <div className="text-2xl lg:text-3xl font-black text-purple-400 tabular-nums tracking-tight leading-none mt-2">
                <AnimatedNumber value={projectedSurplus} />
              </div>
            )}
          </div>

          {/* Retention Ratio Progress Bar */}
          <div className="space-y-1">
            <div className="h-1.5 w-full bg-neutral-800 overflow-hidden relative border border-purple-900/40">
              <div 
                className={`h-full ${projectedSurplus >= 0 ? 'bg-purple-500' : 'bg-[#da291c]'}`}
                style={{ width: `${Math.min(100, Math.max(0, projectedSurplusPct))}%` }} 
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-neutral-400">
              <span>เงินสดคงเหลือคาดการณ์:</span>
              <span className="text-purple-300 font-bold">{projectedSurplusPct}% ของรายรับ</span>
            </div>
          </div>

          {/* Math Breakdown: Exclusive home for income ceiling & break-even targets */}
          <div className="pt-3 border-t border-purple-900/50 text-xs font-mono text-neutral-300 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">• เพดานรายรับรวมทั้งเดือน:</span>
              <span className="text-purple-300 font-bold">฿{formatMoney(maxAllowedExpense)}</span>
            </div>
            {requiredReduction > 0 ? (
              <div className="flex justify-between items-center text-[#da291c] font-black border-t border-purple-900/30 pt-1">
                <span>• ต้องคุมรายจ่ายลงอีกรวม:</span>
                <span>-฿{formatMoney(requiredReduction)}</span>
              </div>
            ) : (
              <div className="flex justify-between items-center text-emerald-400 font-bold border-t border-purple-900/30 pt-1">
                <span>• อัตราเงินสดคงเหลือสะสม:</span>
                <span>+{projectedSurplusPct}%</span>
              </div>
            )}
          </div>

          <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-purple-500">
            <Layers size={80} />
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

