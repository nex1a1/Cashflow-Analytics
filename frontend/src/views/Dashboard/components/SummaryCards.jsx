// src/views/Dashboard/components/SummaryCards.jsx
import React from 'react';
import { 
  Activity, Wallet, Anchor, Crosshair, Navigation, ShieldCheck,
  Target, Scale, UtensilsCrossed,
  TrendingUp, Zap 
} from 'lucide-react';
import { useDashboardContext } from '../context/DashboardContext';
import { formatMoney } from '../../../utils/formatters';
import sharkLogo from '../../../assets/images/shark-white.svg';
import sharkBlack from '../../../assets/images/shark-black.svg';
import StatCard from '../../../components/shared/StatCard.jsx';
import AnimatedNumber from '../../../components/ui/AnimatedNumber.jsx';

/**
 * Shared Header for Summary Sections
 */
const SectionHeader = ({ icon: Icon, title, dm }) => (
  <div className={`px-2.5 py-0.5 flex items-center gap-1.5 ${dm ? 'bg-slate-800 border-b border-slate-700/50' : 'bg-slate-50 border-b border-slate-200'}`}>
    <Icon className={`w-3 h-3 ${dm ? 'text-slate-500' : 'text-slate-400'}`} />
    <span className={`text-[11px] font-black uppercase tracking-widest ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
      {title}
    </span>
  </div>
);

/**
 * SECTION 1: FINANCIAL VITALS (Income, Expense, Cashflow, Savings)
 */
const SummaryVitals = ({ analytics, dm }) => {
  const {
    totalIncome, totalExpense, netCashflow, savingsRate,
    fixedTotal, variableTotal, datesInPeriod
  } = analytics;

  const periodDays = Math.max(1, datesInPeriod?.length || 1);
  const avgIncomePerDay = totalIncome / periodDays;
  const avgExpensePerDay = totalExpense / periodDays;
  const avgFixedPerDay = fixedTotal / periodDays;
  const avgVariablePerDay = variableTotal / periodDays;

  const vitalsConfig = [
    {
      id: 'income',
      icon: <div className="w-4 h-4 flex items-center justify-center"><img src={dm ? sharkLogo : sharkBlack} alt="" className="w-full h-full object-contain" /></div>,
      label: "รายรับรวม",
      value: <AnimatedNumber value={totalIncome} />,
      subValueJSX: <span className={`text-[9px] font-medium opacity-80 tabular-nums ${dm ? 'text-blue-400' : 'text-blue-600'}`}>เฉลี่ย ฿{formatMoney(avgIncomePerDay)}/วัน</span>,
      color: { bg: dm ? 'bg-blue-900/30' : 'bg-blue-50', text: dm ? 'text-blue-400' : 'text-blue-600' }
    },
    {
      id: 'expense',
      icon: <Wallet />,
      label: "รายจ่ายรวม",
      value: <AnimatedNumber value={totalExpense} />,
      subValueJSX: <span className={`text-[9px] font-medium opacity-80 tabular-nums ${dm ? 'text-orange-400' : 'text-orange-600'}`}>เฉลี่ย ฿{formatMoney(avgExpensePerDay)}/วัน</span>,
      color: { bg: dm ? 'bg-orange-900/30' : 'bg-orange-50', text: dm ? 'text-orange-400' : 'text-orange-600' }
    },
    {
      id: 'fixed',
      icon: <Anchor />,
      label: "รายจ่ายคงที่",
      value: <AnimatedNumber value={fixedTotal} />,
      subValueJSX: <span className={`text-[9px] font-medium opacity-80 tabular-nums ${dm ? 'text-purple-400' : 'text-purple-600'}`}>เฉลี่ย ฿{formatMoney(avgFixedPerDay)}/วัน</span>,
      color: { bg: dm ? 'bg-purple-900/30' : 'bg-purple-50', text: dm ? 'text-purple-400' : 'text-purple-600' }
    },
    {
      id: 'variable',
      icon: <Crosshair />,
      label: "รายจ่ายผันแปร",
      value: <AnimatedNumber value={variableTotal} />,
      subValueJSX: <span className={`text-[9px] font-medium opacity-80 tabular-nums ${dm ? 'text-rose-400' : 'text-rose-600'}`}>เฉลี่ย ฿{formatMoney(avgVariablePerDay)}/วัน</span>,
      color: { bg: dm ? 'bg-rose-900/30' : 'bg-rose-50', text: dm ? 'text-rose-400' : 'text-rose-600' }
    },
    {
      id: 'cashflow',
      icon: <Navigation />,
      label: "กระแสเงินสด",
      value: <AnimatedNumber value={netCashflow} />,
      subValueJSX: <span className={`text-[9px] font-medium opacity-80 ${netCashflow >= 0 ? (dm ? 'text-emerald-400' : 'text-emerald-600') : (dm ? 'text-rose-400' : 'text-rose-600')}`}>{netCashflow >= 0 ? 'Surplus' : 'Deficit'}</span>,
      color: { 
        bg: netCashflow >= 0 ? (dm ? 'bg-emerald-900/30' : 'bg-emerald-50') : (dm ? 'bg-rose-900/30' : 'bg-rose-50'),
        text: netCashflow >= 0 ? (dm ? 'text-emerald-400' : 'text-emerald-600') : (dm ? 'text-rose-400' : 'text-rose-600')
      }
    },
    {
      id: 'savings',
      icon: <ShieldCheck />,
      label: "ประสิทธิภาพ",
      value: `${savingsRate}%`,
      subValueJSX: <span className={`text-[9px] font-medium opacity-80 ${savingsRate >= 20 ? (dm ? 'text-emerald-400' : 'text-emerald-600') : (dm ? 'text-blue-400' : 'text-blue-600')}`}>Grade ${savingsRate >= 20 ? 'A+' : (savingsRate >= 10 ? 'B' : (savingsRate > 0 ? 'C' : 'F'))}</span>,
      color: { 
        bg: savingsRate >= 20 ? (dm ? 'bg-emerald-900/30' : 'bg-emerald-50') : (dm ? 'bg-blue-900/30' : 'bg-blue-50'),
        text: savingsRate >= 20 ? (dm ? 'text-emerald-400' : 'text-emerald-600') : (dm ? 'text-blue-400' : 'text-blue-600')
      }
    }
  ];

  return (
    <div className="flex flex-col border-b border-dashed border-slate-700/40">
      <SectionHeader icon={Activity} title="ตัวชี้วัดหลัก" dm={dm} />
      <div className="grid grid-cols-6 gap-[1px] bg-slate-700/20 p-[1px]">
        {vitalsConfig.map(card => (
          <div key={card.id} className={dm ? 'bg-[#111827]' : 'bg-white'}>
            <StatCard 
              icon={card.icon}
              label={card.label}
              value={card.value}
              subValueJSX={card.subValueJSX} 
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
const SummaryStrategic = ({ analytics, dm }) => {
  const {
    totalIncome, netCashflow,
    dailyAvg, foodPercentage, foodDailyAvg, fixedTotal, variableTotal,
    datesInPeriod
  } = analytics;

  const periodDays = Math.max(1, datesInPeriod?.length || 1);
  const dailyVictory = netCashflow / periodDays;

  return (
    <div className="grid grid-cols-12 items-stretch">
         {/* Strategic Analysis */}
         <div className="col-span-7 flex flex-col border-r border-dashed border-slate-700/40">
            <SectionHeader icon={Target} title="วิเคราะห์กลยุทธ์" dm={dm} />
            <div className="grid grid-cols-3 gap-[1px] bg-slate-700/20 p-[1px] flex-1">
               <div className={`p-2 rounded-none flex flex-col justify-between h-full ${dm ? 'bg-slate-800/60' : 'bg-white'}`}>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${dm ? 'text-purple-400/70' : 'text-purple-600/70'}`}>Commitment Ratio</span>
                  <div className="mt-auto">
                    <div className={`text-lg font-black ${dm ? 'text-purple-400' : 'text-purple-600'}`}>{((fixedTotal / totalIncome) * 100).toFixed(1)}%</div>
                    <div className={`w-full h-1 mt-1.5 rounded-full ${dm ? 'bg-slate-700' : 'bg-slate-200'} overflow-hidden`}>
                       <div className="h-full bg-purple-500" style={{ width: `${Math.min(100, (fixedTotal / totalIncome) * 100)}%` }} />
                    </div>
                  </div>
               </div>

               <div className={`p-2 rounded-none flex flex-col justify-between h-full ${dm ? 'bg-slate-800/60' : 'bg-white'}`}>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${dm ? 'text-rose-400/70' : 'text-rose-600/70'}`}>Lifestyle Velocity</span>
                  <div className="mt-auto">
                    <div className={`text-lg font-black ${dm ? 'text-rose-400' : 'text-rose-600'}`}>{((variableTotal / totalIncome) * 100).toFixed(1)}%</div>
                    <div className={`w-full h-1 mt-1.5 rounded-full ${dm ? 'bg-slate-700' : 'bg-slate-200'} overflow-hidden`}>
                       <div className="h-full bg-rose-500" style={{ width: `${Math.min(100, (variableTotal / totalIncome) * 100)}%` }} />
                    </div>
                  </div>
               </div>

               <div className={`p-2 rounded-none flex flex-col justify-between h-full ${dm ? 'bg-slate-800/60' : 'bg-white'}`}>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${dailyVictory >= 0 ? (dm ? 'text-emerald-400/70' : 'text-emerald-600/70') : (dm ? 'text-rose-400/70' : 'text-rose-600/70')}`}>Net Surplus / Day</span>
                  <span className={`text-lg font-black mt-auto tabular-nums ${dailyVictory >= 0 ? (dm ? 'text-emerald-400' : 'text-emerald-600') : (dm ? 'text-rose-400' : 'text-rose-600')}`}>{formatMoney(dailyVictory)}</span>
               </div>
            </div>
         </div>

         {/* Key Metrics */}
         <div className="col-span-5 flex flex-col">
            <SectionHeader icon={Scale} title="ข้อมูลสำคัญ" dm={dm} />
            <div className="grid grid-cols-3 gap-[1px] bg-slate-700/20 p-[1px] flex-1">
               <div className={`p-2 rounded-none flex flex-col justify-center h-full ${dm ? 'bg-slate-800/60' : 'bg-white'}`}>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${dm ? 'text-orange-400/70' : 'text-orange-600/70'}`}>สัดส่วนค่าอาหาร</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className={`text-lg font-black ${dm ? 'text-orange-400' : 'text-orange-600'}`}>{foodPercentage}%</span>
                    <UtensilsCrossed size={12} className="text-orange-500 opacity-60" />
                  </div>
               </div>
               <div className={`p-2 rounded-none flex flex-col justify-center h-full ${dm ? 'bg-slate-800/60' : 'bg-white'}`}>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${dm ? 'text-orange-400/70' : 'text-orange-600/70'}`}>กินเฉลี่ย/วัน</span>
                  <span className={`text-lg font-black tabular-nums mt-0.5 ${dm ? 'text-orange-400' : 'text-orange-600'}`}>{formatMoney(foodDailyAvg)}</span>
               </div>
               <div className={`p-2 rounded-none flex flex-col justify-center h-full ${dm ? 'bg-slate-800/60' : 'bg-white'}`}>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${dm ? 'text-slate-400/70' : 'text-slate-500/70'}`}>รายจ่ายเฉลี่ย/วัน</span>
                  <span className={`text-lg font-black tabular-nums mt-0.5 ${dm ? 'text-slate-300' : 'text-slate-700'}`}>{formatMoney(dailyAvg)}</span>
               </div>
            </div>
         </div>
    </div>
  );
};

/**
 * SECTION 3: FORECAST (Optional strip for month-end projections)
 */
const SummaryForecasting = ({ analytics, dm }) => {
  const {
    showForecasting, projectedExpense, safeToSpend
  } = analytics;

  if (!showForecasting) return null;

  return (
    <div className="flex flex-col border-t border-dashed border-slate-700/40">
      <SectionHeader icon={TrendingUp} title="พยากรณ์สิ้นเดือน" dm={dm} />
      <div className="grid grid-cols-2 gap-[1px] bg-slate-700/20 p-[1px]">
        <div className={`p-2 rounded-none flex items-center justify-between ${dm ? 'bg-[#1e1b4b]/40' : 'bg-indigo-50/30'}`}>
          <div>
            <span className={`text-[9px] font-black uppercase tracking-wider ${dm ? 'text-indigo-300' : 'text-indigo-600'}`}>Projected Expense</span>
            <div className={`text-lg font-black tabular-nums ${dm ? 'text-white' : 'text-indigo-900'}`}><AnimatedNumber value={projectedExpense} /></div>
          </div>
          <TrendingUp size={58} className="text-indigo-400 opacity-30" />
        </div>
        <div className={`p-2 rounded-none flex items-center justify-between ${safeToSpend > 300 ? (dm ? 'bg-emerald-500/5' : 'bg-emerald-50/30') : (dm ? 'bg-rose-500/5' : 'bg-rose-50/30')}`}>
          <div>
            <span className={`text-[9px] font-black uppercase tracking-wider ${safeToSpend > 300 ? (dm ? 'text-emerald-400/70' : 'text-emerald-600/70') : (dm ? 'text-rose-400/70' : 'text-rose-600/70')}`}>Safe to Spend</span>
            <div className={`text-lg font-black tabular-nums ${safeToSpend > 300 ? 'text-emerald-500' : 'text-rose-500'}`}><AnimatedNumber value={safeToSpend} /></div>
          </div>
          <Zap size={57} className={`${safeToSpend > 300 ? 'text-emerald-400' : 'text-rose-400'} opacity-30`} />
        </div>
      </div>
    </div>
  );
};

/**
 * SummaryCards - The mission control center for financial vitals.
 */
export default function SummaryCards() {
  const { analytics, dm } = useDashboardContext();

  if (!analytics) return null;

  return (
    <div className={`w-full flex flex-col rounded-sm overflow-hidden border shadow-sm ${dm ? 'bg-[#111827] border-slate-700/50' : 'bg-white border-slate-200'}`}>
      <SummaryVitals analytics={analytics} dm={dm} />
      <SummaryStrategic analytics={analytics} dm={dm} />
      <SummaryForecasting analytics={analytics} dm={dm} />
    </div>
  );
}
