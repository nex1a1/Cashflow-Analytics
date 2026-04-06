// src/views/Dashboard/components/SummaryCards.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { Coins, Wallet, PiggyBank, Scale } from 'lucide-react';
import Sparkline from '../../../components/ui/Sparkline';
import { formatMoney } from '../../../utils/formatters';

export default function SummaryCards({ analytics, isDarkMode }) {
  const dm = isDarkMode;
  const card = `rounded-sm border shadow-sm transition-colors ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;

  const datesInPeriod = analytics.datesInPeriod || [];
  const periodDays = Math.max(1, datesInPeriod.length);
  const avgIncome = analytics.totalIncome / periodDays;
  const avgExpense = analytics.totalExpense / periodDays;

  return (
    <div className={`${card} p-4 flex flex-col justify-between gap-4 min-w-0`}>
      <div className="grid grid-cols-3 gap-3 flex-1">
        {/* รายรับ */}
        <div className={`relative overflow-hidden flex flex-col justify-between p-3.5 rounded-xl border transition-all ${dm ? 'bg-gradient-to-br from-emerald-900/50 to-slate-900/80 border-emerald-800/50' : 'bg-gradient-to-br from-emerald-50/80 to-white border-emerald-200 shadow-sm'}`}>
          <Coins className={`absolute -right-2 -bottom-2 w-20 h-20 -rotate-12 pointer-events-none ${dm ? 'text-emerald-400 opacity-[0.04]' : 'text-emerald-600 opacity-10'}`} />
          <div className="relative z-10 flex flex-col gap-1">
            <span className={`text-[11px] font-bold whitespace-nowrap flex items-center gap-1.5 ${dm ? 'text-emerald-400' : 'text-emerald-700'}`}>
              <div className={`p-1 rounded-md shrink-0 ${dm ? 'bg-emerald-500/20' : 'bg-emerald-100 text-emerald-700'}`}><Coins className="w-3.5 h-3.5" /></div>รายรับ
            </span>
            <span className={`text-xl lg:text-2xl font-black mt-1 leading-none truncate ${dm ? 'text-emerald-300' : 'text-emerald-800'}`}>{formatMoney(analytics.totalIncome)}</span>
            <span className={`text-[10px] font-semibold truncate ${dm ? 'text-emerald-500' : 'text-emerald-600/80'}`}>เฉลี่ย {formatMoney(avgIncome)}/วัน</span>
          </div>
          <div className="relative z-10 mt-3 flex justify-end">
            <div className="opacity-90"><Sparkline data={analytics.sparklineIncome} color="#10B981" width={80} height={24} /></div>
          </div>
        </div>

        {/* รายจ่าย */}
        <div className={`relative overflow-hidden flex flex-col justify-between p-3.5 rounded-xl border transition-all ${dm ? 'bg-gradient-to-br from-red-900/50 to-slate-900/80 border-red-800/50' : 'bg-gradient-to-br from-red-50/80 to-white border-red-200 shadow-sm'}`}>
          <Wallet className={`absolute -right-2 -bottom-2 w-20 h-20 rotate-12 pointer-events-none ${dm ? 'text-red-400 opacity-[0.04]' : 'text-red-600 opacity-10'}`} />
          <div className="relative z-10 flex flex-col gap-1">
            <span className={`text-[11px] font-bold whitespace-nowrap flex items-center gap-1.5 ${dm ? 'text-red-400' : 'text-red-700'}`}>
              <div className={`p-1 rounded-md shrink-0 ${dm ? 'bg-red-500/20' : 'bg-red-100 text-red-700'}`}><Wallet className="w-3.5 h-3.5" /></div>รายจ่าย
            </span>
            <span className={`text-xl lg:text-2xl font-black mt-1 leading-none truncate ${dm ? 'text-red-300' : 'text-red-800'}`}>{formatMoney(analytics.totalExpense)}</span>
            <span className={`text-[10px] font-semibold truncate ${dm ? 'text-red-500' : 'text-red-600/80'}`}>เฉลี่ย {formatMoney(avgExpense)}/วัน</span>
          </div>
          <div className="relative z-10 mt-3 flex justify-end">
            <div className="opacity-90"><Sparkline data={analytics.sparklineExpense} color="#EF4444" width={80} height={24} /></div>
          </div>
        </div>

        {/* คงเหลือ */}
        <div className={`relative overflow-hidden flex flex-col justify-between p-3.5 rounded-xl border transition-all ${analytics.netCashflow >= 0 ? (dm ? 'bg-gradient-to-br from-blue-900/50 to-slate-900/80 border-blue-800/50' : 'bg-gradient-to-br from-blue-50/80 to-white border-blue-200 shadow-sm') : (dm ? 'bg-gradient-to-br from-orange-900/50 to-slate-900/80 border-orange-800/50' : 'bg-gradient-to-br from-orange-50/80 to-white border-orange-200 shadow-sm')}`}>
          <PiggyBank className={`absolute -right-2 -bottom-2 w-20 h-20 rotate-6 pointer-events-none ${analytics.netCashflow >= 0 ? (dm ? 'text-blue-400 opacity-[0.04]' : 'text-[#00509E] opacity-[0.08]') : (dm ? 'text-orange-400 opacity-[0.04]' : 'text-orange-600 opacity-[0.08]')}`} />
          <div className="relative z-10 flex flex-col gap-1">
            <span className={`text-[11px] font-bold whitespace-nowrap flex items-center gap-1.5 ${analytics.netCashflow >= 0 ? (dm ? 'text-blue-400' : 'text-blue-700') : (dm ? 'text-orange-400' : 'text-orange-700')}`}>
              <div className={`p-1 rounded-md shrink-0 ${analytics.netCashflow >= 0 ? (dm ? 'bg-blue-500/20' : 'bg-blue-100 text-blue-700') : (dm ? 'bg-orange-500/20' : 'bg-orange-100 text-orange-700')}`}><PiggyBank className="w-3.5 h-3.5" /></div>คงเหลือ
            </span>
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

      {/* แถบโครงสร้างรายจ่าย Fixed/Variable */}
      <div className={`rounded-sm px-3 py-2 ${dm ? 'bg-slate-900/60' : 'bg-slate-50'}`}>
        <div className="flex justify-between items-center mb-1.5 gap-2">
          <span className={`text-[10px] font-bold whitespace-nowrap flex items-center gap-1 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
            <Scale className="w-3 h-3 text-purple-500" /> โครงสร้างรายจ่าย
          </span>
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
  );
}

SummaryCards.propTypes = {
  analytics: PropTypes.object.isRequired,
  isDarkMode: PropTypes.bool.isRequired,
};