// src/views/Dashboard/components/SummaryCards/SummaryVitals.tsx
import React, { memo } from 'react';
import { Activity, Wallet, Navigation, TrendingDown } from 'lucide-react';
import { formatMoney, calculatePeriodDelta } from '@/utils/formatters';
import sharkLogo from '@/assets/images/shark-white.svg';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import { Shimmer, SectionHeader } from './helpers';
import { SummaryAnalytics } from './types';

interface SummaryVitalsProps {
  analytics: SummaryAnalytics;
  showSkeleton?: boolean;
}

export const SummaryVitals = memo(({ analytics, showSkeleton }: SummaryVitalsProps) => {
  const {
    totalIncome, totalExpense, netCashflow, savingsRate,
    datesInPeriod, prevTotals, periodLabel
  } = analytics;

  const periodDays = Math.max(1, datesInPeriod?.length || 1);
  const avgIncomePerDay = totalIncome / periodDays;
  const avgExpensePerDay = totalExpense / periodDays;
  const expensePercent = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;

  const getSavingsGradeInfo = (rate: number) => {
    if (rate >= 30) return { grade: 'A+', label: 'ดีเยี่ยม',   cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    if (rate >= 20) return { grade: 'A',  label: 'ดีมาก',    cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    if (rate >= 15) return { grade: 'B',  label: 'ดี',       cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    if (rate >= 10) return { grade: 'C',  label: 'พอใช้',    cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    if (rate >= 5)  return { grade: 'D',  label: 'อ่อน',     cls: 'bg-accent/10 text-accent border-accent/20' };
    return           { grade: 'F',  label: 'วิกฤต',    cls: 'bg-danger/10 text-danger border-danger/20' };
  };

  const gradeInfo = getSavingsGradeInfo(savingsRate);

  const hasPriorData = Boolean(prevTotals && prevTotals.txCount > 0);
  const curPeriodLabel = periodLabel || 'PoP';

  const incomeDelta  = calculatePeriodDelta({ current: totalIncome,  prev: prevTotals?.income ?? 0, hasPriorData, periodLabel: curPeriodLabel, type: 'income' });
  const expenseDelta = calculatePeriodDelta({ current: totalExpense, prev: prevTotals?.expense ?? 0, hasPriorData, periodLabel: curPeriodLabel, type: 'expense' });
  const netDelta     = calculatePeriodDelta({ current: netCashflow,  prev: prevTotals ? (prevTotals.income - prevTotals.expense) : 0, hasPriorData, periodLabel: curPeriodLabel, type: 'net' });

  return (
    <div className="flex flex-col h-full">
      <SectionHeader icon={Activity} title="ตัวชี้วัดหลัก" />
      <div className="flex flex-col gap-[1px] bg-surface-elevated flex-1">

        {/* INCOME CELL */}
        <div className="group relative overflow-hidden p-3 flex flex-col justify-between min-h-[80px] border-l border-l-emerald-500 bg-canvas hover:bg-surface-hover transition-none flex-1">
          <div className="absolute -right-2 -bottom-2 opacity-[0.03] pointer-events-none w-16 h-16">
            <img src={sharkLogo} alt="" className="w-full h-full object-contain filter grayscale opacity-40" />
          </div>

          <div className="flex justify-between items-center mb-1 gap-2 min-w-0">
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-neutral-400 truncate min-w-0">
              รายรับรวม
            </span>
          </div>

          <div className="mt-0.5">
            {showSkeleton ? (
              <Shimmer className="h-8 w-28 my-1" />
            ) : (
              <div className="text-2xl xl:text-3xl font-black text-emerald-400 tabular-nums tracking-tight leading-none">
                <AnimatedNumber value={totalIncome} />
              </div>
            )}
          </div>

          <div className="mt-1.5 flex items-center justify-between z-10 gap-1.5">
            {showSkeleton ? (
              <Shimmer className="h-4 w-24" />
            ) : (
              <span className="text-[11px] font-bold text-neutral-400 tabular-nums truncate">
                เฉลี่ย ฿{formatMoney(avgIncomePerDay)} / วัน
              </span>
            )}
            {!showSkeleton && (
              <div
                className={`px-1.5 py-0.5 border text-[11px] font-black uppercase tracking-wider rounded-none cursor-default shrink-0 transition-none ${incomeDelta.cls}`}
                title={incomeDelta.tooltipText}
              >
                {incomeDelta.text}
              </div>
            )}
          </div>
        </div>

        {/* EXPENSE CELL */}
        <div className="group relative overflow-hidden p-3 flex flex-col justify-between min-h-[80px] border-l border-l-accent bg-canvas hover:bg-surface-hover transition-none flex-1">
          <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-neutral-700">
            <Wallet size={72} />
          </div>

          <div className="flex justify-between items-center mb-1 gap-2 min-w-0">
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-neutral-400 truncate min-w-0">
              รายจ่ายรวม
            </span>
            {!showSkeleton && (
              <div className="px-1.5 py-0.5 border border-expense/20 bg-expense/10 text-expense rounded-none text-[11px] font-black uppercase tracking-widest shrink-0">
                ใช้ไป {expensePercent}%
              </div>
            )}
          </div>

          <div className="mt-0.5">
            {showSkeleton ? (
              <Shimmer className="h-8 w-28 my-1" />
            ) : (
              <div className="text-2xl xl:text-3xl font-black text-expense tabular-nums tracking-tight leading-none">
                <AnimatedNumber value={totalExpense} />
              </div>
            )}
          </div>

          <div className="mt-1.5 flex items-center justify-between z-10 gap-1.5">
            {showSkeleton ? (
              <Shimmer className="h-4 w-24" />
            ) : (
              <span className="text-[11px] font-bold text-neutral-400 tabular-nums truncate">
                เฉลี่ย ฿{formatMoney(avgExpensePerDay)} / วัน
              </span>
            )}
            {!showSkeleton && (
              <div
                className={`px-1.5 py-0.5 border text-[11px] font-black uppercase tracking-wider rounded-none cursor-default shrink-0 transition-none ${expenseDelta.cls}`}
                title={expenseDelta.tooltipText}
              >
                {expenseDelta.text}
              </div>
            )}
          </div>
        </div>

        {/* CASHFLOW CELL */}
        <div className={`group relative overflow-hidden p-3 flex flex-col justify-between min-h-[80px] border-l bg-canvas hover:bg-surface-hover transition-none flex-1 ${
          netCashflow >= 0 ? 'border-l-emerald-500' : 'border-l-danger'
        }`}>
          <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-neutral-700">
            {netCashflow >= 0 ? <Navigation size={72} /> : <TrendingDown size={72} />}
          </div>

          <div className="flex justify-between items-start mb-1 gap-2 min-w-0">
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-neutral-400 truncate min-w-0 pt-0.5">
              กระแสเงินสดสุทธิ
            </span>
            {!showSkeleton && (
              <div className={`px-1.5 py-0.5 border flex items-center gap-1.5 rounded-none text-[11px] font-black uppercase tracking-widest shrink-0 ${gradeInfo.cls}`}>
                <span>ออม {savingsRate}%</span>
                <span className="opacity-30">|</span>
                <span className="font-extrabold">{gradeInfo.grade} {gradeInfo.label}</span>
              </div>
            )}
          </div>

          <div className="mt-0.5">
            {showSkeleton ? (
              <Shimmer className="h-8 w-28 my-1" />
            ) : (
              <div className={`text-2xl xl:text-3xl font-black tabular-nums tracking-tight leading-none ${
                netCashflow >= 0 ? 'text-emerald-400' : 'text-danger'
              }`}>
                <AnimatedNumber value={netCashflow} />
              </div>
            )}
          </div>

          <div className="mt-1.5 flex items-center justify-between z-10 gap-1.5">
            {showSkeleton ? (
              <Shimmer className="h-4 w-12" />
            ) : (
              <span className={`text-[11px] font-black tracking-[0.12em] uppercase truncate ${
                netCashflow >= 0 ? 'text-emerald-400' : 'text-danger'
              }`}>
                {netCashflow >= 0 ? 'Surplus (ส่วนเกิน)' : 'Deficit (ติดลบ)'}
              </span>
            )}
            {!showSkeleton && (
              <div
                className={`px-1.5 py-0.5 border text-[11px] font-black uppercase tracking-wider rounded-none cursor-default shrink-0 transition-none ${netDelta.cls}`}
                title={netDelta.tooltipText}
              >
                {netDelta.text}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
});

SummaryVitals.displayName = 'SummaryVitals';
