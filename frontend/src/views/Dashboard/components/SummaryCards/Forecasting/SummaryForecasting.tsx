import React, { memo } from 'react';
import {
  TrendingDown, Gauge, ShieldCheck, Home, Wallet, Navigation,
  Zap, Award, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { formatMoney } from '@/utils/formatters';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import { Shimmer, formatSignedMoney } from '../helpers';
import { ForecastingTrajectoryChart } from './ForecastingTrajectoryChart';
import type { SummaryAnalytics, ForecastingDetails } from '../types';

import { tc } from '@/constants/theme';
interface SummaryForecastingProps {
  analytics: SummaryAnalytics;
  showSkeleton?: boolean;
}

export const SummaryForecasting = memo(({ analytics, showSkeleton }: SummaryForecastingProps) => {
  const { showForecasting, projectedExpense, safeToSpend, projectedSurplus, forecastingDetails } = analytics;

  if (!showForecasting) return null;

  const details = forecastingDetails || {} as ForecastingDetails;
  const currentDay              = details.currentDay              || 1;
  const lastDayOfMonth          = details.lastDayOfMonth          || 30;
  const remainingDays           = details.remainingDays           || 0;
  const monthProgressPct        = details.monthProgressPct        || 0;
  const fixedTotal              = details.fixedTotal              || 0;
  const variableUpToToday       = details.variableUpToToday       || 0;
  const projectedVariableRemaining = details.projectedVariableRemaining || 0;
  const actualDailyVariableAvg  = details.actualDailyVariableAvg  || 0;
  const projectedSurplusPct     = details.projectedSurplusPct     || 0;
  const maxAllowedExpense        = details.maxAllowedExpense       || 0;
  const requiredReduction        = details.requiredReduction       || 0;
  const requiredDailyReduction   = details.requiredDailyReduction  || 0;
  const actualDailySeries        = details.actualDailySeries        || [];
  const paceStatus  = details.paceStatus  || { label: 'คุมงบได้ดี', color: tc('income'), bg: 'bg-emerald-950/30' };
  const eomStatus   = details.eomStatus   || { label: 'โซนปลอดภัยสูง', color: tc('income'), bg: 'bg-emerald-950/40', border: 'border-emerald-500' };

  const headroom            = safeToSpend - actualDailyVariableAvg;
  const actualSafePaceRatio = safeToSpend > 0 ? (actualDailyVariableAvg / safeToSpend) * 100 : 100;
  const safePaceBarWidth    = Math.min(100, Math.max(0, actualSafePaceRatio));

  // Stacked proportions
  const totalProj  = Math.max(1, projectedExpense);
  const fixedPct   = Math.min(100, Math.max(0, (fixedTotal / totalProj) * 100));
  const varSpentPct = Math.min(100, Math.max(0, (variableUpToToday / totalProj) * 100));
  const varRemPct  = Math.min(100, Math.max(0, (projectedVariableRemaining / totalProj) * 100));

  return (
    <div className="flex flex-col h-full bg-canvas">
      {/* 1. Status Bar — the one place pace/EOM status and day-count live; the ceiling value itself lives on the chart and next to Pod 1's headline, not repeated here. */}
      <div className="px-3.5 py-1.5 bg-surface border-b border-line flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400">จังหวะใช้จ่าย:</span>
          <span
            className="text-[11px] font-mono font-black uppercase px-1.5 py-0.5 border"
            style={{ backgroundColor: `${paceStatus.color}15`, color: paceStatus.color, borderColor: `${paceStatus.color}40` }}
          >
            {paceStatus.label}
          </span>
        </div>

        <div
          className={`px-1.5 py-0.5 border text-[11px] font-mono font-black tracking-wider uppercase flex items-center gap-1 ${eomStatus.bg} ${eomStatus.border}`}
          style={{ color: eomStatus.color }}
        >
          <ShieldCheck className="w-3 h-3 shrink-0" />
          <span>{eomStatus.label}</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-neutral-400">
            วันในงวด: <span className="text-white font-bold">{currentDay}/{lastDayOfMonth}</span>
            <span className="text-neutral-500"> ({monthProgressPct.toFixed(0)}%)</span>
          </span>
          <div className="w-20 h-1.5 bg-neutral-800 overflow-hidden relative border border-neutral-700/60">
            <div
              className="h-full transition-none"
              style={{ width: `${Math.min(100, monthProgressPct)}%`, backgroundColor: paceStatus.color }}
            />
          </div>
          <span className="text-neutral-400">
            เหลือ <span className="text-neutral-200 font-bold">{remainingDays} วัน</span>
          </span>
        </div>
      </div>

      {/* 2. Trajectory Radar Sparkline Graph with Waypoint HUD */}
      <ForecastingTrajectoryChart
        currentDay={currentDay}
        lastDayOfMonth={lastDayOfMonth}
        maxAllowedExpense={maxAllowedExpense}
        fixedTotal={fixedTotal}
        variableUpToToday={variableUpToToday}
        projectedExpense={projectedExpense}
        projectedSurplus={projectedSurplus}
        actualDailySeries={actualDailySeries}
        paceColor={paceStatus.color}
      />

      {/* 3. 3-Column Cockpit Telemetry Pods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-surface-elevated flex-1">

        {/* POD 1: Monthly Outflow Forecast */}
        <div className="relative p-4 flex flex-col justify-between bg-canvas hover:bg-surface-hover transition-none border-l border-l-expense">
          <div className="flex items-center gap-1.5 leading-none mb-1">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400 truncate flex items-center gap-1.5">
              <TrendingDown size={13} className="text-expense shrink-0" />
              พยากรณ์รายจ่ายเดือนนี้
            </span>
          </div>

          <div className="my-auto z-10 flex flex-col justify-center gap-1.5">
            {showSkeleton ? (
              <Shimmer className="h-8 w-32 my-1" />
            ) : (
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-2xl xl:text-3xl font-black text-expense tabular-nums tracking-tight leading-none">
                  <AnimatedNumber value={projectedExpense} />
                </div>
                <div className="text-xs font-mono font-bold text-neutral-400 tabular-nums">
                  เพดาน ฿{formatMoney(maxAllowedExpense)}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="h-1.5 w-full bg-neutral-900 flex overflow-hidden border border-neutral-800">
                <div style={{ width: `${fixedPct}%` }} className="bg-sky-400" title="Fixed" />
                <div style={{ width: `${varSpentPct}%` }} className="bg-expense" title="Var Spent" />
                <div style={{ width: `${varRemPct}%` }} className="bg-neutral-600" title="Var Projected" />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                <span className="text-sky-400">ภาระคงที่ {fixedPct.toFixed(0)}%</span>
                <span className="text-expense">จ่ายแล้ว {varSpentPct.toFixed(0)}%</span>
                <span className="text-neutral-400">ประเมิน {varRemPct.toFixed(0)}%</span>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-1.5 border-t border-neutral-800/80 flex flex-col gap-1 text-[11px] font-mono">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Home size={12} className="text-sky-400 shrink-0" />
                ภาระคงที่ / ที่พัก:
              </span>
              <span className="text-sky-400 font-bold tabular-nums">฿{formatMoney(fixedTotal)}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Wallet size={12} className="text-expense shrink-0" />
                จ่ายประจำวันแล้ว ({currentDay} วัน):
              </span>
              <span className="text-white font-bold tabular-nums">฿{formatMoney(variableUpToToday)}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Navigation size={12} className="text-neutral-400 shrink-0" />
                ประเมินคงเหลือ ({remainingDays} วัน):
              </span>
              <span className="text-neutral-300 font-bold tabular-nums">฿{formatMoney(projectedVariableRemaining)}</span>
            </div>
          </div>
        </div>

        {/* POD 2: Safe Daily Living Ceiling */}
        <div className={`relative p-4 flex flex-col justify-between bg-canvas hover:bg-surface-hover transition-none border-l ${
          headroom >= 0 ? 'border-l-emerald-500' : 'border-l-danger'
        }`}>
          <div className="flex items-center gap-1.5 leading-none mb-1">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400 truncate flex items-center gap-1.5">
              <Zap size={13} className={headroom >= 0 ? 'text-emerald-400 shrink-0' : 'text-danger shrink-0'} />
              เพดานใช้วันละไม่เกิน
            </span>
          </div>

          <div className="my-auto z-10 flex flex-col justify-center gap-1.5">
            {showSkeleton ? (
              <Shimmer className="h-8 w-32 my-1" />
            ) : (
              <div className="flex items-baseline justify-between gap-2">
                <div className={`text-2xl xl:text-3xl font-black tabular-nums tracking-tight leading-none ${
                  headroom >= 0 ? 'text-emerald-400' : 'text-danger'
                }`}>
                  <AnimatedNumber value={safeToSpend} />
                  <span className="text-xs text-neutral-400 ml-1 font-normal">/วัน</span>
                </div>
                <div className="text-xs font-mono font-bold text-neutral-400 tabular-nums">
                  ใช้จริง ฿{formatMoney(actualDailyVariableAvg)}/ว
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="h-1.5 w-full bg-neutral-900 overflow-hidden relative border border-neutral-800">
                <div
                  className={`h-full ${headroom >= 0 ? 'bg-emerald-400' : 'bg-danger'}`}
                  style={{ width: `${safePaceBarWidth}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                <span>อัตราใช้จริง: {actualSafePaceRatio.toFixed(0)}% ของเพดาน</span>
                <span>เหลืออีก {remainingDays} วัน</span>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-1.5 border-t border-neutral-800/80 flex flex-col gap-1 text-[11px] font-mono">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <ShieldCheck size={12} className={headroom >= 0 ? 'text-emerald-400 shrink-0' : 'text-danger shrink-0'} />
                ส่วนต่างปลอดภัย (Headroom):
              </span>
              {headroom >= 0 ? (
                <span className="text-emerald-400 font-black tabular-nums">+฿{formatMoney(headroom)}/วัน</span>
              ) : (
                <span className="text-danger font-black tabular-nums">-฿{formatMoney(requiredDailyReduction)}/วัน</span>
              )}
            </div>
          </div>
        </div>

        {/* POD 3: Projected EOM Surplus */}
        <div className={`relative p-4 flex flex-col justify-between bg-canvas hover:bg-surface-hover transition-none border-l ${
          projectedSurplus >= 0 ? 'border-l-emerald-500' : 'border-l-danger'
        }`}>
          <div className="flex items-center gap-1.5 leading-none mb-1">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400 truncate flex items-center gap-1.5">
              <Award size={13} className={projectedSurplus >= 0 ? 'text-emerald-400 shrink-0' : 'text-danger shrink-0'} />
              เงินเหลือสุทธิคาดการณ์
            </span>
          </div>

          <div className="my-auto z-10 flex flex-col justify-center gap-1.5">
            {showSkeleton ? (
              <Shimmer className="h-8 w-32 my-1" />
            ) : (
              <div className="flex items-baseline justify-between gap-2">
                <div className={`text-2xl xl:text-3xl font-black tabular-nums tracking-tight leading-none ${
                  projectedSurplus >= 0 ? 'text-emerald-400' : 'text-danger'
                }`}>
                  {projectedSurplus >= 0 ? `+฿${formatMoney(projectedSurplus)}` : `-฿${formatMoney(Math.abs(projectedSurplus))}`}
                </div>
                <div className="text-xs font-mono font-bold text-neutral-400 tabular-nums">
                  ออม {projectedSurplusPct}%
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="h-1.5 w-full bg-neutral-900 overflow-hidden relative border border-neutral-800">
                <div
                  className={`h-full ${projectedSurplus >= 0 ? 'bg-emerald-500' : 'bg-danger'}`}
                  style={{ width: `${Math.min(100, Math.max(0, projectedSurplusPct))}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                <span>กันชนเงินสด: {projectedSurplusPct}% ของรายรับ</span>
                <span className={projectedSurplus >= 0 ? 'text-emerald-400' : 'text-danger'}>
                  {projectedSurplus >= 0 ? 'ความปลอดภัยสูง' : 'เฝ้าระวัง'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-1.5 border-t border-neutral-800/80 flex flex-col gap-1 text-[11px] font-mono">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-neutral-400 flex items-center gap-1.5">
                {requiredReduction > 0 ? (
                  <AlertTriangle size={12} className="text-danger shrink-0" />
                ) : (
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                )}
                สถานะวินัยงบประมาณ:
              </span>
              {requiredReduction > 0 ? (
                <span className="text-danger font-bold">ต้องคุมลด ฿{formatMoney(requiredReduction)}</span>
              ) : (
                <span className="text-emerald-400 font-bold">คุมงบได้ตามเป้าหมาย (No Deficit)</span>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
});

SummaryForecasting.displayName = 'SummaryForecasting';
