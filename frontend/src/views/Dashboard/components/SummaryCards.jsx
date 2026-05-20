// src/views/Dashboard/components/SummaryCards.jsx
import React from 'react';
import { 
  Activity, Wallet, Anchor, Crosshair, Navigation, ShieldCheck,
  Target, Scale, UtensilsCrossed,
  TrendingUp, Zap, Layers
} from 'lucide-react';
import { useDashboardContext } from '../context/DashboardContext';
import { formatMoney } from '../../../utils/formatters';
import sharkLogo from '../../../assets/images/shark-white.svg';
import sharkBlack from '../../../assets/images/shark-black.svg';
import StatCard from '../../../components/shared/StatCard.jsx';
import AnimatedNumber from '../../../components/ui/AnimatedNumber.jsx';

/**
 * Shared Shimmer for Hybrid Loading
 */
const Shimmer = ({ className, dm }) => (
  <div className={`rounded-sm animate-pulse ${dm ? 'bg-slate-700' : 'bg-slate-200'} ${className}`} />
);

/**
 * Shared Header for Summary Sections
 */
const SectionHeader = ({ icon: Icon, title, dm }) => (
  <div className={`px-2.5 py-0.5 flex items-center gap-1.5 ${dm ? 'bg-slate-800 border-b border-slate-700/50' : 'bg-slate-100 border-b border-slate-200'}`}>
    <Icon className={`w-3 h-3 ${dm ? 'text-slate-500' : 'text-slate-400'}`} />
    <span className={`text-[11px] font-black uppercase tracking-widest ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
      {title}
    </span>
  </div>
);

/**
 * SECTION 1: FINANCIAL VITALS (Income, Expense, Cashflow, Savings)
 */
const SummaryVitals = ({ analytics, dm, showSkeleton }) => {
  const {
    totalIncome, totalExpense, netCashflow, savingsRate,
    fixedTotal, variableTotal, datesInPeriod
  } = analytics;

  const periodDays = Math.max(1, datesInPeriod?.length || 1);
  const avgIncomePerDay = totalIncome / periodDays;
  const avgExpensePerDay = totalExpense / periodDays;
  const avgNeedPerDay = fixedTotal / periodDays;
  const avgWantPerDay = variableTotal / periodDays;
  
  const expensePercent = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;

  const vitalsConfig = [
    {
      id: 'income',
      icon: <div className="w-4 h-4 flex items-center justify-center"><img src={dm ? sharkLogo : sharkBlack} alt="" className="w-full h-full object-contain" /></div>,
      label: "รายรับรวม",
      value: showSkeleton ? <Shimmer className="h-6 w-20 my-1" dm={dm} /> : <AnimatedNumber value={totalIncome} />,
      subValueJSX: showSkeleton ? <Shimmer className="h-3 w-24" dm={dm} /> : <span className={`text-[9px] font-medium opacity-80 tabular-nums ${dm ? 'text-blue-400' : 'text-blue-600'}`}>เฉลี่ย ฿{formatMoney(avgIncomePerDay)}/วัน</span>,
      color: { bg: dm ? 'bg-blue-900/30' : 'bg-blue-50', text: dm ? 'text-blue-400' : 'text-blue-600' }
    },
    {
      id: 'expense',
      icon: <Wallet />,
      label: "รายจ่ายรวม",
      value: showSkeleton ? <Shimmer className="h-6 w-20 my-1" dm={dm} /> : <AnimatedNumber value={totalExpense} />,
      subValueJSX: showSkeleton ? <Shimmer className="h-3 w-24" dm={dm} /> : <span className={`text-[9px] font-medium opacity-80 tabular-nums ${dm ? 'text-orange-400' : 'text-orange-600'}`}>เฉลี่ย ฿{formatMoney(avgExpensePerDay)}/วัน</span>,
      topRightBadge: !showSkeleton && (
        <div className={`px-1.5 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-widest ${dm ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
          ใช้ไป {expensePercent}%
        </div>
      ),
      color: { bg: dm ? 'bg-orange-900/30' : 'bg-orange-50', text: dm ? 'text-orange-400' : 'text-orange-600' }
    },
    {
      id: 'cashflow',
      icon: <Navigation />,
      label: "กระแสเงินสดสุทธิ",
      value: showSkeleton ? <Shimmer className="h-6 w-20 my-1" dm={dm} /> : <AnimatedNumber value={netCashflow} />,
      subValueJSX: showSkeleton ? <Shimmer className="h-3 w-12" dm={dm} /> : <span className={`text-[9px] font-medium opacity-80 ${netCashflow >= 0 ? (dm ? 'text-emerald-400' : 'text-emerald-600') : (dm ? 'text-rose-400' : 'text-rose-600')}`}>{netCashflow >= 0 ? 'Surplus' : 'Deficit'}</span>,
      topRightBadge: !showSkeleton && (
        <div className={`px-1.5 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${savingsRate >= 20 ? (dm ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (dm ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600')}`}>
          <span>ออม {savingsRate}%</span>
          <span className="opacity-60">|</span>
          <span>{savingsRate >= 20 ? 'A+' : (savingsRate >= 10 ? 'B' : (savingsRate > 0 ? 'C' : 'F'))}</span>
        </div>
      ),
      color: { 
        bg: netCashflow >= 0 ? (dm ? 'bg-emerald-900/30' : 'bg-emerald-50') : (dm ? 'bg-rose-900/30' : 'bg-rose-50'),
        text: netCashflow >= 0 ? (dm ? 'text-emerald-400' : 'text-emerald-600') : (dm ? 'text-rose-400' : 'text-rose-600')
      }
    }
  ];

  return (
    <div className="flex flex-col border-b border-dashed border-slate-700/40">
      <SectionHeader icon={Activity} title="ตัวชี้วัดหลัก" dm={dm} />
      <div className="grid grid-cols-3 gap-[1px] bg-slate-700/20 p-[1px]">
        {vitalsConfig.map(card => (
          <div key={card.id} className={dm ? 'bg-[#111827]' : 'bg-slate-50'}>
            <StatCard 
              icon={card.icon}
              label={card.label}
              value={card.value}
              subValueJSX={card.subValueJSX}
              topRightBadge={card.topRightBadge}
              color={card.color}
            />
          </div>
        ))}
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

  return (
    <div className="grid grid-cols-12 items-stretch">
         {/* Strategic Analysis */}
         <div className="col-span-7 flex flex-col border-r border-dashed border-slate-700/40">
            <SectionHeader icon={Target} title="วิเคราะห์กลยุทธ์" dm={dm} />
            <div className="grid grid-cols-3 gap-[1px] bg-slate-700/20 p-[1px] flex-1">
               <div className={`p-2 rounded-none flex flex-col justify-between h-full ${dm ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${dm ? 'text-blue-400/70' : 'text-blue-600/70'}`}>ภาระที่พักอาศัย (RENT)</span>
                  <div className="mt-auto">
                    {showSkeleton ? (
                      <Shimmer className="h-6 w-16 my-1" dm={dm} />
                    ) : (
                      <div className="flex items-baseline gap-1.5">
                        <div className={`text-lg font-black ${rentPercentage > 30 ? (dm ? 'text-rose-400' : 'text-rose-600') : (dm ? 'text-blue-400' : 'text-blue-600')}`}>{rentPercentage}%</div>
                        <div className={`text-[10px] font-bold opacity-60 tabular-nums ${dm ? 'text-slate-400' : 'text-slate-500'}`}>฿{formatMoney(analytics.rentTotal)}</div>
                      </div>
                    )}
                    <div className={`w-full h-1 mt-1.5 rounded-full ${dm ? 'bg-slate-700' : 'bg-slate-200'} overflow-hidden`}>
                       <div className={`h-full ${showSkeleton ? 'bg-slate-500 animate-pulse' : (rentPercentage > 30 ? 'bg-rose-500' : 'bg-blue-500')}`} style={{ width: showSkeleton ? '50%' : `${Math.min(100, rentPercentage)}%` }} />
                    </div>
                  </div>
               </div>

               <div className={`p-2 rounded-none flex flex-col justify-between h-full ${dm ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${dm ? 'text-rose-400/70' : 'text-rose-600/70'}`}>ดัชนีการใช้ชีวิต (WANT RATIO)</span>
                  <div className="mt-auto">
                    {showSkeleton ? (
                      <Shimmer className="h-6 w-16 my-1" dm={dm} />
                    ) : (
                      <div className="flex items-baseline gap-1.5">
                        <div className={`text-lg font-black ${lifestyleRatio > 35 ? (dm ? 'text-rose-400' : 'text-rose-600') : (dm ? 'text-rose-400' : 'text-rose-600')}`}>{lifestyleRatio.toFixed(1)}%</div>
                        <div className={`text-[10px] font-bold opacity-60 tabular-nums ${dm ? 'text-slate-400' : 'text-slate-500'}`}>฿{formatMoney(variableTotal)}</div>
                      </div>
                    )}
                    <div className={`w-full h-1 mt-1.5 rounded-full ${dm ? 'bg-slate-700' : 'bg-slate-200'} overflow-hidden`}>
                       <div className={`h-full ${showSkeleton ? 'bg-slate-500 animate-pulse' : 'bg-rose-500'}`} style={{ width: showSkeleton ? '50%' : `${Math.min(100, lifestyleRatio)}%` }} />
                    </div>
                  </div>
               </div>

               <div className={`p-2 rounded-none flex flex-col justify-between h-full ${dm ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${dailyVictory >= 0 ? (dm ? 'text-emerald-400/70' : 'text-emerald-600/70') : (dm ? 'text-rose-400/70' : 'text-rose-600/70')}`}>เงินคงเหลือรายวัน (Victory)</span>
                  {showSkeleton ? (
                    <Shimmer className="h-6 w-20 mt-auto" dm={dm} />
                  ) : (
                    <span className={`text-lg font-black mt-auto tabular-nums ${dailyVictory >= 0 ? (dm ? 'text-emerald-400' : 'text-emerald-600') : (dm ? 'text-rose-400' : 'text-rose-600')}`}>{formatMoney(dailyVictory)}</span>
                  )}
               </div>
            </div>
         </div>

         {/* Key Metrics */}
         <div className="col-span-5 flex flex-col">
            <SectionHeader icon={Scale} title="ข้อมูลสำคัญ" dm={dm} />
            <div className="grid grid-cols-3 gap-[1px] bg-slate-700/20 p-[1px] flex-1">
               <div className={`p-2 rounded-none flex flex-col justify-center h-full ${dm ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${dm ? 'text-orange-400/70' : 'text-orange-600/70'}`}>สัดส่วนค่าอาหาร</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    {showSkeleton ? <Shimmer className="h-6 w-12" dm={dm} /> : <span className={`text-lg font-black ${dm ? 'text-orange-400' : 'text-orange-600'}`}>{foodPercentage}%</span>}
                    {!showSkeleton && <UtensilsCrossed size={12} className="text-orange-500 opacity-60" />}
                  </div>
               </div>
               <div className={`p-2 rounded-none flex flex-col justify-center h-full ${dm ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${dm ? 'text-orange-400/70' : 'text-orange-600/70'}`}>กินเฉลี่ย/วัน</span>
                  {showSkeleton ? <Shimmer className="h-6 w-16 mt-0.5" dm={dm} /> : <span className={`text-lg font-black tabular-nums mt-0.5 ${dm ? 'text-orange-400' : 'text-orange-600'}`}>{formatMoney(foodDailyAvg)}</span>}
               </div>
               <div className={`p-2 rounded-none flex flex-col justify-center h-full ${dm ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${dm ? 'text-cyan-400/70' : 'text-cyan-600/70'}`}>รายจ่ายเฉลี่ย/วัน</span>
                  {showSkeleton ? <Shimmer className="h-6 w-16 mt-0.5" dm={dm} /> : <span className={`text-lg font-black tabular-nums mt-0.5 ${dm ? 'text-cyan-400' : 'text-cyan-600'}`}>{formatMoney(dailyAvg)}</span>}
               </div>
            </div>
         </div>
    </div>
  );
};

