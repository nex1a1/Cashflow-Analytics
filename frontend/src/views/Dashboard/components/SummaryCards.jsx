// src/views/Dashboard/components/SummaryCards.jsx
import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Coins, Wallet, PiggyBank, Flame, UtensilsCrossed, Home, Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Sparkline from '../../../components/ui/Sparkline';
import { formatMoney } from '../../../utils/formatters';

// ─── Count-up Hook ───────────────────────────────────────────────────────────
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  const prevTarget = useRef(null);

  useEffect(() => {
    if (prevTarget.current === target) return;
    const start = prevTarget.current ?? 0;
    prevTarget.current = target;

    const startTime = performance.now();
    const diff = target - start;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
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
function TrendBadge({ current, previous, dm }) {
  if (previous == null || previous === 0) return null;
  const diff = current - previous;
  const pct = Math.abs((diff / Math.abs(previous)) * 100);
  const isUp = diff > 0;
  const isFlat = pct < 0.5;

  if (isFlat) return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${dm ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
      <Minus className="w-2.5 h-2.5" /> เท่าเดิม
    </span>
  );

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${isUp
      ? (dm ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
      : (dm ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-500')
    }`}>
      {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {pct.toFixed(1)}%
    </span>
  );
}

// ─── Animated Money Display ───────────────────────────────────────────────────
function AnimatedMoney({ value, className }) {
  const animated = useCountUp(value);
  return <span className={className}>{formatMoney(animated)}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SummaryCards({ analytics, isDarkMode }) {
  const dm = isDarkMode;

  const datesInPeriod = analytics.datesInPeriod || [];
  const periodDays = Math.max(1, datesInPeriod.length);
  const avgIncome = analytics.totalIncome / periodDays;
  const avgExpense = analytics.totalExpense / periodDays;

  const prevIncome  = analytics.prevTotalIncome  ?? null;
  const prevExpense = analytics.prevTotalExpense  ?? null;
  const prevNet     = analytics.prevNetCashflow   ?? null;

  const isNegativeNet = analytics.netCashflow < 0;

  return (
    <div className={`rounded-sm border shadow-sm w-full h-full flex flex-col ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>

      {/* ─── TOP ROW: MAIN SUMMARY ─── */}
      <div className={`grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x flex-1 transition-colors duration-300 ${dm ? 'divide-slate-700 border-slate-700' : 'divide-slate-100 border-slate-100'}`}>

        {/* Income */}
        <div className={`relative overflow-hidden p-5 flex flex-col justify-between transition-colors ${dm ? 'hover:bg-slate-700/20' : 'hover:bg-slate-50/50'}`}>
          <div className="relative z-10 flex justify-between items-start w-full gap-2">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 mb-1">
                <div className={`p-1.5 rounded text-emerald-500 ${dm ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}><Coins className="w-4 h-4" /></div>
                <span className={`text-xs font-bold ${dm ? 'text-slate-300' : 'text-slate-600'}`}>รายรับรวม</span>
              </div>
              <AnimatedMoney
                value={analytics.totalIncome}
                className={`text-2xl xl:text-3xl font-black truncate ${dm ? 'text-emerald-400' : 'text-emerald-600'}`}
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className={`text-[10px] font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>เฉลี่ย {formatMoney(avgIncome)}/วัน</div>
                <TrendBadge current={analytics.totalIncome} previous={prevIncome} dm={dm} />
              </div>
            </div>
            {analytics.sparklineIncome && (
              <div className="w-20 xl:w-24 h-10 opacity-80 mt-2 shrink-0">
                <Sparkline data={analytics.sparklineIncome} color="#10B981" />
              </div>
            )}
          </div>
        </div>

        {/* Expense */}
        <div className={`relative overflow-hidden p-5 flex flex-col justify-between transition-colors ${dm ? 'hover:bg-slate-700/20' : 'hover:bg-slate-50/50'}`}>
          <div className="relative z-10 flex justify-between items-start w-full gap-2">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 mb-1">
                <div className={`p-1.5 rounded text-red-500 ${dm ? 'bg-red-500/10' : 'bg-red-50'}`}><Wallet className="w-4 h-4" /></div>
                <span className={`text-xs font-bold ${dm ? 'text-slate-300' : 'text-slate-600'}`}>รายจ่ายรวม</span>
              </div>
              <AnimatedMoney
                value={analytics.totalExpense}
                className={`text-2xl xl:text-3xl font-black truncate ${dm ? 'text-red-400' : 'text-red-600'}`}
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className={`text-[10px] font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>เฉลี่ย {formatMoney(avgExpense)}/วัน</div>
                <TrendBadge current={analytics.totalExpense} previous={prevExpense} dm={dm} />
              </div>
            </div>
            {analytics.sparklineExpense && (
              <div className="w-20 xl:w-24 h-10 opacity-80 mt-2 shrink-0">
                <Sparkline data={analytics.sparklineExpense} color="#EF4444" />
              </div>
            )}
          </div>
        </div>

        {/* Net — pulse/glow when negative */}
        <div
          className="relative overflow-hidden p-5 flex flex-col justify-between transition-all duration-500"
          style={isNegativeNet ? { animation: 'pulseGlow 2s ease-in-out infinite' } : {}}
        >
          {isNegativeNet && (
            <style>{`
              @keyframes pulseGlow {
                0%, 100% {
                  box-shadow: inset 0 0 0px 0px rgba(249,115,22,0);
                  background-color: transparent;
                }
                50% {
                  box-shadow: inset 0 0 20px 4px ${dm ? 'rgba(249,115,22,0.13)' : 'rgba(249,115,22,0.07)'};
                  background-color: ${dm ? 'rgba(249,115,22,0.07)' : 'rgba(249,115,22,0.04)'};
                }
              }
            `}</style>
          )}

          <PiggyBank className={`absolute -right-4 -bottom-4 w-28 h-28 rotate-12 pointer-events-none transition-transform ${
            isNegativeNet
              ? (dm ? 'text-orange-500/15' : 'text-orange-500/8')
              : (dm ? 'text-blue-500/10' : 'text-blue-500/5')
          }`} />

          <div className="relative z-10 flex flex-col gap-1.5 w-full">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded ${
                  isNegativeNet
                    ? `text-orange-500 ${dm ? 'bg-orange-500/10' : 'bg-orange-50'}`
                    : `text-blue-500 ${dm ? 'bg-blue-500/10' : 'bg-blue-50'}`
                }`}>
                  <PiggyBank className="w-4 h-4" />
                </div>
                <span className={`text-xs font-bold ${dm ? 'text-slate-300' : 'text-slate-600'}`}>คงเหลือ</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <TrendBadge current={analytics.netCashflow} previous={prevNet} dm={dm} />
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${dm ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                  ออม {analytics.totalIncome > 0 ? analytics.savingsRate : 0}%
                </span>
              </div>
            </div>
            <AnimatedMoney
              value={analytics.netCashflow}
              className={`text-2xl xl:text-3xl font-black truncate ${
                isNegativeNet
                  ? (dm ? 'text-orange-400' : 'text-orange-600')
                  : (dm ? 'text-blue-400' : 'text-[#00509E]')
              }`}
            />
            <div className={`w-full h-1.5 mt-1 rounded-full overflow-hidden ${dm ? 'bg-slate-900' : 'bg-slate-100'}`}>
              <div
                className={`h-full transition-all duration-1000 ${isNegativeNet ? 'bg-orange-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(100, Math.max(0, analytics.totalIncome > 0 ? analytics.savingsRate : 0))}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* ─── BOTTOM ROW: KEY METRICS ─── */}
      <div className={`grid grid-cols-2 lg:grid-cols-4 ${dm ? 'bg-slate-800/40 border-t border-slate-700' : 'bg-slate-50/50 border-t border-slate-100'}`}>

        {/* Burn Rate */}
        <div className={`relative overflow-hidden p-4 flex flex-col gap-1.5 min-w-0 border-b lg:border-b-0 lg:border-r ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
          <Flame className={`absolute -right-2 -bottom-2 w-16 h-16 pointer-events-none ${dm ? 'text-amber-500/10' : 'text-amber-500/5'}`} />
          <div className="relative z-10 flex items-center gap-1.5 mb-0.5">
            <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className={`text-[11px] font-bold truncate ${dm ? 'text-slate-400' : 'text-slate-500'}`}>เผาผลาญ/วัน</span>
          </div>
          <AnimatedMoney
            value={analytics.dailyAvg}
            className={`relative z-10 text-lg font-black truncate ${dm ? 'text-slate-200' : 'text-slate-700'}`}
          />
        </div>

        {/* Food */}
        <div className={`relative overflow-hidden p-4 flex flex-col gap-1.5 min-w-0 border-b lg:border-b-0 lg:border-r ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
          <UtensilsCrossed className={`absolute -right-2 -bottom-2 w-16 h-16 pointer-events-none ${dm ? 'text-orange-500/10' : 'text-orange-500/5'}`} />
          <div className="relative z-10 flex items-center justify-between gap-1.5 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <UtensilsCrossed className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span className={`text-[11px] font-bold truncate ${dm ? 'text-slate-400' : 'text-slate-500'}`}>ค่ากิน/วัน</span>
            </div>
            <span className={`text-[9px] font-bold shrink-0 ${dm ? 'text-orange-400/80' : 'text-orange-500/80'}`}>{analytics.foodPercentage}%</span>
          </div>
          <div className="relative z-10 flex flex-col gap-1.5">
            <AnimatedMoney
              value={analytics.foodDailyAvg}
              className={`text-lg font-black truncate ${dm ? 'text-slate-200' : 'text-slate-700'}`}
            />
            <div className={`w-full h-1 rounded-full overflow-hidden ${dm ? 'bg-slate-900' : 'bg-slate-200'}`}>
              <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${analytics.foodPercentage}%` }} />
            </div>
          </div>
        </div>

        {/* Rent */}
        <div className={`relative overflow-hidden p-4 flex flex-col gap-1.5 min-w-0 border-r-0 lg:border-r ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
          <Home className={`absolute -right-2 -bottom-2 w-16 h-16 pointer-events-none ${dm ? 'text-indigo-500/10' : 'text-indigo-500/5'}`} />
          <div className="relative z-10 flex items-center justify-between gap-1.5 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Home className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className={`text-[11px] font-bold truncate ${dm ? 'text-slate-400' : 'text-slate-500'}`}>ค่าที่พัก</span>
            </div>
            <span className={`text-[9px] font-bold shrink-0 ${dm ? 'text-indigo-400/80' : 'text-indigo-500/80'}`}>{analytics.rentPercentage}%</span>
          </div>
          <div className="relative z-10 flex flex-col gap-1.5">
            <AnimatedMoney
              value={analytics.rentTotal}
              className={`text-lg font-black truncate ${dm ? 'text-slate-200' : 'text-slate-700'}`}
            />
            <div className={`w-full h-1 rounded-full overflow-hidden ${dm ? 'bg-slate-900' : 'bg-slate-200'}`}>
              <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${analytics.rentPercentage}%` }} />
            </div>
          </div>
        </div>

        {/* Structure */}
        <div className="relative overflow-hidden p-4 flex flex-col gap-1.5 min-w-0">
          <Scale className={`absolute -right-2 -bottom-2 w-16 h-16 pointer-events-none ${dm ? 'text-purple-500/10' : 'text-purple-500/5'}`} />
          <div className="relative z-10 flex items-center gap-1.5 mb-0.5">
            <Scale className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <span className={`text-[11px] font-bold truncate ${dm ? 'text-slate-400' : 'text-slate-500'}`}>โครงสร้าง (คงที่/ผันแปร)</span>
          </div>
          <div className="relative z-10 flex flex-col justify-end flex-1 gap-1.5">
            <div className="text-[10px] font-bold flex justify-between items-end">
              <span className="text-purple-500 leading-none">{analytics.fixedPercentage}%</span>
              <span className="text-pink-500 leading-none">{analytics.variablePercentage}%</span>
            </div>
            <div className={`w-full h-1.5 rounded-full overflow-hidden flex ${dm ? 'bg-slate-900' : 'bg-slate-200'}`}>
              <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${analytics.fixedPercentage}%` }} />
              <div className="h-full bg-pink-400 transition-all duration-500" style={{ width: `${analytics.variablePercentage}%` }} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

SummaryCards.propTypes = {
  analytics:  PropTypes.object.isRequired,
  isDarkMode: PropTypes.bool.isRequired,
};