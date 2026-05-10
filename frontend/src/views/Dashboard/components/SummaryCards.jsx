// src/views/Dashboard/components/SummaryCards.jsx
import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { 
  Coins, Wallet, PiggyBank, Flame, UtensilsCrossed, Home, 
  Scale, TrendingUp, TrendingDown, Minus, Info, Target, 
  Zap, AlertCircle, ArrowUpRight, ArrowDownRight, Activity,
  ShieldCheck, Banknote
} from 'lucide-react';
import Sparkline from '../../../components/ui/Sparkline';
import Tooltip from '../../../components/ui/Tooltip';
import { formatMoney } from '../../../utils/formatters';
import { useTheme } from '../../../context/ThemeContext';

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

// ─── Trend Badge ─────────────────────────────────────────────────────────────
function TrendBadge({ current, previous, inverse = false }) {
  const { isDarkMode: dm } = useTheme();
  if (previous == null || previous === 0) return null;
  const diff = current - previous;
  const pct = Math.abs((diff / Math.abs(previous)) * 100);
  const isUp = diff > 0;
  if (pct < 0.1) return null;
  const isGood = inverse ? !isUp : isUp;

  return (
    <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
      isGood 
        ? (dm ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
        : (dm ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600')
    }`}>
      {isUp ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
      {pct.toFixed(0)}%
    </div>
  );
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
    totalIncome, totalExpense, totalSavings, actualSavings, explicitSavings, netCashflow, savingsRate, prevTotals,
    dailyAvg, foodDailyAvg, foodPercentage, rentTotal, rentPercentage,
    fixedPercentage, variablePercentage, fixedTotal, variableTotal,
    showForecasting, projectedExpense, safeToSpend, isSingleMonthView,
    sparklineIncome, sparklineExpense, datesInPeriod, chartTotal, filterPeriod
  } = analytics;

  const periodDays = Math.max(1, datesInPeriod?.length || 1);
  const avgIncome = totalIncome / periodDays;
  const avgFixed = (fixedTotal || 0) / periodDays;
  const isNegativeNet = actualSavings < 0;

  // Comparison Logic for Middle Row
  const netDiff = prevTotals ? actualSavings - prevTotals.net : 0;
  const isNetBetter = netDiff > 0;

  return (
    <div className={`rounded-sm border shadow-sm w-full h-full flex flex-col overflow-hidden transition-all duration-300 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      
      {/* ─── SECTION 1: CORE VITALS (Top Row) ─── */}
      <SectionHeader icon={Activity} title="ตัวชี้วัดหลัก (Core Vitals)" dm={dm} />
      <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 divide-y md:divide-y-0 md:divide-x border-b transition-colors ${dm ? 'divide-slate-700 border-slate-700' : 'divide-slate-100 border-slate-100'}`}>
        
        {/* Income Card */}
        <div className="p-4 flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10 min-w-0 pr-10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className={`p-1 rounded-md ${dm ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><Coins className="w-3 h-3" /></div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${dm ? 'text-slate-400' : 'text-slate-500'}`}>รายรับรวม</span>
            </div>
            <div className="flex items-baseline">
              <AnimatedMoney value={totalIncome} className={`text-xl 2xl:text-2xl font-black whitespace-nowrap ${dm ? 'text-emerald-400' : 'text-emerald-600'}`} />
            </div>
          </div>
          {sparklineIncome && (
            <div className="absolute right-3 top-6 w-16 h-8 opacity-20 group-hover:opacity-100 transition-opacity pointer-events-none">
              <Sparkline data={sparklineIncome} color="#10B981" />
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-2 relative z-10">
            <TrendBadge current={totalIncome} previous={prevTotals?.income} />
            <span className={`text-[8px] font-bold opacity-40 uppercase tracking-tighter whitespace-nowrap`}>Avg {formatMoney(avgIncome)}/วัน</span>
          </div>
        </div>

        {/* Expense Card */}
        <div className="p-4 flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10 min-w-0 pr-10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className={`p-1 rounded-md ${dm ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'}`}><Wallet className="w-3 h-3" /></div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${dm ? 'text-slate-400' : 'text-slate-500'}`}>รายจ่ายรวม</span>
            </div>
            <div className="flex items-baseline">
              <AnimatedMoney value={totalExpense} className={`text-xl 2xl:text-2xl font-black whitespace-nowrap ${dm ? 'text-rose-400' : 'text-rose-600'}`} />
            </div>
          </div>
          {sparklineExpense && (
            <div className="absolute right-3 top-6 w-16 h-8 opacity-20 group-hover:opacity-100 transition-opacity pointer-events-none">
              <Sparkline data={sparklineExpense} color="#EF4444" />
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-2 relative z-10">
            <TrendBadge current={totalExpense} previous={prevTotals?.expense} inverse />
            <span className={`text-[8px] font-bold opacity-40 uppercase tracking-tighter whitespace-nowrap`}>Avg {formatMoney(totalExpense / periodDays)}/วัน</span>
          </div>
        </div>

        {/* Savings Card (Target Savings) */}
        <div className="p-4 flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10 min-w-0 pr-10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className={`p-1 rounded-md ${dm ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><PiggyBank className="w-3 h-3" /></div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${dm ? 'text-slate-400' : 'text-slate-500'}`}>เงินออมเป้าหมาย</span>
            </div>
            <div className="flex items-baseline">
              <AnimatedMoney value={explicitSavings} className={`text-xl 2xl:text-2xl font-black whitespace-nowrap ${dm ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2 relative z-10">
             <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${dm ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'} whitespace-nowrap`}>
                แยกเก็บรายหมวดหมู่
             </span>
          </div>
        </div>

        {/* Net Worth Delta (Actual Savings) */}
        <div className="p-4 flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10 min-w-0 pr-10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className={`p-1 rounded-md ${dm ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}><TrendingUp className="w-3 h-3" /></div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${dm ? 'text-slate-400' : 'text-slate-500'}`}>ความมั่งคั่งสุทธิ</span>
            </div>
            <div className="flex items-baseline">
              <AnimatedMoney value={actualSavings} className={`text-xl 2xl:text-2xl font-black whitespace-nowrap ${actualSavings >= 0 ? (dm ? 'text-amber-400' : 'text-amber-600') : 'text-rose-500'}`} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2 relative z-10">
             <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${actualSavings >= 0 ? (dm ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (dm ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600')} whitespace-nowrap`}>
                {actualSavings >= 0 ? 'Surplus (ส่วนเกิน)' : 'Deficit (ติดลบ)'}
             </span>
          </div>
        </div>

        {/* Financial Discipline Card */}
        <div className={`p-4 flex flex-col justify-between relative overflow-hidden ${isNegativeNet ? (dm ? 'bg-rose-500/[0.03]' : 'bg-rose-50/50') : ''}`}>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-1.5 gap-1.5">
              <div className="flex items-center gap-1.5">
                <div className={`p-1 rounded-md ${savingsRate >= 20 ? 'text-emerald-500 bg-emerald-500/10' : 'text-blue-500 bg-blue-500/10'}`}><ShieldCheck className="w-3 h-3" /></div>
                <span className={`text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${dm ? 'text-slate-400' : 'text-slate-500'}`}>ประสิทธิภาพการออม</span>
              </div>
            </div>
            <div className="flex items-baseline">
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

      {/* ─── SECTION 2: BENCHMARK ANALYSIS (Middle Row) ─── */}
      <SectionHeader icon={Target} title={filterPeriod === 'ALL' ? 'สถิติภาพรวมตลอดการใช้งาน' : 'วิเคราะห์ประสิทธิภาพเทียบค่าเฉลี่ย'} dm={dm} />
      <div className={`flex-1 grid grid-cols-1 ${showForecasting ? 'lg:grid-cols-[1fr_1fr]' : ''} divide-y lg:divide-y-0 lg:divide-x border-b transition-colors ${dm ? 'divide-slate-700 border-slate-700 bg-slate-800/50' : 'divide-slate-100 border-slate-100 bg-slate-50/30'}`}>
        
        {/* Performance Benchmarks */}
        <div className="p-4 flex flex-col justify-center gap-3 min-w-0">
           <div className={`grid grid-cols-2 xl:grid-cols-4 gap-2`}>
              {/* Avg Income Bench */}
              <div className={`p-2 rounded-md border flex flex-col gap-0.5 min-w-0 ${dm ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                <span className={`text-[9px] font-bold uppercase opacity-50 truncate`}>รายรับเฉลี่ย/วัน</span>
                <span className={`text-sm font-black truncate text-emerald-500`}>
                  {formatMoney(avgIncome)}
                </span>
              </div>

              {/* Fixed Load Bench */}
              <div className={`p-2 rounded-md border flex flex-col gap-0.5 min-w-0 ${dm ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                <span className={`text-[9px] font-bold uppercase opacity-50 truncate`}>ภาระคงที่เฉลี่ย/วัน</span>
                <span className={`text-sm font-black truncate text-purple-500`}>
                  {formatMoney(avgFixed)}
                </span>
              </div>

              {/* Dynamic Slot 3: Variable Total (Month) vs Monthly Avg (Long-term) */}
              <div className={`p-2 rounded-md border flex flex-col gap-0.5 min-w-0 ${dm ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                 <span className={`text-[9px] font-bold uppercase opacity-50 truncate`}>
                    {isSingleMonthView ? 'รายจ่ายผันแปร' : 'ค่าเฉลี่ยรายเดือน'}
                 </span>
                 <span className={`text-base font-black truncate ${dm ? 'text-blue-400' : 'text-blue-600'}`}>
                    {isSingleMonthView ? formatMoney(variableTotal) : formatMoney((totalExpense / Math.max(1, periodDays)) * 30)}
                 </span>
                 <span className={`text-[8px] font-bold truncate opacity-60 uppercase`}>
                    {isSingleMonthView ? `${variablePercentage}% ของทั้งหมด` : 'Estimated Monthly'}
                 </span>
              </div>

              {/* Surplus Projection */}
              <div className={`p-2 rounded-md border flex flex-col justify-center items-center text-center ${dm ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                 <span className={`text-[9px] font-bold uppercase opacity-50`}>สภาพคล่องเฉลี่ย</span>
                 <div className={`text-xl font-black ${netCashflow >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {formatMoney(netCashflow / Math.max(1, periodDays))}
                 </div>
                 <span className="text-[8px] font-bold opacity-70 uppercase tracking-tighter">ต่อวัน</span>
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
                    <span className={`text-[10px] font-black uppercase tracking-wider truncate ${dm ? 'text-slate-400' : 'text-slate-500'}`}>คาดการณ์สิ้นเดือน</span>
                  </div>
                  <div className="truncate">
                    <AnimatedMoney value={projectedExpense} className="text-lg font-black" />
                  </div>
                  <p className={`text-[8px] font-medium leading-tight opacity-50 truncate`}>รายจ่ายจริงรวมคาดการณ์</p>
               </div>
               <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Zap className={`w-3 h-3 flex-shrink-0 ${safeToSpend <= 300 ? 'text-rose-500' : 'text-emerald-500'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-wider truncate ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Safe-to-Spend</span>
                  </div>
                  <div className="truncate">
                    <AnimatedMoney value={safeToSpend} className="text-lg font-black" />
                  </div>
                  <div className={`mt-0.5 text-[7px] font-black px-1.5 py-0.5 rounded-full inline-flex max-w-max truncate ${safeToSpend <= 300 ? 'bg-rose-500/10 text-rose-500 animate-bounce' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {safeToSpend <= 300 ? 'งบตึงตัว!' : 'งบปลอดภัย'}
                  </div>
               </div>
             </div>
          </div>
        )}
      </div>

      {/* ─── SECTION 3: KEY PERFORMANCE INDICATORS (Bottom Row) ─── */}
      <SectionHeader icon={Scale} title="ดัชนีชี้วัดประสิทธิภาพ (KPIs)" dm={dm} />
      <div className={`grid grid-cols-2 lg:grid-cols-4 divide-x transition-colors ${dm ? 'bg-slate-800 divide-slate-700' : 'bg-white divide-slate-100'}`}>
        
        {/* Burn Rate */}
        <div className="p-3 flex flex-col gap-0.5 hover:bg-slate-500/5 transition-colors group min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
            <Flame className="w-3 h-3 text-amber-500 flex-shrink-0" />
            <span className={`text-[10px] font-bold truncate ${dm ? 'text-slate-400' : 'text-slate-500'}`}>เผาผลาญรายวัน</span>
          </div>
          <div className="truncate"><AnimatedMoney value={dailyAvg} className="text-lg font-black" /></div>
          <div className={`w-full h-0.5 mt-1 rounded-full ${dm ? 'bg-slate-900' : 'bg-slate-100'}`}>
             <div className="h-full bg-amber-500 opacity-60" style={{ width: '70%' }} />
          </div>
        </div>

        {/* Food */}
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

        {/* Rent */}
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
    prevTotals: PropTypes.object,
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
