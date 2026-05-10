// src/views/Dashboard/components/SummaryCards.jsx
import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { 
  Flame, UtensilsCrossed, Home, 
  Scale, TrendingUp, Target, 
  Zap, Activity, ShieldCheck, 
  Anchor, Crosshair, Navigation, Ship,
  Wallet // เพิ่ม Wallet icon
} from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';
import { useTheme } from '../../../context/ThemeContext';
import sharkLogo from '../../../assets/images/shark-white.svg';
import sharkBlack from '../../../assets/images/shark-black.svg';
import StatCard from '../../Ledger/components/Shared/StatCard';

// ─── Count-up Hook ────────────────────────────────────────────────────────────
function useCountUp(target, duration = 800) {
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

function AnimatedMoney({ value, className }) {
  const animated = useCountUp(value);
  return <span className={className}>{formatMoney(animated)}</span>;
}

const SectionHeader = ({ icon: Icon, title, dm }) => (
  <div className={`px-3 py-1.5 flex items-center gap-2 ${dm ? 'bg-slate-800/90 border-b border-slate-700/50' : 'bg-slate-50 border-b border-slate-200'}`}>
    <Icon className={`w-3.5 h-3.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`} />
    <span className={`text-[10px] font-black uppercase tracking-widest ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
      {title}
    </span>
  </div>
);

const MetricBox = ({ children, dm, className = '' }) => (
  <div className={`p-2 flex flex-col justify-between rounded-sm border transition-all ${dm ? 'bg-slate-800/30 border-slate-700/40 hover:bg-slate-800/50' : 'bg-white border-slate-200/60 hover:bg-slate-50'} ${className}`}>
    {children}
  </div>
);

export default function SummaryCards({ analytics }) {
  const { isDarkMode: dm } = useTheme();
  const {
    totalIncome, totalExpense, netCashflow, savingsRate,
    dailyAvg, foodDailyAvg, foodPercentage, rentTotal, rentPercentage,
    fixedPercentage, variablePercentage, fixedTotal, variableTotal,
    showForecasting, projectedExpense, safeToSpend, datesInPeriod
  } = analytics;

  // ─── Calculations ───
  const periodDays = Math.max(1, datesInPeriod?.length || 1);
  const commitmentRatio = totalIncome > 0 ? ((fixedTotal / totalIncome) * 100).toFixed(1) : 0;
  const lifestyleVelocity = totalIncome > 0 ? ((variableTotal / totalIncome) * 100).toFixed(1) : 0;
  
  // Averages per day
  const avgIncomePerDay = totalIncome / periodDays;
  const avgExpensePerDay = totalExpense / periodDays;
  const avgFixedPerDay = fixedTotal / periodDays;
  const avgVariablePerDay = variableTotal / periodDays;
  const dailyVictory = netCashflow / periodDays;

  return (
    <div className={`w-full flex flex-col gap-2`}>
      
      {/* SECTION 1: VITALS (5-Column Grid - Unified Architecture) */}
      <SectionHeader icon={Activity} title="ภาพรวมสถานะการเงิน (Vitals)" dm={dm} />
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-2 p-2 border-b">
        
        <StatCard 
          icon={<div className="w-4 h-4 flex items-center justify-center"><img src={dm ? sharkLogo : sharkBlack} alt="" className="w-full h-full object-contain" /></div>}
          label="รายรับรวม"
          value={<AnimatedMoney value={totalIncome} />}
          subValue={`เฉลี่ย ฿${formatMoney(avgIncomePerDay).split('.')[0]}/วัน`}
          color={{ bg: dm ? 'bg-blue-900/30' : 'bg-blue-50', text: dm ? 'text-blue-400' : 'text-blue-600' }}
        />

        <StatCard 
          icon={<Anchor />}
          label="รายจ่ายคงที่"
          value={<AnimatedMoney value={fixedTotal} />}
          subValue={`เฉลี่ย ฿${formatMoney(avgFixedPerDay).split('.')[0]}/วัน`}
          color={{ bg: dm ? 'bg-purple-900/30' : 'bg-purple-50', text: dm ? 'text-purple-400' : 'text-purple-600' }}
        />

        <StatCard 
          icon={<Crosshair />}
          label="รายจ่ายผันแปร"
          value={<AnimatedMoney value={variableTotal} />}
          subValue={`เฉลี่ย ฿${formatMoney(avgVariablePerDay).split('.')[0]}/วัน`}
          color={{ bg: dm ? 'bg-rose-900/30' : 'bg-rose-50', text: dm ? 'text-rose-400' : 'text-rose-600' }}
        />

        <StatCard 
          icon={<Navigation />}
          label="กระแสเงินสด"
          value={<AnimatedMoney value={netCashflow} />}
          subValue={netCashflow >= 0 ? 'Surplus (บวก)' : 'Deficit (ติดลบ)'}
          color={{ 
            bg: netCashflow >= 0 ? (dm ? 'bg-emerald-900/30' : 'bg-emerald-50') : (dm ? 'bg-rose-900/30' : 'bg-rose-50'),
            text: netCashflow >= 0 ? (dm ? 'text-emerald-400' : 'text-emerald-600') : (dm ? 'text-rose-400' : 'text-rose-600')
          }}
        />

        <StatCard 
          icon={<ShieldCheck />}
          label="ประสิทธิภาพ"
          value={`${savingsRate}%`}
          subValue={`Grade ${savingsRate >= 20 ? 'A+' : (savingsRate >= 10 ? 'B' : (savingsRate > 0 ? 'C' : 'F'))}`}
          color={{ 
            bg: savingsRate >= 20 ? (dm ? 'bg-emerald-900/30' : 'bg-emerald-50') : (dm ? 'bg-blue-900/30' : 'bg-blue-50'),
            text: savingsRate >= 20 ? (dm ? 'text-emerald-400' : 'text-emerald-600') : (dm ? 'text-blue-400' : 'text-blue-600')
          }}
        />
      </div>

      {/* SECTION 2: STRATEGIC & FORECAST */}
      <div className={`grid ${showForecasting ? 'grid-cols-[1.2fr_0.8fr]' : 'grid-cols-1'} gap-2`}>
        <div className={`rounded-sm overflow-hidden border shadow-sm ${dm ? 'bg-[#111827] border-slate-700/50' : 'bg-white border-slate-200'}`}>
          <SectionHeader icon={Target} title="วิเคราะห์สัดส่วน (Ratios)" dm={dm} />
          <div className="grid grid-cols-3 gap-2 p-2">
            <MetricBox dm={dm}>
              <span className="text-[10px] font-bold opacity-70 mb-1">ภาระค่าใช้จ่าย</span>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-lg font-black ${dm ? 'text-purple-400' : 'text-purple-600'}`}>{commitmentRatio}%</span>
                <div className={`flex-1 h-1.5 rounded-full ${dm ? 'bg-slate-700' : 'bg-slate-100'} overflow-hidden`}>
                  <div className="h-full bg-purple-500" style={{ width: `${Math.min(100, commitmentRatio)}%` }} />
                </div>
              </div>
            </MetricBox>
            <MetricBox dm={dm}>
              <span className="text-[10px] font-bold opacity-70 mb-1">สัดส่วนผันแปร</span>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-lg font-black ${dm ? 'text-rose-400' : 'text-rose-600'}`}>{lifestyleVelocity}%</span>
                <div className={`flex-1 h-1.5 rounded-full ${dm ? 'bg-slate-700' : 'bg-slate-100'} overflow-hidden`}>
                  <div className="h-full bg-rose-500" style={{ width: `${Math.min(100, lifestyleVelocity)}%` }} />
                </div>
              </div>
            </MetricBox>
            <MetricBox dm={dm}>
              <span className="text-[10px] font-bold opacity-70 mb-1">เงินเหลือเฉลี่ย/วัน</span>
              <span className={`text-lg font-black ${dailyVictory >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {formatMoney(dailyVictory)}
              </span>
            </MetricBox>
          </div>
        </div>

        {showForecasting && (
          <div className={`rounded-sm overflow-hidden border shadow-sm ${dm ? 'bg-[#111827] border-slate-700/50' : 'bg-white border-slate-200'}`}>
            <SectionHeader icon={TrendingUp} title="คาดการณ์ (Forecast)" dm={dm} />
            <div className="grid grid-cols-2 gap-2 p-2">
              <MetricBox dm={dm}>
                <span className="text-[10px] font-bold opacity-70 mb-1">พยากรณ์รายจ่าย</span>
                <div className="text-base font-black"><AnimatedMoney value={projectedExpense} /></div>
              </MetricBox>
              <MetricBox dm={dm} className={safeToSpend <= 300 ? 'bg-rose-500/5 border-rose-500/20' : ''}>
                <span className="text-[10px] font-bold opacity-70 mb-1">งบที่ใช้ได้</span>
                <div className={`text-base font-black ${safeToSpend <= 300 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  <AnimatedMoney value={safeToSpend} />
                </div>
              </MetricBox>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: CATEGORY KPIs */}
      <div className={`rounded-sm overflow-hidden border shadow-sm ${dm ? 'bg-[#111827] border-slate-700/50' : 'bg-white border-slate-200'}`}>
        <SectionHeader icon={Scale} title="ตัวชี้วัดหมวดหมู่ (Category KPIs)" dm={dm} />
        <div className="grid grid-cols-4 gap-2 p-2">
          <MetricBox dm={dm}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold opacity-70">จ่ายเฉลี่ย/วัน</span>
              <Flame className="w-5 h-5 text-amber-500 opacity-90" />
            </div>
            <div className="text-base font-black"><AnimatedMoney value={dailyAvg} /></div>
          </MetricBox>
          <MetricBox dm={dm}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold opacity-70">ค่าอาหาร/วัน</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-1 rounded">{foodPercentage}%</span>
                <UtensilsCrossed className="w-4 h-4 text-orange-500 opacity-90" />
              </div>
            </div>
            <div className="text-base font-black"><AnimatedMoney value={foodDailyAvg} /></div>
          </MetricBox>
          <MetricBox dm={dm}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold opacity-70">ค่าที่พักอาศัย</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 px-1 rounded">{rentPercentage}%</span>
                <Home className="w-4 h-4 text-indigo-500 opacity-90" />
              </div>
            </div>
            <div className="text-base font-black"><AnimatedMoney value={rentTotal} /></div>
          </MetricBox>
          <MetricBox dm={dm}>
            <div className="flex justify-between text-[9px] font-black uppercase mb-1.5">
              <span className="text-purple-500">คงที่ {fixedPercentage}%</span>
              <span className="text-pink-500">ผันแปร {variablePercentage}%</span>
            </div>
            <div className={`w-full h-1.5 rounded-full overflow-hidden flex ${dm ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div className="h-full bg-purple-500" style={{ width: `${fixedPercentage}%` }} />
              <div className="h-full bg-pink-500" style={{ width: `${variablePercentage}%` }} />
            </div>
          </MetricBox>
        </div>
      </div>
    </div>
  );
}

SummaryCards.propTypes = {
  analytics: PropTypes.shape({
    totalIncome: PropTypes.number.isRequired,
    totalExpense: PropTypes.number.isRequired,
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
    datesInPeriod: PropTypes.array,
  }).isRequired,
};