/**
 * SECTION 3: FORECAST (Optional strip for month-end projections)
 */
const SummaryForecasting = ({ analytics, dm, showSkeleton }) => {
  const {
    showForecasting, projectedExpense, safeToSpend, projectedSurplus
  } = analytics;

  if (!showForecasting) return null;

  return (
    <div className="flex flex-col border-t border-dashed border-slate-700/40">
      <SectionHeader icon={TrendingUp} title="พยากรณ์สิ้นเดือน" dm={dm} />
      <div className="grid grid-cols-3 gap-[1px] bg-slate-700/20 p-[1px]">
        {/* Projected Expense */}
        <div className={`p-2 rounded-none flex items-center justify-between ${dm ? 'bg-[#1e1b4b]/40' : 'bg-indigo-50/40'}`}>
          <div>
            <span className={`text-[9px] font-black uppercase tracking-wider ${dm ? 'text-indigo-300' : 'text-indigo-600/80'}`}>รายจ่ายเดือนนี้ (พยากรณ์)</span>
            {showSkeleton ? <Shimmer className="h-6 w-24 my-1" dm={dm} /> : <div className={`text-lg font-black tabular-nums ${dm ? 'text-white' : 'text-indigo-900/90'}`}><AnimatedNumber value={projectedExpense} /></div>}
          </div>
          <TrendingUp size={48} className={`${dm ? 'text-indigo-400' : 'text-indigo-300'} opacity-20`} />
        </div>

        {/* Safe to Spend */}
        <div className={`p-2 rounded-none flex items-center justify-between ${safeToSpend > 300 ? (dm ? 'bg-emerald-500/5' : 'bg-emerald-50/40') : (dm ? 'bg-rose-500/5' : 'bg-rose-50/40')}`}>
          <div>
            <span className={`text-[9px] font-black uppercase tracking-wider ${safeToSpend > 300 ? (dm ? 'text-emerald-400/70' : 'text-emerald-600/70') : (dm ? 'text-rose-400/70' : 'text-rose-600/70')}`}>งบใช้จ่ายรายวัน (Safe)</span>
            {showSkeleton ? <Shimmer className="h-6 w-24 my-1" dm={dm} /> : (
              <div className={`text-lg font-black tabular-nums ${safeToSpend > 300 ? (dm ? 'text-emerald-400' : 'text-emerald-600') : (dm ? 'text-rose-400' : 'text-rose-600')}`}>
                <AnimatedNumber value={safeToSpend} />
              </div>
            )}
          </div>
          <Zap size={48} className={`${safeToSpend > 300 ? 'text-emerald-400' : 'text-rose-400'} opacity-20`} />
        </div>

        {/* Shark Surplus */}
        <div className={`p-2 rounded-none flex items-center justify-between ${dm ? 'bg-purple-900/30' : 'bg-purple-50/40'}`}>
          <div>
            <span className={`text-[9px] font-black uppercase tracking-wider ${dm ? 'text-purple-300' : 'text-purple-600/80'}`}>เงินเหลือรอจัดสรร (Surplus)</span>
            {showSkeleton ? <Shimmer className="h-6 w-24 my-1" dm={dm} /> : (
              <div className={`text-xl font-black tabular-nums ${dm ? 'text-purple-400' : 'text-purple-800'}`}>
                <AnimatedNumber value={projectedSurplus} />
              </div>
            )}
          </div>
          <Layers size={48} className={`${dm ? 'text-purple-400' : 'text-purple-300'} opacity-20`} />
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
    <div className={`w-full flex flex-col rounded-sm overflow-hidden border shadow-sm ${dm ? 'bg-[#111827] border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
      <SummaryVitals analytics={analytics} dm={dm} showSkeleton={showSkeleton} />
      <SummaryStrategic analytics={analytics} dm={dm} showSkeleton={showSkeleton} />
      <SummaryForecasting analytics={analytics} dm={dm} showSkeleton={showSkeleton} />
    </div>
  );
}
