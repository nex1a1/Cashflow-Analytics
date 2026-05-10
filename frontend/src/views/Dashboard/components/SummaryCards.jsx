// src/views/Dashboard/components/SummaryCards.jsx
import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { 
  Flame, UtensilsCrossed, Home, 
  Scale, TrendingUp, Target, 
  Zap, Activity, ShieldCheck, 
  Anchor, Crosshair, Navigation, Ship
} from 'lucide-react';
import Sparkline from '../../../components/ui/Sparkline';
import { formatMoney } from '../../../utils/formatters';
import { useTheme } from '../../../context/ThemeContext';
import sharkLogo from '../../../logo/shark-white.svg';
import sharkBlack from '../../../logo/shark-black.svg';

// ─── Count-up Hook ────────────────────────────────────────────────────────────
function useCountUp(target, duration = 1000) {
  const [value, setValue] = useState(target);
  const rafRef = useRef(null);
  const prevTarget = useRef(target);

  useEffect(() => {
    const start = prevTarget.current ?? 0;
    if (start === target) return;
    prevTarget.current = target;
    const startTime = performance.now();
    const diff = target - start;
    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setValue(start + diff * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

// ─── Animated Money Display ───────────────────────────────────────────────────
function AnimatedMoney({ value, className }) {
  const animated = useCountUp(value);
  return <span className={className}>{formatMoney(animated)}</span>;
}

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, dm }) => (
  <div className={`px-4 py-2.5 border-b flex items-center gap-2 ${dm ? 'border-slate-700 bg-slate-800/80' : 'border-slate-100 bg-slate-50/50'}`}>
    <Icon className={`w-3.5 h-3.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`} />
    <span className={`text-[10px] font-black uppercase tracking-widest ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
      {title}
    </span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SummaryCards({ analytics }) {
  const { isDarkMode: dm } = useTheme();

  const {
    totalIncome, totalExpense, actualSavings, netCashflow, savingsRate,
    dailyAvg, foodDailyAvg, foodPercentage, rentTotal, rentPercentage,
    fixedPercentage, variablePercentage, fixedTotal, variableTotal,
    showForecasting, projectedExpense, safeToSpend, isSingleMonthView,
    sparklineIncome, sparklineExpense, datesInPeriod
  } = analytics;

  const periodDays = Math.max(1, datesInPeriod?.length || 1);
  const isNegativeNet = netCashflow < 0;

  // Strategic Ratios (The High-Signal Core)
  const commitmentRatio = totalIncome > 0 ? ((fixedTotal / totalIncome) * 100).toFixed(1) : 0;
  const lifestyleVelocity = totalIncome > 0 ? ((variableTotal / totalIncome) * 100).toFixed(1) : 0;
  const dailyVictory = netCashflow / periodDays;

  return (
    <div className={`rounded-sm border shadow-sm w-full h-full flex flex-col overflow-hidden transition-all duration-300 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      
      {/* ─── SECTION 1: VITALS (Top Row) ─── */}
      <SectionHeader icon={Activity} title="ภาพรวมสถานะการเงิน (Financial Overview)" dm={dm} />
      <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 divide-y md:divide-y-0 md:divide-x border-b transition-colors ${dm ? 'divide-slate-700 border-slate-700' : 'divide-slate-100 border-slate-100'}`}>
        
        {/* Card 1: Total Intake */}
        <div className="p-4 flex flex-col justify-center relative overflow-hidden group min-h-[100px]">
          <div className="relative z-10 min-w-0 pr-10">
            <div className="flex items-center gap-1.5 mb-1.5">
               <div className={`p-1 rounded-md ${dm ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                 <img src={dm ? sharkLogo : sharkBlack} alt="Logo" className="w-3.5 h-3.5 object-contain" />
               </div>
              <span className={`text-[10px] font-black uppercase tracking-wider ${dm ? 'text-slate-400' : 'text-slate-500'}`}>รายรับรวม (Total Income)</span>
            </div>
            <div className="flex items-baseline mt-1">
              <AnimatedMoney value={totalIncome} className={`text-xl 2xl:text-2xl font-black whitespace-nowrap ${dm ? 'text-white' : 'text-slate-900'}`} />
            </div>
          </div>
          {sparklineIncome && (
            <div className="absolute right-3 top-6 w-16 h-8 opacity-10 group-hover:opacity-100 transition-opacity pointer-events-none">
              <Sparkline data={sparklineIncome} color={dm ? "#38BDF8" : "#00509E"} />
            </div>
          )}
        </div>

        {/* Card 2: Fixed Expenses */}
        <div className="p-4 flex flex-col justify-between relative overflow-hidden group min-h-[100px]">
          <div className="relative z-10 min-w-0 pr-10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className={`p-1 rounded-md ${dm ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}><Anchor className="w-3.5 h-3.5" /></div>
              <span className={`text-[10px] font-black uppercase tracking-wider ${dm ? 'text-slate-400' : 'text-slate-500'}`}>รายจ่ายคงที่ (Fixed)</span>
            </div>
            <div className="flex items-baseline mt-1">
              <AnimatedMoney value={fixedTotal} className={`text-xl 2xl:text-2xl font-black whitespace-nowrap ${dm ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2 relative z-10">
             <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${dm ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'} whitespace-nowrap`}>
                รายจ่ายที่เลี่ยงไม่ได้
             </span>
          </div>
        </div>

        {/* Card 3: Variable Expenses */}
        <div className="p-4 flex flex-col justify-center relative overflow-hidden group min-h-[100px]">
          <div className="relative z-10 min-w-0 pr-10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className={`p-1 rounded-md ${dm ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'}`}><Crosshair className="w-3.5 h-3.5" /></div>
              <span className={`text-[10px] font-black uppercase tracking-wider ${dm ? 'text-slate-400' : 'text-slate-500'}`}>รายจ่ายผันแปร (Variable)</span>
            </div>
            <div className="flex items-baseline mt-1">
              <AnimatedMoney value={variableTotal} className={`text-xl 2xl:text-2xl font-black whitespace-nowrap ${dm ? 'text-rose-400' : 'text-rose-600'}`} />
            </div>
          </div>
          {sparklineExpense && (
            <div className="absolute right-3 top-6 w-16 h-8 opacity-10 group-hover:opacity-100 transition-opacity pointer-events-none">
              <Sparkline data={sparklineExpense} color="#EF4444" />
            </div>
          )}
        </div>

        {/* Card 4: Net Progress */}
        <div className="p-4 flex flex-col justify-between relative overflow-hidden group min-h-[100px]">
          <div className="relative z-10 min-w-0 pr-10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className={`p-1 rounded-md ${dm ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><Navigation className="w-3.5 h-3.5" /></div>
              <span className={`text-[10px] font-black uppercase tracking-wider ${dm ? 'text-slate-400' : 'text-slate-500'}`}>กระแสเงินสด (Net Cashflow)</span>
            </div>
            <div className="flex items-baseline mt-1">
              <AnimatedMoney value={netCashflow} className={`text-xl 2xl:text-2xl font-black whitespace-nowrap ${netCashflow >= 0 ? (dm ? 'text-emerald-400' : 'text-emerald-600') : 'text-rose-500'}`} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2 relative z-10">
             <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${netCashflow >= 0 ? (dm ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 text-rose-400') : (dm ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600')} whitespace-nowrap`}>
                {netCashflow >= 0 ? 'Surplus (คงเหลือ)' : 'Deficit (ติดลบ)'}
             </span>
          </div>
        </div>

        {/* Card 5: Efficiency */}
        <div className={`p-4 flex flex-col justify-between relative overflow-hidden min-h-[100px] ${isNegativeNet ? (dm ? 'bg-rose-500/[0.03]' : 'bg-rose-50/50') : ''}`}>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-1.5 gap-1.5">
              <div className="flex items-center gap-1.5">
                <div className={`p-1 rounded-md ${savingsRate >= 20 ? 'text-emerald-500 bg-emerald-500/10' : 'text-blue-500 bg-blue-500/10'}`}><ShieldCheck className="w-3.5 h-3.5" /></div>
                <span className={`text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${dm ? 'text-slate-400' : 'text-slate-500'}`}>สัดส่วนการออม</span>
              </div>
            </div>
            <div className="flex items-baseline mt-1">
               <span className={`text-xl 2xl:text-2xl font-black whitespace-nowrap ${savingsRate >= 20 ? 'text-emerald-500' : (dm ? 'text-blue-400' : 'text-blue-700')}`}>
                 {savingsRate}%
               </span>
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-1.5 mt-2">
             <span className={`flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full ${savingsRate >= 20 ? (dm ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (savingsRate > 0 ? (dm ? 'bg-amber-500/10 text-amber-500' : 'bg-amber-50 text-amber-600') : (dm ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'))}`}>
                เกรด {savingsRate >= 20 ? 'A+' : (savingsRate >= 10 ? 'B' : (savingsRate > 0 ? 'C' : 'F'))}
             </span>
          </div>
        </div>
      </div>

      {/* ─── SECTION 2: STRATEGIC RATIOS (Middle Row) ─── */}
      <SectionHeader icon={Target} title="วิเคราะห์สัดส่วนการเงิน (Financial Ratios)" dm={dm} />
      <div className={`flex-1 grid grid-cols-1 ${showForecasting ? 'lg:grid-cols-[1fr_1fr]' : ''} divide-y lg:divide-y-0 lg:divide-x border-b transition-colors ${dm ? 'divide-slate-700 border-slate-700 bg-slate-800/50' : 'divide-slate-100 border-slate-100 bg-slate-50/30'}`}>
        
        {/* Ratios */}
        <div className="p-4 flex flex-col justify-center gap-3 min-w-0">
           <div className={`grid grid-cols-3 gap-2`}>
              {/* Commitment Ratio */}
              <div className={`p-3 rounded-md border flex flex-col gap-1 min-w-0 ${dm ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                <span className={`text-[9px] font-black uppercase opacity-50 truncate flex items-center gap-1.5`}><Anchor className="w-2.5 h-2.5" /> ภาระค่าใช้จ่าย</span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-lg font-black ${dm ? 'text-purple-400' : 'text-purple-600'}`}>{commitmentRatio}%</span>
                  <span className="text-[7px] font-bold opacity-40 uppercase">ของรายรับ</span>
                </div>
                <div className={`w-full h-1 rounded-full ${dm ? 'bg-slate-800' : 'bg-slate-100'} overflow-hidden`}>
                   <div className="h-full bg-purple-500" style={{ width: `${Math.min(100, commitmentRatio)}%` }} />
                </div>
              </div>

              {/* Lifestyle Velocity */}
              <div className={`p-3 rounded-md border flex flex-col gap-1 min-w-0 ${dm ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                <span className={`text-[9px] font-black uppercase opacity-50 truncate flex items-center gap-1.5`}><Ship className="w-2.5 h-2.5" /> สัดส่วนใช้จ่ายผันแปร</span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-lg font-black ${dm ? 'text-rose-400' : 'text-rose-600'}`}>{lifestyleVelocity}%</span>
                  <span className="text-[7px] font-bold opacity-40 uppercase">ของรายรับ</span>
                </div>
                <div className={`w-full h-1 rounded-full ${dm ? 'bg-slate-800' : 'bg-slate-100'} overflow-hidden`}>
                   <div className="h-full bg-rose-500" style={{ width: `${Math.min(100, lifestyleVelocity)}%` }} />
                </div>
              </div>

              {/* Daily Victory */}
              <div className={`p-3 rounded-md border flex flex-col gap-1 min-w-0 ${dm ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                 <span className={`text-[9px] font-black uppercase opacity-50 truncate flex items-center gap-1.5`}><Crosshair className="w-2.5 h-2.5" /> เงินเหลือเฉลี่ย/วัน</span>
                 <div className="flex flex-col">
                    <span className={`text-lg font-black ${dailyVictory >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {formatMoney(dailyVictory)}
                    </span>
                    <span className="text-[7px] font-bold opacity-40 uppercase">Net Surplus / Day</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Forecast / Health Section */}
        {showForecasting && (
          <div className="p-4 flex flex-col justify-center min-w-0">
             <div className="grid grid-cols-2 gap-4">
               <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <TrendingUp className="w-3 h-3 text-purple-500 flex-shrink-0" />
                    <span className={`text-[10px] font-black uppercase tracking-wider truncate ${dm ? 'text-slate-400' : 'text-slate-500'}`}>พยากรณ์รายจ่าย</span>
                  </div>
                  <div className="truncate">
                    <AnimatedMoney value={projectedExpense} className="text-lg font-black" />
                  </div>
                  <p className={`text-[8px] font-medium leading-tight opacity-50`}>รวมรายจ่ายคาดการณ์สิ้นช่วง</p>
               </div>
               <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Zap className={`w-3 h-3 flex-shrink-0 ${safeToSpend <= 300 ? 'text-rose-500' : 'text-emerald-500'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-wider truncate ${dm ? 'text-slate-400' : 'text-slate-500'}`}>งบที่ใช้ได้</span>
                  </div>
                  <div className="truncate">
                    <AnimatedMoney value={safeToSpend} className="text-lg font-black" />
                  </div>
                  <div className={`mt-0.5 text-[7px] font-black px-1.5 py-0.5 rounded-full inline-flex max-w-max truncate ${safeToSpend <= 300 ? 'bg-rose-500/10 text-rose-500 animate-bounce' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {safeToSpend <= 300 ? 'ระวัง! งบใกล้หมด' : 'งบยังปลอดภัย'}
                  </div>
               </div>
             </div>
          </div>
        )}
      </div>

      {/* ─── SECTION 3: EVOLUTION INDICATORS (Bottom Row) ─── */}
      <SectionHeader icon={Scale} title="ตัวชี้วัด (KPIs)" dm={dm} />
      <div className={`grid grid-cols-2 lg:grid-cols-4 divide-x transition-colors ${dm ? 'bg-slate-800 divide-slate-700' : 'bg-white divide-slate-100'}`}>
        
        {/* Daily Burn */}
        <div className="p-3 flex flex-col gap-0.5 hover:bg-slate-500/5 transition-colors group min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
            <Flame className="w-3 h-3 text-amber-500 flex-shrink-0" />
            <span className={`text-[10px] font-bold truncate ${dm ? 'text-slate-400' : 'text-slate-500'}`}>ค่าใช้จ่ายเฉลี่ยรายวัน</span>
          </div>
          <div className="truncate"><AnimatedMoney value={dailyAvg} className="text-lg font-black" /></div>
          <div className={`w-full h-0.5 mt-1 rounded-full ${dm ? 'bg-slate-900' : 'bg-slate-100'}`}>
             <div className="h-full bg-amber-500 opacity-60" style={{ width: '70%' }} />
          </div>
        </div>

        {/* Fuel Consumption */}
        <div className="p-3 flex flex-col gap-0.5 hover:bg-slate-500/5 transition-colors min-w-0">
          <div className="flex items-center justify-between mb-0.5 gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <UtensilsCrossed className="w-3 h-3 text-orange-500 flex-shrink-0" />
              <span className={`text-[10px] font-bold truncate ${dm ? 'text-slate-400' : 'text-slate-500'}`}>ค่าอาหาร/วัน</span>
            </div>
            <span className="text-[9px] font-black text-orange-500 flex-shrink-0">{foodPercentage}%</span>
          </div>
          <div className="truncate"><AnimatedMoney value={foodDailyAvg} className="text-lg font-black" /></div>
          <div className={`w-full h-0.5 mt-1 rounded-full ${dm ? 'bg-slate-900' : 'bg-slate-100'}`}>
             <div className="h-full bg-orange-500" style={{ width: `${foodPercentage}%` }} />
          </div>
        </div>

        {/* Territory Cost */}
        <div className="p-3 flex flex-col gap-0.5 hover:bg-slate-500/5 transition-colors min-w-0">
          <div className="flex items-center justify-between mb-0.5 gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Home className="w-3 h-3 text-indigo-500 flex-shrink-0" />
              <span className={`text-[10px] font-bold truncate ${dm ? 'text-slate-400' : 'text-slate-500'}`}>ค่าที่พักอาศัย</span>
            </div>
            <span className="text-[9px] font-black text-indigo-500 flex-shrink-0">{rentPercentage}%</span>
          </div>
          <div className="truncate"><AnimatedMoney value={rentTotal} className="text-lg font-black" /></div>
          <div className={`w-full h-0.5 mt-1 rounded-full ${dm ? 'bg-slate-900' : 'bg-slate-100'}`}>
             <div className="h-full bg-indigo-500" style={{ width: `${rentPercentage}%` }} />
          </div>
        </div>

        {/* Structure */}
        <div className="p-3 flex flex-col gap-0.5 hover:bg-slate-500/5 transition-colors min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
            <Scale className="w-3 h-3 text-purple-500 flex-shrink-0" />
            <span className={`text-[10px] font-bold truncate ${dm ? 'text-slate-400' : 'text-slate-500'}`}>โครงสร้างรายจ่าย</span>
          </div>
          <div className="flex flex-col gap-0.5 mt-auto">
             <div className="flex justify-between text-[8px] font-black uppercase tracking-tighter">
                <span className="text-purple-500 truncate">คงที่ {fixedPercentage}%</span>
                <span className="text-pink-500 truncate">ผันแปร {variablePercentage}%</span>
             </div>
             <div className={`w-full h-1 rounded-full overflow-hidden flex ${dm ? 'bg-slate-900' : 'bg-slate-100'}`}>
                <div className="h-full bg-purple-500" style={{ width: `${fixedPercentage}%` }} />
                <div className="h-full bg-pink-400" style={{ width: `${variablePercentage}%` }} />
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}

SummaryCards.propTypes = {
  analytics: PropTypes.shape({
    totalIncome: PropTypes.number.isRequired,
    totalExpense: PropTypes.number.isRequired,
    totalSavings: PropTypes.number,
    actualSavings: PropTypes.number,
    netCashflow: PropTypes.number.isRequired,
    savingsRate: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    dailyAvg: PropTypes.number,
    foodDailyAvg: PropTypes.number,
    foodPercentage: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    rentTotal: PropTypes.number,
    rentPercentage: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    fixedPercentage: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    variablePercentage: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    showForecasting: PropTypes.bool,
    projectedExpense: PropTypes.number,
    safeToSpend: PropTypes.number,
    sparklineIncome: PropTypes.array,
    sparklineExpense: PropTypes.array,
    datesInPeriod: PropTypes.array,
    chartTotal: PropTypes.number,
  }).isRequired,
};